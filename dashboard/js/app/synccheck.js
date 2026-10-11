// The light check, Sync up's last step: proof from the real readings that each motor turns toward the
// light, whatever the light map says. The torch is held still, off to one corner of the panel.
// For each axis (small motor first, then the big one):
//   1. read the board's imbalance for that axis for READ_MS (telemetry tilt / pan: pct, signed by diff)
//   2. move that motor a little: the small one TILT_STEP degrees, the big one a JOG_MS timed turn
//   3. read again. The board's own tracking moves toward the brighter side (cfg.dir times the sign).
//      Moving that way must make the light more even (moving the other way, less even). If it does
//      the opposite, that pair of lights is the wrong way round in the light map: swap it (top and
//      bottom for the small motor, left and right for the big one).
//   4. move back.
// run() resolves to { tilt, pan, map }: each "ok" | "swap" | "unclear" | "weak" (not enough light
// difference to tell: hold the torch more to one side), and map, the light map to send ("L ...") or
// null when nothing needs swapping.
const READ_MS = 500, SETTLE_MS = 700, TILT_STEP = 15, JOG_MS = 400, MIN_PCT = 8, BETTER = 0.8, WORSE = 1.2;
const wait = ms => new Promise(r => setTimeout(r, ms));

export function createLightCheck({ serial, send, pulse, getFlat, tiltRange, setKeep }) {
  // mean signed imbalance in %, over READ_MS of telemetry
  async function read(key) {
    let sum = 0, n = 0;
    const end = performance.now() + READ_MS;
    while (performance.now() < end) {
      const a = serial.data && serial.data[key];
      if (a && Number.isFinite(+a.pct)) { sum += (+a.diff >= 0 ? 1 : -1) * +a.pct; n++; }
      await wait(50);
    }
    return n ? sum / n : 0;
  }
  // before, after: signed imbalance; toward: the move went the way the board would go
  function judge(before, after, toward) {
    if (Math.abs(before) < MIN_PCT) return "weak";
    const flipped = before * after < 0, better = flipped || Math.abs(after) < Math.abs(before) * BETTER;
    const worse = !flipped && Math.abs(after) > Math.abs(before) * WORSE;
    if (toward ? better : worse) return "ok";
    if (toward ? worse : better) return "swap";
    return "unclear";
  }
  const dirOf = i => { const d = serial.data && serial.data.cfg && serial.data.cfg.dir; return Array.isArray(d) && +d[i] < 0 ? -1 : 1; };

  async function tiltTest() {
    const flat = getFlat(), [lo, hi] = tiltRange(flat);
    const before = await read("tilt");
    const way = dirOf(1) * (before >= 0 ? 1 : -1);   // where the board would tilt
    // move that way if there is room, else the other way (the expected change flips with it)
    const m = (way > 0 ? hi - flat : flat - lo) >= TILT_STEP * 0.6 ? way : -way;
    const to = Math.max(lo, Math.min(hi, flat + m * TILT_STEP));
    setKeep(`M 0 ${to.toFixed(1)}`); await wait(SETTLE_MS);
    const after = await read("tilt");
    setKeep(`M 0 ${flat.toFixed(1)}`); await wait(SETTLE_MS);
    return { result: judge(before, after, m === way), before, after };
  }
  async function panTest() {
    const flat = getFlat();
    const before = await read("pan");
    const way = dirOf(0) * (before >= 0 ? 1 : -1);   // the panel is flat here: no turned-back flip
    send(`J ${pulse(way)} ${JOG_MS} ${flat.toFixed(1)}`); await wait(JOG_MS + SETTLE_MS);
    const after = await read("pan");
    send(`J ${pulse(-way)} ${JOG_MS} ${flat.toFixed(1)}`); await wait(JOG_MS + SETTLE_MS);   // back
    return { result: judge(before, after, true), before, after };
  }

  async function run() {
    const tilt = await tiltTest(), pan = await panTest();
    const d = serial.data, m = d && Array.isArray(d.map) ? d.map.map(Number) : null;   // [tl, tr, bl, br] pins
    let map = m && m.slice(), changed = false;
    if (map && tilt.result === "swap") { map = [map[2], map[3], map[0], map[1]]; changed = true; }   // top <-> bottom
    if (map && pan.result === "swap") { map = [map[1], map[0], map[3], map[2]]; changed = true; }    // left <-> right
    return { tilt, pan, map: changed ? map : null };
  }
  return { run };
}
