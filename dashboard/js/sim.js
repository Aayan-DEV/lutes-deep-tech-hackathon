// Day simulation: the sun crosses a desert sky and the tracker's real logic (logic.js, outdoor mode)
// follows it through the simulated sensors and motors (world.js).
import { CFG, SUN_MODE_CFG, createController } from "./logic.js";
import { createWorld, panelFrame, dirFrom } from "./world.js";
import { REGIONS, dayOfYear, dayLength, sunPosition, clearSky, toModelAz } from "./sun.js";

export const SPEEDS = [{ id: "slow", name: "Slow", secPerDay: 180 }, { id: "normal", name: "Normal", secPerDay: 60 }, { id: "fast", name: "Fast", secPerDay: 20 }];
const LUX_PER_WM2 = 105;    // sunlight: about 105 lux per W/m²
const FILTER = 0.02;        // the sensor sits behind a dark filter (2 % through), like outdoor LDR trackers,
                            // so full sun does not max out the 10k dividers
const NIGHT_SKIP = 8;       // nights run 8 times faster, so the demo does not sit in the dark
const REST_TILT = 150;      // at night: face the sunrise side, 30° above the horizon

export function createSim() {
  // Outdoors the panel only tips toward its front (tilt 90..180) and the big motor does left / right,
  // like real trackers. Tipping over backwards as well would let the big motor run into its wire limit.
  const world = createWorld(5), ctl = createController(Object.assign({}, CFG, SUN_MODE_CFG));   // the full design range (tracker.ino SUN_MODE)
  world.bounce = 0;
  const sim = {
    world, ctl, tracking: true, out: { panPulse: 0, tiltAngle: CFG.TILT_HOME }, events: [], test: null,
    region: REGIONS[0], season: "summer", hour: 6, playing: true, secPerDay: 60,
    sun: { el: 0, az: 0, compass: 0, dni: 0, dhi: 0 }, rise: 6, set: 18,
    energy: { tracker: 0, fixed: 0, ideal: 0 }, yesterday: null, aimSum: 0, aimN: 0, powerW: 0, fixedW: 0,
    setRegion(id) { sim.region = REGIONS.find(r => r.id === id) || REGIONS[0]; sim.newDay(); },
    setSeason(id) { sim.season = id; sim.newDay(); },
    setHour(h) { sim.hour = h; sim.resetDay(); updateSun(); },
    newDay() { const L = dayLength(sim.region.lat, sim.doy()); sim.rise = L.rise; sim.set = L.set; sim.resetDay(); updateSun(); },
    resetDay() { sim.energy = { tracker: 0, fixed: 0, ideal: 0 }; sim.aimSum = 0; sim.aimN = 0; },
    doy() { return dayOfYear(sim.season, sim.region.lat); },
    // Factory calibration: all 4 LDRs under the same lamp, so their differences cancel out later.
    calibrate() { ctl.learnRoom(() => [0, 1, 2, 3].map(i => world.countsAt(i, 150))); },
    zeroPan() { ctl.zeroPan(); world.pan = 0; },
    startTest() { sim.test = { step: "tilt", ms: 0 }; sim.events.push("tilt"); },
    step() {
      const dt = CFG.UPDATE_MS, t = world.t + dt;
      let dHour = 0;
      if (sim.playing) {
        dHour = dt / 1000 * 24 / sim.secPerDay * (sim.sun.el < -6 ? NIGHT_SKIP : 1);
        sim.hour += dHour;
        if (sim.hour >= 24) { sim.hour -= 24; sim.yesterday = Object.assign({}, sim.energy, { aim: sim.aimN ? sim.aimSum / sim.aimN : 0 }); sim.resetDay(); }
        updateSun();
      }
      if (sim.test) { testStep(dt); world.step(dt, sim.out); return; }
      world.step(dt, sim.out);
      const s = ctl.s, keepDeg = s.panDeg, keepAngle = s.angle;
      sim.out = ctl.step(world.readAll(), world.cell().counts, t);
      if (sim.sun.el < -2) {
        // Night: turn back to face the sunrise side (east), tilted up a little, ready for the morning.
        const restPan = toModelAz(90, sim.region.lat), gap = restPan - keepDeg;
        const way = s.panEnabled && Math.abs(gap) > 3 ? Math.sign(gap) : 0;
        s.angle = keepAngle + Math.sign(REST_TILT - keepAngle) * Math.min(1, Math.abs(REST_TILT - keepAngle));
        s.panDeg = keepDeg + way * CFG.PAN_DEG_PER_S * dt / 1000;   // same estimate as the Arduino's
        Object.assign(s, { panOff: 0, moving: [false, false], drive: [0, 0] });
        sim.out = { panPulse: way ? CFG.PAN_STOP_US + way * ctl.c.PAN_FULL_US : 0, tiltAngle: s.angle };
      } else if (!sim.tracking) {
        // Tracking off: the sensors still read, but the motors hold still (a fixed panel, for comparison).
        Object.assign(s, { panDeg: keepDeg, angle: keepAngle, panOff: 0, panPulse: 0, panAttached: false, moving: [false, false], drive: [0, 0] });
        sim.out = { panPulse: 0, tiltAngle: keepAngle };
      }
      measure(dHour);
    },
    telemetry() {
      const d = ctl.telemetry(world.t);
      d.sun = { el: sim.sun.el, compass: sim.sun.compass, hour: sim.hour, rise: sim.rise, set: sim.set };
      d.powerW = sim.powerW;
      d.energy = sim.energy; d.yesterday = sim.yesterday; d.aimAvg = sim.aimN ? sim.aimSum / sim.aimN : null;
      return d;
    },
  };

  function updateSun() {
    const p = sunPosition(sim.region.lat, sim.doy(), sim.hour), sky = clearSky(p.el);
    sim.sun = { el: p.el, compass: p.az, az: toModelAz(p.az, sim.region.lat), dni: sky.dni, dhi: sky.dhi };
    world.roomLux = Math.max(0.002, sky.dhi * LUX_PER_WM2 * FILTER);   // light from the whole sky
    world.torch.on = p.el > 0;                                          // the sun itself
    world.torch.az = sim.sun.az; world.torch.el = Math.max(0, p.el);
    world.torch.lux = sky.dni * LUX_PER_WM2 * FILTER;
  }

  // Power right now and energy over the day: the tracker, a fixed panel and a perfect tracker.
  // The fixed panel faces the equator, tilted by the latitude (the usual way to mount one).
  function measure(dHour) {
    const n = panelFrame(world.pan, world.tilt).n, tiltFix = Math.abs(sim.region.lat) * Math.PI / 180;
    const fixedN = [0, Math.cos(tiltFix), Math.sin(tiltFix)];
    sim.powerW = world.panelW(n, sim.sun);
    sim.fixedW = world.panelW(fixedN, sim.sun);
    const idealW = world.panelW(dirFrom(sim.sun.az, Math.max(0, sim.sun.el)), sim.sun);
    sim.energy.tracker += sim.powerW * dHour; sim.energy.fixed += sim.fixedW * dHour; sim.energy.ideal += idealW * dHour;
    if (sim.sun.el > 3) { sim.aimSum += world.aim().errDeg; sim.aimN++; }
  }

  // Same steps as servoTest() in tracker.ino: tilt sweeps fast, then pan full speed each way.
  function testStep(dt) {
    const T = sim.test; T.ms += dt;
    const next = s => { T.step = s; T.ms = 0; sim.events.push(s); if (s === "done") { sim.test = null; sim.out = { panPulse: 0, tiltAngle: 90 }; ctl.s.angle = 90; } };
    if (T.step === "tilt") { sim.out = { panPulse: 0, tiltAngle: 90 + 60 * Math.sin(T.ms / 900 * Math.PI * 2) }; if (T.ms > 900) next("pan+"); }
    else if (T.step === "pan+") { sim.out = { panPulse: CFG.PAN_STOP_US + ctl.c.PAN_FULL_US, tiltAngle: 90 }; if (T.ms > 600) next("pan-"); }
    else if (T.step === "pan-") { sim.out = { panPulse: CFG.PAN_STOP_US - ctl.c.PAN_FULL_US, tiltAngle: 90 }; if (T.ms > 600) next("done"); }
  }

  sim.calibrate();
  sim.newDay();
  sim.setHour(sim.rise - 0.6);   // start just before sunrise
  return sim;
}
