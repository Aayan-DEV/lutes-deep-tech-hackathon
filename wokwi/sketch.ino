// Dual-axis solar tracker v4: 4 LDRs steer the pan (D9) and tilt (D10) servos toward a torch.
// The dashboard (dashboard/js/logic.js) runs a JavaScript copy of this exact logic: change both.
//
// Pan is a TowerPro MG996R "360": a CONTINUOUS servo. It cannot go to an angle; it spins one way
// or the other. It runs at FULL SPEED while the panel is far off the light and only eases down
// for the last few % of imbalance, then brakes and switches its signal off (no creeping).
// Tilt is an SG-90 (normal 0-180 servo), moved at most TILT_FULL_STEP degrees per 10 ms.
// prototype range: tilt 45 degrees each way from the flat angle (tiltUp, set with "U", 90 until then),
// never past 5 or 175; turn plus or minus 170 degrees, at 90 percent speed; the simulation uses the full range.
//   (The panels are big, so the real board never goes end to end: tilt 45 degrees each way from flat
//   at up to 40 degrees a second, the big motor at a gentler top speed. SUN_MODE = the simulation's
//   numbers: tilt 90 to 180 at up to 500 degrees a second, turn plus or minus 170 degrees, full speed.)
//
// How it steers (the classic 4-LDR dual-axis tracker, with the room learning on top):
//  - Each LDR is read as conductance (1 / resistance). Raw counts bunch up near 1023 in bright
//    light; conductance keeps rising with the light, so small differences stay visible.
//  - Each sensor is divided by its own learned room level: rel 1.0 = room light. This evens out
//    the 4 LDRs' different sensitivities (the classic code's per-sensor gains).
//  - Each axis compares the mean of its two sides: tilt = top (TL, TR) against bottom (BL, BR),
//    pan = left (TL, BL) against right (TR, BR). Imbalance = |a - b| / max(a, b) x 100.
//    Past startPct for CONFIRM_MS it moves toward the brighter side (faster as the imbalance
//    grows), and stops inside stopPct. Indoors there is no torch gate: it always tries to even
//    out all 4 lights.
//  - The only reasons not to move: the brighter side is dark (its mean counts at or under
//    DARK_COUNTS, or its rel at or under DARK_REL, 5 % above the room level, so a dark room does
//    not drive the motors on noise), an axis at its limit, or the big motor not responding.
//  - Sensitivity 0..100 (the dashboard's slider sends "T <level>"): 0 = the smallest difference
//    makes it move, 50 = the tuned default, 100 = only very uneven light makes it move. It sets
//    the imbalance needed to start / stop moving (and torchOnPct, the "torch seen" word).
//  - Torch = one sensor gets torchOnPct % more light than its room level. Indoors it no longer
//    gates the motors: it is kept for the words and for finding a lost torch.
//  - Big motor watchdog: the pan wants to turn one way (driving, or held at its limit) for
//    PAN_CHECK_MS without the left-right imbalance falling by PAN_CHECK_GAIN = the big motor is
//    missing or unpowered. The pan stops, the tilt carries on alone, telemetry pan.stuck = 1.
//    Tried again every PAN_RETRY_MS. (A light past the turn limit looks the same, unless the turn
//    there had already evened the light out with the tilt still.)
//  - Anti-wobble: if an axis has to go back the way it came soon after moving, it overshot, so its
//    top speed is cut. The speed grows back to full over a few seconds.
//  - A sensor stuck at 0 V or 5 V (missing or miswired) is skipped.
//
// Pretend-sun mode: the dashboard drives the motors and the lights are only reported.
//  - "M <pan pulse> <tilt angle>" (50 a second): keep-alive, tilt angle, pan pulse (0 = off).
//  - "J <pan pulse> <ms> <tilt angle>": a timed turn. The big motor runs at that pulse for exactly
//    <ms> milliseconds (timed here, not over USB), then stops. M lines do not cut a turn short.
// The tilt goes to the dashboard's angle at its normal top speed (TILT_FULL_STEP per 10 ms), not in one jump.
// If the lines stop for 0.3 s, the motors stop and the tracker follows the real light on its own.
//
// All serial commands (lines end with Enter; the single letters r, s, z also work on their own):
//  r            relearn the room light (torch off). Lowercase only: "R ..." is the tilt reverse below.
//  s            servo test        z   set the big motor's middle (pan angle 0 here)
//  M p a        pretend sun: pan pulse p (0 = off), tilt angle a. Keep-alive, 50 a second.
//  J p ms a     timed turn of the big motor: pulse p for ms milliseconds, tilt angle a.
//  L a b c d    which pin (0..3 = A0..A3) is at TL, TR, BL, BR (remembered); a new set relearns the room.
//  W ms add     learn the room for up to ms while you move around (add 1 = keep the old brightest). W 0 = done.
//  P 0 / P 1    big motor connected or not (remembered). Also clears the watchdog's "not responding".
//  T level      sensitivity 0..100 (50 = default).
//  V deg/s      the big motor's measured top speed.
//  U angle      the tilt angle where the panel lies flat, 10..170 (remembered). The tilt range follows it:
//               45 degrees each way, inside 5..175. The board starts at this angle.
//  R 0 / R 1    tilt servo mounted the other way round: 1 sends 180 - angle to it (remembered).
//               The logic and the telemetry keep the normal angle; only the servo output flips.
//  Q 0 / Q 1    big motor turns the other way round: 1 flips every pan pulse sent to it (remembered),
//               so the logic's turn toward the brighter side is a real turn toward it on this build.
//               The turn count and the logic keep the normal sign; telemetry pan.us is the pulse sent.
//  D 1 / D 0    start the dust cleaning routine now / stop it and forget the clean light level.
//
// Dust: the total light (sum of the 4 rel values) has a clean level (up in about 2 s, down in about 30 s). If it falls
// under 60 % of that within 3 s and stays there 2 s with the motors still (and the light did not just
// go out), something covers the sensors. Cleaning: the tilt rocks to one end, holds 1.5 s and measures,
// then the other end, then back; the next round starts with the end that helped more. Up to 3 rounds,
// stopping as soon as the light is back over 85 %. Still dim after that = "needs a hand": it keeps
// tracking and the state clears by itself when the light comes back. Telemetry "cl": {st, base, now,
// round}, st 0 idle, 1 blocked, 2 cleaning, 3 needs a hand; base and now = total light x 100.
#include <Servo.h>
#include <EEPROM.h>

// Big motor connected? If not ("P 0" from the dashboard), it is NEVER driven: not at start-up,
// not in tests, not by the pretend sun. Saved in the board's memory, so it holds after a restart.
const int EE_PAN_ENABLED = 0;     // memory address; 0xA5 = big motor off, anything else = on
bool panEnabled = true;

Servo pan;   // MG996R 360, turns left / right  (D9)
Servo tilt;  // SG-90, tips up / down           (D10)
const int PAN_PIN = 9;
const int TILT_PIN = 10;

enum { TL, TR, BL, BR };
// Which Arduino pin each position reads: TL, TR, BL, BR. The dashboard's "light positions" setup
// can change it ("L 3 2 1 0" = A3, A2, A1, A0), then the room is learned again.
int LDR_PIN[4] = {A3, A2, A1, A0};
const int ANALOG_PIN[4] = {A0, A1, A2, A3};
int ldrMap[4] = {3, 2, 1, 0};             // the same, as A-numbers, for the telemetry
bool mapSaved = false;                    // the light positions are in the board's memory (telemetry "ms")
const char *LDR_NAME[4] = {"TL", "TR", "BL", "BR"};

enum { PAN, TILT };
// Each axis compares a "positive" pair of sensors with a "negative" pair.
const int POS_A[2] = {TL, TL};  // pan: left side,  tilt: top side
const int POS_B[2] = {BL, TR};
const int NEG_A[2] = {TR, BL};  // pan: right side, tilt: bottom side
const int NEG_B[2] = {BR, BR};
const int DIR[2] = {1, 1};      // set an axis to -1 if it turns away from the light
const char *AXIS_NAME[2] = {"pan", "tilt"};

const unsigned long UPDATE_MS = 10;      // one control update every 10 ms
const unsigned long TELEMETRY_MS = 50;   // one JSON line for the dashboard, 20 times a second
const float SMOOTH = 0.5;                // reading smoothing, 0..1 (higher = faster, noisier)

// Torch detection
float torchOnPct = 35;                   // one sensor 35 % brighter than its room level = torch
const float TORCH_OFF_RATIO = 0.5;       // lost again below half of that
const float TORCH_MIN_COUNTS = 8;        // and at least 8 counts up (ignores noise near 1023)
// Room "normal" = the BRIGHTEST each light saw while learning. Learning again only raises it (start
// over with a fresh learn). It does not drift by itself, so only light above the brightest the room
// ever did counts. Kept in the board's memory across restarts.
const bool ROOM_FIXED = true;            // false = the old way: normal slowly follows the room
const int EE_ROOM = 4;                   // memory: 4 room levels (2 bytes each), then a check byte
const int EE_TILT = 16;                  // memory: tilt reverse (1 byte), flat angle x10 (2 bytes), check byte
const int EE_MAP = 20;                   // memory: light positions (4 bytes: the pin at TL, TR, BL, BR), check byte
const int EE_PANREV = 25;                // memory: big motor reversed (1 byte), check byte
const int EE_PANSTART = 27;              // memory: big motor starting pulse ("K", 2 bytes), check byte 0x5E at 29
const int EE_SETTINGS = 30;              // memory: sensitivity ("T", 1 byte), measured speed ("V", 2 bytes), check byte 0x5F at 33
const unsigned long LEARN_MAX_MS = 120000;
bool learning = false;
unsigned long learnUntil = 0;
int learnSettle = 0;                     // updates to wait before keeping the brightest (readings settle)
const int LEARN_SETTLE = 20;             // 20 updates = 0.2 s
const float ROOM_FOLLOW = 0.0033;        // (only if ROOM_FIXED is false) catches up in about 3 s with no torch
const float ROOM_FOLLOW_TORCH = 0.0001;  // about 100 s while a torch is seen. Going darker is
                                         // always followed fast (heals a start-up with the torch on).

