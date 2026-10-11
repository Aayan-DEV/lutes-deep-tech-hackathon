// The story people: spawn, walk, carry, hold a tool, act, turn. Units are cm, +x east, +z south.
// createPeople(scene, { heightAt }) -> { spawn, walkTo, carry, hold, act, face, place, frame, remove,
//   setGround, setScale, count, position(i), onStep }
// Each person is one skinned mesh (people_rig.js) posed by people_anim.js. The ground height comes
// from heightAt(x, z), so feet stay on the sand. setScale(s) sizes them with the tracker.
// act(i, kind): 'idle' | 'wave' | 'kneel' | 'crouch' | 'work' | 'tablet' | 'point' | 'highfive'.
import { buildPerson } from "./people_rig.js";
import { poseTarget, applyPose, restPose } from "./people_anim.js";
import { makeProp } from "./people_geo.js";

const STEP = 6.6;   // ground covered per step (cm, at scale 1) at a normal walk

export function createPeople(scene, { heightAt } = {}) {
  let ground = heightAt || (() => 0);
  let list = [], t = 0, scale = 1;
  const api = { onStep: null };

  function make(i, x, z, heading) {
    const rig = buildPerson(i);
    rig.root.scale.setScalar(scale);
    scene.add(rig.root);
    const s = { rig, x, z, heading, want: heading, walk: null, act: "idle", actT: 0, phase: 0, swing: 0, carrying: null, held: { L: null, R: null }, seed: i * 1.7, cur: restPose() };
    list.push(s);
    place(list.length - 1, { x, z }, heading);
    return list.length - 1;
  }

  // spawn(n, at): at is {x, z} (they stand in a short row there) or an array of {x, z, heading}.
  function spawn(n, at = { x: 0, z: 0 }) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const p = Array.isArray(at) ? (at[k] || at[at.length - 1]) : { x: at.x + (k - (n - 1) / 2) * 6 * scale, z: at.z };
      out.push(make(list.length, p.x, p.z, p.heading ?? 0));
    }
    return out;
  }

  function place(i, pos, headingRad) {
    const s = list[i]; if (!s) return;
    s.x = pos.x; s.z = pos.z;
    if (headingRad !== undefined) s.heading = s.want = headingRad;
    s.rig.root.position.set(s.x, ground(s.x, s.z), s.z);
    s.rig.root.rotation.y = s.heading;
  }

  // Walk in a straight line to pos in about `seconds`. Resolves on arrival (or at once when the
  // person is gone or remove() is called).
  function walkTo(i, pos, seconds = 2) {
    const s = list[i];
    if (!s) return Promise.resolve();
    if (s.walk) s.walk.resolve();
    const dx = pos.x - s.x, dz = pos.z - s.z, dist = Math.hypot(dx, dz);
    if (dist < 0.01) return Promise.resolve();
    if (s.act !== "idle" && s.act !== "tablet") setAct(s, "idle");
    return new Promise(resolve => {
      s.walk = { x0: s.x, z0: s.z, x1: pos.x, z1: pos.z, t: 0, dur: Math.max(0.2, seconds), dist, resolve };
      s.want = Math.atan2(dx, dz);
    });
  }

  // Hold an object in front of the chest with both hands (null puts it down and returns it).
  function carry(i, obj) {
    const s = list[i]; if (!s) return null;
    const old = s.carrying;
    if (old && old !== obj) old.parent?.remove(old);
    s.carrying = obj || null;
    if (obj) { obj.position.set(0, 0, 0); obj.rotation.set(0, 0, 0); obj.scale.setScalar(1); s.rig.chest.add(obj); }
    return old;
  }

  // Put a small thing in one hand: hold(i, 'screwdriver' | 'tablet' | 'clipboard' | Object3D | null, 'R' | 'L')
  function hold(i, what, hand = "R") {
    const s = list[i]; if (!s) return null;
    const grip = hand === "L" ? s.rig.gripL : s.rig.gripR;
    if (s.held[hand]) grip.remove(s.held[hand]);
    let obj = what;
    if (typeof what === "string") {
      obj = makeProp(what);
      if (what === "screwdriver") obj.rotation.set(0.35, 0, 0);
      if (what === "tablet" || what === "clipboard") { obj.rotation.set(-0.35, 0, 0); obj.position.set(0, -0.1, 0.25); }
    }
    s.held[hand] = obj || null;
    if (obj) grip.add(obj);
    return obj;
  }

  function setAct(s, kind) { if (s.act !== kind) { s.act = kind; s.actT = t; } }
  function act(i, kind) { const s = list[i]; if (s) setAct(s, kind || "idle"); }

  // Turn to face a point {x, z} or an angle in radians.
  function face(i, target) {
    const s = list[i]; if (!s) return;
    s.want = typeof target === "number" ? target : Math.atan2(target.x - s.x, target.z - s.z);
  }

  function frame(dt) {
    dt = Math.min(dt, 0.1); t += dt;
    const k = 1 - Math.exp(-12 * dt), kTurn = 1 - Math.exp(-7 * dt);
    for (const s of list) {
      let speed = 0;
      if (s.walk) {
        const w = s.walk;
        w.t += dt;
        const u = Math.min(1, w.t / w.dur), e = ease(u);
        const nx = w.x0 + (w.x1 - w.x0) * e, nz = w.z0 + (w.z1 - w.z0) * e;
        const moved = Math.hypot(nx - s.x, nz - s.z) / scale;
        speed = moved / Math.max(dt, 1e-4);
        const before = Math.floor(s.phase / Math.PI);
        s.phase += Math.PI * moved / Math.max(2.4, STEP * Math.min(1, s.swing / 0.5 + 0.25));
        if (Math.floor(s.phase / Math.PI) !== before && api.onStep) api.onStep(s);
        s.x = nx; s.z = nz;
        if (u >= 1) { s.walk = null; w.resolve(); }
      }
      s.swing += (Math.min(0.5, speed / 26) - s.swing) * (1 - Math.exp(-6 * dt));
      if (!s.walk && s.swing < 0.05) s.phase += (Math.round(s.phase / Math.PI) * Math.PI - s.phase) * k;   // settle the feet
      let d = s.want - s.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      s.heading += d * kTurn;
      s.rig.root.position.set(s.x, ground(s.x, s.z), s.z);
      s.rig.root.rotation.y = s.heading;
      applyPose(s.rig, s.cur, poseTarget(s, t), k);
    }
  }

  function remove() {
    for (const s of list) {
      if (s.walk) { const r = s.walk.resolve; s.walk = null; r(); }
      scene.remove(s.rig.root);
      s.rig.mesh.geometry.dispose();
      s.rig.mesh.skeleton?.dispose?.();
    }
    list = [];
  }

  return Object.assign(api, {
    spawn, walkTo, carry, hold, act, face, place, frame, remove,
    setGround(fn) { ground = fn || (() => 0); },
    setScale(v) { scale = v > 0 ? v : 1; for (const s of list) s.rig.root.scale.setScalar(scale); },
    get scale() { return scale; },
    get count() { return list.length; },
    position(i) { const s = list[i]; return s ? { x: s.x, z: s.z } : null; },
    hand(i, side = "R") { const s = list[i]; if (!s) return null; const v = new window.THREE.Vector3(); (side === "L" ? s.rig.gripL : s.rig.gripR).getWorldPosition(v); return v; },
  });
}

// gentle start and stop, steady in the middle
function ease(u) {
  const a = 0.18, v = 1 / (1 - a);
  if (u < a) return 0.5 * v * u * u / a;
  if (u > 1 - a) { const r = 1 - u; return 1 - 0.5 * v * r * r / a; }
  return 0.5 * v * a + v * (u - a);
}
