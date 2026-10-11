// "Sync up": a guided check that the real tracker and the 3D one move the same way, and that the board's
// own tracking turns toward the light. From the Live column, or from the story through
// hardware.calibrate() (then app.js draws sync.pose in story mode too). Every press runs it all again.
//  1. Small motor: (a) the flat sweep. "R 0" first (so the angle is the servo's own), then it goes to
//     10, 20, ... 170 degrees, one stop at a time ("U a" and "M 0 a": the board's range follows "U"),
//     asking "Is the real panel flat now?" No moves 10 more, Back 10 less, Yes keeps it. (b) + and -
//     fine tune by 2 degrees. (c) the lean check: it goes to its front end (flat + 45); does it lean
//     forward like on screen? Yes keeps "R 0". No sends "R 1" and "U <180 - flat>" (the reversed
//     servo counts the other way round, so the same real flat spot is 180 - flat).
//  2. Big motor: (0) where it starts turning (syncstart.js): the pulse grows from the stop pulse until the
//     user presses "It turns now", once each way; the larger goes to the board ("K s", remembered) and
//     the page's steady pulse (driver.setStart). (a) hold Left or Right until it faces you, then "It matches" ("z", the count starts
//     at 0). (b) "Q 0", one timed turn to the right; same way? Yes keeps "Q 0", No sends "Q 1" (the
//     board flips every pan pulse). It turns back. (c) the speed (two Stop presses, at least 1 s each).
//  3. Lights: cover each light (lightsetup.js). The 3D, seen from the front like the real panel now,
//     marks the one to cover: no left and right in words.
//  4. The light check (synccheck.js): with the torch held to one side, each motor moves a little and
//     the readings must get more even. A pair that gets less even is swapped in the light map ("L").
// Every answer goes to the session log (live.note). Cancel at any step: "J 0 0 <flat>" (stops a turn,
// panel flat) and the old flat angle and small-motor direction again.
// While it runs, live.sync.pose is what the 3D draws, and the pretend sun sends nothing.
import { $ } from "../util.js";
import { CFG, tiltLimits } from "../logic.js";
import { storeMap } from "../lightsetup.js";
import { createLightCheck } from "./synccheck.js";
import { createStartFinder } from "./syncstart.js";

const KEEP_MS = 150, JOG_ON_MS = 200, TURN_DEG = 45, SWEEP_FROM = 10, SWEEP_TO = 170, SWEEP_STEP = 10, FINE_STEP = 2, MIN_HALF_MS = 1000;
const MEASURE_LABEL = ["Measure speed", "Stop: it points backwards", "Stop: it faces you again"];

