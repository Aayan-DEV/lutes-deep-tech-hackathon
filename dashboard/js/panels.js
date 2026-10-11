// The right-hand side, in plain words. It shows the overview, or the part you clicked in 3D.
// Every card has the same look: a heading, a status badge, then small tiles with one big number each.
// ctx.sun = true when the sun simulation drives the page (Simulation, or Live with the pretend sun).
import { $, clamp, setHTML } from "./util.js";
import { countsToLux, panSpeedFrac, CFG } from "./logic.js";
import { hi } from "./icons.js";
import { lightField } from "./dither.js";
import { trackState } from "./trackstate.js";

export const PARTS = [
  { id: null, name: "Overview", icon: "overview" }, { id: "light", name: "Lights", icon: "bulb" },
  { id: "pan", name: "Big motor", icon: "rotate" }, { id: "tilt", name: "Small motor", icon: "tilt" },
  { id: "panel", name: "Panel", icon: "panel" },
];
const LIGHT_NAMES = ["Top left", "Top right", "Bottom left", "Bottom right"];

// Score on the SAME 0-100 scale as the sensitivity slider: a light passes the slider's level exactly
// when it is bright enough (above the room) for the Arduino to count it as the torch.
// Inverse of the Arduino's formula: torch needs 35 * 8^((level - 50) / 50) % more light than the room.
export const torchScore = upPct => upPct <= 0 ? 0 : clamp(Math.round(50 + 50 * Math.log(upPct / 35) / Math.log(8)), 0, 100);

// What each of the 4 lights sees, and one word for it.
//  Live (real sensors): score 0-100 against the sensitivity line.
//  Simulation: how much light, 0-100 (1 lux = 0, 10 000 lux = 100).
function lights(d, ctx) {
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
    else if (l.scored) l.word = l.rel > CFG.DARK_REL ? "Torch light" : "Room light";   // 5 % over the room (the tracker's dark floor)
    else if (ctx.sun) l.word = d.torch && top && l.pct >= top.pct - 3 ? "Sunlight" : "Shade";
    else l.word = "Room light";
    l.lit = l.word === "Sunlight" || l.word === "Torch light";
  }
  return list;
}
const lightGrid = (d, ctx) => `<div class="grid2">${lights(d, ctx).map(l => `
  <div class="light ${l.lit ? "lit" : ""} ${l.word === "Dark" ? "dark" : ""} ${l.ok ? "" : "bad"}">
    <span class="lname"><span class="dot"></span>${l.name}</span>
    <b>${!l.ok ? "–" : l.scored ? l.pct : l.pct + "%"}</b>
    ${l.scored ? `<div class="bar line"><i style="width:${l.pct}%"></i></div>`
               : `<img class="field" alt="" src="${lightField(l.pct, l.lit ? "lit" : l.word === "Dark" ? "dark" : "shade")}">`}
    <span class="word">${l.word}</span>
  </div>`).join("")}</div>`;

// ---- building blocks ----
const badge = (text, kind) => `<span class="badge ${kind || ""}"><span class="dot"></span>${text}</span>`;
const tile = (icon, label, value, help, pct) => `
  <div class="tile">
    <span class="label">${hi(icon)}${label}</span>
    <b>${value}</b>
    ${pct == null ? `<span class="help">${help}</span>` : `<div class="bar"><i style="width:${clamp(pct, 0, 100)}%"></i></div>`}
  </div>`;
const card = (icon, title, sub, body) => `<section class="card"><div class="card-head">${hi(icon)}<h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ""}</div>${body}</section>`;
const power = (d, ctx) => ctx.sun ? (d.powerW || 0).toFixed(2) + " W" : d.cell ? d.cell.mw.toFixed(1) + " mW" : "–";

// ---- progress over time: how fast it lines up, how often it faces the light ----
export function createProgress() {
  const p = { torchS: 0, facingS: 0, last: 0, lockStart: null, lastLockS: null };
  p.add = d => {
    const now = performance.now(), dt = p.last ? Math.min(0.5, (now - p.last) / 1000) : 0; p.last = now;
    const moving = (d.pan.us && d.pan.us !== 1500) || d.tilt.mv, facing = d.torch && !moving && d.pan.pct < d.cfg.start && d.tilt.pct < d.cfg.start;
    if (d.torch) { p.torchS += dt; if (facing) p.facingS += dt; }
    if (d.torch && moving && p.lockStart === null) p.lockStart = now;
    if (facing && p.lockStart !== null) { p.lastLockS = (now - p.lockStart) / 1000; p.lockStart = null; }
    if (!d.torch) p.lockStart = null;
    p.facing = facing; p.moving = moving;
  };
  return p;
}

// What the whole tracker is doing, as a badge.
function state(d, ctx) {
  const p = ctx.progress, thing = ctx.sun ? "sun" : "torch";
  if (ctx.mode === "live" && !ctx.fresh) return ["Not connected", ""];
  if (ctx.sun && d.sun && d.sun.el < -2) return ["Night: resting, facing the sunrise", "night"];
  if (!d.torch) return [ctx.sun ? "Waiting for sunrise" : "Waiting for a torch", ""];
  if (d.sk) return [`Looking for the ${thing}`, "look"];
  if (p.moving) return [`Turning to the ${thing}`, "move"];
  return [ctx.sun ? "Following the sun" : "Facing the torch", "good"];
}

