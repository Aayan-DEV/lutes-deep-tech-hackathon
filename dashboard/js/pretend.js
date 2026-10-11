// Pretend sun with the real motors: point the panel straight at the simulated sun. The lights are
// not used for steering here (they are only shown, live from the Arduino).
//  - Small motor (SG-90): sent its exact angle; it goes there by itself.
//  - Big motor (MG996R 360): it cannot report its angle, so it is driven in timed turns at ONE steady
//    speed (repeatable), and the page keeps count of where it should be. Its speed at that pulse is
//    measured once by the user in each direction (half a turn out, half a turn back, so the wires
//    never wrap), and kept in this browser. Cheap continuous servos often differ by direction.
import { CFG, tiltLimits } from "./logic.js";
import { toModelAz } from "./sun.js";

const JOG_US = 160;           // steady turning speed: 1500 ± 160 µs (well clear of the dead band, not flat out)
const JOG_OVER_START = 80;    // with a measured starting pulse (K, Sync up): at least that + 80 µs
const MIN_STEP = 5;           // only turn once the sun is 5° or more off (no twitching)
const LEAD = 6;               // then turn 6° PAST the sun, so it walks into the middle: fewer, longer turns
const FRAME_MS = 20;          // a servo takes one command per 20 ms frame: turns are whole frames
const MAX_TURN_MS = 1500;     // one timed turn at most 1.5 s, then re-check
const BRAKE_MS = 150;         // wait after a turn for the motor to stop before the next one
const REST_TILT = 150;        // at night: face the sunrise side, 30° above the horizon (model tilt; kept inside the tilt range)
const STORE = "tracker-big-motor";
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// getFlat() -> the board's flat angle (cfg.up): model tilt 90 = flat, so the board's angle = model - 90 + flat.
export function createPretendDriver(send, getFlat = () => CFG.TILT_UP) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) {}
  const d = {
    speed: saved.speed || { pos: 90, neg: 90 },   // °/s each way, measured with "Measure speed"; 90 until then
    startUs: +saved.start || 0,   // where the real big motor starts turning (Sync up), 0 = not measured
    reverse: false,   // the board flips the big motor ("Q 1", set by Sync up); this page sends the plain sign
    measured: !!saved.speed, measureStep: 0, panEnabled: true,
    panStuck: false,   // from telemetry: the big motor is off or not responding, so no timed turns (tilt only)
    pan: 0, tilt: CFG.TILT_UP, busyUntil: 0, turning: 0, measuring: null,   // tilt: the board's angle (set from its data when used)
    target: { pan: 0, tilt: CFG.TILT_UP },
  };
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify({ speed: d.measured ? d.speed : null, start: d.startUs })); } catch (e) {} };
  const dps = way => way > 0 ? d.speed.pos : d.speed.neg;
  Object.defineProperty(d, "degPerSec", { get: () => (d.speed.pos + d.speed.neg) / 2 });
  const jogFor = start => Math.min(CFG.PAN_SAT_US, Math.max(JOG_US, start ? start + JOG_OVER_START : 0));
  d.jogUs = jogFor(d.startUs);
  const pulse = way => CFG.PAN_STOP_US + way * (d.reverse ? -1 : 1) * d.jogUs;
  // Sync up found where the real motor starts turning: the steady pulse moves clear of it, and the speed
  // measured at the old pulse no longer fits (measure again).
  d.setStart = us => { d.startUs = Math.max(0, Math.round(us) || 0); const j = jogFor(d.startUs); if (j !== d.jogUs) { d.jogUs = j; d.measured = false; } save(); };

  // Where the panel should point for this sun, inside the real board's range: pan within PAN_LIMIT_DEG
  // either way (85), tilt as the board's angle within flat +/- 45 (kept inside 5..175, tiltLimits()).
  function targetFor(sun, lat) {
    const night = sun.el < -2;   // night: face the sunrise
    const flat = getFlat(), [lo, hi] = tiltLimits(flat);
    const pan = night ? toModelAz(90, lat) : sun.az, model = night ? REST_TILT : 180 - Math.max(0, sun.el);
    return { pan: clamp(pan, -CFG.PAN_LIMIT_DEG, CFG.PAN_LIMIT_DEG), tilt: clamp(model - 90 + flat, lo, hi) };
  }

  // Called 50 times a second. Sends one line to the Arduino.
  d.update = (sun, lat, active) => {
    const now = performance.now();
    if (d.measuring) { send(`M 0 ${d.tilt.toFixed(1)}`); return; }   // the measuring turn is running
    if (active) {
      const t = targetFor(sun, lat);
      d.motion = Math.sign(t.pan - d.target.pan) || d.motion || 0;   // which way the sun is moving
      d.target = t;
    }
    d.tilt = d.target.tilt;
    if (now >= d.busyUntil) d.turning = 0;
    const err = d.target.pan - d.pan;
    if (active && d.panEnabled && !d.panStuck && now >= d.busyUntil && Math.abs(err) >= MIN_STEP) {
      const way = Math.sign(err), lead = way === d.motion && sun.el > -2 ? LEAD : 0;
      const frames = Math.max(1, Math.round(Math.min(MAX_TURN_MS, (Math.abs(err) + lead) / dps(way) * 1000) / FRAME_MS));
      const ms = frames * FRAME_MS;                // count exactly what the servo will get
      send(`J ${pulse(way)} ${Math.round(ms)} ${d.tilt.toFixed(1)}`);
      d.pan += way * dps(way) * ms / 1000;         // where it should be once the turn is done
      d.busyUntil = now + ms + BRAKE_MS; d.turning = way;
      return;
    }
    send(`M 0 ${d.tilt.toFixed(1)}`);               // keep-alive and the small motor's angle
  };

  // "This is facing forward": the count starts again from 0°.
  d.setForward = () => { d.pan = 0; send("z"); };

  // Measuring the big motor's speed, both ways: it turns one way until the user says it points
  // backwards (half a turn), then back until the user says it faces forward again.
  // Returns the step the user is on: 1 = turning out, 2 = turning back, 0 = done.
  d.measureClick = () => {
    const now = performance.now();
    if (d.measureStep === 0) {
      d.measureStep = 1; d.measuring = now;
      send(`J ${pulse(1)} 30000 ${d.tilt.toFixed(1)}`);
    } else if (d.measureStep === 1) {
      const s = (now - d.measuring) / 1000;
      if (s > 0.4) d.speed.pos = 180 / s;
      d.measureStep = 2; d.measuring = now;
      send(`J ${pulse(-1)} 30000 ${d.tilt.toFixed(1)}`);
    } else {
      const s = (now - d.measuring) / 1000;
      if (s > 0.4) d.speed.neg = 180 / s;
      send(`J 0 0 ${d.tilt.toFixed(1)}`);
      d.measureStep = 0; d.measuring = null; d.measured = true; save();
      d.pan = 0;   // the user stopped it facing forward: the count starts again from 0°
    }
    return d.measureStep;
  };
  d.setReverse = r => { d.reverse = !!r; };   // the classic page's switch only (not saved); the new page leaves it false
  // The big motor's top speed (what the Arduino's angle count uses), worked out from the measured
  // speed at the steady turning pulse. Its speed is taken to grow in a straight line with the pulse.
  d.fullSpeed = () => { const db = Math.max(CFG.PAN_DEADBAND_US, d.startUs); return d.degPerSec / ((d.jogUs - db) / (CFG.PAN_SAT_US - db)); };   // the board's count uses the K dead band
  return d;
}
