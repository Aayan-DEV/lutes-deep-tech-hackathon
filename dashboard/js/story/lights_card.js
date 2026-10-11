// A small card for the story: light in % per tile, with a line of plain words. By default it shows
// the 4 sensors (sandstorm); setup({ title, names }) turns it into any comparison, for example
// "Fixed panel" against "This tracker" in the country chapters. setup() with nothing goes back.
// createLightsCard() -> { show(on), setup(opts), update(values 0..100), note(text), remove() }
// Lives in document.body, styled by css/story.css (.story-lights). Writes the DOM only on change.

const SENSORS = { title: "Light on the 4 sensors", names: ["Top left", "Top right", "Bottom left", "Bottom right"] };
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function createLightsCard() {
  let root = null, tiles = [], noteEl = null, last = "", lastNote = null, on = false, cfg = SENSORS, cfgKey = "";
  function build() {
    const key = `${cfg.title}|${cfg.names.join("|")}`;
    if (root && key === cfgKey) return;
    cfgKey = key;
    if (!root) {
      root = document.createElement("section");
      root.className = "story-lights";
      document.body.appendChild(root);
    }
    root.setAttribute("aria-label", cfg.title);
    root.classList.toggle("two", cfg.names.length === 2);
    root.innerHTML = `<h3>${esc(cfg.title)}</h3><div class="grid">${cfg.names.map(n => `<div class="tile"><b>0 %</b><span>${esc(n)}</span><i></i></div>`).join("")}</div><div class="note"></div>`;
    tiles = [...root.querySelectorAll(".tile")].map(el => ({ el, b: el.querySelector("b"), i: el.querySelector("i") }));
    noteEl = root.querySelector(".note");
    last = ""; lastNote = null;
  }
  return {
    show(v) {
      if (v) build();
      if (!root || on === !!v) return;
      on = !!v;
      requestAnimationFrame(() => root && root.classList.toggle("in", on));
    },
    setup(opts) {
      cfg = opts && Array.isArray(opts.names) && opts.names.length ? { title: opts.title || "", names: opts.names } : SENSORS;
      if (root) build();
    },
    update(vals) {
      if (!root || !on) return;
      const key = vals.map(v => Math.round(v)).join();
      if (key === last) return;
      last = key;
      vals.forEach((v, k) => {
        const n = Math.max(0, Math.min(100, Math.round(v))), t = tiles[k];
        if (!t) return;
        t.b.textContent = `${n} %`;
        t.el.style.setProperty("--v", `${n}%`);
        t.el.classList.toggle("low", n < 45);
      });
    },
    note(text) { if (noteEl && text !== lastNote) { lastNote = text; noteEl.textContent = text || ""; } },
    remove() { if (root) { root.remove(); root = null; tiles = []; on = false; last = ""; lastNote = null; cfgKey = ""; } },
  };
}
