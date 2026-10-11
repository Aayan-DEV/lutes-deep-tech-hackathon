// The tracker's brain: a line-for-line JavaScript copy of firmware/tracker/tracker.ino (v4).
// Also mirrors the dust watch and cleaning routine ("D 1" / "D 0" there, clean(on, now) here) and the
// tilt reverse ("R 0/1", setTiltReverse here) and the big motor reverse ("Q 0/1", setPanReverse here). The serial command list is at the top of tracker.ino.
// The simulation runs this exact code, so what you see in Simulation is what the Arduino does.
// If you change a number or a rule here, change it in tracker.ino too (and the other way round).
// prototype range: tilt 45 degrees each way from the flat angle (TILT_UP, "U"), never past 5 or 175; turn
// plus or minus 170 degrees, slow; the simulation uses the full range (SUN_MODE_CFG below, the same numbers
// as tracker.ino's SUN_MODE).

import { createCleaning, CL_IDLE, CL_BLOCKED, CL_CLEANING, CL_HELP } from "./sim/cleaning.js";

export const CFG = {
  UPDATE_MS: 10,            // one control update every 10 ms (100 per second)
  SMOOTH: 0.5,              // reading smoothing, 0..1 (higher = faster, noisier)

  // Light is compared as LDR conductance (1 / resistance), not raw counts: raw counts bunch up
  // near 1023 in bright light, conductance keeps rising with the light. Each sensor is divided
  // by its own room level, so 100 % = room light and the 4 LDRs' differences cancel out.
  TORCH_ON_PCT: 35,         // torch = one sensor gets 35 % more light than its room level
  TORCH_OFF_RATIO: 0.5,     // lost again below half of that (17 %)
  TORCH_MIN_COUNTS: 8,      // and it must be at least 8 counts up (ignores noise near 1023)
  // Room "normal" = the brightest each light saw while learning; it does not drift by itself.
  ROOM_FIXED: true,         // false = the old way: normal slowly follows the room
  ROOM_FOLLOW: 0.0033,      // (only if ROOM_FIXED is false) catches up in about 3 s with no torch
  ROOM_FOLLOW_TORCH: 0.0001, // about 100 s while a torch is seen, so a torch held still stays a torch
  // (going darker is always followed fast: that heals a start-up done with the torch on)

  // Outdoor mode (the sun): the sun rises too slowly to stand out from a "room level", so instead the
  // learned levels become a one-time calibration (they cancel the 4 LDRs' differences) and never
  // change. "Torch" then means: enough light to track. Indoors (torch demo) leave this false.
  SUN_MODE: false, SUN_ON_COUNTS: 450, SUN_OFF_COUNTS: 350,

  // When to move: imbalance between the two sides of an axis, in % of the brighter side
  // (the classic 4-LDR tracker: each axis compares the mean rel of its two sides; indoors there is no
  // torch gate, it always tries to even out all 4 lights)
  START_PCT: 15, STOP_PCT: 5, FULL_PCT: 60, CONFIRM_MS: 100,
  // prototype (tracker.ino SETTLE_MS, UNWIND...): wait after balancing; at the pan limit with the light
  // further on, go round the other way (the wires never twist past PAN_LIMIT_DEG); proof it turned
  SETTLE_MS: 300, UNWIND: false, UNWIND_WAIT_MS: 1000, UNWIND_REST_MS: 15000, UNWIND_TO: 120, UNWIND_SAME: 0.1,
  // Dark floor (indoors): the brighter side's mean counts must be over DARK_COUNTS and its mean rel
  // over DARK_REL (5 % above the room level), or it does not move (noise in a dark room).
  DARK_COUNTS: 40, DARK_REL: 1.05,
  // Big motor watchdog: the pan wants to turn one way (driving, or held at its limit) for PAN_CHECK_MS
  // without the left-right imbalance falling by PAN_CHECK_GAIN = missing or unpowered: stop the pan,
  // steer with the tilt alone.
  // Tried again every PAN_RETRY_MS.
  PAN_CHECK_MS: 3000, PAN_RETRY_MS: 60000, PAN_CHECK_GAIN: 0.1,

  // Pan: MG996R 360 (continuous). Pulse = 1500 +/- offset. PAN_FULL_US = the biggest offset it ever
  // gets: 300 on the prototype (gentle, the panels are big), 500 (flat out) in the sun simulation.
  PAN_STOP_US: 1500, PAN_SLOW_US: 70, PAN_FULL_US: 450,
  PAN_DEADBAND_US: 40, PAN_SAT_US: 400,  // below 40 it does not turn, above 400 it is flat out
  PAN_START_MARGIN: 30, PAN_START_MAX: 350,   // "K s" (setPanStart): it really starts turning at s; driven at least s + 30
  PAN_DEG_PER_S: 300,       // its top speed, for the angle estimate (time one full turn to check)
  PAN_LIMIT_DEG: 90,        // the front half only: never further than 90 either way (the wires are behind; the sun build 170)
  START_HOLD_MS: 3000,      // prototype: at start and on "z" (the page's connect) hold still, then the big motor starts slow
  REST_MS: 5000, REST_DEADBAND: 2,   // prototype: no light for 5 s, then back to the front and flat, slowly (tracker.ino restHome)
  PAN_BRAKE_MS: 120,        // hold "stop" this long before switching the signal off

  // Tilt: SG-90 (normal 0-180 servo). Degrees moved per 10 ms update. Prototype: TILT_HALF (45) degrees
  // each way from the flat angle TILT_UP, never past TILT_SAFE_MIN..TILT_SAFE_MAX, at 0.4 to 1.5 per update;
  // the cleaning rocks end to end. tiltLimits() below gives the range. TILT_MIN / TILT_MAX: the sun
  // simulation's fixed range; on the prototype only the range at flat 90. TILT_HOME: the simulation's start.
  TILT_SLOW_STEP: 0.4, TILT_FULL_STEP: 1.5, TILT_MIN: 45, TILT_MAX: 135, TILT_HOME: 90,
  TILT_HALF: 45, TILT_SAFE_MIN: 5, TILT_SAFE_MAX: 175,
  // Turn-around (big motor turns the panel round when the light is past the tilt's end): off on the
  // prototype, whose tilt stops 45 degrees short of each side (a light past the end is only low, not
  // behind; turning would swing the big panels from side to side). On in the sun simulation.
  TURN_AROUND: false,
  TILT_UP: 90,              // tilt angle where the panel faces straight up. Tipped back past it, the
                            // panel faces backwards, so pan turns the other way to face the light ...
  FLIP_MARGIN: 15,          // ... but only once it is more than this far back past flat, so a small
                            // lean or noise near flat cannot flip the pan's direction.
  TILT_UP_MIN: 10, TILT_UP_MAX: 170,   // prototype: a flat angle ("U") is kept inside these

  // Anti-wobble: an axis that reverses soon after moving overshot, so its top speed is cut.
  REVERSE_MS: 1500, CALM_CUT: 0.6, CALM_MIN: 0.3, CALM_RECOVER: 0.002,

  // Lost torch: lined up on a torch, then the light drops below LOST_RATIO of what it was while all 4
  // stay even = the torch went behind the panel, where the sensor cannot see it. Tip back to face
  // straight up (it sees the whole room from there), then track as normal.
  LOST_RATIO: 0.35, LOST_MS: 600, LOCK_DECAY: 0.9995,

  RAIL_LOW: 60, RAIL_HIGH: 1015,  // a room level outside this = sensor missing or miswired
  // prototype: a sensor under DEAD_COUNTS while another is over DEAD_OTHERS died (a loose wire): left out until over ALIVE_COUNTS
  DEAD_COUNTS: 60, ALIVE_COUNTS: 90, DEAD_OTHERS: 400,
  DIR: [1, 1],                    // set an axis to -1 if it turns away from the light
  CELL_LOAD_OHM: 220, CELL_DIVIDER: 2.0,

  // Dust: the total light (sum of the 4 rel values, 100 % each = room level) has a slow "clean" level
  // that follows it over about 30 s. A sudden drop that stays = something covers the sensors.
  // (rel, not raw counts, also in SUN_MODE: counts bunch up near 1023 in bright light, rel does not.)
  DUST_BASE_MS: 30000,      // the clean level follows the total down with this time constant ...
  DUST_RISE_MS: 2000,       // ... and up with this one (dust only takes light away: brighter = cleaner)
  DUST_DROP: 0.6,           // blocked: total under 60 % of the clean level ...
  DUST_HIGH: 0.9, DUST_FALL_MS: 3000,   // ... falling there from over 90 % within 3 s (a slow fade is a cloud or dusk)
  DUST_FLOOR: 0.15,         // under 15 % = the light went out, not dust
  DUST_CONFIRM_MS: 2000,    // and it stays low for 2 s with the motors still
  // Cleaning: rock the tilt end to end and watch which side helps. Each round: one end, the other
  // end, then back to where it was. Hold 1.5 s at each stop, then average the total over 0.5 s.
  CLEAN_HOLD_MS: 1500, CLEAN_MEASURE_MS: 500, CLEAN_ROUNDS: 3,
  CLEAN_DONE: 0.85,         // done as soon as the total is back over 85 % of the clean level
};

