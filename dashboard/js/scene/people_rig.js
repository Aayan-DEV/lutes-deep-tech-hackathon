// One story person: a single skinned mesh (one draw call) on a 12-bone skeleton.
// About 17.5 cm tall (toy scale next to the tracker), the head about 1/7 of the height.
// Faces +z in its own frame, +x is the person's left. Rounded parts only (capsules, ellipsoids).
// buildPerson(i) -> { root, mesh, bones: {hips, spine, head, uaL, faL, uaR, faR, thL, shL, thR, shR},
//                     gripL, gripR, chest, look }
import { capsule, lathe, ellipsoid, cylinder, createMerger } from "./people_geo.js";

export const HIP_Y = 8.6;          // hips bone height when standing
export const THIGH = 3.8, SHIN = 3.9, ANKLE = 0.7, LEG_TOP = 0.2;   // leg joint at HIP_Y - LEG_TOP

const SKINS = [0xc68b59, 0x8d5524, 0xe0ac69, 0xa86f45, 0xf1c27d];
const LOOKS = [
  // hard hat, high-vis vest, tool belt
  { shirt: 0x3f6fa8, pants: 0x3b3f4a, shoe: 0x4a3420, hair: 0x2b1d14, hat: "hard", hatC: 0xf2c230, vest: 0xd4e83a, belt: true },
  // sun hat, holds the tablet
  { shirt: 0xe9e4d8, pants: 0x5b4a36, shoe: 0x2a2522, hair: 0x1a1410, hat: "sun", hatC: 0xd9c9a3, vest: null, belt: false },
  // cap, green shirt
  { shirt: 0x5f8f57, pants: 0x2f4058, shoe: 0x6b4a2b, hair: 0x3a2a1c, hat: "cap", hatC: 0xc4513a, vest: null, belt: false },
  { shirt: 0xd08a3a, pants: 0x3b3f4a, shoe: 0x2a2522, hair: 0x111111, hat: null, vest: null, belt: true },
];

// bone: [name, parent index, x, y, z] in the bind pose (mesh space)
const BONES = [
  ["root", -1, 0, 0, 0], ["hips", 0, 0, HIP_Y, 0], ["spine", 1, 0, 9.6, 0], ["head", 2, 0, 14.75, 0],
  ["uaL", 2, 2.0, 13.95, 0], ["faL", 4, 2.0, 11.0, 0], ["uaR", 2, -2.0, 13.95, 0], ["faR", 6, -2.0, 11.0, 0],
  ["thL", 1, 0.85, HIP_Y - LEG_TOP, 0], ["shL", 8, 0.85, HIP_Y - LEG_TOP - THIGH, 0],
  ["thR", 1, -0.85, HIP_Y - LEG_TOP, 0], ["shR", 10, -0.85, HIP_Y - LEG_TOP - THIGH, 0],
];
const B = Object.fromEntries(BONES.map((b, i) => [b[0], i]));

let material = null;
function skinMaterial() {
  if (!material) material = new window.THREE.MeshStandardMaterial({ vertexColors: true, skinning: true, roughness: 0.78, metalness: 0 });
  return material;
}

