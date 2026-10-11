// Soft story sounds, all made with WebAudio (no files). One shared player for the page.
// Browsers block audio until the user clicks or presses a key, so the AudioContext starts on the
// first gesture; calls before that are quietly ignored (levels are remembered and applied later).
// API: tick(), chime(), pop(), step(), whoosh(), rise(seconds), low(), count(u), beat(go), engine(level), steps(on), wind(level),
//      rain(level), pad(on), stopAll(), setEnabled(on), enabled, unlocked
// The on/off choice is kept in localStorage "tracker-sound" ("1" on, "0" off). Default on.

const KEY = "tracker-sound";
const MASTER = 0.25;

function readPref() { try { return localStorage.getItem(KEY) !== "0"; } catch (e) { return true; } }
function writePref(on) { try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {} }

function createSound() {
  let ac = null, master = null, noiseBuf = null, enabled = readPref(), unlocked = false;
  const want = { engine: 0, wind: 0, rain: 0, pad: false, steps: false };
  const loops = {};          // engine, wind, rain, pad: built once, then only their gains move
  let stepTimer = 0, lastTick = 0, lastStep = 0;

  function unlock() {
    if (unlocked) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ac = ac || new AC();
      if (ac.state === "suspended") ac.resume();
      if (!master) {
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -18; comp.ratio.value = 3;
        master = ac.createGain(); master.gain.value = enabled ? MASTER : 0;
        master.connect(comp); comp.connect(ac.destination);
        noiseBuf = makeNoise();
      }
      unlocked = true;
      applyLoops();
    } catch (e) { console.warn("[sound] could not start:", e.message); }
  }
  for (const ev of ["pointerdown", "keydown", "touchstart"]) window.addEventListener(ev, unlock, { capture: true, passive: true });

  const live = () => unlocked && enabled && ac && ac.state === "running";
  const now = () => ac.currentTime;

  function makeNoise() {
    const n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function noiseSrc() { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
  function env(g, t, a, peak, d) {   // quick attack, exponential fall
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  // ---- one-shots ----
  function tick() {
    if (!live() || performance.now() - lastTick < 28) return;
    lastTick = performance.now();
    const t = now(), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = "bandpass"; f.frequency.value = 3200 + Math.random() * 1600; f.Q.value = 4;
    env(g, t, 0.002, 0.35, 0.03);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random()); s.stop(t + 0.05);
  }
  function tone(freq, t, dur, peak, type = "sine", to = null) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    env(g, t, 0.01, peak, dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function chime() {
    if (!live()) return;
    const t = now();
    [[784, 0.22, 1.6], [1175, 0.12, 1.3], [1568, 0.05, 1.0]].forEach(([f, p, d]) => tone(f, t, d, p));
    [[988, 0.14, 1.4], [1976, 0.04, 0.9]].forEach(([f, p, d]) => tone(f, t + 0.11, d, p));
  }
  function pop() {
    if (!live()) return;
    const t = now();
    tone(620 + Math.random() * 80, t, 0.12, 0.35, "sine", 300);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = 2500;
    env(g, t, 0.001, 0.25, 0.02); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + 0.04);
  }
  function step() {
    if (!live() || performance.now() - lastStep < 90) return;
    lastStep = performance.now();
    const t = now(), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = "lowpass"; f.frequency.value = 500 + Math.random() * 300; f.Q.value = 1.2;
    env(g, t, 0.004, 0.28, 0.09);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + 0.12);
  }
  function whoosh() {
    if (!live()) return;
    const t = now(), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = "bandpass"; f.Q.value = 1.5;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(1800, t + 0.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + 0.75);
  }
  // a soft rising tone, for bars that grow
  function rise(seconds = 2, from = 220, to = 660) {
    if (!live()) return;
    const t = now(), o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = "triangle"; o2.type = "sine";
    o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + seconds);
    o2.frequency.setValueAtTime(from * 1.5, t); o2.frequency.exponentialRampToValueAtTime(to * 1.5, t + seconds);
    f.type = "lowpass"; f.frequency.value = 1800;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.3);
    g.gain.setValueAtTime(0.12, t + seconds - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.4);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(master);
    o.start(t); o2.start(t); o.stop(t + seconds + 0.5); o2.stop(t + seconds + 0.5);
  }

  // a low, soft tone (a headline appears)
  function low() {
    if (!live()) return;
    const t = now();
    tone(98, t, 1.6, 0.32); tone(147, t + 0.02, 1.3, 0.12); tone(196, t + 0.04, 0.9, 0.05, "triangle");
  }
  // a soft count tick (numbers counting up); u 0..1 lifts the pitch a little
  function count(u = 0) {
    if (!live()) return;
    tone(900 + 500 * Math.max(0, Math.min(1, u)), now(), 0.05, 0.07);
  }

  // the story's 3 2 1 countdown: a soft tick, a little higher and longer on "Go"
  function beat(go = false) {
    if (!live()) return;
    const t = now();
    if (go) { tone(1046, t, 0.32, 0.16); tone(1568, t + 0.01, 0.24, 0.05); }
    else tone(784, t, 0.09, 0.12);
  }

  // ---- loops: built on first use, the level only moves a gain ----
  function loop(name) {
    if (loops[name]) return loops[name];
    const out = ac.createGain(); out.gain.value = 0; out.connect(master);
    const L = { out };
    if (name === "engine") {
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
      o1.type = "sawtooth"; o2.type = "square"; o1.frequency.value = 42; o2.frequency.value = 21.2;
      const g2 = ac.createGain(); g2.gain.value = 0.35;
      f.type = "lowpass"; f.frequency.value = 260; f.Q.value = 2;
      lfo.frequency.value = 9; lg.gain.value = 3; lfo.connect(lg); lg.connect(o1.frequency);   // the putt-putt wobble
      o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(out);
      o1.start(); o2.start(); lfo.start();
      Object.assign(L, { o1, o2, f });
    } else if (name === "wind") {
      const s = noiseSrc(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
      f.type = "bandpass"; f.frequency.value = 600; f.Q.value = 0.9;
      lfo.frequency.value = 0.23; lg.gain.value = 350; lfo.connect(lg); lg.connect(f.frequency);
      s.connect(f); f.connect(out); s.start(); lfo.start();
      L.f = f;
    } else if (name === "rain") {
      const s = noiseSrc(), hp = ac.createBiquadFilter(), lp = ac.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 1200; lp.type = "lowpass"; lp.frequency.value = 7000;
      s.connect(hp); hp.connect(lp); lp.connect(out); s.start();
    } else if (name === "pad") {
      const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; f.Q.value = 0.5; f.connect(out);
      for (const hz of [110, 164.8, 220.5, 277.2, 329.6]) {
        for (const det of [-4, 4]) {
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = "triangle"; o.frequency.value = hz; o.detune.value = det; g.gain.value = 0.06;
          o.connect(g); g.connect(f); o.start();
        }
      }
    }
    loops[name] = L;
    return L;
  }
  function setLoop(name, level, tc = 0.35) {
    if (!unlocked || !ac) return;
    if (!loops[name] && level <= 0) return;
    const L = loop(name), t = now();
    const gainFor = { engine: 0.5, wind: 0.75, rain: 0.35, pad: 0.55 }[name];
    L.out.gain.setTargetAtTime(enabled ? level * gainFor : 0, t, tc);
    if (name === "engine") {
      L.o1.frequency.setTargetAtTime(38 + 40 * level, t, 0.3);
      L.o2.frequency.setTargetAtTime(19 + 20 * level, t, 0.3);
      L.f.frequency.setTargetAtTime(200 + 500 * level, t, 0.3);
    }
    if (name === "wind" && L.f) L.f.Q.setTargetAtTime(0.7 + level, t, 0.5);
  }
  function applyLoops() {
    setLoop("engine", want.engine); setLoop("wind", want.wind); setLoop("rain", want.rain);
    setLoop("pad", want.pad ? 1 : 0, want.pad ? 1.2 : 0.8);
  }
  function stepsLoop() {
    clearTimeout(stepTimer);
    if (!want.steps) return;
    step();
    stepTimer = setTimeout(stepsLoop, 260 + Math.random() * 70);
  }

  const clamp = x => Math.max(0, Math.min(1, +x || 0));
  return {
    tick, chime, pop, step, whoosh, rise, low, count, beat,
    engine(level) { const v = clamp(level); if (Math.abs(v - want.engine) < 0.01) return; want.engine = v; setLoop("engine", v, 0.25); },
    wind(level) { want.wind = clamp(level); setLoop("wind", want.wind, 0.6); },
    rain(level) { want.rain = clamp(level); setLoop("rain", want.rain, 0.5); },
    pad(on) { want.pad = !!on; setLoop("pad", on ? 1 : 0, on ? 1.2 : 0.8); },
    steps(on) { want.steps = !!on; stepsLoop(); },
    stopAll() { want.engine = want.wind = want.rain = 0; want.pad = false; want.steps = false; clearTimeout(stepTimer); applyLoops(); },
    setEnabled(on) {
      enabled = !!on; writePref(enabled);
      if (master) master.gain.setTargetAtTime(enabled ? MASTER : 0, now(), 0.05);
      applyLoops();
      return enabled;
    },
    toggle() { return this.setEnabled(!enabled); },
    get enabled() { return enabled; },
    get unlocked() { return unlocked; },
  };
}

export const sound = createSound();