// The sun simulation's numbers: tracker.ino's SUN_MODE block. createController(Object.assign({}, CFG, SUN_MODE_CFG)).
// The full design range (tilt 90..180, the front half; pan +/-170, the wire limit) at full speed, and
// it corrects sooner and closer than for a torch (the sun moves slowly).
export const SUN_MODE_CFG = Object.freeze({
  SUN_MODE: true, TILT_MIN: 90, TILT_MAX: 180, TILT_FULL_STEP: 5.0, TILT_SLOW_STEP: 0.3,
  PAN_LIMIT_DEG: 170, PAN_FULL_US: 500, START_PCT: 10, STOP_PCT: 3, TURN_AROUND: true,
  FULL_PCT: 40, PAN_SLOW_US: 100, SETTLE_MS: 0, UNWIND: false, START_HOLD_MS: 0, REST_MS: 0,
});

export const TL = 0, TR = 1, BL = 2, BR = 3, PAN = 0, TILT = 1;
// Cleaning state (telemetry cl.st): 0 idle, 1 blocked, 2 cleaning, 3 needs a hand.
export { CL_IDLE, CL_BLOCKED, CL_CLEANING, CL_HELP };
export const LDR_NAME = ["TL", "TR", "BL", "BR"];
export const LDR_PIN = ["A3", "A2", "A1", "A0"];
// Each axis compares a "positive" pair with a "negative" pair: pan left vs right, tilt top vs bottom.
const POS_A = [TL, TL], POS_B = [BL, TR], NEG_A = [TR, BL], NEG_B = [BR, BR];

