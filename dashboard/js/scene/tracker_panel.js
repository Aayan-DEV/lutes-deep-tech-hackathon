// The part that tips (it sits on the rod): a wooden plate (13 x 13 x 0.8) held to the rod by two
// printed clamps, the solar cell (9.5 x 9.5, dark blue cells, thin silver grid, an aluminium
// frame) in the middle, and the 4 GL5528 light sensors standing on two legs at the 4 corners.
// Quadrants TL TR BL BR: TL and BL on +x, TL and TR on +z (the panel's own frame). Do not change.
import { createKit, uvFace, uvScale } from "./tracker_kit.js";
import { cellTexture, ldrFaceTexture } from "./tracker_tex.js";

export const CELL = 9.5, CELL_TOP = 0.12, FRAME = 10.4;
export const WOOD = { size: 13, t: 0.8, gap: 1.1 };    // the wooden plate; its bottom is `gap` above the rod's axis
export const HALF = WOOD.size / 2;                     // the face that catches dust (the whole plate)
const C = 5.75;                                        // the light sensors' corner spots
export const LDR_XZ = [[C, C], [-C, C], [C, -C], [-C, -C]];   // TL, TR, BL, BR
const LEG = 0.7;                                       // how high the sensor heads stand

// top: the "top" build part (its origin on the rod's axis). Returns { panel, sens, ldrMats }:
// panel is the group soilskin draws on (its face at y = CELL_TOP), sens the 4 sensors, ldrMats
// their face materials (TL TR BL BR).
export function buildTop(top, M) {
  const THREE = window.THREE, y0 = WOOD.gap + WOOD.t;
  const panel = new THREE.Group(); panel.name = "panel"; panel.position.y = y0; top.add(panel);
  const sens = new THREE.Group(); sens.name = "sensor"; sens.position.y = y0; top.add(sens);

  const kc = createKit();   // the two clamps between the rod and the plate
  for (const x of [-2.8, 2.8]) {
    kc.rbox(M.print, 1.2, WOOD.gap + 0.6, 1.8, 0.08, [x, (WOOD.gap - 0.6) / 2, 0]);
    for (const z of [-0.6, 0.6]) kc.cyl(M.metal, 0.11, 0.08, [x, -0.6, z], null, 10);
  }
  kc.build(top);

  const k = createKit();
  k.rbox(M.ply, WOOD.size, WOOD.t, WOOD.size, 0.1, [0, -WOOD.t / 2, 0], null, g => uvScale(g, 1 / 13));
  const cell = new THREE.MeshStandardMaterial({ map: cellTexture(), roughness: 0.32, metalness: 0.12 });
  k.box(cell, CELL, CELL_TOP, CELL, [0, CELL_TOP / 2, 0], null, g => uvFace(g, "y", CELL, CELL, { u0: 0.002, v0: 0.998 }));
  const bw = (FRAME - CELL) / 2, fh = 0.2, mid = CELL / 2 + bw / 2;
  for (const z of [-mid, mid]) k.rbox(M.metal, FRAME, fh, bw, 0.04, [0, fh / 2, z]);
  for (const x of [-mid, mid]) k.rbox(M.metal, bw, fh, CELL, 0.04, [x, fh / 2, 0]);
  for (const [x, z] of [[mid, mid - 1.2], [-mid, -mid + 1.2]]) k.cyl(M.metal, 0.13, 0.06, [x, fh + 0.02, z], null, 14);
  k.build(panel);

  return { panel, sens, ldrMats: buildSensors(sens, M) };
}

// The 4 light sensors: a ceramic disc with the red zig-zag face, on two thin legs.
function buildSensors(sens, M) {
  const THREE = window.THREE, k = createKit(), mats = [];
  LDR_XZ.forEach(([x, z]) => {
    for (const dx of [-0.1, 0.1]) k.cyl(M.metal, 0.022, LEG, [x + dx, LEG / 2, z], null, 6);
    k.cyl(M.black, 0.09, 0.05, [x, 0.025, z], null, 10);             // where the legs go into the wood
    k.cyl(M.ceramic, 0.255, 0.18, [x, LEG + 0.09, z], null, 28);
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: ldrFaceTexture(), emissiveMap: ldrFaceTexture(), emissive: 0x000000, roughness: 0.4 });
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.02, 28), m);
    face.position.set(x, LEG + 0.19, z); face.castShadow = face.receiveShadow = true; sens.add(face);
    mats.push(m);
  });
  k.build(sens);
  return mats;
}
