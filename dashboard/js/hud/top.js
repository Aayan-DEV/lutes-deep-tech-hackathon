// Top of the screen. Left: the mode (Story, Simulation, Live) and Connect. Right: the place and
// the date in one pill, and the weather in a chip. (The place is fixed: the story shows all three.)
import { hi } from "../icons.js";
import { setHTML } from "../util.js";
import { REGIONS } from "../sun.js";
import { wicon, weatherWords } from "./wicons.js";

const MODES = [{ id: "story", name: "Story" }, { id: "sim", name: "Simulation" }, { id: "live", name: "Live" }];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = r => r.name.replace(/ Desert$/, "");
const pad = n => String(n).padStart(2, "0");

// "Fri 21 Jun 2024" and "10:00" for a UTC ms at a place
export function localWords(ms, offS) {
  const d = new Date(ms + offS * 1000);
  return { day: `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    date: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` };
}

export function createTop(left, right, bus) {
  left.innerHTML = `
    <div class="seg" id="modes" role="group" aria-label="Mode">${MODES.map(m => `<button data-id="${m.id}">${m.name}</button>`).join("")}</div>
    <button class="btn dark" id="connect">${hi("usb")}<span id="connectLabel">Connect</span></button>`;
  right.innerHTML = `
    <div class="pill" id="when"></div>
    <div class="pill" id="wx"></div>`;
  const $ = id => document.getElementById(id);
  $("modes").onclick = e => { const b = e.target.closest("button"); if (b) bus.emit("mode", b.dataset.id); };
  $("connect").onclick = () => bus.emit("connect");
  let region = REGIONS[0], lastWhen = "";
  const pressed = (box, id) => box.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === id)));

  return {
    setMode(m) { pressed($("modes"), m); },
    setRegion(id) { region = REGIONS.find(r => r.id === id) || region; lastWhen = ""; },
    setConnected(on) { $("connectLabel").textContent = on ? "Disconnect" : "Connect"; },
    // when: {ms, offS} or null (hidden); weather: {sample, sunEl} or null (hidden)
    update({ when, weather }) {
      $("when").hidden = !when; $("wx").hidden = !weather;
      if (when) {
        const w = localWords(when.ms, when.offS), html = `${hi("location")}<b>${short(region)}</b><span>${w.date.replace(/ \d{4}$/, "")}</span>`;
        if (html !== lastWhen) { lastWhen = html; setHTML($("when"), html); $("when").title = `${region.name}, ${region.where}`; }
      }
      if (weather) { const w = weatherWords(weather.sample, weather.sunEl); setHTML($("wx"), `${wicon(w.icon)}<b>${w.words}</b>`); }
    },
  };
}