// Outdoor mode (the sun): the sun rises too slowly to stand out from a "room level", so instead the
// learned levels become a one-time calibration (they cancel the 4 LDRs' differences) and never
// change. "Torch" then means: enough light to track. Indoors (torch demo) leave this false.
// SUN_MODE also switches every number marked "sun:" below to the dashboard sun simulation's
// (SUN_MODE_CFG in logic.js): the full design range, quicker moves, START_PCT 10 and STOP_PCT 3.
// false = the real prototype: smaller, slower moves (its panels are big).
const bool SUN_MODE = false;
const float SUN_ON_COUNTS = 450, SUN_OFF_COUNTS = 350;

// When to move (imbalance between an axis's two sides, % of the brighter side)
const float START_PCT = SUN_MODE ? 10 : 15;   // sun: 10 (the sun moves slowly: correct sooner)
const float STOP_PCT = SUN_MODE ? 3 : 5;      // sun: 3
// Live values: the sensitivity setting changes these (sensitivity 50 = the numbers above).
int sensLevel = 50;
float startPct = START_PCT, stopPct = STOP_PCT;

// Sensitivity 0..100 -> how much light counts as the torch, and how uneven the sides must be to move.
//   torch: 35 % at 50, x8 easier at 0 (4 %), x8 harder at 100 (280 %)
//   start: 4 % at 0, 15 % at 50, 35 % at 100;  stop: a third of start, at least 2 %
void applySensitivity(int level) {
  sensLevel = constrain(level, 0, 100);
  torchOnPct = 35 * pow(8, (sensLevel - 50) / 50.0);
  startPct = 3 + 14 * sensLevel / 100.0;      // 0 = 3 %, 50 = 10 %, 100 = 17 % between the sides
  stopPct = max(2.0f, SUN_MODE ? startPct / 3 : startPct / 2);   // prototype: half of start, a wider still zone (less jitter)
}
const float FULL_PCT = SUN_MODE ? 40 : 60;   // at or past this imbalance: full speed (prototype 60: it slows sooner, less overshoot)
// Prototype only (Oct 11, from the real board's logs):
//   SETTLE_MS: after an axis balances and stops, it may not start again for this long. The panel and the
//   smoothed readings settle first; without it the big motor swung back and forth every 0.6 s.
//   UNWIND: the wires run up both sides, so the big motor never goes past PAN_LIMIT_DEG either way. When
//   it has waited UNWIND_WAIT_MS at its limit with the light still further that way, it turns the other
//   way round instead (full speed, the light ignored) until its count is UNWIND_TO past the middle on the
//   other side, then tracks again from there: the light is reached without ever twisting the wires
//   more than PAN_LIMIT_DEG. At most one unwind per UNWIND_REST_MS (a light right at the back stays put).
//   A big motor that is not connected cannot fool it: if the light looks the same after the unwind
//   (imbalance and total within UNWIND_SAME), the motor did not turn: pan.stuck.
const unsigned long SETTLE_MS = SUN_MODE ? 0 : 300;
const bool UNWIND = false;   // off since Oct 11 night: a long turn round on a time-based count could reach the wires behind
const unsigned long UNWIND_WAIT_MS = 1000, UNWIND_REST_MS = 15000;
const float UNWIND_TO = 120, UNWIND_SAME = 0.1;
const unsigned long CONFIRM_MS = 100;    // imbalance must last this long before moving
// Dark floor (indoors): the brighter side must be over both, or it does not move (noise in a dark room).
const float DARK_COUNTS = 40;            // its mean raw counts (smoothed)
const float DARK_REL = 1.05;             // its mean rel: 5 % above the room level
// Big motor watchdog: no MG996R, or no power to it, and the pan would "turn" forever.
const unsigned long PAN_CHECK_MS = 3000;   // time wanting to turn one way, with no change, before it gives up
const unsigned long PAN_RETRY_MS = 60000;  // then it tries again this often
const float PAN_CHECK_GAIN = 0.1;          // a working turn cuts the imbalance by 10 % of where it was

// Pan (MG996R 360, continuous)
const int PAN_STOP_US = 1500;      // "stop" pulse. If it creeps while stopping, try 1480-1520.
const int PAN_SLOW_US = SUN_MODE ? 100 : 70;   // slowest it is driven (offset from 1500; prototype 70: creeps in the last few %)
// Top speed: the biggest pulse offset the pan ever gets (it also caps the dashboard's M / J pulses).
// Prototype 300 (1200 / 1800 us: gentle, the panels are big). sun: 500 (1000 / 2000 us, flat out).
const int PAN_FULL_US = SUN_MODE ? 500 : 450;
const int PAN_DEADBAND_US = 40;    // for the angle estimate: below this it does not turn (until "K" says otherwise)
// "K s": the real big motor only starts turning s us from the stop pulse (its dead band, with the panel's
// weight on USB power: Sync up finds it). Then it is never driven weaker than s + PAN_START_MARGIN, and the
// angle count takes s as its dead band, so the count (and the 3D) only runs when the motor really turns.
// 0 = not set: PAN_SLOW_US and PAN_DEADBAND_US as above.
const int PAN_START_MARGIN = 30, PAN_START_MAX = 350;
int panStartUs = 0;
const int PAN_SAT_US = 400;        // and past this it is flat out
const float PAN_DEG_PER_S = 300;   // its top speed (default). The dashboard sends the measured one ("V <deg/s>").
// Never turn further than this either way from the middle. Prototype 85 (the panels are big).
// sun: 170 (the wire limit).
const float PAN_LIMIT_DEG = SUN_MODE ? 170 : 90;    // prototype: the front half only, 90 left and 90 right, never past (the wires are behind)
// Prototype start: wherever the big motor is at power-up (or when "z" comes, which the page sends on
// every connect) is the front, pan 0. Nothing moves for START_HOLD_MS, then the big motor starts slow
// (its speed cap starts at CALM_MIN and grows back over about 3.5 s). No start-up spin or wiggle.
const unsigned long START_HOLD_MS = SUN_MODE ? 0 : 3000;
unsigned long holdUntil = 0;
// Prototype rest: no light to steer by for REST_MS, then the big motor goes slowly back to the front
// (pan 0, at its slowest pulse) and the panel to flat (TILT_SLOW_STEP). Flat and facing the front it sees
// the whole room again, so a torch anywhere in front brings it round; it can never stay facing away.
const unsigned long REST_MS = SUN_MODE ? 0 : 5000;
const float REST_DEADBAND = 2;   // degrees: close enough to the front
unsigned long idleSince = 0;
const unsigned long PAN_BRAKE_MS = 120;  // hold "stop" this long before switching the signal off

// Tilt (SG-90). Degrees per 10 ms update. The cleaning routine rocks between tiltMin() and tiltMax()
// at TILT_FULL_STEP. Prototype: TILT_HALF (45) degrees each way from the flat angle tiltUp, never past
// TILT_SAFE_MIN..TILT_SAFE_MAX (the servo's ends), 0.4 to 1.5 per update. sun: the fixed 90 to 180
// (the front half), 0.3 to 5.0 per update (5.0 = 500 deg/s, the SG-90's limit).
const float TILT_SLOW_STEP = SUN_MODE ? 0.3 : 0.4;    // slowest
const float TILT_FULL_STEP = SUN_MODE ? 5.0 : 1.5;    // fastest
// SUN_MODE's fixed range. On the prototype 45..135 is only the range at flat 90: it uses tiltMin() / tiltMax().
const float TILT_MIN = SUN_MODE ? 90 : 45, TILT_MAX = SUN_MODE ? 180 : 135;
const float TILT_HALF = 45;                           // prototype: this far either way from flat
const float TILT_SAFE_MIN = 5, TILT_SAFE_MAX = 175;   // prototype: never past these
// Turn-around: tilt at its end but the light still further that way = the light is behind, so the big
// motor turns the panel round toward it. sun: on (past the flat end 90 = the sun is in the back half).
// Prototype: off. Its tilt stops 45 degrees short of each side, so a light past the end is only low,
// not behind; turning round would swing the big panels from side to side and never reach it.
const bool TURN_AROUND = SUN_MODE;
const float TILT_UP = 90;          // tilt angle where the panel faces straight up. Tipped back past it,
                                   // the panel faces backwards, so pan turns the other way to face the light.
                                   // The dashboard can send your build's real flat angle ("U <angle>").
const float FLIP_MARGIN = 15;      // ...but only once it is more than this far back past flat, so a small
                                   // lean or noise near flat cannot flip the pan's direction.
