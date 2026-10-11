// Geometry helpers for the tracker model (units: cm). A "kit" collects pieces per material and
// merges them into one mesh per material, so a whole part costs a few draw calls, not dozens.
// Also: rounded boxes, UV tricks for printed tops, and bent wires with vertex colours.
const T = () => window.THREE;

// Put every UV of a geometry on one spot of its texture (a plain colour area of an atlas).
export function uvSolid(geo, u = 0.01, v = 0.01) {
  const uv = geo.attributes.uv;
  if (uv) for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
  return geo;
}

// Faces that point along `axis` ('y', 'z' or '-z' ...) get the whole texture, laid out by the local
// position (canvas left = -x, canvas top = -z for 'y'; canvas top = +y for 'z'). Other faces get
// the solid spot (u0, v0).
// both: the opposite face gets the texture too (seen from its own side).
export function uvFace(geo, axis, w, h, { u0 = 0.004, v0 = 0.996, repeatU = 1, both = false } = {}) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  const a = axis.replace("-", "");
  for (let i = 0; i < p.count; i++) {
    const nv = a === "y" ? n.getY(i) : a === "z" ? n.getZ(i) : n.getX(i);
    const sign = both ? Math.sign(nv) || 1 : axis[0] === "-" ? -1 : 1;
    if (nv * sign < 0.98) { uv.setXY(i, u0, v0); continue; }
    if (a === "y") uv.setXY(i, ((p.getX(i) + w / 2) / w) * repeatU, 1 - (p.getZ(i) + h / 2) / h);
    else if (a === "z") uv.setXY(i, (sign * p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
    else uv.setXY(i, (-sign * p.getZ(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  }
  return geo;
}

export function uvScale(geo, s) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s);
  return geo;
}

// A box with rounded edges and corners, centred on the origin.
export function roundedBox(w, h, d, r = 0.1, seg = 2) {
  const THREE = T(), b = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const s = new THREE.Shape(), x = w / 2 - b, y = h / 2 - b;
  s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.lineTo(-x, -y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: seg, curveSegments: 4 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return g;
}

// A rounded rectangle shape (x0..x1, y0..y1) with corner radius r, for flat parts with holes.
export function roundRectShape(x0, y0, x1, y1, r) {
  const s = new (T().Shape)();
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r);
  s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1); s.lineTo(x0 + r, y1);
  s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}
export function circlePath(x, y, r) { const p = new (T().Path)(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p; }

// A flat plate from a shape, lying in the x-z plane (shape y becomes -z), from y = 0 up to y = t.
export function plate(shape, t, bevel = 0) {
  const g = new (T().ExtrudeGeometry)(shape, { depth: t - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0);
  return g;
}

// One bent wire along points [[x,y,z], ...] with its colour baked in (all wires share 1 material).
export function wire(points, r, color, { seg = 44, radial = 6 } = {}) {
  const THREE = T();
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, "centripetal");
  const g = new THREE.TubeGeometry(curve, seg, r, radial, false);
  const c = new THREE.Color(color), n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}
// A flat ribbon of wires side by side: the same path shifted by `step` ([dx,dy,dz]) per wire.
export function ribbon(points, colors, step, r) {
  const mid = (colors.length - 1) / 2;
  return colors.map((c, i) => wire(points.map(p => [p[0] + step[0] * (i - mid), p[1] + step[1] * (i - mid), p[2] + step[2] * (i - mid)]), r, c));
}

// Merge geometries (any mix of indexed and not) into one, keeping position, normal, uv and colour.
export function mergeGeos(list) {
  const THREE = T(), parts = list.map(g => (g.index ? g.toNonIndexed() : g));
  const n = parts.reduce((s, g) => s + g.attributes.position.count, 0), hasCol = parts.some(g => g.attributes.color);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = hasCol ? new Float32Array(n * 3).fill(1) : null;
  let o = 0;
  for (const g of parts) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array.subarray(0, c * 3), o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array.subarray(0, c * 3), o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array.subarray(0, c * 2), o * 2);
    if (col && g.attributes.color) col.set(g.attributes.color.array.subarray(0, c * 3), o * 3);
    o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  list.forEach(g => g.dispose());
  return out;
}

// Collect pieces, then build(parent) makes one mesh per material.
// at: [x, y, z]; rot: [rx, ry, rz] in radians (applied before the move).
export function createKit() {
  const THREE = T(), bins = new Map(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  const kit = {
    add(mat, geo, at = [0, 0, 0], rot = null) {
      if (rot) q.setFromEuler(e.set(rot[0] || 0, rot[1] || 0, rot[2] || 0)); else q.identity();
      geo.applyMatrix4(m4.compose(v.set(at[0], at[1], at[2]), q, one));
      if (!bins.has(mat)) bins.set(mat, []);
      bins.get(mat).push(geo);
      return kit;
    },
    box(mat, w, h, d, at, rot, uvFn) { const g = new THREE.BoxGeometry(w, h, d); if (uvFn) uvFn(g); return kit.add(mat, g, at, rot); },
    rbox(mat, w, h, d, r, at, rot, uvFn) { const g = roundedBox(w, h, d, r); if (uvFn) uvFn(g); return kit.add(mat, g, at, rot); },
    // a cylinder along y (rot turns it), rTop for cones, seg for the roundness
    cyl(mat, r, h, at, rot, seg = 24, rTop = r, uvFn) { const g = new THREE.CylinderGeometry(rTop, r, h, seg); if (uvFn) uvFn(g); return kit.add(mat, g, at, rot); },
    build(parent, { cast = true, receive = true } = {}) {
      const out = [];
      for (const [mat, geos] of bins) {
        const m = new THREE.Mesh(mergeGeos(geos), mat);
        m.castShadow = cast; m.receiveShadow = receive; parent.add(m); out.push(m);
      }
      bins.clear();
      return out;
    },
  };
  return kit;
}
