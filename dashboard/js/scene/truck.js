// The story's pickup truck. Units are cm, +x east, +z south. Parts are in truck_parts.js.
// createTruck(scene, { heightAt }) -> { place, driveTo, openBack, closeBack, frame, remove, setGround,
//   setScale, setLights(0..1), loadCrates(kinds), takeCrate(), toWorld(x, z), position, moving,
//   speed, engineLevel, group }
// The nose points along local +x; it turns toward where it drives, the wheels roll, the body
// pitches a little when it speeds up or slows down, and dust puffs rise behind the back wheels.
import { buildTruck, WHEEL_R, AXLE_R, HALF_W, BED_Y } from "./truck_parts.js";
import { createDust } from "./truck_dust.js";
import { makeProp } from "./people_geo.js";

export function createTruck(scene, { heightAt } = {}) {
  const THREE = window.THREE;
  let ground = heightAt || (() => 0);
  const group = new THREE.Group(); group.name = "truck";      // on the ground, turned by heading
  const body = new THREE.Group(); group.add(body);             // bobs and pitches while driving
  const { mat, gate, wheels, beam } = buildTruck(body, group);
  const dust = createDust(scene);
  const st = { x: 400, z: 0, heading: Math.PI, want: Math.PI, move: null, gate: 0, gateWant: 0, rolled: 0, added: false, speed: 0, accel: 0, scale: 1, puff: 0 };
  let crates = [];
  const tmp = new THREE.Vector3();

  function show() { if (!st.added) { scene.add(group); st.added = true; } }
  function sync() {
    group.position.set(st.x, ground(st.x, st.z), st.z);
    group.rotation.y = st.heading;
  }
  // heading: radians, 0 = nose to +x (east), PI/2 = nose to -z (north)
  function place(pos, heading = st.heading) {
    if (st.move) { const r = st.move.resolve; st.move = null; r(); }
    st.x = pos.x; st.z = pos.z; st.heading = st.want = heading; st.speed = 0;
    show(); sync();
  }
  function driveTo(pos, seconds = 4) {
    show();
    if (st.move) st.move.resolve();
    const dx = pos.x - st.x, dz = pos.z - st.z;
    if (Math.hypot(dx, dz) < 0.01) return Promise.resolve();
    st.want = Math.atan2(-dz, dx);
    return new Promise(resolve => { st.move = { x0: st.x, z0: st.z, x1: pos.x, z1: pos.z, t: 0, dur: Math.max(0.3, seconds), resolve }; });
  }

  // local truck point (x along the nose, z to its right side) to world {x, z}
  function toWorld(x, z, y = 0) {
    group.updateMatrixWorld(true);
    tmp.set(x, y, z); group.localToWorld(tmp);
    return { x: tmp.x, y: tmp.y, z: tmp.z };
  }

  // crates in the bed, from the cab back to the tailgate: kinds like ['crate', 'crate', 'panelBox']
  function loadCrates(kinds = ["crate", "crate", "panelBox"]) {
    for (const c of crates) c.parent?.remove(c);
    crates = kinds.map((k, i) => {
      const m = makeProp(k), h = k === "panelBox" ? 1.2 : 3.6;
      m.position.set(-8.2 - i * 5.8, BED_Y + h / 2, 0);
      m.rotation.y = (i % 2 ? 0.06 : -0.04);
      body.add(m);
      return m;
    });
    return crates.length;
  }
  // take the crate nearest the tailgate out of the bed (the caller gives it to a person)
  function takeCrate() {
    const m = crates.pop();
    if (!m) return null;
    body.remove(m);
    return m;
  }

  function frame(dt) {
    if (!st.added) { dust.frame(dt); return; }
    dt = Math.min(dt, 0.1);
    let moved = 0;
    if (st.move) {
      const m = st.move;
      m.t += dt;
      const u = Math.min(1, m.t / m.dur), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      const nx = m.x0 + (m.x1 - m.x0) * e, nz = m.z0 + (m.z1 - m.z0) * e;
      moved = Math.hypot(nx - st.x, nz - st.z);
      st.x = nx; st.z = nz;
      if (u >= 1) { st.move = null; m.resolve(); }
    }
    let d = st.want - st.heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    st.heading += d * (1 - Math.exp(-5 * dt));
    const S = st.scale, speed = moved / Math.max(dt, 1e-4);
    st.accel += ((speed - st.speed) / Math.max(dt, 1e-4) - st.accel) * (1 - Math.exp(-6 * dt));
    st.speed = speed;
    st.rolled += moved;
    for (const w of wheels) w.rotation.z = -st.rolled / (WHEEL_R * S);
    const k = Math.min(1, speed / (60 * S));
    body.position.y = 0.22 * k * Math.sin(st.rolled / S * 0.5);
    const pitch = Math.max(-0.03, Math.min(0.03, st.accel / (4000 * S)));
    body.rotation.z += (pitch - body.rotation.z) * (1 - Math.exp(-5 * dt));
    st.gate += (st.gateWant - st.gate) * (1 - Math.exp(-4 * dt));
    gate.rotation.z = st.gate;
    sync();
    // dust behind the back wheels
    if (speed > 6 * S) {
      st.puff += dt * Math.min(36, speed / S * 0.3);
      while (st.puff >= 1) {
        st.puff -= 1;
        const side = Math.random() < 0.5 ? 1 : -1, p = toWorld(AXLE_R - 3, side * (HALF_W - 1.7), 0.6);
        dust.emit(p.x, p.y, p.z, S);
      }
    }
    dust.frame(dt);
  }

  dust.setViewport(window.innerHeight * Math.min(1.5, window.devicePixelRatio || 1));
  window.addEventListener("resize", () => dust.setViewport(window.innerHeight * Math.min(1.5, window.devicePixelRatio || 1)));

  return {
    group, place, driveTo, frame, toWorld, loadCrates, takeCrate,
    openBack() { st.gateWant = Math.PI / 2; },     // the tailgate folds down backward
    closeBack() { st.gateWant = 0; },
    setLights(level) {
      const v = Math.max(0, Math.min(1, level || 0));
      mat.head.emissiveIntensity = 0.15 + 1.6 * v;
      mat.tail.emissiveIntensity = 0.25 + 0.9 * v;
      mat.beam.opacity = 0.14 * v; beam.visible = v > 0.02;
    },
    setScale(s) { st.scale = s > 0 ? s : 1; group.scale.setScalar(st.scale); },
    setDustColor(c) { dust.setColor(c); },
    remove() {
      if (st.move) { const r = st.move.resolve; st.move = null; r(); }
      st.gate = st.gateWant = 0; gate.rotation.z = 0; st.speed = 0;
      for (const c of crates) c.parent?.remove(c);
      crates = [];
      dust.clear();
      if (st.added) { scene.remove(group); st.added = false; }
    },
    setGround(fn) { ground = fn || (() => 0); },
    get position() { return { x: st.x, z: st.z }; },
    get moving() { return !!st.move; },
    get speed() { return st.speed / st.scale; },
    // 0..1 for the engine sound: quiet idle when parked, louder with speed
    get engineLevel() { return st.added ? (st.move ? 0.3 + 0.7 * Math.min(1, st.speed / st.scale / 120) : 0) : 0; },
  };
}