const float TILT_UP_MIN = 10, TILT_UP_MAX = 170;   // prototype: a flat angle must be inside these
float panDegPerS = PAN_DEG_PER_S;  // live values, changed by the dashboard
float tiltUp = TILT_UP;
bool tiltRev = false;              // tilt servo mounted the other way round ("R 1")
bool panRev = false;               // big motor turns the other way round ("Q 1")
// The tilt range: TILT_HALF either way from the flat angle (sun: the fixed TILT_MIN..TILT_MAX).
float tiltMin() { return SUN_MODE ? TILT_MIN : max(TILT_SAFE_MIN, tiltUp - TILT_HALF); }
float tiltMax() { return SUN_MODE ? TILT_MAX : min(TILT_SAFE_MAX, tiltUp + TILT_HALF); }
// A flat angle kept inside its allowed band (sun: the fixed range).
float flatIn(float a) { return SUN_MODE ? constrain(a, TILT_MIN, TILT_MAX) : constrain(a, TILT_UP_MIN, TILT_UP_MAX); }

// Anti-wobble
const unsigned long REVERSE_MS = 1500;
const float CALM_CUT = 0.6, CALM_MIN = 0.3, CALM_RECOVER = 0.002;

// Lost torch: lined up on a torch, then the light drops below LOST_RATIO of what it was while all 4
// stay even = the torch went behind the panel, where the sensor cannot see it. Tip back to face
// straight up (it sees the whole room from there), then track as normal.
const float LOST_RATIO = 0.35;
const unsigned long LOST_MS = 600;
const float LOCK_DECAY = 0.9995;

// Solar cell, measured without a wattmeter: the cell powers a 220 ohm load, and two 10k resistors
// halve its voltage before A4 (the cell can reach ~6.5 V in sun; an Arduino pin takes 5 V max).
const int CELL_PIN = A4;
const float CELL_LOAD_OHM = 220;
const float CELL_DIVIDER = 2.0;

// A room level outside this band means the sensor is missing or miswired.
const int RAIL_LOW = 60;
const int RAIL_HIGH = 1015;
// A sensor that dies after the room was learned (a loose wire): its reading drops to almost nothing
// while the others still see the room. Prototype only: it is left out (healthy false, telemetry ok 0)
// while it reads under DEAD_COUNTS and another sensor reads over DEAD_OTHERS, and comes back over
// ALIVE_COUNTS. The other sensor on its sides then steers alone.
const float DEAD_COUNTS = 60, ALIVE_COUNTS = 90, DEAD_OTHERS = 400;

// false on the real build (LDR to 5 V, 10k to GND: brighter = higher reading).
// true in the Wokwi simulator, whose LDR module reads lower in brighter light.
const bool LDR_INVERTED = true;

// Dust: the total light (sum of the 4 rel values, 100 % each = room level) has a slow "clean" level
// that follows it over about 30 s. A sudden drop that stays = something covers the sensors.
// (rel, not raw counts, also in SUN_MODE: counts bunch up near 1023 in bright light, rel does not.)
const float DUST_BASE_MS = 30000;        // the clean level follows the total down with this time constant ...
const float DUST_RISE_MS = 2000;         // ... and up with this one (dust only takes light away: brighter = cleaner)
const float DUST_DROP = 0.6;             // blocked: total under 60 % of the clean level ...
const float DUST_HIGH = 0.9;             // ... falling there from over 90 % ...
const unsigned long DUST_FALL_MS = 3000; // ... within 3 s (a slow fade is a cloud or dusk)
const float DUST_FLOOR = 0.15;           // under 15 % = the light went out, not dust
const unsigned long DUST_CONFIRM_MS = 2000;   // and it stays low for 2 s with the motors still
// Cleaning: rock the tilt end to end and watch which side helps. Each round: one end, the other end,
// then back to where it was. Hold 1.5 s at each stop, then average the total over 0.5 s.
const unsigned long CLEAN_HOLD_MS = 1500, CLEAN_MEASURE_MS = 500;
const int CLEAN_ROUNDS = 3;
const float CLEAN_DONE = 0.85;           // done as soon as the total is back over 85 % of the clean level
// One blocked light (prototype; Oct 11): something lands on one corner (a leaf, sand, paper). The total
// hardly drops, but that light falls while the other three stay: then stop tracking (it would turn away
// from the "dark" side), confirm for DUST_CONFIRM_MS, and run the same tilting routine. Each light's
// recent level (cb) follows it with CORNER_FOLLOW_MS while all is well. Blocked: under CORNER_DROP of
// its recent level (which was at least CORNER_MIN), with every other light at CORNER_KEEP of its own or
// more. Cancelled if it comes back over CORNER_BACK (a hand passing) or the others change (the light
// moved). Clean: measured at home, its share against the other three is back to CLEAN_DONE of what it
// was before. Still covered after CLEAN_ROUNDS: "needs a hand", and tracking goes on without it.
const float CORNER_DROP = SUN_MODE ? 0 : 0.5;   // 0 = off (the sun build)
const float CORNER_KEEP = 0.8, CORNER_KEEP_HOLD = 0.6, CORNER_BACK = 0.8, CORNER_MIN = 0.8;
const float CORNER_FOLLOW_MS = 3000;
enum { CL_IDLE, CL_BLOCKED, CL_CLEANING, CL_HELP };   // 0 idle, 1 blocked, 2 cleaning, 3 needs a hand

float level[4], room[4], rel[4];
int raw[4];
bool healthy[4] = {true, true, true, true};
bool dead[4] = {false, false, false, false};   // read almost nothing while the others see light
bool torch = false;
bool lit[2] = {false, false};            // per axis: light to steer by (the brighter side is not dark)
bool steering = false;                   // lit on either axis: light present (dust watch, words)
bool panStuck = false;                   // the big motor did not turn the panel (watchdog)
unsigned long panStuckAt = 0;
float pwTime = 0, pwStart = 0;           // watchdog: time wanting to turn, and the signed imbalance it began at
int pwWay = 0;                           // the way it wants to turn (0 = it does not)
bool pwHelped = false;                   // this drive already had proof that the motor turns the panel
bool panProven = false;                  // some drive since start-up had that proof: the motor works
float strongest = 0, roomAvg = 0, cellV = 0;
float angle = TILT_UP;                   // setup() sets it to the flat angle before the first pulse
bool moving[2] = {false, false};
unsigned long since[2] = {0, 0};
float lastDiff[2] = {0, 0}, lastFrac[2] = {0, 0}, drive[2] = {0, 0};
float cap[2] = {1, 1};
int lastWay[2] = {0, 0};
unsigned long lastActive[2] = {0, 0};
unsigned long stoppedAt[2] = {0, 0};     // when the axis last balanced and stopped (SETTLE_MS)
int unwindWay = 0;                       // turning the other way round (UNWIND): -1, +1, 0 = not
unsigned long limitSince = 0, limitSeen = 0, unwindAt = 0;
float uwImb = 0, uwTot = 0;              // the light when the unwind started (proof it turned)
float panOff = 0, panDeg = 0;
bool panAttached = false;
unsigned long brakeUntil = 0;
int panPulse = 0;
unsigned long lastUpdate = 0, lastTelemetry = 0;
float lockStrength = 0;
unsigned long lostSince = 0;
bool seeking = false;
bool turnAround = false;
int turnWay = 0;

// Dust watch and cleaning (same names as logic.js)
int clState = CL_IDLE;
float clBase = 0, clTotal = 0;
int clCorner = -1;                       // the one blocked light (CORNER_DROP), -1 = none
float cb[4] = {0, 0, 0, 0};              // each light's recent level (rel)
float crRatio0 = 0, crSum = 0;           // that light's share before it was blocked; its sum while measuring
unsigned long clHighAt = 0, clSince = 0, clPhaseAt = 0;
int clRound = 0, clStep = 0, clFirst = 0;   // clStep: 0 first end, 1 other end, 2 back home, 3 going home to finish
bool clOk = false;
float clHome = TILT_UP, clTarget = TILT_UP, clSum = 0;   // set when a clean starts (home = where it was)
int clCount = 0;
float clSide[2] = {0, 0}, clPrev[2] = {0, 0};   // last and previous measure at each end (0 = tiltMax(), 1 = tiltMin())

// Pretend-torch mode (driven by the dashboard)
const unsigned long REMOTE_TIMEOUT_MS = 300;
bool remote = false;
unsigned long remoteUntil = 0;
int remotePulse = 0;        // 0 = pan signal off
float remoteTilt = TILT_UP;
int jogPulse = 0;           // timed turn: pulse, and when it ends
unsigned long jogUntil = 0;
bool jogActive = false;
char lineBuf[32];
int lineLen = 0;

int readLdr(int i) {
  int r = analogRead(LDR_PIN[i]);
  return LDR_INVERTED ? 1023 - r : r;
}

// LDR conductance from ADC counts (any unit: only ratios are used). Capped so 1023 stays finite.
float conductance(float counts) {
  float c = constrain(counts, 1, 1021);
  return c / (1023.5 - c);
}

int panDeadband() { return max(PAN_DEADBAND_US, panStartUs); }
int panSlowUs() { return max(PAN_SLOW_US, panStartUs > 0 ? panStartUs + PAN_START_MARGIN : 0); }
float panSpeedFrac(float offUs) {
  int db = panDeadband();
  return constrain((fabs(offUs) - db) / (float)(PAN_SAT_US - db), 0, 1);
}

