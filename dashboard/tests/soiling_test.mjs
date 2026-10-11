// Dust, the cleaning routine and the soiling model together, headless.
// Usage: node dashboard/tests/soiling_test.mjs
// The controller (logic.js, the Arduino's exact copy) sees the simulated sensors (world.js) through
// the soiling layers (sim/soiling.js): each LDR gets its quadrant's share of the light.
import { CFG, SUN_MODE_CFG, createController, CL_IDLE, CL_BLOCKED, CL_CLEANING, CL_HELP } from "../js/logic.js";
import { createWorld } from "../js/world.js";
import { createSoiling } from "../js/sim/soiling.js";
import { sunPosition, clearSky, toModelAz, dayOfYear } from "../js/sun.js";

const DT = CFG.UPDATE_MS, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const NAME = ["idle", "blocked", "cleaning", "needs a hand"];
const LAT = 27, DOY = dayOfYear("summer", LAT);

// One scene: outdoor sun (SUN_MODE, like the dashboard's sim) or an indoor torch.
function scene({ sun, ms, script, dimAt, env = {} }) {
  const w = createWorld(17), soil = createSoiling();
  const ctl = sun ? createController(Object.assign({}, CFG, SUN_MODE_CFG))
                  : createController(Object.assign({}, CFG));
  if (sun) { w.bounce = 0; ctl.learnRoom(() => [0, 1, 2, 3].map(i => Math.round(w.countsAt(i, 150)))); }
  else { w.roomLux = 150; w.torch.on = false; w.settle(); ctl.learnRoom(() => w.readAll()); w.torch = { on: true, az: 40, el: 50, lux: 2500 }; }
  let out = { panPulse: 0, tiltAngle: CFG.TILT_HOME }, lastTilt = w.tilt;
  const log = { starts: 0, states: [], firstBlocked: null, firstClean: null, endClean: null, maxRound: 0, dustAtStart: null };
  let prev = CL_IDLE;
  for (let t = DT; t <= ms; t += DT) {
    if (sun) {
      const p = sunPosition(LAT, DOY, 12 + t / 3600000), sky = clearSky(p.el);
      w.roomLux = Math.max(0.002, sky.dhi * 105 * 0.02); w.torch.on = p.el > 0;
      w.torch.az = toModelAz(p.az, LAT); w.torch.el = Math.max(0, p.el); w.torch.lux = sky.dni * 105 * 0.02;
    }
    script && script(t, { w, soil, ctl });
    w.step(DT, out);
    soil.update(DT / 1000, { tiltDeg: w.tilt, tiltMoving: Math.abs(w.tilt - lastTilt) > 0.01, panMoving: Math.abs(w.panSpeed) > 1, temp: 30, sunW: 900, rain: 0, wind: 2, ...env });
    lastTilt = w.tilt;
    const T = soil.transmission().ldr, f = dimAt ? dimAt(t) : 1;
    const r = [0, 1, 2, 3].map(i => Math.round(clamp(w.countsAt(i, w.luxEff[i] * T[i] * f) + (w.rand() * 4 - 2), 0, 1023)));
    out = ctl.step(r, w.cell().counts, t);
    const st = ctl.s.clState;
    if (st !== prev) {
      log.states.push(`${(t / 1000).toFixed(2)}s ${NAME[st]}`);
      if (st === CL_BLOCKED && log.firstBlocked === null) log.firstBlocked = t;
      if (st === CL_CLEANING) { log.starts++; if (log.firstClean === null) { log.firstClean = t; log.dustAtStart = mean(soil.layers.dust); log.leavesAtStart = mean(soil.layers.leaves); } }
      if (prev === CL_CLEANING) log.endClean = t;
      prev = st;
    }
    log.maxRound = Math.max(log.maxRound, ctl.s.clRound);
  }
  log.final = ctl.s.clState; log.dust = soil.layers.dust.map(v => +v.toFixed(2)); log.leaves = soil.layers.leaves.map(v => +v.toFixed(2)); log.tilt = +w.tilt.toFixed(1);
  return log;
}
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const sec = t => (t === null ? "-" : (t / 1000).toFixed(2) + " s");
const rows = [];
function row(name, pass, detail) { rows.push({ name, pass, detail }); }

