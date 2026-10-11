// "Closer to home": Pakistan's rooftop solar, told in 3 short sentences (facts_home.js). A warm
// evening in Cholistan; the big card counts up its numbers on sentence 1; three small houses with
// fixed panels on their roofs rise from the sand next to the tracker on sentence 2; on sentence 3
// the camera turns to the tracker beside the houses (the family's panels, too costly to track).
import { HOME, homeLines } from "./facts_home.js";
import { sunAt, poseFor, dateFor } from "./sunpath.js";
import { houseRow } from "./props_home.js";

const DOY = 140, HOUR = 18.2;   // about 20 May, a low sun in the west

export const homeSentences = homeLines;

export const homeChapter = {
  id: "home",
  title: "Closer to home",
  region: "cholistan",
  text: homeSentences,
  camera: "homeWide", cameraTime: 0,
  async run(ctx) {
    const { lat, lon } = ctx.region, s = sunAt(lat, DOY, HOUR), p = poseFor(s.el, s.az, lat);
    ctx.sun(s.el, s.az);
    ctx.setDate(dateFor(2025, DOY, HOUR, lon));
    ctx.sound.pad(true);
    ctx.place.show(HOME.card, { onHeadline: () => ctx.sound.low(), onCount: u => ctx.sound.count(u) });
    const row = ctx.put(houseRow(lat, 3, 30), -112, 0, -14);
    row.userData.glow(0.15);
    await Promise.all([ctx.tween(ctx.pose, "pan", p.pan, 1.6), ctx.tween(ctx.pose, "tilt", p.tilt, 1.6)]);

    // sentence 2: roofs are fixed; the houses rise, panels fixed on top
    await ctx.atSentence(1);
    ctx.look("homeWide2", 6);
    for (let i = 0; i < 3; i++) {
      ctx.sound.pop();
      await ctx.during(0.55, u => row.userData.rise(i, 1 - Math.pow(1 - u, 3)));
      await ctx.wait(0.15);
    }

    // sentence 3: the family's fixed panels next to the tracker that follows the sun
    await ctx.atSentence(2);
    ctx.look("homeTurn", 4);
    await ctx.during(0.5, u => row.userData.glow(0.15 + 0.5 * u));
  },
};