// dead[]: see DEAD_COUNTS.
void checkDead() {
  for (int i = 0; i < 4; i++) {
    float others = 0;
    for (int j = 0; j < 4; j++) if (j != i && level[j] > others) others = level[j];
    if (!dead[i] && level[i] < DEAD_COUNTS && others > DEAD_OTHERS) dead[i] = true;
    else if (dead[i] && level[i] > ALIVE_COUNTS) dead[i] = false;
  }
}

void readSensors() {
  float best = 0, avg = 0;
  for (int i = 0; i < 4; i++) {
    raw[i] = readLdr(i);
    level[i] += SMOOTH * (raw[i] - level[i]);
  }
  if (!SUN_MODE) checkDead();
  for (int i = 0; i < 4; i++) {
    healthy[i] = room[i] > RAIL_LOW && room[i] < RAIL_HIGH && !dead[i] && !(clState == CL_HELP && clCorner == i);   // a light still covered after cleaning is left out
    rel[i] = conductance(level[i]) / conductance(room[i]);   // 1.0 = room light
    float up = rel[i] - 1;
    if (healthy[i] && up > best && level[i] - room[i] >= TORCH_MIN_COUNTS) best = up;
    avg += room[i] / 4;
  }
  strongest = best;
  roomAvg = avg;
  if (learning) {   // learning: every light keeps the brightest it sees; nothing counts as the torch
    if (learnSettle > 0) learnSettle--;
    else for (int i = 0; i < 4; i++) if (level[i] > room[i]) room[i] = level[i];
    torch = false;
  }
  long cs = 0;
  for (int k = 0; k < 8; k++) cs += analogRead(CELL_PIN);
  cellV += 0.3 * (cs / 8.0 * 5.0 / 1023.0 * CELL_DIVIDER - cellV);
  if (SUN_MODE) {   // outdoors: track whenever there is enough light; the calibration never moves
    float brightest = 0;
    for (int i = 0; i < 4; i++) if (healthy[i] && level[i] > brightest) brightest = level[i];
    if (!torch && brightest > SUN_ON_COUNTS) torch = true;
    else if (torch && brightest < SUN_OFF_COUNTS) torch = false;
    return;
  }
  if (learning) return;
  float on = torchOnPct / 100;
  if (!torch && strongest > on) torch = true;
  else if (torch && strongest < on * TORCH_OFF_RATIO) torch = false;
  if (ROOM_FIXED) return;
  for (int i = 0; i < 4; i++) {
    float rate = (torch && level[i] > room[i]) ? ROOM_FOLLOW_TORCH : ROOM_FOLLOW;
    room[i] += rate * (level[i] - room[i]);
  }
}

// Light reaching one side: the mean relative light of its healthy sensors.
bool sideLight(int a, int b, float &out) {
  int n = 0;
  out = 0;
  if (healthy[a]) { out += rel[a]; n++; }
  if (healthy[b]) { out += rel[b]; n++; }
  if (n == 0) return false;
  out = out / n;
  return true;
}

// The mean counts (smoothed) of one side's healthy sensors.
float sideCounts(int a, int b) {
  int n = 0;
  float out = 0;
  if (healthy[a]) { out += level[a]; n++; }
  if (healthy[b]) { out += level[b]; n++; }
  return n ? out / n : 0;
}

void stopAxis(int axis) {
  if (axis == PAN) panOff = 0;
  moving[axis] = false;
  since[axis] = 0;
  drive[axis] = 0;
}

float tiltToward(float to);   // below: one tilt step toward an angle

void updateAxis(int axis, unsigned long now) {
  float pos, neg;
  bool ok = sideLight(POS_A[axis], POS_B[axis], pos) && sideLight(NEG_A[axis], NEG_B[axis], neg);
  float diff = ok ? pos - neg : 0;
  float frac = ok ? fabs(diff) / max(max(pos, neg), 0.01f) : 0;
  lastDiff[axis] = diff;
  lastFrac[axis] = frac;
  // Light to steer by. Outdoors: the sun gate (torch). Indoors: the brighter side is not dark.
  if (SUN_MODE) lit[axis] = ok && torch;
  else {
    bool posBright = pos >= neg;
    float counts = posBright ? sideCounts(POS_A[axis], POS_B[axis]) : sideCounts(NEG_A[axis], NEG_B[axis]);
    lit[axis] = ok && !learning && counts > DARK_COUNTS && max(pos, neg) > DARK_REL;   // never while learning the room
  }
  if (axis == TILT) {
    // Turn-around: tilt is at its limit but the light is still further that way, so the light is
    // behind. The big motor then turns toward its middle until the light comes round to the front.
    float pushing = DIR[TILT] * diff;
    turnAround = TURN_AROUND && torch && ok && frac * 100 >= startPct &&
      ((angle <= tiltMin() + 0.5 && pushing < 0) || (angle >= tiltMax() - 0.5 && pushing > 0));
    if (!turnAround) turnWay = 0;
  } else if (!panEnabled || panStuck) {   // no big motor, or it is not responding: pan never moves
    stopAxis(PAN);
    return;
  } else if (torch && ok && turnAround) {   // decided by tilt on the update before
    // Pick a direction once (toward the middle) and keep it; reverse only at the wire limit.
    if (turnWay == 0) turnWay = panDeg > 0 ? -1 : 1;
    if ((turnWay > 0 && panDeg >= PAN_LIMIT_DEG) || (turnWay < 0 && panDeg <= -PAN_LIMIT_DEG)) turnWay = -turnWay;
    panOff = turnWay * PAN_FULL_US;
    moving[PAN] = true;
    drive[PAN] = 1;
    return;
  }
  if (axis == PAN && unwindWay != 0) {   // turning the other way round (UNWIND)
    if ((unwindWay < 0 && panDeg <= -UNWIND_TO) || (unwindWay > 0 && panDeg >= UNWIND_TO)) {
      unwindWay = 0; stopAxis(PAN); stoppedAt[PAN] = now;
      float imb = diff >= 0 ? frac : -frac;
      if (fabs(imb - uwImb) < UNWIND_SAME && fabs(clTotal - uwTot) < UNWIND_SAME * uwTot) { panStuck = true; panStuckAt = now; }   // nothing changed: it never turned
      return;
    }
    panOff = unwindWay * PAN_FULL_US; moving[PAN] = true; drive[PAN] = 1;
    return;
  }
  if (!lit[axis]) { stopAxis(axis); return; }
  if (!moving[axis]) {
    if (frac * 100 < startPct) { since[axis] = 0; return; }
    if (stoppedAt[axis] != 0 && now - stoppedAt[axis] < SETTLE_MS) return;   // just balanced: let it settle first
    if (since[axis] == 0) since[axis] = now;
    if (now - since[axis] < CONFIRM_MS) return;
    moving[axis] = true;
  }
  if (frac * 100 < stopPct) { stopAxis(axis); stoppedAt[axis] = now; return; }
  int way = DIR[axis] * (diff > 0 ? 1 : -1);
  if (axis == PAN && angle < tiltUp - FLIP_MARGIN) way = -way;   // panel tipped back well past flat: it faces backwards
  // Anti-wobble: going back the other way soon after moving means it overshot.
  if (lastWay[axis] != 0 && way != lastWay[axis] && now - lastActive[axis] < REVERSE_MS)
    cap[axis] = max(CALM_MIN, cap[axis] * CALM_CUT);
  lastWay[axis] = way;
  lastActive[axis] = now;
  // Full speed when far off, easing down to slow only for the last few % of imbalance.
  float d = cap[axis] * constrain((frac * 100 - stopPct) / (FULL_PCT - stopPct), 0, 1);
  drive[axis] = d;
  if (axis == PAN) {
    if ((way > 0 && panDeg >= PAN_LIMIT_DEG) || (way < 0 && panDeg <= -PAN_LIMIT_DEG)) {
      stopAxis(PAN);
      if (UNWIND) {   // the light is past the limit: after UNWIND_WAIT_MS, go round the other way
        if (limitSince == 0 || now - limitSeen > 300) limitSince = now;
        limitSeen = now;
        if (now - limitSince >= UNWIND_WAIT_MS && (unwindAt == 0 || now - unwindAt >= UNWIND_REST_MS)) {
          unwindWay = -way; unwindAt = now; limitSince = 0;
          uwImb = diff >= 0 ? frac : -frac; uwTot = clTotal;
          panOff = unwindWay * PAN_FULL_US; moving[PAN] = true; drive[PAN] = 1;
        }
      }
      return;
    }
    panOff = way * (panSlowUs() + d * (PAN_FULL_US - panSlowUs()));
    return;
  }
  float next = angle + way * (TILT_SLOW_STEP + d * (TILT_FULL_STEP - TILT_SLOW_STEP));
  float lo = tiltMin(), hi = tiltMax();
  if (next <= lo || next >= hi) {
    // end stop: stay put rather than push. Outside the range (a new flat angle): back in one step at a time.
    angle = tiltToward(constrain(next, lo, hi));
    stopAxis(TILT);
    return;
  }
  angle = next;
}

