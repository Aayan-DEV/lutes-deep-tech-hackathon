// Story extras for "Closer to home" and "What comes next": a row of small low-poly houses with
// panels on their flat roofs, a wiper arm and a sprinkler head for the tracker, and a puff of water
// spray. All at scale 1 (1 unit = 1 cm next to the tracker; ctx.put scales the groups by S).

const T = () => window.THREE;
const rad = d => d * Math.PI / 180;
const WALLS = [0xe9d9bf, 0xe2cba8, 0xefe2cc];

function mesh(geo, mat, x, y, z, parent) {
  const o = new (T().Mesh)(geo, mat);
  o.position.set(x, y, z); o.castShadow = o.receiveShadow = true;
  parent.add(o);
  return o;
}

// One roof panel on a pivot: aim(dir) turns it to face a direction {x, y, z}, rest(lat) faces the
// equator at the latitude's tilt (the usual fixed way).
function roofPanel(mats) {
  const THREE = T(), yaw = new THREE.Group(), pitch = new THREE.Group();
  yaw.add(pitch);
  mesh(new THREE.BoxGeometry(9, 0.35, 6.4), mats.frame, 0, 0, 0, pitch);
  mesh(new THREE.BoxGeometry(8.4, 0.12, 5.8), mats.cell, 0, 0.22, 0, pitch);
  yaw.userData.aim = d => { yaw.rotation.y = Math.atan2(d.x, d.z); pitch.rotation.x = Math.acos(Math.max(-1, Math.min(1, d.y))); };
  yaw.userData.rest = lat => { yaw.rotation.y = 0; pitch.rotation.x = rad(lat); };
  yaw.userData.get = () => ({ y: yaw.rotation.y, x: pitch.rotation.x });
  yaw.userData.set = (y, x) => { yaw.rotation.y = y; pitch.rotation.x = x; };
  return yaw;
}

// A row of n houses along x, spaced `gap` apart, with 2 panels on each roof. rise(i, u) grows house
// i out of the ground (0..1); panels() lists every roof panel; glow(f) lights the cells.
export function houseRow(lat, n = 3, gap = 30) {
  const THREE = T(), g = new THREE.Group(), houses = [], panels = [];
  const mats = {
    frame: new THREE.MeshStandardMaterial({ color: 0xd6d6d6, roughness: 0.5, metalness: 0.3 }),
    cell: new THREE.MeshStandardMaterial({ color: 0x24406e, roughness: 0.3, metalness: 0.25, emissive: 0xf59e0b, emissiveIntensity: 0 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.9 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x33414f, roughness: 0.4, emissive: 0xffb45a, emissiveIntensity: 0.35 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xcdb48e, roughness: 0.9 }),
  };
  for (let i = 0; i < n; i++) {
    const h = new THREE.Group(), W = 22 + (i % 2) * 3, H = 13 + (i % 3) * 2.5, D = 18;
    const wall = new THREE.MeshStandardMaterial({ color: WALLS[i % WALLS.length], roughness: 0.95 });
    mesh(new THREE.BoxGeometry(W, H, D), wall, 0, H / 2, 0, h);
    mesh(new THREE.BoxGeometry(W + 0.8, 1.2, D + 0.8), mats.trim, 0, H + 0.6, 0, h);       // the parapet
    mesh(new THREE.BoxGeometry(4.2, 7.5, 0.4), mats.dark, -W / 4, 3.75, D / 2 + 0.1, h);   // the door
    mesh(new THREE.BoxGeometry(5, 3.6, 0.4), mats.glass, W / 4, H * 0.58, D / 2 + 0.1, h);  // a lit window
    for (const px of [-W / 4.2, W / 4.2]) {
      const p = roofPanel(mats);
      p.position.set(px, H + 3.2, 0);
      mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.6, 8), mats.frame, px, H + 1.9, 0, h);  // a short post
      p.userData.rest(lat);
      h.add(p); panels.push(p);
    }
    h.position.x = i * gap;
    h.scale.y = 0.001;
    g.add(h); houses.push(h);
  }
  g.userData.rise = (i, u) => { const h = houses[i]; if (h) { h.scale.y = Math.max(0.001, u); h.visible = u > 0.002; } };
  g.userData.panels = () => panels;
  g.userData.house = i => houses[i];
  g.userData.glow = f => { mats.cell.emissiveIntensity = 0.5 * f * f; };
  return g;
}

