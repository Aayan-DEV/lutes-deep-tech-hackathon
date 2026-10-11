// Per frame: what the simulation (or the live board) means for the 3D, and the view the HUD shows.
import { toModelAz } from "../sun.js";
import { sunAt } from "../sim/daysim_sun.js";
import { dirt } from "../sim/daysim.js";

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const LIVE_SUN = { el: 48, az: 145 };   // live, no pretend sun: a calm, fixed daylight
export const LIVE_SKY = { temp: 22, rain: 0, snow: 0, hail: false, cloud: 0.1, ghi: 700, dni: 800, dhi: 100, wind: 1, gust: 2, windDir: 300, rh: 30, dust: 0, code: 0, kind: "clear" };

// 3D glow of the 4 LDR faces, 0..100, from the controller's relative light (as main.js did)
const glow = (lt, el) => (lt || [100, 100, 100, 100]).map(x => 100 * clamp((x / 100 - 1) / 3, 0, 1) * clamp(el / 10, 0, 1));

export function createDrive({ scene, daysim, clock }) {
  let lastSun = "", lastWx = 0, lastSample = null;
  const tracker = () => scene.tracker;

  function sun(el, az) {
    const k = `${el.toFixed(2)}|${az.toFixed(2)}`;
    if (k !== lastSun) { lastSun = k; scene.setSun(el, az); }
  }
  function weather(sample, force) {
    const now = performance.now();
    if (!force && sample === lastSample) return;
    if (!force && now - lastWx < 200 && lastSample && sample && sample.kind === lastSample.kind) return;   // particles: 5 updates a second is plenty
    lastWx = now; lastSample = sample; scene.setWeather(sample);
  }

  return {
    reset() { lastSun = ""; lastSample = null; },
    // Simulation: the clock already moved; run the sim up to it and show the result.
    sim() {
      daysim.advance(clock.ms, clock.speed);
      const s = daysim.sun, w = daysim.world, t = tracker(), p = daysim.drawPose ? daysim.drawPose() : w;
      sun(s.el, s.az); weather(daysim.weather);
      t.setPan(p.pan); t.setTilt(p.tilt, 90);
      t.setMotion(daysim.panMoving ? Math.sign(w.panSpeed || 1) : 0, Math.abs(w.tiltCmd - w.tilt) > 0.3 ? Math.sign(w.tiltCmd - w.tilt) : 0);
      t.setLights(glow(daysim.ctl.s.rel.map(r => r * 100), s.el));
      if (daysim.soiling) t.setSoiling(daysim.soiling.layers);
    },
    // Live: the real board (or the pretend sun) through live.pose(); the sky is calm daylight,
    // or the clock's sun with the pretend sun on.
    live(live, geo, dt) {
      const p = live.pose(dt), t = tracker(), d = live.data();
      if (live.pretend) { const s = sunAt(clock.ms, geo); sun(s.el, s.az); } else sun(LIVE_SUN.el, LIVE_SUN.az);
      weather(LIVE_SKY);
      t.setPan(p.pan); t.setTilt(p.tilt, p.flat); t.setMotion(p.panDir || 0, p.tiltDir || 0);
      t.setLights((d.lt || [100, 100, 100, 100]).map(x => 100 * clamp((x / 100 - 1) / 3, 0, 1)));
      t.setSoiling({ dust: [0, 0, 0, 0], snow: [0, 0, 0, 0], water: [0, 0, 0, 0], leaves: [0, 0, 0, 0] });
      return p;
    },
    liveSunModel(geo) {   // for the pretend driver: the sun in the model's frame
      const s = sunAt(clock.ms, geo);
      return { el: s.el, az: toModelAz(s.az, geo.lat), lat: geo.lat };
    },
  };
}

// The view for the HUD (see hud.js update and cards.js).
export function simView({ daysim, clock, totals, mode }) {
  const d = daysim.telemetry(), w = daysim.world, L = daysim.soiling && daysim.soiling.layers;
  const p = daysim.drawPose ? daysim.drawPose() : w;   // the same pose the 3D draws
  return {
    mode, d, fresh: true, connected: false,
    ctx: { mode: "sim", sun: true, realLights: false, sens: 50 },
    pose: { pan: p.pan, tilt: p.tilt, flat: 90 }, panMoving: daysim.panMoving, tiltMoving: Math.abs(w.tiltCmd - w.tilt) > 0.3 || daysim.tiltMoving,
    powerW: daysim.powerW, today: daysim.today, totals,
    dust: Object.assign({ st: 0, round: 0 }, d.cl || {}, { dirty: dirtWords(L) }),
    when: { ms: clock.ms, offS: daysim.geo.utcOffsetS }, weatherChip: { sample: daysim.weather, sunEl: daysim.sun.el }, sunEl: daysim.sun.el,
    playing: clock.playing, speed: clock.speed,
  };
}

// The worst layer on the panel in words ("Dusty", "Snow on it" ...), or null when it is clean.
function dirtWords(L) {
  if (!L || dirt(L) <= 0.15) return null;
  const worst = k => (Array.isArray(L[k]) ? Math.max(...L[k]) : 0);
  const [k] = ["dust", "snow", "leaves"].sort((a, b) => worst(b) - worst(a));
  return { dust: "Dusty", snow: "Snow on it", leaves: "Leaves on it" }[k];
}

export function liveView({ live, clock, geo, pose }) {
  const d = live.data(), serial = live.serial, sunEl = live.pretend ? sunAt(clock.ms, geo).el : LIVE_SUN.el;
  return {
    mode: "live", d, fresh: !!d.realLights || serial.fresh, connected: serial.connected,
    ctx: { mode: "live", sun: live.pretend, realLights: live.pretend, sens: live.sens() },
    pose: pose || { pan: d.pan.deg, tilt: d.tilt.ang, flat: live.flat() },
    panMoving: !!(d.pan.us && d.pan.us !== 1500), tiltMoving: !!d.tilt.mv,
    powerW: null, today: null, totals: null,
    dust: Object.assign({ st: 0, round: 0 }, d.cl || {}),
    when: live.pretend ? { ms: clock.ms, offS: geo.utcOffsetS } : null,
    weatherChip: live.pretend ? { sample: LIVE_SKY, sunEl } : null, sunEl,
    playing: clock.playing, speed: clock.speed,
  };
}
