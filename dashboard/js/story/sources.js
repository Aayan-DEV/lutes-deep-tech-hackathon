// The Sources panel: every link behind the story, grouped by chapter, in a plain list. Opened by
// the small "Sources" button in the story bar (js/hud/storycard.js); closed by Escape, the Close
// button or a click outside the list. The country cards no longer carry sources: they live here.
// openSources(), closeSources(), toggleSources(), addSources(title, [{ name, url }])
// addSources lets other chapters (for example the team's) add their own group; same title = replace.
import { PLACE_FACTS, PLACE_ORDER } from "./places.js";
import { HOME, FUTURE } from "./facts_home.js";

const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const safeUrl = u => (/^https:\/\/[^\s"<>]+$/i.test(String(u || "")) ? String(u) : "");
const extra = new Map();

export function addSources(title, list) {
  if (title && Array.isArray(list) && list.length) extra.set(String(title), list);
}

function groups() {
  const out = PLACE_ORDER.map(id => PLACE_FACTS[id]).filter(Boolean).map(f => ({
    title: `${f.country}${f.place ? `: ${f.place}` : ""}${f.date ? `, ${f.date}` : ""}`, list: f.sources || [],
  }));
  out.push({ title: "Closer to home", list: HOME.sources || [] });
  for (const [title, list] of extra) out.push({ title, list });
  out.push({ title: "The numbers", list: [
    { name: "Our simulation: the Arduino's code replayed over real hourly weather, 2023 to 2025", url: "" },
    { name: "Open-Meteo historical weather API", url: "https://open-meteo.com/en/docs/historical-weather-api" },
  ] });
  out.push({ title: "What comes next", list: FUTURE.sources || [] });
  return out.filter(g => g.list.length);
}

let root = null, lastFocus = null;

function onKey(e) {
  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeSources(); }
}

export function openSources() {
  if (root) return;
  lastFocus = document.activeElement;
  root = document.createElement("div");
  root.className = "story-sources";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Sources");
  const items = groups().map(g => `<section><h3>${esc(g.title)}</h3><ul>${g.list.map(x => {
    const u = safeUrl(x.url);
    return `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(x.name)}</a>` : esc(x.name)}</li>`;
  }).join("")}</ul></section>`).join("");
  root.innerHTML = `<div class="ss-box"><div class="ss-head"><h2>Sources</h2><button type="button" class="btn ss-close">Close</button></div>
    <div class="ss-list">${items || "<p>No sources yet.</p>"}</div><p class="ss-foot">Press Escape to close.</p></div>`;
  root.addEventListener("click", e => { if (e.target === root || e.target.closest(".ss-close")) closeSources(); });
  document.body.appendChild(root);
  document.addEventListener("keydown", onKey, true);
  requestAnimationFrame(() => { if (root) { root.classList.add("in"); root.querySelector(".ss-close").focus(); } });
}

export function closeSources() {
  if (!root) return;
  document.removeEventListener("keydown", onKey, true);
  root.remove(); root = null;
  try { lastFocus && lastFocus.focus && lastFocus.focus(); } catch (e) { /* focus is a nicety */ }
}

export function toggleSources() { if (root) closeSources(); else openSources(); }
export const sourcesOpen = () => !!root;
