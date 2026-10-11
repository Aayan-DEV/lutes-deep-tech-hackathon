// The 4 light tiles, ported from panels.js lights() (not exported there): same scores, same
// dithered light field. ctx: { mode: 'sim' | 'live', sun (the sun drives the page),
// realLights (live readings with the pretend sun), sens (sensitivity 0..100) }.
// Live with real lights: a light 5 % or more over the room level (the tracker's dark floor, DARK_REL)
// is "Torch light". The slider no longer sets a line per light: it sets how much the sides must
// differ before the tracker moves (see trackState in ../trackstate.js).
import { countsToLux, CFG } from "../logic.js";
import { torchScore } from "../panels.js";
import { lightField } from "../dither.js";

const LIGHT_NAMES = ["Top left", "Top right", "Bottom left", "Bottom right"];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function lights(d, ctx) {
  const scored = ctx.realLights || (ctx.mode === "live" && !ctx.sun);
  const list = d.raw.map((r, i) => {
    const lux = countsToLux(r), rel = (d.lt ? d.lt[i] : 100) / 100;
    const pct = !d.ok[i] ? 0 : scored ? torchScore((rel - 1) * 100) : Math.round(clamp(Math.log10(Math.max(lux, 1)) / 4, 0, 1) * 100);
    return { name: LIGHT_NAMES[i], lux, rel, ok: !!d.ok[i], pct, scored };
  });
  const top = list.filter(l => l.ok).reduce((b, l) => (!b || l.pct > b.pct ? l : b), null);
  for (const l of list) {
    if (!l.ok) l.word = "Not working";
    else if (l.lux < 20) l.word = "Dark";
    else if (l.scored) l.word = l.rel > CFG.DARK_REL ? "Torch light" : "Room light";
    else if (ctx.sun) l.word = d.torch && top && l.pct >= top.pct - 3 ? "Sunlight" : "Shade";
    else l.word = "Room light";
    l.lit = l.word === "Sunlight" || l.word === "Torch light";
  }
  return list;
}

export const lightGrid = (d, ctx) => `<div class="grid2">${lights(d, ctx).map(l => `
  <div class="light ${l.lit ? "lit" : ""} ${l.word === "Dark" ? "dark" : ""} ${l.ok ? "" : "bad"}">
    <span class="lname"><span class="dot"></span>${l.name}</span>
    <b>${!l.ok ? "–" : l.scored ? l.pct : l.pct + "%"}</b>
    ${l.scored ? `<div class="bar line"><i style="width:${l.pct}%"></i></div>`
               : `<img class="field" alt="" src="${lightField(l.pct, l.lit ? "lit" : l.word === "Dark" ? "dark" : "shade")}">`}
    <span class="word">${l.word}</span>
  </div>`).join("")}</div>`;
