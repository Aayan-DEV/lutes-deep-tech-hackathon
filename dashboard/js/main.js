// Solar tracker dashboard: the desert sun simulation or the live Arduino, one 3D scene and plain words.
import { $, clamp, setHTML } from "./util.js";
import { hi, fillIcons } from "./icons.js";
import { CFG } from "./logic.js";
import { panelFrame } from "./world.js";
import { createSim, SPEEDS } from "./sim.js";
import { REGIONS, SEASONS, fmtHour, partOfDay } from "./sun.js";
import { createSerial } from "./serial.js";
import { createTrackerView } from "./model3d.js";
import { drawSide, createProgress, PARTS } from "./panels.js";
import { createPretendDriver } from "./pretend.js";
import { createLightSetup, savedMap } from "./lightsetup.js";
import { trackState } from "./trackstate.js";

let mode = "sim", picked = null, progress = createProgress(), pretend = false;
// The sun simulation drives the page in Simulation mode, and in Live mode with the pretend sun on
// (then the real motors follow the simulated sun).
const usesSim = () => mode === "sim" || (mode === "live" && pretend);
const sim = createSim();
const serial = createSerial({
  onData: () => { if (serial.stats.json === 1) sendSettings(); },   // first data after connecting: send our settings
  onEvent: step => testEvent(step), onStatus: setStatus,
  onLine: line => { if (line.includes('"hello"')) sendSettings(); },   // the Arduino restarted: send our settings again
});
const tracker = createTrackerView($("stage"), { onPick: id => pick(id) });
// Pretend sun with the real motors: the driver points the real panel at the simulated sun.
const driver = createPretendDriver(line => { if (serial.connected) serial.send(line); });
const shown = { pan: 0 };   // the big motor's angle as drawn: moves at its real speed toward the count
tracker && tracker.setRegion(sim.region);

// ---------- choosing a part ----------
function pick(id) { picked = id || null; tracker && tracker.select(picked); render(); }
$("partChips").innerHTML = PARTS.map(p => `<button data-id="${p.id || ""}">${hi(p.icon)}${p.name}</button>`).join("");
$("partChips").onclick = e => { const b = e.target.closest("button"); if (b) pick(b.dataset.id); };

// ---------- sun controls ----------
$("regions").innerHTML = REGIONS.map(r => `<button data-id="${r.id}">${hi("location")}<div><b>${r.name}</b><span>${r.where}</span></div></button>`).join("");
$("seasons").innerHTML = SEASONS.map(s => `<button data-id="${s.id}">${s.name}</button>`).join("");
$("speeds").innerHTML = SPEEDS.map(s => `<button data-id="${s.id}">${s.name}</button>`).join("");
const pressed = (box, id) => box.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
function showSunControls() {
  pressed($("regions"), sim.region.id); pressed($("seasons"), sim.season);
  pressed($("speeds"), (SPEEDS.find(s => s.secPerDay === sim.secPerDay) || SPEEDS[1]).id);
  setHTML($("hudPlace"), `${hi("location")}<b>${sim.region.name}</b><span>${sim.region.where}</span>`);
}
$("regions").onclick = e => { const b = e.target.closest("button"); if (!b) return; sim.setRegion(b.dataset.id); sim.setHour(sim.rise - 0.4); tracker && tracker.setRegion(sim.region); progress = createProgress(); showSunControls(); };
$("seasons").onclick = e => { const b = e.target.closest("button"); if (!b) return; sim.setSeason(b.dataset.id); sim.setHour(sim.rise - 0.4); progress = createProgress(); showSunControls(); };
$("speeds").onclick = e => { const b = e.target.closest("button"); if (!b) return; sim.secPerDay = SPEEDS.find(s => s.id === b.dataset.id).secPerDay; showSunControls(); };
$("play").onclick = () => {
  sim.playing = !sim.playing;
  setHTML($("play"), `${hi(sim.playing ? "pause" : "play")}<span>${sim.playing ? "Pause" : "Play"}</span>`);
};
let dragging = false;
$("time").addEventListener("input", () => { dragging = true; sim.setHour(+$("time").value); });
$("time").addEventListener("change", () => { dragging = false; });
$("simTrack").addEventListener("input", () => { sim.tracking = $("simTrack").checked; });
// Optional start settings in the address, e.g. ?region=gobi&season=winter&hour=18.5&speed=slow&paused=1
const q = new URLSearchParams(location.search);
if (q.has("region")) { sim.setRegion(q.get("region")); tracker && tracker.setRegion(sim.region); sim.setHour(sim.rise - 0.4); }
if (q.has("season")) { sim.setSeason(q.get("season")); sim.setHour(sim.rise - 0.4); }
if (q.has("speed")) sim.secPerDay = (SPEEDS.find(s => s.id === q.get("speed")) || SPEEDS[1]).secPerDay;
if (q.has("hour")) {   // jump there and let the tracker settle on the sun first
  sim.setHour(+q.get("hour")); const keep = sim.playing; sim.playing = false;
  for (let i = 0; i < 300; i++) sim.step();
  sim.playing = keep;
}
if (q.get("paused") === "1") $("play").click();
showSunControls();

