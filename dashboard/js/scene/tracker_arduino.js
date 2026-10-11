// Arduino UNO R4 WiFi (6.86 x 5.33 cm) for the tracker model: teal board with the white print
// drawn on a canvas, black female headers with pin holes, USB-C, barrel jack, the Renesas chip,
// the ESP32 module with its silver can, reset button, 4 mounting holes on standoffs, the LED
// matrix, and the green power light. About 6 draw calls.
// Board frame: u (cm) from the USB end, v (cm) from the digital header edge. Local x = u - L/2,
// z = v - W/2, the top of the board at y = 0.08.
import { createKit, uvFace, uvSolid } from "./tracker_kit.js";

export const L = 6.86, W = 5.33, PITCH = 0.254;
export const HEADERS = {                       // first pin u, pin count, v
  digitalHigh: [1.85, 10, 0.254], digitalLow: [4.45, 8, 0.254],
  power: [2.62, 8, W - 0.254], analog: [4.92, 6, W - 0.254],
};
export const HEADER_H = 0.85, TOP = 0.08;
const HOLES = [[1.40, 5.08], [1.53, 0.26], [6.61, 4.57], [6.61, 1.78]];
const S = 1024 / L;                            // canvas px per cm

// Where a pin's hole is, in the board's local frame (top of the header).
export function pinAt(strip, k) { const [u0, , v] = HEADERS[strip]; return [u0 + k * PITCH - L / 2, TOP + HEADER_H, v - W / 2]; }

let tex = null;
function boardTexture() {
  if (tex) return tex;
  const THREE = window.THREE, cv = document.createElement("canvas"); cv.width = 1024; cv.height = Math.round(W * S);
  const c = cv.getContext("2d"), P = x => x * S;
  c.fillStyle = "#1b7a8c"; c.fillRect(0, 0, cv.width, cv.height);
  c.strokeStyle = "rgba(60,160,178,0.55)"; c.lineWidth = 3; c.lineJoin = "round";       // copper traces under the mask
  const tr = [[0.7, 2.6, 1.2, 3.1, 2.6, 3.1], [2.9, 1.9, 3.3, 2.3, 3.3, 2.75], [3.95, 3.2, 4.3, 3.2, 4.6, 2.9, 4.6, 0.9], [2.2, 3.7, 2.2, 4.6, 2.62, 4.95],
    [3.95, 3.5, 4.4, 3.95, 5.0, 3.95, 5.2, 4.75], [1.6, 0.6, 1.0, 0.9], [6.0, 0.6, 6.4, 1.0, 6.4, 2.7], [0.9, 3.6, 1.6, 4.2, 2.0, 4.2]];
  for (const t of tr) { c.beginPath(); for (let i = 0; i < t.length; i += 2) (i ? c.lineTo : c.moveTo).call(c, P(t[i]), P(t[i + 1])); c.stroke(); }
  c.strokeStyle = "rgba(255,255,255,0.18)"; c.lineWidth = 3; c.strokeRect(4, 4, cv.width - 8, cv.height - 8);
  // mounting holes: gold ring, dark centre
  for (const [u, v] of HOLES) {
    c.fillStyle = "#c9a65a"; c.beginPath(); c.arc(P(u), P(v), P(0.22), 0, 7); c.fill();
    c.fillStyle = "#0d2a30"; c.beginPath(); c.arc(P(u), P(v), P(0.15), 0, 7); c.fill();
  }
  // small parts printed flat: resistors, capacitors, tiny chips
  let s = 99; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (const [u0, v0, u1, v1, n] of [[1.55, 2.65, 2.85, 3.75, 9], [0.2, 2.3, 0.9, 3.55, 5], [3.95, 2.55, 4.3, 3.9, 4], [5.8, 3.4, 6.5, 4.0, 3]]) {
    for (let i = 0; i < n; i++) {
      const w = 0.1 + r() * 0.12, h = 0.06 + r() * 0.05, x = u0 + r() * (u1 - u0 - w), y = v0 + r() * (v1 - v0 - h), k = r();
      c.fillStyle = k < 0.4 ? "#1f1f1f" : k < 0.75 ? "#b89a6a" : "#8f9296";
      c.fillRect(P(x), P(y), P(w), P(h));
      c.fillStyle = "#c8c8c8"; c.fillRect(P(x), P(y), P(0.025), P(h)); c.fillRect(P(x + w - 0.025), P(y), P(0.025), P(h));
    }
  }
  // LED matrix (12 x 8)
  for (let i = 0; i < 12; i++) for (let j = 0; j < 8; j++) { c.fillStyle = "#e9e2d2"; c.fillRect(P(4.37 + i * 0.16), P(1.12 + j * 0.16), P(0.08), P(0.05)); }
  c.fillStyle = "#d8d2c4"; c.fillRect(P(3.95), P(4.05), P(0.18), P(0.12)); c.fillRect(P(6.5), P(2.45), P(0.36), P(0.5));   // a jumper pad, the Qwiic plug
  // white print
  c.fillStyle = "#f4f7f7"; c.strokeStyle = "#f4f7f7"; c.textAlign = "center"; c.textBaseline = "middle";
  const text = (t, u, v, sizeCm, weight = 700, rot = 0) => {
    c.save(); c.translate(P(u), P(v)); c.rotate(rot); c.font = `${weight} ${Math.round(P(sizeCm))}px Inter, Helvetica, sans-serif`; c.fillText(t, 0, 0); c.restore();
  };
  text("UNO R4 WiFi", 5.42, 2.78, 0.3, 800);
  c.lineWidth = P(0.045);                                                      // the infinity logo with - and +
  c.beginPath(); c.arc(P(5.1), P(3.42), P(0.19), 0, 7); c.stroke(); c.beginPath(); c.arc(P(5.5), P(3.42), P(0.19), 0, 7); c.stroke();
  c.fillRect(P(5.03), P(3.405), P(0.14), P(0.035)); c.fillRect(P(5.43), P(3.405), P(0.14), P(0.035)); c.fillRect(P(5.483), P(3.352), P(0.035), P(0.14));
  text("ARDUINO", 5.3, 3.82, 0.16, 800);
  const digital = ["SCL", "SDA", "AREF", "GND", "13", "12", "~11", "~10", "~9", "8", "7", "~6", "~5", "4", "~3", "2", "TX 1", "RX 0"];
  digital.forEach((t, i) => { const u = i < 10 ? 1.85 + i * PITCH : 4.45 + (i - 10) * PITCH; c.textAlign = "left"; text(t, u, 0.47, 0.12, 700, Math.PI / 2); });
  ["", "IOREF", "RESET", "3.3V", "5V", "GND", "GND", "VIN"].forEach((t, i) => { c.textAlign = "right"; text(t, 2.62 + i * PITCH, 4.86, 0.12, 700, Math.PI / 2); });
  ["A0", "A1", "A2", "A3", "A4", "A5"].forEach((t, i) => { c.textAlign = "right"; text(t, 4.92 + i * PITCH, 4.86, 0.13, 700, Math.PI / 2); });
  c.textAlign = "center";
  text("DIGITAL (PWM ~)", 3.68, 0.98, 0.12); text("POWER", 3.5, 4.12, 0.14); text("ANALOG IN", 5.55, 4.25, 0.14);
  text("RESET", 1.3, 3.3, 0.11); text("ON", 6.35, 3.62, 0.12); text("L", 3.4, 2.38, 0.11); text("TX", 3.7, 2.38, 0.11); text("RX", 4.0, 2.38, 0.11);
  c.fillStyle = "#e7e2d4"; for (const u of [3.4, 3.7, 4.0]) c.fillRect(P(u - 0.06), P(2.15), P(0.12), P(0.07));
  tex = new THREE.CanvasTexture(cv); tex.anisotropy = 8;
  return tex;
}

