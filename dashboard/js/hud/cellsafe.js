// Is the solar cell's wiring safe for the Arduino pin? From the live reading only (Live mode).
// The board reports the cell's voltage as A4's voltage times CELL_DIVIDER (2: two 10k resistors halve it).
// So A4 itself sees cell.v / 2. An Arduino pin takes 5 V at most.
//   A4 at 4.9 V or more: the reading is at the top of its range, so the pin may see more than 5 V
//     (no divider, in strong light): "Too high for pin A4".
//   A4 at 4 V or more: "Close to pin A4's limit".
//   The cell reads nothing while the 4 lights see the room: a loose wire, or the cell the wrong way
//     round (a negative voltage reads as 0): "Cell reads nothing".
//   Else "Safe for pin A4", with how much of the 5 V it uses.
import { CFG } from "../logic.js";

const PIN_MAX = 5, TOP = 4.9, CLOSE = 4.0, NOTHING_V = 0.05, ROOM_LIT_COUNTS = 300;

export function cellSafety(d) {
  if (!d || !d.cell || !Number.isFinite(+d.cell.v)) return null;
  const pin = +d.cell.v / CFG.CELL_DIVIDER, of = `${pin.toFixed(1)} V of ${PIN_MAX} V`;
  if (pin >= TOP) return { word: "Too high for pin A4", kind: "look", pin: of, note: "Add the 2 resistors that halve the voltage (two 10k) before A4." };
  if (pin >= CLOSE) return { word: "Close to pin A4's limit", kind: "look", pin: of, note: "Add the 2 resistors that halve the voltage before full sun." };
  const roomLit = Array.isArray(d.raw) && Math.max(...d.raw) > ROOM_LIT_COUNTS;
  if (+d.cell.v < NOTHING_V && roomLit) return { word: "Cell reads nothing", kind: "look", pin: of, note: "Check its 2 wires: red to the 220 ohm row, black to GND." };
  return { word: "Safe for pin A4", kind: "good", pin: of, note: "" };
}
