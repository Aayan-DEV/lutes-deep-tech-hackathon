// One summary per local day for the timeline: the day's kind, the sunlight energy and a short note.
// Built once from the hourly arrays of a series (see weather.js), then cached by series.days().

import { kindOf } from "./weather.js";

const DAY_MS = 86400e3;
const ymd = t => new Date(t).toISOString().slice(0, 10);

export function buildDays(series) {
  const r = series.raw, n = series.hours;
  const local0 = series.start.getTime() + series.utcOffsetS * 1000;   // local midnight of day 0, as a UTC clock
  const days = [];
  let lastSnowDay = -999;
  for (let d = 0; d * 24 < n; d++) {
    const s = { date: ymd(local0 + d * DAY_MS), rainMm: 0, snowCm: 0, ghiKWh: 0, tMax: -99, tMin: 99, gustMax: 0,
      dustMax: 0, dustHours: 0, cloudDay: 0, hail: false, storm: false };
    let sunH = 0;
    for (let h = d * 24; h < Math.min(n, d * 24 + 24); h++) {
      const code = r.code[h] | 0, cloud = r.cloud[h] / 100, dust = r.dustStrength[h];
      const k = kindOf(code, cloud, dust, r.precip[h], r.gust[h]);
      if (k === "hail") s.hail = true;
      if (k === "storm") s.storm = true;
      if (!Number.isNaN(r.rain[h])) s.rainMm += r.rain[h];
      if (!Number.isNaN(r.snow[h])) s.snowCm += r.snow[h];
      if (!Number.isNaN(r.ghi[h])) s.ghiKWh += r.ghi[h] / 1000;
      if (r.temp[h] > s.tMax) s.tMax = r.temp[h];
      if (r.temp[h] < s.tMin) s.tMin = r.temp[h];
      if (r.gust[h] / 3.6 > s.gustMax) s.gustMax = r.gust[h] / 3.6;
      if (dust > s.dustMax) s.dustMax = dust;
      if (dust > 0.25) s.dustHours++;
      if (r.ghi[h] > 50) { s.cloudDay += cloud; sunH++; }
    }
    s.cloudDay = sunH ? s.cloudDay / sunH : 0;
    s.kind = s.hail ? "hail" : s.storm ? "storm" : s.snowCm >= 0.5 ? "snow"
      : s.dustHours >= 2 && (s.dustMax >= 0.5 || s.rainMm < 1) ? "dust"
      : s.rainMm >= 1 ? "rain" : s.cloudDay > 0.85 ? "overcast" : s.cloudDay > 0.4 ? "cloudy" : "clear";
    // "first snow" = the first snow day after a long gap (a new winter)
    const firstSnow = s.kind === "snow" && d - lastSnowDay > 120 && +s.date.slice(5, 7) >= 8;
    if (s.snowCm >= 0.5) lastSnowDay = d;
    s.note = noteFor(s, firstSnow);
    s.ghiKWh = Math.round(s.ghiKWh * 100) / 100;
    days.push(s);
  }
  return days;
}

function noteFor(s, firstSnow) {
  switch (s.kind) {
    case "hail": return "hail";
    case "storm": return "thunderstorm";
    case "snow": return firstSnow ? "first snow" : s.snowCm >= 5 ? "heavy snow" : "snow";
    case "dust": return s.dustMax >= 0.6 ? "sandstorm" : "dusty wind";
    case "rain": return s.rainMm >= 20 ? "heavy rain" : s.rainMm >= 5 ? "rain" : "light rain";
    case "overcast": return "grey sky";
    case "cloudy": return "some clouds";
    default: return s.tMax >= 45 ? "very hot" : s.tMin <= -20 ? "freezing" : "clear";
  }
}

