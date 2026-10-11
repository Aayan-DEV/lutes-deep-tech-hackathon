// The big card of a country chapter, at the top middle: the flag and the country name large, then
// 2 or 3 BIG numbers that count up, each with a short label. Nothing else: the place, the date and
// the sources live in the Sources panel (sources.js).
// createPlaceCard() -> { show(fact, { onHeadline, onCount }), hide(), remove() }
// fact: { flag, country (or title), numbers: [{ value, label }] } (PLACE_FACTS or HOME.card).
// onHeadline() is called when the name appears (a low tone), onCount() while the numbers count up.
// Lives in document.body, styled by css/story.css (.story-place). Everything is escaped.

const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const STEPS = [["sp-top", 0], ["sp-nums", 500]];
const COUNT_MS = 1300;

// "17 to 25%" -> parts ["", 17, " to ", 25, "%"] (numbers count up, text stays); null when no number
function parseFigure(v) {
  const str = String(v ?? ""), parts = [], re = /\d[\d,]*(?:\.\d+)?/g;
  let m, at = 0;
  while ((m = re.exec(str))) {
    parts.push(str.slice(at, m.index));
    const raw = m[0];
    parts.push({ n: parseFloat(raw.replace(/,/g, "")), dec: (raw.split(".")[1] || "").length, commas: raw.includes(",") });
    at = m.index + raw.length;
  }
  parts.push(str.slice(at));
  return parts.length > 1 ? parts : null;
}
function fmtFigure(parts, e) {
  return parts.map(p => {
    if (typeof p === "string") return p;
    let s = (p.n * e).toFixed(p.dec);
    if (p.commas) { const [a, b] = s.split("."); s = a.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (b ? `.${b}` : ""); }
    return s;
  }).join("");
}

export function createPlaceCard() {
  let root = null, timers = [], raf = 0;
  function clear() { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); raf = 0; }

  function countUp(els, figs, onCount) {
    const t0 = performance.now();
    let lastTick = 0;
    const loop = now => {
      const u = Math.min(1, (now - t0) / COUNT_MS), e = 1 - Math.pow(1 - u, 3);
      els.forEach((el, i) => { const f = figs[i]; if (f) el.textContent = fmtFigure(f, e); });
      if (now - lastTick > 75 && u < 1) { lastTick = now; try { onCount && onCount(u); } catch (err) { /* sound only */ } }
      raf = u < 1 ? requestAnimationFrame(loop) : 0;
    };
    raf = requestAnimationFrame(loop);
  }

  function show(fact, { onHeadline, onCount } = {}) {
    if (!fact) return;
    clear();
    if (!root) { root = document.createElement("section"); root.className = "story-place"; document.body.appendChild(root); }
    root.classList.remove("in");
    const nums = (fact.numbers || []).slice(0, 3), figs = nums.map(x => parseFigure(x.value));
    const name = fact.country || fact.title || "";
    root.setAttribute("aria-label", `${name}. ${nums.map(x => `${x.value} ${x.label}`).join(", ")}`);
    root.innerHTML = `
      <div class="sp-top"><div class="sp-country">${fact.flag ? `<span class="sp-flag" aria-hidden="true">${esc(fact.flag)}</span>` : ""}<b>${esc(name)}</b></div></div>
      ${nums.length ? `<div class="sp-nums n${nums.length}">${nums.map((x, i) => `<div class="sp-num"><b>${esc(figs[i] ? fmtFigure(figs[i], 0) : x.value)}</b><span>${esc(x.label)}</span></div>`).join("")}</div>` : ""}`;
    const numEls = [...root.querySelectorAll(".sp-num b")];
    requestAnimationFrame(() => root && root.classList.add("in"));
    for (const [cls, ms] of STEPS) {
      timers.push(setTimeout(() => {
        const el = root && root.querySelector(`.${cls}`);
        if (!el) return;
        el.classList.add("in");
        if (cls === "sp-top") { try { onHeadline && onHeadline(); } catch (e) { /* sound only */ } }
        if (cls === "sp-nums") countUp(numEls, figs, onCount);
      }, ms));
    }
  }

  return {
    show,
    hide() { clear(); if (root) root.classList.remove("in"); },
    remove() { clear(); if (root) { root.remove(); root = null; } },
  };
}