// ---- one view per part ----
function overview(d, ctx) {
  const p = ctx.progress, [st, kind] = state(d, ctx), thing = ctx.sun ? "sun" : "torch";
  const aimPct = ctx.aim && d.torch ? Math.round(ctx.aim.cos * 100) : null;
  const onTarget = p.torchS > 2 ? Math.round(p.facingS / p.torchS * 100) : null;
  const scoredLights = ctx.realLights || (ctx.mode === "live" && !ctx.sun);
  const head = scoredLights ? (ctx.fresh ? (d.ln ? "Learning the room: 0 = the brightest seen" : trackState(d).sub) : "real sensors")
                            : "how much light each one sees";
  let html = card("bulb", "The 4 lights", head, lightGrid(d, ctx)) +
    card("target", "How it's doing", "", `${badge(st, kind)}<div class="grid2">
      ${tile("target", "Aim", aimPct == null ? (ctx.mode === "live" && !ctx.sun && d.torch ? (p.facing ? "Lined up" : "Turning") : "–") : aimPct + "%", "light the panel catches", aimPct)}
      ${tile("timer", "Speed", p.lastLockS == null ? "–" : p.lastLockS.toFixed(1) + " s", "time to line up again")}
      ${tile("check", "On target", onTarget == null ? "–" : onTarget + "%", `time facing the ${thing}`, onTarget)}
      ${tile("flash", "Power", power(d, ctx), "made by the panel now")}</div>`);
  if (ctx.sun && d.energy) {
    const e = d.energy, extra = e.fixed > 0.25 ? Math.round((e.tracker / e.fixed - 1) * 100) : null;
    html += card("energy", "Today", "since sunrise", `<div class="grid3">
      ${tile("panel", "Tracker", e.tracker.toFixed(2) + " Wh", "following the sun")}
      ${tile("panel", "Fixed panel", e.fixed.toFixed(2) + " Wh", "not moving")}
      ${tile("flash", "Extra", extra == null ? "–" : (extra >= 0 ? "+" : "") + extra + "%", "from tracking")}</div>`);
  }
  return html;
}

function lightView(d, ctx) {
  const l = lights(d, ctx), lit = l.filter(x => x.lit).map(x => x.name.toLowerCase()), thing = ctx.sun ? "sun" : "torch";
  return card("bulb", "Light sensor", "4 lights and a shadow cross",
    `${badge(d.torch ? `Sees the ${thing}` : ctx.sun ? "No sun yet" : "Room light only", d.torch ? "good" : "")}
     <p class="why">${d.torch && lit.length ? `Brightest: ${lit.join(", ")}. The shadow cross darkens the far side.` : "No strong light on any side."}</p>${lightGrid(d, ctx)}`);
}

function bigMotorView(d, ctx) {
  if (ctx.panOff) return card("rotate", "Big motor", "not connected",
    `${badge("Not connected", "")}<p class="why">It is switched off, so it never moves. Turn it on under the 3D.</p>
     <div class="grid2">${tile("speed", "Speed", "0%", "never moves")}${tile("rotate", "Facing", "–", "no big motor")}</div>`);
  const turning = d.pan.us && d.pan.us !== 1500, speed = turning ? Math.round(panSpeedFrac(d.pan.us - 1500) * 100) : 0, thing = ctx.sun ? "sun" : "torch";
  const why = ctx.sun && d.sun && d.sun.el < -2 ? "Night: it turns back to face the sunrise." : !d.torch ? `No ${thing}, so it waits.` : turning ? "One side is brighter, so it turns that way." : "Both sides get the same light, so it stays.";
  return card("rotate", "Big motor", "turns left and right",
    `${badge(turning ? "Turning" : d.pan.us === 1500 ? "Stopping" : "Still", turning ? "move" : "")}<p class="why">${why}</p>
     <div class="grid2">${tile("speed", "Speed", speed + "%", "of its top speed", speed)}${tile("rotate", "Facing", Math.abs(Math.round(ctx.pose.pan)) + "°", "turned from the start")}</div>`);
}

function smallMotorView(d, ctx) {
  const speed = d.tilt.mv ? d.tilt.drv : 0, tipped = Math.round(Math.abs(ctx.pose.tilt - 90)), thing = ctx.sun ? "sun" : "torch";
  const why = !d.torch ? `No ${thing}, so it waits.` : d.sk ? `The ${thing} went behind, so it tips back to look.` : d.tilt.mv ? "Top and bottom differ, so it tips to the brighter one." : "Top and bottom get the same light, so it stays.";
  return card("tilt", "Small motor", "tips up and down",
    `${badge(d.sk ? "Looking up" : d.tilt.mv ? "Tipping" : "Still", d.tilt.mv || d.sk ? "move" : "")}<p class="why">${why}</p>
     <div class="grid2">${tile("speed", "Speed", speed + "%", "of its top speed", speed)}${tile("tilt", "Tipped", tipped + "°", "from lying flat")}</div>`);
}

function panelView(d, ctx) {
  const aimPct = ctx.aim && d.torch ? Math.round(ctx.aim.cos * 100) : null;
  const on = ctx.sun ? (d.powerW || 0) > 0.01 : (d.cell ? d.cell.mw : 0) > 0.05;
  return card("panel", "Solar panel", "0.7 W in full sun",
    `${badge(on ? "Making power" : "No power", on ? "good" : "")}
     <div class="grid2">${tile("flash", "Power", power(d, ctx), ctx.sun ? "W = watts" : "mW = thousandths of a watt")}${tile("target", "Aim", aimPct == null ? "–" : aimPct + "%", "light it catches", aimPct)}</div>`);
}

export function drawSide(picked, d, ctx) {
  const views = { light: lightView, pan: bigMotorView, tilt: smallMotorView, panel: panelView };
  setHTML($("sideCards"), (views[picked] || overview)(d, ctx));
  document.querySelectorAll("#partChips button").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.id || null) === picked)));
}
