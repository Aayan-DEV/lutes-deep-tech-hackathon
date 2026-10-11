// Live mode: the real Arduino over Web Serial. Ported from main.js without changing what it does:
// the same serial commands (T, L, P, V, W, s, M, J, z, plus D for dust) and the same localStorage
// keys (tracker-sensitivity, tracker-light-map, tracker-big-motor), so the Arduino side keeps working.
// The big motor is always connected now: settings always send "P 1".
// createLive({ getSun }) -> { serial, driver, lightSetup, data(), pose(dt), tick(), active, setActive(on), ... }
// getSun() -> { el, az (model frame), lat } for the pretend sun.
import { $, clamp } from "../util.js";
import { CFG } from "../logic.js";
import { createSerial } from "../serial.js";
import { createPretendDriver } from "../pretend.js";
import { createLightSetup, savedMap, boardHas } from "../lightsetup.js";
import { trackState } from "../trackstate.js";

const EMPTY = { raw: [0, 0, 0, 0], ok: [1, 1, 1, 1], lt: [100, 100, 100, 100], torch: 0, on: 35,
  pan: { pct: 0, drv: 0, us: 0, deg: 0 }, tilt: { pct: 0, mv: 0, drv: 0, ang: 90 }, cell: { v: 0, ma: 0, mw: 0 }, cfg: { start: 15 } };

