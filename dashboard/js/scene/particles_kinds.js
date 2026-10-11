// How each weather particle looks and moves. Units: cm and seconds. +x east, +y up, +z south.
// Every kind lives in a box about 1.5 m across centred on the tracker (the origin). A particle that
// hits the ground or leaves the box is put back at the top (or on the upwind side for dust).
//
// Each kind gives:
//   look:    shader mode, colour, opacity (and max: fewer points than the default 6000);
//            or look.mesh = 'leaf' for flat leaves drawn as an InstancedMesh (particles_leaves.js)
//   deposit: what a hit on the panel adds to ('water', 'snow', 'dust', 'leaves') and how many seconds a
//            full-strength fall needs to cover a clean panel
//   size(i), alpha(i):   per particle, set once
//   spawn(P, i, fresh):  put particle i at a start position (fresh = anywhere in the box)
//   move(P, i, dt):      move it, return false when it must be spawned again
//   vel(P):              the typical velocity, for the panel hit maths and the streak direction
//   turb:                how fast it wanders about on its own (cm per s), also for the hit maths
//   counts(P, i):        optional; false for particles that never land on the panel (haze puffs,
//                        hail after its bounce), so they are left out of the hit maths
// P is the shared state: pos, vel, ph and aux arrays, wind (m per s), t (seconds).

import { MODE } from "./particles_shader.js";

export const BOX = { half: 75, top: 110 };
const H = BOX.half;
const rnd = Math.random;

// Put x and z back inside the box from the other side (wind carries particles out).
function wrap(pos, j) {
  for (const k of [j, j + 2]) {
    if (pos[k] > H) pos[k] -= 2 * H;
    else if (pos[k] < -H) pos[k] += 2 * H;
  }
}

function topSpawn(P, i, fresh, yMin = 0) {
  const j = i * 3;
  P.pos[j] = (rnd() * 2 - 1) * H;
  P.pos[j + 2] = (rnd() * 2 - 1) * H;
  P.pos[j + 1] = fresh ? yMin + rnd() * (BOX.top - yMin) : BOX.top + rnd() * 10;
}