// Big motor watchdog, after both axes have decided. The clock runs while the pan wants to turn one way
// (driving, or held at its turn limit) with light to steer by. A turn that works makes the left-right
// imbalance fall by PAN_CHECK_GAIN of where it was, or change sign: that starts the count again (and is
// proof the motor works if the pan was driven with the tilt still; a moving tilt changes the left-right
// picture too). PAN_CHECK_MS without that = stuck: stop the pan, steer with the tilt alone.
// The turn count reaches the limit in well under a second, so the wait at the limit counts too, unless
// this drive had proof: then the light is simply past the limit.
void watchPan(unsigned long now) {
  if (panStuck) return;
  if (unwindWay != 0) { pwWay = 0; pwTime = 0; return; }   // turning round: checked at its end instead
  int way = DIR[PAN] * (lastDiff[PAN] > 0 ? 1 : -1);
  if (angle < tiltUp - FLIP_MARGIN) way = -way;   // as updateAxis: tipped back well past flat
  bool wants = panEnabled && !turnAround && lit[PAN] && (moving[PAN] || lastFrac[PAN] * 100 >= startPct);
  if (!wants) { pwWay = 0; pwTime = 0; return; }
  float imb = lastDiff[PAN] >= 0 ? lastFrac[PAN] : -lastFrac[PAN];
  if (way != pwWay) { pwWay = way; pwStart = imb; pwTime = 0; pwHelped = false; return; }   // a new drive: sample
  if (imb * pwStart <= 0 || fabs(imb) <= (1 - PAN_CHECK_GAIN) * fabs(pwStart)) {   // the light got more even
    pwStart = imb; pwTime = 0;
    if (panOff != 0 && !moving[TILT]) { pwHelped = true; panProven = true; }
    return;
  }
  bool atLimit = (way > 0 && panDeg >= PAN_LIMIT_DEG) || (way < 0 && panDeg <= -PAN_LIMIT_DEG);
  if (atLimit && (pwHelped || (!SUN_MODE && panProven))) return;   // prototype: once it has shown it turns, waiting at its limit is not a dead motor (the light is past it)
  pwTime += UPDATE_MS;
  if (pwTime >= PAN_CHECK_MS) { panStuck = true; panStuckAt = now; pwWay = 0; pwTime = 0; stopAxis(PAN); }
}
// Every update (also while cleaning or page-driven): after PAN_RETRY_MS, try the big motor again.
void panRetry(unsigned long now) {
  if (panStuck && now - panStuckAt >= PAN_RETRY_MS) { panStuck = false; pwWay = 0; pwTime = 0; }
}

// Lost torch check, after both axes have decided. While seeking, tilt heads for straight up.
void checkLost(unsigned long now) {
  if (!torch) { lockStrength = 0; lostSince = 0; seeking = false; return; }
  bool still = !moving[PAN] && !moving[TILT];
  if (!still) { seeking = false; lostSince = 0; return; }
  lockStrength = max(lockStrength * LOCK_DECAY, strongest);   // how strong a lined-up torch looks
  if (!seeking) {
    if (strongest < lockStrength * LOST_RATIO) {
      if (lostSince == 0) lostSince = now;
      if (now - lostSince >= LOST_MS) seeking = true;
    } else lostSince = 0;
  }
  if (seeking) {
    float gap = constrain(tiltUp, tiltMin(), tiltMax()) - angle;   // straight up, inside the tilt range
    if (fabs(gap) < 1) { seeking = false; lostSince = 0; lockStrength = strongest; return; }
    angle += (gap > 0 ? 1 : -1) * min(TILT_FULL_STEP, (float)fabs(gap));
  }
}

// Total light: the sum of the healthy sensors' rel values (4.0 = room level on all 4).
float lightTotal() {
  float t = 0;
  for (int i = 0; i < 4; i++) if (healthy[i]) t += rel[i];
  return t;
}

void startClean(unsigned long now);

// REST_MS: after a while with no light to steer by, back to the front and flat, slowly.
void restHome(unsigned long now) {
  if (steering || seeking || clState != CL_IDLE) { idleSince = 0; return; }
  if (idleSince == 0) { idleSince = now; return; }
  if (now - idleSince < REST_MS) return;
  if (panEnabled && !panStuck && fabs(panDeg) > REST_DEADBAND) { panOff = (panDeg > 0 ? -1 : 1) * panSlowUs(); moving[PAN] = true; }
  else stopAxis(PAN);
  float flat = constrain(tiltUp, tiltMin(), tiltMax()), gap = flat - angle;
  if (fabs(gap) > 0) angle += (gap > 0 ? 1 : -1) * min(TILT_SLOW_STEP, (float)fabs(gap));
}

// Dust watch, after both axes and the lost check (normal tracking only).
// One light's share: its rel against the mean of the other healthy lights (1 = the same as them).
float cornerRatio(int i) {
  float sum = 0; int n = 0;
  for (int j = 0; j < 4; j++) if (j != i && healthy[j]) { sum += rel[j]; n++; }
  return n ? rel[i] / max(sum / n, 0.01f) : 1;
}
bool othersSteady(int i, float k) {
  int n = 0;
  for (int j = 0; j < 4; j++) if (j != i && healthy[j]) { if (rel[j] < k * cb[j]) return false; n++; }
  return n >= 2;
}
// CORNER_DROP: true when it handled this update (a blocked light, or one that still needs a hand).
bool watchCorner(unsigned long now, bool light) {
  if (clCorner >= 0) {
    int i = clCorner;
    if (clState == CL_BLOCKED) {
      if (!light || rel[i] >= CORNER_BACK * cb[i] || !othersSteady(i, CORNER_KEEP_HOLD)) { clState = CL_IDLE; clCorner = -1; return true; }
      if (now - clSince >= DUST_CONFIRM_MS) startClean(now);   // the motors are held still meanwhile (control)
      return true;
    }
    if (clState == CL_HELP) {   // clears by itself once that light is back in line with the others
      if (cornerRatio(i) >= CLEAN_DONE * crRatio0) { clState = CL_IDLE; clCorner = -1; }
      return true;
    }
    if (clState == CL_IDLE) clCorner = -1;
  }
  if (clState != CL_IDLE) return false;
  for (int i = 0; i < 4; i++) cb[i] += (rel[i] - cb[i]) * UPDATE_MS / CORNER_FOLLOW_MS;
  if (!light) return false;
  for (int i = 0; i < 4; i++) {
    if (!healthy[i] || cb[i] < CORNER_MIN || rel[i] >= CORNER_DROP * cb[i] || !othersSteady(i, CORNER_KEEP)) continue;
    float sum = 0; int n = 0;
    for (int j = 0; j < 4; j++) if (j != i && healthy[j]) { sum += cb[j]; n++; }
    clState = CL_BLOCKED; clSince = now; clCorner = i;
    crRatio0 = cb[i] / max(sum / n, 0.01f);
    return true;
  }
  return false;
}

void watchDust(unsigned long now) {
  bool light = torch || steering;   // light present: a torch, or enough light to steer by
  if (CORNER_DROP > 0 && watchCorner(now, light)) return;   // one blocked light: handled there
  if (clBase <= 0) {   // first light: start the clean level here
    if (light && clTotal > 0) { clBase = clTotal; clHighAt = now; }
    return;
  }
  if (clTotal >= DUST_HIGH * clBase) clHighAt = now;
  if (clState == CL_HELP) {   // keeps tracking; clears by itself when the light is back
    if (clTotal >= CLEAN_DONE * clBase) clState = CL_IDLE;
    return;
  }
  if (clState == CL_BLOCKED) {
    if (!light || clTotal >= DUST_DROP * clBase || clTotal < DUST_FLOOR * clBase) clState = CL_IDLE;
    else {
      bool still = !moving[PAN] && !moving[TILT] && !seeking;
      if (!still) clSince = now;   // the 2 s count only while the motors are still
      else if (now - clSince >= DUST_CONFIRM_MS) startClean(now);
      return;
    }
  }
  if (light && clTotal < DUST_DROP * clBase && clTotal >= DUST_FLOOR * clBase && now - clHighAt <= DUST_FALL_MS) {
    clState = CL_BLOCKED;
    clSince = now;
    return;
  }
  if (light) clBase += (clTotal - clBase) * UPDATE_MS / (clTotal > clBase ? DUST_RISE_MS : DUST_BASE_MS);
}

float sideAngle(int side) { return side == 0 ? tiltMax() : tiltMin(); }
void cleanGo(float target, unsigned long now) { clTarget = target; clPhaseAt = now; clSum = 0; clCount = 0; crSum = 0; }

void startClean(unsigned long now) {
  if (clBase <= 0) clBase = clTotal;
  clState = CL_CLEANING; clHome = angle; clRound = 1; clStep = 0; clFirst = 0; clOk = false;
  for (int k = 0; k < 2; k++) { clSide[k] = 0; clPrev[k] = 0; }
  stopAxis(PAN); stopAxis(TILT);
  seeking = false; lostSince = 0; turnAround = false; turnWay = 0;
  cleanGo(sideAngle(0), now);
}

// Back to normal tracking (state: CL_IDLE, or CL_HELP if the light did not come back).
void endClean(int state) {
  clState = state;
  if (state == CL_IDLE) { clRound = 0; clCorner = -1; }
  stopAxis(PAN); stopAxis(TILT);
  seeking = false; lostSince = 0; lockStrength = strongest;
}

