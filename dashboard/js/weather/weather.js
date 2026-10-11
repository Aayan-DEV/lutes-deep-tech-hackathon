// Real hourly weather for one place (2023 to 2025), read from data/weather/<id>.json.
// loadWeather(id) fetches the file; createSeries(json) builds the series without any fetch, so
// node tests can use it too. series.at(date) is called about 20 times a second, so all values are
// unpacked once into typed arrays and at() only reads two hours and blends them.

import { buildDays } from "./days.js";

const HOUR_MS = 3600e3;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// Weather kinds, most notable first (the order is used to pick a day's kind).
export const KINDS = ["hail", "storm", "snow", "dust", "rain", "overcast", "cloudy", "clear"];

export async function loadWeather(regionId) {
  const url = new URL(`../../data/weather/${regionId}.json`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather file for ${regionId}: ${res.status}`);
  return createSeries(await res.json());
}

// Kind of an hour from its WMO code plus a few thresholds. Pure, so days.js and tests share it.
export function kindOf(code, cloud, dust, rain, gust) {
  if (code === 96 || code === 99 || code === 77) return "hail";
  if (code === 95 || (rain >= 5 && gust >= 45)) return "storm";       // heavy shower with strong gusts
  if ((code >= 71 && code <= 76) || code === 85 || code === 86) return "snow";
  if (dust > 0.25 && !((code >= 61 && code <= 67) || (code >= 80 && code <= 82))) return "dust";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (cloud > 0.85) return "overcast";
  if (cloud > 0.4) return "cloudy";
  return "clear";
}

// Sandstorm strength 0..1 for one hour.
// CAMS reads very high over the Thar (thousands of micrograms per m3 for whole months), so the plain
// "dust / 400" from the plan made every summer day a sandstorm there. Instead the dust is scaled
// against the place's own range (lo = its 90th percentile, hi = its 99.9th) and then weighted by
// the wind: dusty air with no wind is haze, not a storm. Damp monsoon air (humidity over 40 %) holds
// the sand down, so it counts less. Gusts over 50 km/h in dry air (under 30 %
// humidity) add on top. With no CAMS value: gusts over 60 km/h and humidity under 25 % only.
export function dustStrength(dust, gust, rh, lo, hi) {
  if (dust == null || Number.isNaN(dust)) {
    return gust > 60 && rh < 25 ? clamp((gust - 50) / 50, 0, 1) : 0;
  }
  const conc = clamp((dust - lo) / (hi - lo), 0, 1);
  const windF = clamp((gust - 20) / 30, 0.3, 1), dryF = clamp((90 - rh) / 50, 0.25, 1);
  const boost = gust > 50 && rh < 30 ? 0.5 * clamp((gust - 50) / 50, 0, 1) : 0;
  return clamp(conc * windF * dryF + boost * (0.4 + conc), 0, 1);
}

function percentile(arr, p) {
  const v = arr.filter(x => x != null).sort((a, b) => a - b);
  return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : null;
}

// Unpack one stored array into real values (NaN where missing).
function unpack(json, key) {
  const src = json[key] || [], scale = (json.scale && json.scale[key]) || 1, n = json.n || src.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = src[i] == null ? NaN : src[i] / scale;
  return out;
}

// Linear blend that falls back to the nearest real value when one side is missing.
function lerp(a, i0, f) {
  const x = a[i0], y = a[i0 + 1];
  if (Number.isNaN(y)) return x;
  if (Number.isNaN(x)) return y;
  return x + (y - x) * f;
}

export function createSeries(json) {
  const n = json.n || json.temp.length;
  const v = {};
  for (const k of ["temp", "precip", "rain", "snow", "cloud", "ghi", "dhi", "dni", "wind", "gust", "wdir", "rh", "code", "dust"]) v[k] = unpack(json, k);
  const lo = Math.max(50, percentile(json.dust || [], 0.90) ?? 400);
  const hi = Math.max(lo + 150, percentile(json.dust || [], 0.999) ?? 1600);
  const dust = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const d = Number.isNaN(v.dust[i]) ? null : v.dust[i];
    dust[i] = dustStrength(d, v.gust[i] || 0, Number.isNaN(v.rh[i]) ? 50 : v.rh[i], lo, hi);
  }
  const start = new Date(json.start), t0 = start.getTime(), step = (json.step_s || 3600) * 1000;
  let daysCache = null;

  const series = {
    id: json.id, name: json.name, lat: json.lat, lon: json.lon, elevation: json.elevation,
    tz: json.tz, utcOffsetS: json.utc_offset_s,
    start, end: new Date(t0 + (n - 1) * step), hours: n, dustRange: { lo, hi },
    raw: { ...v, dust: v.dust, dustStrength: dust },   // for tests and the daily summary

    // Index of the hour at or before a time, plus the fraction toward the next hour.
    index(date) {
      const t = (typeof date === "number" ? date : date.getTime()) - t0;
      const x = clamp(t / step, 0, n - 1.0001);
      const i0 = Math.floor(x);
      return [i0, x - i0];
    },

    at(date) {
      const [i, f] = series.index(date);
      const near = f < 0.5 ? i : i + 1;
      const code = v.code[near] | 0, cloud = lerp(v.cloud, i, f) / 100;
      const rain = Math.max(0, lerp(v.rain, i, f));
      const snow = Math.max(0, lerp(v.snow, i, f)), gust = lerp(v.gust, i, f);
      const d = dust[i] + (dust[i + 1] - dust[i]) * f;
      // wind direction: blend the short way round the circle
      const a = v.wdir[i], b = v.wdir[i + 1];
      const dd = ((b - a + 540) % 360) - 180;
      const windDir = Number.isNaN(dd) ? a : (a + dd * f + 360) % 360;
      return {
        temp: lerp(v.temp, i, f), rain, snow, hail: code === 96 || code === 99 || code === 77,
        cloud, ghi: Math.max(0, lerp(v.ghi, i, f)), dni: Math.max(0, lerp(v.dni, i, f)), dhi: Math.max(0, lerp(v.dhi, i, f)),
        wind: lerp(v.wind, i, f) / 3.6, gust: gust / 3.6, windDir, rh: lerp(v.rh, i, f),
        dust: d, code, kind: kindOf(code, cloud, d, v.precip[near], v.gust[near]),
      };
    },

    days() { return daysCache || (daysCache = buildDays(series)); },
  };
  return series;
}

// Wind as a vector in the scene (x east, z south), metres per second, pointing where the air goes.
// windDir is where the wind comes FROM (compass), so the air moves toward windDir + 180.
export function windVec(sample) {
  const r = sample.windDir * Math.PI / 180, s = sample.wind || 0;
  return { x: -Math.sin(r) * s, y: 0, z: Math.cos(r) * s };
}

// How strong the particles should be for a sample, 0..1, and which particle kind to draw.
export function particleKind(sample) {
  switch (sample.kind) {
    case "rain": return { kind: "rain", intensity: clamp(sample.rain / 5, 0.05, 1) };
    case "storm": return { kind: "rain", intensity: clamp(sample.rain / 5, 0.4, 1) };
    case "snow": return { kind: "snow", intensity: clamp(sample.snow / 2, 0.1, 1) };
    case "hail": return { kind: "hail", intensity: 0.8 };
    case "dust": return { kind: "dust", intensity: clamp(sample.dust, 0, 1) };
    default: return { kind: "none", intensity: 0 };
  }
}
