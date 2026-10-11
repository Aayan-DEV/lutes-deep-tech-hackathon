// "The real thing": the last chapter, real-world tests on the real tracker (texts.js REAL).
//   1. "Now it is time for the real thing." (Next)
//   2. The torch: Start or Skip. Start lets the board steer by itself and watches the telemetry
//      until it holds the torch 3 s (hw.watchTracking); the card at the top right shows the 4 lights.
//   3. The dust: Start or Skip. Start watches the board's own cleaning routine (hw.watchCleaning);
//      the light card shows the drop and the cleaning words from hw.lastClean.
//   4. "The end. Thank you for watching our presentation." with one button: Close the story.
// Without the real tracker (or it dropped), steps 1 to 3 are skipped. In auto play the test cards
// still wait for a person (someone has to hold the torch), up to 60 s, then skip by themselves.
// While a test runs the 3D follows the real motors from the telemetry.
import { REAL } from "./texts.js";
import { sunAt, poseFor } from "./sunpath.js";

const WAIT_PERSON_S = 60;
const SENSORS = { title: "Light on the 4 sensors", names: ["Top left", "Top right", "Bottom left", "Bottom right"] };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// the 4 lights in % from one telemetry line: lt (light per sensor) or else raw (0..1023)
function lightsOf(d) {
  const lt = Array.isArray(d.lt) && d.lt.length === 4 ? d.lt : null;
  if (lt) return lt.map(v => clamp(+v || 0, 0, 100));
  if (Array.isArray(d.raw) && d.raw.length === 4) return d.raw.map(v => clamp((+v || 0) / 10.23, 0, 100));
  return null;
}
function cleanWords(cl) {
  const st = cl ? +cl.st || 0 : 0;
  if (st === 1) return "Something is blocking the lights";
  if (st === 2) return `Cleaning: rocking back and forth, round ${Math.max(1, +cl.round || 1)}`;
  if (st === 3) return "Needs a hand";
  return "Watching the lights";
}
function trackWords(t) {
  if (t && t.onTarget) return `Locked on the light: ${Math.min(3, t.heldS || 0).toFixed(1)} s`;
  if (t && t.torch) return "Turning to the light";
  return "Waiting for the torch";
}

// One test: the card keeps its sentence with a Skip button while the board is watched.
async function runTest(ctx, hw, kind, text) {
  const L = ctx.lights;
  let last = null;
  L.setup(SENSORS); L.show(true); L.note(kind === "torch" ? trackWords(null) : cleanWords(null));
  const unsub = (hw.onTelemetry && hw.onTelemetry(d => { last = d; })) || (() => {});
  const feed = ctx.during(3600, (u, dt) => {
    if (!last) return;
    const v = lightsOf(last);
    if (v) L.set(v);
    L.note(kind === "torch" ? trackWords(hw.lastTrack) : cleanWords(hw.lastClean || last.cl));
    // the 3D follows the real motors (the board's own angles; its flat is cfg.up)
    const pan = last.pan && Number.isFinite(+last.pan.deg) ? +last.pan.deg : null;
    const tilt = last.tilt && Number.isFinite(+last.tilt.ang) ? +last.tilt.ang + 90 - (+(last.cfg && last.cfg.up) || 90) : null;
    const k = 1 - Math.exp(-dt * 8);
    if (pan != null) ctx.pose.pan += (pan - ctx.pose.pan) * k;
    if (tilt != null) ctx.pose.tilt += (tilt - ctx.pose.tilt) * k;
  });
  feed.catch(() => {});
  try {
    const watch = Promise.resolve(kind === "torch" ? hw.watchTracking({ seconds: 3 }) : hw.watchCleaning());
    const skip = ctx.ask({ lines: [text], instant: true, choices: [{ id: "skip", label: "Skip" }] })
      .then(a => (a === "skip" ? "skip" : new Promise(() => {})));
    const r = await Promise.race([watch, skip]);
    if (r === "skip") { try { hw.cancelWatches?.(); } catch (e) { /* gone */ } }
    return r;
  } finally {
    unsub();
  }
}

// A test card: Start or Skip, then the result and Next. Returns when it is done.
async function testStep(ctx, hw, kind) {
  const text = kind === "torch" ? REAL.torch : REAL.dust;
  const pick = await ctx.ask({ lines: [text], timeout: ctx.auto() ? WAIT_PERSON_S : 0,
    choices: [{ id: "start", label: "Start", primary: true }, { id: "skip", label: "Skip" }] });
  if (pick !== "start" || !ctx.link.on) return;
  if (kind === "torch") { try { hw.release(); } catch (e) { /* the watch lets go too */ } }
  const r = await runTest(ctx, hw, kind, text);
  if (r === "skip") { ctx.lights.show(false); return; }
  const ok = r === "ok";
  if (ok) ctx.sound.chime();
  ctx.lights.note(ok ? "Success" : "Not this time");
  await ctx.ask({ lines: [kind === "torch" ? (ok ? REAL.torchOk : REAL.torchNo) : (ok ? REAL.dustOk : REAL.dustNo)], next: true });
  ctx.lights.show(false);
}

export const realChapter = {
  id: "real",
  title: REAL.title,
  custom: true,          // the cards come from run(), not from text
  still: true,           // the board steers by itself here: the story does not drive the motors
  text: [REAL.intro, REAL.torch, REAL.dust, REAL.end],
  camera: "yourTurn", cameraTime: 3,
  async run(ctx) {
    const hw = ctx.link.hw(), real = ctx.link.on && !!hw;
    if (!real) {
      const { lat } = ctx.region, s = sunAt(lat, 80, 15), p = poseFor(s.el, s.az, lat);
      ctx.sun(s.el, s.az);
      ctx.tween(ctx.pose, "pan", p.pan, 2).catch(() => {});
      ctx.tween(ctx.pose, "tilt", p.tilt, 2).catch(() => {});
    }
    ctx.sound.pad(true);
    if (real) {
      await ctx.ask({ lines: [REAL.intro], next: true });
      await testStep(ctx, hw, "torch");
      await testStep(ctx, hw, "dust");
    }
    ctx.done();
    const a = await ctx.ask({ lines: [REAL.end], final: true, back: false, choices: [{ id: "close", label: "Close the story", primary: true }] });
    if (a === "close") ctx.exit("simulation");
  },
};