// "D 0": stop the routine and forget the clean level (it starts again from the next light).
void cancelClean() {
  if (clState == CL_CLEANING) endClean(CL_IDLE);
  clState = CL_IDLE; clBase = 0; clRound = 0; clCorner = -1;
}

// One update of the cleaning routine (instead of normal tracking). Pan stays stopped; tilt moves at
// full step to the target, holds, measures, then picks the next stop.
void cleanStep(unsigned long now) {
  stopAxis(PAN); stopAxis(TILT);
  float gap = clTarget - angle;
  if (gap != 0) {
    if (fabs(gap) <= TILT_FULL_STEP) { angle = clTarget; clPhaseAt = now; }
    else angle += (gap > 0 ? 1 : -1) * TILT_FULL_STEP;
    return;
  }
  if (clStep == 3) { endClean(clOk ? CL_IDLE : CL_HELP); return; }   // home again: done
  unsigned long held = now - clPhaseAt;
  if (held < CLEAN_HOLD_MS) return;
  clSum += clTotal; clCount++;
  if (clCorner >= 0) crSum += cornerRatio(clCorner);
  if (held < CLEAN_HOLD_MS + CLEAN_MEASURE_MS) return;
  float m = clSum / clCount;
  // one blocked light: judged at home only (tilted, the light falls differently on each corner)
  bool back = clCorner >= 0 ? clStep == 2 && crSum / clCount >= CLEAN_DONE * crRatio0 : m >= CLEAN_DONE * clBase;
  if (back) {   // the light is back: go home and stop
    clOk = true; clStep = 3; cleanGo(clHome, now);
    return;
  }
  if (clStep < 2) {   // measured at one end
    int side = clStep == 0 ? clFirst : 1 - clFirst;
    clPrev[side] = clSide[side]; clSide[side] = m;
    clStep++;
    cleanGo(clStep == 1 ? sideAngle(1 - clFirst) : clHome, now);
    return;
  }
  // back home after a round, still dim
  if (clRound >= CLEAN_ROUNDS) { clOk = false; clStep = 3; cleanGo(clHome, now); return; }
  clRound++;
  // next round starts with the end that helped more (round 1: the bigger total; later: the bigger gain)
  clFirst = clSide[1] - clPrev[1] > clSide[0] - clPrev[0] ? 1 : 0;
  clStep = 0;
  cleanGo(sideAngle(clFirst), now);
}

// One control update of the tracker's own logic (not in pretend-sun mode).
void control(unsigned long now) {
  clTotal = lightTotal();
  panRetry(now);
  bool holding = (long)(now - holdUntil) < 0;
  if (clState == CL_CLEANING) cleanStep(now);
  else if (holding) { stopAxis(PAN); stopAxis(TILT); }   // just started, or a new front: hold still
  else if (clState == CL_BLOCKED && clCorner >= 0) { stopAxis(PAN); stopAxis(TILT); watchDust(now); }   // one light blocked: stop, confirm
  else {
    updateAxis(PAN, now);
    updateAxis(TILT, now);
    steering = lit[PAN] || lit[TILT];
    watchPan(now);
    checkLost(now);
    watchDust(now);
    if (REST_MS > 0) restHome(now);
  }
  if (!holding) for (int a = 0; a < 2; a++) cap[a] = min(1.0f, cap[a] + CALM_RECOVER);   // the slow start grows after the hold
}

// The pulse sent to the big motor for an offset: flipped if it turns the other way round ("Q 1").
// The logic and the turn count keep the normal sign; only the output flips (all of it: own steering, M, J).
int panOut(float off) { return (int)lround(PAN_STOP_US + (panRev ? -off : off)); }

// Pan: drive while panOff says so. When told to stop: "stop" pulse for PAN_BRAKE_MS, then signal off.
void drivePan(unsigned long now) {
  if (!panEnabled) { panOff = 0; if (panAttached) { pan.detach(); panAttached = false; } panPulse = 0; return; }
  if (panOff == 0) {
    if (panAttached) {
      if (brakeUntil == 0) { brakeUntil = now + PAN_BRAKE_MS; panPulse = PAN_STOP_US; pan.writeMicroseconds(PAN_STOP_US); }
      else if (now >= brakeUntil) { pan.detach(); panAttached = false; brakeUntil = 0; panPulse = 0; }
    }
    return;
  }
  brakeUntil = 0;
  if (!panAttached) { pan.attach(PAN_PIN); panAttached = true; }
  panPulse = panOut(panOff);
  pan.writeMicroseconds(panPulse);
  panDeg += (panOff > 0 ? 1 : -1) * panDegPerS * panSpeedFrac(panOff) * UPDATE_MS / 1000.0;
}

// The angle sent to the tilt servo: flipped if it is mounted the other way round. The logic keeps the normal angle.
float servoAngle() { return tiltRev ? 180 - angle : angle; }

void writeTilt() {
  tilt.writeMicroseconds((int)(MIN_PULSE_WIDTH + servoAngle() * (MAX_PULSE_WIDTH - MIN_PULSE_WIDTH) / 180.0));
}

// One tilt step toward an angle at its normal top speed (TILT_FULL_STEP per update); lands on it exactly.
float tiltToward(float to) {
  return fabs(to - angle) <= TILT_FULL_STEP ? to : angle + (to > angle ? TILT_FULL_STEP : -TILT_FULL_STEP);
}
// Tilt to an angle at that speed, one step per 10 ms. Blocking: tests and start-up only.
void sweepTilt(float to) {
  while (angle != to) { angle = tiltToward(to); writeTilt(); delay(UPDATE_MS); }
}

// Servo test (type s, or the dashboard's Test servos button): tilt sweeps end to end inside its
// range, then pan spins at full speed each way. Time the pan spin to check PAN_DEG_PER_S.
void servoTest() {
  Serial.println("{\"evt\":\"test\",\"step\":\"tilt\"}");
  sweepTilt(tiltMax()); sweepTilt(tiltMin()); sweepTilt(tiltUp);
  delay(200);
  if (!panEnabled) { Serial.println("{\"evt\":\"test\",\"step\":\"done\"}"); return; }
  Serial.println("{\"evt\":\"test\",\"step\":\"pan+\"}");
  pan.attach(PAN_PIN);
  pan.writeMicroseconds(PAN_STOP_US + PAN_FULL_US); delay(600);
  Serial.println("{\"evt\":\"test\",\"step\":\"pan-\"}");
  pan.writeMicroseconds(PAN_STOP_US - PAN_FULL_US); delay(600);
  pan.writeMicroseconds(PAN_STOP_US); delay(PAN_BRAKE_MS);
  pan.detach();
  panAttached = false;
  Serial.println("{\"evt\":\"test\",\"step\":\"done\"}");
}

// Here is the front: pan count 0, then hold still and start slow (START_HOLD_MS).
void startHere(unsigned long now) {
  panDeg = 0;
  if (START_HOLD_MS == 0) return;
  holdUntil = now + START_HOLD_MS;
  cap[PAN] = CALM_MIN;
  stopAxis(PAN); stopAxis(TILT);
}