function body(mg, look, skin) {
  const { shirt, pants, shoe } = look;
  const lip = new window.THREE.Color(skin).multiplyScalar(0.62).getHex();
  // hips and belt
  mg.add(ellipsoid(1.62, 1.05, 1.08), pants, { at: [0, 8.95, 0], bone: B.hips });
  mg.add(cylinder(1.62, 1.62, 0.42, 18, true), 0x3a2a1c, { at: [0, 9.75, 0], scale: [1, 1, 0.72], bone: B.hips });
  mg.add(ellipsoid(0.32, 0.26, 0.1), 0xc9a24a, { at: [0, 9.75, 1.15], bone: B.hips });
  if (look.belt) {       // tool belt: two pouches and a hammer handle on the hips
    mg.add(ellipsoid(0.55, 0.65, 0.42, 10, 8), 0x8a5a2b, { at: [1.55, 9.2, 0.35], bone: B.hips });
    mg.add(ellipsoid(0.5, 0.6, 0.4, 10, 8), 0x8a5a2b, { at: [-1.5, 9.2, 0.45], bone: B.hips });
    mg.add(cylinder(0.12, 0.12, 1.8, 6), 0x6b4a2b, { at: [-1.7, 8.9, -0.3], rot: [0.2, 0, 0.1], bone: B.hips });
    mg.add(ellipsoid(0.22, 0.2, 0.5, 8, 6), 0x5c6168, { at: [-1.75, 9.85, -0.15], bone: B.hips });
  }
  // torso: waist to shoulders, flattened front to back
  const torso = [[0.01, 9.4], [1.5, 9.45], [1.52, 10.4], [1.7, 11.6], [1.88, 12.6], [1.95, 13.4], [1.75, 14.05], [1.1, 14.4], [0.01, 14.5]];
  mg.add(lathe(torso, 18), shirt, { scale: [1, 1, 0.66], bone: B.spine });
  for (const s of [1, -1]) mg.add(ellipsoid(0.72, 0.68, 0.7), shirt, { at: [s * 1.92, 13.9, 0], bone: B.spine });
  if (look.vest) {
    const v = [[1.58, 10.1], [1.62, 10.4], [1.78, 11.6], [1.96, 12.6], [2.02, 13.4], [1.8, 14.0], [1.25, 14.32]];
    mg.add(lathe(v.map(([r, y]) => [r + 0.07, y]), 18), look.vest, { scale: [1, 1, 0.7], bone: B.spine });
    for (const y of [10.9, 12.2]) mg.add(cylinder(1.88 + (y - 10.9) * 0.1, 1.86 + (y - 10.9) * 0.1, 0.3, 18, true), 0xd8dde3, { at: [0, y, 0], scale: [1, 1, 0.72], bone: B.spine });
  }
  // neck and head with a simple face
  mg.add(cylinder(0.48, 0.55, 1.0, 10), skin, { at: [0, 14.75, 0], bone: B.head });
  mg.add(ellipsoid(1.04, 1.25, 1.12, 18, 14), skin, { at: [0, 16.2, 0.05], bone: B.head });
  mg.add(ellipsoid(0.75, 0.45, 0.8, 12, 8), skin, { at: [0, 15.35, 0.3], bone: B.head });         // jaw
  mg.add(ellipsoid(0.17, 0.24, 0.2, 8, 6), skin, { at: [0, 16.05, 1.17], bone: B.head });          // nose
  for (const s of [1, -1]) {
    mg.add(ellipsoid(0.13, 0.16, 0.08, 8, 6), 0x1b1b1b, { at: [s * 0.4, 16.38, 1.06], bone: B.head });   // eyes
    mg.add(ellipsoid(0.32, 0.07, 0.07, 8, 4), look.hair, { at: [s * 0.42, 16.72, 0.99], rot: [0, 0, s * -0.12], bone: B.head });   // brows
    mg.add(ellipsoid(0.2, 0.32, 0.16, 8, 6), skin, { at: [s * 1.03, 16.15, 0.05], bone: B.head });   // ears
  }
  mg.add(ellipsoid(0.34, 0.07, 0.07, 8, 4), lip, { at: [0, 15.58, 1.02], bone: B.head });            // mouth
  // hair: a cap over the back and top of the head
  mg.add(ellipsoid(1.1, 1.3, 1.18, 18, 10, Math.PI * 0.55), look.hair, { at: [0, 16.25, -0.02], rot: [-0.55, 0, 0], bone: B.head });
  if (look.hat === "hard") {
    mg.add(ellipsoid(1.14, 0.95, 1.22, 18, 8, Math.PI / 2), look.hatC, { at: [0, 16.85, 0], bone: B.head });
    mg.add(cylinder(1.3, 1.3, 0.1, 20), look.hatC, { at: [0, 16.88, 0.15], scale: [1, 1, 1.1], bone: B.head });
    mg.add(ellipsoid(0.16, 0.85, 1.12, 8, 6, Math.PI / 2), look.hatC, { at: [0, 16.9, 0], bone: B.head });
  } else if (look.hat === "sun") {
    mg.add(cylinder(2.15, 2.2, 0.12, 22), look.hatC, { at: [0, 17.0, 0], bone: B.head });
    mg.add(cylinder(1.05, 1.18, 0.9, 18), look.hatC, { at: [0, 17.45, 0], bone: B.head });
    mg.add(cylinder(1.2, 1.2, 0.22, 18, true), 0x6b4a2b, { at: [0, 17.12, 0], bone: B.head });
  } else if (look.hat === "cap") {
    mg.add(ellipsoid(1.15, 0.85, 1.22, 18, 8, Math.PI / 2), look.hatC, { at: [0, 16.95, 0], bone: B.head });
    mg.add(ellipsoid(0.95, 0.08, 0.9, 14, 4), look.hatC, { at: [0, 16.98, 1.15], bone: B.head });
  }
  // arms: sleeves, forearms, hands
  for (const [s, ua, fa] of [[1, B.uaL, B.faL], [-1, B.uaR, B.faR]]) {
    mg.add(capsule(0.6, 0.5, 2.95, 12, 4), shirt, { at: [s * 2.0, 13.95, 0], bone: ua });
    mg.add(capsule(0.47, 0.38, 2.45, 12, 4), skin, { at: [s * 2.0, 11.0, 0], bone: fa });
    mg.add(cylinder(0.53, 0.53, 0.5, 12), shirt, { at: [s * 2.0, 10.85, 0], bone: fa });               // rolled cuff
    mg.add(ellipsoid(0.4, 0.58, 0.28, 10, 8), skin, { at: [s * 2.0, 8.2, 0.05], bone: fa });            // hand
    mg.add(ellipsoid(0.13, 0.32, 0.13, 6, 5), skin, { at: [s * 1.82, 8.45, 0.32], rot: [0.4, 0, 0], bone: fa });   // thumb
  }
  // legs and shoes
  for (const [s, th, sh] of [[1, B.thL, B.shL], [-1, B.thR, B.shR]]) {
    const x = s * 0.85, top = HIP_Y - LEG_TOP;
    mg.add(capsule(0.82, 0.62, THIGH, 12, 4), pants, { at: [x, top, 0], bone: th });
    mg.add(capsule(0.62, 0.48, SHIN - 0.2, 12, 4), pants, { at: [x, top - THIGH, 0], bone: sh });
    mg.add(ellipsoid(0.62, 0.45, 1.22, 12, 8), shoe, { at: [x, 0.42, 0.42], bone: sh });
    mg.add(ellipsoid(0.64, 0.12, 1.25, 12, 4), 0x2a2522, { at: [x, 0.1, 0.42], bone: sh });
  }
}

