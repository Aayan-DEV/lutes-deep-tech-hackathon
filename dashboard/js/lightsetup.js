// "Set the 4 light positions": the user covers each light in turn (top left, top right, bottom left,
// bottom right). No left and right in words (they were read from the wrong side and mirrored the map):
// the 3D marks the light to cover (onStep(i) -> lightNums.highlight), seen from the front like the real
// one after Sync up's motor steps. The page watches the 4 Arduino pins (A0..A3)
// and picks the one that went dark. The result is sent to the Arduino as "L tl tr bl br" (the board
// keeps it in its memory, telemetry "ms" 1) and kept in this browser too. On connect the page sends it
// only when the board does not already hold the same map.
import { $, setHTML } from "./util.js";

const POS = ["top left", "top right", "bottom left", "bottom right"];
const STORE = "tracker-light-map";

export function savedMap() {
  try {
    const m = JSON.parse(localStorage.getItem(STORE));
    if (Array.isArray(m) && m.length === 4 && [0, 1, 2, 3].every(p => m.includes(p))) return m;   // each pin once
  } catch (e) {}
  return null;
}
// Keep a light map in this browser (the light check's swap: or the page would send the old one on connect).
export function storeMap(m) { try { localStorage.setItem(STORE, JSON.stringify(m)); } catch (e) {} }
// The board already holds this map in its memory (telemetry ms 1 and the same map): no need to send it.
export function boardHas(d, m) {
  return !!d && d.ms === 1 && Array.isArray(d.map) && Array.isArray(m) && m.every((pin, i) => +d.map[i] === +pin);
}
// The light positions are known: in the board's memory, or in this browser.
export function mapKnown(d) { return (!!d && d.ms === 1) || !!savedMap(); }

// Readings by pin (A0..A3), from the position readings and the map the Arduino reports.
function byPin(d) {
  const map = d.map || [3, 2, 1, 0], out = [0, 0, 0, 0];
  map.forEach((pin, pos) => { out[pin] = d.raw[pos]; });
  return out;
}

export function createLightSetup({ serial, send, onDone, onStep }) {
  const dlg = $("lightSetup");
  let step = 0, picked = [], base = null, candidate = null;

  function open() {
    if (!serial.fresh) { onDone("Connect the Arduino first: the setup needs the live readings."); return; }
    step = 0; picked = []; base = null; candidate = null;
    dlg.show(); draw();   // beside the 3D, not over it: the 3D marks the light to cover
  }
  function draw() {
    const d = serial.data, pins = d ? byPin(d) : [0, 0, 0, 0];
    if (!base) base = pins.slice();
    // the pin that dropped most (by share of its starting light), not already used
    candidate = null; let best = 0.25;   // must lose at least a quarter of its light
    pins.forEach((v, pin) => { const drop = 1 - v / Math.max(base[pin], 1); if (!picked.includes(pin) && drop > best) { best = drop; candidate = pin; } });
    const done = step >= 4;
    onStep && onStep(done || !dlg.open ? -1 : step);
    setHTML($("lsBody"), done ? `
      <p class="ls-big">All 4 found.</p>
      <div class="ls-map">${POS.map((p, i) => `<div><span>${p}</span><b>A${picked[i]}</b></div>`).join("")}</div>
      <p class="note">Press Save. The Arduino swaps its pins and learns the room light again (keep the torch off for a second).</p>` : `
      <p class="ls-step">Sync up · Lights · ${step + 1} of 4</p>
      <p class="ls-big">Cover the light marked <b>Cover this one</b> on the 3D with your finger.</p>
      <p class="note">Same corner on the real panel, as you see it from where you sit (the 3D shows it from your side).</p>
      <div class="ls-pins">${pins.map((v, pin) => {
        const used = picked.includes(pin), drop = Math.max(0, 1 - v / Math.max(base[pin], 1));
        return `<div class="ls-pin ${used ? "used" : ""} ${pin === candidate ? "hit" : ""}">
          <span>A${pin}${used ? " · " + POS[picked.indexOf(pin)] : ""}</span><b>${v}</b>
          <div class="bar"><i style="width:${Math.round(v / 10.23)}%"></i></div><em>${used ? "done" : drop > 0.05 ? `−${Math.round(drop * 100)}%` : ""}</em></div>`;
      }).join("")}</div>
      <p class="ls-found">${candidate == null ? "Waiting for one light to go dark…" : `Found it: <b>A${candidate}</b> is the ${POS[step]} light.`}</p>`);
    $("lsNext").textContent = done ? "Save" : "Next";
    $("lsNext").disabled = !done && candidate == null;
    $("lsBack").disabled = step === 0;
  }
  $("lsNext").onclick = () => {
    if (step >= 4) {
      send(`L ${picked.join(" ")}`);
      try { localStorage.setItem(STORE, JSON.stringify(picked)); } catch (e) {}
      dlg.close(); onDone(`Light positions saved: top left A${picked[0]}, top right A${picked[1]}, bottom left A${picked[2]}, bottom right A${picked[3]}.`);
      return;
    }
    if (candidate == null) return;
    picked[step] = candidate; step++; base = null;   // take a fresh "uncovered" reading for the next light
    if (step === 3) { const last = [0, 1, 2, 3].find(p => !picked.includes(p)); picked[3] = last; step = 4; }   // the last one is the one left over
    draw();
  };
  $("lsBack").onclick = () => { if (step > 0) { step = Math.min(step, 3) - 1; picked = picked.slice(0, step); base = null; draw(); } };
  $("lsCancel").onclick = () => dlg.close();
  dlg.addEventListener("close", () => onStep && onStep(-1));
  return { open, tick: () => { if (dlg.open) draw(); } };
}
