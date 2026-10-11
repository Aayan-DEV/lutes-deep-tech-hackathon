// The 20 or so most interesting days of the 3 years, for the story and the timeline marks.
// Each event: { date: "YYYY-MM-DD", kind, title (plain words), strength 0..1 }.

import { dayLength } from "../sun.js";

const clamp01 = x => Math.max(0, Math.min(1, x));
const doyOf = date => { const t = Date.parse(date), y = new Date(t).getUTCFullYear(); return Math.floor((t - Date.UTC(y, 0, 1)) / 864e5) + 1; };

// Top `count` days by score, at least `gap` days apart, with score over `min`.
function top(days, score, count, gap = 5, min = 0) {
  const ranked = days.map((d, i) => [score(d), i]).filter(([s]) => s > min).sort((a, b) => b[0] - a[0]);
  const out = [];
  for (const [s, i] of ranked) {
    if (out.length >= count) break;
    if (out.every(o => Math.abs(o.i - i) >= gap)) out.push({ s, i });
  }
  return out;
}

export function pickEvents(series) {
  const days = series.days(), lat = series.lat, ev = [];
  const add = (i, kind, title, strength, prio) => ev.push({ date: days[i].date, kind, title, strength: Math.round(clamp01(strength) * 100) / 100, prio });

  // Sandstorms: the strongest one first, then a few more.
  top(days, d => d.dustMax * (1 + d.dustHours / 24), 5, 10, 0.4).forEach(({ i }, k) =>
    add(i, "dust", k === 0 ? "The biggest sandstorm" : "Sandstorm", days[i].dustMax, k === 0 ? 10 : 6));
  // Rain: the heaviest day first.
  const rainTop = top(days, d => d.rainMm, 4, 15, 5);
  rainTop.forEach(({ i, s }, k) => add(i, days[i].storm ? "storm" : "rain", k === 0 ? "The heaviest rain" : days[i].storm ? "Thunderstorm" : "Heavy rain", s / Math.max(30, rainTop[0].s), k === 0 ? 9 : 5));
  // First rain of each monsoon (June to September, at least 5 mm) where there is a monsoon.
  if (lat < 35) for (const y of new Set(days.map(d => d.date.slice(0, 4)))) {
    const i = days.findIndex(d => d.date >= `${y}-06-01` && d.date <= `${y}-09-30` && d.rainMm >= 5);
    if (i >= 0) add(i, "rain", "The monsoon arrives", clamp01(days[i].rainMm / 30), 4);
  }
  // Snow: the biggest snow day, and the first snow of each winter.
  const snowTop = top(days, d => d.snowCm, 1, 1, 0.5);
  snowTop.forEach(({ i, s }) => add(i, "snow", "The biggest snow", s / 10, 9));
  days.forEach((d, i) => { if (d.note === "first snow") add(i, "snow", "First snow", clamp01(d.snowCm / 5), 7); });
  // Hail and thunderstorms.
  top(days, d => (d.hail ? 1 : 0), 2, 10, 0).forEach(({ i }) => add(i, "hail", "Hail", 0.8, 9));
  top(days, d => (d.storm ? d.rainMm + d.gustMax : 0), 2, 20, 0).forEach(({ i }) => add(i, "storm", "Thunderstorm", clamp01(days[i].gustMax / 25), 6));
  // Wind, heat and cold.
  top(days, d => d.gustMax, 1).forEach(({ i, s }) => add(i, "dust", "The windiest day", s / 30, 5));
  top(days, d => d.tMax, 1).forEach(({ i, s }) => add(i, "clear", "Hottest day", (s - 30) / 20, 8));
  top(days, d => -d.tMin, 1).forEach(({ i, s }) => add(i, "clear", "Coldest day", clamp01(s / 30), 8));
  // Longest and shortest day (by sunlight hours) in the middle year.
  const mid = days.map((d, i) => i).filter(i => days[i].date.startsWith("2024"));
  const len = i => { const t = dayLength(lat, doyOf(days[i].date)); return t.set - t.rise; };
  const longI = mid.reduce((a, b) => (len(b) > len(a) ? b : a)), shortI = mid.reduce((a, b) => (len(b) < len(a) ? b : a));
  add(longI, days[longI].kind, "The longest day", len(longI) / 24, 7);
  add(shortI, days[shortI].kind, "The shortest day", len(shortI) / 24, 7);
  // Clearest and darkest week: 7 days with the most and the least sunlight.
  const week = i => days.slice(i, i + 7).reduce((s, d) => s + d.ghiKWh, 0);
  let best = 0, worst = 0;
  for (let i = 0; i + 7 <= days.length; i++) { if (week(i) > week(best)) best = i; if (week(i) < week(worst)) worst = i; }
  add(best, "clear", "The sunniest week", week(best) / 7 / 9, 6);
  add(worst, "overcast", "The darkest week", 1 - week(worst) / 7 / 9, 5);

  // One event per day (keep the most important), the best ~20, in date order.
  const byDate = new Map();
  for (const e of ev) if (!byDate.has(e.date) || byDate.get(e.date).prio < e.prio) byDate.set(e.date, e);
  return [...byDate.values()].sort((a, b) => b.prio - a.prio || b.strength - a.strength).slice(0, 22)
    .sort((a, b) => (a.date < b.date ? -1 : 1)).map(({ prio, ...e }) => e);
}
