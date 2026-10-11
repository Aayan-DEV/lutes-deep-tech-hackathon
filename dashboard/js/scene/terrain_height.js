// Ground height for each desert, in cm (1 unit = 1 cm, +x east, +z south, +y up).
// Pure functions, no three.js: the mesh, the props and other modules all ask the same function,
// so things sit on the ground exactly. The ground is flat within 60 cm of the origin (the tracker).

export const FLAT_R = 60;          // flat pad radius around the tracker
export const TERRAIN_R = 8000;     // the ground mesh reaches 80 m; the sky and the horizon do the rest

export const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

// Value noise: a random number at each integer grid point, smoothly blended in between. 0..1.
function hash(ix, iy, seed) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export function vnoise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return mix(mix(a, b, ux), mix(c, d, ux), uy);
}
// A few octaves of noise added together (bigger shapes plus smaller detail). Still about 0..1.
export function fbm(x, y, oct = 3, seed = 0) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x, y, seed + i * 17); n += a; x = x * 2.03 + 3.1; y = y * 2.03 - 1.7; a *= 0.5; }
  return s / n;
}

// Cholistan: flat to gently rolling, with the odd low dune and a very flat far horizon.
function cholistan(x, z, r) {
  const m = smooth(FLAT_R, 220, r);
  const u = x * 0.6 - z * 0.8, v = x * 0.8 + z * 0.6;           // along / across the wind
  const roll = (fbm(x / 1900, z / 1900, 3, 1) - 0.5) * mix(14, 140, smooth(200, 3000, r));
  const dn = vnoise(u / 1100 + 9.3, v / 2200, 4);                 // low dunes, long across the wind
  const dune = Math.pow(smooth(0.58, 0.92, dn), 1.6) * 180 * smooth(350, 1600, r);
  const near = (vnoise(x / 140, z / 140, 6) - 0.5) * 5;          // small bumps you see next to the tracker
  const far = 1 - 0.55 * smooth(4500, 8000, r);                  // keep the horizon flat
  return m * (roll + dune + near) * far;
}

// Thar: big transverse dunes. Crests run across the wind; a long gentle windward side and a short
// steep slip face on the lee side. Small near the tracker, metres tall further out.
function thar(x, z, r) {
  const m = smooth(FLAT_R, 260, r);
  const u = x * 0.7 - z * 0.7, v = x * 0.7 + z * 0.7;            // u along the wind, v along the crests
  const warp = (vnoise(v / 3200, u / 5000, 2) - 0.5) * 2600 + (vnoise(x / 900, z / 900, 3) - 0.5) * 520;
  const t = (((u + warp) / 3600) % 1 + 1) % 1;
  const c = 0.64;                                                // crest position in the cycle
  const prof = t < c ? Math.pow(Math.sin(Math.PI / 2 * t / c), 2) : 1 - smooth(c, 1, t);
  const A = mix(30, 820, smooth(260, 3600, r)) * (0.5 + 0.5 * vnoise(v / 2600, u / 4200, 5));
  const small = (vnoise(u / 650, v / 380, 8) - 0.5) * mix(18, 60, smooth(100, 1500, r));
  const near = (vnoise(x / 160, z / 160, 6) - 0.5) * 6;
  return m * (A * prof + small + near);
}

// Gobi: a flat gravel plain with shallow dry washes, slowly rising toward the far mountains.
function gobi(x, z, r) {
  const m = smooth(FLAT_R, 200, r);
  const swell = (fbm(x / 2600, z / 2600, 3, 21) - 0.5) * 70 * smooth(150, 2200, r);
  const wy = z - 900 * Math.sin(x / 1700) - 400 * Math.sin(x / 640 + 1.3);   // a winding dry wash
  const wash = -22 * Math.exp(-((wy - 1400) ** 2) / (2 * 180 * 180)) * smooth(400, 1200, r);
  const near = (vnoise(x / 120, z / 120, 6) - 0.5) * 3;
  const rise = 220 * smooth(2500, 8000, r) * (0.6 + 0.4 * vnoise(x / 4000, z / 4000, 23));
  return m * (swell + wash + near + rise);
}

const FNS = { cholistan, thar, gobi };

// Height function for a region: (x, z) in cm, returns y in cm.
export function heightFn(id) {
  const f = FNS[id] || cholistan;
  return (x, z) => f(x, z, Math.hypot(x, z));
}