// ---------- live controls ----------
$("modeSim").onclick = () => setMode("sim");
$("modeLive").onclick = () => setMode("live");
$("connect").onclick = async () => { if (!serial.connected) setMode("live"); await serial.connect(); };
setInterval(() => { $("connectLabel").textContent = serial.connected ? "Disconnect" : "Connect"; }, 500);
$("relearn").onclick = () => mode === "sim" ? send("r") : learn(false);
// Learn the room: while it learns, each light keeps the BRIGHTEST it sees (move around, switch room
// lights on and off). Press again when done. Learning again only adds on; "Start over" forgets first.
let learnSince = null;
function learn(add) {
  $("more").open = false;
  if (!serial.connected) { setStatus("Connect the Arduino first."); return; }
  if (learnSince) {   // done
    serial.send("W 0"); learnSince = null;
    setStatus("Learned. Normal is now the brightest the room did. Only light above it counts.");
  } else {
    serial.send(`W 60000 ${add ? 1 : 0}`); learnSince = performance.now();
    setStatus(add ? "Learning the room (adding on). Move around, switch the room lights. Keep the torch off. Press Done when finished."
                  : "Learning the room from scratch. Move around, switch the room lights. Keep the torch off. Press Done when finished.");
  }
  drawLearn();
}
function drawLearn() {
  const on = !!learnSince && performance.now() - learnSince < 60000;
  if (learnSince && !on) learnSince = null;   // the Arduino stops by itself after 60 s
  $("learnLabel").textContent = on ? `Done learning (${Math.floor((performance.now() - learnSince) / 1000)} s)` : "Learn the room";
  $("learn").classList.toggle("dark", on);
  $("learnFresh").hidden = on;
}
$("learn").onclick = () => learn(true);
$("learnFresh").onclick = () => learn(false);
$("test").onclick = () => send("s");
$("pretend").addEventListener("change", () => {
  pretend = $("pretend").checked; progress = createProgress();
  const d = serial.data;
  if (pretend && d) { driver.pan = shown.pan = d.pan.deg; driver.tilt = d.tilt.ang; }   // start from where the Arduino thinks it is
  if (!pretend) { if (serial.connected) serial.send(`M 0 ${driver.tilt.toFixed(1)}`); sim.tracking = $("simTrack").checked; }   // stop the big motor at once
  showControls(); render();
});
// Big motor helpers (pretend sun): where forward is, its real speed, and its direction.
const showMeasure = () => { $("measureV").textContent = driver.measured ? `${Math.round(driver.speed.pos)} / ${Math.round(driver.speed.neg)}°/s, measured` : "not measured yet"; };
$("reverse").checked = driver.reverse; showMeasure();
$("reverse").addEventListener("change", () => driver.setReverse($("reverse").checked));
$("forward").onclick = () => { driver.setForward(); shown.pan = 0; setStatus("Set: this direction is forward (0°)."); };
$("measure").onclick = () => {
  const step = driver.measureClick();
  $("measure").textContent = ["Measure speed", "Stop: it points backwards", "Stop: it faces forward"][step];
  if (step === 1) setStatus("Step 1 of 2: the big motor turns slowly. Press Stop when the front mark points backwards.");
  if (step === 2) setStatus("Step 2 of 2: now it turns back. Press Stop when it faces forward again.");
  if (step === 0) { shown.pan = 0; showMeasure(); sendSettings(); setStatus(`Measured: ${Math.round(driver.speed.pos)}° a second one way, ${Math.round(driver.speed.neg)}° the other. It now counts from forward.`); }
};
// Sensitivity 0..100: 0 = any light moves it (it will flicker), 100 = only very bright light.
// Kept in this browser and sent every time the Arduino connects.
let sensTimer = null;
try { const v = localStorage.getItem("tracker-sensitivity"); if (v !== null) $("sens").value = v; } catch (e) {}
$("sensV").textContent = $("sens").value;
function sendSensitivity() { if (serial.connected) serial.send(`T ${$("sens").value}`); }
// Settings kept in this browser and sent every time the Arduino connects.
function sendSettings() {
  if (!serial.connected) return;
  sendSensitivity();
  const m = savedMap(); if (m) serial.send(`L ${m.join(" ")}`);
  serial.send(`P ${panOn() ? 1 : 0}`);
  if (driver.measured) serial.send(`V ${Math.round(driver.fullSpeed())}`);   // measured speed, so its angle count is right
}
// Big motor connected? Off = it never moves, and it is shown as missing.
const panOn = () => $("panOn").checked;
try { $("panOn").checked = localStorage.getItem("tracker-big-motor-on") !== "0"; } catch (e) {}
driver.panEnabled = panOn();
$("panOn").addEventListener("change", () => {
  try { localStorage.setItem("tracker-big-motor-on", panOn() ? "1" : "0"); } catch (e) {}
  if (serial.connected) serial.send(`P ${panOn() ? 1 : 0}`);
  driver.panEnabled = panOn(); applyPanShown(); showControls(); progress = createProgress();
  setStatus(panOn() ? "Big motor on: it can turn again." : "Big motor off: it will never move, and it is shown as missing.");
});
// Applies everywhere: the simulation's tracker, the pretend sun, the real Arduino and the 3D.
function applyPanShown() { tracker && tracker.setPanEnabled(panOn()); sim.ctl.setPanEnabled(panOn()); }
$("sens").addEventListener("input", () => {
  $("sensV").textContent = $("sens").value;
  try { localStorage.setItem("tracker-sensitivity", $("sens").value); } catch (e) {}
  clearTimeout(sensTimer); sensTimer = setTimeout(sendSensitivity, 120);
});
// Which light is where: guided setup under More.
const lightSetup = createLightSetup({ serial, send: line => serial.send(line), onDone: setStatus });
$("mapLights").onclick = () => { $("more").open = false; if (mode !== "live") setMode("live"); lightSetup.open(); };

