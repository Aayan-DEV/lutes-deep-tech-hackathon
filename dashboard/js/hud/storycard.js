// The story card. Used by the story module through hud.showCard(opts) and hud.hideCard().
// opts: { title, text, progress: {index, count} (or index / count), buttons: [{id, label, primary,
// disabled, big, kind, on, onClick}] }. Without buttons it shows Back, Next and Skip, calling the
// handlers given (onBack, onNext, onSkip) or else the story set with setStory().
//
// With opts.sentences = true it is the big narration: the chapter title small at the top of the
// middle, then the text one sentence at a time (opts.lines, or opts.text split into sentences),
// typed fast (60 letters a second) while the voice, if any, keeps talking. A typed sentence STAYS
// until the presenter presses on (right arrow, space, Enter, Next, or a tap on the text): see
// js/story/narrate.js. Extra options:
//   cps, hint (shown under the first sentence once typed), elapsed() (seconds, shown in the bar),
//   onTick(), onSentence(i), onDone() (last sentence typed), onEnd() (pressed on after the last
//   one), onStart() (pressed back at the first one), onControl({advance, retreat}), keepLast.
// Buttons with big: true show under the sentence (the choices of a story question). A button with
// kind: "sound" is a small speaker on/off toggle; kind: "toggle" is a small on/off button with its
// label ("Auto play"). Both: onClick returns the new state.
// opts.instant shows the first sentence whole at once (a card that only swaps its buttons).
// The big bar also has a small "Sources" button that opens every link behind the story
// (js/story/sources.js). The hint under the first sentence is a round arrow and "press to continue".
// Without sentences it is the small card at the bottom (the app's own notes use that).
import { setHTML } from "../util.js";
import { createNarrator } from "../story/narrate.js";
import { toggleSources, closeSources } from "../story/sources.js";
import { voice } from "../story/voice.js";

// Voice speed picker for the bar: 1 = as recorded. The choice is remembered (voice.js).
const RATES = [1, 1.1, 1.2, 1.3, 1.45, 1.6];
function rateHtml() {
  const cur = voice.rate;
  const near = RATES.reduce((a, b) => Math.abs(b - cur) < Math.abs(a - cur) ? b : a);
  return `<select class="sc-rate" title="Voice speed" aria-label="Voice speed">${RATES.map(r =>
    `<option value="${r}"${r === near ? " selected" : ""}>${r === 1 ? "Voice 1x" : r + "x"}</option>`).join("")}</select>`;
}

const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const CSS_ID = "story-css";
const SPEAKER = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z"/>';
const ICON_ON = `${SPEAKER}<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>`;
const ICON_OFF = `${SPEAKER}<path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>`;

// Load css/story.css once (the page's HTML stays untouched).
export function ensureStoryCss() {
  if (document.getElementById(CSS_ID)) return;
  const link = document.createElement("link");
  link.id = CSS_ID; link.rel = "stylesheet";
  link.href = new URL("../../css/story.css", import.meta.url).href;
  document.head.appendChild(link);
}

// Split a text into sentences. Keeps "4.99 kWh" whole (no space after the dot).
export function splitSentences(text) {
  return String(text || "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+(?=["A-Z0-9])/).filter(Boolean);
}

