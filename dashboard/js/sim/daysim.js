// The multi-day simulation: the Arduino's own code (logic.js, SUN_MODE settings as in the old
// sim.js) runs against the real sun and the real weather of one place, day after day.
//  - The controller is stepped at 20 Hz of sim time (UPDATE_MS = 50, so its pan angle count and its
//    timers stay right). At fast speeds a frame needs many steps; the work is capped at MAX_STEPS
//    per frame. Past the cap the frame is cut into slices: in each slice the controller runs for
//    1 sim second (enough to catch up with a sun that moved a fraction of a degree) and the panel
//    then holds still for the rest of the slice while the energy is still counted.
//  - At 1 day per second (COARSE_SPEED) it does not step the controller at all: every 10 sim
//    minutes the coarse model (daysim_coarse.js) puts the panel on the sun when the sensor would
//    see an imbalance, and the energy is counted per 10 minutes.
//  - Nights are skipped cheaply: the tracker turns to face the sunrise and waits (like sim.js).
//  - Energy (Wh) for the tracker, a fixed panel (tilted by the latitude, facing the equator) and an
//    ideal panel (always on the sun): per day, and running since the last jump.
//  - weatherMix (daysim_weather.js), when set, replaces the weather file: the Simulation's buttons.
//  - totals(regionId): the 3-year totals from the coarse model, computed once and kept in
//    localStorage. With no weather file it uses a clear sky (sun.js), so it always works.
import { CFG, SUN_MODE_CFG, createController } from "../logic.js";
const CL_CLEANING = 2;   // logic.js cleaning state: rocking back and forth
import { createWorld } from "../world.js";
import { regionGeo, sunAt, sunVec, ldrLux, cellCounts, irradiance, localParts, localToUtc } from "./daysim_sun.js";
import { COARSE_S, NIGHT_EL, restPose, idealPose, coarsePose, powers, weatherAt, computeTotals } from "./daysim_coarse.js";
import { panelFrame } from "../world.js";

export const STEP_MS = 50;              // 20 controller steps per sim second
export const MAX_STEPS = 3000;          // controller steps per frame, at most
export const COARSE_SPEED = 86400;      // sim seconds per real second from which the coarse model runs
const SLICE_STEPS = 20;                 // over budget: 1 sim second of controller per slice
const JUMP_S = 3 * 3600;                // a bigger gap (or going back in time) is a jump: settle at once
const SOIL_DT = 60;                     // soiling physics in steps of at most 1 sim minute
const TOTALS_VERSION = 1;
const ONE = { ldr: [1, 1, 1, 1], cell: 1 };
const SUN_CFG = { ...SUN_MODE_CFG, UPDATE_MS: STEP_MS };   // the full design range (tracker.ino SUN_MODE)

// The 3 years the weather covers, in local time at the place.
export function span(geo) {
  return { from: localToUtc(2023, 1, 1, 0, 0, geo.utcOffsetS), to: localToUtc(2026, 1, 1, 0, 0, geo.utcOffsetS) };
}

