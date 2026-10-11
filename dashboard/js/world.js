// The simulated room, torch and hardware: everything the Arduino cannot see directly.
// Physics used:
//  - GL5528 LDR: R = R10 * (lux / 10) ^ -0.7, R10 about 15 kΩ (datasheet 10-20 kΩ at 10 lux),
//    each part different by up to ±20 %. Response lag: 20 ms getting brighter, 30 ms getting darker.
//  - 10 kΩ divider to the ADC: counts = 1023 * 10k / (10k + R), plus ±2 counts noise.
//  - Shadow cross: a vane 12 mm tall, each LDR centre 3 mm from it. Light from one side
//    shades the LDRs on the other side by shadow length = vane height * tan(angle).
//  - Torch light on a surface falls with the cosine of the angle to its normal (Lambert's law).
//  - MG996R 360: speed follows the pulse offset (dead band ±40 µs, flat out past ±400 µs,
//    about 280 °/s at 5 V); it coasts when the signal is switched off.
//  - SG-90: goes to the commanded angle at up to about 500 °/s.
//  - Solar cell (0.7 W, 5.5 V): short-circuit current about 150 mA in full sun (≈110 000 lux),
//    so I ≈ 150 mA * lux / 110000 into the 220 Ω load, capped by its open-circuit voltage.
import { CFG, panSpeedFrac } from "./logic.js";

export const ROOMS = [
  { id: "dark", name: "Dark room", lux: 8 },
  { id: "dim", name: "Dim room (evening lamp)", lux: 60 },
  { id: "home", name: "Normal room", lux: 150 },
  { id: "office", name: "Bright office", lux: 500 },
  { id: "window", name: "Next to a window", lux: 2000 },
];

const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const dirFrom = (azDeg, elDeg) => [Math.sin(rad(azDeg)) * Math.cos(rad(elDeg)), Math.sin(rad(elDeg)), Math.cos(rad(azDeg)) * Math.cos(rad(elDeg))];

const VANE_H = 1.2, LDR_D = 0.3, LDR_R = 0.255;   // cm
const PAN_TRUE_DPS = 280, TILT_MAX_DPS = 500;

// Panel frame from the servo angles. Pan turns about the vertical axis (+ turns the front toward +x).
// Tilt servo 90 = panel facing straight up; 180 = facing the front horizontally; 0 = facing the back.
export function panelFrame(panDeg, tiltServo) {
  const p = rad(panDeg), t = rad(tiltServo - 90);
  const rot = v => [v[0] * Math.cos(p) + v[2] * Math.sin(p), v[1], -v[0] * Math.sin(p) + v[2] * Math.cos(p)];
  return {
    n: rot([0, Math.cos(t), Math.sin(t)]),    // where the panel faces
    u: rot([1, 0, 0]),                        // the sensor's "left" side (TL, BL)
    v: rot([0, -Math.sin(t), Math.cos(t)]),   // the sensor's "top" side (TL, TR)
  };
}

// Fraction of an LDR left uncovered by the vane's shadow for light at angle theta off the panel axis.
function lit(tanTheta) {
  const shadow = VANE_H * Math.abs(tanTheta);
  return 1 - clamp((shadow - (LDR_D - LDR_R)) / (2 * LDR_R), 0, 1);
}

