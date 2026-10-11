// "How we built it": seven sentences, the way the team really built it. On each of the first six
// the camera moves close to the new parts, they pop in (in tracker.js BUILD_ORDER) and a short
// name tag shows above them. The seventh is a wide view of the finished tracker with a tag on the
// Arduino, while both motors move a little (not while the real tracker follows: it stays home).
// Every step's visual starts with its sentence and is short enough to end inside its voice; the
// motors move right after the last parts are in, so auto play's quick cut never hides them.
// Where each part is comes from the model itself (steps_parts.js measures it), so the close-ups
// follow the model when it changes.
import { measureSteps, viewFor, partTag } from "./steps_parts.js";
import { STEPS as SENTENCES } from "./texts.js";

const START_CAM = { pos: [52, 34, 70], target: [3, 4, 0] };
const TAG_K = 0.032;   // tag text height as a share of the camera distance: the same size on screen

async function buildOrder() {
  try { return (await import("../scene/tracker.js")).BUILD_ORDER || null; } catch (e) { return null; }
}

// Count the pops the stage plays while fn runs; if it played none, pop once, so every sentence
// gets one (the stage pops per share of the build, which can fall between two parts).
async function withPop(ctx, fn) {
  const snd = ctx.sound, orig = snd.pop;
  let n = 0;
  snd.pop = (...a) => { n++; return orig.apply(snd, a); };
  try { await fn(); } finally { snd.pop = orig; }
  if (!n && !ctx.cancelled()) snd.pop();
}

export const stepsChapters = [
  {
    id: "steps",
    title: "How we built it",
    text: SENTENCES,
    camera: START_CAM, cameraTime: 0, build: 0,
    async run(ctx) {
      const tracker = ctx.scene.tracker;
      const { steps, ardAt } = measureSteps(tracker, await buildOrder(), 0);
      const views = steps.map(st => viewFor(st));
      const tags = steps.map((st, k) => {
        const size = views[k].dist * TAG_K, at = st.wide ? ardAt : [st.focus[0], st.top + 1.5 * size, st.focus[2]];
        return partTag(ctx, st.label, at, size);
      });
      const fadeTags = (on, u) => tags.forEach((t, i) => t.userData.fade(i === on ? u : Math.min(t.material.opacity, 1 - u)));

      let shown = 0;   // build progress reached so far
      for (let k = 0; k < steps.length; k++) {
        await ctx.atSentence(k);
        const st = steps[k], from = shown, last = k === steps.length - 1;
        ctx.look(views[k], last ? 2.4 : 1.6);
        await ctx.wait(0.2);
        const grow = Math.max(0.6, 0.45 * st.ids.length + 0.15);
        const play = () => ctx.during(last ? 0.9 : grow, u => {
          ctx.build(from + (st.build - from) * u);
          fadeTags(k, u);
        });
        if (st.build > from) await withPop(ctx, play); else await play();
        ctx.build(st.build);
        shown = st.build;
      }

      // the finished tracker: the Arduino moves both motors a little. Not with the real tracker:
      // it cannot "appear", so its motors stay at the front and flat until "Off they went".
      if (ctx.following) return;
      await ctx.wait(0.3);
      ctx.sound.whoosh();
      await Promise.all([ctx.tween(ctx.pose, "pan", 28, 1.1), ctx.tween(ctx.pose, "tilt", 122, 1.1)]);
      await Promise.all([ctx.tween(ctx.pose, "pan", -18, 1.4), ctx.tween(ctx.pose, "tilt", 108, 1.4)]);
      await Promise.all([ctx.tween(ctx.pose, "pan", 0, 1.0), ctx.tween(ctx.pose, "tilt", 112, 1.0)]);
    },
  },
];
