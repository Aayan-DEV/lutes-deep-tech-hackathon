// What the real tracker is doing with the light, in one word and one short line, from its telemetry
// (tracker.ino v4: "lit", "bal", pan.mv / tilt.mv, pan.stuck, cfg.start). Used by the lights card, the
// word next to the sensitivity slider (game.html and classic.html) and the classic lights panel.
// Indoors there is no torch gate: it balances the 4 lights whenever the sides differ by more than the
// slider's start percentage, unless the brighter side is dark.
// Words: Balancing (an axis moves), Balanced (inside the stop band), Close enough (still, under the start
// band), At the limit (still, past it: an end stop), Dark (the brighter side under the dark floor).
// trackState(d) -> { word, kind ('move' | 'good' | 'look' | ''), sub, n (the larger imbalance, %) }
export function trackState(d) {
  if (!d) return { word: "–", kind: "", sub: "not connected", n: 0 };
  if (d.ln) return { word: "Learning", kind: "", sub: "learning the room", n: 0 };
  if (!Array.isArray(d.bal)) return { word: "Update tracker.ino", kind: "look", sub: "the Arduino has older code", n: 0 };
  const stuck = !!(d.pan && d.pan.stuck) || d.pe === 0;   // big motor off or not responding: only the tilt counts
  const n = stuck ? d.bal[1] : Math.max(d.bal[0], d.bal[1]);
  const start = d.cfg && d.cfg.start != null ? Math.round(d.cfg.start) : 15, stop = d.cfg && d.cfg.stop != null ? Math.round(d.cfg.stop) : 5;
  const differ = `the sides differ by ${n} %`;
  if (!d.lit) return { word: "Dark", kind: "", sub: "too dark to steer", n };
  if ((d.pan && d.pan.mv) || (d.tilt && d.tilt.mv)) return { word: "Balancing", kind: "move", sub: `balancing: ${differ}`, n };
  if (n <= stop) return { word: "Balanced", kind: "good", sub: stuck ? "top and bottom balanced (small motor only)" : "balanced", n };
  if (n < start) return { word: "Close enough", kind: "good", sub: `close enough: ${differ}, it moves past ${start} %`, n };   // inside the slider's tolerance
  return { word: "At the limit", kind: "look", sub: `at the limit: ${differ}`, n };   // still with a big difference = an end stop
}
