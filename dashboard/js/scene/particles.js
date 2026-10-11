// Weather particles: rain, snow, hail, dust and leaves, drawn around the tracker, landing on the panel.
//
//   const fx = createParticles(scene, { panelSurface, onDeposit });
//   fx.set(kind, intensity, wind)   kind 'none'|'rain'|'snow'|'hail'|'dust'|'leaves', intensity 0..1,
//                                   wind = {x, y, z} in metres per second (where the air goes,
//                                   x east, z south; weather.js windVec(sample) makes it)
//   fx.frame(dt)                    dt in seconds; moves everything and reports panel hits
//   fx.setSand(hex)                 dust colour from the region's ground sand (made a bit darker)
//
// panelSurface() -> { center, normal (THREE.Vector3), halfW, halfH, quadrantOf(worldPoint) -> 0..3 or -1 }
// onDeposit(kind, quadrant, amount): kind 'water' (rain), 'snow' (snow and hail), 'dust' or 'leaves'.
// Amounts are scaled so that a full-strength fall adds 1.0 per quadrant in deposit.seconds (see
// particles_kinds.js: dust 120 s, rain 60 s, leaves 131 s), whatever the panel size or particle
// count. The soiling module decides what that does; this file only reports hits.
//
// One THREE.Points per kind (max 6000 points), positions updated in a typed array each frame.
// Leaves are the exception: one InstancedMesh of 400 flat quads (particles_leaves.js), so they can
// tip and tumble in 3D.

import { KINDS, BOX } from "./particles_kinds.js";
import { makeMaterial, updateMaterial } from "./particles_shader.js";
import { makeLeafMesh, writeLeaves } from "./particles_leaves.js";

export const MAX_POINTS = 6000;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

