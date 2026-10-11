// The tracker model (units: cm, 1 unit = 1 cm) inside the scene that scene.js owns, built the way
// the real one is: a plywood base on rubber feet with the Arduino UNO R4 WiFi, a half-size
// breadboard and jumper wires; the MG996R big motor on the base between two wood blocks; a UHMW
// plate on the blocks; a metal pipe from the motor's horn up through the plate to the UHMW
// spinner (it turns: pan); two printed holders on the spinner with a metal rod through them
// (the tilt axis, turned by the SG-90 small motor); on the rod a wooden plate with the solar
// cell in the middle and the 4 light sensors at its corners. Sizes: tracker_mech.js, tracker_panel.js.
// Pieces are merged per material (see tracker_kit.js), about 50 draw calls for the whole tracker.
// Plain labels on the parts, curved arrows while a motor moves, dust / snow / water drawn on the
// panel and on the 4 light sensors, parts that can be clicked, and a build-up for the story.
// Everything that reads positions (surface, pickAt, labels) uses world matrices, so the model
// stays right when scene.js scales the whole group.
// Quadrants TL TR BL BR: TL and BL on the model's +x side, TL and TR on the panel's +z side
// (the front at pan 0), the same as world.js.
import { arcArrow } from "../parts3d.js";
import { createSoilSkin } from "../app/soilskin.js";
import { createKit, roundRectShape, plate, uvScale, mergeGeos } from "./tracker_kit.js";
import { plywoodTexture, headerTexture } from "./tracker_tex.js";
import { buildArduino, pinAt } from "./tracker_arduino.js";
import { buildBreadboard, holeAt, baseJumpers } from "./tracker_breadboard.js";
import { buildMG996R, buildSG90 } from "./tracker_servos.js";
import { MOTOR_Y, PIVOT_Y, ROD, buildBlocks, buildPlate, buildPipe, buildSpinner, buildHolders, buildRod } from "./tracker_mech.js";
import { buildTop, CELL, CELL_TOP, HALF, LDR_XZ } from "./tracker_panel.js";
import { buildStaticWires, buildServoWire } from "./tracker_wires.js";

