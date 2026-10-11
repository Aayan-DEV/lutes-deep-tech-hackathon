// The story player: runs the chapters from script.js, paced by the presenter or by auto play.
// createStory({ scene, clock, hud, sim, regionId?, events?, hardware?, onExit? })
//   -> { start(at), next(), back(), skip(), stop(), chapterIndex, sentenceIndex, running, elapsed,
//        auto, hardwareOn, frame(dt) }
// Each chapter's sentences are typed one at a time (hud.showCard with sentences: true, see
// js/story/narrate.js). A typed sentence stays until the presenter presses on: right arrow, space,
// Enter, the Next button, or a tap on the text. Pressing while it types shows it whole at once.
// After the last sentence of a chapter, pressing on starts the next chapter; if the chapter's scene
// action is still running it is cancelled cleanly. Left arrow or Back goes one sentence back, or to
// the previous chapter from the first sentence. Chapter actions wait for sentences with ctx.atSentence(k).
// Auto play (auto.js): each sentence moves on by itself (0.25 s after its voice). After the last
// sentence of a chapter has had its time, the chapter's action gets at most GRACE_S more (run()
// ended or ctx.done() moves on at once), then it is cancelled the way a press on Next cancels it.
// While auto play waits on an action, or the action is behind the narrator (the shown sentence is
// past the last ctx.atSentence(k) it reached), the scene runs RUSH times faster, so a step's
// visual is never left unseen and the next step starts with its sentence. Not while the real
// tracker follows: its motors cannot hurry.
// The real tracker (hwlink.js): start(0) first asks about it; once connected the chapters that
// move the tracker drive the real motors, and after "What comes next" (homeAfter) it goes home.
// The Play screen (playscreen.js): the story never starts by itself. After the real tracker card
// comes the first chapter's first frame with a big Play button; Play (or space, Enter, the right
// arrow) starts "3", "2", "1" (1 s each) and "Go" (0.4 s), then the first chapter, and the bar's
// clock starts from 0:00 at that moment. Auto play (and ?auto=1) takes over only from there.
// start(0) (a restart) comes back to the Play screen.
// ctx extras from here: ctx.ask(spec) (a card with choices, see prompt()), ctx.done(), ctx.link,
// ctx.auto(), ctx.exit(mode).
import { CHAPTERS } from "./script.js";
import { createTimeline, isCancel, Cancelled } from "./timeline.js";
import { createStage } from "./stage.js";
import { sound } from "./sound.js";
import { voice } from "./voice.js";
import { createAuto } from "./auto.js";
import { createHwLink } from "./hwlink.js";
import { GATE } from "./texts.js";
import { createPlayScreen } from "./playscreen.js";
import { ensureStoryCss, splitSentences } from "../hud/storycard.js";

const HINT = "Press the right arrow to continue";
const GRACE_S = 1.0;   // auto play: the most a chapter's action may run on after its last sentence
const RUSH = 4;        // scene speed while an action catches up with the narrator (auto play only)
const HOME_CAP_S = 30;
const COUNTDOWN = [["3", 1], ["2", 1], ["1", 1], ["Go", 0.4]];   // [word, seconds] before the first chapter

