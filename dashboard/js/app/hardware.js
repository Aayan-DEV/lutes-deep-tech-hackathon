// The bridge the story uses to drive the REAL tracker in step with the 3D one (app.hardware,
// window.__game.hardware, scene.hardware). Every method is safe with nothing connected: it sends
// nothing and resolves (or returns false).
//
// Follow mode: the page takes over the board in remote mode (the M / J keep-alive the pretend sun
// uses, 20 lines a second; the board goes back to its own tracking 0.3 s after they stop).
//  - Small motor: its angle is sent directly. Model tilt 90 = flat; the board's flat is cfg.up.
//    The board turns it at TILT_FULL_STEP per 10 ms, and only inside flat +/- 45 (kept inside 5..175,
//    tiltLimits()); the big motor only within CFG.PAN_LIMIT_DEG (170).
//  - Big motor: timed turns ("J pulse ms tilt") at its measured speed toward the pan target, and a
//    count of where it is now. Turns of MIN_STEP (5 degrees) or more while the target moves, then a
//    last correction down to FINE_STEP once the target has stood still for SETTLE_MS.
// While following, the 3D tracker is drawn from pose() (the real motors' count), not from what the
// story sets: attach(tracker) wraps tracker.setPan / setTilt so they set the target instead.
import { CFG, tiltLimits } from "../logic.js";
import { mapKnown } from "../lightsetup.js";
import { createWatches } from "./hwwatch.js";

