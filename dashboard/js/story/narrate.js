// The story's narrator: types one sentence at a time into the big card and then WAITS for the
// presenter (or for auto play, which story.js runs through onTyped).
//   advance(): while typing, shows the whole sentence at once; when it is shown, fades it and types
//              the next one; after the last one, calls onEnd() (the story goes to the next chapter).
//   retreat(): shows the previous sentence (whole); at the first one, calls onStart().
// createNarrator({ line, hint, choices, sentences, opts }) -> { advance, retreat, stop, index, phase }
// opts: cps (letters per second, default 60: a 100 letter sentence is typed in under 2 s), delay
// (s before the first sentence), hint (text under the first sentence once it is typed), keepLast
// (show the choices when the last one is typed), instant (show the first sentence whole, no typing,
// no voice), voice (false: never speak), onTick, onSentence(i), onTyped(i, { voiced, left })
// (sentence i is all there AND its voice is over; voiced = it had a voice file, left = seconds of
// audio still to come, so 0 here), onDone() (the last sentence is fully typed), onEnd(), onStart().
// Voice (voice.js): when a sentence has a voice file, it plays as the sentence starts. The typing
// does not wait for it: it runs at the fixed speed, then the sentence stays while the voice
// finishes, and only then onTyped fires (auto play moves on 0.25 s later, see auto.js). The old
// sentence fades out in FADE s and the next one fades in as fast (css .sc-line). A press
// still moves on at once and stops the voice. The typing tick is off while a voice plays.
import { voice } from "./voice.js";

const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const FADE = 0.15, CPS = 60, NO_START = 4;   // NO_START: s with no audio length known = give up on it
const ARROW = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8h9M9 4.5 12.5 8 9 11.5"/></svg>';

export function createNarrator({ line, hint, choices, sentences, opts = {} }) {
  const n = sentences.length, cps = opts.cps || CPS;
  const me = { i: -1, phase: "wait", t: 0, delay: opts.delay ?? 0.6, shown: 0, last: 0, typed: null, ghost: null, raf: 0, dead: false, done: false, vh: null, wait: false };
  const call = (fn, ...a) => { try { fn && fn(...a); } catch (e) { console.error("story narrator", e); } };
  const speaking = () => !!(me.vh && !me.vh.failed);
  function hush() { if (me.vh) { voice.stop(me.vh); me.vh = null; } }

  function setHint(on) { if (hint) hint.classList.toggle("in", !!on); }
  function render(i, whole) {
    hush();
    me.i = i; me.t = 0;
    const s = sentences[i];
    line.innerHTML = `<span class="sc-ink sc-typed"></span><span class="sc-ghost">${esc(s)}</span>`;
    line.classList.remove("out"); line.classList.add("in");
    me.typed = line.querySelector(".sc-typed"); me.ghost = line.querySelector(".sc-ghost");
    me.shown = 0; me.phase = "type"; me.wait = false;
    setHint(false);
    call(opts.onSentence, i);
    if (!whole && opts.voice !== false) me.vh = voice.play(s);
    if (whole) typed();
  }
  // the sentence is all there: hold it until the presenter (or auto play) moves on. With a voice
  // still playing, onTyped waits for it (voiceOver), so auto play never cuts a sentence short.
  function typed() {
    const s = sentences[me.i];
    me.shown = s.length; me.typed.textContent = s; me.ghost.textContent = "";
    me.phase = "hold";
    if (me.i === 0 && opts.hint && hint) { hint.innerHTML = `<i class="sc-hint-ico" aria-hidden="true">${ARROW}</i><span>${esc(opts.hint)}</span>`; setHint(true); }
    if (me.i === n - 1 && !me.done) {
      me.done = true;
      if (opts.keepLast && choices && choices.children.length) choices.classList.add("in");
      call(opts.onDone);
    }
    if (voiceOver()) settled(); else { me.wait = true; kick(); }
  }
  function settled() { me.wait = false; call(opts.onTyped, me.i, { voiced: !!(me.vh && !me.vh.failed), left: 0 }); }
  // is this sentence's voice done: none, failed, ended, or stalled (no length after NO_START s,
  // or 1.5 s past its length)
  function voiceOver() {
    if (!speaking()) return true;
    const vh = me.vh, d = vh.duration;
    return vh.ended || (d ? me.t > d + 1.5 : me.t > NO_START);
  }
  function loop(now) {
    me.raf = 0;
    if (me.dead) return;
    const dt = Math.min(0.1, (now - me.last) / 1000); me.last = now;
    me.t += dt;
    if (me.phase === "wait" && me.t >= me.delay) {
      if (!n) { line.textContent = ""; me.phase = "hold"; call(opts.onDone); return; }
      render(0, !!opts.instant);
      if (opts.instant) return;
    } else if (me.phase === "type") {
      const s = sentences[me.i], k = Math.max(me.shown, Math.min(s.length, Math.floor(me.t * cps)));
      if (k !== me.shown) {
        if (!speaking() && Math.floor(k / 3) !== Math.floor(me.shown / 3) && /\S/.test(s.slice(me.shown, k))) call(opts.onTick);
        me.shown = k; me.typed.textContent = s.slice(0, k); me.ghost.textContent = s.slice(k);
      }
      if (k >= s.length) { typed(); return; }          // hold: the loop sleeps until a press (or the voice ends)
    } else if (me.phase === "hold") {
      if (!me.wait) return;
      if (voiceOver()) { settled(); return; }
    } else if (me.phase === "fade" && me.t >= FADE) {
      render(me.i + 1);
    }
    kick();
  }
  function kick() { if (!me.raf && !me.dead) { me.last = performance.now(); me.raf = requestAnimationFrame(loop); } }

  function advance() {
    if (me.dead) return;
    if (me.phase === "wait") { if (n) render(0, !!opts.instant); kick(); return; }
    if (me.phase === "type") { hush(); typed(); return; }
    if (me.phase === "fade") { render(me.i + 1); kick(); return; }
    hush();
    if (me.i < n - 1) {                                  // hold: fade out, then type the next one
      me.phase = "fade"; me.t = 0; setHint(false);
      line.classList.remove("in"); line.classList.add("out");
      kick();
    } else call(opts.onEnd);
  }
  function retreat() {
    if (me.dead) return;
    hush();
    if (me.i > 0) { render(me.i - 1, true); return; }
    call(opts.onStart);
  }
  function stop() { me.dead = true; hush(); cancelAnimationFrame(me.raf); me.raf = 0; }

  kick();
  return {
    advance, retreat, stop,
    get index() { return me.i; }, get phase() { return me.phase; },
    // seconds of voice still to come on the shown sentence (0 when silent)
    get voiceLeft() { return speaking() && me.vh.duration ? Math.max(0, me.vh.duration - me.vh.time) : 0; },
  };
}