async function send(ch) {
  $("more").open = false;
  if (mode === "sim") {
    if (ch === "r") { sim.calibrate(); setStatus("Calibrated the 4 lights."); }
    if (ch === "s") sim.startTest();
    return;
  }
  if (!serial.connected) { setStatus("Connect the Arduino first."); return; }
  await serial.send(ch);
  if (ch === "r") setStatus("Learning the room light. Keep the torch off for a second.");
}
function testEvent(step) {
  const msg = { tilt: "Motor test: the small motor tips up and down…", "pan+": "Motor test: the big motor turns one way…", "pan-": "…and back the other way.", done: "Motor test done." }[step];
  if (msg) setStatus(msg);
}
// Messages you caused (saved, measured…) stay 4 s before the live status line takes over again.
let heldUntil = 0;
function setStatus(t) { $("status").textContent = t; heldUntil = performance.now() + 4000; }
function showControls() {
  $("simControls").hidden = !usesSim(); $("liveControls").hidden = mode !== "live";
  $("motorRow").hidden = !pretend || !panOn(); $("sensRow").hidden = pretend;   // with the pretend sun, the lights do not steer
  applyPanShown();
}
function setMode(m) {
  mode = m; progress = createProgress();
  $("modeSim").setAttribute("aria-pressed", m === "sim"); $("modeLive").setAttribute("aria-pressed", m === "live");
  showControls();
  if (m === "sim") setStatus("Simulation: a day in the desert. The tracker runs the same code as the Arduino.");
}

// ---------- data ----------
const EMPTY = { raw: [0, 0, 0, 0], ok: [1, 1, 1, 1], lt: [100, 100, 100, 100], torch: 0, on: 35,
  pan: { pct: 0, drv: 0, us: 0, deg: 0 }, tilt: { pct: 0, mv: 0, drv: 0, ang: 90 }, cell: { v: 0, ma: 0, mw: 0 }, cfg: { start: 15 } };
