// Helpers for "How we built it" (chapter_steps.js): which parts each sentence shows, where they
// are, the close-up camera for them and the short name tag next to them.
// Part ids follow tracker.js BUILD_ORDER: base, blocks, bigMotor, plate, pipe, spinner, holders,
// rod, smallMotor, top. Nothing is hand-placed: each part's box is measured on the real model, so
// the camera and the tags follow the model when it changes. Everything is in the tracker group's
// own units (cm at scale 1), the same frame ctx.look uses.
import { tag } from "./props.js";

const T = () => window.THREE;
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };

// One step per sentence. ids: the parts that pop in; dir: where the camera looks from (+z is the
// front of the tracker, +x the side with the Arduino); k: camera distance in part sizes; up: how
// far (share of the distance) the camera aims under the part, so it shows above the sentences;
// wide: the last step shows everything.
export const STEPS = [
  { ids: ["base"], label: "Wooden base", dir: [0.45, 0.62, 0.8], k: 3.9, up: 0.13 },
  { ids: ["blocks", "bigMotor"], label: "Big motor between two blocks", dir: [0.35, 0.4, 1] },
  { ids: ["plate"], label: "UHMW plate with a hole", dir: [0.4, 0.55, 1] },
  { ids: ["pipe", "spinner"], label: "Pipe and the spinning block", dir: [0.45, 0.3, 1] },
  { ids: ["holders", "rod", "smallMotor"], label: "Rod and small servo", dir: [0.8, 0.35, 0.8] },
  { ids: ["top"], label: "Panel and 4 light sensors", dir: [0.5, 0.5, 0.9], up: 0.07 },
  { ids: [], label: "Arduino and breadboard", dir: [0.62, 0.42, 0.9], wide: true, k: 4.8, up: 0.1 },
];
const ARDUINO_FALLBACK = [12.6, 3.4, 4.6];   // where the Arduino sat on the older model

// Box of one object in the tracker group's own frame (all 8 corners, so a turned part is right).
function localBox(group, obj) {
  const THREE = T(), wb = new THREE.Box3().setFromObject(obj), out = new THREE.Box3();
  if (wb.isEmpty()) return out;
  for (let i = 0; i < 8; i++) {
    const v = new THREE.Vector3(i & 1 ? wb.max.x : wb.min.x, i & 2 ? wb.max.y : wb.min.y, i & 4 ? wb.max.z : wb.min.z);
    out.expandByPoint(group.worldToLocal(v));
  }
  return out;
}

// The Arduino board: a group named "arduino" if the model names it, else the board-sized group
// (6.9 x 5.3 cm) inside the base, else where it used to be.
function findArduino(group, parts) {
  const THREE = T();
  let hit = null;
  group.traverse(o => { if (!hit && /arduino/i.test(o.name || "")) hit = o; });
  if (!hit && parts.base) {
    parts.base.traverse(o => {
      if (hit || !o.isGroup || o === parts.base) return;
      const s = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()), sc = group.scale.x || 1;
      const a = Math.max(s.x, s.z) / sc, b = Math.min(s.x, s.z) / sc;
      if (Math.abs(a - 6.86) < 0.5 && Math.abs(b - 5.33) < 0.5) hit = o;
    });
  }
  if (!hit) return ARDUINO_FALLBACK;
  const c = localBox(group, hit).getCenter(new THREE.Vector3());
  return [c.x + 2, localBox(group, hit).max.y + 3, c.z];
}

// Measures every part on the full model, then puts the build back the way it was. Returns, for
// each step: build (the progress that shows its parts), focus, r (size), tagAt; and the Arduino.
export function measureSteps(tracker, buildOrder, buildNow) {
  const THREE = T(), group = tracker.group, parts = tracker.parts || {};
  const order = buildOrder && buildOrder.length ? buildOrder : Object.keys(parts);
  tracker.setBuildProgress?.(1);
  group.updateMatrixWorld(true);
  const all = new THREE.Box3();
  const boxes = {};
  for (const id of order) if (parts[id]) { boxes[id] = localBox(group, parts[id]); all.union(boxes[id]); }
  const ardAt = findArduino(group, parts);
  tracker.setBuildProgress?.(buildNow);

  let lastBuild = 0, lastBox = all;
  const steps = STEPS.map(st => {
    const ids = st.ids.filter(id => boxes[id] && !boxes[id].isEmpty());
    const box = st.wide ? all.clone() : ids.reduce((b, id) => b.union(boxes[id]), new THREE.Box3());
    const idx = Math.max(-1, ...ids.map(id => order.indexOf(id)));
    const build = st.wide ? 1 : idx >= 0 ? (idx + 1) / order.length : lastBuild;
    const b = box.isEmpty() ? lastBox : box;
    lastBuild = build; lastBox = b;
    const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    const r = Math.max(3.2, 0.5 * Math.hypot(s.x, s.y, s.z));
    return { ...st, ids, build, focus: [c.x, c.y, c.z], r, top: b.max.y };
  });
  return { steps, ardAt };
}

// Camera spec for ctx.look (scale-1 arrays; the stage multiplies by the tracker's scale).
// The camera aims (up + 0.09) * distance under the part, so the part shows in the upper half,
// above the sentences. The orbit limits keep the look-at point above the ground, so when that
// point would be under it, it slides along the same line of sight up to the ground instead (same
// picture). The stage aims 0.09 * distance lower than the target it gets: that is added back.
const STAGE_DROP = 0.09, FLOOR = 0.5, MIN_AIM = 20;
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export function viewFor(step) {
  const d = norm(step.dir), f = step.focus, dist = Math.max(16, step.r * (step.k || 4.2)), up = step.up ?? 0.05;
  const pos = f.map((x, i) => x + d[i] * dist);
  let aim = [f[0], f[1] - (up + STAGE_DROP) * dist, f[2]];
  if (aim[1] < FLOOR) {
    const ray = aim.map((x, i) => x - pos[i]), len = Math.hypot(...ray);
    const s = Math.max((FLOOR - pos[1]) / ray[1], MIN_AIM / len);   // ray[1] < 0: the camera looks down
    aim = pos.map((x, i) => x + ray[i] * s);
  }
  const target = aim.slice();
  for (let i = 0; i < 5; i++) target[1] = aim[1] + STAGE_DROP * dist3(pos, target);
  return { pos, target, dist };
}

// The tracker's group, reached through the guarded scene (THREE objects pass through untouched).
export const trackerGroup = ctx => ctx.scene.tracker.group;

// Add a story object to the tracker group so it scales and moves with it. ctx.add registers it,
// so the stage removes it when the chapter ends.
export function attach(ctx, obj, parent) {
  ctx.add(obj);
  (parent || trackerGroup(ctx)).add(obj);
  return obj;
}

// The name tag above a part: size is the text height in cm at scale 1, so it grows with the
// camera distance and looks the same size on screen in every step.
export function partTag(ctx, text, at, size) {
  const t = tag(text, { size, dot: "#f59e0b" });
  t.position.set(...at);
  t.userData.fade(0);
  return attach(ctx, t);
}
