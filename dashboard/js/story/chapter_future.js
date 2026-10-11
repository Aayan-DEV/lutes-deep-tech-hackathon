// "What comes next": 4 sentences (facts_home.js FUTURE). Visuals, one per sentence:
//   1. Cheap dirt sensing: the panel lies flat with some dust on it, and a tag "4 sensors: under $1"
//      sits over the sensor.
//   2. Two-axis trackers cost a lot: nothing new, the camera pulls back to the houses and tracker.
//   3. One motor per row: a row of 4 small panels on one shared pipe tips together beside the
//      tracker (it keeps tipping to the end of the chapter).
//   4. The wiper and the sprinkler: the camera moves close, the panel lies flat, the wiper sweeps
//      across it twice and the sprinkler puffs water twice while the dust fades to 0. The chapter
//      ends on this scene with the clean panel.
import { FUTURE } from "./facts_home.js";
import { sunAt, poseFor, dateFor } from "./sunpath.js";
import { tag } from "./props.js";
import { houseRow, wiper, sprinkler, spray, panelRow } from "./props_home.js";
import { PIVOT_Y } from "../scene/tracker_mech.js";
import { WOOD } from "../scene/tracker_panel.js";

const DOY = 100, HOUR = 10.5;
const PANEL_TOP = PIVOT_Y + WOOD.gap + WOOD.t;     // the face of the flat panel (22.4), at scale 1
const SPRINKLER_H = PANEL_TOP + 2.5;               // the sprinkler's post: its nozzle a little above the panel
const SENSOR = [0, 6.6];                           // the light sensor (x, z) when the panel is flat
const DUST = 0.4;                                  // the dust on the panel until the wiper cleans it
const SWEEPS = 2, PUFFS = 2, CLEAN_S = 3;          // sentence 4: both work at once for CLEAN_S seconds
const fadeIn = (ctx, tags, s = 0.5) => ctx.during(s, u => tags.forEach(t => t.userData.fade(u)));
const flat = (ctx, s) => Promise.all([ctx.tween(ctx.pose, "pan", 0, s), ctx.tween(ctx.pose, "tilt", 90, s)]);

export function futureSentences() {
  return FUTURE.sentences.filter(Boolean);
}

export const futureChapter = {
  id: "future",
  title: "What comes next",
  region: "cholistan",               // the same houses as "Closer to home"
  text: futureSentences,
  camera: "futureSensor", cameraTime: 2,
  async run(ctx) {
    const { lat, lon } = ctx.region, s = sunAt(lat, DOY, HOUR), p = poseFor(s.el, s.az, lat);
    ctx.sun(s.el, s.az);
    ctx.setDate(dateFor(2026, DOY, HOUR, lon));
    ctx.soil.dust = DUST;
    const houses = ctx.put(houseRow(lat, 3, 30), -112, 0, -14);
    for (let i = 0; i < 3; i++) houses.userData.rise(i, 1);
    houses.userData.glow(0.5);

    // 1. the four light sensors, under a dollar
    await flat(ctx, 1);
    const price = ctx.put(tag("4 sensors: under $1", { size: 1.8, dot: "#f59e0b" }), SENSOR[0], PANEL_TOP + 6, SENSOR[1] + 1);
    price.userData.fade(0);
    ctx.sound.pop();
    await fadeIn(ctx, [price]);

    // 2. two-axis trackers cost a lot: pull back
    await ctx.atSentence(1);
    ctx.look("futureWide", 3);
    await ctx.during(0.4, u => price.userData.fade(1 - u));
    await Promise.all([ctx.tween(ctx.pose, "pan", p.pan, 1.4), ctx.tween(ctx.pose, "tilt", p.tilt, 1.4)]);

    // 3. one motor tips a whole row
    await ctx.atSentence(2);
    ctx.look("futureRow", 2.5);
    const row = ctx.put(panelRow(4, 12), 52, 0, 4);
    const rowTag = ctx.put(tag("One motor, one row", { size: 2.6, dot: "#f59e0b" }), 52, 19, 8);
    rowTag.userData.fade(0);
    const tipping = ctx.during(600, () => row.userData.tilt(Math.sin(performance.now() / 900) * 32));
    tipping.catch(() => {});
    ctx.sound.pop();
    await fadeIn(ctx, [rowTag]);

    // 4. the wiper and the sprinkler: close up, the panel flat, two sweeps and two puffs, dust to 0
    await ctx.atSentence(3);
    ctx.look("futureClean", 1.6);
    const arm = ctx.put(wiper(), 0, PANEL_TOP + 0.45, 0), head = ctx.put(sprinkler(SPRINKLER_H), 13, 0, 0);
    const puff = spray(), nz = head.userData.nozzle;
    puff.position.set(nz.x, nz.y, nz.z); head.add(puff);
    const tags = [ctx.put(tag("Wiper", { size: 1.8, dot: "#f59e0b" }), -6, PANEL_TOP + 5, 6), ctx.put(tag("Sprinkler", { size: 1.8, dot: "#5b8db8" }), 15, SPRINKLER_H + 4.5, 2)];
    tags.forEach(t => t.userData.fade(0));
    arm.visible = head.visible = false;
    await Promise.all([ctx.during(0.4, u => rowTag.userData.fade(1 - u)), flat(ctx, 0.8)]);
    arm.visible = head.visible = true;
    ctx.sound.pop();
    await fadeIn(ctx, tags);
    // each puff is on for the first 40 % of its share of the time; the water comes and dries again
    const puffOn = u => u < 1 && (u * PUFFS) % 1 < 0.4;
    let wasOn = false;
    ctx.sound.whoosh();
    await ctx.during(CLEAN_S, (u, dt) => {
      arm.userData.sweep(u * SWEEPS);                     // sweep() repeats every 1: one stroke there and back
      const on = puffOn(u);
      if (on !== wasOn) { ctx.sound.rain(on ? 0.35 : 0); wasOn = on; }
      puff.userData.frame(dt, on);
      ctx.soil.dust = DUST * (1 - u);
      ctx.soil.water = 0.5 * Math.sin(Math.PI * u);
    });
    ctx.sound.rain(0);
    ctx.soil.dust = 0;
    await ctx.during(0.8, (u, dt) => { puff.userData.frame(dt, false); ctx.soil.water = 0; });
    // the chapter ends here: the row keeps tipping and the tracker's panel is clean
  },
};