const constrain = (x, a, b) => Math.max(a, Math.min(b, x));
// LDR conductance from ADC counts (any unit: only ratios are used). Capped so 1023 stays finite.
export const conductance = counts => { const c = constrain(counts, 1, 1021); return c / (1023.5 - c); };

// The tilt range for a flat angle (tiltMin() / tiltMax() in tracker.ino): TILT_HALF either way from flat,
// inside TILT_SAFE_MIN..TILT_SAFE_MAX. SUN_MODE: the fixed TILT_MIN..TILT_MAX. Returns [min, max].
export function tiltLimits(up, c = CFG) {
  if (c.SUN_MODE) return [c.TILT_MIN, c.TILT_MAX];
  return [Math.max(c.TILT_SAFE_MIN, up - c.TILT_HALF), Math.min(c.TILT_SAFE_MAX, up + c.TILT_HALF)];
}
// A flat angle inside its allowed band (flatIn() in tracker.ino; sun: the fixed range).
export function flatIn(a, c = CFG) {
  return c.SUN_MODE ? constrain(a, c.TILT_MIN, c.TILT_MAX) : constrain(a, c.TILT_UP_MIN, c.TILT_UP_MAX);
}

// How fast the pan servo turns for a pulse offset, 0..1 of its top speed.
export function panSpeedFrac(offUs, c = CFG) {
  return constrain((Math.abs(offUs) - c.PAN_DEADBAND_US) / (c.PAN_SAT_US - c.PAN_DEADBAND_US), 0, 1);
}