export function createWorld(seed = 7) {
  let rnd = seed;
  const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
  const w = {
    t: 0, roomLux: 150, roomDrift: 0, bounce: 0.04,   // bounce: share of the torch light reflected back by walls
    torch: { on: true, az: 55, el: 40, lux: 2500 },
    pan: 0, panSpeed: 0, tilt: 90, tiltCmd: 90,
    r10: [0, 1, 2, 3].map(() => 15000 * (0.8 + 0.4 * rand())),
    luxEff: [150, 150, 150, 150], ldrLux: [0, 0, 0, 0],
    cellLux: 0,
  };

  // Light on each LDR (lux) and on the solar cell, from the room and the torch.
  function lightNow() {
    const f = panelFrame(w.pan, w.tilt), room = w.roomLux * (1 + w.roomDrift);
    const out = [room, room, room, room];
    let cell = room;
    if (w.torch.on && w.torch.lux > 0) {
      const L = dirFrom(w.torch.az, w.torch.el), ln = dot(L, f.n), lu = dot(L, f.u), lv = dot(L, f.v);
      const diffuse = w.bounce * w.torch.lux;   // light bounced off the table and walls
      for (let i = 0; i < 4; i++) out[i] += diffuse;
      cell += diffuse;
      if (ln > 0) {
        const left = i => i === 0 || i === 2, top = i => i === 0 || i === 1;
        for (let i = 0; i < 4; i++) {
          // light from the left (lu > 0) shades the right-hand LDRs, light from above shades the bottom ones
          const shadeU = (lu > 0) !== left(i) ? lit(lu / ln) : 1;
          const shadeV = (lv > 0) !== top(i) ? lit(lv / ln) : 1;
          out[i] += w.torch.lux * ln * shadeU * shadeV;
        }
        cell += w.torch.lux * ln;
      }
    }
    w.cellLux = cell;
    return out;
  }

  return Object.assign(w, {
    rand,
    step(dtMs, out) {
      const dt = dtMs / 1000;
      w.t += dtMs;
      // pan servo: speed follows the pulse; with the signal off it coasts to a stop
      if (out.panPulse) {
        const off = out.panPulse - CFG.PAN_STOP_US;
        const target = Math.sign(off) * PAN_TRUE_DPS * panSpeedFrac(off);
        w.panSpeed += (target - w.panSpeed) * (1 - Math.exp(-dtMs / 50));
      } else w.panSpeed *= Math.exp(-dtMs / 80);
      w.pan += w.panSpeed * dt;
      // tilt servo: moves toward the command at its top speed
      w.tiltCmd = out.tiltAngle;
      w.tilt += clamp(w.tiltCmd - w.tilt, -TILT_MAX_DPS * dt, TILT_MAX_DPS * dt);
      // LDRs respond with a short lag
      w.ldrLux = lightNow();
      for (let i = 0; i < 4; i++) {
        const tau = w.ldrLux[i] > w.luxEff[i] ? 20 : 30;
        w.luxEff[i] += (w.ldrLux[i] - w.luxEff[i]) * (1 - Math.exp(-dtMs / tau));
      }
    },
    readLdr(i) { return Math.round(clamp(w.countsAt(i, w.luxEff[i]) + (rand() * 4 - 2), 0, 1023)); },
    // What LDR i reads (no noise) under a given light, through the 10k divider.
    countsAt(i, lux) { const r = w.r10[i] * Math.pow(Math.max(lux, 0.05) / 10, -0.7); return 1023 * 10000 / (10000 + r); },
    // Power of the 0.7 W panel (at its best load) facing normal n, in sunlight: beam on its face plus sky.
    panelW(n, sun) {
      const L = dirFrom(sun.az, sun.el), c = Math.max(0, dot(L, n));
      return 0.7 * (sun.dni * c + sun.dhi * (1 + n[1]) / 2) / 1000;
    },
    readAll() { return [0, 1, 2, 3].map(i => w.readLdr(i)); },
    settle() { w.ldrLux = lightNow(); w.luxEff = w.ldrLux.slice(); },
    // Solar cell into 220 Ω, then the 10k/10k divider, read on A4.
    cell() {
      const isc = 0.150 * w.cellLux / 110000, v = Math.min(isc * 220, 6.2);
      return { v, counts: Math.round(clamp(v / CFG.CELL_DIVIDER / 5 * 1023, 0, 1023)) };
    },
    // True aim error (the real tracker cannot know this; the simulation can).
    aim() {
      const f = panelFrame(w.pan, w.tilt), L = dirFrom(w.torch.az, w.torch.el);
      const c = clamp(dot(L, f.n), -1, 1);
      return { errDeg: deg(Math.acos(c)), cos: Math.max(0, c) };
    },
  });
}
