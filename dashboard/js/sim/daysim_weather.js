// The weather buttons of the Simulation: Clear, Rain, Snow, Dust storm, Leaves.
// The Simulation plays one clear day; a button lays a made-up storm over that clear sky. The real
// weather files are not used here any more (the story's 3-year totals still use them).
// A change fades in over FADE_S real seconds: the light dims smoothly, the way a storm rolls in.
// (A sudden drop would look like dust to the firmware, which is not what a cloud should do.)
//
//   const mix = createWeatherMix();
//   mix.set("rain", fadeS, heavy)  switch (the fade starts from wherever the last fade was); back to
//                              "clear", the particles thin out over the same fade. heavy: more
//                              particles than the button's own (1 = as is, at most 1 in all)
//   mix.sample(sun)            a full weather sample for daysim.js, with fx = what the particles draw
//   mix.id                     the button that is on
import { clearSample } from "./daysim_sun.js";

export const WEATHERS = [
  { id: "clear", name: "Clear", icon: "sun" },
  { id: "rain", name: "Rain", icon: "rain" },
  { id: "snow", name: "Snow", icon: "snow" },
  { id: "dust", name: "Dust storm", icon: "dust" },
  { id: "leaves", name: "Leaves", icon: "leaf" },
];
export const FADE_S = 2;

// What each button changes. beam: share of the direct sunlight that gets through; sky: share of
// the whole sky's light that is left as soft light. fx: the particle kind and strength.
// The light cut is kept small on purpose (the sky still looks dark: that is cloud and dust): a real
// storm cloud halves the light in seconds, which the firmware reads as a block and then gives up
// on ("needs a hand") before any dirt lands. Here the drop in the 4 lights comes from the dirt,
// and a cut over about 5 % would lower the firmware's clean level so far that the dirt's gust no
// longer looks sudden to it.
const BASE = { rain: 0, snow: 0, cloud: 0, dust: 0, wind: 3, gust: 5, rh: 25, temp: null, beam: 1, sky: 1 };
const STORMS = {
  clear: { kind: "clear", code: 0, fx: null },
  rain: { kind: "rain", code: 63, rain: 3, cloud: 0.9, wind: 4, gust: 7, rh: 85, beam: 0.95, sky: 0.96, fx: { kind: "rain", intensity: 0.8 } },
  snow: { kind: "snow", code: 73, snow: 1.5, temp: -5, cloud: 0.9, wind: 3, gust: 5, rh: 90, beam: 0.95, sky: 0.96, fx: { kind: "snow", intensity: 0.75 } },
  dust: { kind: "dust", code: 7, dust: 0.8, cloud: 0.2, wind: 9, gust: 15, rh: 15, beam: 0.95, sky: 0.96, fx: { kind: "dust", intensity: 0.8 } },
  // a gentle wind: soiling.js blows leaves off the panel above 4 m/s, so a strong one leaves nothing
  leaves: { kind: "leaves", code: 0, wind: 2, gust: 4, fx: { kind: "leaves", intensity: 0.8 } },
};
const KEYS = Object.keys(BASE);
const clamp01 = x => Math.max(0, Math.min(1, x));
const lerp = (a, b, k) => a + (b - a) * k;

function levelsOf(id) {
  const s = STORMS[id] || STORMS.clear, out = {};
  for (const k of KEYS) out[k] = s[k] !== undefined ? s[k] : BASE[k];
  return out;
}

export function createWeatherMix(now = () => performance.now()) {
  let id = "clear", from = levelsOf("clear"), to = from, t0 = -1e9, fade = FADE_S, lastClearTemp = 20, fxOut = null, fxNow = null;
  const progress = () => { const x = clamp01((now() - t0) / 1000 / fade); return x * x * (3 - 2 * x); };

  // the levels right now (temp may be null = the clear day's own temperature)
  function current(clearTemp) {
    const k = progress(), out = {};
    for (const key of KEYS) {
      if (key === "temp") out.temp = lerp(from.temp ?? clearTemp, to.temp ?? clearTemp, k);
      else out[key] = lerp(from[key], to[key], k);
    }
    return { k, L: out };
  }

  return {
    get id() { return id; },
    set(next, fadeS = FADE_S, heavy = 1) {
      if (!STORMS[next] || next === id) return;
      const { L } = current(lastClearTemp);
      if (from.temp === null && to.temp === null) L.temp = null;   // both follow the clear day: keep following it
      fxOut = fxNow;   // the particles that thin out on the way to the next sky
      const fx = STORMS[next].fx;
      fxNow = fx ? { kind: fx.kind, intensity: Math.min(1, fx.intensity * Math.max(0, heavy)) } : null;
      from = L;
      to = levelsOf(next); id = next; t0 = now(); fade = Math.max(0.1, fadeS);
    },
    // sun: {el, az, solarHour} from daysim_sun.js sunAt
    sample(sun) {
      const cs = clearSample(sun.el, sun.solarHour), { k, L } = current(cs.temp), S = STORMS[id], fx = fxNow;
      lastClearTemp = cs.temp;
      const beamFlat = cs.ghi - cs.dhi;   // the direct part of the clear sky's light on flat ground
      // the clear-sky model drops the direct light to 0 in one step as the sun touches the horizon;
      // fade it over the last 4 degrees, or the firmware reads every sunset as a sudden block
      const low = clamp01(sun.el / 4), dni = cs.dni * L.beam * low * low * (3 - 2 * low), dhi = cs.dhi * L.sky + beamFlat * Math.max(0, L.sky - L.beam);
      const ghi = dni * Math.max(0, Math.sin(sun.el * Math.PI / 180)) + dhi;
      return Object.assign(cs, {
        temp: L.temp, rain: L.rain, snow: L.snow, hail: false, cloud: L.cloud, dust: L.dust,
        wind: L.wind, gust: L.gust, rh: L.rh, dni, dhi, ghi, kind: S.kind, code: S.code, fallback: false,
        // storms blow from the sun's side, so what they carry meets the panel's face (it faces the sun)
        windDir: S.fx ? (sun.az + 20) % 360 : cs.windDir,
        fx: fx ? { kind: fx.kind, intensity: fx.intensity * clamp01(0.3 + k) }
          : fxOut && k < 1 ? { kind: fxOut.kind, intensity: fxOut.intensity * (1 - k) } : { kind: "none", intensity: 0 },
      });
    },
  };
}