export function createController(c = CFG) {
  const s = {
    level: [0, 0, 0, 0], room: [0, 0, 0, 0], rel: [1, 1, 1, 1], raw: [0, 0, 0, 0], healthy: [true, true, true, true], dead: [false, false, false, false],
    torch: false, strongest: 0, roomAvg: 0,
    lit: [false, false], steering: false,   // per axis: light to steer by; either axis: light present
    panStuck: false, panStuckAt: 0, pwTime: 0, pwStart: 0, pwWay: 0, pwHelped: false, panProven: false,   // big motor watchdog
    holdUntil: 0, idleSince: 0, panStartUs: 0, stoppedAt: [0, 0], unwindWay: 0, limitSince: 0, limitSeen: 0, unwindAt: 0, uwImb: 0, uwTot: 0,   // SETTLE_MS, UNWIND
    angle: c.TILT_UP, moving: [false, false], since: [0, 0], lastDiff: [0, 0], lastFrac: [0, 0], drive: [0, 0],
    cap: [1, 1], lastWay: [0, 0], lastActive: [-1e9, -1e9],
    panOff: 0, panDeg: 0, panAttached: false, brakeUntil: 0, panPulse: 0,
    lockStrength: 0, lostSince: 0, seeking: false, turnAround: false, turnWay: 0, panEnabled: true, learning: false,
    cellV: 0, tiltRev: false,   // tiltRev: tilt servo mounted the other way round ("R 1")
    panRev: false,              // panRev: big motor turns the other way round ("Q 1"): its pulse is flipped
    // dust watch and cleaning (same names as tracker.ino, without the "s.")
    clState: CL_IDLE, clBase: 0, clTotal: 0, clHighAt: 0, clSince: 0, clRound: 0, clStep: 0, clFirst: 0, clOk: false,
    clHome: c.TILT_UP, clTarget: c.TILT_UP, clPhaseAt: 0, clSum: 0, clCount: 0, clSide: [0, 0], clPrev: [0, 0],
  };
  // The tilt range now (it follows the flat angle c.TILT_UP), and one tilt step toward an angle.
  const tiltMin = () => (c.SUN_MODE ? c.TILT_MIN : Math.max(c.TILT_SAFE_MIN, c.TILT_UP - c.TILT_HALF));
  const tiltMax = () => (c.SUN_MODE ? c.TILT_MAX : Math.min(c.TILT_SAFE_MAX, c.TILT_UP + c.TILT_HALF));
  const tiltToward = to => (Math.abs(to - s.angle) <= c.TILT_FULL_STEP ? to : s.angle + (to > s.angle ? c.TILT_FULL_STEP : -c.TILT_FULL_STEP));

  // s.dead: see DEAD_COUNTS (the same as tracker.ino's checkDead)
  function checkDead() {
    for (let i = 0; i < 4; i++) {
      let others = 0;
      for (let j = 0; j < 4; j++) if (j !== i && s.level[j] > others) others = s.level[j];
      if (!s.dead[i] && s.level[i] < c.DEAD_COUNTS && others > c.DEAD_OTHERS) s.dead[i] = true;
      else if (s.dead[i] && s.level[i] > c.ALIVE_COUNTS) s.dead[i] = false;
    }
  }

  function readSensors(raw, cellCounts) {
    let strongest = 0, roomAvg = 0;
    for (let i = 0; i < 4; i++) {
      s.raw[i] = raw[i];
      s.level[i] += c.SMOOTH * (raw[i] - s.level[i]);
    }
    if (!c.SUN_MODE) checkDead();
    for (let i = 0; i < 4; i++) {
      s.healthy[i] = s.room[i] > c.RAIL_LOW && s.room[i] < c.RAIL_HIGH && !s.dead[i];
      s.rel[i] = conductance(s.level[i]) / conductance(s.room[i]);   // 1.0 = room light
      const up = s.rel[i] - 1;
      if (s.healthy[i] && up > strongest && s.level[i] - s.room[i] >= c.TORCH_MIN_COUNTS) strongest = up;
      roomAvg += s.room[i] / 4;
    }
    s.strongest = strongest; s.roomAvg = roomAvg;
    if (s.learning) {   // learning: every light keeps the brightest it sees; nothing counts as the torch
      if (s.learnSettle > 0) s.learnSettle--;   // first 0.2 s: let the readings settle
      else for (let i = 0; i < 4; i++) if (s.level[i] > s.room[i]) s.room[i] = s.level[i];
      s.torch = false;
    }
    s.cellV += 0.3 * (cellCounts * 5.0 / 1023.0 * c.CELL_DIVIDER - s.cellV);
    if (c.SUN_MODE) {   // outdoors: track whenever there is enough light; the calibration never moves
      let brightest = 0;
      for (let i = 0; i < 4; i++) if (s.healthy[i] && s.level[i] > brightest) brightest = s.level[i];
      if (!s.torch && brightest > c.SUN_ON_COUNTS) s.torch = true;
      else if (s.torch && brightest < c.SUN_OFF_COUNTS) s.torch = false;
      return;
    }
    if (s.learning) return;
    const on = c.TORCH_ON_PCT / 100;
    if (!s.torch && strongest > on) s.torch = true;
    else if (s.torch && strongest < on * c.TORCH_OFF_RATIO) s.torch = false;
    if (c.ROOM_FIXED) return;
    for (let i = 0; i < 4; i++) {
      const rate = s.torch && s.level[i] > s.room[i] ? c.ROOM_FOLLOW_TORCH : c.ROOM_FOLLOW;
      s.room[i] += rate * (s.level[i] - s.room[i]);
    }
  }

  // Light reaching one side: the mean relative light of its healthy sensors.
  function sideLight(a, b) {
    let n = 0, out = 0;
    if (s.healthy[a]) { out += s.rel[a]; n++; }
    if (s.healthy[b]) { out += s.rel[b]; n++; }
    return n ? out / n : null;
  }
  // The mean counts (smoothed) of one side's healthy sensors.
  function sideCounts(a, b) {
    let n = 0, out = 0;
    if (s.healthy[a]) { out += s.level[a]; n++; }
    if (s.healthy[b]) { out += s.level[b]; n++; }
    return n ? out / n : 0;
  }

  // "K s" (tracker.ino panDeadband / panSlowUs): the real dead band of the big motor, 0 = not set
  const panDeadband = () => Math.max(c.PAN_DEADBAND_US, s.panStartUs);
  const panSlowUs = () => Math.max(c.PAN_SLOW_US, s.panStartUs > 0 ? s.panStartUs + c.PAN_START_MARGIN : 0);
  // Here is the front: pan count 0, then hold still and start slow (START_HOLD_MS; at start too, below).
  function startHere(now) {
    s.panDeg = 0;
    if (!c.START_HOLD_MS) return;
    s.holdUntil = now + c.START_HOLD_MS; s.cap[PAN] = c.CALM_MIN;
    stopAxis(PAN); stopAxis(TILT);
  }
  // REST_MS (tracker.ino restHome): no light for a while, then back to the front and flat, slowly.
  function restHome(now) {
    if (s.steering || s.seeking || s.clState !== CL_IDLE) { s.idleSince = 0; return; }
    if (s.idleSince === 0) { s.idleSince = now; return; }
    if (now - s.idleSince < c.REST_MS) return;
    if (s.panEnabled && !s.panStuck && Math.abs(s.panDeg) > c.REST_DEADBAND) { s.panOff = (s.panDeg > 0 ? -1 : 1) * panSlowUs(); s.moving[PAN] = true; }
    else stopAxis(PAN);
    const flat = constrain(c.TILT_UP, tiltMin(), tiltMax()), gap = flat - s.angle;
    if (Math.abs(gap) > 0) s.angle += (gap > 0 ? 1 : -1) * Math.min(c.TILT_SLOW_STEP, Math.abs(gap));
  }
  function stopAxis(axis) {
    if (axis === PAN) s.panOff = 0;
    s.moving[axis] = false; s.since[axis] = 0; s.drive[axis] = 0;
  }

  function updateAxis(axis, now) {
    const pos = sideLight(POS_A[axis], POS_B[axis]), neg = sideLight(NEG_A[axis], NEG_B[axis]);
    const ok = pos !== null && neg !== null;
    const diff = ok ? pos - neg : 0, frac = ok ? Math.abs(diff) / Math.max(pos, neg, 0.01) : 0;
    s.lastDiff[axis] = diff; s.lastFrac[axis] = frac;
    // Light to steer by. Outdoors: the sun gate (torch). Indoors: the brighter side is not dark.
    if (c.SUN_MODE) s.lit[axis] = ok && s.torch;
    else {
      const counts = pos >= neg ? sideCounts(POS_A[axis], POS_B[axis]) : sideCounts(NEG_A[axis], NEG_B[axis]);
      s.lit[axis] = ok && !s.learning && counts > c.DARK_COUNTS && Math.max(pos, neg) > c.DARK_REL;   // never while learning the room
    }
    if (axis === TILT) {
      // Turn-around: tilt is at its limit but the light is still further that way, so the light is
      // behind. The big motor then turns toward its middle until the light comes round to the front.
      const pushing = c.DIR[TILT] * diff;
      s.turnAround = c.TURN_AROUND && s.torch && ok && frac * 100 >= c.START_PCT &&
        ((s.angle <= tiltMin() + 0.5 && pushing < 0) || (s.angle >= tiltMax() - 0.5 && pushing > 0));
      if (!s.turnAround) s.turnWay = 0;
    } else if (!s.panEnabled || s.panStuck) {   // no big motor, or it is not responding: pan never moves
      stopAxis(PAN);
      return;
    } else if (s.torch && ok && s.turnAround) {   // decided by tilt on the update before
      // Pick a direction once (toward the middle) and keep it; reverse only at the wire limit.
      if (!s.turnWay) s.turnWay = s.panDeg > 0 ? -1 : 1;
      if ((s.turnWay > 0 && s.panDeg >= c.PAN_LIMIT_DEG) || (s.turnWay < 0 && s.panDeg <= -c.PAN_LIMIT_DEG)) s.turnWay = -s.turnWay;
      s.panOff = s.turnWay * c.PAN_FULL_US;
      s.moving[PAN] = true; s.drive[PAN] = 1;
      return;
    }
    if (axis === PAN && s.unwindWay !== 0) {   // turning the other way round (UNWIND)
      if ((s.unwindWay < 0 && s.panDeg <= -c.UNWIND_TO) || (s.unwindWay > 0 && s.panDeg >= c.UNWIND_TO)) {
        s.unwindWay = 0; stopAxis(PAN); s.stoppedAt[PAN] = now;
        const imb = diff >= 0 ? frac : -frac;
        if (Math.abs(imb - s.uwImb) < c.UNWIND_SAME && Math.abs(s.clTotal - s.uwTot) < c.UNWIND_SAME * s.uwTot) { s.panStuck = true; s.panStuckAt = now; }   // nothing changed: it never turned
        return;
      }
      s.panOff = s.unwindWay * c.PAN_FULL_US; s.moving[PAN] = true; s.drive[PAN] = 1;
      return;
    }
    if (!s.lit[axis]) { stopAxis(axis); return; }
    if (!s.moving[axis]) {
      if (frac * 100 < c.START_PCT) { s.since[axis] = 0; return; }
      if (s.stoppedAt[axis] !== 0 && now - s.stoppedAt[axis] < c.SETTLE_MS) return;   // just balanced: let it settle first
      if (!s.since[axis]) s.since[axis] = now;
      if (now - s.since[axis] < c.CONFIRM_MS) return;
      s.moving[axis] = true;
    }
    if (frac * 100 < c.STOP_PCT) { stopAxis(axis); s.stoppedAt[axis] = now; return; }
    let way = c.DIR[axis] * (diff > 0 ? 1 : -1);
    if (axis === PAN && s.angle < c.TILT_UP - c.FLIP_MARGIN) way = -way;   // panel tipped back well past flat: it faces backwards
    // Anti-wobble: going back the other way soon after moving means it overshot.
    if (s.lastWay[axis] !== 0 && way !== s.lastWay[axis] && now - s.lastActive[axis] < c.REVERSE_MS)
      s.cap[axis] = Math.max(c.CALM_MIN, s.cap[axis] * c.CALM_CUT);
    s.lastWay[axis] = way; s.lastActive[axis] = now;
    // Full speed when far off, easing down to slow only for the last few % of imbalance.
    const drive = s.cap[axis] * constrain((frac * 100 - c.STOP_PCT) / (c.FULL_PCT - c.STOP_PCT), 0, 1);
    s.drive[axis] = drive;
    if (axis === PAN) {
      if ((way > 0 && s.panDeg >= c.PAN_LIMIT_DEG) || (way < 0 && s.panDeg <= -c.PAN_LIMIT_DEG)) {
        stopAxis(PAN);
        if (c.UNWIND) {   // the light is past the limit: after UNWIND_WAIT_MS, go round the other way
          if (s.limitSince === 0 || now - s.limitSeen > 300) s.limitSince = now;
          s.limitSeen = now;
          if (now - s.limitSince >= c.UNWIND_WAIT_MS && (s.unwindAt === 0 || now - s.unwindAt >= c.UNWIND_REST_MS)) {
            s.unwindWay = -way; s.unwindAt = now; s.limitSince = 0;
            s.uwImb = diff >= 0 ? frac : -frac; s.uwTot = s.clTotal;
            s.panOff = s.unwindWay * c.PAN_FULL_US; s.moving[PAN] = true; s.drive[PAN] = 1;
          }
        }
        return;
      }
      s.panOff = way * (panSlowUs() + drive * (c.PAN_FULL_US - panSlowUs()));
      return;
    }
    const next = s.angle + way * (c.TILT_SLOW_STEP + drive * (c.TILT_FULL_STEP - c.TILT_SLOW_STEP));
    const lo = tiltMin(), hi = tiltMax();
    // end stop: stay put rather than push. Outside the range (a new flat angle): back in one step at a time.
    if (next <= lo || next >= hi) { s.angle = tiltToward(constrain(next, lo, hi)); stopAxis(TILT); return; }
    s.angle = next;
  }

  // Big motor watchdog, after both axes have decided (watchPan() in tracker.ino). The clock runs while the
  // pan wants to turn one way (driving, or held at its turn limit) with light to steer by. A turn that works
  // makes the left-right imbalance fall by PAN_CHECK_GAIN of where it was, or change sign: that starts the
  // count again (and is proof the motor works if the pan was driven with the tilt still; a moving tilt
  // changes the left-right picture too). PAN_CHECK_MS without that = stuck: stop the pan, tilt alone.
  // The turn count reaches the limit in well under a second, so the wait at the limit counts too, unless
  // this drive had proof: then the light is simply past the limit.
  function watchPan(now) {
    if (s.panStuck) return;
    if (s.unwindWay !== 0) { s.pwWay = 0; s.pwTime = 0; return; }   // turning round: checked at its end instead
    let way = c.DIR[PAN] * (s.lastDiff[PAN] > 0 ? 1 : -1);
    if (s.angle < c.TILT_UP - c.FLIP_MARGIN) way = -way;   // as updateAxis: tipped back well past flat
    const wants = s.panEnabled && !s.turnAround && s.lit[PAN] && (s.moving[PAN] || s.lastFrac[PAN] * 100 >= c.START_PCT);
    if (!wants) { s.pwWay = 0; s.pwTime = 0; return; }
    const imb = s.lastDiff[PAN] >= 0 ? s.lastFrac[PAN] : -s.lastFrac[PAN];
    if (way !== s.pwWay) { s.pwWay = way; s.pwStart = imb; s.pwTime = 0; s.pwHelped = false; return; }   // a new drive: sample
    if (imb * s.pwStart <= 0 || Math.abs(imb) <= (1 - c.PAN_CHECK_GAIN) * Math.abs(s.pwStart)) {   // the light got more even
      s.pwStart = imb; s.pwTime = 0;
      if (s.panOff !== 0 && !s.moving[TILT]) { s.pwHelped = true; s.panProven = true; }
      return;
    }
    const atLimit = (way > 0 && s.panDeg >= c.PAN_LIMIT_DEG) || (way < 0 && s.panDeg <= -c.PAN_LIMIT_DEG);
    if (atLimit && (s.pwHelped || (!c.SUN_MODE && s.panProven))) return;   // prototype: once it has shown it turns, waiting at its limit is not a dead motor
    s.pwTime += c.UPDATE_MS;
    if (s.pwTime >= c.PAN_CHECK_MS) { s.panStuck = true; s.panStuckAt = now; s.pwWay = 0; s.pwTime = 0; stopAxis(PAN); }
  }
  // Every update (also while cleaning): after PAN_RETRY_MS, try the big motor again.
  function panRetry(now) {
    if (s.panStuck && now - s.panStuckAt >= c.PAN_RETRY_MS) { s.panStuck = false; s.pwWay = 0; s.pwTime = 0; }
  }

  // Lost torch check, after both axes have decided. While seeking, tilt heads for straight up.
  function checkLost(now) {
    if (!s.torch) { s.lockStrength = 0; s.lostSince = 0; s.seeking = false; return; }
    const still = !s.moving[PAN] && !s.moving[TILT];
    if (!still) { s.seeking = false; s.lostSince = 0; return; }
    s.lockStrength = Math.max(s.lockStrength * c.LOCK_DECAY, s.strongest);   // how strong a lined-up torch looks
    if (!s.seeking) {
      if (s.strongest < s.lockStrength * c.LOST_RATIO) {
        if (!s.lostSince) s.lostSince = now;
        if (now - s.lostSince >= c.LOST_MS) s.seeking = true;
      } else s.lostSince = 0;
    }
    if (s.seeking) {
      const gap = constrain(c.TILT_UP, tiltMin(), tiltMax()) - s.angle;   // straight up, inside the tilt range
      if (Math.abs(gap) < 1) { s.seeking = false; s.lostSince = 0; s.lockStrength = s.strongest; return; }
      s.angle += Math.sign(gap) * Math.min(c.TILT_FULL_STEP, Math.abs(gap));
    }
  }

  const { lightTotal, watchDust, cleanStep, startClean, cancelClean } = createCleaning(s, c, stopAxis, tiltMin, tiltMax);
  startHere(0);   // power-up: here is the front, hold still (tracker.ino setup)

  // Pan output: the pulse while driving; when told to stop, "stop" for PAN_BRAKE_MS, then signal off.
  // Returns the pulse in microseconds, or 0 when the signal is off (servo detached).
  function drivePan(now) {
    if (!s.panEnabled) { s.panOff = 0; s.panAttached = false; s.panPulse = 0; return 0; }
    if (s.panOff === 0) {
      if (s.panAttached) {
        if (!s.brakeUntil) { s.brakeUntil = now + c.PAN_BRAKE_MS; s.panPulse = c.PAN_STOP_US; }
        else if (now >= s.brakeUntil) { s.panAttached = false; s.brakeUntil = 0; s.panPulse = 0; }
      }
      return s.panPulse;
    }
    s.brakeUntil = 0; s.panAttached = true;
    s.panPulse = Math.round(c.PAN_STOP_US + (s.panRev ? -s.panOff : s.panOff));   // panOut(): "Q 1" flips the pulse sent
    s.panDeg += Math.sign(s.panOff) * c.PAN_DEG_PER_S * panSpeedFrac(s.panOff, { PAN_DEADBAND_US: panDeadband(), PAN_SAT_US: c.PAN_SAT_US }) * c.UPDATE_MS / 1000;
    return s.panPulse;
  }

  return {
    s, c,
    learnRoom(readAll) {   // readAll() -> [4 counts]; the Arduino averages 1 s of readings
      const r = readAll();
      for (let i = 0; i < 4; i++) { s.level[i] = r[i]; s.room[i] = r[i]; }
      s.torch = false; stopAxis(PAN); stopAxis(TILT);
      s.clState = CL_IDLE; s.clBase = 0; s.clRound = 0;   // new room levels: start the clean level again
    },
    // "D 1" / "D 0" on the Arduino: start the cleaning routine now, or stop it and forget the clean level.
    clean(on, now) {
      if (on) { if (s.clState !== CL_CLEANING) startClean(now); }
      else cancelClean();
    },
    zeroPan(now = 0) { startHere(now); },   // "z": here is the front (tracker.ino startHere)
    // "U <angle>": the tilt angle where the panel lies flat (10..170; the tilt range follows it). "R 0/1": tilt servo reversed.
    setTiltUp(a) { c.TILT_UP = flatIn(a, c); },
    tiltLimits() { return [tiltMin(), tiltMax()]; },
    setTiltReverse(r) { s.tiltRev = !!r; },
    // "Q 0/1": the big motor turns the other way round. Flips the pulse sent (panPulse, telemetry pan.us);
    // panOff and the turn count keep the normal sign.
    setPanReverse(r) { s.panRev = !!r; },
    // The angle sent to the tilt servo (servoAngle() in tracker.ino). The logic keeps the normal angle.
    servoAngle() { return s.tiltRev ? 180 - s.angle : s.angle; },
    setPanEnabled(on) { s.panEnabled = !!on; s.panStuck = false; s.pwWay = 0; s.pwTime = 0; },   // "P 0/1" also clears the watchdog
    // Learn the room while the user moves around: add = keep the brightest from before as well.
    startLearn(add) {
      if (!add) for (let i = 0; i < 4; i++) s.room[i] = s.level[i];
      s.learning = true; s.learnSettle = 20; s.torch = false; stopAxis(PAN); stopAxis(TILT);
      s.clState = CL_IDLE; s.clBase = 0; s.clRound = 0;
    },
    stopLearn() { s.learning = false; },
    setPanStart(us) { s.panStartUs = constrain(Math.trunc(+us || 0), 0, c.PAN_START_MAX); },   // "K s" (atoi)
    // Sensitivity 0..100, same formula as applySensitivity() in tracker.ino (50 = the defaults).
    setSensitivity(level) {
      const l = constrain(level, 0, 100);
      c.TORCH_ON_PCT = 35 * Math.pow(8, (l - 50) / 50);
      c.START_PCT = 3 + 14 * l / 100;      // 0 = 3 %, 50 = 10 %, 100 = 17 % between the sides
      c.STOP_PCT = Math.max(2, c.SUN_MODE ? c.START_PCT / 3 : c.START_PCT / 2);   // prototype: half of start (less jitter)
    },
    step(raw, cellCounts, now) {
      readSensors(raw, cellCounts);
      s.clTotal = lightTotal();
      panRetry(now);
      const holding = now - s.holdUntil < 0;
      if (s.clState === CL_CLEANING) cleanStep(now);
      else if (holding) { stopAxis(PAN); stopAxis(TILT); }   // just started, or a new front: hold still
      else {
        updateAxis(PAN, now);
        updateAxis(TILT, now);
        s.steering = s.lit[PAN] || s.lit[TILT];
        watchPan(now);
        checkLost(now);
        watchDust(now);
        if (c.REST_MS > 0) restHome(now);
      }
      if (!holding) for (let a = 0; a < 2; a++) s.cap[a] = Math.min(1, s.cap[a] + c.CALM_RECOVER);   // the slow start grows after the hold
      // tiltAngle: the logical angle (what the simulated world uses); tiltServo: what the real servo gets
      return { panPulse: drivePan(now), tiltAngle: s.angle, tiltServo: s.tiltRev ? 180 - s.angle : s.angle };
    },
    // Same fields, same rounding as sendTelemetry() in tracker.ino.
    telemetry(now) {
      const r1 = x => Math.round(x * 10) / 10, cellMa = s.cellV / c.CELL_LOAD_OHM * 1000;
      return {
        t: now, raw: s.raw.slice(), room: s.room.map(x => Math.trunc(x)), ok: s.healthy.map(h => h ? 1 : 0),
        lt: s.rel.map(r => Math.round(r * 100)), rl: Math.trunc(s.roomAvg), torch: s.torch ? 1 : 0, ln: s.learning ? 1 : 0,
        strong: Math.round(s.strongest * 100), on: c.TORCH_ON_PCT, off: Math.round(c.TORCH_ON_PCT * c.TORCH_OFF_RATIO),
        lit: s.steering ? 1 : 0, bal: [Math.round(s.lastFrac[0] * 100), Math.round(s.lastFrac[1] * 100)],
        pan: { diff: Math.round(s.lastDiff[0] * 100), pct: r1(s.lastFrac[0] * 100), mv: s.moving[0] ? 1 : 0, drv: Math.round(s.drive[0] * 100),
               us: s.panPulse, deg: r1(s.panDeg), lim: c.PAN_LIMIT_DEG, stuck: s.panStuck ? 1 : 0, uw: s.unwindWay, cap: Math.round(s.cap[0] * 100) },
        tilt: { diff: Math.round(s.lastDiff[1] * 100), pct: r1(s.lastFrac[1] * 100), mv: s.moving[1] ? 1 : 0, drv: Math.round(s.drive[1] * 100),
                ang: r1(s.angle), cap: Math.round(s.cap[1] * 100) },
        sk: s.seeking ? 1 : 0,
        cell: { v: Math.round(s.cellV * 100) / 100, ma: r1(cellMa), mw: r1(s.cellV * cellMa) },
        cl: { st: s.clState, base: Math.round(s.clBase * 100), now: Math.round(s.clTotal * 100), round: s.clRound },
        cfg: { start: c.START_PCT, stop: c.STOP_PCT, full: c.FULL_PCT, dir: c.DIR.slice(), pdps: c.PAN_DEG_PER_S, up: c.TILT_UP, rev: s.tiltRev ? 1 : 0, prev: s.panRev ? 1 : 0, kst: s.panStartUs },
      };
    },
  };
}

// GL5528 + 10k divider: ADC counts -> estimated light in lux (the part varies +/-30%, so "about").
// R_ldr = 10k * (1023 / counts - 1);  lux = 10 * (R_ldr / 15k) ^ (-1 / 0.7)
export function countsToLux(counts) {
  const c = constrain(counts, 1, 1022), r = 10000 * (1023 / c - 1);
  return 10 * Math.pow(r / 15000, -1 / 0.7);
}
export function roomName(lux) {
  if (lux < 20) return "dark room";
  if (lux < 100) return "dim room";
  if (lux < 400) return "normal indoor light";
  if (lux < 1500) return "bright room";
  return "daylight / very bright";
}