export function createSync({ live, scene, onDone }) {
  const dlg = $("syncDlg"), body = $("syncBody");
  const { serial, driver, lightSetup } = live;
  let step = null, orig = null, keep = null, timer = 0, holding = 0, flat = 90, lightsSaved = false, anim = null, checked = null;
  const sync = { pose: null, active: false };
  const send = line => { if (serial.connected) serial.send(line); };
  const pulse = way => CFG.PAN_STOP_US + way * driver.jogUs;   // the board flips it when it holds "Q 1"
  const turnMs = deg => driver.measured ? Math.max(100, Math.round(deg / driver.speed.pos * 1000 / 20) * 20) : 500;
  const pose = (pan, tilt) => { sync.pose = { pan, tilt, flat, panDir: 0, tiltDir: 0 }; };
  const animate = (to, ms) => { anim = { from: sync.pose.pan, to, t: 0, dur: ms / 1000 }; };

  function tick() {   // keep-alive: the held turn, or the small motor's angle
    if (holding) send(`J ${pulse(holding)} ${JOG_ON_MS} ${flat.toFixed(1)}`);
    else if (keep) send(keep);
  }
  function show(html, next) {
    body.innerHTML = html;
    $("syncNext").hidden = !next; if (next) $("syncNext").textContent = next;
    if (!dlg.open) dlg.show();
  }

  const moveTo = a => { flat = a; send(`U ${a}`); keep = `M 0 ${a.toFixed(1)}`; send(keep); pose(0, a); };   // the 3D stays flat: the reference
  const check = createLightCheck({ serial, send, pulse, getFlat: () => flat, tiltRange: f => tiltLimits(f), setKeep: line => { keep = line; send(line); } });
  const WORDS = { ok: "goes toward the light", swap: "went away from the light: fixed (its two pairs of lights swapped)", unclear: "no clear change: hold the torch further to one side and check again", weak: "not enough difference: hold the torch nearer one corner and check again" };
  let starts = [];   // where it started turning: one way, the other way
  const finder = createStartFinder({ send, getFlat: () => flat, onLevel: us => { const el = $("syncPower"); if (el) el.textContent = `${us} of ${finder.MAX_US}`; } });
  const STEPS = {
    start() {
      keep = null; pose(0, flat);
      const way = starts.length ? -1 : 1, n = starts.length + 1;
      show(`<p class="ls-step">Step 2 of 4 · Big motor</p>
        <p class="ls-big">${n === 1 ? "How much power does the big motor need to start?" : "Now the other way."}</p>
        <p class="note">Press Start and watch the real big motor. The power goes up slowly. Press <b>It turns now</b> the moment it moves (${n} of 2).</p>
        <p class="note">Power: <b id="syncPower">${finder.running ? "" : "not started"}</b></p>
        <div class="ls-actions"><button class="btn dark" data-a="ramp" data-way="${way}">Start</button><span class="grow"></span><button class="btn ghost" data-a="skipStart">Skip</button></div>`);
    },
    startDone() {
      const k = Math.max(...starts);
      show(`<p class="ls-step">Step 2 of 4 · Big motor</p>
        <p class="ls-big">${k ? `It starts turning at ${k}. Saved on the board.` : "It never turned, even at full power."}</p>
        <p class="note">${k ? `One way ${starts[0]}, the other way ${starts[1]}. The board never drives it weaker than ${k + 30}, and the 3D only shows it turning when it really does.` : "Check the big motor's power and its 3 wires (signal on pin 9). You can go on without it: the small motor still tracks."}</p>`, k ? "Next" : "Go on anyway");
    },
    check() {
      keep = `M 0 ${flat.toFixed(1)}`; send(keep); pose(0, flat); scene.lookAt("front", 1.2);
      const r = checked;
      show(`<p class="ls-step">Step 4 of 4 · Light check</p>
        <p class="ls-big">${r ? (r.map ? "Fixed. Turn the torch off, then press Save." : "Checked.") : "Hold the torch still, near one corner of the panel and a little above it. Then press Check."}</p>
        ${r ? `<p class="note">Small motor: ${WORDS[r.tilt.result]}.</p><p class="note">Big motor: ${WORDS[r.pan.result]}.</p>`
            : `<p class="note">Each motor moves a little. The readings must get more even: if one goes the wrong way, the page swaps those lights for you.</p>`}
        <div class="ls-actions">${r && r.map ? `<button class="btn dark" data-a="saveMap">Save</button>` : `<button class="btn dark" data-a="runCheck">${r ? "Check again" : "Check"}</button>`}<span class="grow"></span><button class="btn ghost" data-a="skipCheck">${r && !r.map ? "Done" : "Skip"}</button></div>`);
    },
    sweep() {
      show(`<p class="ls-step">Step 1 of 4 · Small motor</p><p class="ls-big">Is the real panel flat now, facing straight up like on the screen?</p>
        <p class="note">The small motor is at <b id="syncAt">${flat}°</b>. No moves it 10 degrees further, from ${SWEEP_FROM}° to ${SWEEP_TO}°.</p>
        <div class="ls-actions"><button class="btn dark" data-a="flatYes">Yes, flat</button><button class="btn" data-a="flatNo">No, next</button><button class="btn ghost" data-a="flatBack">Back</button></div>`);
    },
    fine() {
      show(`<p class="ls-step">Step 1 of 4 · Small motor</p><p class="ls-big">Fine tune: press + or − until it is exactly flat.</p>
        <p class="note">Each press moves it 2 degrees. The real panel follows right away.</p>
        <div class="ls-actions"><button class="btn" data-a="minus">−</button><output id="syncFlat">${flat}°</output><button class="btn" data-a="plus">+</button></div>`, "Next");
    },
    lean() {
      const front = tiltLimits(flat)[1];   // its front end: 45 degrees past flat (the board's tiltMax())
      keep = `M 0 ${front.toFixed(1)}`; send(keep); pose(0, front);
      show(`<p class="ls-step">Step 1 of 4 · Small motor</p><p class="ls-big">Does the real panel lean toward the front, like on the screen?</p>
        <p class="note">The small motor goes 45 degrees past flat.</p>
        <div class="ls-actions"><button class="btn dark" data-a="yes">Yes</button><button class="btn" data-a="no">No</button></div>`);
    },
    face() {
      keep = `M 0 ${flat.toFixed(1)}`; pose(0, flat); scene.lookAt("front", 1.2);
      driver.tilt = driver.target.tilt = flat;   // the driver's own lines (measuring) keep the panel flat too
      show(`<p class="ls-step">Step 2 of 4 · Big motor</p><p class="ls-big">Hold Left or Right until the real panel faces you, like on the screen.</p>
        <div class="ls-actions"><button class="btn" data-hold="-1">Left</button><button class="btn" data-hold="1">Right</button><span class="grow"></span><button class="btn dark" data-a="match">It matches</button></div>`);
    },
    dir() {
      const ms = turnMs(TURN_DEG);
      send("Q 0");   // check with the plain sign
      send(`J ${pulse(1)} ${ms} ${flat.toFixed(1)}`); animate(TURN_DEG, Math.max(ms, 400));
      show(`<p class="ls-step">Step 2 of 4 · Big motor</p><p class="ls-big">Did the real one turn the same way?</p>
        <p class="note">Both turned a little to the right.</p>
        <div class="ls-actions"><button class="btn dark" data-a="same">Yes</button><button class="btn" data-a="other">No</button></div>`);
    },
    speed() {
      show(`<p class="ls-step">Step 2 of 4 · Big motor</p><p class="ls-big">Last: how fast it turns.</p>
        <p class="note">Press Measure speed. Press Stop when the front mark points backwards, then Stop again when it faces you.</p>
        <div class="ls-actions"><button class="btn dark" data-a="measure" id="syncMeasure">${MEASURE_LABEL[driver.measureStep]}</button><span class="ends" id="syncMeasured"></span></div>`, "Done");
    },
  };
  function go(s) { step = sync.step = s; anim = null; STEPS[s](); live.note("sync step", { step: s, flat }); }

  body.addEventListener("click", e => {
    const a = e.target.closest("[data-a]"); if (!a) return;
    const act = a.dataset.a;
    if (act === "flatYes") { live.note("flat check", { at: flat, answer: "yes" }); go("fine"); }
    if (act === "flatNo" || act === "flatBack") {
      live.note("flat check", { at: flat, answer: act === "flatNo" ? "no" : "back" });
      let a = flat + (act === "flatNo" ? SWEEP_STEP : -SWEEP_STEP);
      if (a > SWEEP_TO) a = SWEEP_FROM; if (a < SWEEP_FROM) a = SWEEP_TO;   // past the end: round again
      moveTo(a); sync.at = a; $("syncAt").textContent = `${a}°`;
    }
    if (act === "plus" || act === "minus") {
      moveTo(Math.max(CFG.TILT_UP_MIN, Math.min(CFG.TILT_UP_MAX, flat + (act === "plus" ? FINE_STEP : -FINE_STEP))));   // 10..170, as the board's "U"
      sync.at = flat; live.note("fine tune", { at: flat }); $("syncFlat").textContent = `${flat}°`;
    }
    if (act === "yes" || act === "no") {
      live.note("lean check", { flat, answer: act });
      if (act === "no") { send("R 1"); flat = 180 - flat; send(`U ${flat}`); }   // reversed: the same real flat spot counts as 180 - flat
      keep = `M 0 ${flat.toFixed(1)}`; send(keep); pose(0, flat);
      starts = []; go("start");
    }
    if (act === "match") { holding = 0; send(`J 0 0 ${flat.toFixed(1)}`); driver.setForward(); go("dir"); }
    if (act === "same" || act === "other") {
      send(act === "same" ? "Q 0" : "Q 1");   // No: the board flips its pan pulses from now on
      // The real one sits at +45 (same) or -45 (other): turn it back to 0. After "Q 1" the board flips
      // the pulse, so +1 is the real way back.
      const back = act === "same" ? -1 : 1, ms = turnMs(TURN_DEG);
      send(`J ${pulse(back)} ${ms} ${flat.toFixed(1)}`); animate(0, Math.max(ms, 400));
      setTimeout(() => { if (step === "dir") { driver.setForward(); go("speed"); } }, ms + 300);
      body.querySelectorAll("button").forEach(b => { b.disabled = true; });
    }
    if (act === "ramp") {
      a.textContent = "It turns now"; a.dataset.a = "turns";
      const way = +a.dataset.way;
      finder.ramp(way).then(us => {
        live.note("start check", { way, us });
        if (!sync.active || step !== "start") return;
        if (us == null) { starts = [0, 0]; go("startDone"); return; }   // never turned
        starts.push(us);
        if (starts.length < 2) { setTimeout(() => { if (step === "start") go("start"); }, 600); return; }
        const k = Math.max(...starts);
        send(`K ${k}`); driver.setStart(k); keep = `M 0 ${flat.toFixed(1)}`;
        go("startDone");
      });
      return;
    }
    if (act === "turns") { finder.press(); return; }
    if (act === "skipStart") { finder.stop(); keep = `M 0 ${flat.toFixed(1)}`; go("face"); return; }
    if (act === "runCheck") {
      body.querySelectorAll("button").forEach(b => { b.disabled = true; });
      $("syncBody").querySelector(".ls-big").textContent = "Checking: keep the torch still…";
      check.run().then(r => {
        checked = r; live.note("light check", { tilt: r.tilt, pan: r.pan, map: r.map });
        if (step === "check") go("check");
      });
      return;
    }
    if (act === "saveMap" && checked && checked.map) {
      send(`L ${checked.map.join(" ")}`); storeMap(checked.map);   // the board swaps its pins and learns the room again
      live.note("light map fixed", { map: checked.map });
      finish("Synced. The light check swapped the lights that went the wrong way.");
      return;
    }
    if (act === "skipCheck") { finish(checked ? "Synced and checked." : "Synced (light check skipped)."); return; }
    if (act === "measure") {
      // a half turn takes the big motor well over a second: a quicker Stop is a click too early, and
      // would tell the board it turns much faster than it does (its angle count then runs ahead)
      if (driver.measureStep && performance.now() - (sync.measureAt || 0) < MIN_HALF_MS) {
        $("syncMeasured").textContent = "Too quick: wait until it really points that way, then press Stop.";
        return;
      }
      const k = driver.measureClick();
      a.textContent = MEASURE_LABEL[k];
      anim = null; sync.measureAt = performance.now();
      if (k === 0) { sync.measuredNow = true; pose(0, flat); live.sendSettings(); live.showMeasure(); $("syncMeasured").textContent = `${Math.round(driver.speed.pos)} / ${Math.round(driver.speed.neg)}° a second`; }
    }
  });
  // hold to turn
  const stopHold = () => { if (holding) { holding = 0; send(`J 0 0 ${flat.toFixed(1)}`); } };
  body.addEventListener("pointerdown", e => { const b = e.target.closest("[data-hold]"); if (!b) return; holding = +b.dataset.hold; b.setPointerCapture(e.pointerId); tick(); });
  body.addEventListener("pointerup", stopHold); body.addEventListener("pointercancel", stopHold);
  $("syncNext").onclick = () => {
    if (step === "fine") go("lean");
    else if (step === "startDone") { keep = `M 0 ${flat.toFixed(1)}`; go("face"); }
    else if (step === "speed") {
      if (driver.measureStep) return;
      // the board's turn count (its wire limit) uses this speed: no Done without a measure in this sync
      if (!sync.measuredNow) { $("syncMeasured").textContent = "Measure the speed first: the board needs it to keep the wires safe."; return; }
      scene.lookAt("front", 1.2); pose(0, flat); keep = `M 0 ${flat.toFixed(1)}`;
      runLights(saved => { if (saved) go("check"); else cancel(); });   // closing it without saving cancels
    }
  };
  $("syncCancel").onclick = () => cancel();

  // Step 3: the light positions dialog. after(saved) runs when it closes (saved or not).
  function runLights(after) {
    step = sync.step = "lights"; anim = null; lightsSaved = false;   // keep stays: the panel holds flat while the lights are covered
    live.lightsHook = text => { if (/saved/i.test(text)) lightsSaved = true; };
    $("lightSetup").addEventListener("close", () => {
      live.lightsHook = null;
      if (sync.active) after(lightsSaved);
    }, { once: true });
    if (dlg.open) dlg.close();   // the light panel takes its place; show() opens it again for step 4
    lightSetup.open();
  }
  function begin() {
    sync.measuredNow = false;
    if (!serial.fresh) { live.setStatus("Connect the Arduino first: syncing needs the live readings."); return; }
    if (!serial.data.cfg || !("kst" in serial.data.cfg)) { live.setStatus("The Arduino runs older code: upload the newest firmware/tracker/tracker.ino first (Disconnect here first)."); return; }
    sync.active = true; live.sync = sync; flat = live.flat(); pose(0, flat);
    clearInterval(timer); timer = setInterval(tick, KEEP_MS);
    const cfg = serial.data && serial.data.cfg || {};
    orig = { up: flat, rev: cfg.rev ? 1 : 0 };   // put back on Cancel
    checked = null;
    startSweep();   // all of it, every time
  }
  // the flat sweep starts at its first stop, with the servo counting its own way ("R 0")
  function startSweep() { send("R 0"); orig.changed = true; moveTo(SWEEP_FROM); sync.at = SWEEP_FROM; go("sweep"); }
  function stopAll() {
    finder.stop();
    clearInterval(timer); timer = 0; holding = 0; keep = null; anim = null;
    if (driver.measureStep) { driver.measureStep = 0; driver.measuring = null; }
    sync.active = false; sync.pose = null; live.sync = null; live.lightsHook = null; step = sync.step = null; sync.at = undefined;
    if (dlg.open) dlg.close();
    if ($("lightSetup").open) $("lightSetup").close();
  }
  // sync.onEnd(ok): set by hardware.calibrate() (the story) to hear how it ended
  const ended = ok => { const f = sync.onEnd; if (f) f(ok); };
  function finish(text) { live.note("sync done", { flat }); stopAll(); sync.finishedOnce = true; live.setStatus(text); onDone && onDone(text); ended(true); }
  function cancel() {
    if (orig && orig.changed) { send(`R ${orig.rev}`); send(`U ${orig.up}`); flat = orig.up; }   // stopped half way: the old settings again
    send(`J 0 0 ${flat.toFixed(1)}`); stopAll(); live.note("sync cancelled"); live.setStatus("Sync stopped. The old settings are back."); ended(false);
  }

  // every frame: the 3D turn of the direction check, and the 3D turning along while measuring
  sync.frame = dt => {
    if (!sync.pose) return;
    if (anim) { anim.t = Math.min(anim.dur, anim.t + dt); const u = anim.t / anim.dur; sync.pose.pan = anim.from + (anim.to - anim.from) * u * u * (3 - 2 * u); if (anim.t >= anim.dur) anim = null; }
    else if (step === "speed" && driver.measureStep) {
      const s = (performance.now() - (sync.measureAt || performance.now())) / 1000;
      sync.pose.pan = driver.measureStep === 1 ? Math.min(180, s * driver.speed.pos) : Math.max(0, 180 - s * driver.speed.neg);
      sync.pose.panDir = driver.measureStep === 1 ? 1 : -1;
    }
  };
  sync.start = begin; sync.cancel = cancel;
  return sync;
}
