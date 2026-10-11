// game.html: boot, the one animation loop, the 3 modes (Story, Simulation, Live), the address
// settings (?mode=sim&region=gobi&date=2024-06-21T10:00&speed=90s&paused=1&weather=dust) and the
// wiring between the sun, scene, the sim, soiling, the HUD and the serial port.
// The Simulation plays one clear day at one place (gobi unless ?region= says otherwise) on repeat
// (dayloop.js), with weather buttons on top: each one plays a storm, the tracker cleaning itself
// and the clean panel by itself (stormrun.js, sky from sim/daysim_weather.js). The real weather files still
// load: the story uses their interesting days and the 3-year totals.
// Modules other people build (weather, soiling, story, the scene parts) load with import() and may
// be missing: the page then runs with a clear sky, a clean panel and no story.
import { createBus } from "./bus.js";
import { createClock } from "./clock.js";
import { createDayLoop, DAY_SPEEDS } from "./dayloop.js";
import { createStormRun } from "./stormrun.js";
import { createDrive, simView, liveView } from "./drive.js";
import { createLive } from "./live.js";
import { createSync } from "./sync.js";
import { createHardware } from "./hardware.js";
import { createSessionLog } from "./sessionlog.js";
import { lights } from "../hud/lights.js";
import { createScene } from "../scene/scene.js";
import { createHud } from "../hud/hud.js";
import { createDaySim } from "../sim/daysim.js";
import { createWeatherMix, WEATHERS } from "../sim/daysim_weather.js";
import { regionGeo, regionById } from "../sim/daysim_sun.js";

const tryImport = async path => { try { return await import(path); } catch (e) { console.warn(`[app] ${path} not loaded:`, e.message); return null; } };
const MODES = ["story", "sim", "live"];
const q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);

const HOME = regionById(q.get("region") || "gobi").id;   // the one place of the Simulation
const bus = createBus(), hud = createHud({ bus });
const scene = createScene($("view"));
let regionId = HOME, geo = regionGeo(regionId);
let startAt = parseTime(q.get("date"));   // only for the first day
const clock = createClock({ playing: q.get("paused") !== "1" });
const day = createDayLoop(clock);
const daysim = createDaySim({ regionId });
const mix = createWeatherMix();
daysim.weatherMix = mix;
const drive = createDrive({ scene, daysim, clock });
const live = createLive({ getSun: () => drive.liveSunModel(geo), onConnected: on => hud.setConnected(on) });
const sync = createSync({ live, scene, onDone: text => hud.toast(text) });
// The story drives the real tracker through this (see hardware.js): the 3D then shows the real motors.
const hardware = createHardware({ live, sync, onFollow: on => { live.following = on; $("followChip").hidden = !on; } });
hardware.attach(scene.tracker);
live.onLightStep = i => scene.lightNums.highlight(i);
// Every connected session goes to dashboard/logs/ (sessionlog.js): what the board sent, every command,
// and what the page showed. r1: one decimal.
const r1 = x => (Number.isFinite(+x) ? Math.round(x * 10) / 10 : null);
createSessionLog({ live, onSaved: text => hud.toast(text, 5000), getState: () => {
  const d = live.data(), p = livePose;
  return {
    mode: app.mode, sync: sync.active ? (sync.step || "on") : null, at: sync.active ? sync.at : undefined,
    pretend: live.pretend, following: !!live.following, sens: +$("sens").value,
    drawn: p ? { pan: r1(p.pan), tilt: r1(p.tilt), flat: r1(p.flat) } : null,
    nums: lights(d, { mode: "live", sun: live.pretend, realLights: live.pretend, sens: live.sens() }).map(l => (l.ok ? l.pct : null)),
  };
} });
scene.hardware = hardware;
const app = { hardware, mode: null, story: null, weatherMod: null, eventsMod: null, soilMod: null, storyMod: null, totals: null, events: [], fps: 0 };
const seriesCache = new Map();
daysim.events = () => app.events;   // for the story: the interesting days of the place
if (DAY_SPEEDS.some(s => s.id === q.get("speed"))) day.setSpeed(q.get("speed"));