export const KINDS = {
  rain: {
    look: { mode: MODE.streak, color: 0x6f8aa6, opacity: 0.75 },
    deposit: { as: "water", seconds: 60 },
    drift: 35,
    size: () => 5 + rnd() * 4, alpha: () => 0.5 + rnd() * 0.5,
    spawn(P, i, fresh) { topSpawn(P, i, fresh); P.vel[i * 3 + 1] = -(520 + rnd() * 160); },
    move(P, i, dt) {
      const j = i * 3, p = P.pos;
      p[j] += P.wind.x * this.drift * dt;
      p[j + 1] += P.vel[j + 1] * dt;
      p[j + 2] += P.wind.z * this.drift * dt;
      wrap(p, j);
      return p[j + 1] > 0;
    },
    vel(P) { return { x: P.wind.x * this.drift, y: -600, z: P.wind.z * this.drift }; },
  },

  snow: {
    look: { mode: MODE.dot, color: 0xffffff, opacity: 0.95 },
    deposit: { as: "snow", seconds: 180 },
    drift: 30, turb: 14,
    size: () => 0.5 + rnd() * 0.5, alpha: () => 0.7 + rnd() * 0.3,
    spawn(P, i, fresh) { topSpawn(P, i, fresh); P.vel[i * 3 + 1] = -(45 + rnd() * 35); P.ph[i] = rnd() * 6.283; },
    move(P, i, dt) {
      const j = i * 3, p = P.pos, ph = P.ph[i], t = P.t;
      p[j] += (P.wind.x * this.drift + Math.sin(t * 1.3 + ph) * 14) * dt;
      p[j + 1] += P.vel[j + 1] * dt;
      p[j + 2] += (P.wind.z * this.drift + Math.cos(t * 1.1 + ph * 1.7) * 14) * dt;
      wrap(p, j);
      return p[j + 1] > 0;
    },
    vel(P) { return { x: P.wind.x * this.drift, y: -62, z: P.wind.z * this.drift }; },
  },

  hail: {
    max: 2500,   // hail is sparse; 6000 balls looks like a carpet
    look: { mode: MODE.ball, color: 0xf4f7fb, opacity: 1 },
    deposit: { as: "snow", seconds: 240, gain: 0.68 },   // gain: measured, hail hits come out about 1.5x the estimate
    drift: 18,
    size: () => 0.5 + rnd() * 0.6, alpha: () => 1,
    spawn(P, i, fresh) {
      topSpawn(P, i, fresh);
      const j = i * 3;
      P.vel[j] = 0; P.vel[j + 1] = -(700 + rnd() * 200); P.vel[j + 2] = 0; P.ph[i] = 0;   // ph = bounced yet
    },
    move(P, i, dt) {
      const j = i * 3, p = P.pos, v = P.vel;
      if (P.ph[i]) v[j + 1] -= 981 * dt;   // after the bounce gravity takes over
      p[j] += (P.wind.x * this.drift + v[j]) * dt;
      p[j + 1] += v[j + 1] * dt;
      p[j + 2] += (P.wind.z * this.drift + v[j + 2]) * dt;
      wrap(p, j);
      if (p[j + 1] <= 0) {
        if (P.ph[i]) return false;
        // a small bounce: up a few cm, a little sideways
        P.ph[i] = 1; p[j + 1] = 0.01;
        v[j + 1] = 60 + rnd() * 90; v[j] = (rnd() - 0.5) * 60; v[j + 2] = (rnd() - 0.5) * 60;
      }
      return true;
    },
    counts: (P, i) => !P.ph[i],
    vel(P) { return { x: P.wind.x * this.drift, y: -800, z: P.wind.z * this.drift }; },
  },

  // Dust: every 10th point is a big, very faint haze puff, the rest are small grains near the ground.
// The sky haze from the weather sample does most of the storm look; these add motion.
  dust: {
    look: { mode: MODE.haze, color: 0x9e7b4f, opacity: 1, lit: true },   // lit like the ground; setSand() recolours it
    deposit: { as: "dust", seconds: 120 },
    drift: 40, grainTop: 45, turb: 25,
    isPuff: i => i % 10 === 0,
    counts: (P, i) => i % 10 !== 0,
    size(i) { return this.isPuff(i) ? 30 + rnd() * 30 : 0.3 + rnd() * 0.4; },     // grains are drawn 1 to 3 px anyway
    alpha(i) { return this.isPuff(i) ? 0.03 + rnd() * 0.05 : 0.25 + rnd() * 0.25; },
    spawn(P, i, fresh) {
      const j = i * 3, puff = this.isPuff(i), w = P.wind, ws = Math.hypot(w.x, w.z);
      const yTop = puff ? 95 : this.grainTop;
      P.pos[j + 1] = puff ? 4 + rnd() * yTop : 0.3 + yTop * rnd() * rnd();   // grains crowd near the ground
      if (fresh || ws < 0.3) {
        P.pos[j] = (rnd() * 2 - 1) * H; P.pos[j + 2] = (rnd() * 2 - 1) * H;
      } else {
        // come in on the upwind edge of the box
        const s = (rnd() * 2 - 1) * H, ux = -w.x / ws, uz = -w.z / ws;
        if (Math.abs(ux) > Math.abs(uz)) { P.pos[j] = Math.sign(ux) * H; P.pos[j + 2] = s; }
        else { P.pos[j + 2] = Math.sign(uz) * H; P.pos[j] = s; }
      }
      P.vel[j] = 0.7 + rnd() * 0.6;              // own speed factor
      P.vel[j + 1] = (rnd() - 0.5) * 30;          // up and down wander
      P.ph[i] = rnd() * 6.283;
    },
    move(P, i, dt) {
      const j = i * 3, p = P.pos, ph = P.ph[i], t = P.t, f = P.vel[j], puff = this.isPuff(i);
      const gustK = 1 + 0.35 * Math.sin(t * 2.3 + p[j] * 0.03);           // gusts roll through
      const k = this.drift * f * gustK * (puff ? 0.8 : 1);
      p[j] += (P.wind.x * k + Math.sin(t * 3.1 + ph) * 18) * dt;
      p[j + 2] += (P.wind.z * k + Math.cos(t * 2.7 + ph * 1.3) * 18) * dt;
      p[j + 1] += (P.vel[j + 1] + Math.sin(t * 2.0 + ph * 3.0) * 22 - (puff ? 0 : 6)) * dt;
      if (p[j + 1] < 0.3) { p[j + 1] = 0.3; P.vel[j + 1] = 10 + rnd() * 40; }   // grains hop off the sand
      else if (p[j + 1] > (puff ? 100 : this.grainTop)) P.vel[j + 1] = -Math.abs(P.vel[j + 1]);
      return Math.abs(p[j]) <= H && Math.abs(p[j + 2]) <= H;
    },
    vel(P) { return { x: P.wind.x * this.drift, y: -6, z: P.wind.z * this.drift }; },
  },

  // Leaves: flat, 2 to 3.5 cm, falling slowly (20 to 40 cm per s) in a side to side zigzag, tipping
  // toward the way they swing like a real falling leaf; every 4th one tumbles end over end instead.
  // They come in from the top and the upwind side (shares set by how many cross each face, so the
  // box stays evenly filled), lie on the ground a moment, then start again. Drawn by
  // particles_leaves.js. Per leaf: vel = [swing speed (rad/s), fall speed, swing heading], ph = phase,
  // aux = seconds left lying on the ground (0 = falling).
  leaves: {
    max: 400,
    look: { mesh: "leaf" },
    deposit: { as: "leaves", seconds: 131 },   // 2 min at full strength adds 0.92: 1 - e^-0.92 = 0.6 cover
    drift: 12, turb: 0, sway: 16,   // turb 0: the sway is sideways, it adds no hits on a flat panel
    size: () => 2 + rnd() * 1.5, alpha: () => 1,   // cm long; the hit maths uses the leaf centre, so size does not change the deposit rate
    counts: (P, i) => !(P.aux[i] > 0),
    spawn(P, i, fresh) {
      const j = i * 3, p = P.pos, hx = P.wind.x * this.drift, hz = P.wind.z * this.drift, fall = 30;
      P.vel[j] = 2.5 + rnd() * 2; P.vel[j + 1] = -(20 + rnd() * 20); P.vel[j + 2] = rnd() * 6.283;
      P.ph[i] = rnd() * 6.283; P.aux[i] = 0;
      p[j] = (rnd() * 2 - 1) * H; p[j + 2] = (rnd() * 2 - 1) * H;
      if (fresh) { p[j + 1] = 2 + rnd() * (BOX.top - 2); return; }
      // which face: the top, or the upwind x or z side, in proportion to the leaves crossing it
      const top = 4 * H * H * fall, sx = 2 * H * BOX.top * Math.abs(hx), sz = 2 * H * BOX.top * Math.abs(hz);
      const r = rnd() * (top + sx + sz);
      if (r < top) p[j + 1] = BOX.top + rnd() * 5;
      else {
        p[j + 1] = 2 + rnd() * (BOX.top - 2);
        if (r < top + sx) p[j] = -Math.sign(hx) * H * 0.999; else p[j + 2] = -Math.sign(hz) * H * 0.999;
      }
    },
    move(P, i, dt) {
      if (P.aux[i] > 0) { P.aux[i] -= dt; return P.aux[i] > 0; }   // lying on the ground
      const j = i * 3, p = P.pos, a = P.ph[i] + P.t * P.vel[j], hd = P.vel[j + 2], c = Math.cos(a);
      const sw = i % 4 === 0 ? 0.3 * this.sway : this.sway * c;   // tumblers hardly swing
      p[j] += (P.wind.x * this.drift + sw * Math.cos(hd)) * dt;
      p[j + 2] += (P.wind.z * this.drift + sw * Math.sin(hd)) * dt;
      // falls fastest through the middle of a swing, slows at the ends (mean = its own fall speed)
      p[j + 1] += P.vel[j + 1] * (i % 4 === 0 ? 1 : 0.4 + 1.2 * c * c) * dt;
      if (p[j + 1] <= 0.05) { p[j + 1] = 0.05; P.aux[i] = 1.5 + rnd() * 2; return true; }
      return Math.abs(p[j]) <= H && Math.abs(p[j + 2]) <= H;
    },
    // the leaf's turn now (Euler order YZX on a leaf lying in x-z with its long side along x)
    turn(P, i, t, e) {
      const j = i * 3, a = P.ph[i] + t * P.vel[j], hd = P.vel[j + 2];
      if (P.aux[i] > 0) return e.set(0, -hd, 0);                                    // flat on the ground
      if (i % 4 === 0) return e.set(0.4 * Math.sin(a * 0.7), -hd, a * 1.6);          // end over end
      return e.set(0.35 * Math.sin(a * 2 + 1), -hd + 0.4 * Math.sin(0.5 * a), 0.75 * Math.sin(a));   // tip with the swing
    },
    // y: slow leaves stay longer in the box, so the mean fall speed of the leaves in it is the
    // harmonic mean of 20..40 cm/s (20 / ln 2 = 29), not 30
    vel(P) { return { x: P.wind.x * this.drift, y: -29, z: P.wind.z * this.drift }; },
  },
};
