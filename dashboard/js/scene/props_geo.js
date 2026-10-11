// Low-poly shapes for the desert props, each about 1 unit tall with its base at y = 0.
// They are scaled per instance (in cm) by props.js. Vertex colours carry shading inside a shape
// (darker at the base); the instance colour carries the plant or rock colour.

const ni = g => (g.index ? g.toNonIndexed() : g);
const rand = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

// Join several geometries into one (non-indexed), with a colour per vertex from colorAt(x, y, z).
function merge(parts, colorAt) {
  const pos = [], nor = [], col = [];
  for (const g0 of parts) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i));
      if (c) col.push(c.getX(i), c.getY(i), c.getZ(i));
      else { const v = colorAt(p.getX(i), p.getY(i), p.getZ(i)); col.push(v[0], v[1], v[2]); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}
const shadeByHeight = (lo, hi) => (x, y) => { const v = lo + (hi - lo) * Math.max(0, Math.min(1, y)); return [v, v, v]; };

// Bumpy stone with a flat underside. Same corner, same push, so the faces stay closed.
export function rockGeo(seed = 1) {
  const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
  const key = (x, y, z) => Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed) * 43758.5453;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = key(x.toFixed(3), y.toFixed(3), z.toFixed(3));
    const s = 0.8 + 0.4 * (k - Math.floor(k));
    p.setXYZ(i, x * s * 1.15, Math.max(-0.15, y * s * 0.7) + 0.15, z * s);
  }
  g.computeVertexNormals();
  return merge([g], shadeByHeight(0.8, 1.05));
}

// Rounded bush (kair, saxaul): a few lumpy blobs over a short dark stem.
export function bushGeo(seed = 3) {
  const r = rand(seed), parts = [];
  const stem = new THREE.CylinderGeometry(0.03, 0.05, 0.35, 5); stem.translate(0, 0.17, 0); parts.push(stem);
  for (let i = 0; i < 6; i++) {
    const b = new THREE.IcosahedronGeometry(0.28 + r() * 0.16, 0), a = r() * Math.PI * 2, d = i === 0 ? 0 : 0.18 + r() * 0.22;
    b.scale(1, 0.75 + r() * 0.2, 1);
    b.translate(Math.cos(a) * d, 0.42 + r() * 0.35 - d * 0.4, Math.sin(a) * d); parts.push(b);
  }
  return merge(parts, shadeByHeight(0.72, 1.1));
}

// Broom shrub (phog, khimp): a bunch of thin upright spikes leaning outward.
export function broomGeo(seed = 5) {
  const r = rand(seed), parts = [];
  for (let i = 0; i < 11; i++) {
    const h = 0.6 + r() * 0.4, c = new THREE.ConeGeometry(0.05 + r() * 0.04, h, 4, 1);
    c.translate(0, h / 2, 0);
    c.rotateZ((r() - 0.5) * 0.7); c.rotateY(r() * Math.PI * 2);
    c.translate((r() - 0.5) * 0.15, 0, (r() - 0.5) * 0.15); parts.push(c);
  }
  return merge(parts, shadeByHeight(0.6, 1.1));
}

// Grass tuft: thin blades fanning out from a point, each bending a little. Two-sided geometry.
export function tuftGeo(seed = 7) {
  const r = rand(seed), pos = [];
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, lean = 0.15 + r() * 0.55, h = 0.6 + r() * 0.4, w = 0.035 + r() * 0.02;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz * w, pz = dx * w;
    const mid = [dx * lean * 0.35 * h, h * 0.55, dz * lean * 0.35 * h], tip = [dx * lean * h, h, dz * lean * h];
    pos.push(-px, 0, -pz, px, 0, pz, mid[0] + px * 0.6, mid[1], mid[2] + pz * 0.6);
    pos.push(-px, 0, -pz, mid[0] + px * 0.6, mid[1], mid[2] + pz * 0.6, mid[0] - px * 0.6, mid[1], mid[2] - pz * 0.6);
    pos.push(mid[0] - px * 0.6, mid[1], mid[2] - pz * 0.6, mid[0] + px * 0.6, mid[1], mid[2] + pz * 0.6, ...tip);
  }
  // a back copy of every triangle (reversed order), so both sides draw with the same soft normals
  const n0 = pos.length;
  for (let i = 0; i < n0; i += 9) pos.push(pos[i], pos[i + 1], pos[i + 2], pos[i + 6], pos[i + 7], pos[i + 8], pos[i + 3], pos[i + 4], pos[i + 5]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  // normals mostly up: thin blades then light like a soft clump instead of flickering dark and light
  const nor = []; for (let i = 0; i < pos.length; i += 3) { const l = Math.hypot(pos[i], 2, pos[i + 2]); nor.push(pos[i] / l, 2 / l, pos[i + 2] / l); }
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return merge([g], shadeByHeight(0.6, 1.15));
}

// Desert tree (khejri, jand): a thin trunk and a flat, wide crown. Colours are baked in here
// (crown: the hex colour given), so the instance colour only adds a little variation.
export function treeGeo(crownHex = 0x6f7a48, seed = 9) {
  const cc = new THREE.Color(crownHex), r = rand(seed), parts = [], trunk = new THREE.CylinderGeometry(0.025, 0.045, 0.55, 5);
  trunk.translate(0, 0.275, 0); trunk.rotateZ(0.06);
  const brown = [0.42, 0.34, 0.26];
  const t2 = ni(trunk), tc = []; for (let i = 0; i < t2.attributes.position.count; i++) tc.push(...brown);
  t2.setAttribute("color", new THREE.Float32BufferAttribute(tc, 3)); parts.push(t2);
  for (let i = 0; i < 6; i++) {
    const b = new THREE.IcosahedronGeometry(0.2 + r() * 0.12, 0), a = r() * Math.PI * 2, d = 0.08 + r() * 0.28;
    b.scale(1.3, 0.55, 1.3); b.translate(Math.cos(a) * d, 0.6 + r() * 0.2, Math.sin(a) * d);
    const nb = ni(b), c = [];
    for (let k = 0; k < nb.attributes.position.count; k++) { const v = 0.75 + 0.3 * (nb.attributes.position.getY(k) - 0.5); c.push(v * cc.r, v * cc.g, v * cc.b); }
    nb.setAttribute("color", new THREE.Float32BufferAttribute(c, 3)); parts.push(nb);
  }
  return merge(parts, () => [1, 1, 1]);
}
