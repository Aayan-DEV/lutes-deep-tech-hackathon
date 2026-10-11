// What sits on the panel and its 4 light sensors: dust, snow, water and leaves, per quadrant (TL, TR, BL, BR).
// Each layer is a coverage 0..1 (0 = clean, 1 = fully covered). Pure maths, no three.js.
//
// Rules (simple on purpose, stable for any time step, never NaN):
//  - Dust slides off once the panel is steep: steepness = |tilt - 90| (90 = flat). Nothing slides
//    below 35 degrees; past that it slides faster the steeper it is, and 3 times faster while the
//    tilt is moving (the jolt shakes it loose). Rain washes dust away. A dust storm adds dust.
//  - Snow slides the same way (a bit slower) and melts above 0 C, faster with sun. Melt water wets
//    the panel.
//  - Water drains when steep and dries: faster with sun and wind. Rain wets the panel.
//  - Leaves slide off sooner than dust (past 25 degrees) and faster (1.0 per second at 90, twice
//    that while the tilt moves). Wind over 4 m/s blows them off. Rain does not wash them: wet
//    leaves stick, so they slide half as fast while it rains over 0.5 mm/h. They never melt.
//  - Light let through one quadrant = (1 - 0.9 dust) (1 - 0.95 snow) (1 - 0.15 water) (1 - 0.85 leaves).
//    The cell gets the mean of the 4 quadrants.
// Every change uses exact exponential steps (x moves toward its target by 1 - e^(-rate dt)), so a
// sim that jumps an hour at a time stays inside 0..1 and never overshoots.

export const SOIL = {
  STEEP_DEG: 35,        // below this steepness nothing slides
  DUST_SLIDE: 0.6,      // per second at the steepest (90 degrees), panel still
  MOVE_BOOST: 3,        // times faster while the tilt is moving
  PAN_SHAKE: 0.01,      // per second while the big motor turns (a small shake, any steepness)
  RAIN_WASH: 0.004,     // dust washed per second per mm/h of rain
  DUST_FALL: 0.002,     // dust added per second at storm strength 1 (only if update gets `dust`)
  SNOW_SLIDE: 0.3,      // like dust, a bit slower (snow sticks)
  SNOW_FALL: 0.01,      // snow added per second per cm/h (only if update gets `snow`)
  MELT: 0.0005,         // per second per degree C above 0 ...
  MELT_SUN: 3,          // ... times (1 + 3 * sun share), sun share = sunW / 1000 W per m2
  MELT_TO_WATER: 0.5,   // share of melted snow that becomes water on the panel
  WATER_DRAIN: 0.8,     // per second at the steepest
  DRY: 0.0004,          // per second in shade and still air ...
  DRY_SUN: 4,           // ... times (1 + 4 * sun share + 0.2 * wind m/s)
  DRY_WIND: 0.2,
  RAIN_WET: 0.02,       // water added per second per mm/h of rain
  LEAF_STEEP_DEG: 25,   // leaves start to slide at this steepness (sooner than dust) ...
  LEAF_SLIDE: 1.0,      // ... per second at the steepest (90 degrees), panel still
  LEAF_MOVE_BOOST: 2,   // times faster while the tilt is moving
  LEAF_WIND_MIN: 4,     // wind over this (m/s) blows leaves off ...
  LEAF_WIND: 0.04,      // ... per second per m/s above it
  LEAF_RAIN_MM: 0.5,    // rain over this (mm/h) makes leaves stick:
  LEAF_WET: 0.5,        // the slide rate is multiplied by this
  LEAF_FALL: 0.0076,    // leaves added per second at strength 1 (only if update gets `leaves`; 2 min = 0.6)
  BLOCK: { dust: 0.9, snow: 0.95, water: 0.15, leaves: 0.85 },   // how much light a full layer stops
  CLEAN: 0.02,          // under this coverage everywhere = clean
};

const KINDS = ["dust", "snow", "water", "leaves"];
const clamp01 = x => (x > 0 ? (x < 1 ? x : 1) : 0);   // also turns NaN into 0
const num = (x, d = 0) => (Number.isFinite(x) ? x : d);
// Exact step of dx/dt = gain * (1 - x) - loss * x over dt seconds.
function relax(x, gain, loss, dt) {
  const k = gain + loss;
  if (!(k > 0) || !(dt > 0)) return clamp01(x);
  const target = gain / k;
  return clamp01(target + (x - target) * Math.exp(-k * dt));
}

