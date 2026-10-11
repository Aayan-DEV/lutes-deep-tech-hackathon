// The start screen of the story: a big round Play button in the middle of the screen with
// "Press play to start" under it, then the countdown ("3", "2", "1", "Go") in big type at the same
// spot. story.js decides when; this file only draws it (css/story.css, "the Play screen").
// createPlayScreen() -> { show(onPlay), count(text), hide(), remove() }
//   show(onPlay)  the Play button; a click on it calls onPlay() once
//   count(text)   swaps the button for one big word of the countdown (each one pops in)
//   hide()        fades it all out; remove() takes it off the page
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const PLAY = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M7.4 5.8v12.4a.8.8 0 0 0 1.2.7l9.9-6.2a.8.8 0 0 0 0-1.4L8.6 5.1a.8.8 0 0 0-1.2.7z" fill="currentColor"/></svg>';
export const PLAY_LABEL = "Press play to start";

export function createPlayScreen() {
  let el = null, onPlay = null;

  function mount() {
    if (el && el.isConnected) return el;
    el = document.createElement("div");
    el.className = "story-play";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", PLAY_LABEL);
    el.addEventListener("click", e => {
      if (!e.target.closest(".pl-btn") || !onPlay) return;
      const f = onPlay; onPlay = null;
      try { f(); } catch (err) { console.error("story play", err); }
    });
    document.body.appendChild(el);
    return el;
  }

  return {
    show(fn) {
      mount();
      onPlay = fn;
      el.innerHTML = `<button class="pl-btn" type="button" aria-label="Play the story">${PLAY}</button><div class="pl-label">${esc(PLAY_LABEL)}</div>`;
      el.classList.remove("counting");
      requestAnimationFrame(() => el && el.classList.add("in"));
    },
    count(text) {
      mount();
      onPlay = null;
      el.classList.add("in", "counting");
      el.innerHTML = `<div class="pl-count" aria-live="assertive">${esc(text)}</div>`;
    },
    hide() {
      onPlay = null;
      if (el) { el.classList.remove("in", "counting"); el.innerHTML = ""; }
    },
    remove() { onPlay = null; if (el) el.remove(); el = null; },
    get shown() { return !!(el && el.classList.contains("in")); },
  };
}