export function createParticles(scene, { panelSurface = null, onDeposit = null } = {}) {
  const wind = { x: 0, y: 0, z: 0 }, windTarget = { x: 0, y: 0, z: 0 };
  const groups = {};
  let current = "none", t = 0;

  for (const [name, K] of Object.entries(KINDS)) {
    const N = Math.min(MAX_POINTS, K.max || MAX_POINTS);
    const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), ph = new Float32Array(N), aux = new Float32Array(N);
    for (let i = 0; i < N; i++) pos[i * 3 + 1] = -1e4;
    const P = { pos, vel, ph, aux, wind, t: 0 };
    let pts, posAttr = null;
    if (K.look.mesh) pts = makeLeafMesh(N, K);
    else {
      const size = new Float32Array(N), alpha = new Float32Array(N);
      for (let i = 0; i < N; i++) { size[i] = K.size(i); alpha[i] = K.alpha(i); }
      const geo = new THREE.BufferGeometry();
      posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute("position", posAttr);
      geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
      geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
      geo.setDrawRange(0, 0);
      const mat = makeMaterial(K.look.mode, K.look.color, K.look.opacity, BOX.half, !!K.look.lit);
      pts = new THREE.Points(geo, mat);
      pts.renderOrder = 5;
      pts.onBeforeRender = (renderer, sc, camera) => updateMaterial(mat, renderer, camera, K.look.mode === 0 ? K.vel(P) : null, sc);
    }
    pts.frustumCulled = false; pts.visible = false; pts.name = `weather-${name}`;
    const G = { name, K, N, pts, geo: pts.geometry, posAttr, mat: pts.material, P, target: 0, drawn: 0, alive: new Uint8Array(N), density: 0, intensity: 0 };
    scene.add(pts);
    groups[name] = G;
  }

  // Turn kinds on and off. Newly added particles start anywhere in the box (no falling curtain);
  // extra ones are not respawned, so a shower ends with the last drops landing.
  function set(kind, intensity = 1, w = null) {
    if (w) { windTarget.x = w.x || 0; windTarget.y = 0; windTarget.z = w.z || 0; }
    current = KINDS[kind] ? kind : "none";
    const level = clamp(intensity || 0, 0, 1);
    for (const G of Object.values(groups)) {
      G.intensity = G.name === current ? level : 0;
      const target = Math.round(G.N * G.intensity);
      for (let i = G.target; i < target; i++) if (!G.alive[i]) { G.K.spawn(G.P, i, true); G.alive[i] = 1; }
      G.target = target;
      if (target > G.drawn) G.drawn = target;
    }
  }

  // Reusable vectors for the panel hit test.
  const hit = new THREE.Vector3();
  const sums = { water: [0, 0, 0, 0], snow: [0, 0, 0, 0], dust: [0, 0, 0, 0], leaves: [0, 0, 0, 0] };

  function frame(dtIn) {
    const dt = clamp(dtIn || 0, 0, 0.1);
    if (dt <= 0) return;
    t += dt;
    const k = 1 - Math.exp(-dt * 1.5);   // wind eases toward its new value
    wind.x += (windTarget.x - wind.x) * k; wind.z += (windTarget.z - wind.z) * k;
    const surf = onDeposit && panelSurface ? panelSurface() : null;
    for (const G of Object.values(groups)) {
      if (G.drawn === 0) { G.pts.visible = false; continue; }
      G.pts.visible = true;
      G.P.t = t;
      stepGroup(G, dt, surf);
    }
    if (surf) flush();
  }

  function stepGroup(G, dt, surf) {
    const { K, P, alive } = G, pos = P.pos;
    let cx = 0, cy = 0, cz = 0, nx = 0, ny = 0, nz = 0, reach2 = -1, near = 0, perHit = 0, sum = null, R = 0;
    if (surf) {
      cx = surf.center.x; cy = surf.center.y; cz = surf.center.z; nx = surf.normal.x; ny = surf.normal.y; nz = surf.normal.z;
      R = Math.hypot(surf.halfW, surf.halfH) + 4;
      reach2 = (R + 25) * (R + 25);       // only particles this close are tested (and counted for density)
      // Hits per quadrant per second = density near the panel * quadrant area * speed into the panel.
      // Each hit is worth intensity / (seconds * that rate), using the bigger of two speeds: the one
      // a flat panel sees (falling plus wandering) and the one this panel sees. So a full-strength
      // fall covers a flat panel, or one facing into the wind, in deposit.seconds; a panel turned
      // edge-on or away gets fewer hits and so collects less.
      const v = K.vel(P), turb = 0.4 * (K.turb || 0);
      const flat = Math.max(0, -v.y) + turb, into = Math.max(0, -(v.x * nx + v.y * ny + v.z * nz)) + turb;
      const vEff = Math.max(flat, into);
      const area = surf.halfW * surf.halfH;    // one quadrant is a quarter of (2 halfW * 2 halfH)
      if (G.density > 1e-9) perHit = (K.deposit.gain || 1) * G.intensity / (K.deposit.seconds * G.density * area * vEff);
      sum = sums[K.deposit.as];
    }
    let last = -1;
    for (let i = 0; i < G.drawn; i++) {
      if (!alive[i]) continue;
      const j = i * 3;
      const x0 = pos[j], y0 = pos[j + 1], z0 = pos[j + 2];
      let ok = K.move(P, i, dt);
      if (reach2 > 0 && (!K.counts || K.counts(P, i))) {
        const dx = x0 - cx, dy = y0 - cy, dz = z0 - cz;
        if (dx * dx + dy * dy + dz * dz < reach2) {
          near++;
          const d0 = dx * nx + dy * ny + dz * nz;
          const d1 = (pos[j] - cx) * nx + (pos[j + 1] - cy) * ny + (pos[j + 2] - cz) * nz;
          // crossed the panel plane from the front, and not a wrap jump across the box
          if (d0 > 0 && d1 <= 0 && Math.abs(pos[j] - x0) < BOX.half && Math.abs(pos[j + 2] - z0) < BOX.half) {
            const f = d0 / (d0 - d1);
            hit.set(x0 + (pos[j] - x0) * f, y0 + (pos[j + 1] - y0) * f, z0 + (pos[j + 2] - z0) * f);
            const q = surf.quadrantOf(hit);
            if (q >= 0 && q < 4) { sum[q] += perHit; ok = false; }
          }
        }
      }
      if (!ok) {
        if (i < G.target) K.spawn(P, i, false);
        else { alive[i] = 0; pos[j + 1] = -1e4; continue; }
      }
      last = i;
    }
    G.drawn = Math.max(G.target, last + 1);
    if (G.posAttr) { G.geo.setDrawRange(0, G.drawn); G.posAttr.needsUpdate = true; }
    else writeLeaves(G, BOX.half);
    if (reach2 > 0) {
      // particles per cm3 near the panel, smoothed over about a second (the part of the ball
      // below the ground holds no particles, so it is left out of the volume)
      const r = R + 25, h = clamp(r - cy, 0, 2 * r);
      const vol = (4 / 3) * Math.PI * r * r * r - Math.PI * h * h * (3 * r - h) / 3;
      G.density = G.density ? G.density + (near / vol - G.density) * Math.min(1, dt * 2) : near / vol;
    }
  }

  function flush() {
    for (const [kind, q] of Object.entries(sums)) {
      for (let i = 0; i < 4; i++) if (q[i] > 0) { onDeposit(kind, i, q[i]); q[i] = 0; }
    }
  }

  function dispose() {
    for (const G of Object.values(groups)) { scene.remove(G.pts); G.geo.dispose(); G.mat.map?.dispose(); G.mat.dispose(); }
  }

  // Dust takes the colour of the ground sand, a little darker (call on region change).
  function setSand(hex) { groups.dust.mat.uniforms.uColor.value.set(hex).multiplyScalar(0.8); }

  return { set, frame, dispose, setSand, get kind() { return current; }, groups };
}