// Learn the room: average 1 second of readings. Keep the torch OFF while this runs.
void saveRoom() {
  for (int i = 0; i < 4; i++) EEPROM.put(EE_ROOM + 2 * i, (uint16_t)constrain(room[i], 0, 1023));
  EEPROM.write(EE_ROOM + 8, 0x5A);
}
// Tilt reverse and flat angle: saved only when they change, read back at start-up.
void saveTilt() {
  uint16_t up10 = (uint16_t)lround(constrain(tiltUp, 0, 180) * 10);
  uint8_t rv = tiltRev ? 1 : 0, old;
  uint16_t oldUp;
  EEPROM.get(EE_TILT, old); EEPROM.get(EE_TILT + 1, oldUp);
  if (old != rv) EEPROM.write(EE_TILT, rv);
  if (oldUp != up10) EEPROM.put(EE_TILT + 1, up10);
  if (EEPROM.read(EE_TILT + 3) != 0x5B) EEPROM.write(EE_TILT + 3, 0x5B);
}
void loadTilt() {
  if (EEPROM.read(EE_TILT + 3) != 0x5B) return;   // nothing saved yet: keep the defaults
  uint16_t up10;
  EEPROM.get(EE_TILT + 1, up10);
  tiltRev = EEPROM.read(EE_TILT) == 1;
  float up = up10 / 10.0;
  tiltUp = flatIn(up) == up ? up : TILT_UP;   // a flat angle outside 10..170 is garbage: use 90
}
// Big motor reverse ("Q"): saved only when it changes, read back at start-up.
void savePanRev() {
  uint8_t v = panRev ? 1 : 0;
  if (EEPROM.read(EE_PANREV) != v) EEPROM.write(EE_PANREV, v);
  if (EEPROM.read(EE_PANREV + 1) != 0x5D) EEPROM.write(EE_PANREV + 1, 0x5D);
}
void savePanStart() {
  uint16_t v = (uint16_t)panStartUs, old;
  EEPROM.get(EE_PANSTART, old);
  if (old != v) EEPROM.put(EE_PANSTART, v);
  if (EEPROM.read(EE_PANSTART + 2) != 0x5E) EEPROM.write(EE_PANSTART + 2, 0x5E);
}
void loadPanStart() {
  if (EEPROM.read(EE_PANSTART + 2) != 0x5E) return;   // nothing saved yet
  uint16_t v; EEPROM.get(EE_PANSTART, v);
  panStartUs = v <= PAN_START_MAX ? v : 0;
}
// The slider and the measured speed, so the board runs the same on a power bank, without the page.
void saveSettings() {
  uint8_t sl = (uint8_t)sensLevel; uint16_t v = (uint16_t)lround(panDegPerS), oldV;
  if (EEPROM.read(EE_SETTINGS) != sl) EEPROM.write(EE_SETTINGS, sl);
  EEPROM.get(EE_SETTINGS + 1, oldV);
  if (oldV != v) EEPROM.put(EE_SETTINGS + 1, v);
  if (EEPROM.read(EE_SETTINGS + 3) != 0x5F) EEPROM.write(EE_SETTINGS + 3, 0x5F);
}
void loadSettings() {
  if (EEPROM.read(EE_SETTINGS + 3) != 0x5F) return;   // nothing saved yet: the defaults
  uint8_t sl = EEPROM.read(EE_SETTINGS); uint16_t v; EEPROM.get(EE_SETTINGS + 1, v);
  if (sl <= 100) applySensitivity(sl);
  if (v >= 20 && v <= 900) panDegPerS = v;
}
void loadPanRev() { panRev = EEPROM.read(EE_PANREV + 1) == 0x5D && EEPROM.read(EE_PANREV) == 1; }
// Light positions ("L"): each pin 0..3 used once.
bool mapOk(const int m[4]) {
  int seen = 0;
  for (int i = 0; i < 4; i++) {
    if (m[i] < 0 || m[i] > 3 || (seen & (1 << m[i]))) return false;
    seen |= 1 << m[i];
  }
  return true;
}
void applyMap(const int m[4]) { for (int i = 0; i < 4; i++) { ldrMap[i] = m[i]; LDR_PIN[i] = ANALOG_PIN[m[i]]; } }
// Saved writing only the bytes that change, read back at start-up (before the room is read).
void saveMap() {
  for (int i = 0; i < 4; i++) if (EEPROM.read(EE_MAP + i) != ldrMap[i]) EEPROM.write(EE_MAP + i, ldrMap[i]);
  if (EEPROM.read(EE_MAP + 4) != 0x5C) EEPROM.write(EE_MAP + 4, 0x5C);
  mapSaved = true;
}
void loadMap() {
  if (EEPROM.read(EE_MAP + 4) != 0x5C) return;   // nothing saved yet: keep the default
  int m[4];
  for (int i = 0; i < 4; i++) m[i] = EEPROM.read(EE_MAP + i);
  if (!mapOk(m)) return;                          // garbled: keep the default
  applyMap(m);
  mapSaved = true;
}
bool loadRoom() {
  if (EEPROM.read(EE_ROOM + 8) != 0x5A) return false;
  for (int i = 0; i < 4; i++) { uint16_t v; EEPROM.get(EE_ROOM + 2 * i, v); room[i] = v; level[i] = readLdr(i); }
  return true;
}

// Fresh learn (start-up with nothing saved, "r", new light positions): 1 second, keeping the
// brightest each light sees. Keep the torch OFF for this second.
void learnRoom() {
  for (int i = 0; i < 4; i++) { level[i] = readLdr(i); room[i] = level[i]; }
  for (int k = 0; k < 50; k++) {
    for (int i = 0; i < 4; i++) {
      level[i] += 0.3 * (readLdr(i) - level[i]);
      if (level[i] > room[i]) room[i] = level[i];
    }
    delay(20);
  }
  torch = false;
  stopAxis(PAN);
  stopAxis(TILT);
  clState = CL_IDLE; clBase = 0; clRound = 0;   // new room levels: start the clean level again
  saveRoom();
}

// "W <ms> <add>": learn for up to <ms> ms while the user moves around. add 1 = keep the brightest
// from before too (learn again), add 0 = start over. "W 0" = done now.
void startLearn(unsigned long ms, bool add) {
  if (!add) for (int i = 0; i < 4; i++) room[i] = level[i];
  learning = true;
  learnSettle = LEARN_SETTLE;
  learnUntil = millis() + min(ms, LEARN_MAX_MS);
  torch = false;
  stopAxis(PAN);
  stopAxis(TILT);
  clState = CL_IDLE; clBase = 0; clRound = 0;
}
void stopLearn() {
  if (!learning) return;
  learning = false;
  saveRoom();
}

// One JSON line per call, read by the dashboard over Web Serial. Same fields as logic.js telemetry().
void sendTelemetry(unsigned long now) {
  Serial.print("{\"t\":"); Serial.print(now);
  Serial.print(",\"raw\":[");
  for (int i = 0; i < 4; i++) { Serial.print(raw[i]); Serial.print(i < 3 ? "," : "]"); }
  Serial.print(",\"room\":[");
  for (int i = 0; i < 4; i++) { Serial.print((int)room[i]); Serial.print(i < 3 ? "," : "]"); }
  Serial.print(",\"ok\":[");
  for (int i = 0; i < 4; i++) { Serial.print(healthy[i] ? 1 : 0); Serial.print(i < 3 ? "," : "]"); }
  Serial.print(",\"lt\":[");
  for (int i = 0; i < 4; i++) { Serial.print((long)lround(rel[i] * 100)); Serial.print(i < 3 ? "," : "]"); }
  Serial.print(",\"map\":[");
  for (int i = 0; i < 4; i++) { Serial.print(ldrMap[i]); Serial.print(i < 3 ? "," : "]"); }
  Serial.print(",\"ms\":"); Serial.print(mapSaved ? 1 : 0);
  Serial.print(",\"pe\":"); Serial.print(panEnabled ? 1 : 0);
  Serial.print(",\"ln\":"); Serial.print(learning ? 1 : 0);
  Serial.print(",\"rl\":"); Serial.print((int)roomAvg);
  Serial.print(",\"torch\":"); Serial.print(torch ? 1 : 0);
  Serial.print(",\"strong\":"); Serial.print((long)lround(strongest * 100));
  Serial.print(",\"on\":"); Serial.print(torchOnPct, 0);
  Serial.print(",\"off\":"); Serial.print((long)lround(torchOnPct * TORCH_OFF_RATIO));
  Serial.print(",\"lit\":"); Serial.print(steering ? 1 : 0);
  Serial.print(",\"bal\":["); Serial.print((long)lround(lastFrac[0] * 100)); Serial.print(",");
  Serial.print((long)lround(lastFrac[1] * 100)); Serial.print("]");
  for (int a = 0; a < 2; a++) {
    Serial.print(a == 0 ? ",\"pan\":{" : ",\"tilt\":{");
    Serial.print("\"diff\":"); Serial.print((long)lround(lastDiff[a] * 100));
    Serial.print(",\"pct\":"); Serial.print(lastFrac[a] * 100, 1);
    Serial.print(",\"mv\":"); Serial.print(moving[a] ? 1 : 0);
    Serial.print(",\"drv\":"); Serial.print((long)lround(drive[a] * 100));
    if (a == 0) {
      Serial.print(",\"us\":"); Serial.print(panPulse);
      Serial.print(",\"deg\":"); Serial.print(panDeg, 1);
      Serial.print(",\"lim\":"); Serial.print(PAN_LIMIT_DEG, 0);
      Serial.print(",\"stuck\":"); Serial.print(panStuck ? 1 : 0); Serial.print(",\"uw\":"); Serial.print(unwindWay);
    } else {
      Serial.print(",\"ang\":"); Serial.print(angle, 1);
    }
    Serial.print(",\"cap\":"); Serial.print((long)lround(cap[a] * 100));
    Serial.print("}");
  }
  Serial.print(",\"sk\":"); Serial.print(seeking ? 1 : 0);
  Serial.print(",\"cl\":{\"st\":"); Serial.print(clState);
  Serial.print(",\"base\":"); Serial.print((long)lround(clBase * 100));
  Serial.print(",\"now\":"); Serial.print((long)lround(clTotal * 100));
  Serial.print(",\"round\":"); Serial.print(clRound);
  Serial.print(",\"cn\":"); Serial.print(clCorner);
  Serial.print("}");
  float cellMa = cellV / CELL_LOAD_OHM * 1000.0;
  Serial.print(",\"cell\":{\"v\":"); Serial.print(cellV, 2);
  Serial.print(",\"ma\":"); Serial.print(cellMa, 1);
  Serial.print(",\"mw\":"); Serial.print(cellV * cellMa, 1);
  Serial.print("}");
  Serial.print(",\"cfg\":{\"start\":"); Serial.print(startPct, 0);
  Serial.print(",\"stop\":"); Serial.print(stopPct, 0);
  Serial.print(",\"sl\":"); Serial.print(sensLevel);
  Serial.print(",\"full\":"); Serial.print(FULL_PCT, 0);
  Serial.print(",\"dir\":["); Serial.print(DIR[0]); Serial.print(","); Serial.print(DIR[1]); Serial.print("]");
  Serial.print(",\"pdps\":"); Serial.print(panDegPerS, 0);
  Serial.print(",\"up\":"); Serial.print(tiltUp, 0);
  Serial.print(",\"rev\":"); Serial.print(tiltRev ? 1 : 0);
  Serial.print(",\"prev\":"); Serial.print(panRev ? 1 : 0);
  Serial.print(",\"kst\":"); Serial.print(panStartUs);
  Serial.print("},\"rm\":"); Serial.print(remote ? 1 : 0);
  Serial.println("}");
}