function current() {
  if (pretend && mode === "live") return pretendData();
  if (usesSim()) return sim.telemetry();
  const d = serial.data;
  if (!d) return EMPTY;
  return Object.assign({}, EMPTY, d, { pan: Object.assign({}, EMPTY.pan, d.pan), tilt: Object.assign({}, EMPTY.tilt, d.tilt), cfg: Object.assign({}, EMPTY.cfg, d.cfg) });
}
const pose = d => usesSim() ? { pan: sim.world.pan, tilt: sim.world.tilt } : { pan: d.pan.deg, tilt: d.tilt.ang };
// Pretend sun: the sun, aim and energy come from the simulation, the motors from the driver, and
// the 4 lights are the REAL readings from the Arduino.
function pretendData() {
  const d = sim.telemetry(), real = serial.data;
  if (real) { for (const k of ["raw", "room", "ok", "lt", "rl", "on", "off"]) if (k in real) d[k] = real[k]; }
  else Object.assign(d, { raw: [0, 0, 0, 0], ok: [0, 0, 0, 0], lt: [100, 100, 100, 100] });
  d.realLights = true;
  const turning = performance.now() < driver.busyUntil && driver.turning;
  d.pan = { us: turning ? 1500 + driver.turning * driver.jogUs : 0, deg: driver.pan, pct: 0, drv: turning ? 100 : 0, diff: 0 };
  d.tilt = { ang: driver.tilt, mv: Math.abs(sim.world.tilt - driver.tilt) > 0.5 ? 1 : 0, drv: 100, pct: 0, diff: 0 };
  d.torch = sim.sun.el > 0 ? 1 : 0; d.sk = 0;
  return d;
}

// Live only: where the light probably comes from, from which side is brighter.
function estimateLight(d) {
  const tu = Math.tan(clamp(Math.sign(d.pan.diff || 0) * d.pan.pct * 0.6, -60, 60) * Math.PI / 180);
  const tv = Math.tan(clamp(Math.sign(d.tilt.diff || 0) * d.tilt.pct * 0.6, -60, 60) * Math.PI / 180);
  const f = panelFrame(d.pan.deg, d.tilt.ang), L = [0, 1, 2].map(k => f.n[k] + tu * f.u[k] + tv * f.v[k]), n = L.map(x => x / Math.hypot(...L));
  return { az: Math.atan2(n[0], n[2]) * 180 / Math.PI, el: Math.asin(clamp(n[1], -1, 1)) * 180 / Math.PI };
}

// ---------- 10 times a second: words ----------
function render() {
  const d = current(), sun = usesSim(), fresh = sun || serial.fresh;
  const ctx = { mode, sun, fresh, progress, pose: pose(d), aim: sun && sim.sun.el > 0 ? sim.world.aim() : null, realLights: !!d.realLights,
    panOff: !panOn(), sens: d.cfg && "sl" in d.cfg ? d.cfg.sl : +$("sens").value };
  if (fresh) progress.add(d);
  drawSide(picked, d, ctx);
  while (sim.events.length) testEvent(sim.events.shift());
  if (sun) {
    setHTML($("hudTime"), `${hi(sim.sun.el > 0 ? "sun" : "moon")}<b>${fmtHour(sim.hour)}</b><span>${partOfDay(sim.sun.el, sim.hour)}</span>`);
    if (!dragging) $("time").value = sim.hour.toFixed(2);
    $("timeV").textContent = fmtHour(sim.hour);
  } else {
    // live sign: shows whether new data is still arriving
    const age = serial.lastData ? (performance.now() - serial.lastData) / 1000 : null;
    const live = serial.fresh && age < 0.5;
    setHTML($("hudTime"), `<span class="live-dot ${live ? "on" : ""}"></span><b>${live ? "Live" : "No new data"}</b><span>${
      live ? (d.torch ? "torch seen" : "no torch") : age == null ? "not connected" : `for ${age.toFixed(0)} s`}</span>`);
  }
  if (mode === "live") { if (performance.now() > heldUntil) $("status").textContent = liveStatus(); drawSensNow(); drawLearn(); }
  lightSetup.tick();
}
// Next to the slider, one word: is it reacting to the light right now? (the Arduino's own decision)
function drawSensNow() {
  const d = serial.data, el = $("sensState");
  if (!serial.fresh || pretend) { el.textContent = "–"; el.className = "state"; return; }
  if (!d.cfg || !("sl" in d.cfg) || !("ln" in d)) { el.textContent = "update tracker.ino"; el.className = "state"; return; }
  const st = trackState(d);
  el.textContent = st.word;
  el.className = "state " + (st.kind === "move" || st.kind === "good" ? "yes" : st.word === "Learning" ? "" : "no");
  el.title = Array.isArray(d.bal) ? `Moves when the sides differ by more than ${Math.round(d.cfg.start)} %. Now: left and right ${d.bal[0]} %, top and bottom ${d.bal[1]} %.` : "";
}
function liveStatus() {
  const g = serial.diagnose();
  if (pretend) {
    if (!serial.connected) return "Pretend sun: click Connect so the real motors can follow it.";
    if (serial.fresh && !("rm" in serial.data)) return "The Arduino has older code. Upload the new tracker.ino so the real motors can follow the pretend sun.";
    return "The real motors are following the pretend sun.";
  }
  return g.state === "ok" ? "Live from the Arduino: real light, real motors." : g.text + (g.sub ? ". " + g.sub : "");
}

