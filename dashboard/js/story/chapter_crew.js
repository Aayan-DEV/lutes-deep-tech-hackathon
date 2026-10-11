// The truck and the three builders, in two short chapters of one sentence each:
//   "People came" (right after "The desert"): the truck drives in, three people get out, the
//     tracker's parts pop in over about 4.5 s while two kneel and work and one checks a tablet,
//     then they step back to the side of the truck.
//   "Off they went" (right after "How we built it"): the three wave, get in, the truck drives off
//     to the west, and the tracker turns to the morning sun and starts to follow it.
// In between they are not in the scene: the country, home and team chapters play elsewhere or
// tell the story with photos (the team chapter has its own three people). withCrew(chapter) puts
// the truck back by the road and the three to the side for "How we built it", the way "People
// came" left them, so the next chapter starts from the same picture.
// The real tracker: "People came" has build 0, so the real motors stay at home (the stage sets the
// front and flat pose); "Off they went" turns them with ctx.tween and ctx.stretch, which last as
// long as the real motors need, and story.js never hurries a chapter while they follow.
// Scene pieces: chapter_build.js. Text: texts.js (CAME, LEFT).
import { arrive, stepBack, parkCrew, wave, leave } from "./chapter_build.js";
import { sunAt, poseFor, dateFor } from "./sunpath.js";
import { CAME, LEFT } from "./texts.js";

const DOY = 81, LEAVE_HOUR = 8.6;
const OFF_CAM = { pos: [96, 36, 112], target: [16, 8, -22] };     // the three by the truck, the tracker in front
const OFF_CAM2 = { pos: [34, 40, 134], target: [-22, 8, -26] };   // eases west with the truck

export const cameChapter = {
  id: "came",
  title: "People came",
  text: CAME,
  camera: "buildWide", cameraTime: 0, build: 0,
  async run(ctx) {
    const ids = await arrive(ctx, { buildS: 4.5, driveS: 1.2 });
    await stepBack(ctx, ids, 0.7);
    ctx.done?.();
  },
};

export const leftChapter = {
  id: "left",
  title: "Off they went",
  text: LEFT,
  camera: OFF_CAM, cameraTime: 0, build: 1,
  async run(ctx) {
    const { lat, lon } = ctx.region;
    const sunNow = h => { const s = sunAt(lat, DOY, h); ctx.sun(s.el, s.az); ctx.setDate(dateFor(2023, DOY, h, lon)); return s; };
    const s0 = sunNow(LEAVE_HOUR);
    const ids = parkCrew(ctx);
    ctx.look(OFF_CAM2, 6);
    await wave(ctx, ids, 1.1, { x: 96, z: 112 });

    // they get in and drive off; as the truck moves, the tracker turns to the sun
    let turn = Promise.resolve();
    const drive = leave(ctx, ids, {
      walkS: 0.8, driveS: 2.2,
      onDrive: () => {
        ctx.sound.whoosh();
        const p = poseFor(s0.el, s0.az, lat);
        turn = Promise.all([ctx.tween(ctx.pose, "pan", p.pan, 2.2), ctx.tween(ctx.pose, "tilt", p.tilt, 2.2)]);
      },
    });
    await drive;
    await turn;

    // at work: the sun climbs a little and the tracker follows it
    const p0 = poseFor(s0.el, s0.az, lat), s1 = sunAt(lat, DOY, LEAVE_HOUR + 0.6), p1 = poseFor(s1.el, s1.az, lat);
    ctx.done?.();
    await ctx.during(ctx.stretch(3, p1.pan - p0.pan), u => {
      const s = sunNow(LEAVE_HOUR + 0.6 * u), p = poseFor(s.el, s.az, lat);
      ctx.pose.pan = p.pan; ctx.pose.tilt = p.tilt;
    });
  },
};

// "How we built it" with the truck parked and the three standing to the side
export function withCrew(ch) {
  if (!ch || !ch.run) return ch;
  return Object.assign({}, ch, { run: ctx => { parkCrew(ctx); return ch.run(ctx); } });
}