void setup() {
  Serial.begin(115200);
  panEnabled = EEPROM.read(EE_PAN_ENABLED) != 0xA5;   // remembered from last time
  loadTilt();                                          // tilt reverse and flat angle, if saved
  loadMap();                                           // light positions, if saved (before the room is read)
  loadPanRev();                                        // big motor reversed, if saved
  loadPanStart();                                      // big motor starting pulse, if saved
  loadSettings();                                      // the slider and the measured speed, if saved
  angle = remoteTilt = tiltUp;                         // start flat: the first pulse already holds it there
  tilt.attach(TILT_PIN);
  writeTilt();
  startHere(millis());   // no start-up spin: where it is now is the front, and it holds still a moment
  // Prototype: a fresh 1 s learn of the room at every power-up (torch OFF), so it fits wherever it is
  // plugged in (the demo venue). The sun build reads back the room learned last time.
  if (!SUN_MODE || !loadRoom()) learnRoom();
  Serial.println("{\"hello\":\"tracker\",\"ver\":4}");
  Serial.println("Tracker v4 running. Learned the room light; shine a torch to steer.");
  Serial.println("Type r + Enter to relearn the room (torch off), z to set pan middle, s to test the servos.");
}

// "M <pulse> <tilt>": the dashboard drives the motors (pretend torch). Pulse 0 = pan signal off.
void handleMotorLine(char *line) {
  char *p = line + 1;
  long pulse = strtol(p, &p, 10);
  float t = strtod(p, &p);
  if (!remote) { stopAxis(PAN); stopAxis(TILT); }   // take over from the tracker's own logic
  remotePulse = pulse == 0 ? 0 : (int)constrain(pulse, PAN_STOP_US - PAN_FULL_US, PAN_STOP_US + PAN_FULL_US);
  remoteTilt = constrain(t, tiltMin(), tiltMax());
  remote = true;
  if ((long)(millis() + REMOTE_TIMEOUT_MS - remoteUntil) > 0) remoteUntil = millis() + REMOTE_TIMEOUT_MS;   // never shorten a timed turn
}

void checkJog(unsigned long now);   // below: starts / stops a timed turn on time

// "L tl tr bl br": which pin (0..3 = A0..A3) is at each position. Must use each pin once. Remembered.
void handleMapLine(char *line) {
  char *p = line + 1;
  int m[4];
  for (int i = 0; i < 4; i++) m[i] = (int)strtol(p, &p, 10);
  if (!mapOk(m)) return;   // not a proper set: ignore
  bool same = true;
  for (int i = 0; i < 4; i++) if (ldrMap[i] != m[i]) same = false;
  if (!same) { applyMap(m); learnRoom(); }   // each position now reads a different LDR: learn the room again
  saveMap();   // after the learn, so a power cut during it keeps the old map with its own room levels
}

// "J <pulse> <ms> <tilt>": turn the big motor at <pulse> for exactly <ms> ms. Pulse 0 or ms 0 = stop now.
void handleJogLine(char *line) {
  char *p = line + 1;
  long pulse = strtol(p, &p, 10);
  long ms = strtol(p, &p, 10);
  float t = strtod(p, &p);
  if (!remote) { stopAxis(PAN); stopAxis(TILT); }
  jogPulse = pulse == 0 ? 0 : (int)constrain(pulse, PAN_STOP_US - PAN_FULL_US, PAN_STOP_US + PAN_FULL_US);
  ms = constrain(ms, 0, 30000);
  jogUntil = millis() + (unsigned long)ms;
  remoteTilt = constrain(t, tiltMin(), tiltMax());
  remote = true;
  remoteUntil = millis() + (unsigned long)ms + REMOTE_TIMEOUT_MS;
  checkJog(millis());   // start right now, not at the next 10 ms update
}

// Timed turns start and stop exactly on time: checked on every pass of loop(), not every 10 ms.
void checkJog(unsigned long now) {
  bool on = panEnabled && remote && jogPulse != 0 && (long)(now - jogUntil) < 0;
  if (on == jogActive) return;
  jogActive = on;
  if (on) {
    if (!panAttached) { pan.attach(PAN_PIN); panAttached = true; }
    brakeUntil = 0;
    panOff = jogPulse - PAN_STOP_US;
    panPulse = panOut(panOff);
  } else {
    panOff = 0;   // the next update brakes, then switches the signal off
  }
  pan.writeMicroseconds(on ? panPulse : PAN_STOP_US);
}

// Single letters work on their own (Serial Monitor, any line ending); "M ..." lines need Enter.
void readSerial() {
  while (Serial.available()) {
    char c = Serial.read();
    if (lineLen == 0) {
      if (c == 'r') { learnRoom(); Serial.println("Relearned the room light."); continue; }
      if (c == 's' || c == 'S') { servoTest(); continue; }
      if (c == 'z' || c == 'Z') { startHere(millis()); Serial.println("Pan middle set."); continue; }
    }
    if (c == '\n' || c == '\r') {
      lineBuf[lineLen] = 0;
      if (lineLen > 0 && (lineBuf[0] == 'M' || lineBuf[0] == 'm')) handleMotorLine(lineBuf);
      if (lineLen > 0 && (lineBuf[0] == 'J' || lineBuf[0] == 'j')) handleJogLine(lineBuf);
      if (lineLen > 0 && (lineBuf[0] == 'L' || lineBuf[0] == 'l')) handleMapLine(lineBuf);
      if (lineLen > 0 && lineBuf[0] == 'W') {   // learn the room: "W 60000 1" start (add on), "W 0" done
        char *q = lineBuf + 1;
        long ms = strtol(q, &q, 10);
        long add = strtol(q, &q, 10);
        if (ms > 0) startLearn((unsigned long)ms, add != 0); else stopLearn();
      }
      if (lineLen > 0 && lineBuf[0] == 'P') {   // "P 1" / "P 0": big motor connected or not (remembered)
        bool want = atoi(lineBuf + 1) != 0;
        if (want != panEnabled) EEPROM.write(EE_PAN_ENABLED, want ? 0x00 : 0xA5);   // write only on a change
        panEnabled = want;
        panStuck = false; pwWay = 0; pwTime = 0;   // told about the big motor: forget the watchdog's verdict
        if (!panEnabled) { stopAxis(PAN); drivePan(millis()); }
      }
      if (lineLen > 0 && lineBuf[0] == 'V') { panDegPerS = constrain(strtod(lineBuf + 1, nullptr), 20, 900); saveSettings(); }   // measured top speed, kept
      if (lineLen > 0 && lineBuf[0] == 'U') { tiltUp = flatIn(strtod(lineBuf + 1, nullptr)); saveTilt(); }   // real flat angle (the range follows)
      if (lineLen > 0 && lineBuf[0] == 'R') { tiltRev = atoi(lineBuf + 1) != 0; saveTilt(); writeTilt(); }   // "R 1": tilt servo reversed
      if (lineLen > 0 && lineBuf[0] == 'K') { panStartUs = constrain(atoi(lineBuf + 1), 0, PAN_START_MAX); savePanStart(); }   // "K s": where the big motor starts turning
      if (lineLen > 0 && (lineBuf[0] == 'Q' || lineBuf[0] == 'q')) { panRev = atoi(lineBuf + 1) != 0; savePanRev(); }   // "Q 1": big motor reversed
      if (lineLen > 0 && (lineBuf[0] == 'D' || lineBuf[0] == 'd')) {   // "D 1" clean now, "D 0" stop
        if (atoi(lineBuf + 1) != 0) { if (clState != CL_CLEANING) startClean(millis()); }
        else cancelClean();
      }
      if (lineLen > 0 && (lineBuf[0] == 'T' || lineBuf[0] == 't')) {   // "T 50": sensitivity 0..100
        applySensitivity(atoi(lineBuf + 1));
        saveSettings();   // kept for power-bank use
      }
      lineLen = 0;
    } else if (lineLen < (int)sizeof(lineBuf) - 1) {
      lineBuf[lineLen++] = c;
    }
  }
}

void loop() {
  readSerial();
  unsigned long now = millis();
  checkJog(now);
  if (learning && (long)(now - learnUntil) >= 0) stopLearn();
  if (remote && (long)(now - remoteUntil) > 0) {   // dashboard went quiet: stop, then track on our own again
    remote = false;
    stopAxis(PAN);
    stopAxis(TILT);
  }
  if (now - lastUpdate >= UPDATE_MS) {
    lastUpdate = now;
    readSensors();
    if (remote) {
      int pulse = jogActive ? jogPulse : remotePulse;   // a timed turn wins while it lasts
      panOff = (pulse == 0 || pulse == PAN_STOP_US) ? 0 : pulse - PAN_STOP_US;
      angle = tiltToward(remoteTilt);   // at the tilt's normal top speed, not in one jump
      panRetry(now);
      if (clState == CL_CLEANING) endClean(CL_IDLE);   // the dashboard drives: no cleaning now
    } else {
      control(now);
    }
    drivePan(now);
    writeTilt();
  }
  if (now - lastTelemetry >= TELEMETRY_MS) {
    lastTelemetry = now;
    sendTelemetry(now);
  }
}
