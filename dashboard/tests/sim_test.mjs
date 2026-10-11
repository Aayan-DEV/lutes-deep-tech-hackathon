// Runs the tracker logic against the simulated room, headless. Usage: node dashboard/tests/sim_test.mjs
import { CFG, createController } from "../js/logic.js";
import { createWorld } from "../js/world.js";

function run(name, setup, script, ms) {
  const w = createWorld(11), ctl = createController();
  setup(w);
  const torchOn = w.torch.on;
  w.torch.on = false; w.settle();          // learn the room with the torch off, like the real start-up
  ctl.learnRoom(() => w.readAll());
  w.torch.on = torchOn;
  let out = { panPulse: 0, tiltAngle: CFG.TILT_HOME }, moves = 0, reversals = 0, lastDir = [0, 0], torchSeen = 0;
  const errs = [], settle = { at: null };
  for (let t = 0; t <= ms; t += CFG.UPDATE_MS) {
    script(w, t);
    w.step(CFG.UPDATE_MS, out);
    const cell = w.cell().counts;
    out = ctl.step(w.readAll(), cell, t);
    const s = ctl.s;
    for (let a = 0; a < 2; a++) {
      const d = a === 0 ? Math.sign(s.panOff) : (s.moving[1] ? s.lastWay[1] : 0);
      if (d && lastDir[a] && d !== lastDir[a]) reversals++;
      if (d) { lastDir[a] = d; moves++; }
    }
    if (s.torch) torchSeen++;
    const e = w.aim().errDeg;
    errs.push(e);
    if (settle.at === null && e < 10 && t > 0) settle.at = t;
  }
  const tail = errs.slice(-Math.round(1000 / CFG.UPDATE_MS));
  const r = {
    name, settle_ms: settle.at, final_err: +errs[errs.length - 1].toFixed(1), last1s_mean_err: +(tail.reduce((a, b) => a + b, 0) / tail.length).toFixed(1),
    move_updates: moves, reversals, torch_pct: Math.round(torchSeen / (ms / CFG.UPDATE_MS) * 100), pan_est: +ctl.s.panDeg.toFixed(0), pan_true: +w.pan.toFixed(0), tilt: +w.tilt.toFixed(0),
  };
  console.log(JSON.stringify(r));
  return r;
}

const rooms = [8, 60, 150, 500, 2000];
// 1. room only, with the room slowly brightening and dimming 25 %: must never move
for (const lux of rooms) run(`room only ${lux} lux`, w => { w.roomLux = lux; w.torch.on = false; },
  (w, t) => { w.roomDrift = 0.25 * Math.sin(t / 4000); }, 20000);
// 2. light switch: room jumps +300 lux: must not move
run("ceiling light switched on", w => { w.roomLux = 150; w.torch.on = false; }, (w, t) => { if (t === 3000) w.roomLux = 450; }, 15000);
// 3. torch held still in each room
for (const lux of rooms) for (const [az, el] of [[60, 40], [-120, 30], [10, 75], [170, 20]])
  run(`torch az ${az} el ${el}, room ${lux}`, w => { w.roomLux = lux; w.torch = { on: true, az, el, lux: 2500 }; }, () => {}, 8000);
// 4. torch jumps every 4 s
run("torch jumps", w => { w.roomLux = 150; }, (w, t) => { if (t % 4000 === 0) { w.torch.az = -150 + w.rand() * 300; w.torch.el = 15 + w.rand() * 70; } }, 24000);
// 5. torch walks round in a slow circle (30 °/s)
run("torch circling 30 deg/s", w => { w.roomLux = 150; w.torch.az = 0; }, (w, t) => { w.torch.az = 80 * Math.sin(t / 1000 * 30 / 80); }, 20000);
// 6. weak torch in a bright room
run("weak torch 600 lux in bright office", w => { w.roomLux = 500; w.torch.lux = 600; }, () => {}, 8000);
// 7. torch held still 40 s (must not fade into the room), then moved
run("torch held 40 s then moved", w => { w.roomLux = 150; w.torch.az = 40; }, (w, t) => { if (t === 40000) { w.torch.az = -60; w.torch.el = 30; } }, 46000);
// 8. torch switched off: must stop and hold
run("torch off after 3 s", w => { w.roomLux = 150; }, (w, t) => { if (t === 3000) w.torch.on = false; }, 10000);
// 9. torch jumps behind the panel after it lined up: must find it again
run("torch jumps behind the panel", w => { w.roomLux = 150; w.torch.az = 55; w.torch.el = 40; }, (w, t) => { if (t === 3000) w.torch.az = -100; }, 12000);
run("torch jumps behind, low", w => { w.roomLux = 150; w.torch.az = 60; w.torch.el = 20; }, (w, t) => { if (t === 3000) { w.torch.az = -130; w.torch.el = 25; } }, 12000);

// 10. Learn the room as the brightest seen: a flickering room light during learning must never
//     count afterwards, and a torch brought in slowly must still be found (no drifting "normal").
{
  const w = createWorld(21), ctl = createController();
  w.roomLux = 150; w.torch.on = false; w.settle(); ctl.learnRoom(() => w.readAll());
  let out = { panPulse: 0, tiltAngle: CFG.TILT_HOME }, t = 0, falseTorch = 0, steps = 0;
  const flicker = tt => 0.3 * Math.sin(tt / 700) * Math.sin(tt / 2300);   // the room's lights wander up to ±30 %
  ctl.startLearn(false);
  for (; t < 8000; t += 10) { w.roomDrift = flicker(t); w.step(10, out); out = ctl.step(w.readAll(), 0, t); }
  ctl.stopLearn();
  for (; t < 30000; t += 10) { w.roomDrift = flicker(t); w.step(10, out); out = ctl.step(w.readAll(), 0, t); steps++; if (ctl.s.torch) falseTorch++; }
  // now a torch fades in over 20 s (the old version would have soaked this into "normal")
  w.torch = { on: true, az: 60, el: 40, lux: 0 };
  let found = null;
  for (; t < 60000; t += 10) { w.torch.lux = Math.min(2500, (t - 30000) / 20000 * 2500); w.roomDrift = flicker(t); w.step(10, out); out = ctl.step(w.readAll(), 0, t); if (found === null && ctl.s.torch) found = (t - 30000) / 1000; }
  console.log(JSON.stringify({ name: "learn the brightest: flickering room never counts, slow torch is found",
    false_torch_pct: +(falseTorch / steps * 100).toFixed(1), slow_torch_found_after_s: found, final_err: +w.aim().errDeg.toFixed(1) }));
}
