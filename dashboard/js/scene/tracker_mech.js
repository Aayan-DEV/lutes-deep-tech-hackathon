// The mechanical parts as they are really built (units: cm). From the bottom up:
// two solid wood blocks on the base, left and right of the big motor; a UHMW plate on the blocks
// with a round hole over the motor's horn; a metal pipe from the horn up through the hole; a
// thicker UHMW block on the pipe that turns with the motor (the spinner, the lower plate is its
// low-friction bearing); two printed holders on the spinner and the metal rod through them (the
// tilt axis). All heights are in the tracker's frame: the base top is at y = BASE_TOP.
import { createKit, roundRectShape, circlePath, plate, uvScale } from "./tracker_kit.js";

export const BASE_TOP = 2.4;
export const MOTOR_Y = BASE_TOP + 0.25;              // the MG996R's own frame (its body bottom sits on the base)
export const HORN_TOP = MOTOR_Y + 3.58;              // top face of the big motor's round horn
export const BLOCK = { w: 5, d: 5, h: 6, x: 3.9 };   // the two wood blocks, centred at x = +-3.9
export const PLATE = { w: 14, d: 9, t: 1, y: BASE_TOP + 6, hole: 0.9 };   // the UHMW plate (bottom y)
export const PIPE = { r: 0.6, wall: 0.12 };
export const SPIN = { w: 12, d: 8, t: 3, y: PLATE.y + PLATE.t + 0.1 };     // the spinner (bottom y)
export const SPIN_TOP = SPIN.y + SPIN.t;
export const PIPE_TOP = SPIN_TOP + 0.5;
export const HOLDER = { x: 5.4, t: 1, w: 2, base: 3.2, h: 9, hole: 8 };     // centre x, thickness (x), width (z) at the top and the bottom
// The rod sits 8 above the spinner: the wooden plate (half 6.5, 1.9 from the rod at its far face)
// then clears the spinner at full tilt both ways (0 and 180).
export const PIVOT_Y = SPIN_TOP + HOLDER.hole;       // the rod's axis
export const ROD = { r: 0.4, x0: -6.4, x1: 6.45 };   // the rod's ends (x1 meets the SG-90 horn)

// The two blocks: solid wood, a little rounded, the grain running up.
export function buildBlocks(part, M) {
  const k = createKit(), { w, d, h, x } = BLOCK;
  for (const sx of [-x, x]) k.rbox(M.wood, h, w, d, 0.12, [sx, BASE_TOP + h / 2, 0], [0, 0, Math.PI / 2], g => uvScale(g, 1 / 9));
  k.build(part);
}

// The lower UHMW plate: 14 x 9 x 1 with the round hole for the pipe, 4 screws into the blocks.
export function buildPlate(part, M) {
  const k = createKit(), { w, d, t, y, hole } = PLATE;
  const s = roundRectShape(-w / 2, -d / 2, w / 2, d / 2, 0.35);
  s.holes.push(circlePath(0, 0, hole));
  k.add(M.uhmw, plate(s, t, 0.06), [0, y, 0]);
  for (const sx of [-6.5, 6.5]) for (const sz of [-1.5, 1.5]) k.cyl(M.metal, 0.16, 0.06, [sx, y + t + 0.03, sz], null, 12);
  k.cyl(M.black, 0.9, 0.02, [0, y + t - 0.005, 0], null, 32);   // the shadow in the hole, so it reads as a hole from far
  k.build(part);
}

// The metal pipe: a printed adapter screwed to the horn, the pipe (hollow, open on top) and a
// set collar on top of the spinner. Lives in the pan group, so it turns with the motor.
export function buildPipe(part, M) {
  const THREE = window.THREE, k = createKit(), { r, wall } = PIPE, y0 = HORN_TOP + 0.45;
  const ri = r - wall, len = PIPE_TOP - y0;
  k.add(M.metal, new THREE.CylinderGeometry(r, r, len, 28, 1, true), [0, y0 + len / 2, 0]);
  k.add(M.metal, new THREE.RingGeometry(ri, r, 28), [0, PIPE_TOP, 0], [-Math.PI / 2, 0, 0]);
  k.add(M.metal, inside(new THREE.CylinderGeometry(ri, ri, 0.6, 28, 1, true)), [0, PIPE_TOP - 0.3, 0]);
  k.cyl(M.print, 0.85, 0.45, [0, HORN_TOP + 0.225, 0], null, 28);               // the horn adapter
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; k.cyl(M.metal, 0.09, 0.05, [Math.cos(a) * 0.62, HORN_TOP + 0.47, Math.sin(a) * 0.62], null, 8); }
  k.cyl(M.metal, 0.95, 0.35, [0, SPIN_TOP + 0.175, 0], null, 28);              // set collar on the spinner
  k.cyl(M.black, 0.12, 0.2, [0.95, SPIN_TOP + 0.2, 0], [0, 0, Math.PI / 2], 8);  // its screw
  k.cyl(M.black, r - wall, 0.02, [0, PIPE_TOP - 0.25, 0], null, 20);           // dark inside the open top
  k.build(part);
}

// A tube seen from the inside: reverse the faces and the normals.
function inside(g) {
  const idx = g.index.array, n = g.attributes.normal.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return g;
}

// The spinner: the upper UHMW block (12 x 8 x 3), with a black mark on the front (+z).
export function buildSpinner(part, M) {
  const k = createKit(), { w, d, t, y } = SPIN;
  k.rbox(M.uhmw, w, t, d, 0.1, [0, y + t / 2, 0]);
  k.box(M.black, 0.4, 0.04, 1.4, [0, SPIN_TOP + 0.02, d / 2 - 0.9]);
  k.build(part);
}

// The two printed holders: a tall upright, wider at the bottom, with a round top and the rod's
// hole, on a wide foot with 4 screws (the foot sits on the inner side, inside the spinner's edge).
export function buildHolders(part, M) {
  const THREE = window.THREE, k = createKit(), { x, t, w, base, h, hole } = HOLDER, top = h - w / 2;
  for (const sx of [-x, x]) {
    const s = new THREE.Shape();
    s.moveTo(-base / 2, 0); s.lineTo(base / 2, 0); s.lineTo(w / 2, top); s.absarc(0, top, w / 2, 0, Math.PI, false); s.lineTo(-base / 2, 0);
    s.holes.push(circlePath(0, hole, ROD.r + 0.05));
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1, curveSegments: 16 });
    g.translate(0, 0, -t / 2); g.rotateY(Math.PI / 2);
    k.add(M.print, g, [sx, SPIN_TOP, 0]);
    const fx = sx - Math.sign(sx) * 0.5;   // the foot reaches inward
    k.rbox(M.print, 2.0, 0.4, 4.2, 0.08, [fx, SPIN_TOP + 0.2, 0]);
    for (const dx of [-0.55, 0.55]) for (const sz of [-1.85, 1.85]) k.cyl(M.metal, 0.14, 0.06, [fx + dx, SPIN_TOP + 0.43, sz], null, 10);
  }
  k.build(part);
}

// The rod (the tilt axis) through both holders, with a collar on the far (-x) end.
export function buildRod(part, M) {
  const k = createKit(), { r, x0, x1 } = ROD;
  k.cyl(M.steel, r, x1 - x0, [(x0 + x1) / 2, 0, 0], [0, 0, Math.PI / 2], 20);
  k.cyl(M.steel, 0.62, 0.3, [x0 + 0.25, 0, 0], [0, 0, Math.PI / 2], 20);
  k.build(part);
}
