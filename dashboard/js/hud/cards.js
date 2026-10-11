// The right column: the 4 lights, the solar panel, the big and the small motor, and cleaning.
// "Simulate dust" is only in Live (it runs the routine on the real board); in the Simulation the
// Dust storm button does that job.
// Each card is drawn only when its own text changed (setHTML), so buttons stay clickable.
import { hi } from "../icons.js";
import { cellSafety } from "./cellsafe.js";
import { setHTML } from "../util.js";
import { lightGrid } from "./lights.js";
import { trackState } from "../trackstate.js";

export const CARD_OF = { light: "cardLights", panel: "cardPanel", bigMotor: "cardBig", smallMotor: "cardSmall", dust: "cardDust" };

const head = (icon, title, sub) => `<div class="card-head">${hi(icon)}<h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ""}</div>`;
const badge = (text, kind) => `<span class="badge ${kind || ""}"><span class="dot"></span>${text}</span>`;
const wh = x => (x >= 10 ? x.toFixed(1) : x.toFixed(2)) + " Wh";
const kwh = x => (x >= 10 ? x.toFixed(1) : x.toFixed(2)) + " kWh";
const pct = (a, b) => { if (!(b > 0.01)) return null; const p = Math.round((a / b - 1) * 100); return (p >= 0 ? "+" : "") + p + " %"; };

export function createCards(root, { onDust }) {
  root.insertAdjacentHTML("afterbegin", `
    <section class="card" id="cardLights"></section>
    <section class="card" id="cardPanel"></section>
    <div class="pair"><section class="card" id="cardBig"></section><section class="card" id="cardSmall"></section></div>
    <section class="card" id="cardDust"><div class="card-head">${hi("scan")}<h2>Cleaning</h2><button class="btn small" id="dustBtn">${hi("flash")}Simulate dust</button></div><div id="dustBody"></div></section>`);
  const $ = id => document.getElementById(id);
  $("dustBtn").onclick = () => onDust && onDust();

  function lightsCard(v) {
    const ctx = v.ctx || { mode: v.mode || "sim", sun: true, realLights: false, sens: 50 }, d = v.d || {};
    const scored = ctx.realLights || (v.mode === "live" && !ctx.sun);
    // live, real lights: "balancing: the sides differ by N %", "balanced", "too dark to steer"
    const sub = scored ? (!v.fresh ? "not connected" : ctx.sun ? "real readings, the page steers" : trackState(d).sub) : "light each one sees";
    setHTML($("cardLights"), head("bulb", "The 4 lights", sub) + lightGrid(d, ctx));
  }

  function panelCard(v) {
    const on = v.powerW != null ? v.powerW > 0.01 : v.d.cell && v.d.cell.mw > 0.05;
    const now = v.powerW != null ? `${v.powerW.toFixed(2)} W` : v.d.cell ? `${v.d.cell.mw.toFixed(1)} mW` : "–";
    let rows = "";
    if (v.today) {
      const g = pct(v.today.tracker, v.today.fixed);
      rows += `<div class="row2"><span>Today</span><b>${wh(v.today.tracker)}</b><span class="vs">fixed ${wh(v.today.fixed)}</span>${g ? `<em>${g}</em>` : ""}</div>`;
    }
    if (v.totals) {
      const t = v.totals, g = pct(t.trackerKWh, t.fixedKWh);
      rows += `<div class="row2"><span>3 years</span><b>${kwh(t.trackerKWh)}</b><span class="vs">fixed ${kwh(t.fixedKWh)}</span>${g ? `<em>${g}</em>` : ""}</div>`;
    }
    // Live: is the cell's wiring safe for pin A4 (cellsafe.js)
    const safe = v.mode === "live" && v.connected && v.fresh ? cellSafety(v.d) : null;
    if (safe) rows += `<div class="row2"><span>Pin A4</span><b>${safe.pin}</b>${badge(safe.word, safe.kind)}</div>${safe.note ? `<p class="note">${safe.note}</p>` : ""}`;
    setHTML($("cardPanel"), head("panel", "Solar panel", "0.7 W in full sun") +
      `<div class="big-line"><b>${now}</b>${badge(on ? "Making power" : "No power", on ? "good" : "")}</div>${rows}`);
  }

  function motorCard(id, icon, title, angle, moving, words) {
    setHTML($(id), head(icon, title) + `<div class="big-line"><b>${angle}</b></div>${badge(moving ? words[0] : words[1], moving ? "move" : "")}`);
  }

  function dustCard(v) {
    const cl = v.dust || { st: 0 }, corner = ["top left", "top right", "bottom left", "bottom right"][cl.cn];   // cn: one blocked light (Live)
    const words = v.cleanAgain && cl.st === 0 ? "Clean again" : cl.st === 1 ? (corner ? `Something is on the ${corner} light: stopped` : "Something is blocking the lights")
      : cl.st === 2 ? (corner ? `Tilting to drop it off the ${corner} light, round ${Math.max(1, cl.round || 1)}` : `Cleaning: rocking back and forth, round ${Math.max(1, cl.round || 1)}`)
      : cl.st === 3 ? (corner ? `Needs a hand: the ${corner} light is still covered` : "Needs a hand") : cl.dirty || "Clean";
    const kind = cl.st === 2 ? "move" : cl.st === 1 || cl.st === 3 ? "look" : cl.dirty && !v.cleanAgain ? "" : "good";
    setHTML($("dustBody"), badge(words, kind));
    $("dustBtn").hidden = v.mode !== "live";
    $("dustBtn").disabled = v.mode === "live" && !v.connected;
    $("dustBtn").title = v.mode === "live" ? "Starts the cleaning routine on the Arduino" : "Drops dust on all 4 parts of the panel";
  }

  return {
    update(v) {
      if (!v || !v.d || !v.pose) return;   // the story hands the HUD an empty view: the column is hidden then
      lightsCard(v); panelCard(v);
      if (v.d.pan && v.d.pan.stuck) {   // the board's watchdog: 3 s of wanting to turn with no change in the light (tried again every minute)
        // At its turn limit a light past the limit looks the same to the board, so say so.
        const p = v.d.pan, atLimit = p.lim > 0 && Math.abs(p.deg) >= p.lim - 0.5;
        setHTML($("cardBig"), head("rotate", "Big motor") + `<div class="big-line"><b>${Math.abs(Math.round(v.pose.pan))}°</b></div>` +
          badge("Not responding: using the small motor only", "look") + (atLimit ? `<div class="row2"><span>or the light is past its ${Math.round(p.lim)}° turn</span></div>` : ""));
      }
      else motorCard("cardBig", "rotate", "Big motor", `${Math.abs(Math.round(v.pose.pan))}°`, v.panMoving,
        [v.d.pan && v.d.pan.uw ? "Turning round: the wires stay safe" : "Turning", "Still"]);   // uw: the board goes round the other way (its turn limit)
      motorCard("cardSmall", "tilt", "Small motor", `${Math.round(Math.abs(v.pose.tilt - (v.pose.flat ?? 90)))}°`, v.tiltMoving, ["Tilting", "Still"]);
      dustCard(v);
    },
    highlight(part) {
      const el = $(CARD_OF[part]);
      if (!el) return;
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      el.classList.remove("hl"); void el.offsetWidth; el.classList.add("hl");
      clearTimeout(el._hl); el._hl = setTimeout(() => el.classList.remove("hl"), 1800);
    },
  };
}
