// Every line the story can say, in story order: the voice tool (tools/make_voice.mjs) makes one mp3
// per line, and js/story/voice.js finds a line's file by its key. Pure data: node imports this.
//   LINES        the lines, in order (chapter sentences, the start card, the real-world tests)
//   normLine(t)  the text a key is made from: trimmed, runs of whitespace as one space
// key = the first 10 hex characters of the SHA-1 of normLine(text) (js/story/sha1.js).
import { PLACE_FACTS, PLACE_ORDER } from "./places.js";
import { FUTURE, homeLines } from "./facts_home.js";
import { DAWN, CAME, LEFT, TEAM, SKETCH, STEPS, SOFTWARE, MOTORS, NUMBERS, GATE, REAL } from "./texts.js";

export const normLine = t => String(t == null ? "" : t).replace(/\s+/g, " ").trim();

export { homeLines };

export const LINES = [
  GATE.ask, GATE.connecting, GATE.calibrating, GATE.connected, GATE.calibrated, GATE.failed,
  ...DAWN,
  ...CAME,
  ...PLACE_ORDER.flatMap(id => (PLACE_FACTS[id]?.sentences || []).slice(0, 2)),
  ...homeLines(),
  ...TEAM,
  ...SKETCH,
  ...STEPS,
  ...LEFT,
  ...SOFTWARE,
  ...MOTORS,
  ...NUMBERS,
  ...FUTURE.sentences,
  GATE.homing, GATE.homed,
  REAL.intro, REAL.torch, REAL.torchOk, REAL.torchNo, REAL.dust, REAL.dustOk, REAL.dustNo, REAL.end,
].map(normLine).filter((t, i, all) => t && all.indexOf(t) === i);
