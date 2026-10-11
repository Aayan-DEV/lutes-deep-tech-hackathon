// Geometry helpers for the story people (and their small props): smooth capsules, ellipsoids and
// rings, all merged into one BufferGeometry per person with a colour and a bone per vertex.
// One merged, skinned mesh per person keeps it to one draw call (plus one for its shadow).

const T = () => window.THREE;

// A capsule hanging down from y = 0 to y = -len (rounded ends). r1 at the top, r2 at the bottom.
export function capsule(r1, r2, len, radial = 12, cap = 5) {
  const THREE = T(), pts = [];
  for (let i = 0; i <= cap; i++) { const a = -Math.PI / 2 + (i / cap) * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-3, Math.cos(a) * r2), -len + Math.sin(a) * r2)); }
  for (let i = 1; i <= cap; i++) { const a = (i / cap) * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-3, Math.cos(a) * r1), Math.sin(a) * r1)); }
  return new THREE.LatheGeometry(pts, radial);
}

// A lathe from [radius, y] pairs (bottom to top), closed at both ends.
export function lathe(profile, radial = 14) {
  const THREE = T();
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(1e-3, r), y)), radial);
}

export function ellipsoid(rx, ry, rz, w = 14, h = 10, thetaLen = Math.PI) {
  const g = new (T().SphereGeometry)(1, w, h, 0, Math.PI * 2, 0, thetaLen);
  g.scale(rx, ry, rz);
  return g;
}

export function cylinder(rTop, rBottom, h, radial = 14, open = false) {
  return new (T().CylinderGeometry)(rTop, rBottom, h, radial, 1, open);
}

// Collects parts { geo, color, bone, pos, rot, scale } and merges them.
export function createMerger() {
  const THREE = T(), parts = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  return {
    // add(geo, color, { at: [x,y,z], rot: [x,y,z], scale: [x,y,z], bone })
    add(geo, color, { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], bone = 0 } = {}) {
      e.set(rot[0], rot[1], rot[2]); q.setFromEuler(e);
      m.compose(new THREE.Vector3(...at), q, new THREE.Vector3(...scale));
      const g = geo.clone(); g.applyMatrix4(m);
      parts.push({ g, color: new THREE.Color(color), bone });
      geo.dispose && geo !== g && geo.dispose();
      return this;
    },
    // Merge into one geometry. skinned: adds skinIndex / skinWeight (one bone per part).
    build({ skinned = false } = {}) {
      let nv = 0, ni = 0;
      for (const p of parts) { nv += p.g.attributes.position.count; ni += p.g.index ? p.g.index.count : p.g.attributes.position.count; }
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
      const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      const si = skinned ? new Uint16Array(nv * 4) : null, sw = skinned ? new Float32Array(nv * 4) : null;
      let vo = 0, io = 0;
      for (const p of parts) {
        const P = p.g.attributes.position, N = p.g.attributes.normal, n = P.count;
        pos.set(P.array, vo * 3);
        if (N) nor.set(N.array, vo * 3);
        for (let k = 0; k < n; k++) {
          col[(vo + k) * 3] = p.color.r; col[(vo + k) * 3 + 1] = p.color.g; col[(vo + k) * 3 + 2] = p.color.b;
          if (skinned) { si[(vo + k) * 4] = p.bone; sw[(vo + k) * 4] = 1; }
        }
        if (p.g.index) { const I = p.g.index.array; for (let k = 0; k < I.length; k++) idx[io + k] = I[k] + vo; io += I.length; }
        else { for (let k = 0; k < n; k++) idx[io + k] = vo + k; io += n; }
        vo += n;
        p.g.dispose();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      if (skinned) { g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4)); }
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.computeBoundingSphere();
      parts.length = 0;
      return g;
    },
  };
}

let propMat = null;
// One shared material for small held props (vertex colours, not skinned).
export function propMaterial() {
  if (!propMat) propMat = new (T().MeshStandardMaterial)({ vertexColors: true, roughness: 0.6, metalness: 0.1 });
  return propMat;
}

// Small things people hold. Each is one mesh. Built in the hand's frame: the hand points down
// (-y) and the palm faces forward (+z), so "pointing forward" is along +z.
export function makeProp(kind) {
  const THREE = T(), mg = createMerger();
  if (kind === "screwdriver") {
    mg.add(capsule(0.2, 0.22, 1.1, 10, 3), 0xf59e0b, { rot: [Math.PI / 2, 0, 0], at: [0, 0, -0.2] });
    mg.add(cylinder(0.06, 0.06, 1.2, 6), 0xb9bec6, { rot: [Math.PI / 2, 0, 0], at: [0, 0, 1.4] });
  } else if (kind === "tablet") {
    mg.add(new THREE.BoxGeometry(2.6, 0.14, 1.9), 0x2b2f36, {});
    mg.add(new THREE.BoxGeometry(2.3, 0.04, 1.6), 0x7fb2d9, { at: [0, 0.08, 0] });
    mg.add(new THREE.BoxGeometry(0.9, 0.05, 0.12), 0xf59e0b, { at: [-0.4, 0.11, 0.45] });
  } else if (kind === "clipboard") {
    mg.add(new THREE.BoxGeometry(2.0, 0.1, 2.6), 0x9a6a3a, {});
    mg.add(new THREE.BoxGeometry(1.7, 0.04, 2.1), 0xf8f6f0, { at: [0, 0.07, -0.1] });
    mg.add(new THREE.BoxGeometry(0.8, 0.18, 0.25), 0xb9bec6, { at: [0, 0.1, 1.15] });
  } else if (kind === "crate") {
    mg.add(new THREE.BoxGeometry(5.2, 3.6, 4.2), 0xb07c45, {});
    for (const y of [-1.2, 1.2]) mg.add(new THREE.BoxGeometry(5.35, 0.5, 4.35), 0x8f5f31, { at: [0, y, 0] });
    mg.add(new THREE.BoxGeometry(2.2, 0.8, 0.05), 0x2b2f36, { at: [0, 0, 2.13] });
  } else if (kind === "panelBox") {   // a flat box with the solar panel inside
    mg.add(new THREE.BoxGeometry(6.4, 1.2, 6.4), 0xd2b48c, {});
    mg.add(new THREE.BoxGeometry(4, 0.05, 4), 0x24406e, { at: [0, 0.62, 0] });
  }
  const mesh = new THREE.Mesh(mg.build(), propMaterial());
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
