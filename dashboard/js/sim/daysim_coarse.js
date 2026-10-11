// The coarse model of the tracker, for "1 day per second" and for the 3-year totals.
// It does NOT step the Arduino's code. Every 10 sim minutes it asks the same question the controller
// asks (does one side of the sensor see at least START_PCT more light than the other?) and, if yes,
// puts the panel straight on the sun; if not, the panel stays where it was. At night it rests facing
// the sunrise. That keeps the two habits that cost the real tracker energy (waking up late, holding
// still under thin cloud) without 20 controller steps per sim second.
import { CFG, SUN_MODE_CFG, conductance } from "../logic.js";
import { panelFrame } from "../world.js";
import { toModelAz } from "../sun.js";
import { sunAt, sunVec, irradiance, lightOf, clearSample, ldrLux, PANEL_W } from "./daysim_sun.js";

export const COARSE_S = 600;          // one look every 10 sim minutes
export const NIGHT_EL = -2;           // below this the tracker rests (as in sim.js)
export const REST_TILT = 150;         // night rest: face the sunrise side, 30 degrees above the horizon
export const SUN_START_PCT = SUN_MODE_CFG.START_PCT;   // the SUN_MODE settings used in sim.js
const R10 = 15000;                    // a typical GL5528 (world.js varies each part by 20 %)
const countsAt = lux => 1023 * 10000 / (10000 + R10 * Math.pow(Math.max(lux, 0.05) / 10, -0.7));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export const restPose = lat => ({ pan: toModelAz(90, lat), tilt: REST_TILT });
// Panel straight at the sun, inside the motors' range (tilt 90..180 outdoors, pan within the wire limit).
export function idealPose(sun, lat) {
  const S = SUN_MODE_CFG;
  return { pan: clamp(toModelAz(sun.az, lat), -S.PAN_LIMIT_DEG, S.PAN_LIMIT_DEG), tilt: clamp(180 - Math.max(0, sun.el), S.TILT_MIN, S.TILT_MAX) };
}

// Where the coarse tracker points now, given where it pointed before.
export function coarsePose(held, sun, w, lat) {
  if (sun.el < NIGHT_EL) return restPose(lat);
  const s = sunVec(sun.el, sun.az), lux = ldrLux(panelFrame(held.pan, held.tilt), s, w, null);
  let bright = 0;
  for (let i = 0; i < 4; i++) bright = Math.max(bright, countsAt(lux[i]));
  if (bright < CFG.SUN_ON_COUNTS) return held;                    // too dark to track: it waits
  const g = lux.map(l => conductance(countsAt(l)));
  const frac = (a, b) => Math.abs(a - b) / Math.max(a, b, 1e-6);
  const pan = frac(g[0] + g[2], g[1] + g[3]), tilt = frac(g[0] + g[1], g[2] + g[3]);
  return pan * 100 >= SUN_START_PCT || tilt * 100 >= SUN_START_PCT ? idealPose(sun, lat) : held;
}

// Power (W) of the 0.7 W panel for the tracker pose, the fixed panel and the ideal one.
export function powers(pose, sun, w, lat) {
  const s = sunVec(sun.el, sun.az), n = panelFrame(pose.pan, pose.tilt).n;
  const fix = Math.abs(lat) * Math.PI / 180, fixedN = [0, Math.cos(fix), Math.sin(fix)];   // faces the equator
  const k = PANEL_W / 1000;
  return { tracker: k * irradiance(n, s, w), fixed: k * irradiance(fixedN, s, w), ideal: sun.el > 0 ? k * irradiance(s, s, w) : 0 };
}

// Weather at a time, never throwing: the series when it has the hour, else a clear sky.
export function weatherAt(series, ms, sun) {
  let w = null;
  if (series) { try { w = series.at(new Date(ms)); } catch (e) { w = null; } }
  return w ? Object.assign({}, w, lightOf(w, sun.el)) : clearSample(sun.el, sun.solarHour);
}

// Energy over a whole period in 10-minute steps. Clean panels (dust is not part of the totals).
export function computeTotals(geo, series, fromMs, toMs) {
  let pose = restPose(geo.lat), wh = { tracker: 0, fixed: 0, ideal: 0 }, steps = 0;
  const h = COARSE_S / 3600;
  for (let t = fromMs; t < toMs; t += COARSE_S * 1000) {
    const mid = t + COARSE_S * 500, sun = sunAt(mid, geo);
    if (sun.el < -1) { pose = restPose(geo.lat); continue; }   // no energy at night; skip the work
    const w = weatherAt(series, mid, sun);
    pose = coarsePose(pose, sun, w, geo.lat);
    const p = powers(pose, sun, w, geo.lat);
    wh.tracker += p.tracker * h; wh.fixed += p.fixed * h; wh.ideal += p.ideal * h; steps++;
  }
  const days = (toMs - fromMs) / 864e5;
  return {
    trackerKWh: wh.tracker / 1000, fixedKWh: wh.fixed / 1000, idealKWh: wh.ideal / 1000,
    gainPct: wh.fixed > 0 ? (wh.tracker / wh.fixed - 1) * 100 : 0,
    // sunlight landing on 1 m2 facing the same way (before any panel efficiency)
    sunPerSquareMetreKWh: { tracker: wh.tracker / PANEL_W, fixed: wh.fixed / PANEL_W, ideal: wh.ideal / PANEL_W },
    panelW: PANEL_W, days, steps, source: series ? "weather" : "clear-sky",
  };
}
