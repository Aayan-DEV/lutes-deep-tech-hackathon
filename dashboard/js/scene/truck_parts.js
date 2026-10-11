// The pickup truck's 3D parts, built once: a cab and hood cut from one side profile (with wheel
// arches), an open bed, rounded bumpers, a grille, mirrors, round headlights with soft beams, tail
// lights on a tailgate that folds down, and 4 wheels with tyres, rims, hub caps and wheel nuts.
// About 50 cm long (a real pickup next to the 17.5 cm people). Nose along local +x.
// Meshes are merged per material, so the whole truck is about 14 draw calls.
import { createMerger, lathe, cylinder } from "./people_geo.js";

export const WHEEL_R = 4.3, AXLE_F = 15.5, AXLE_R = -15.5, HALF_W = 9.5, BED_Y = 7.9;

function profile(points, arcs = []) {
  const THREE = window.THREE, s = new THREE.Shape();
  points.forEach(([x, y, arc], k) => {
    if (k === 0) s.moveTo(x, y); else s.lineTo(x, y);
    if (arc) s.absarc(arc[0], arc[1], arc[2], Math.PI, 0, true);
  });
  s.closePath();
  return s;
}
function extrude(shape, depth, bevel = 0) {
  const g = new window.THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14 });
  g.translate(0, 0, -depth / 2);
  g.deleteAttribute("uv");
  return g;
}
function roundRect(w, h, r) {
  const THREE = window.THREE, s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// soft light cones: bright at the lamp, fading out along the beam and toward its edges
function beamMaterial() {
  const THREE = window.THREE;
  const m = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0xffe6b0) } },
    vertexShader: `varying float vAlong; varying vec3 vN; varying vec3 vV;
      void main() { vAlong = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uOpacity; uniform vec3 uColor; varying float vAlong; varying vec3 vN; varying vec3 vV;
      void main() { float edge = abs(dot(normalize(vN), normalize(vV)));
        float a = uOpacity * pow(vAlong, 2.2) * edge * edge; gl_FragColor = vec4(uColor * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  Object.defineProperty(m, "opacity", { get: () => m.uniforms.uOpacity.value, set: v => { if (m.uniforms) m.uniforms.uOpacity.value = v; } });
  return m;
}

function mesh(geo, mat, parent, shadow = true) {
  const m = new window.THREE.Mesh(geo, mat);
  m.castShadow = shadow; m.receiveShadow = true; parent.add(m);
  return m;
}

export function buildTruck(body, group) {
  const THREE = window.THREE;
  const M = (c, r, metal = 0.05, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: metal }, extra));
  const mat = {
    paint: M(0xc4513a, 0.42, 0.12), trim: M(0x2b2d31, 0.8), chrome: M(0xd5d9de, 0.28, 0.7), glass: M(0x27313d, 0.12, 0.5),
    head: M(0xfff4cf, 0.3, 0, { emissive: 0xffe2a0, emissiveIntensity: 0.15 }), tail: M(0xb3261c, 0.4, 0, { emissive: 0xc0281c, emissiveIntensity: 0.25 }),
    wheel: M(0xffffff, 0.75, 0.15, { vertexColors: true }),
    beam: beamMaterial(),
  };
  const W = HALF_W * 2, A = 5.4;

  // paint: cab and hood from one side profile, bed sides with the rear arch
  const paint = createMerger();
  paint.add(extrude(profile([[-4.4, 5.0], [10.1, 5.0, [AXLE_F, 4.3, A]], [25.2, 5.0], [25.6, 9.8], [24.6, 11.6], [12.0, 12.4], [7.6, 18.0], [6.6, 18.6], [-3.4, 18.6], [-4.4, 17.6]]), W - 1.2, 0.6), 0xffffff);
  const side = profile([[-25, 5.0], [-20.9, 5.0, [AXLE_R, 4.3, A]], [-4.4, 5.0], [-4.4, 12.4], [-25, 12.4]]);
  for (const z of [1, -1]) paint.add(extrude(side, 0.5, 0.2), 0xffffff, { at: [0, 0, z * (HALF_W - 0.45)] });
  paint.add(new THREE.BoxGeometry(1.0, 6.0, W + 0.3), 0xffffff, { at: [2.6, 15.6, 0] });            // the post between the windows
  mesh(paint.build(), mat.paint, body);

  // glass: side windows and windshield in one profile, plus the back window
  const glass = createMerger();
  glass.add(extrude(profile([[12.67, 12.93], [8.3, 18.4], [-3.0, 18.4], [-3.0, 12.9], [12.0, 12.9]]), W + 0.1), 0xffffff);
  glass.add(new THREE.BoxGeometry(0.3, 3.8, W - 5), 0xffffff, { at: [-4.55, 15.4, 0] });
  mesh(glass.build(), mat.glass, body, false);

  // dark trim: chassis, wheel wells, bed floor, bumpers, grille, handles, mirror arms
  const trim = createMerger(), bump = roundRect(2.0, 2.6, 0.8);
  trim.add(new THREE.BoxGeometry(48, 2.2, W - 7), 0xffffff, { at: [0, 4.6, 0] });
  trim.add(new THREE.BoxGeometry(11, 5.5, W - 7.2), 0xffffff, { at: [AXLE_F, 6.6, 0] });
  trim.add(new THREE.BoxGeometry(20.4, 0.6, W - 1.4), 0xffffff, { at: [-14.7, BED_Y - 0.3, 0] });
  trim.add(extrude(bump, W + 0.6, 0.3), 0xffffff, { at: [26.0, 5.8, 0] });
  trim.add(extrude(bump, W + 0.2, 0.3), 0xffffff, { at: [-25.6, 5.6, 0] });
  trim.add(new THREE.BoxGeometry(0.3, 2.6, 9), 0xffffff, { at: [26.25, 8.4, 0] });
  for (const z of [1, -1]) trim.add(new THREE.BoxGeometry(11, 2.6, 3.8), 0xffffff, { at: [AXLE_R, BED_Y + 0.4, z * 7.2] });   // wheel humps in the bed
  for (const z of [1, -1]) {
    trim.add(new THREE.BoxGeometry(1.4, 0.35, 0.3), 0xffffff, { at: [-0.8, 12.6, z * (HALF_W + 0.05)] });           // door handles
    trim.add(new THREE.BoxGeometry(0.5, 0.5, 1.6), 0xffffff, { at: [10.6, 13.6, z * (HALF_W + 0.6)] });             // mirror arms
    trim.add(new THREE.BoxGeometry(1.0, 2.2, 1.7), 0xffffff, { at: [10.4, 14.4, z * (HALF_W + 1.7)] });             // mirrors
  }
  mesh(trim.build(), mat.trim, body);

  // chrome: grille bars, bumper strips, number plate frame
  const chrome = createMerger();
  for (const y of [7.6, 8.4, 9.2]) chrome.add(new THREE.BoxGeometry(0.2, 0.22, 8.6), 0xffffff, { at: [26.45, y, 0] });
  chrome.add(new THREE.BoxGeometry(0.4, 0.4, W - 2), 0xffffff, { at: [27.35, 6.4, 0] });
  chrome.add(new THREE.BoxGeometry(0.15, 1.6, 4), 0xffffff, { at: [-26.95, 5.6, 0] });
  for (const z of [1, -1]) chrome.add(new THREE.BoxGeometry(0.2, 1.8, 1.5), 0xffffff, { at: [9.85, 14.4, z * (HALF_W + 1.7)] });
  mesh(chrome.build(), mat.chrome, body);

  // headlights: round lamps, and two soft beams (shown only in the dark)
  const heads = createMerger();
  for (const z of [6.6, -6.6]) heads.add(cylinder(1.05, 1.05, 0.5, 18), 0xffffff, { at: [26.25, 9.3, z], rot: [0, 0, Math.PI / 2] });
  mesh(heads.build(), mat.head, body, false);
  const beam = new THREE.Group(), cone = cylinder(0.9, 7, 46, 20, true);   // keeps its uv: v runs along the beam
  for (const z of [6.6, -6.6]) {
    const c = new THREE.Mesh(cone, mat.beam);
    c.position.set(26.5 + 23, 7.6, z); c.rotation.z = Math.PI / 2 - 0.07; c.renderOrder = 5; beam.add(c);
  }
  body.add(beam); beam.visible = false;

  // the tailgate (folds down backward) with its tail lights
  const gate = new THREE.Group(); gate.position.set(-24.9, BED_Y - 0.6, 0); body.add(gate);
  mesh(new THREE.BoxGeometry(0.8, 12.4 - BED_Y + 0.6, W - 0.2).translate(0, (12.4 - BED_Y + 0.6) / 2, 0), mat.paint, gate);
  const tails = createMerger();
  for (const z of [1, -1]) tails.add(new THREE.BoxGeometry(0.3, 1.6, 2.2), 0xffffff, { at: [-0.5, 3.0, z * 7.6] });
  mesh(tails.build(), mat.tail, gate, false);

  // wheels: tyre (rounded), rim, hub cap and 5 nuts, one mesh each; the group turns to roll
  const wheels = [];
  for (const [x, z] of [[AXLE_F, 1], [AXLE_F, -1], [AXLE_R, 1], [AXLE_R, -1]]) {
    const w = new THREE.Group(); w.position.set(x, WHEEL_R, z * (HALF_W - 1.7)); group.add(w);
    const mg = createMerger(), out = z;   // the side facing out
    mg.add(lathe([[2.6, -1.65], [3.85, -1.65], [4.2, -1.3], [WHEEL_R, 0], [4.2, 1.3], [3.85, 1.65], [2.6, 1.65]], 26), 0x1d1d1f, { rot: [Math.PI / 2, 0, 0] });
    mg.add(cylinder(2.65, 2.65, 3.0, 22), 0xbfc4ca, { rot: [Math.PI / 2, 0, 0] });
    mg.add(cylinder(1.0, 1.25, 0.5, 16), 0xe2e5e9, { rot: [Math.PI / 2, 0, 0], at: [0, 0, out * 1.6] });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      mg.add(cylinder(0.2, 0.2, 0.4, 6), 0x55595f, { rot: [Math.PI / 2, 0, 0], at: [Math.cos(a) * 1.7, Math.sin(a) * 1.7, out * 1.55] });
    }
    const m = mesh(mg.build(), mat.wheel, w);
    m.castShadow = true;
    wheels.push(w);
  }
  return { mat, gate, wheels, beam };
}