export function createLive({ getSun, onConnected }) {
  let heldUntil = 0, learnSince = null, sensTimer = null, sending = false;
  const live = { active: false, pretend: false, sync: null, lightsHook: null, dataFns: new Set(), lineFns: new Set(), note: () => {} };   // dataFns: hardware.onTelemetry; lineFns, note: the session log
  const setStatus = t => { $("liveStatus").textContent = t; heldUntil = performance.now() + 4000; };
  live.setStatus = setStatus;

  const serial = createSerial({
    onData: d => {
      if (serial.stats.json === 1) sendSettings();   // first data after connecting: our settings (no "z": the board sets its front at power-up; a connect mid-run must not move it)
      // big motor off ("P 0") or not responding (the board's watchdog): the pretend sun does not wait on turns
      driver.panStuck = d.pe === 0 || !!(d.pan && d.pan.stuck);
      for (const fn of live.dataFns) { try { fn(d); } catch (e) { console.warn("[live] telemetry listener", e); } }
    },
    onEvent: step => testEvent(step), onStatus: setStatus,
    onLine: line => {
      for (const fn of live.lineFns) { try { fn(line); } catch (e) { console.warn("[live] line listener", e); } }
      if (line.includes('"hello"')) sendSettings();   // the Arduino restarted (it set its own front): send our settings again
    },
  });
  const driver = createPretendDriver(line => { if (serial.connected) serial.send(line); }, () => live.flat());
  const lightSetup = createLightSetup({ serial, send: line => serial.send(line),
    onDone: text => { setStatus(text); if (live.lightsHook) live.lightsHook(text); },
    onStep: i => live.onLightStep && live.onLightStep(i) });   // app.js: the 3D marks the light to cover
  Object.assign(live, { serial, driver, lightSetup });
  const shown = { pan: 0 };   // the big motor's angle as drawn with the pretend sun: moves at its real speed
  const smooth = { pan: 0, tilt: 90 };

  live.connect = async () => { await serial.connect(); onConnected && onConnected(serial.connected); };
  live.send = line => serial.connected && serial.send(line);
  live.dust = () => { if (!serial.connected) { setStatus("Connect the Arduino first."); return; } serial.send("D 1"); setStatus("Cleaning: the panel rocks back and forth to shake the dust off."); };

  // ---- learn the room (W), sensitivity (T), settings sent on connect ----
  function learn(add) {
    
    if (!serial.connected) { setStatus("Connect the Arduino first."); return; }
    if (learnSince) { serial.send("W 0"); learnSince = null; setStatus("Learned. Normal is now the brightest the room did. Only light above it counts."); }
    else {
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
  $("test").onclick = () => { if (!serial.connected) { setStatus("Connect the Arduino first."); return; } serial.send("s"); };
  $("mapLights").onclick = () => { lightSetup.open(); };
  try { const v = localStorage.getItem("tracker-sensitivity"); if (v !== null) $("sens").value = v; } catch (e) {}
  $("sensV").textContent = $("sens").value;
  const sendSensitivity = () => { if (serial.connected) serial.send(`T ${$("sens").value}`); };
  function sendSettings() {
    if (!serial.connected) return;
    sendSensitivity();
    const m = savedMap(); if (m && !boardHas(serial.data, m)) serial.send(`L ${m.join(" ")}`);   // the board remembers it: only when it differs
    serial.send("P 1");   // the big motor is always connected
    if (driver.measured) serial.send(`V ${Math.round(driver.fullSpeed())}`);   // measured speed, so its angle count is right
  }
  live.sendSettings = sendSettings;
  $("sens").addEventListener("input", () => {
    $("sensV").textContent = $("sens").value;
    try { localStorage.setItem("tracker-sensitivity", $("sens").value); } catch (e) {}
    clearTimeout(sensTimer); sensTimer = setTimeout(sendSensitivity, 120);
  });

  // ---- pretend sun: the real motors follow the simulated sun ----
  $("pretend").addEventListener("change", () => {
    live.pretend = $("pretend").checked;
    const d = serial.data;
    if (live.pretend && d) { driver.pan = shown.pan = d.pan.deg; driver.tilt = d.tilt.ang; }   // start from where the Arduino thinks it is
    if (!live.pretend && serial.connected) serial.send(`M 0 ${driver.tilt.toFixed(1)}`);       // stop the big motor at once
    showControls();
  });
  const showMeasure = () => { $("measureV").textContent = driver.measured ? `${Math.round(driver.speed.pos)} / ${Math.round(driver.speed.neg)}°/s, measured` : "not measured yet"; };
  showMeasure();
  live.showMeasure = showMeasure;   // the big motor's direction is the board's now ("Q 0/1", set by Sync up)
  $("forward").onclick = () => { driver.setForward(); shown.pan = 0; setStatus("Set: this direction is forward (0°)."); };
  $("measure").onclick = () => {
    if (!driver.measureStep && !live.pretend) driver.tilt = live.flat();   // measure with the panel flat
    const step = driver.measureClick();
    $("measure").textContent = ["Measure speed", "Stop: it points backwards", "Stop: it faces forward"][step];
    if (step === 1) setStatus("Step 1 of 2: the big motor turns slowly. Press Stop when the front mark points backwards.");
    if (step === 2) setStatus("Step 2 of 2: now it turns back. Press Stop when it faces forward again.");
    if (step === 0) { shown.pan = 0; showMeasure(); sendSettings(); setStatus(`Measured: ${Math.round(driver.speed.pos)}° a second one way, ${Math.round(driver.speed.neg)}° the other. It now counts from forward.`); }
  };
  function showControls() { $("motorRow").hidden = !live.pretend; $("sensRow").hidden = live.pretend; }   // with the pretend sun, the lights do not steer
  showControls();
  // 50 times a second: one line to the Arduino (a timed turn or a keep-alive), as main.js does
  setInterval(() => {
    if (!live.active || !live.pretend || live.sync || live.following || !serial.connected || sending) return;
    sending = true;
    const sun = getSun();
    driver.update(sun, sun.lat, true);
    Promise.resolve(serial.writer && serial.writer.ready).finally(() => { sending = false; });
  }, 20);

  function testEvent(step) {
    const msg = { tilt: "Motor test: the small motor tips up and down…", "pan+": "Motor test: the big motor turns one way…", "pan-": "…and back the other way.", done: "Motor test done." }[step];
    if (msg) setStatus(msg);
  }

  // ---- data for the HUD and the 3D ----
  live.data = () => {
    const d = serial.data;
    if (live.pretend) {
      const sun = getSun(), out = Object.assign({}, EMPTY, { realLights: true });
      if (d) { for (const k of ["raw", "room", "ok", "lt", "rl", "on", "off", "cell", "cfg", "cl"]) if (k in d) out[k] = d[k]; }
      else Object.assign(out, { raw: [0, 0, 0, 0], ok: [0, 0, 0, 0], lt: [100, 100, 100, 100] });
      const turning = performance.now() < driver.busyUntil && driver.turning;
      out.pan = { us: turning ? 1500 + driver.turning * driver.jogUs : 0, deg: driver.pan, pct: 0, drv: turning ? 100 : 0, diff: 0 };
      out.tilt = { ang: driver.tilt, mv: 0, drv: 100, pct: 0, diff: 0 };
      out.torch = sun.el > 0 ? 1 : 0; out.sk = 0;
      return out;
    }
    if (!d) return EMPTY;
    return Object.assign({}, EMPTY, d, { pan: Object.assign({}, EMPTY.pan, d.pan), tilt: Object.assign({}, EMPTY.tilt, d.tilt), cfg: Object.assign({}, EMPTY.cfg, d.cfg) });
  };
  // The board's flat angle (cfg.up), 10..170 as the board's "U". Anything outside is not a flat angle
  // (an unset or garbled value would otherwise flip the 3D panel upside down): treat it as 90.
  live.flat = () => {
    const d = serial.data, up = d && d.cfg ? +d.cfg.up : NaN;
    return Number.isFinite(up) && up >= CFG.TILT_UP_MIN && up <= CFG.TILT_UP_MAX ? up : 90;
  };
  // The pose to draw: the real board (pan from pan.deg, tilt from tilt.ang, flat from cfg.up), quickly
  // smoothed; with the pretend sun, the driver's count moving at the big motor's real speed.
  live.pose = dtS => {
    if (live.sync && live.sync.pose) return live.sync.pose;
    const d = live.data(), flat = live.flat();
    if (live.pretend) {
      const step = driver.degPerSec * dtS;
      shown.pan += clamp(driver.pan - shown.pan, -step, step);
      return { pan: shown.pan, tilt: driver.tilt, flat, panDir: driver.turning || 0, tiltDir: 0 };
    }
    const k = 1 - Math.exp(-dtS * 1000 / 80);   // about 0.08 s, keeps up with 20 updates a second
    smooth.pan += (d.pan.deg - smooth.pan) * k; smooth.tilt += (d.tilt.ang - smooth.tilt) * k;
    const turning = d.pan.us && d.pan.us !== 1500, flip = d.cfg && d.cfg.prev ? -1 : 1;   // pan.us is the pulse sent: "Q 1" flips it
    return { pan: smooth.pan, tilt: smooth.tilt, flat, panDir: turning ? flip * Math.sign(d.pan.us - 1500) : 0, tiltDir: d.tilt.mv ? Math.sign(d.tilt.diff || 1) : 0 };
  };

  // ---- 10 times a second: words ----
  live.tick = () => {
    if (performance.now() > heldUntil) $("liveStatus").textContent = liveStatus();
    drawSensNow(); drawLearn(); lightSetup.tick();
  };
  function drawSensNow() {
    const d = serial.data, el = $("sensState");
    if (!serial.fresh || live.pretend) { el.textContent = "–"; el.className = "state"; return; }
    if (!d.cfg || !("sl" in d.cfg) || !("ln" in d)) { el.textContent = "update tracker.ino"; el.className = "state"; return; }
    const st = trackState(d);
    el.textContent = st.word;
    el.className = "state " + (st.kind === "move" || st.kind === "good" ? "yes" : st.word === "Learning" ? "" : "no");
    el.title = Array.isArray(d.bal) ? `Moves when the sides differ by more than ${Math.round(d.cfg.start)} %. Now: left and right ${d.bal[0]} %, top and bottom ${d.bal[1]} %.` : "";
  }
  function liveStatus() {
    const g = serial.diagnose();
    if (live.pretend) {
      if (!serial.connected) return "Pretend sun: click Connect so the real motors can follow it.";
      if (serial.fresh && !("rm" in serial.data)) return "The Arduino has older code. Upload the new tracker.ino so the real motors can follow the pretend sun.";
      return "The real motors are following the pretend sun.";
    }
    return g.state === "ok" ? "Live from the Arduino: real light, real motors." : g.text + (g.sub ? ". " + g.sub : "");
  }
  live.sens = () => { const d = serial.data; return d && d.cfg && "sl" in d.cfg ? d.cfg.sl : +$("sens").value; };
  return live;
}