// ---------- the place: its day, and (in the background) its weather file for the story ----------
function loadSeries(id) {
  if (!seriesCache.has(id)) seriesCache.set(id, (async () => {
    if (!app.weatherMod || !app.weatherMod.loadWeather) return null;
    try { return await app.weatherMod.loadWeather(id); } catch (e) { console.warn(`[app] weather for ${id}:`, e.message); return null; }
  })());
  return seriesCache.get(id);
}
async function useRegion(id) {
  regionId = id; geo = regionGeo(id);
  hud.setRegion(id); scene.setRegion(id);
  daysim.setRegion(id, null);
  resetDay();
  const series = await loadSeries(id);
  if (regionId !== id || !series) return;
  daysim.seriesFor[id] = series;   // for totals(id) only: the Simulation does not show the real weather
  try { app.events = app.eventsMod ? app.eventsMod.pickEvents(series) : []; } catch (e) { console.warn("[app] pickEvents", e); app.events = []; }
  setTimeout(() => { if (regionId === id) { try { app.totals = daysim.totals(id); } catch (e) { console.warn("[app] totals", e); } } }, 300);
}
// Back to the start of the clear day (or the address's time, the first time).
function resetDay() {
  day.setPlace(geo, startAt); startAt = null;
  daysim.jump(clock.ms); drive.reset();
}
// A storm button starts a run (stormrun.js): the storm, the cleaning, the clean panel, then the
// chosen day speed again. The same button while it runs cancels it; Clear only clears the sky.
function setWeather(id) {
  if (id === "clear" || app.mode !== "sim") { run.cancel(); mix.set("clear"); return; }
  if (run.active) { if (run.id === id) { run.cancel(); hud.toast("Stopped. What landed stays until the panel shakes it off.", 3500); } return; }
  clock.playing = true; run.start(id);
  if (run.phase === "landing") hud.toast("Watch it land on the panel, then the tracker rocks it off.", 3000);
}

// ---------- modes ----------
async function setMode(m) {
  if (!MODES.includes(m)) m = "sim";
  if (m === app.mode) return;
  const prev = app.mode;
  if (prev === "story" && app.story) app.story.stop();
  if (prev === "story") { hardware.cancelWatches(); hardware.release(); if (sync.active) sync.cancel(); }
  if (prev === "live" && sync.active) sync.cancel();
  if (prev === "sim") { run.cancel(); mix.set("clear"); }
  app.mode = m; hud.setMode(m); live.active = m === "live"; drive.reset();
  scene.tracker.setBuildProgress(1); scene.select(null); fitInset();
  const url = new URL(location.href); url.searchParams.set("mode", m); history.replaceState(null, "", url);
  // after the story: the home place, a clear sky, the start of the day, playing
  if (prev === "story" && m !== "story") {
    setWeather("clear"); clock.playing = true;
    if (regionId !== HOME || scene.regionId !== HOME) useRegion(HOME); else { scene.setRegion(HOME); resetDay(); }
  }
  if (m === "sim") { daysim.jump(clock.ms); scene.lookAt("close", 1.2); }
  if (m === "live") { hud.setPretend(live.pretend); scene.lookAt("close", 1.2); }
  if (m === "story") await startStory();
}
async function startStory() {
  if (!app.storyMod) {
    hud.showCard({ title: "The story is not ready yet", text: "Try the Simulation: one day, any weather, the same code as the Arduino.",
      buttons: [{ id: "sim", label: "Go to Simulation", primary: true, onClick: () => { hud.hideCard(); setMode("sim"); } }] });
    return;
  }
  try {
    if (!app.story) {
      app.story = app.storyMod.createStory({ scene, clock, hud, sim: daysim, regionId, events: app.events, hardware,
        onExit: mode => setMode(mode === "live" ? "live" : mode === "story" ? "story" : "sim") });
      hud.setStory(app.story);
    }
    app.story.start(0);
  } catch (e) {
    console.error("[app] story failed:", e); app.story = null;
    hud.showCard({ title: "The story could not start", text: "Something went wrong in the story. The Simulation works.",
      buttons: [{ id: "sim", label: "Go to Simulation", primary: true, onClick: () => { hud.hideCard(); setMode("sim"); } }] });
  }
}

// The cards cover the right side in Simulation and Live: centre the 3D in the space left of them.
function fitInset() {
  const col = $("col").getBoundingClientRect();
  scene.setInset(app.mode !== "story" && col.width > 0 ? Math.max(0, window.innerWidth - col.left) : 0);
}
window.addEventListener("resize", fitInset);

// ---------- what the HUD asks for ----------
bus.on("mode", m => setMode(m));
bus.on("connect", async () => { if (!live.serial.connected && app.mode !== "live") await setMode("live"); await live.connect(); });
bus.on("play", () => { clock.playing = !clock.playing; });
bus.on("daySpeed", id => day.setSpeed(id));
bus.on("weather", id => setWeather(id));
bus.on("dust", () => {
  if (app.mode === "live") live.dust();
  else { daysim.dustNow(0.7); hud.toast("Dust on the panel. Watch the lights drop, then the panel rocks to shake it off."); }
});
scene.onPick = id => { if (id && app.mode !== "story") hud.highlight(id); };
// The weather buttons' runs; the particles reaching the panel tell it which quarter gets more.
const run = createStormRun({ mix, daysim, toast: (text, ms) => hud.toast(text, ms) });
scene.onDeposit = (kind, quadrant, amount) => { if (app.mode === "sim") run.hit(kind, quadrant, amount); };
$("syncBtn").onclick = () => sync.start();
$("pretend").addEventListener("change", () => hud.setPretend(live.pretend));
window.addEventListener("story:exit", () => hud.hideCard());

