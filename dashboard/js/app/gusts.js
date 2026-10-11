// What a weather run (stormrun.js) lands on the panel, second by second. The particles fall and
// report where they hit; here that only decides which quarter of the panel gets a bit more. How
// much lands is set by a timeline, so every run covers the panel the same way (also with no
// particles at all):
//  - dust, snow and leaves: a thin layer in the first THIN_S seconds, then one gust at GUST_AT
//    that lands the rest over GUST_S seconds, up to COVER.
//  - rain water: grows evenly to COVER by WATER_S seconds (water is not held back).
// A run lands in 3 real seconds: the thin layer by 2 s, the gust from 2.2 s, all of it on by 2.8 s.
// Why one gust: the firmware only reacts to a sudden drop (under 60 % of its clean level, falling
// there from over 90 % within 3 s). A layer that grows slowly never trips it; a gust does, just as
// a real one would. The thin layer is kept under about 6 % of the light for the same reason.
//
//   const land = createGusts(getLayers, deposit);   // deposit(kind, amount, quadrant)
//   land.start(kind)        'dust' | 'snow' | 'leaves' | 'water'
//   land.hit(kind, q, a)    from the particles
//   land.frame(t)           t: seconds since the storm began
// The cover a run lands, on average. The 4 lights answer less than linearly to the light (an LDR),
// so the layers need a bit over 0.6 for the firmware to read the drop as under 60 %.
export const COVER = { dust: 0.7, snow: 0.66, leaves: 0.75, water: 0.6 };
export const THIN = { dust: 0.06, snow: 0.055, leaves: 0.06 };
export const THIN_S = 2, GUST_AT = 2.2, GUST_S = 0.6, WATER_S = 2.8;
const SPREAD = 0.16;                            // the quarter hit most gets 1.08 times the cover, the least 0.92

const smooth = x => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
const KIND = { rain: "water", hail: "snow", leaf: "leaves" };

export function createGusts(getLayers, deposit) {
  let kind = null;
  const hits = [0, 0, 0, 0];

  // the cover wanted on the whole panel at t seconds
  function target(t) {
    if (kind === "water") return COVER.water * smooth(t / WATER_S);
    const thin = THIN[kind] * smooth(t / THIN_S);
    return thin + (COVER[kind] - THIN[kind]) * smooth((t - GUST_AT) / GUST_S);
  }
  // the share of each quarter, from where the particles hit (even when nothing hit yet)
  function weights() {
    const most = Math.max(...hits);
    return hits.map(h => (most > 0 ? 1 - SPREAD / 2 + SPREAD * h / most : 1));
  }

  return {
    get kind() { return kind; },
    start(k) { kind = KIND[k] || k; hits.fill(0); },
    stop() { kind = null; },
    hit(k, q, a) { if (kind && (KIND[k] || k) === kind && q >= 0 && q < 4) hits[q] += Math.max(0, a || 0); },
    // bring each quarter up to its share of the target (only adds: what slid off comes back)
    frame(t) {
      const L = getLayers();
      if (!kind || !L || !L[kind]) return;
      const want = target(t), w = weights();
      for (let q = 0; q < 4; q++) {
        const x = L[kind][q], to = Math.min(0.95, want * w[q]);
        if (to > x + 1e-4) deposit(kind, (to - x) / (1 - x), q);
      }
    },
  };
}