const TICK_MS = 50;                       // 20 lines a second: well inside the board's 0.3 s timeout
const MIN_STEP = 5, FINE_STEP = 3, SETTLE_MS = 250;
const FRAME_MS = 20, MAX_TURN_MS = 1500, BRAKE_MS = 150;   // as pretend.js
const PAN_CAP = CFG.PAN_LIMIT_DEG;        // never turn further than this either way (the board's limit)
const TILT_DPS = CFG.TILT_FULL_STEP * 1000 / CFG.UPDATE_MS;   // the board's tilt speed: the drawn one follows at it
const CONNECT_WAIT_MS = 10000;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function createHardware({ live, sync, onFollow }) {
  const { serial, driver } = live;
  const watches = createWatches({ subscribe: fn => hw.onTelemetry(fn) });
  let following = false, sending = false, wasConnected = false, synced = false;
  let pan = 0, jog = null, busyUntil = 0, tiltShown = 90, lastT = performance.now();
  const target = { pan: 0, tilt: 90 }, story = { pan: 0, tilt: 90 };   // story = what the story last asked for
  let targetAt = 0, raw = null;

  const connected = () => serial.connected && !!serial.data;
  // Big motor off ("P 0") or not responding (the board's watchdog, pan.stuck): no timed turns, and
  // nothing waits on the pan. The small motor carries on alone.
  const panOff = () => { const d = serial.data; return !!d && (d.pe === 0 || !!(d.pan && d.pan.stuck)); };
  const flat = () => live.flat();                                    // the board's flat angle (cfg.up)
  const range = () => tiltLimits(flat());                            // the board's tilt range: flat +/- 45
  const toReal = t => { const [lo, hi] = range(); return clamp(t - 90 + flat(), lo, hi); };   // model tilt -> the board's angle
  const toModel = a => a + 90 - flat();
  const send = line => { if (serial.connected) { serial.send(line); return true; } return false; };
  const pulse = way => CFG.PAN_STOP_US + way * (driver.reverse ? -1 : 1) * driver.jogUs;
  const dps = way => (way > 0 ? driver.speed.pos : driver.speed.neg);

  // Where the big motor is right now: mid-turn, the count moves at its measured speed.
  function panNow(now) {
    if (!jog || now >= jog.start + jog.ms) return pan;
    return jog.from + jog.way * jog.dps * (now - jog.start) / 1000;
  }
  function advanceTilt(now) {
    const dt = Math.min(0.2, (now - lastT) / 1000); lastT = now;
    const step = TILT_DPS * dt;
    tiltShown += clamp(target.tilt - tiltShown, -step, step);
  }

  // 20 times a second: one line to the board while following, and the link-drop check.
  function tick() {
    const now = performance.now();
    if (wasConnected && !serial.connected) dropped();
    wasConnected = serial.connected;
    if (!following || !serial.connected || live.sync || sending) return;
    advanceTilt(now);
    const tilt = toReal(target.tilt).toFixed(1);
    let line = `M 0 ${tilt}`;
    if (now >= busyUntil && !panOff()) {
      jog = null;
      const err = target.pan - pan, settled = now - targetAt > SETTLE_MS;
      if (Math.abs(err) >= (settled ? FINE_STEP : MIN_STEP)) {
        const way = Math.sign(err), v = dps(way);
        const frames = Math.max(1, Math.round(Math.min(MAX_TURN_MS, Math.abs(err) / v * 1000) / FRAME_MS));
        const ms = frames * FRAME_MS;
        line = `J ${pulse(way)} ${ms} ${tilt}`;
        jog = { from: pan, way, dps: v, start: now, ms };
        pan += way * v * ms / 1000;
        busyUntil = now + ms + BRAKE_MS;
      }
    }
    sending = true;
    send(line);
    Promise.resolve(serial.writer && serial.writer.ready).catch(() => {}).finally(() => { sending = false; });
  }
  setInterval(tick, TICK_MS);

  function dropped() {   // the link closed: nothing more is sent, the board steers by itself
    const was = following;
    following = false;
    if (was) { pan = panNow(performance.now()); driver.pan = pan; showStory(); }
    jog = null; busyUntil = 0;
    watches.cancelAll();
    if (was && onFollow) onFollow(false);
  }
  function showStory() { if (raw) { raw.setPan(story.pan); raw.setTilt(story.tilt, 90); raw.setMotion(0, 0); } }

  const hw = {
    get state() {
      return { connected: connected(), synced: synced || !!sync.finishedOnce || (driver.measured && mapKnown(serial.data)),
        measured: !!driver.measured, following, panStuck: connected() && panOff() };
    },
    get following() { return following; },
    get speed() { return driver.degPerSec; },            // big motor, degrees a second (measured, or 90)
    get lastClean() { return watches.lastClean; },
    get lastTrack() { return watches.lastTrack; },
  };

  // Opens the port picker (must run from a click), sends the saved settings, true once data flows.
  hw.connect = () => new Promise(resolve => {
    if (connected()) { live.sendSettings(); resolve(true); return; }
    let ended = false;
    if (!serial.connected) live.connect().finally(() => { ended = true; });   // resolves only when the link closes
    const t0 = performance.now();
    const poll = setInterval(() => {
      const ok = serial.connected && serial.fresh;
      if (ok || ended || performance.now() - t0 > CONNECT_WAIT_MS) {
        clearInterval(poll); wasConnected = serial.connected; resolve(!!ok);
      }
    }, 100);
  });

  // The Sync up wizard (sync.js). true when it finishes, false when cancelled or not possible.
  hw.calibrate = () => new Promise(resolve => {
    if (!connected()) { resolve(false); return; }
    hw.follow(false);
    sync.onEnd = ok => { sync.onEnd = null; if (ok) synced = true; resolve(!!ok); };
    sync.start();
    if (!sync.active) { sync.onEnd = null; resolve(false); }
  });

  hw.follow = on => {
    if (on) {
      if (following) return true;
      if (!connected()) return false;
      const d = serial.data;
      pan = d && d.pan && Number.isFinite(d.pan.deg) ? d.pan.deg : driver.pan;   // start from the board's own count
      tiltShown = d && d.tilt && Number.isFinite(d.tilt.ang) ? toModel(d.tilt.ang) : 90;
      jog = null; busyUntil = 0; lastT = performance.now();
      hw.setPose(story.pan, story.tilt);   // go to what the story shows now
      following = true; wasConnected = true;
      onFollow && onFollow(true);
      return true;
    }
    if (!following) return false;
    following = false;
    pan = panNow(performance.now());   // "J 0 0" stops a turn mid-way: the count is where it is now
    jog = null; busyUntil = 0;
    send(`J 0 0 ${toReal(target.tilt).toFixed(1)}`);
    driver.pan = pan; driver.tilt = toReal(target.tilt);   // the pretend sun carries on from here
    showStory();   // the 3D shows the story again
    onFollow && onFollow(false);
    return true;
  };
  hw.release = () => hw.follow(false);

  // Target pose, model frame: pan 0 = front, tilt 90 = flat.
  hw.setPose = (panDeg, tiltDeg) => {
    // inside the board's range, so the drawn pose is where the real one can go
    const p = clamp(+panDeg || 0, -PAN_CAP, PAN_CAP);
    const [lo, hi] = range();
    const t = clamp(Number.isFinite(+tiltDeg) ? +tiltDeg : 90, toModel(lo), toModel(hi));
    if (p !== target.pan || t !== target.tilt) targetAt = performance.now();
    target.pan = story.pan = p; target.tilt = story.tilt = t;   // the 3D shows this again after release
  };

  hw.pose = () => {
    const now = performance.now();
    if (!following) return { pan: story.pan, tilt: story.tilt, moving: false, panDir: 0, tiltDir: 0 };
    advanceTilt(now);
    const turning = !!jog && now < jog.start + jog.ms, tiltOff = target.tilt - tiltShown;
    return { pan: panNow(now), tilt: tiltShown, moving: turning || Math.abs(tiltOff) > 0.5,
      panDir: turning ? jog.way : 0, tiltDir: Math.abs(tiltOff) > 0.5 ? Math.sign(tiltOff) : 0 };
  };

  // Front and flat. Resolves when the count says it is there (plus 300 ms).
  hw.home = () => new Promise(resolve => {
    story.pan = 0; story.tilt = 90;
    if (!connected()) { resolve(); return; }
    hw.follow(true);
    hw.setPose(0, 90);
    const limit = performance.now() + Math.abs(pan) / Math.max(10, hw.speed) * 1000 + 6000;
    const poll = setInterval(() => {
      const now = performance.now();
      const panThere = panOff() || (now >= busyUntil && Math.abs(target.pan - pan) < FINE_STEP);   // big motor off: only the tilt counts
      const there = panThere && now - targetAt > SETTLE_MS && Math.abs(target.tilt - tiltShown) < 0.5;
      if (there || !following || now > limit) { clearInterval(poll); setTimeout(resolve, there ? 300 : 0); }
    }, 50);
  });

  hw.clean = () => send("D 1");

  hw.onTelemetry = fn => {
    live.dataFns.add(fn);
    return () => live.dataFns.delete(fn);
  };

  // Real-world checks. Both let the board steer by itself (follow off).
  hw.watchTracking = (opts = {}) => {
    if (!connected()) return Promise.resolve("timeout");
    hw.follow(false);
    return watches.tracking(opts);
  };
  hw.watchCleaning = () => {
    if (!connected()) return Promise.resolve("timeout");
    hw.follow(false);
    return watches.cleaning();
  };
  hw.cancelWatches = () => watches.cancelAll();

  // Wrap the 3D tracker: while following, the story's setPan / setTilt set the target, and draw()
  // shows the real motors' count every frame. Otherwise they pass straight through.
  hw.attach = tracker => {
    raw = { setPan: tracker.setPan.bind(tracker), setTilt: tracker.setTilt.bind(tracker), setMotion: tracker.setMotion.bind(tracker) };
    tracker.setPan = deg => {
      story.pan = +deg || 0;
      if (following) hw.setPose(story.pan, story.tilt); else raw.setPan(deg);
    };
    tracker.setTilt = (deg, flatDeg = 90) => {
      story.tilt = deg == null ? 90 : deg - flatDeg + 90;   // keep it in the model frame
      if (following) hw.setPose(story.pan, story.tilt); else raw.setTilt(deg, flatDeg);
    };
  };
  hw.drawRaw = p => { if (raw && p) { raw.setPan(p.pan); raw.setTilt(p.tilt, p.flat ?? 90); raw.setMotion(p.panDir || 0, p.tiltDir || 0); } };
  hw.draw = () => {
    if (!following || !raw) return;
    const p = hw.pose();
    raw.setPan(p.pan); raw.setTilt(p.tilt, 90); raw.setMotion(p.panDir, p.tiltDir);
  };
  return hw;
}
