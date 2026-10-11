// Auto play: the story moves on by itself, no clicks. Off by default; the "Auto play" toggle in the
// story bar turns it on and remembers it (localStorage "tracker-story-auto"); ?auto=1 in the
// address turns it on for this visit (?auto=0 off). An arrow key pauses it until the next chapter.
// It never starts the story: the Play screen waits for Play first, auto play takes over after it.
// createAuto() -> { on, active, toggle(), pause(), resume(), holdFor(text, voice), later(s, fn), clear() }
//   holdFor: how long a typed sentence stays once onTyped fires (narrate.js fires it when the
//            voice ends): HOLD (0.25 s), or without a voice max(2.5 s, 0.055 s per letter)
const KEY = "tracker-story-auto";
export const HOLD = 0.25;   // s after a voice ends before the next sentence (snappy cuts)

function initial() {
  const q = new URLSearchParams(location.search).get("auto");
  if (q === "1" || q === "0") return q === "1";
  try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
}

export function createAuto() {
  let on = initial(), paused = false, timer = 0, gen = 0;
  const clear = () => { clearTimeout(timer); timer = 0; gen++; };
  return {
    get on() { return on; },
    get active() { return on && !paused; },
    toggle() {
      on = !on; paused = false; clear();
      try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* private window: this visit only */ }
      return on;
    },
    pause() { if (on) { paused = true; clear(); } },
    resume() { paused = false; },
    holdFor(text, v = {}) { return v.voiced ? (v.left || 0) + HOLD : Math.max(2.5, 0.055 * String(text || "").length); },
    // run fn after `seconds` unless cleared, paused or replaced by another later() first
    later(seconds, fn) {
      clear();
      const g = gen;
      timer = setTimeout(() => { if (g === gen && on && !paused) fn(); }, Math.max(0, seconds) * 1000);
    },
    clear,
  };
}
