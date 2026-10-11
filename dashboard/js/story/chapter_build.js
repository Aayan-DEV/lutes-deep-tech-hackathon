// The truck and the three builders, as scene pieces the chapters reuse (chapter_crew.js):
//   arrive(ctx, { buildS })  the truck drives in, three people get out, two kneel at the base with
//                            screwdrivers while one checks a tablet, the tracker grows part by part
//                            over buildS seconds, then they step back to the side
//   parkCrew(ctx)            at once: the truck parked by the road, the three standing to the side
//                            (the state arrive() ends in), for a later chapter that starts there
//   leave(ctx, { onDrive })  they wave, walk to the truck, get in, and it drives off to the west;
//                            onDrive() runs as it starts to move
//   runQuickBuild(ctx)       the old quick build (about 6 s): arrive, wave, leave
// The crates stay in the truck bed: nothing is left behind.
// Positions are for the tracker at scale 1 (ctx.at scales them). The road runs east to west 50 cm
// north of the tracker; the base covers about x -10..17, z -8.5..8.5, so nobody stands there.
import { sunAt, dateFor } from "./sunpath.js";

const ROAD_Z = -50, PARK_X = 30, DOY = 81, HOUR = 7.6;
const DOOR = { x: PARK_X - 4, z: ROAD_Z + 13 };
// where the three stand once the work is done: beside the truck, behind the tracker as the
// story's cameras see it (they look from the south), so they never stand in front of it
export const ASIDE = [{ x: 30, z: -32 }, { x: 42, z: -30 }, { x: 18, z: -30 }];

const P = (ctx, x, z) => ctx.at(x, z);

function setMorning(ctx, hour = HOUR) {
  const { lat, lon } = ctx.region, s = sunAt(lat, DOY, hour);
  ctx.sun(s.el, s.az); ctx.setDate(dateFor(2023, DOY, hour, lon));
}

function stand(ctx, ids) {
  const { people } = ctx.scene;
  for (const i of ids) { people.hold(i, null, "R"); people.hold(i, null, "L"); people.act(i, "idle"); people.face(i, P(ctx, 4, 0)); }
}

export function parkCrew(ctx) {
  const { people, truck } = ctx.scene;
  truck.place(P(ctx, PARK_X, ROAD_Z), Math.PI);
  truck.loadCrates(["crate", "crate", "panelBox"]);
  truck.closeBack();
  const ids = people.spawn(3, ASIDE.map(a => ({ ...P(ctx, a.x, a.z), heading: Math.atan2(4 - a.x, 0 - a.z) })));
  stand(ctx, ids);
  return ids;
}

export async function arrive(ctx, { buildS = 4.5, driveS = 1.4, hour = HOUR, lookWork = "buildWork" } = {}) {
  const { people, truck } = ctx.scene;
  ctx.build(0);
  setMorning(ctx, hour);

  truck.place(P(ctx, 230, ROAD_Z), Math.PI);           // to the east, nose pointing west
  truck.loadCrates(["crate", "crate", "panelBox"]);
  await truck.driveTo(P(ctx, PARK_X, ROAD_Z), driveS);
  truck.openBack(); ctx.sound.whoosh();
  if (lookWork) ctx.look(lookWork, Math.max(2, buildS));

  const [a, b, c] = people.spawn(3, [
    { ...P(ctx, DOOR.x, DOOR.z), heading: 0.3 }, { ...P(ctx, DOOR.x - 6, DOOR.z - 1), heading: 0.1 }, { ...P(ctx, DOOR.x + 6, DOOR.z), heading: 0.5 },
  ]);
  people.hold(a, "screwdriver", "R"); people.hold(c, "screwdriver", "R"); people.hold(b, "tablet", "L");
  await Promise.all([people.walkTo(a, P(ctx, 4, -15), 0.8), people.walkTo(c, P(ctx, -16, -4), 1.0), people.walkTo(b, P(ctx, 22, -28), 0.7)]);
  people.face(a, 0); people.act(a, "kneel");
  people.face(c, Math.PI / 2); people.act(c, "kneel");
  people.face(b, P(ctx, 4, 0)); people.act(b, "tablet");

  await ctx.during(buildS, u => {
    ctx.build(u);
    if (u > 0.5) { people.act(a, "work"); people.act(c, "work"); }   // the upper parts: stand and reach
  });
  ctx.build(1);
  ctx.sound.pop();
  return [a, b, c];
}

// they step back from the finished tracker to the side, and close the tailgate
export async function stepBack(ctx, ids, seconds = 0.8) {
  const { people, truck } = ctx.scene;
  for (const i of ids) { people.hold(i, null, "R"); people.hold(i, null, "L"); people.act(i, "idle"); }
  truck.closeBack();
  await Promise.all(ids.map((i, k) => people.walkTo(i, P(ctx, ASIDE[k].x, ASIDE[k].z), seconds)));
  stand(ctx, ids);
}

export async function wave(ctx, ids, seconds = 0.5, at = { x: 120, z: 60 }) {
  const { people } = ctx.scene;
  for (const i of ids) { people.hold(i, null, "R"); people.hold(i, null, "L"); people.face(i, P(ctx, at.x, at.z)); people.act(i, "wave"); }
  await ctx.wait(seconds);
  for (const i of ids) people.act(i, "idle");
}

export async function leave(ctx, ids, { walkS = 0.8, driveS = 1.4, onDrive = null } = {}) {
  const { people, truck } = ctx.scene;
  const spots = [{ x: DOOR.x, z: DOOR.z }, { x: DOOR.x - 5, z: DOOR.z }, { x: DOOR.x + 5, z: DOOR.z }];
  await Promise.all(ids.map((i, k) => people.walkTo(i, P(ctx, spots[k % 3].x, spots[k % 3].z), walkS * (0.9 + 0.1 * k))));
  people.remove();
  truck.closeBack();
  if (onDrive) onDrive();
  return truck.driveTo(P(ctx, -260, ROAD_Z), driveS).then(() => truck.remove());   // off it goes, with its crates
}

export async function runQuickBuild(ctx) {
  const ids = await arrive(ctx, { buildS: 2.4 });
  await wave(ctx, ids, 0.5);
  leave(ctx, ids).catch(() => {});
}