const rad = d => d * Math.PI / 180, SERVO_X = ROD.x1 + 0.42;   // the SG-90's shaft, just past the rod's end
const ARD_AT = [12.6, 2.98, 4.6], BB_AT = [12.6, 2.825, -4.4];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const easeOutBack = x => { const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
// "top" = the wooden plate with the solar cell and the 4 light sensors
export const BUILD_ORDER = ["base", "blocks", "bigMotor", "plate", "pipe", "spinner", "holders", "rod", "smallMotor", "top"];

function materials() {
  const THREE = window.THREE, std = (color, roughness = 0.6, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  return {
    ply: std(0xffffff, 0.78, 0, { map: plywoodTexture() }), plyDark: std(0xb48c5e, 0.85, 0, { map: plywoodTexture() }),
    wood: std(0xe9cba0, 0.8, 0, { map: plywoodTexture() }), uhmw: std(0xf7f8f5, 0.8, 0, { emissive: 0x3c3e40 }), steel: std(0xc4c8ce, 0.32, 0.25),
    rubber: std(0x1a1a1a, 0.95), print: std(0xf6a04d, 0.55), black: std(0x1c1c1e, 0.5), header: std(0xffffff, 0.5, 0, { map: headerTexture() }),
    metal: std(0xc9cdd3, 0.34, 0.35), brass: std(0xc9a14a, 0.4, 0.35), white: std(0xf3f3f0, 0.5), cream: std(0xefe4c8, 0.5),
    ceramic: std(0xe8e2d4, 0.6), pcbGreen: std(0x1f6a3e, 0.5), wire: std(0xffffff, 0.55, 0, { vertexColors: true }),
    led: new THREE.MeshBasicMaterial({ color: 0x5cff8a }),
  };
}

export function createTracker(scene, { camera = null, srgb = false } = {}) {
  const THREE = window.THREE, group = new THREE.Group(); group.name = "tracker"; scene.add(group);
  const M = materials(), B = {};
  const part = (id, parent) => { const g = new THREE.Group(); g.name = id; parent.add(g); B[id] = g; return g; };

  // base: plywood on two battens with rubber feet; Arduino, breadboard and their jumpers on top
  const base = part("base", group), kb = createKit(), bev = 0.1;
  const slab = roundRectShape(-10 + bev, -8.5 + bev, 17 - bev, 8.5 - bev, 0.8);
  kb.add(M.ply, uvScale(plate(slab, 1.2, bev), 1 / 14), [0, 1.2, 0]);
  for (const x of [-9, 16]) {
    kb.rbox(M.plyDark, 2, 0.95, 17, 0.08, [x, 0.725, 0], null, g => uvScale(g, 1 / 14));
    for (const z of [-7.6, 7.6]) kb.cyl(M.rubber, 0.55, 0.25, [x, 0.125, z], null, 20);
  }
  kb.build(base);
  const ard = buildArduino(M); ard.position.set(...ARD_AT); base.add(ard);
  const bb = buildBreadboard(); bb.position.set(...BB_AT); base.add(bb);
  const add3 = (p, o) => [p[0] + o[0], p[1] + o[1], p[2] + o[2]], bbHole = (r, i) => add3(holeAt(r, i), BB_AT);
  const wires = new THREE.Mesh(mergeGeos(baseJumpers((s, i) => add3(pinAt(s, i), ARD_AT), bbHole)), M.wire);
  wires.castShadow = wires.receiveShadow = true; base.add(wires);

  buildBlocks(part("blocks", group), M);
  // big motor (MG996R): on the base between the blocks, body toward the front, horn up
  const mg = part("bigMotor", group), mgBody = new THREE.Group();
  mgBody.position.y = MOTOR_Y; mgBody.rotation.y = -Math.PI / 2; mg.add(mgBody);
  const mgSpin = buildMG996R(mgBody, M);
  const staticWires = new THREE.Group(); group.add(staticWires);   // shown with the big motor
  buildStaticWires(staticWires, M, bbHole);
  buildPlate(part("plate", group), M);

  // everything that turns with the big motor (pan)
  const pan = new THREE.Group(); group.add(pan);
  buildPipe(part("pipe", pan), M);
  buildSpinner(part("spinner", pan), M);
  buildHolders(part("holders", pan), M);
  // small motor (SG-90): fixed outside the +x holder on two printed posts, its horn turns the rod
  const sg = part("smallMotor", pan), sgBody = new THREE.Group(); sgBody.position.set(SERVO_X, PIVOT_Y, 0); sg.add(sgBody);
  const horn = buildSG90(sgBody, M), ks = createKit();
  for (const y of [-1.92, 0.82]) ks.cyl(M.print, 0.15, 1.6, [-0.17, y, 0], [0, 0, Math.PI / 2], 10);
  ks.build(sgBody);
  const servoWire = new THREE.Group(); pan.add(servoWire);         // shown with the small motor
  buildServoWire(servoWire, M, SERVO_X);

  // the part that tips, on the rod's axis: the rod, the wooden plate, the cell and the 4 lights
  const tilt = new THREE.Group(); tilt.position.set(0, PIVOT_Y, 0); pan.add(tilt);
  buildRod(part("rod", tilt), M);
  const top = part("top", tilt), { panel, sens, ldrMats } = buildTop(top, M);
  B.panel = panel; B.sensor = sens;   // for the pointer's glow (parts.panel, parts.sensor)
  const soil = createSoilSkin(panel, ldrMats, { size: CELL, y: CELL_TOP + 0.01, srgb });

  // where the plain names sit (app/labels.js draws them as HTML over the canvas, in this order)
  const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  const labels = [
    { id: "panel", text: "Solar panel", anchor: anchor(panel, -2.6, 1.2, -2.2) },
    { id: "light", text: "Light sensor", anchor: anchor(sens, LDR_XZ[1][0], 1.7, LDR_XZ[1][1]) },   // the front left one (TR)
    { id: "smallMotor", text: "Small motor", anchor: anchor(sgBody, 2.0, -1.4, 0.4) },
    { id: "bigMotor", text: "Big motor", anchor: anchor(mgBody, 2.8, 3.0, 0) },
  ];
  // where each light's live number sits (app/lightnums.js): just above each sensor head, TL TR BL BR
  const lightAnchors = LDR_XZ.map(([x, z]) => anchor(sens, x, 1.3, z));

  // curved arrows while a motor moves
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xf07b2f, transparent: true, opacity: 0.95, depthWrite: false });
  const panArrow = { pos: arcArrow(8.4, 70, 0.16, arrowMat), neg: arcArrow(8.4, 70, 0.16, arrowMat) };
  panArrow.pos.rotation.y = -rad(160) + rad(8); panArrow.neg.scale.z = -1; panArrow.neg.rotation.y = rad(-20) - rad(8);
  for (const k of ["pos", "neg"]) { panArrow[k].position.y = 11.0; pan.add(panArrow[k]); panArrow[k].visible = false; }
  const tiltArrow = {};
  for (const k of ["pos", "neg"]) {
    const outer = new THREE.Group(), inner = arcArrow(4.7, 60, 0.13, arrowMat), plane = new THREE.Group();
    if (k === "pos") inner.scale.z = -1;
    inner.rotation.y = k === "pos" ? rad(-30) : rad(30);
    plane.rotation.z = Math.PI / 2; plane.add(inner);
    outer.add(plane); outer.position.set(-7.4, 0, 0); outer.visible = false; tilt.add(outer); tiltArrow[k] = outer;
  }

  // With sRGB output the hex colours above are sRGB: convert them once so the model keeps its look.
  if (srgb) {
    const seen = new Set();
    group.traverse(o => {
      [].concat(o.material || []).forEach(m => {
        if (seen.has(m)) return; seen.add(m);
        m.color && m.color.convertSRGBToLinear(); m.emissive && m.emissive.convertSRGBToLinear();
        if (m.map) { m.map.encoding = THREE.sRGBEncoding; m.map.needsUpdate = true; }
      });
      const col = o.geometry && o.geometry.attributes.color;
      if (col && !seen.has(col)) { seen.add(col); const c = new THREE.Color(); for (let i = 0; i < col.count; i++) { c.fromArray(col.array, i * 3).convertSRGBToLinear(); c.toArray(col.array, i * 3); } }
    });
  }
  // Parts pop in around their own middle: move each part's origin to the centre of its pieces.
  group.updateMatrixWorld(true);
  for (const id of BUILD_ORDER) {
    const g = B[id], c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
    g.parent.worldToLocal(c); g.position.add(c); g.children.forEach(ch => ch.position.sub(c));
  }

  // ---- clicking parts ----
  const pickable = { light: [sens], bigMotor: [mgBody], smallMotor: [sgBody], panel: [panel] };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const outline = new THREE.BoxHelper(undefined, 0xf59e0b); outline.visible = false;
  outline.material.depthTest = false; outline.renderOrder = 9; scene.add(outline);
  let selected = null, build = 1, lastLights = "";
  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();

  const api = {
    group, camera, parts: B, labels, lightAnchors, get built() { return build >= 1; },
    setPan(deg) { pan.rotation.y = mgSpin.rotation.y = rad(deg || 0); },
    // deg: the small motor's angle; flatDeg: the angle at which the panel lies flat (90 unless synced)
    setTilt(deg, flatDeg = 90) { tilt.rotation.x = rad((deg == null ? flatDeg : deg) - flatDeg); horn.rotation.x = tilt.rotation.x; },
    setMotion(panDir, tiltDir) {
      const on = build >= 1;
      panArrow.pos.visible = on && panDir > 0; panArrow.neg.visible = on && panDir < 0;
      tiltArrow.pos.visible = on && tiltDir > 0; tiltArrow.neg.visible = on && tiltDir < 0;
    },
    // 0..100 per light: how brightly each LDR face glows
    setLights(v) {
      const sig = v.map(x => Math.round(x)).join();
      if (sig === lastLights) return; lastLights = sig;
      v.forEach((x, i) => { const g = clamp(x / 100, 0, 1); ldrMats[i].emissive.setRGB(g * 0.75, g * 0.6, g * 0.25); });   // the glow keeps the zig-zag (emissiveMap)
    },
    setSoiling(layers) { soil.set(layers); },
    // For the particles: where the panel's face is and which quadrant a point falls in.
    // All in world units (halfW and halfH already include the group's scale: worldScaled).
    surface() {
      panel.updateWorldMatrix(true, false);
      const center = panel.localToWorld(new THREE.Vector3(0, CELL_TOP, 0));
      panel.getWorldQuaternion(tmpQ); panel.getWorldScale(tmpS);
      const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(tmpQ);
      return { center, normal, halfW: HALF * tmpS.x, halfH: HALF * tmpS.z, worldScaled: true, quadrantOf(p) {
        tmpV.copy(p); panel.worldToLocal(tmpV);
        return (tmpV.z >= 0 ? 0 : 2) + (tmpV.x >= 0 ? 0 : 1);
      } };
    },
    // ndc: -1..1 like three.js. Returns 'light' | 'bigMotor' | 'smallMotor' | 'panel' | null.
    pickAt(ndcX, ndcY) {
      if (!api.camera || build < 1) return null;
      ndc.set(ndcX, ndcY); ray.setFromCamera(ndc, api.camera);
      let best = null;
      for (const [id, objs] of Object.entries(pickable)) {
        const hit = ray.intersectObjects(objs, true)[0];
        if (hit && (!best || hit.distance < best.d)) best = { id, d: hit.distance };
      }
      return best && best.id;
    },
    select(id) { selected = pickable[id] ? id : null; outline.visible = !!selected; },
    // Story: 0 = nothing built, 1 = all there. Parts appear in BUILD_ORDER, each with a small pop.
    setBuildProgress(p) {
      build = clamp(p, 0, 1);
      BUILD_ORDER.forEach((id, i) => {
        const k = clamp(build * BUILD_ORDER.length - i, 0, 1), s = k >= 1 ? 1 : Math.max(0.001, easeOutBack(k));
        B[id].visible = k > 0; B[id].scale.setScalar(s);
      });
      staticWires.visible = B.bigMotor.visible; servoWire.visible = B.smallMotor.visible;
      if (build < 1) { api.setMotion(0, 0); api.select(null); }
    },
    frame() { if (selected) outline.setFromObject(pickable[selected][0]); },
  };
  return api;
}