// A wiper arm that lies across the tracker's panel (the 9.5 cm cell) when the panel is flat:
// sweep(u) moves it from one edge to the other and back as u goes 0..1 (it repeats every 1).
export function wiper() {
  const THREE = T(), g = new THREE.Group();
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.8 });
  const arm = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.4, metalness: 0.6 });
  const blade = new THREE.Group();
  mesh(new THREE.BoxGeometry(0.5, 0.5, 11.2), rubber, 0, 0, 0, blade);
  mesh(new THREE.BoxGeometry(0.8, 0.35, 11.6), arm, 0, 0.42, 0, blade);
  for (const z of [-6, 6]) mesh(new THREE.BoxGeometry(0.9, 1.6, 0.9), arm, 0, 0, z, blade);   // the end carriages
  g.add(blade);
  g.userData.sweep = u => { blade.position.x = -4.5 + 9 * (0.5 - 0.5 * Math.cos(Math.PI * 2 * u)); };
  g.userData.sweep(0);
  return g;
}

// A sprinkler head on a thin post, its nozzle pointing toward -x (at the panel when put to its east).
export function sprinkler(height = 16) {
  const THREE = T(), g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x8c8c8c, roughness: 0.4, metalness: 0.6 });
  const black = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });
  mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.8, 16), metal, 0, 0.4, 0, g);
  mesh(new THREE.CylinderGeometry(0.4, 0.4, height, 10), metal, 0, height / 2, 0, g);
  mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.4, 14), black, 0, height + 0.4, 0, g);
  const nozzle = mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.2, 10), black, -1.2, height + 0.9, 0, g);
  nozzle.rotation.z = Math.PI / 2 - 0.35;
  g.userData.nozzle = { x: -2.3, y: height + 1.3, z: 0 };
  return g;
}

// A puff of water drops from a point toward -x: frame(dt, on) moves them (one Points, 160 drops).
export function spray(n = 160) {
  const THREE = T(), pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), life = new Float32Array(n);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9fc7e8, size: 0.7, transparent: true, opacity: 0.85, depthWrite: false }));
  pts.frustumCulled = false;
  life.fill(-1);
  const emit = i => {
    pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
    vel[i * 3] = -(9 + Math.random() * 5); vel[i * 3 + 1] = 2 + Math.random() * 3; vel[i * 3 + 2] = (Math.random() - 0.5) * 8;
    life[i] = 0.7 + Math.random() * 0.4;
  };
  let acc = 0;
  pts.userData.frame = (dt, on) => {
    acc += on ? dt * n * 1.4 : 0;
    for (let i = 0; i < n; i++) {
      if (life[i] <= 0) { if (acc >= 1) { emit(i); acc -= 1; } else { pos[i * 3 + 1] = -999; continue; } }
      life[i] -= dt;
      vel[i * 3 + 1] -= 30 * dt;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    acc = Math.min(acc, n);
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

// A row of n small panels on ONE shared pipe (along x), on short posts: tilt(deg) turns the pipe,
// so every panel tips together, the way one motor drives a whole row on big farms.
export function panelRow(n = 4, gap = 12) {
  const THREE = T(), g = new THREE.Group(), len = gap * (n - 1) + 10, H = 9;
  const metal = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.45, metalness: 0.6 });
  const frame = new THREE.MeshStandardMaterial({ color: 0xd6d6d6, roughness: 0.5, metalness: 0.3 });
  const cell = new THREE.MeshStandardMaterial({ color: 0x24406e, roughness: 0.3, metalness: 0.25, emissive: 0xf59e0b, emissiveIntensity: 0.12 });
  const motor = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 });
  for (const x of [-len / 2 + 2, len / 2 - 2]) mesh(new THREE.CylinderGeometry(0.5, 0.6, H, 10), metal, x, H / 2, 0, g);
  mesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), motor, -len / 2 - 0.6, H, 0, g);     // the one motor
  const pipe = new THREE.Group(); pipe.position.y = H; g.add(pipe);
  mesh(new THREE.CylinderGeometry(0.45, 0.45, len, 12), metal, 0, 0, 0, pipe).rotation.z = Math.PI / 2;
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + 5 + i * gap;
    mesh(new THREE.BoxGeometry(10, 0.35, 7), frame, x, 0.7, 0, pipe);
    mesh(new THREE.BoxGeometry(9.4, 0.12, 6.4), cell, x, 0.92, 0, pipe);
  }
  g.userData.tilt = deg => { pipe.rotation.x = deg * Math.PI / 180; };
  return g;
}