export function createSoiling(cfg = SOIL) {
  const layers = { dust: [0, 0, 0, 0], snow: [0, 0, 0, 0], water: [0, 0, 0, 0], leaves: [0, 0, 0, 0] };

  // Add coverage to one quadrant (0..3) or, with no quadrant (or -1), spread over all 4.
  // kind: 'dust', 'snow', 'water', 'leaves'; 'rain' counts as water, 'hail' as snow, 'leaf' as leaves.
  function deposit(kind, amount, quadrant) {
    const k = kind === "rain" ? "water" : kind === "hail" ? "snow" : kind === "leaf" ? "leaves" : kind;
    if (!KINDS.includes(k)) return;
    const a = Math.max(0, num(amount));
    const qs = Number.isInteger(quadrant) && quadrant >= 0 && quadrant < 4 ? [quadrant] : [0, 1, 2, 3];
    for (const q of qs) layers[k][q] = clamp01(layers[k][q] + a * (1 - layers[k][q]));
  }

  // dt in seconds. env: tiltDeg (servo angle, 90 = flat), panMoving, tiltMoving, temp (C),
  // sunW (W per m2 on the panel), rain (mm/h), wind (m/s). Optional for a fast sim with no
  // particles: dust (storm strength 0..1), snow (cm/h) and leaves (strength 0..1) add their own layer here.
  function update(dt, env = {}) {
    dt = Math.max(0, num(dt));
    if (!dt) return;
    const steep = Math.abs(num(env.tiltDeg, 90) - 90);
    const over = clamp01((steep - cfg.STEEP_DEG) / (90 - cfg.STEEP_DEG));
    const jolt = env.tiltMoving ? cfg.MOVE_BOOST : 1, shake = env.panMoving ? cfg.PAN_SHAKE : 0;
    const temp = num(env.temp, 20), sun = clamp01(num(env.sunW) / 1000);
    const rain = Math.max(0, num(env.rain)), wind = Math.max(0, num(env.wind));
    const dustIn = clamp01(num(env.dust)) * cfg.DUST_FALL, snowIn = Math.max(0, num(env.snow)) * cfg.SNOW_FALL;
    const leavesIn = clamp01(num(env.leaves)) * cfg.LEAF_FALL;
    const leafOver = clamp01((steep - cfg.LEAF_STEEP_DEG) / (90 - cfg.LEAF_STEEP_DEG));
    const leafSlide = cfg.LEAF_SLIDE * leafOver * (env.tiltMoving ? cfg.LEAF_MOVE_BOOST : 1) * (rain > cfg.LEAF_RAIN_MM ? cfg.LEAF_WET : 1);
    const leafOff = leafSlide + cfg.LEAF_WIND * Math.max(0, wind - cfg.LEAF_WIND_MIN);
    const melt = temp > 0 ? cfg.MELT * temp * (1 + cfg.MELT_SUN * sun) : 0;
    const dry = cfg.DRY * (1 + cfg.DRY_SUN * sun + cfg.DRY_WIND * wind);
    for (let q = 0; q < 4; q++) {
      layers.dust[q] = relax(layers.dust[q], dustIn, cfg.DUST_SLIDE * over * jolt + shake + cfg.RAIN_WASH * rain, dt);
      const snowBefore = layers.snow[q];
      layers.snow[q] = relax(snowBefore, snowIn, cfg.SNOW_SLIDE * over * jolt + shake + melt, dt);
      // melt water: the share of the snow that left by melting (not by sliding)
      const lossK = cfg.SNOW_SLIDE * over * jolt + shake + melt;
      const melted = lossK > 0 ? Math.max(0, snowBefore - layers.snow[q]) * (melt / lossK) : 0;
      const wet = layers.water[q] + cfg.MELT_TO_WATER * melted;
      layers.water[q] = relax(wet, cfg.RAIN_WET * rain, cfg.WATER_DRAIN * over + dry, dt);
      layers.leaves[q] = relax(layers.leaves[q], leavesIn, leafOff, dt);
    }
  }

  // Share of light let through: per light sensor, and the cell's mean.
  function transmission() {
    const ldr = [0, 1, 2, 3].map(q => clamp01((1 - cfg.BLOCK.dust * layers.dust[q]) *
      (1 - cfg.BLOCK.snow * layers.snow[q]) * (1 - cfg.BLOCK.water * layers.water[q]) *
      (1 - cfg.BLOCK.leaves * layers.leaves[q])));
    return { ldr, cell: (ldr[0] + ldr[1] + ldr[2] + ldr[3]) / 4 };
  }

  const isClean = () => KINDS.every(k => layers[k].every(v => v < cfg.CLEAN));
  function reset() { for (const k of KINDS) layers[k].fill(0); }

  return { layers, deposit, update, transmission, isClean, reset };
}
