// The bottom bar of the Simulation, in one row: play / pause, how long a day takes, the time of
// day (large) with the part of the day in words, and the weather buttons. A storm button plays a
// whole run by itself (app/stormrun.js): while it runs it shows a thin progress bar and the step
// in words under its name ("landing", "cleaning", "done"), the other buttons are off, and pressing
// it again cancels. Live with the pretend sun shows the same bar without the weather buttons (css).
// Emits on the bus: 'play', 'daySpeed' (id), 'weather' (id).
import { hi } from "../icons.js";
import { setHTML } from "../util.js";
import { partOfDay } from "../sun.js";
import { DAY_SPEEDS } from "../app/dayloop.js";
import { WEATHERS } from "../sim/daysim_weather.js";
import { wicon } from "./wicons.js";
import { localWords } from "./top.js";

const tip = w => (w.id === "clear" ? "Clear sky" : `${w.name}: it lands on the panel, then the tracker cleans it. Press again to stop.`);

export function createDayBar(root, bus) {
  root.innerHTML = `
    <button class="btn dark play" id="play"></button>
    <div class="seg small" id="speeds" role="group" aria-label="How long a day takes">${DAY_SPEEDS.map(s => `<button data-id="${s.id}">${s.name}</button>`).join("")}</div>
    <div class="tod" aria-live="off"><b id="todTime">--:--</b><span id="todPart"></span></div>
    <div class="wx-row" id="wxRow" role="group" aria-label="Weather">${WEATHERS.map(w => `<button class="wx-btn" data-id="${w.id}" title="${tip(w)}">${wicon(w.icon)}<span class="wx-txt"><span class="wx-name">${w.name}</span><small class="wx-step"></small></span><i class="wx-prog" aria-hidden="true"><i></i></i></button>`).join("")}</div>`;
  const $ = id => document.getElementById(id);
  let weatherId = "clear", shown = { time: "", part: "", speed: "", weather: "", run: "" };
  $("play").onclick = () => bus.emit("play");
  $("speeds").onclick = e => { const b = e.target.closest("button"); if (b) bus.emit("daySpeed", b.dataset.id); };
  $("wxRow").onclick = e => {
    const b = e.target.closest("button");
    if (b && !b.disabled) bus.emit("weather", b.dataset.id);
  };
  // the running button: its step in words and the progress bar; the others are off
  function showRun(run) {
    const key = run ? `${run.id}|${run.words}|${Math.round(run.p * 50)}` : "";
    if (key === shown.run) return;
    shown.run = key;
    $("wxRow").querySelectorAll(".wx-btn").forEach(b => {
      const on = !!run && b.dataset.id === run.id;
      b.disabled = !!run && !on;
      b.classList.toggle("running", on);
      b.querySelector(".wx-step").textContent = on ? run.words : "";
      b.querySelector(".wx-prog i").style.width = on ? `${Math.round(run.p * 100)}%` : "0";
      b.title = on ? `${run.words}. Press to stop.` : tip(WEATHERS.find(w => w.id === b.dataset.id));
    });
  }
  const pressed = (box, id) => box.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === id)));

  return {
    // ms, offS: the clock and the place's offset from UTC; el: the sun's height; speedId, weather: ids
    update({ ms, offS, el, playing, speedId, weather, run }) {
      const time = localWords(ms, offS).time, hour = +time.slice(0, 2) + +time.slice(3) / 60;
      const part = partOfDay(el, hour);
      if (time !== shown.time) { shown.time = time; $("todTime").textContent = time; }
      if (part !== shown.part) { shown.part = part; $("todPart").textContent = part; }
      setHTML($("play"), `${hi(playing ? "pause" : "play")}<span>${playing ? "Pause" : "Play"}</span>`);
      if (speedId && speedId !== shown.speed) { shown.speed = speedId; pressed($("speeds"), speedId); }
      if (weather && weather !== shown.weather) { shown.weather = weatherId = weather; pressed($("wxRow"), weather); }
      showRun(run);
    },
  };
}