export function createStory({ scene, clock, hud, sim, regionId, events, hardware, onExit } = {}) {
  ensureStoryCss();
  const timeline = createTimeline(), auto = createAuto(), link = createHwLink(hardware);
  const stage = createStage({ scene, clock, hud, sim, timeline, regionId, events, link });
  const asks = new Set(), playScreen = createPlayScreen();
  let index = -1, token = null, running = false, saved = null, ctl = null, sentence = -1, t0 = null, kickAuto = null, starter = null;
  // the bar's clock: 0:00 on the connect card, the Play screen and the countdown; it starts when the
  // first chapter starts after the countdown and runs to the end, through the real-world tests;
  // start(0) and stop() reset it
  const elapsed = () => (running && t0 != null ? (performance.now() - t0) / 1000 : 0);
  const progressOf = i => (i >= 0 ? { index: i, count: CHAPTERS.length } : {});
  const toLines = t => (Array.isArray(t) ? t.map(s => String(s || "").trim()).filter(Boolean) : splitSentences(t));

  // ---- the small bar under the sentence ----
  function bar(i, { next: withNext = true, back: withBack = true, final = false } = {}) {
    const b = [];
    if (withBack) b.push({ id: "back", label: "Back", onClick: back, disabled: i <= 0 });
    if (withNext) b.push({ id: "next", label: "Next", primary: true, onClick: next });
    b.push({ id: "sound", kind: "sound", label: "Sound", on: sound.enabled, onClick: () => { const on = sound.toggle(); if (!on) voice.stop(); return on; } });
    b.push({ id: "auto", kind: "toggle", label: "Auto play", on: auto.on, onClick: toggleAuto });
    if (!final) b.push({ id: "skip", label: "Skip the story", onClick: skip });
    return b;
  }
  function toggleAuto() {
    const on = auto.toggle();
    if (on && ctl && ctl.phase === "hold" && kickAuto) kickAuto();
    return on;
  }

  // Every card goes through here. onTyped(k, v) is the card's own auto play step.
  function show(opts, onTyped) {
    for (const p of [...asks]) p.finish("replaced");   // one card at a time
    auto.clear(); kickAuto = null;
    hud?.showCard?.(Object.assign({
      sentences: true, elapsed, keepLast: true,
      onTick: () => sound.tick(), onSentence: k => { sentence = k; if (t0 == null && index === 0 && k === 0) t0 = performance.now(); }, onControl: c => { ctl = c; },
      onTyped: (k, v) => { kickAuto = () => onTyped && onTyped(k, { voiced: false, left: 0 }); if (onTyped) onTyped(k, v); },
    }, opts));
  }

  function card(i, lines) {
    const ch = CHAPTERS[i];
    show({ title: ch.title, text: lines.join(" "), lines, progress: progressOf(i), buttons: bar(i), keepLast: false,
      hint: i === 0 ? HINT : "", onEnd: () => toNext(i), onStart: () => toPrev(i) },
    (k, v) => {
      if (!auto.active || i !== index) return;
      auto.later(auto.holdFor(lines[k], v), () => {
        if (i !== index || !running) return;
        if (k < lines.length - 1) { ctl?.advance(); return; }
        const tk = token;   // the last sentence had its time: the action gets GRACE_S more, rushed
        if (!tk) return;
        tk.rush = true;
        Promise.race([tk.done, sleep(GRACE_S)]).then(() => {
          if (token === tk && running && auto.active) toNext(i);
        });
      });
    });
  }

  // A card that waits for an answer. spec: { title, lines, progress?, chapter?, choices:
  // [{ id, label, primary, onClick }] (onClick runs inside the click), next (Next / right arrow
  // answers "next"; auto play answers it after the hold), hold (s after typing, then "next";
  // Infinity = until replaced), timeout (s, then "timeout"), instant, final, back (false: no Back),
  // onBack }. Resolves to the answer, or "replaced" when another card shows; rejects on cancel.
  function prompt(spec) {
    const lines = toLines(spec.lines);
    let p = null;
    const promise = new Promise((resolve, reject) => { p = { resolve, reject, done: false, timers: [] }; });
    const end = () => { p.done = true; p.timers.forEach(clearTimeout); asks.delete(p); };
    p.finish = v => { if (!p.done) { end(); p.resolve(v); } };
    p.fail = e => { if (!p.done) { end(); p.reject(e); } };
    const choices = (spec.choices || []).map(c => ({ id: c.id, label: c.label, primary: !!c.primary, big: true,
      onClick: () => { try { c.onClick?.(); } catch (e) { console.error("story choice", e); } p.finish(c.id); } }));
    const answers = !!spec.next || spec.hold != null;
    show({ title: spec.title, text: lines.join(" "), lines, progress: spec.progress || {}, instant: !!spec.instant,
      buttons: [...bar(spec.chapter ?? -1, { next: !!spec.next, back: spec.back !== false, final: !!spec.final }), ...choices],
      onEnd: () => { if (answers) p.finish("next"); }, onStart: () => spec.onBack?.() },
    (k, v) => {
      if (k < lines.length - 1) { if (auto.active) auto.later(auto.holdFor(lines[k], v), () => ctl?.advance()); return; }
      if (spec.hold != null && Number.isFinite(spec.hold)) p.timers.push(setTimeout(() => p.finish("next"), (spec.hold + (v.voiced ? v.left : 0)) * 1000));
      else if (spec.next && auto.active) auto.later(auto.holdFor(lines[k], v), () => p.finish("next"));
    });
    asks.add(p);   // after show(): show() replaces the cards before this one
    if (spec.timeout) p.timers.push(setTimeout(() => p.finish("timeout"), spec.timeout * 1000));
    promise.catch(() => {});
    return promise;
  }

  function cancel() {
    if (token) token.cancelled = true;
    token = null;
    timeline.cancelAll();
    auto.clear();
    starter = null;
    playScreen.hide();
    for (const p of [...asks]) p.fail(new Cancelled());
  }
  const sleep = s => new Promise(r => setTimeout(r, s * 1000));

  async function play(i) {
    cancel();
    auto.resume();
    index = i; sentence = -1;
    const ch = CHAPTERS[i];
    let markDone = null;
    // at: the last sentence the action reached with ctx.atSentence; paced: the narrator card is the
    // chapter's own (not ctx.ask cards); rush: the last sentence is over (see frame())
    const tk = { cancelled: false, done: null, at: 0, paced: !ch.custom, rush: false };
    tk.done = new Promise(r => { markDone = r; });
    token = tk;
    if (link.on && !ch.still) link.follow(true);
    stage.reset(ch);
    const ctx = stage.makeCtx(tk, text => card(i, toLines(text)), () => sentence);
    Object.assign(ctx, {
      done: () => markDone(), link, auto: () => auto.on, exit: m => exit(m || "simulation"),
      ask: spec => prompt(Object.assign({ title: ch.title, progress: progressOf(i), chapter: i, onBack: () => toPrev(i) }, spec)),
    });
    let text = ch.text;
    if (typeof text === "function") { try { text = text(ctx); } catch (e) { console.error("story text", ch.id, e); text = ""; } }
    if (!ch.custom) card(i, toLines(text));
    sound.chime();
    if (ch.camera) ctx.look(ch.camera, ch.cameraTime ?? 2.5);
    try {
      await (ch.run || (async () => {}))(ctx);
    } catch (e) {
      if (!isCancel(e)) console.error("story chapter", ch.id, e);
    } finally { markDone(); }
  }

  // Before the first chapter: the real tracker question (hwlink.js).
  async function gate() {
    cancel();
    const tk = { cancelled: false };
    token = tk; index = -1; sentence = -1;
    stage.reset(CHAPTERS[0]);
    const base = { title: GATE.title, back: false };
    const ui = {
      auto: auto.on,
      ask: spec => prompt(Object.assign({}, base, spec)),
      status: (text, s) => (s > 0 ? prompt(Object.assign({}, base, { lines: [text], hold: s })) : (prompt(Object.assign({}, base, { lines: [text], hold: Infinity })), Promise.resolve())),
    };
    try { await link.gate(ui); } catch (e) { if (isCancel(e)) return; console.warn("[story] gate", e); }
    if (!tk.cancelled && running) ready();
  }

  // The Play screen: the first chapter's first frame, a big Play button, then the countdown.
  async function ready() {
    cancel();
    const tk = { cancelled: false, at: 0 };
    token = tk; index = -1; sentence = -1; t0 = null;
    const ch = CHAPTERS[0];
    stage.reset(ch);
    const ctx = stage.makeCtx(tk, () => {}, () => -1);
    try { ch.preview?.(ctx); } catch (e) { console.warn("[story] preview", e); }
    if (ch.camera) ctx.look(ch.camera, 0);
    // the bar (sound, auto play, voice speed, skip) with the clock at 0:00, and no sentence
    prompt({ title: "", lines: [], back: false });
    const go = new Promise(r => { starter = r; });
    playScreen.show(() => next());
    await go;
    if (tk.cancelled || !running) return;
    try {
      for (const [word, s] of COUNTDOWN) {
        playScreen.count(word);
        sound.beat(word === "Go");
        await timeline.wait(s);
      }
    } catch (e) { if (!isCancel(e)) console.error("[story] countdown", e); return; }
    if (tk.cancelled || !running) return;
    t0 = performance.now();
    play(0);
  }

  // After "What comes next" with the real tracker: home, then the board steers by itself.
  async function goHome(i) {
    cancel();
    const tk = { cancelled: false };
    token = tk;
    const ch = CHAPTERS[i], base = { title: ch.title, progress: progressOf(i), chapter: i, back: false };
    try {
      prompt(Object.assign({}, base, { lines: [GATE.homing], hold: Infinity }));
      const b = link.hw();
      await Promise.race([Promise.resolve(b && b.home()), sleep(HOME_CAP_S)]);
      if (tk.cancelled) return;
      try { b && b.release(); } catch (e) { /* gone */ }
      await prompt(Object.assign({}, base, { lines: [GATE.homed], hold: 2 }));
    } catch (e) { if (!isCancel(e)) console.error("[story] home", e); return; }
    if (!tk.cancelled && running && index === i) play(i + 1);
  }

  // the narrator calls these after the last sentence (on) or at the first one (back)
  function toNext(i) {
    if (!running || i !== index || i >= CHAPTERS.length - 1) return;
    if (CHAPTERS[i].homeAfter && link.on) goHome(i); else play(i + 1);
  }
  function toPrev(i) { if (!running || i !== index || i === 0) return; play(i - 1); }

  function onKey(e) {
    const tag = e.target?.tagName || "";
    if (!running || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") auto.pause();   // until the next chapter
    if (e.key === "ArrowRight" || ((e.key === " " || e.key === "Enter") && !/^(BUTTON|A)$/.test(tag))) { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
  }

  function start(at = 0) {
    if (!running) {
      running = true;
      saved = clock ? { playing: clock.playing, speed: clock.speed } : null;
      if (clock) clock.playing = false;
      stage.attach();
      document.addEventListener("keydown", onKey);
      voice.load();
    }
    at = Math.max(0, Math.min(CHAPTERS.length - 1, at));
    if (at === 0) t0 = null;                 // a restart: the Play screen, the clock waits for Play
    else if (t0 == null) t0 = performance.now();   // started mid-story (dev): count from here
    if (at === 0) gate(); else play(at);
  }
  function next() {
    if (!running) return;
    if (starter) { const f = starter; starter = null; f(); return; }   // the Play screen: Play
    if (ctl) ctl.advance(); else toNext(index);
  }
  function back() { if (!running) return; if (ctl) ctl.retreat(); else toPrev(index); }
  function stop() {
    if (!running) return;
    cancel();
    link.end();
    voice.stop();
    stage.reset(null);
    stage.detach();
    document.removeEventListener("keydown", onKey);
    hud?.hideCard?.();
    playScreen.remove();
    if (clock && saved) { clock.playing = saved.playing; clock.speed = saved.speed; }
    running = false; index = -1; ctl = null; t0 = null;
  }
  function exit(mode) {
    stop();
    onExit?.(mode);
    window.dispatchEvent(new CustomEvent("story:exit", { detail: { mode } }));
  }
  function skip() { exit("simulation"); }

  // auto play: is the chapter's action behind the narrator, or past its last sentence?
  function rushing() {
    const tk = token;
    return !!(tk && tk.paced && auto.active && !link.following && (tk.rush || sentence > tk.at));
  }
  function frame(dt) {
    if (!running) return;
    dt = Math.min(dt, 0.1);
    timeline.frame(rushing() ? dt * RUSH : dt);
    stage.frame(dt);
  }

  return {
    start, next, back, skip, stop, frame,
    get chapterIndex() { return index; },
    get sentenceIndex() { return sentence; },
    get running() { return running; },
    get elapsed() { return elapsed(); },
    get auto() { return auto.on; },
    get hardwareOn() { return link.on; },
    get chapters() { return CHAPTERS.map(c => ({ id: c.id, title: c.title })); },
  };
}