export function createDaySim({ regionId = "cholistan", series = null, soiling = null } = {}) {
  let world, ctl, ctlMs = 0, debt = 0, drawK = 1;
  const prev = { pan: 0, tilt: 90 };   // the pose one controller step ago (drawPose)
  const memo = {};
  const sim = {
    regionId, geo: regionGeo(regionId, series), series, soiling, t: null, coarse: false,
    sun: { el: -30, az: 0 }, weather: null, trans: ONE,
    powerW: 0, fixedW: 0, idealW: 0, panelWm2: 0, panMoving: false, tiltMoving: false,
    today: null, days: [], total: { tracker: 0, fixed: 0, ideal: 0 },
    get world() { return world; }, get ctl() { return ctl; },
    seriesFor: {},   // weather series per region, filled by the app as they load
    weatherMix: null,   // the Simulation's weather buttons: when set, used instead of the series

    setRegion(id, newSeries = null) {
      sim.regionId = id; sim.series = newSeries; if (newSeries) sim.seriesFor[id] = newSeries;
      sim.geo = regionGeo(id, newSeries); if (sim.t != null) jump(sim.t);
    },
    setSeries(s) { sim.series = s; if (s) sim.seriesFor[sim.regionId] = s; sim.geo = regionGeo(sim.regionId, s); },

    // Move the simulation to a UTC time (ms). speed: sim seconds per real second (picks the mode).
    advance(toMs, speed = 600) {
      if (sim.t == null || toMs < sim.t || (toMs - sim.t) / 1000 > JUMP_S) { jump(toMs); return; }
      sim.coarse = speed >= COARSE_SPEED;
      let gap = (toMs - sim.t) / 1000;
      if (gap <= 0) return;
      if (sim.coarse) {
        drawK = 1;
        while (gap > 1e-6) { const d = Math.min(COARSE_S, gap); coarseChunk(d); gap -= d; }
        refreshSensors();
        return;
      }
      // A cleaning that starts in this frame stops the frame there (sim.t stays behind the
      // clock), so the app can slow down to real time before the routine plays out.
      // Steps are counted with the fraction carried over, so at real time (a frame shorter than one
      // 50 ms step) the controller still runs at 20 steps per sim second, not one step per frame.
      if (gap * 1000 / STEP_MS <= MAX_STEPS) {
        while (gap > 1e-6) {
          const d = Math.min(1, gap); debt += d * 1000 / STEP_MS;
          const n = Math.floor(debt + 1e-9); debt -= n;
          drawK = debt;
          if (chunk(d, n)) return;
          gap -= d;
        }
      } else {
        debt = 0; drawK = 1;
        const n = MAX_STEPS / SLICE_STEPS, d = gap / n;
        for (let i = 0; i < n; i++) if (chunk(d, SLICE_STEPS)) return;
      }
    },
    jump: ms => jump(ms),
    // "Simulate dust": dust on all 4 quadrants. In daylight the controller sees the sudden drop
    // and cleans by itself (the firmware rule). In the dark, or in the coarse mode where the
    // controller does not run, the cleaning starts at the next good light instead.
    dustNow(amount = 0.7) {
      if (sim.soiling) for (let q = 0; q < 4; q++) sim.soiling.deposit("dust", amount, q);
      if (sim.sun.el < 5 || sim.coarse) pendingClean = true;
    },
    // start the cleaning routine now (as "D 1" does on the Arduino)
    cleanNow() { if (ctl.clean) ctl.clean(true, ctlMs); },
    // stop it and forget the clean level (as "D 0" does)
    cleanStop() { pendingClean = false; if (ctl.clean) ctl.clean(false, ctlMs); },
    // false while a weather run (app/stormrun.js) starts the cleaning itself
    stormCleans: true,
    // true: storms add their own dust and snow here (fast speeds, or no particles to do it)
    depositStorms: true,

    // What the HUD shows: the controller's own telemetry plus the sun, power and energy.
    telemetry() {
      const d = ctl.telemetry(ctlMs);
      d.sun = { el: sim.sun.el, compass: sim.sun.az };
      d.powerW = sim.powerW; d.energy = sim.today; d.total = sim.total;
      return d;
    },
    pose: () => ({ pan: world.pan, tilt: world.tilt }),
    // the pose to draw: between the last two controller steps, so the 3D moves smoothly at real time
    drawPose() {
      const k = Math.max(0, Math.min(1, drawK));
      return { pan: prev.pan + (world.pan - prev.pan) * k, tilt: prev.tilt + (world.tilt - prev.tilt) * k };
    },

    // The 3-year totals {trackerKWh, fixedKWh, idealKWh, gainPct, ...} for a region. Synchronous:
    // uses that region's weather if it is loaded, otherwise the clear sky. Cached in localStorage.
    totals(id = sim.regionId) {
      const s = id === sim.regionId ? sim.series || sim.seriesFor[id] : sim.seriesFor[id], source = s ? "weather" : "clear-sky";
      const key = `tracker-totals-v${TOTALS_VERSION}-${id}-${source}`;
      if (memo[key]) return memo[key];
      try { const c = JSON.parse(localStorage.getItem(key)); if (c && c.trackerKWh > 0) return (memo[key] = c); } catch (e) {}
      const geo = regionGeo(id, s), sp = span(geo), out = computeTotals(geo, s, sp.from, sp.to);
      out.region = id;
      try { localStorage.setItem(key, JSON.stringify(out)); } catch (e) {}
      return (memo[key] = out);
    },
    // Same, but waits for the region's weather first (loadSeries: id -> Promise<series|null>).
    async whenTotals(id = sim.regionId, loadSeries = null) {
      if (!sim.seriesFor[id] && loadSeries) { try { const s = await loadSeries(id); if (s) sim.seriesFor[id] = s; } catch (e) {} }
      return sim.totals(id);
    },
  };

  function fresh() {
    world = createWorld(5); world.bounce = 0; world.torch.on = false; world.roomLux = 0;
    ctl = createController(Object.assign({}, CFG, SUN_CFG));
    ctl.learnRoom(() => [0, 1, 2, 3].map(i => world.countsAt(i, 150)));   // factory calibration, as in sim.js
  }

  // Jump: put the panel where a working tracker would be at that moment, start the day's count again.
  function jump(ms) {
    fresh(); sim.t = ms; debt = 0; drawK = 1;
    const sun = sunAt(ms, sim.geo), pose = sun.el < NIGHT_EL ? restPose(sim.geo.lat) : idealPose(sun, sim.geo.lat);
    setPose(pose);
    sim.today = newDay(ms); sim.total = { tracker: 0, fixed: 0, ideal: 0 };
    // "Today" counts the whole day: fill in local midnight up to now with the coarse model
    const p = localParts(ms, sim.geo.utcOffsetS), midnight = localToUtc(p.y, p.m, p.d, 0, 0, sim.geo.utcOffsetS);
    if (ms > midnight) {
      const soFar = computeTotals(sim.geo, sim.series, midnight, ms);
      Object.assign(sim.today, { tracker: soFar.trackerKWh * 1000, fixed: soFar.fixedKWh * 1000, ideal: soFar.idealKWh * 1000 });
    }
    look(ms);
    for (let i = 0; i < 8; i++) sensorStep();   // let the smoothed readings settle
    if (sun.el < NIGHT_EL) holdPose(pose);
    measureNow();   // power is right even while paused
  }
  function measureNow() {
    const p = powers(sim.pose(), sim.sun, sim.weather, sim.geo.lat);
    sim.powerW = p.tracker * sim.trans.cell; sim.fixedW = p.fixed; sim.idealW = p.ideal; sim.panelWm2 = p.tracker / 0.7 * 1000;
    return p;
  }
  const newDay = ms => ({ key: localParts(ms, sim.geo.utcOffsetS).key, tracker: 0, fixed: 0, ideal: 0 });
  function setPose(p) { world.pan = p.pan; world.tilt = world.tiltCmd = p.tilt; world.panSpeed = 0; ctl.s.panDeg = p.pan; ctl.s.angle = p.tilt; }
  // Override the controller's output (night rest, coarse mode), as sim.js does at night.
  function holdPose(p) {
    setPose(p);
    Object.assign(ctl.s, { panOff: 0, panPulse: 0, panAttached: false, moving: [false, false], drive: [0, 0] });
  }

  // Sun, weather and soiling at a moment.
  function look(ms) {
    sim.sun = sunAt(ms, sim.geo);
    sim.weather = sim.weatherMix ? sim.weatherMix.sample(sim.sun) : weatherAt(sim.series, ms, sim.sun);
    sim.trans = sim.soiling ? safeTrans(sim.soiling) : ONE;
    sim.sunDir = sunVec(sim.sun.el, sim.sun.az);
  }

  // One controller step: the motors move, the 4 LDRs and the cell read the light, the code decides.
  let out = { panPulse: 0, tiltAngle: CFG.TILT_HOME };
  const lux = [0, 0, 0, 0];
  function sensorStep() {
    prev.pan = world.pan; prev.tilt = world.tilt;
    world.step(STEP_MS, out);
    const f = panelFrame(world.pan, world.tilt);
    ldrLux(f, sim.sunDir, sim.weather, sim.trans.ldr, lux);
    for (let i = 0; i < 4; i++) world.luxEff[i] = lux[i];
    ctlMs += STEP_MS;
    out = ctl.step(world.readAll(), cellCounts(irradiance(f.n, sim.sunDir, sim.weather) * sim.trans.cell), ctlMs);
  }

  // dS sim seconds, of which the controller runs nSteps * 50 ms.
  // Returns true when the controller just started watching a block or cleaning (state 1 or 2).
  const busy = st => st === 1 || st === CL_CLEANING;
  function chunk(dS, nSteps) {
    const st0 = ctl.s.clState;
    look(sim.t + dS * 500);
    const p0 = world.pan, t0 = world.tilt;
    if (sim.sun.el < NIGHT_EL && ctl.s.clState !== CL_CLEANING) {   // night: face the sunrise and wait (not while it cleans)
      const rest = restPose(sim.geo.lat), k = Math.min(1, dS);
      sensorStep();
      holdPose({ pan: p0 + clampAbs(rest.pan - p0, CFG.PAN_DEG_PER_S * k), tilt: t0 + clampAbs(rest.tilt - t0, 100 * k) });
    } else {
      for (let i = 0; i < nSteps; i++) sensorStep();
    }
    if (nSteps > 0 || sim.sun.el < NIGHT_EL) {   // no step this frame: keep the last answer
      sim.panMoving = Math.abs(world.pan - p0) > 0.05 || Math.abs(world.panSpeed) > 6;
      sim.tiltMoving = Math.abs(world.tilt - t0) > 0.05;
    }
    finish(dS);
    return !busy(st0) && busy(ctl.s.clState);
  }

  function coarseChunk(dS) {
    look(sim.t + dS * 500);
    const p0 = world.pan, t0 = world.tilt, held = { pan: p0, tilt: t0 };
    holdPose(coarsePose(held, sim.sun, sim.weather, sim.geo.lat));
    sim.panMoving = Math.abs(world.pan - p0) > 0.05; sim.tiltMoving = Math.abs(world.tilt - t0) > 0.05;
    finish(dS);
  }
  // Coarse mode: read the sensors once so the 4 lights on screen are right, then keep the pose.
  function refreshSensors() { const p = sim.pose(); sensorStep(); holdPose(p); }

  // Energy, the day's book-keeping and the soiling physics for dS sim seconds.
  function finish(dS) {
    const p = measureNow(), h = dS / 3600;
    const end = sim.t + dS * 1000, key = localParts(end, sim.geo.utcOffsetS).key;
    if (key !== sim.today.key) {
      sim.days.push(sim.today); if (sim.days.length > 1200) sim.days.shift();
      sim.today = newDay(end);
    }
    for (const [k, v] of [["tracker", sim.powerW], ["fixed", p.fixed], ["ideal", p.ideal]]) { sim.today[k] += v * h; sim.total[k] += v * h; }
    if (sim.soiling) soilStep(dS);
    sim.t = end;
  }
  // Storm dust lands in bursts (gusts), one every 15 sim minutes, not as a smooth trickle. When a
  // storm (dust, snow, leaves, rain) ends with dirt on the panel, start the cleaning once: a slow
  // storm never makes the sudden drop the firmware watches for.
  let stormS = 0, lastKind = null, pendingClean = false;
  const QUAD = [1, 0.8, 1.15, 0.9];
  function storms(dS) {
    const w = sim.weather, dusty = w.kind === "dust", stormy = STORMY.has(w.kind);
    if (dusty && sim.depositStorms) {
      stormS += dS;
      while (stormS >= 900) { stormS -= 900; for (let q = 0; q < 4; q++) sim.soiling.deposit("dust", Math.min(1, 0.22 * (w.dust || 0.5) * QUAD[q]), q); }
    }
    if (STORMY.has(lastKind) && !stormy) {
      stormS = 0;
      if (sim.stormCleans && dirt(sim.soiling.layers) > 0.3) pendingClean = true;
    }
    if (pendingClean && sim.sun.el > 5 && !sim.coarse && ctl.clean) { pendingClean = false; ctl.clean(true, ctlMs); }   // in daylight
    lastKind = w.kind;
  }
  function soilStep(dS) {
    storms(dS);
    const w = sim.weather, info = { tiltDeg: world.tilt, panMoving: sim.panMoving, tiltMoving: sim.tiltMoving,
      temp: w.temp, sunW: sim.panelWm2, rain: w.rain || 0, wind: w.wind || 0, snow: sim.depositStorms ? w.snow || 0 : 0 };
    try { for (let left = dS; left > 1e-6; left -= SOIL_DT) sim.soiling.update(Math.min(SOIL_DT, left), info); }
    catch (e) { console.warn("soiling.update failed", e); sim.soiling = null; }
  }

  fresh();
  return sim;
}

const clampAbs = (x, m) => Math.max(-m, Math.min(m, x));
const STORMY = new Set(["dust", "snow", "hail", "rain", "storm", "leaves"]);
// The worst quadrant of the layers that block light and need the panel to shake them off.
export function dirt(L) {
  if (!L) return 0;
  let most = 0;
  for (const k of ["dust", "snow", "leaves"]) if (Array.isArray(L[k])) for (const v of L[k]) if (v > most) most = v;
  return most;
}
function safeTrans(soiling) {
  try {
    const t = soiling.transmission(), ok = v => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
    return { ldr: [0, 1, 2, 3].map(i => ok(t.ldr && t.ldr[i])), cell: ok(t.cell) };
  } catch (e) { return ONE; }
}
