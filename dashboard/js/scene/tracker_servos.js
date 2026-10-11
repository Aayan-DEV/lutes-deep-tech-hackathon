// The two servos as the real parts look (their wires are in tracker_wires.js).
// MG996R (big motor): black body with its sticker, the flange with 4 holes, the brass output
// gear and a white round horn. Own frame: shaft up at the origin, body toward +x, bottom at y -0.25.
// SG-90 (small motor): blue body with its sticker, the mounting tabs, and a cream one-arm horn
// that turns the rod. Own frame: the shaft along -x at the origin.
import { createKit, uvFace, uvSolid, roundRectShape, circlePath, plate } from "./tracker_kit.js";
import { stickerTexture } from "./tracker_tex.js";

// parent: the motor's group. M: shared materials. Returns the group of the parts that turn
// (output gear and horn, around the shaft): its rotation.y should follow the pan.
export function buildMG996R(parent, M) {
  const THREE = window.THREE, k = createKit();
  const body = new THREE.MeshStandardMaterial({ map: stickerTexture("mg", "#1c1c1e", "MG996R", "metal gear  13 kg", { w: 320, h: 256 }), roughness: 0.42 });
  const solid = g => uvSolid(g, 0.003, 0.997);
  k.box(body, 4.07, 3.25, 1.97, [1.0, 1.375, 0], null, g => uvFace(g, "z", 4.07, 3.25, { both: true, u0: 0.003, v0: 0.997 }));
  const fl = roundRectShape(-1.7, -0.985, 3.7, 0.985, 0.18);
  for (const x of [-1.38, 3.38]) for (const z of [-0.5, 0.5]) fl.holes.push(circlePath(x, z, 0.2));
  k.add(body, solid(plate(fl, 0.24, 0.03)), [0, 2.4, 0]);
  k.cyl(body, 0.72, 0.22, [0, 3.11, 0], null, 32, 0.72, solid);           // the round boss around the shaft
  k.cyl(body, 0.38, 0.15, [1.05, 3.07, 0], null, 20, 0.38, solid);         // the second small bump
  k.build(parent);
  const spin = new THREE.Group(), kh = createKit(); parent.add(spin);
  kh.cyl(M.brass, 0.28, 0.32, [0, 3.29, 0], null, 18);                     // brass output gear
  kh.cyl(M.white, 0.42, 0.2, [0, 3.34, 0], null, 24);                      // horn hub
  kh.cyl(M.white, 1.25, 0.16, [0, 3.5, 0], null, 40);                      // round horn
  for (let i = 0; i < 8; i++) {                                            // horn holes
    const a = i * Math.PI / 4, rr = i % 2 ? 1.02 : 0.74;
    kh.cyl(M.black, 0.06, 0.17, [Math.cos(a) * rr, 3.5, Math.sin(a) * rr], null, 8);
  }
  kh.build(spin);
  return spin;
}

// parent: the servo's group (on the rod's axis, outside the +x holder, shaft along -x).
// Returns the horn mesh: its rotation.x should follow the tilt.
export function buildSG90(parent, M) {
  const THREE = window.THREE, k = createKit();
  const body = new THREE.MeshStandardMaterial({ map: stickerTexture("sg", "#2c64c8", "SG90", "9 g  micro servo", { w: 256, h: 250 }), roughness: 0.38 });
  const solid = g => uvSolid(g, 0.003, 0.997);
  k.rbox(body, 2.27, 2.22, 1.18, 0.05, [1.43, -0.55, 0], null, g => uvFace(g, "z", 2.27, 2.22, { both: true, u0: 0.003, v0: 0.997 }));
  // mounting tabs with a hole at each end
  const tab = roundRectShape(-0.59, -2.15, 0.59, 1.05, 0.12);
  tab.holes.push(circlePath(0, -1.92, 0.1), circlePath(0, 0.82, 0.1));
  const tg = new THREE.ExtrudeGeometry(tab, { depth: 0.2, bevelEnabled: false, curveSegments: 8 });
  tg.rotateY(Math.PI / 2);
  k.add(body, solid(tg), [0.62, 0, 0]);
  k.cyl(body, 0.55, 0.14, [0.225, 0, 0], [0, 0, Math.PI / 2], 28, 0.55, solid);      // boss around the shaft
  k.cyl(body, 0.28, 0.1, [0.245, -0.75, 0], [0, 0, Math.PI / 2], 16, 0.28, solid);
  k.cyl(M.cream, 0.2, 0.46, [-0.07, 0, 0], [0, 0, Math.PI / 2], 16);                 // the spline into the horn
  k.build(parent);

  // one-arm horn on the rod's end, pointing down
  const s = new THREE.Shape();
  s.moveTo(-0.32, 0); s.lineTo(-0.15, -1.3); s.absarc(0, -1.3, 0.15, Math.PI, 2 * Math.PI, false); s.lineTo(0.32, 0); s.absarc(0, 0, 0.32, 0, Math.PI, false);
  for (const y of [-0.55, -0.8, -1.05, -1.3]) s.holes.push(circlePath(0, y, 0.045));
  const hg = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false, curveSegments: 10 });
  hg.rotateY(Math.PI / 2); hg.translate(-0.06, 0, 0);
  const horn = new THREE.Mesh(hg, M.cream); horn.position.x = -0.36; horn.castShadow = horn.receiveShadow = true;
  parent.add(horn);
  return horn;
}