// M: shared materials { header, metal, brass, led }. Returns a group; its origin is the board's middle.
export function buildArduino(M) {
  const THREE = window.THREE, g = new THREE.Group(), k = createKit(), at = (u, y, v) => [u - L / 2, y, v - W / 2];
  const pcb = new THREE.MeshStandardMaterial({ map: boardTexture(), roughness: 0.55, metalness: 0.05 });
  k.box(pcb, L, 0.16, W, [0, 0, 0], null, geo => uvFace(geo, "y", L, W, { u0: 0.001, v0: 0.999 }));
  for (const [u0, n, v] of Object.values(HEADERS)) {
    const w = n * PITCH;
    k.box(M.header, w, HEADER_H, PITCH, at(u0 - PITCH / 2 + w / 2, TOP + HEADER_H / 2, v), null, geo => uvFace(geo, "y", w, PITCH, { u0: 0.02, v0: 0.98, repeatU: n }));
  }
  const black = geo => uvSolid(geo, 0.02, 0.98);
  // USB-C (silver, rounded, dark slot) and the barrel jack (black with a round mouth)
  k.rbox(M.metal, 0.75, 0.32, 0.9, 0.1, at(0.27, TOP + 0.16, 1.55));
  k.rbox(M.header, 0.06, 0.16, 0.66, 0.03, at(-0.11, TOP + 0.16, 1.55), null, black);
  k.box(M.header, 1.4, 1.1, 0.9, at(0.55, TOP + 0.55, 4.3), null, black);
  k.cyl(M.header, 0.32, 0.06, at(-0.17, TOP + 0.58, 4.3), [0, 0, Math.PI / 2], 20, 0.32, black);
  k.cyl(M.metal, 0.07, 0.08, at(-0.2, TOP + 0.58, 4.3), [0, 0, Math.PI / 2], 10);
  // ESP32-S3 module: dark board with a silver can, the antenna end bare
  k.box(M.header, 2.0, 0.08, 1.45, at(1.95, TOP + 0.04, 1.725), null, black);
  k.rbox(M.metal, 1.35, 0.22, 1.25, 0.03, at(2.225, TOP + 0.19, 1.725));
  // Renesas RA4M1: square black chip on a ring of silver legs
  k.box(M.metal, 1.08, 0.03, 1.08, at(3.5, TOP + 0.02, 3.2));
  k.rbox(M.header, 0.9, 0.14, 0.9, 0.02, at(3.5, TOP + 0.1, 3.2), null, black);
  // reset button: silver base, black round cap
  k.box(M.metal, 0.45, 0.14, 0.45, at(1.3, TOP + 0.07, 2.9));
  k.cyl(M.header, 0.13, 0.08, at(1.3, TOP + 0.18, 2.9), null, 16, 0.13, black);
  // standoffs under the 4 holes (brass hex) and their screw heads
  for (const [u, v] of HOLES) {
    k.cyl(M.brass, 0.24, 0.5, at(u, -0.33, v), null, 6);
    k.cyl(M.metal, 0.14, 0.06, at(u, TOP + 0.03, v), null, 12);
  }
  k.build(g);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, 0.08), M.led);   // the power light, lit green
  led.position.set(...at(6.35, TOP + 0.03, 3.35)); g.add(led);
  return g;
}