// (a) Outdoors at noon: dust lands on all 4 quadrants (0.7) at 30 s.
{
  const L = scene({ sun: true, ms: 90000, script: (t, { soil }) => { if (t === 30000) soil.deposit("dust", 0.7); } });
  const detectS = L.firstBlocked === null ? null : (L.firstBlocked - 30000);
  const pass = detectS !== null && detectS <= 5000 && L.starts === 1 && L.final === CL_IDLE && mean(L.dust) < 0.35;
  row("a) sun, dust 0.7 on all 4", pass,
    `blocked after ${sec(detectS)}, cleaning ${sec(L.firstClean)} to ${sec(L.endClean)}, rounds ${L.maxRound}, ` +
    `dust ${L.dustAtStart?.toFixed(2)} -> [${L.dust}], final ${NAME[L.final]}`);
}
// (b) Outdoors: dust on one quadrant only (TL 0.8). One light of 4 dims, the total drops under 60 %?
{
  const L = scene({ sun: true, ms: 60000, script: (t, { soil }) => { if (t === 30000) soil.deposit("dust", 0.8, 0); } });
  const ran = L.starts > 0;
  row("b) sun, dust 0.8 on TL only", L.final !== CL_CLEANING && L.starts <= 1,
    ran ? `routine ran (${L.starts}x), final ${NAME[L.final]}, dust [${L.dust}]`
        : `not detected (expected: one light of 4 only drops the total about 15-20 %), dust stays [${L.dust}]`);
}
// (c) A cloud: the light falls to 37 % (total about 50 %) over 60 s and comes back over 60 s.
{
  const dim = t => (t < 20000 ? 1 : t < 80000 ? 1 - 0.63 * (t - 20000) / 60000 : t < 140000 ? 0.37 + 0.63 * (t - 80000) / 60000 : 1);
  const L = scene({ sun: true, ms: 160000, dimAt: dim });
  row("c) sun, slow cloud to 50 % and back", L.starts <= 1 && L.final !== CL_CLEANING,
    `routine runs ${L.starts}, final ${NAME[L.final]}${L.states.length ? ", states " + L.states.join(", ") : ""}`);
}
// (c2) A sudden thick cloud (light to 37 % within 1 s for 40 s): it may run once, must not loop.
{
  const dim = t => (t >= 30000 && t < 70000 ? 0.37 : 1);
  const L = scene({ sun: true, ms: 100000, dimAt: dim });
  row("c2) sun, sudden cloud for 40 s", L.starts <= 1 && L.final === CL_IDLE,
    `routine runs ${L.starts}, rounds ${L.maxRound}, states ${L.states.join(", ")}`);
}
// (d) Indoors: the torch is switched off at 30 s and on again at 45 s. Not dust.
{
  const L = scene({ sun: false, ms: 60000, script: (t, { w }) => { if (t === 30000) w.torch.on = false; if (t === 45000) w.torch.on = true; } });
  row("d) indoor torch off and on", L.starts === 0 && L.final === CL_IDLE,
    `routine runs ${L.starts}${L.states.length ? ", states " + L.states.join(", ") : ", state stayed idle"}`);
}
// (e) Indoors: dust on all 4 (0.7). Tilt end to end slides it off.
{
  const L = scene({ sun: false, ms: 60000, script: (t, { soil }) => { if (t === 20000) soil.deposit("dust", 0.7); } });
  row("e) indoor torch, dust 0.7 on all 4", L.starts === 1 && L.final === CL_IDLE && mean(L.dust) < 0.35,
    `blocked after ${sec(L.firstBlocked === null ? null : L.firstBlocked - 20000)}, cleaning ${sec(L.firstClean)} to ${sec(L.endClean)}, rounds ${L.maxRound}, dust -> [${L.dust}]`);
}
// (f) Soiling model stays inside 0..1 with silly inputs and huge time steps.
{
  const s = createSoiling();
  s.deposit("dust", 5); s.deposit("snow", 0.9, 2); s.deposit("rain", NaN); s.deposit("hail", 0.3, 7); s.deposit("leaves", Infinity, 1); s.deposit("leaf", -2);
  const envs = [{ tiltDeg: 180, tiltMoving: true, temp: 5, sunW: 800, rain: 3, wind: 9 }, { tiltDeg: NaN, temp: -20, dust: 1, snow: 4, leaves: 1 }, { tiltDeg: 90, wind: NaN, rain: 2, leaves: 7 }, {}];
  let ok = true;
  for (const dt of [0.01, 1, 60, 3600, 86400, -5, NaN]) for (const e of envs) {
    s.update(dt, e);
    const tr = s.transmission();
    for (const k of ["dust", "snow", "water", "leaves"]) for (const v of s.layers[k]) if (!(v >= 0 && v <= 1)) ok = false;
    if (!(tr.cell >= 0 && tr.cell <= 1) || tr.ldr.some(v => !(v >= 0 && v <= 1))) ok = false;
  }
  const s2 = createSoiling(); s2.deposit("dust", 0.7);
  for (let i = 0; i < 600; i++) s2.update(1, { tiltDeg: 90, rain: 0 });
  const still = mean(s2.layers.dust);
  for (let i = 0; i < 1800; i++) s2.update(1, { tiltDeg: 90, rain: 4 });
  row("f) soiling model stable", ok && still > 0.69 && s2.layers.dust[0] < 0.01,
    `no NaN, all 0..1: ${ok}; flat panel keeps dust (${still.toFixed(2)} after 10 min); 30 min of 4 mm/h rain -> ${s2.layers.dust[0].toFixed(3)}`);
}
// (g) Outdoors at noon: leaves land on all 4 quadrants (0.7) at 30 s. The tilt end to end tips them off.
{
  const L = scene({ sun: true, ms: 90000, script: (t, { soil }) => { if (t === 30000) soil.deposit("leaves", 0.7); } });
  const detectS = L.firstBlocked === null ? null : (L.firstBlocked - 30000);
  const pass = detectS !== null && detectS <= 5000 && L.starts >= 1 && L.final === CL_IDLE && Math.max(...L.leaves) < 0.1;
  row("g) sun, leaves 0.7 on all 4", pass,
    `blocked after ${sec(detectS)}, cleaning ${sec(L.firstClean)} to ${sec(L.endClean)}, rounds ${L.maxRound}, ` +
    `leaves ${L.leavesAtStart?.toFixed(2)} -> [${L.leaves}], final ${NAME[L.final]}`);
}
// (h) Leaves 0.5 on a flat panel in 6 m/s wind: the wind blows them off, no routine needed.
{
  const s = createSoiling(); s.deposit("leaves", 0.5);
  let t = 0;
  while (t < 120 && Math.max(...s.layers.leaves) >= 0.05) { s.update(0.05, { tiltDeg: 90, wind: 6, temp: 25, sunW: 800 }); t += 0.05; }
  const s2 = createSoiling(); s2.deposit("leaves", 0.5);   // and in 3 m/s they stay
  for (let i = 0; i < 600; i++) s2.update(0.1, { tiltDeg: 90, wind: 3 });
  row("h) flat panel, leaves 0.5, wind 6 m/s", t <= 60 && s2.layers.leaves[0] > 0.49,
    `under 0.05 after ${t.toFixed(1)} s (limit 60 s); in 3 m/s wind still ${s2.layers.leaves[0].toFixed(2)} after 60 s`);
}

const w1 = Math.max(...rows.map(r => r.name.length));
console.log("test".padEnd(w1) + "  result  details");
for (const r of rows) console.log(r.name.padEnd(w1) + "  " + (r.pass ? "pass  " : "FAIL  ") + "  " + r.detail);
process.exitCode = rows.every(r => r.pass) ? 0 : 1;