// ---------- the loop: one requestAnimationFrame, paused while the tab is hidden ----------
let last = performance.now(), hudT = 0, frames = 0, fpsT = 0, scheduled = false, livePose = null;
function loop(t) {
  scheduled = false;
  const dt = Math.min(0.1, Math.max(0, (t - last) / 1000)); last = t;
  try {
    if (app.mode === "story") {
      if (app.story) app.story.frame(dt);
      if (sync.active) { sync.frame(dt); hardware.drawRaw(sync.pose); }   // Sync up started from the story
      else hardware.draw();                                               // following: the real motors' count
    }
    else if (app.mode === "sim") {
      daysim.depositStorms = !!scene.particles.stub && !run.active;   // no particles: storms add their own dirt (a run lands its own)
      // the cleaning takes seconds: while it runs, the clock slows to real time so you can watch it
      // (a weather run sets its own pace: real time to land, faster through the routine's holds)
      const cl = daysim.ctl.s.clState, slow = cl === 1 || cl === 2;
      if (slow && !run.active && !app.slowed) hud.toast("Slowed to real time while the panel cleans itself.", 3000);
      app.slowed = slow;
      if (clock.playing) run.frame(dt);
      const pace = run.timeScale || (slow ? 1 : 0);   // sim seconds per real second, 0 = the day's speed
      clock.step(dt, pace ? pace / clock.speed : day.factor()); day.wrap(); drive.sim();
      if (clock.ms - daysim.t > 1) clock.setDate(daysim.t);   // a cleaning started mid frame: wait there
    } else if (app.mode === "live") {
      if (live.pretend) { clock.step(dt, day.factor()); day.wrap(); }
      if (sync.active) sync.frame(dt);
      livePose = drive.live(live, geo, dt);
    }
    scene.frame(dt);
  } catch (e) { console.error("[app] frame failed:", e); }
  hudT += dt; frames++; fpsT += dt;
  if (fpsT >= 1) { app.fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }
  if (hudT >= 0.1) {   // the HUD: at most 10 updates a second
    hudT = 0;
    try {
      const rv = run.view(), extra = { speedId: day.speedId, weatherId: rv ? rv.id : mix.id, run: rv, cleanAgain: !!rv && rv.phase === "done" };
      let view = null;
      if (app.mode === "sim") hud.update(view = Object.assign(simView({ daysim, clock, totals: app.totals, mode: "sim" }), extra));
      else if (app.mode === "live") { hud.update(view = Object.assign(liveView({ live, clock, geo, pose: livePose }), extra)); live.tick(); }
      else hud.update({ when: null, weatherChip: null });
      scene.lightNums.setVisible(!!view); if (view) scene.lightNums.set(view);
      hud.setConnected(live.serial.connected);
    } catch (e) { console.error("[app] HUD update failed:", e); }
  }
  schedule();
}
function schedule() { if (!scheduled && !document.hidden) { scheduled = true; requestAnimationFrame(loop); } }
document.addEventListener("visibilitychange", () => { if (!document.hidden) { last = performance.now(); schedule(); } });

// ---------- boot ----------
// Water runs off a steep glass in about a second (soiling.js's own 0.8 per second leaves half of
// the rain on after one rocking of the cleaning routine). Fresh snow on smooth glass slides a bit
// faster than soiling.js's 0.3 per second too: with 0.45 one rocking takes a storm's snow off
// (0.3 leaves a film of about 0.15, and a second rocking costs 3 more seconds of the run).
const soilCfg = base => (base ? Object.assign({}, base, { WATER_DRAIN: 4, SNOW_SLIDE: 0.45 }) : undefined);
// ?date=2024-06-21T10:00 (or just 10:00): the start time of the first day (the date part is ignored)
function parseTime(s) {
  const m = s && /(?:^|[T ])(\d{1,2}):(\d{2})$/.exec(s);
  return m ? { hh: +m[1], mm: +m[2] } : null;
}
(async function boot() {
  [app.weatherMod, app.eventsMod, app.soilMod, app.storyMod] = await Promise.all(
    ["../weather/weather.js", "../weather/events.js", "../sim/soiling.js", "../story/story.js"].map(tryImport));
  if (app.soilMod && app.soilMod.createSoiling) { try { daysim.soiling = app.soilMod.createSoiling(soilCfg(app.soilMod.SOIL)); } catch (e) { console.warn("[app] soiling", e); } }
  const regionReady = useRegion(HOME);
  let seen = false; try { seen = localStorage.getItem("tracker-game-seen") === "1"; localStorage.setItem("tracker-game-seen", "1"); } catch (e) {}
  const want = q.get("mode") || (seen ? "sim" : "story");   // the story first, the first time
  if (want === "story") await regionReady;   // the story wants the weather events
  await setMode(want === "simulation" ? "sim" : want);
  if (WEATHERS.some(w => w.id === q.get("weather")) && app.mode === "sim") setWeather(q.get("weather"));
  schedule();
  scene.ready.then(loaded => { console.info("[app] scene parts loaded:", Object.keys(loaded).join(", ") || "none"); if (app.mode !== "story") scene.setRegion(regionId); drive.reset(); });
})();
window.__game = { app, hardware, scene, clock, day, mix, daysim, hud, live, sync, bus, run, setMode, useRegion, setWeather };   // for tests and the console