// ---------- every animation frame: 3D ----------
const smooth = { pan: 0, tilt: 90 };
let lastFrame = performance.now(), frameDt = 16;
function frame() {
  const nowF = performance.now(); frameDt = Math.min(100, nowF - lastFrame); lastFrame = nowF;
  if (tracker) {
    const d = current(), light = (d.lt || [100, 100, 100, 100]).map(x => clamp((x / 100 - 1) / 3, 0, 1));
    let v;
    if (usesSim()) {
      const w = sim.world, s = sim.ctl.s;
      v = { pan: panOn() ? w.pan : 0, tilt: w.tilt, panDir: panOn() && Math.abs(w.panSpeed) > 6 ? Math.sign(w.panSpeed) : 0,
        tiltDir: Math.abs(w.tiltCmd - w.tilt) > 0.3 ? Math.sign(w.tiltCmd - w.tilt) : 0,
        sun: { el: sim.sun.el, az: sim.sun.az }, light: light.map(x => x * clamp(sim.sun.el / 10, 0, 1)) };
    } else {
      // quick follow (about 0.08 s), so the 3D keeps up with the 20 updates a second
      const k = 1 - Math.exp(-frameDt / 80);
      smooth.pan += (d.pan.deg - smooth.pan) * k; smooth.tilt += (d.tilt.ang - smooth.tilt) * k;
      const turning = panOn() && d.pan.us && d.pan.us !== 1500;
      // calm, fixed daylight: the 3D only shows what the motors are told, it does not guess the light's position
      v = { pan: panOn() ? smooth.pan : 0, tilt: smooth.tilt, panDir: turning ? Math.sign(d.pan.us - 1500) : 0, tiltDir: d.tilt.mv ? Math.sign(d.tilt.diff || 1) : 0,
        sun: { el: 48, az: 35 }, light };
    }
    tracker.update(v); tracker.frame();
  }
  requestAnimationFrame(frame);
}

// ---------- clocks ----------
let acc = 0, lastT = performance.now();
setInterval(() => {   // fixed 10 ms simulation clock
  const now = performance.now(), dt = Math.min(500, now - lastT); lastT = now;
  if (usesSim()) {
    acc += dt;
    while (acc >= CFG.UPDATE_MS) {
      if (pretend && mode === "live") {
        // the drawn panel follows the real motors: tilt at once, pan at the big motor's real speed
        const step = driver.degPerSec * CFG.UPDATE_MS / 1000;
        shown.pan += clamp(driver.pan - shown.pan, -step, step);
        Object.assign(sim.world, { pan: shown.pan, panSpeed: 0, tilt: driver.tilt, tiltCmd: driver.tilt });
        sim.ctl.s.angle = driver.tilt; sim.tracking = false;
      }
      sim.step(); acc -= CFG.UPDATE_MS;
      if (!panOn()) { sim.world.panSpeed = 0; }
    }
  }
}, 15);
// Pretend sun: send the motor moves to the Arduino 50 times a second. If they stop, it stops by itself.
let sending = false;
setInterval(() => {
  if (mode !== "live" || !pretend || !serial.connected || sending) return;
  sending = true;
  driver.update(sim.sun, sim.region.lat, $("simTrack").checked);   // sends one line: a timed turn or a keep-alive
  Promise.resolve(serial.writer && serial.writer.ready).finally(() => { sending = false; });
}, 20);
setInterval(render, 50);   // 20 times a second, like the Arduino's updates
fillIcons();
setHTML($("play"), `${hi("pause")}<span>Pause</span>`);
setMode("sim");
render();
requestAnimationFrame(frame);
window.__tracker = { sim, serial, setMode, tracker };   // for debugging from the browser console
