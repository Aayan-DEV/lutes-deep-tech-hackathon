// Checks the real weather files and the weather series, headless. Usage: node dashboard/tests/weather_test.mjs
// Prints coverage per variable, how many rain, snow, hail and dust days each place has, the
// picked events, and a few sanity checks against what we know about these deserts.
import fs from "fs";
import { createSeries, windVec, particleKind } from "../js/weather/weather.js";
import { pickEvents } from "../js/weather/events.js";

const dir = new URL("../data/weather/", import.meta.url);
let failed = 0;
const check = (ok, msg) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };

for (const id of ["cholistan", "thar", "gobi"]) {
  const file = new URL(`${id}.json`, dir), json = JSON.parse(fs.readFileSync(file, "utf8"));
  const kb = Math.round(fs.statSync(file).size / 1024);
  const s = createSeries(json);
  console.log(`\n== ${id}: ${json.name}, ${kb} KB, ${s.hours} hours, ${s.start.toISOString()} to ${s.end.toISOString()}, ${s.tz}`);
  const cov = Object.keys(json.scale).map(k => `${k} ${Math.round(100 * json[k].filter(x => x != null).length / json.n)}%`);
  console.log("  coverage:", cov.join(", "));
  console.log(`  dust range used: ${Math.round(s.dustRange.lo)} to ${Math.round(s.dustRange.hi)} micrograms per m3`);

  const days = s.days(), count = {};
  for (const d of days) count[d.kind] = (count[d.kind] || 0) + 1;
  console.log("  days by kind:", Object.entries(count).map(([k, v]) => `${k} ${v}`).join(", "));
  const byMonth = (pred) => { const m = Array(12).fill(0); for (const d of days) if (pred(d)) m[+d.date.slice(5, 7) - 1]++; return m.join(" "); };
  console.log("  rain days per month (Jan..Dec):", byMonth(d => d.rainMm >= 1));
  console.log("  dust days per month (Jan..Dec):", byMonth(d => d.kind === "dust"));
  console.log("  snow days per month (Jan..Dec):", byMonth(d => d.snowCm >= 0.5));
  const yearT = days.map(d => (d.tMax + d.tMin) / 2), avg = yearT.reduce((a, b) => a + b) / yearT.length;
  const tMin = Math.min(...days.map(d => d.tMin)), tMax = Math.max(...days.map(d => d.tMax));
  const ghiYear = days.reduce((a, d) => a + d.ghiKWh, 0) / 3;
  console.log(`  temp ${tMin.toFixed(1)} to ${tMax.toFixed(1)} C, mean ${avg.toFixed(1)} C, sunlight ${Math.round(ghiYear)} kWh per m2 per year`);

  // at(): interpolation, kinds and speed
  const a = s.at(new Date("2024-06-15T06:30:00Z"));
  console.log("  sample 2024-06-15 06:30 UTC:", JSON.stringify(a, (k, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v)));
  console.log("  wind vector:", JSON.stringify(windVec(a), (k, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v)), "particles:", JSON.stringify(particleKind(a)));
  const t0 = performance.now(); let x = 0;
  for (let i = 0; i < 100000; i++) x += s.at(s.start.getTime() + i * 3.6e5 * 7.7).temp;
  console.log(`  at(): ${((performance.now() - t0) / 100).toFixed(4)} ms per 1000 calls`);
  check(Object.values(a).every(v => v === null || typeof v !== "number" || Number.isFinite(v)), "sample has no NaN");
  check(s.at(new Date("2020-01-01")).temp === s.at(s.start).temp, "dates before the start clamp to the first hour");

  const ev = pickEvents(s);
  console.log(`  events (${ev.length}):`);
  for (const e of ev) console.log(`    ${e.date}  ${e.kind.padEnd(8)} ${e.title.padEnd(22)} ${e.strength}`);
  check(ev.length >= 15 && ev.length <= 25, "about 20 events");
  check(ghiYear > 1500 && ghiYear < 2400, "yearly sunlight is desert-like (1500 to 2400 kWh per m2)");

  if (id === "gobi") {
    check(tMin < -20, "Gobi winters are very cold (under -20 C)");
    check(days.filter(d => d.snowCm >= 0.5).length >= 5, "Gobi gets some snow days");
    check(ev.some(e => e.kind === "snow"), "a snow event is picked");
  } else {
    const m = byMonth(d => d.rainMm >= 1).split(" ").map(Number);
    check(m[6] + m[7] + m[8] > m[0] + m[1] + m[2] + m[3] + m[10] + m[11], "most rain falls in the monsoon (July to September)");
    check(days.every(d => d.snowCm < 0.5), "no snow");
    const dd = byMonth(d => d.kind === "dust").split(" ").map(Number);
    check(dd[3] + dd[4] + dd[5] + dd[6] > dd[10] + dd[11] + dd[0], "dust storms in spring and summer, not winter");
  }
  check(ev.some(e => e.kind === "dust"), "a sandstorm is picked");
  const dustDays = count.dust || 0;
  check(dustDays >= 6 && dustDays <= 150, `dust days over 3 years are plausible (${dustDays})`);
}
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