export function buildPerson(i) {
  const THREE = window.THREE, look = LOOKS[i % LOOKS.length], skin = SKINS[(i * 3 + 1) % SKINS.length];
  const mg = createMerger();
  body(mg, look, skin);
  const geo = mg.build({ skinned: true });

  const bones = BONES.map(([name]) => { const b = new THREE.Bone(); b.name = name; return b; });
  BONES.forEach(([, parent, x, y, z], k) => {
    if (parent < 0) bones[k].position.set(x, y, z);
    else { const p = BONES[parent]; bones[k].position.set(x - p[2], y - p[3], z - p[4]); bones[parent].add(bones[k]); }
  });
  const mesh = new THREE.SkinnedMesh(geo, skinMaterial());
  mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = false; mesh.frustumCulled = false;

  const root = new THREE.Group(); root.add(mesh);
  const named = Object.fromEntries(BONES.map(([name], k) => [name, bones[k]]));
  // where held things go: in each hand (palm), and in front of the chest (crates)
  const grip = (bone, s) => { const g = new THREE.Group(); g.position.set(s * 0.1, -2.95, 0.35); bone.add(g); return g; };
  const chest = new THREE.Group(); chest.position.set(0, 1.4, 2.7); named.spine.add(chest);
  return { root, mesh, bones: named, gripL: grip(named.faL, 1), gripR: grip(named.faR, -1), chest, look };
}