export function createStoryCard(root) {
  ensureStoryCss();
  let buttons = [], story = null, run = null, timer = 0, shownKey = "";
  root.addEventListener("click", e => {
    const b = e.target.closest("button[data-i]");
    if (!b || b.disabled) return;
    const btn = buttons[+b.dataset.i];
    try {
      const r = btn && btn.onClick && btn.onClick();
      if (btn && btn.kind === "sound") { btn.on = !!r; paintSound(b, btn.on); }
      if (btn && btn.kind === "toggle") { btn.on = !!r; paintToggle(b, btn); }
    } catch (err) { console.error("story button", err); }
  });
  root.addEventListener("click", e => { if (e.target.closest("button[data-src]")) toggleSources(); });
  // a tap or click on the sentence moves on, like the right arrow
  root.addEventListener("click", e => { if (run && e.target.closest(".sc-line")) run.advance(); });

  function paintSound(el, on) {
    el.innerHTML = on ? ICON_ON : ICON_OFF;
    el.setAttribute("aria-pressed", on ? "true" : "false");
    el.title = el.ariaLabel = on ? "Sound is on" : "Sound is off";
  }
  function paintToggle(el, b) {
    el.setAttribute("aria-pressed", b.on ? "true" : "false");
    el.title = `${b.label}: ${b.on ? "on" : "off"}`;
  }
  function stop() { if (run) run.stop(); run = null; }

  function defaults(opts, p) {
    return [
      { id: "back", label: "Back", onClick: opts.onBack || (() => story && story.back()), disabled: p.index === 0 },
      { id: "next", label: "Next", primary: true, onClick: opts.onNext || (() => story && story.next()) },
      { id: "skip", label: "Skip the story", onClick: opts.onSkip || (() => story && story.skip()) },
    ];
  }
  const dotsHtml = p => Number.isFinite(p.count) ? `<div class="dots" aria-label="Part ${p.index + 1} of ${p.count}">${Array.from({ length: p.count }, (_, i) => `<i class="${i === p.index ? "on" : i < p.index ? "past" : ""}"></i>`).join("")}</div>` : "";
  const btnHtml = (b, i, cls = "") => b.kind === "sound"
    ? `<button class="sc-sound" data-i="${i}" type="button"></button>`
    : b.kind === "toggle"
    ? `<button class="btn sc-toggle" data-i="${i}" type="button"><i aria-hidden="true"></i>${esc(b.label)}</button>`
    : `<button class="btn ${cls} ${b.primary ? "dark" : ""} ${b.id === "skip" ? "ghost" : ""}" data-i="${i}" type="button" ${b.disabled ? "disabled" : ""}>${esc(b.label)}</button>`;

  // ---- the small card (old look) ----
  function showSmall(opts, p) {
    stop(); root.classList.remove("sc-big"); shownKey = ""; root._html = null;
    setHTML(root, `${dotsHtml(p)}<h2>${esc(opts.title)}</h2><p>${esc(opts.text)}</p><div class="actions">${buttons.map((b, i) => btnHtml(b, i)).join("")}</div>`);
  }

  // ---- the big narration ----
  function showBig(opts, p) {
    const key = `${opts.title}|${p.index}|${opts.cardId || ""}`, sameChapter = key === shownKey && root.classList.contains("sc-big");
    shownKey = key;
    root.classList.add("sc-big");
    const small = [], big = [];
    buttons.forEach((b, i) => (b.big ? big : small).push([b, i]));
    const pick = id => small.filter(([b]) => b.id === id);
    const isSwitch = b => b.kind === "sound" || b.kind === "toggle";
    const rest = small.filter(([b]) => !["back", "next", "skip"].includes(b.id) && !isSwitch(b));
    const bar = [...pick("back"), ...pick("next"), ...rest].map(([b, i]) => btnHtml(b, i)).join("")
      + dotsHtml(p) + (opts.elapsed ? '<span class="sc-time" title="Time since the story started">0:00</span>' : "") + small.filter(([b]) => isSwitch(b)).map(([b, i]) => btnHtml(b, i)).join("")
      + '<button class="btn ghost sc-src" data-src type="button" title="Every link behind the story">Sources</button>'
      + rateHtml()
      + pick("skip").map(([b, i]) => btnHtml(b, i)).join("");
    if (!sameChapter || !root.querySelector(".sc-stage")) {
      root._html = null;
      root.innerHTML = `<div class="sc-stage"><div class="sc-title">${esc(opts.title)}</div><p class="sc-line" aria-hidden="true"></p>
        <div class="sc-hint" aria-hidden="true"></div><div class="sc-big-actions"></div></div><div class="sc-bar">${bar}</div>`;
      requestAnimationFrame(() => root.querySelector(".sc-title")?.classList.add("in"));
    } else {
      root.querySelector(".sc-bar").innerHTML = bar;
    }
    const rateEl = root.querySelector(".sc-rate");
    if (rateEl) rateEl.onchange = () => voice.setRate(parseFloat(rateEl.value));
    root.querySelectorAll(".sc-sound").forEach(el => paintSound(el, !!buttons[+el.dataset.i].on));
    root.querySelectorAll(".sc-toggle").forEach(el => paintToggle(el, buttons[+el.dataset.i]));
    const bigBox = root.querySelector(".sc-big-actions");
    bigBox.innerHTML = big.map(([b, i]) => btnHtml(b, i, "sc-choice")).join("");
    bigBox.classList.remove("in");
    root.setAttribute("aria-label", `${opts.title}. ${opts.text || ""}`);
    narrate(opts, Array.isArray(opts.lines) ? opts.lines.filter(Boolean) : splitSentences(opts.text), sameChapter, bigBox);
    startTimer(opts);
  }

  function narrate(opts, sentences, sameChapter, bigBox) {
    stop();
    run = createNarrator({
      line: root.querySelector(".sc-line"), hint: root.querySelector(".sc-hint"), choices: bigBox, sentences,
      opts: Object.assign({}, opts, { delay: sameChapter ? 0.25 : 0.3, hint: opts.hint ? "press to continue" : "" }),
    });
    try { opts.onControl && opts.onControl(run); } catch (e) { console.error("story card onControl", e); }
  }

  // the small elapsed time in the bar ("1:12"), so a presenter can see the pace
  function startTimer(opts) {
    clearInterval(timer); timer = 0;
    const el = root.querySelector(".sc-time");
    if (!el || typeof opts.elapsed !== "function") return;
    let last = "";
    const paint = () => {
      const s = Math.max(0, Math.floor(opts.elapsed() || 0)), txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      if (txt !== last) { last = txt; el.textContent = txt; }
    };
    paint(); timer = setInterval(paint, 250);
  }

  return {
    setStory(s) { story = s; },
    show(opts = {}, text) {
      if (typeof opts === "string") opts = { title: opts, text };
      const p = opts.progress || { index: opts.index ?? opts.step, count: opts.count ?? opts.total };
      buttons = opts.buttons && opts.buttons.length ? opts.buttons : defaults(opts, p);
      if (opts.sentences) showBig(opts, p); else showSmall(opts, p);
      root.hidden = false;
    },
    // the presenter's controls: advance() = right arrow, retreat() = left arrow
    advance() { if (run) run.advance(); },
    retreat() { if (run) run.retreat(); },
    hurry() { if (run && run.phase === "type") run.advance(); },
    hide() { stop(); closeSources(); clearInterval(timer); timer = 0; shownKey = ""; root.hidden = true; root.classList.remove("sc-big"); },
  };
}
