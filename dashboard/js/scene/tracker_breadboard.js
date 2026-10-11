// Half-size breadboard (8.3 x 5.5 cm, 400 holes) and the jumper wires on the base.
// The breadboard is one textured box (holes, centre channel, red and blue power rails with + and -,
// row numbers and letters). The jumpers are bent tubes that all share one material (1 draw call).
// Board frame: u (cm) from the -x edge, v (cm) from the -z edge; holes 0.254 cm apart.
import { createKit, uvFace, wire } from "./tracker_kit.js";

export const BL = 8.3, BW = 5.5, BH = 0.85, PITCH = 0.254;
const S = 1024 / BL;
const ROWS = { a: 1.353, b: 1.607, c: 1.861, d: 2.115, e: 2.369, f: 3.131, g: 3.385, h: 3.639, i: 3.893, j: 4.147 };
const RAILS = { topPlus: 0.48, topMinus: 0.734, botMinus: 4.766, botPlus: 5.02 };
const colU = c => 0.467 + c * PITCH;                       // terminal columns 0..29 (printed 1..30)
const railU = k => 0.6 + (k + Math.floor(k / 5)) * PITCH;  // rail holes 0..24, in groups of 5

// A hole in the board's local frame (origin at the board's middle, top at y = BH / 2).
export function holeAt(row, k) {
  const v = ROWS[row] != null ? ROWS[row] : RAILS[row], u = ROWS[row] != null ? colU(k) : railU(k);
  return [u - BL / 2, BH / 2, v - BW / 2];
}

let tex = null;
function boardTexture() {
  if (tex) return tex;
  const THREE = window.THREE, cv = document.createElement("canvas"); cv.width = 1024; cv.height = Math.round(BW * S);
  const c = cv.getContext("2d"), P = x => x * S;
  c.fillStyle = "#f3f1ea"; c.fillRect(0, 0, cv.width, cv.height);
  const sh = c.createLinearGradient(0, P(2.6), 0, P(2.9));                                  // the centre channel
  sh.addColorStop(0, "#c9c5ba"); sh.addColorStop(0.5, "#e2ded4"); sh.addColorStop(1, "#d6d2c8");
  c.fillStyle = sh; c.fillRect(P(0.15), P(2.62), P(BL - 0.3), P(0.26));
  c.fillStyle = "#e4e1d8"; c.fillRect(0, P(1.05), cv.width, P(0.05)); c.fillRect(0, P(4.45), cv.width, P(0.05));   // rail grooves
  const hole = (u, v) => {
    c.fillStyle = "#9c988f"; c.fillRect(P(u - 0.06), P(v - 0.06), P(0.12), P(0.12));
    c.fillStyle = "#26241f"; c.fillRect(P(u - 0.04), P(v - 0.04), P(0.08), P(0.08));
  };
  for (let k = 0; k < 30; k++) for (const v of Object.values(ROWS)) hole(colU(k), v);
  for (let k = 0; k < 25; k++) for (const v of Object.values(RAILS)) hole(railU(k), v);
  // rail lines and marks
  const line = (v, col) => { c.fillStyle = col; c.fillRect(P(0.45), P(v - 0.02), P(BL - 0.9), P(0.04)); };
  line(0.27, "#d83a34"); line(0.94, "#2f62c9"); line(4.56, "#2f62c9"); line(5.23, "#d83a34");
  c.textAlign = "center"; c.textBaseline = "middle"; c.font = `700 ${Math.round(P(0.2))}px Inter, Helvetica, sans-serif`;
  for (const u of [0.25, BL - 0.25]) {
    c.fillStyle = "#d83a34"; c.fillText("+", P(u), P(0.27)); c.fillText("+", P(u), P(5.23));
    c.fillStyle = "#2f62c9"; c.fillText("-", P(u), P(0.94)); c.fillText("-", P(u), P(4.56));
  }
  c.fillStyle = "#77746c"; c.font = `600 ${Math.round(P(0.12))}px Inter, Helvetica, sans-serif`;
  for (const n of [1, 5, 10, 15, 20, 25, 30]) { c.fillText(String(n), P(colU(n - 1)), P(1.17)); c.fillText(String(n), P(colU(n - 1)), P(4.33)); }
  for (const [r, v] of Object.entries(ROWS)) { c.fillText(r, P(0.22), P(v)); c.fillText(r, P(BL - 0.22), P(v)); }
  tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8;
  return tex;
}

export function buildBreadboard() {
  const THREE = window.THREE, g = new THREE.Group(), k = createKit();
  const m = new THREE.MeshStandardMaterial({ map: boardTexture(), roughness: 0.7 });
  k.rbox(m, BL, BH, BW, 0.08, [0, 0, 0], null, geo => uvFace(geo, "y", BL, BW, { u0: 0.001, v0: 0.999 }));
  k.build(g);
  return g;
}

// A jumper from a to b ([x,y,z] hole tops): straight up out of each hole, a bow in between.
export function jumper(a, b, color, { lift = 1, side = [0, 0, 0], r = 0.05 } = {}) {
  const up = 0.45, mid = [(a[0] + b[0]) / 2 + side[0], Math.max(a[1], b[1]) + up + lift + side[1], (a[2] + b[2]) / 2 + side[2]];
  return wire([[a[0], a[1] - 0.12, a[2]], [a[0], a[1] + up, a[2]], mid, [b[0], b[1] + up, b[2]], [b[0], b[1] - 0.12, b[2]]], r, color);
}

// All the static wires on the base, in the tracker's frame. ard(strip, k) and bb(row, k) give
// a pin or hole position. Returns geometries for one vertex-coloured mesh. (The cable to the pipe
// is in tracker_wires.js.)
export function baseJumpers(ard, bb) {
  const RED = 0xd32f2f, BLACK = 0x222222, YELLOW = 0xf2c230, ORANGE = 0xf08a24;
  return [
    jumper(ard("power", 4), bb("botPlus", 20), RED, { lift: 0.9, side: [0.5, 0, 0] }),           // 5 V to the + rail
    jumper(ard("power", 5), bb("botMinus", 21), BLACK, { lift: 0.8, side: [0.75, 0, 0] }),       // GND to the - rail
    jumper(ard("digitalHigh", 8), bb("j", 21), YELLOW, { lift: 0.25 }),                          // pin 9: big motor signal
    jumper(ard("digitalHigh", 7), bb("j", 17), ORANGE, { lift: 0.3 }),                           // pin 10: small motor signal
  ];
}
