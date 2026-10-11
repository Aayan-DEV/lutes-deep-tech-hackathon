// More story extras: a fixed panel to compare against, energy bars that grow, and two birds that
// circle over the desert at dawn. All at scale 1 (the chapters scale the groups by S).

const T = () => window.THREE;
const rad = d => d * Math.PI / 180;

// A fixed panel on a post, facing the equator and tilted by the latitude (the usual way).
// glow(f) shows how much light it catches (0..1), soil(kind, a) covers it with dust, snow or water.
// normal is its facing direction.
export function fixedPanel(lat) {
  const THREE = T(), g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.5, metalness: 0.5 });
  const frame = new THREE.MeshStandardMaterial({ color: 0xd6d6d6, roughness: 0.5, metalness: 0.3 });
  const cell = new THREE.MeshStandardMaterial({ color: 0x24406e, roughness: 0.3, metalness: 0.25, emissive: 0xf59e0b, emissiveIntensity: 0 });
  const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
  add(new THREE.CylinderGeometry(4.2, 4.6, 1.0, 24), metal, 0, 0.5, 0);
  add(new THREE.CylinderGeometry(0.55, 0.65, 10, 12), metal, 0, 6, 0);
  const tiltG = new THREE.Group(); tiltG.position.y = 11; tiltG.rotation.x = rad(lat); g.add(tiltG);
  add(new THREE.BoxGeometry(10.6, 0.45, 10.6), frame, 0, 0, 0, tiltG);
  add(new THREE.BoxGeometry(9.8, 0.14, 9.8), cell, 0, 0.27, 0, tiltG);
  g.userData.normal = { x: 0, y: Math.cos(rad(lat)), z: Math.sin(rad(lat)) };
  g.userData.glow = f => { cell.emissiveIntensity = 0.5 * f * f; };
  // soil(kind 'dust' | 'snow' | 'water', 0..1): a layer that covers the cells
  const coverMat = new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.95, transparent: true, opacity: 0, depthWrite: false });
  const cover = add(new THREE.BoxGeometry(9.8, 0.12, 9.8), coverMat, 0, 0.4, 0, tiltG);
  cover.castShadow = false; cover.visible = false;
  const COVER = { dust: 0xc9a46a, snow: 0xf4f6f9, water: 0x7fa6c4 };
  g.userData.soil = (kind, a) => {
    a = Math.max(0, Math.min(1, a || 0));
    coverMat.color.setHex(COVER[kind] || COVER.dust);
    coverMat.opacity = kind === "water" ? 0.35 * a : 0.97 * Math.min(1, a * 1.15);
    cover.scale.y = kind === "snow" ? 1 + 6 * a : 1;
    cover.position.y = 0.4 + (cover.scale.y - 1) * 0.06;
    cover.visible = a > 0.01;
  };
  return g;
}

// Bars that grow to show energy, on a light base plate. grow(u) for 0..1, tops() for the tags.
export function energyBars(values, { maxH = 40, colors = [0xf59e0b, 0x9a9a9a], gap = 16, w = 10 } = {}) {
  const THREE = T(), g = new THREE.Group(), top = Math.max(...values, 1e-6);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(gap * (values.length - 1) + w + 8, 0.8, w + 8),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 }));
  plate.position.set(gap * (values.length - 1) / 2, 0.4, 0); plate.receiveShadow = plate.castShadow = true; g.add(plate);
  const bars = values.map((v, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1, w).translate(0, 0.5, 0),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.45, metalness: 0.05 }));
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.6, w + 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
    m.position.set(i * gap, 0.8, 0); m.castShadow = true; m.scale.y = 0.001; g.add(m);
    cap.position.set(i * gap, 0.8, 0); cap.castShadow = true; g.add(cap);
    return { m, cap, h: maxH * v / top };
  });
  g.userData.grow = u => bars.forEach(b => { const h = Math.max(0.001, b.h * u); b.m.scale.y = h; b.cap.position.y = 0.8 + h + 0.3; });
  g.userData.tops = () => bars.map(b => ({ x: b.m.position.x, y: 0.8 + b.m.scale.y }));
  return g;
}

// Two birds circling high up. frame(dt) flaps and moves them.
export function birds(n = 2) {
  const THREE = T(), g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.9, side: THREE.DoubleSide });
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -1.2, 0, 0, 1.4, 7, 0.4, 0.6, 0, 0, -1.2, 7, 0.4, 0.6, 8.5, 0.6, -0.6], 3));
  wingGeo.computeVertexNormals();
  const list = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6).scale(1, 0.8, 3.2), mat);
    const wl = new THREE.Mesh(wingGeo, mat), wr = new THREE.Mesh(wingGeo, mat);
    wr.scale.x = -1;
    b.add(bodyM, wl, wr); g.add(b);
    list.push({ b, wl, wr, r: 120 + i * 45, h: 95 + i * 18, a: i * 2.4, sp: 0.22 - i * 0.04, ph: i * 1.3 });
  }
  g.userData.frame = (dt, t) => {
    for (const s of list) {
      s.a += s.sp * dt;
      const x = Math.cos(s.a) * s.r, z = Math.sin(s.a) * s.r - 60;
      s.b.position.set(x, s.h + Math.sin(t * 0.7 + s.ph) * 4, z);
      s.b.rotation.set(0, -s.a, 0.25);
      const flap = Math.sin(t * 7 + s.ph) * (0.5 + 0.5 * Math.max(0, Math.sin(t * 0.6 + s.ph)));
      s.wl.rotation.z = flap * 0.6; s.wr.rotation.z = -flap * 0.6;
    }
  };
  return g;
}
