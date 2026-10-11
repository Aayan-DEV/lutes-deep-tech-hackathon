// 3D model of the tracker in the desert (units: cm). Click a part (light sensor, big motor, small
// motor, solar panel) and onPick(id) is called, so the page can show what that part is seeing.
import { T, mat, box, cyl, label, cellTexture, ldrFaceTexture, arcArrow } from "./parts3d.js";
import { clamp, onScreen } from "./util.js";
import { createDesert } from "./desert3d.js";

const TT_Y = 3.9, PIVOT_Y = 12.6, rad = d => d * Math.PI / 180;

export function createTrackerView(host, { onPick } = {}) {
  const THREE = T();
  if (!THREE) { host.insertAdjacentHTML("beforeend", `<p class="nolib">The 3D view needs internet for its library.</p>`); return null; }
  const W = host.clientWidth, H = host.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio)); renderer.setSize(W, H);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.5, 1200);
  camera.position.set(34, 15, 46);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 9, 0); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.485;
  controls.minDistance = 16; controls.maxDistance = 170;
  const desert = createDesert(scene, renderer);

  // colours: plywood, orange 3D-printed parts, a black MG996R, a blue SG-90, a blue solar cell
  const M = {
    wood: mat(0xd8b98c, 0.85), woodDark: mat(0xb8915e, 0.9), print: mat(0xf6a04d, 0.55), ink: mat(0x1b1b1b, 0.5),
    servo: mat(0x1f1f1f, 0.5), servo2: mat(0x2f62c9, 0.45), horn: mat(0xf5f5f5, 0.5), metal: mat(0xb9b9b9, 0.3, 0.75),
    vane: mat(0x202020, 0.6), cell: mat(0xffffff, 0.3, 0.2, { map: cellTexture() }), pcb: mat(0x0f7a8a, 0.55),
    board: mat(0xf4f1ea, 0.7),
  };

  // base: plywood with a hole for the big motor, on two strips; Arduino and breadboard on the right
  const bx0 = -10, bx1 = 17, bz = 8.5, hole = { x0: -1.6, x1: 3.4, z: 1.3 };
  box(hole.x0 - bx0, 1.2, 2 * bz, M.wood, (bx0 + hole.x0) / 2, 1.8, 0, scene);
  box(bx1 - hole.x1, 1.2, 2 * bz, M.wood, (hole.x1 + bx1) / 2, 1.8, 0, scene);
  box(hole.x1 - hole.x0, 1.2, bz - hole.z, M.wood, (hole.x0 + hole.x1) / 2, 1.8, (bz + hole.z) / 2, scene);
  box(hole.x1 - hole.x0, 1.2, bz - hole.z, M.wood, (hole.x0 + hole.x1) / 2, 1.8, -(bz + hole.z) / 2, scene);
  box(2, 1.2, 2 * bz, M.woodDark, -9, 0.6, 0, scene); box(2, 1.2, 2 * bz, M.woodDark, 16, 0.6, 0, scene);
  box(6.86, 0.16, 5.33, M.pcb, 12.6, 2.5, 4.6, scene);
  box(8.3, 0.85, 5.5, M.board, 12.6, 2.83, -4.4, scene);

  // big motor (MG996R): turns everything above it left and right
  const mg = new THREE.Group(); scene.add(mg);
  box(4.07, 4.29, 1.97, M.servo, 1.0, 0.45, 0, mg);
  box(5.4, 0.25, 1.97, M.servo, 1.0, 2.45, 0, mg);
  cyl(0.62, 0.5, M.servo2, 0, 2.8, 0, mg);
  cyl(0.3, 0.45, M.metal, 0, 3.2, 0, mg, 20);
  cyl(1.25, 0.22, M.horn, 0, 3.4, 0, mg, 40);

  const pan = new THREE.Group(); scene.add(pan);
  cyl(1.6, TT_Y - 3.5, M.print, 0, (TT_Y + 3.5) / 2 - 0.25, 0, pan, 32);
  cyl(6.5, 0.5, M.wood, 0, TT_Y, 0, pan, 96);
  box(0.5, 0.06, 2.2, M.ink, 0, TT_Y + 0.28, 5.0, pan);                    // front mark
  const upH = PIVOT_Y + 1.2 - (TT_Y + 0.25);
  box(0.6, upH, 2.6, M.print, -5.7, TT_Y + 0.25 + upH / 2, 0, pan);
  box(0.6, upH, 2.6, M.print, 5.7, TT_Y + 0.25 + upH / 2, 0, pan);
  // small motor (SG-90): tips the panel up and down
  const sg = new THREE.Group(); sg.position.set(6.0, PIVOT_Y, 0); pan.add(sg);
  box(2.27, 2.22, 1.18, M.servo2, 1.43, -0.55, 0, sg);
  box(0.22, 3.2, 1.18, M.servo2, 0.4, -0.55, 0, sg);
  cyl(0.26, 0.6, M.horn, 0.1, 0, 0, sg, 20).rotation.z = Math.PI / 2;

  // the part that tips: solar panel and light sensor
  const tilt = new THREE.Group(); tilt.position.set(0, PIVOT_Y, 0); pan.add(tilt);
  const panel = new THREE.Group(); tilt.add(panel);
  box(10.4, 0.4, 10.4, M.wood, 0, 0, 0, panel);
  box(9.5, 0.12, 9.5, M.cell, 0, 0.26, 0, panel);
  box(0.9, 1.2, 1.6, M.print, 5.0, -0.4, 0, tilt);
  const sens = new THREE.Group(); sens.position.set(0, 0.2, 6.6); tilt.add(sens);
  box(2.8, 0.55, 2.8, M.board, 0, 0.05, 0, sens);
  box(2.8, 1.25, 0.12, M.vane, 0, 0.9, 0, sens); box(0.12, 1.25, 2.8, M.vane, 0, 0.9, 0, sens);
  const ldrMats = [];
  [[0.62, 0.62], [-0.62, 0.62], [0.62, -0.62], [-0.62, -0.62]].forEach(([x, z]) => {   // TL, TR, BL, BR
    const m = mat(0xffffff, 0.45, 0, { map: ldrFaceTexture(), emissive: 0x000000 }); ldrMats.push(m);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.24, 32), [mat(0xe4e0d8, 0.6), m, m]);
    h.position.set(x, 0.45, z); h.castShadow = h.receiveShadow = true; sens.add(h);
  });

  // plain names on the parts (they can be clicked too)
  const names = {
    light: label("Light sensor", { size: 1.35 }), pan: label("Big motor", { size: 1.35 }),
    tilt: label("Small motor", { size: 1.35 }), panel: label("Solar panel", { size: 1.35 }),
  };
  names.light.position.set(0, 2.4, 0.4); sens.add(names.light);
  names.pan.position.set(4.2, 4.6, 7.2); scene.add(names.pan);
  names.tilt.position.set(5.2, -2.8, 0); sg.add(names.tilt);
  names.panel.position.set(-3.2, 1.6, -2.6); panel.add(names.panel);

  // curved arrows while a motor moves
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xf07b2f, transparent: true, opacity: 0.95, depthWrite: false });
  const panArrow = { pos: arcArrow(9.0, 70, 0.16, arrowMat), neg: arcArrow(9.0, 70, 0.16, arrowMat) };
  panArrow.pos.rotation.y = -rad(160) + rad(8); panArrow.neg.scale.z = -1; panArrow.neg.rotation.y = rad(-20) - rad(8);
  for (const k of ["pos", "neg"]) { panArrow[k].position.y = 2.6; pan.add(panArrow[k]); panArrow[k].visible = false; }
  const tiltArrow = {};
  for (const k of ["pos", "neg"]) {
    const outer = new THREE.Group(), inner = arcArrow(4.7, 60, 0.13, arrowMat);
    if (k === "pos") inner.scale.z = -1;
    inner.rotation.y = k === "pos" ? rad(-30) : rad(30);
    const plane = new THREE.Group(); plane.rotation.z = Math.PI / 2; plane.add(inner);
    outer.add(plane); outer.position.set(-6.6, 0, 0); outer.visible = false; tilt.add(outer); tiltArrow[k] = outer;
  }


  // ---- clicking parts ----
  const parts = { light: [sens, names.light], pan: [mg, names.pan], tilt: [sg, names.tilt], panel: [panel, names.panel] };
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const outline = new THREE.BoxHelper(undefined, 0xf07b2f); outline.visible = false; outline.material.depthTest = false; outline.renderOrder = 9; scene.add(outline);
  let selected = null, dirty = true, lastSig = "";
  function pickAt(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    let best = null;
    for (const [id, objs] of Object.entries(parts)) {
      const hit = ray.intersectObjects(objs, true)[0];
      if (hit && (!best || hit.distance < best.d)) best = { id, d: hit.distance };
    }
    return best && best.id;
  }
  let down = null;
  renderer.domElement.addEventListener("pointerdown", e => { down = [e.clientX, e.clientY]; }, true);
  renderer.domElement.addEventListener("click", e => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;   // that was a drag, not a click
    const id = pickAt(e); view.select(id); onPick && onPick(id);
  });
  renderer.domElement.addEventListener("pointermove", e => { if (e.buttons === 0) renderer.domElement.style.cursor = pickAt(e) ? "pointer" : "grab"; });

  const seen = onScreen(host);
  new ResizeObserver(() => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true; }).observe(host);

  const view = {
    setRegion(region) { desert.buildRegion(region); dirty = true; },
    // No big motor connected: hide it and say so.
    setPanEnabled(on) {
      if (mg.visible === on) return;
      mg.visible = on; names.pan.userData.update(on ? "Big motor" : "Big motor · not connected"); dirty = true;
    },
    select(id) { selected = id || null; outline.visible = !!selected; dirty = true; },
    // v: { pan, tilt (servo angles), panDir, tiltDir, sun: { el, az } in the model's frame, light[4] 0..1 }
    update(v) {
      const sig = [v.pan.toFixed(2), v.tilt.toFixed(2), v.panDir, v.tiltDir, v.sun.el.toFixed(2), v.sun.az.toFixed(2), v.light.map(x => x.toFixed(1)).join()].join("|");
      if (sig === lastSig) return;
      lastSig = sig; dirty = true;
      pan.rotation.y = rad(v.pan);
      tilt.rotation.x = rad(v.tilt - 90);
      panArrow.pos.visible = v.panDir > 0; panArrow.neg.visible = v.panDir < 0;
      tiltArrow.pos.visible = v.tiltDir > 0; tiltArrow.neg.visible = v.tiltDir < 0;
      v.light.forEach((x, i) => { const g = clamp(x, 0, 1); ldrMats[i].emissive.setRGB(g * 0.95, g * 0.8, g * 0.3); });
      desert.setSun(v.sun.el, v.sun.az);
    },
    frame() {
      const moved = controls.update();
      if (!seen.visible || !(moved || dirty)) return;
      dirty = false;
      if (selected) outline.setFromObject(parts[selected][0]);
      renderer.render(scene, camera);
    },
  };
  view._debug = { camera, renderer, names, pickAt };   // for testing from the browser console
  return view;
}
