// Sun and light for a real date and place, used by the multi-day simulation (daysim.js).
//  - Local solar hour = UTC hour + longitude / 15 (true solar time without the equation of time,
//    good to about 15 minutes, which is plenty here).
//  - Light on a surface with unit normal n and unit sun direction s (REVAMP.md):
//      dni * max(0, n.s) + dhi * (1 + n.y) / 2 + 0.2 * ghi * (1 - n.y) / 2   (beam, sky, ground bounce)
//  - The 4 LDRs see that light through a dark filter (2 % through) and the shadow cross; the same
//    vane geometry as world.js.
import { REGIONS, sunPosition, clearSky } from "../sun.js";

export const LUX_PER_WM2 = 105;   // sunlight: about 105 lux per W per m2
export const FILTER = 0.02;       // the sensor sits behind a dark filter (2 % through), as in sim.js
export const PANEL_W = 0.7;       // the real panel: 0.7 W in full sun (1000 W per m2)

// Until weather.js adds lon and tz to REGIONS, these are the places in REVAMP.md.
const FALLBACK = { cholistan: { lon: 71.9, tzH: 5 }, thar: { lon: 70.9, tzH: 5.5 }, gobi: { lon: 104.4, tzH: 8 } };
const rad = d => d * Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export const regionById = id => REGIONS.find(r => r.id === id) || REGIONS[0];

// Latitude, longitude and the clock's offset from UTC (seconds) for a region.
export function regionGeo(regionOrId, series) {
  const r = typeof regionOrId === "string" ? regionById(regionOrId) : regionOrId, fb = FALLBACK[r.id] || FALLBACK.cholistan;
  let off = fb.tzH * 3600;
  if (series && Number.isFinite(series.utcOffsetS)) off = series.utcOffsetS;
  else if (typeof r.tz === "number") off = Math.abs(r.tz) > 14 ? r.tz : r.tz * 3600;   // hours or seconds
  else if (Number.isFinite(r.utcOffsetS)) off = r.utcOffsetS;
  return { id: r.id, lat: r.lat, lon: Number.isFinite(r.lon) ? r.lon : fb.lon, utcOffsetS: off };
}

// Sun for a UTC date: {el, az (compass), doy, solarHour}.
export function sunAt(date, geo) {
  const ms = (typeof date === "number" ? date : date.getTime()) + geo.lon / 15 * 3600e3;
  const d = new Date(ms), y = d.getUTCFullYear();
  const doy = Math.floor((ms - Date.UTC(y, 0, 1)) / 864e5) + 1;
  const solarHour = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const p = sunPosition(geo.lat, doy, solarHour);
  return { el: p.el, az: p.az, doy, solarHour };
}

// Unit vector toward a compass direction in the scene frame (+x east, +y up, +z south).
export function sunVec(el, az) {
  const ce = Math.cos(rad(el));
  return [Math.sin(rad(az)) * ce, Math.sin(rad(el)), -Math.cos(rad(az)) * ce];
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// W per m2 reaching a surface facing n.
export function irradiance(n, s, w) {
  return w.dni * Math.max(0, dot(n, s)) + w.dhi * (1 + n[1]) / 2 + 0.2 * w.ghi * (1 - n[1]) / 2;
}

// Make any weather sample safe to use: missing light values come from the clear-sky model.
export function lightOf(sample, el) {
  const cs = clearSky(el), sinEl = Math.max(0, Math.sin(rad(el)));
  const ok = v => Number.isFinite(v) && v >= 0;
  const dni = el <= 0 ? 0 : ok(sample && sample.dni) ? sample.dni : cs.dni;
  const dhi = ok(sample && sample.dhi) ? sample.dhi : cs.dhi;
  const ghi = ok(sample && sample.ghi) ? sample.ghi : dni * sinEl + dhi;
  return { dni, dhi, ghi };
}

// A weather sample when there is no weather file: clear sky, mild wind, a simple warm day.
export function clearSample(el, solarHour = 12) {
  const cs = clearSky(el), sinEl = Math.max(0, Math.sin(rad(el)));
  return {
    temp: 24 + 9 * Math.sin(rad((solarHour - 9) * 15)), rain: 0, snow: 0, hail: false, cloud: 0,
    ghi: cs.dni * sinEl + cs.dhi, dni: el > 0 ? cs.dni : 0, dhi: cs.dhi, wind: 3, gust: 5, windDir: 315, rh: 25,
    dust: 0, code: 0, kind: "clear", fallback: true,
  };
}

// Light on each of the 4 LDRs (lux, after the filter) for a panel frame {n, u, v} (world.js
// panelFrame). Same shadow-cross geometry as world.js: light from the left shades the right-hand
// LDRs, light from the top shades the bottom ones. trans: 4 soiling transmissions (0..1).
const VANE_H = 1.2, LDR_D = 0.3, LDR_R = 0.255;
const lit = tan => 1 - clamp((VANE_H * Math.abs(tan) - (LDR_D - LDR_R)) / (2 * LDR_R), 0, 1);
const IS_LEFT = [true, false, true, false], IS_TOP = [true, true, false, false];
export function ldrLux(f, s, w, trans, out = [0, 0, 0, 0]) {
  const diffuse = w.dhi * (1 + f.n[1]) / 2 + 0.2 * w.ghi * (1 - f.n[1]) / 2;
  const ln = dot(s, f.n), lu = dot(s, f.u), lv = dot(s, f.v);
  for (let i = 0; i < 4; i++) {
    let beam = 0;
    if (ln > 0 && w.dni > 0) {
      const shadeU = (lu > 0) !== IS_LEFT[i] ? lit(lu / ln) : 1, shadeV = (lv > 0) !== IS_TOP[i] ? lit(lv / ln) : 1;
      beam = w.dni * ln * shadeU * shadeV;
    }
    out[i] = (diffuse + beam) * LUX_PER_WM2 * FILTER * (trans ? trans[i] : 1);
  }
  return out;
}

// Solar cell counts on A4 (220 ohm load, 10k/10k divider), as world.js cell() does.
export function cellCounts(wm2) {
  const lux = wm2 * LUX_PER_WM2, isc = 0.150 * lux / 110000, v = Math.min(isc * 220, 6.2);
  return Math.round(clamp(v / 2 / 5 * 1023, 0, 1023));
}

// Local clock parts for a UTC date and an offset: {y, m (1..12), d, hh, mm, key 'YYYY-MM-DD'}.
export function localParts(date, offS) {
  const d = new Date((typeof date === "number" ? date : date.getTime()) + offS * 1000);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  return { y, m, d: day, hh: d.getUTCHours(), mm: d.getUTCMinutes(),
    key: `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}
// UTC ms for a local clock time at a place.
export const localToUtc = (y, m, d, hh, mm, offS) => Date.UTC(y, m - 1, d, hh, mm) - offS * 1000;
