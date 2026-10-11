// Multi-day simulation checks (node, no browser): node dashboard/tests/daysim_test.mjs [region]
//  1. The 3-year coarse totals with the clear-sky fallback (no weather file): the tracker must land
//     between the fixed panel and the ideal one, 20 to 60 % above the fixed panel.
//  2. One clear day with the real controller (20 Hz steps) against the coarse model of the same day:
//     the coarse model must agree within a few %.
//  3. The frame budget: an hour of sim time at "1 hour per second" stays under MAX_STEPS per frame.
import { createDaySim, span, MAX_STEPS } from "../js/sim/daysim.js";
import { computeTotals } from "../js/sim/daysim_coarse.js";
import { regionGeo, localToUtc } from "../js/sim/daysim_sun.js";

const region = process.argv[2] || "cholistan";
let fails = 0;
const check = (ok, text) => { console.log(`${ok ? "ok  " : "FAIL"} ${text}`); if (!ok) fails++; };
const f1 = x => x.toFixed(1), f2 = x => x.toFixed(2);

// 1. 3-year totals
const geo = regionGeo(region), sp = span(geo);
let t0 = performance.now();
const T = computeTotals(geo, null, sp.from, sp.to);
console.log(`\n${region}: 3 years, clear sky, 0.7 W panel (${(performance.now() - t0).toFixed(0)} ms)`);
console.log(`  tracker ${f2(T.trackerKWh)} kWh   fixed ${f2(T.fixedKWh)} kWh   ideal ${f2(T.idealKWh)} kWh   gain over fixed ${f1(T.gainPct)} %`);
console.log(`  sunlight on 1 m2: tracker ${f1(T.sunPerSquareMetreKWh.tracker)} kWh, fixed ${f1(T.sunPerSquareMetreKWh.fixed)} kWh`);
check(T.trackerKWh > T.fixedKWh && T.trackerKWh <= T.idealKWh * 1.0001, "tracker between fixed and ideal");
check(T.gainPct >= 20 && T.gainPct <= 60, `gain over fixed ${f1(T.gainPct)} % is in 20..60 %`);

// 2. one clear day, real controller vs coarse
for (const [m, d] of [[6, 21], [12, 21], [3, 20]]) {
  const from = localToUtc(2024, m, d, 0, 0, geo.utcOffsetS), to = from + 864e5;
  const sim = createDaySim({ regionId: region });
  sim.jump(from);
  t0 = performance.now();
  for (let t = from; t < to; t += 60e3) sim.advance(t + 60e3, 60);   // 1 sim minute per call, all steps
  const ms = performance.now() - t0, day = sim.days.length ? sim.days[sim.days.length - 1] : sim.today;
  const c = computeTotals(geo, null, from, to);
  const fineWh = sim.total.tracker, coarseWh = c.trackerKWh * 1000;
  console.log(`  2024-${m}-${d}: controller ${f2(fineWh)} Wh, coarse ${f2(coarseWh)} Wh, fixed ${f2(sim.total.fixed)} Wh, ideal ${f2(sim.total.ideal)} Wh (${ms.toFixed(0)} ms for 1.7 M steps)`);
  check(Math.abs(fineWh / coarseWh - 1) < 0.06, `controller and coarse model agree within 6 % (${f1((fineWh / coarseWh - 1) * 100)} %)`);
  check(fineWh > sim.total.fixed, "the real controller beats the fixed panel");
}

// 3. budget at 1 hour per second (60 fps: 60 sim seconds per frame)
const sim = createDaySim({ regionId: region }), start = localToUtc(2024, 6, 21, 10, 0, geo.utcOffsetS);
sim.jump(start);
t0 = performance.now();
let worst = 0;
for (let i = 1; i <= 60; i++) { const a = performance.now(); sim.advance(start + i * 60e3, 3600); worst = Math.max(worst, performance.now() - a); }
console.log(`  1 h per second: worst frame ${worst.toFixed(1)} ms of sim work (cap ${MAX_STEPS} steps)`);
check(worst < 12, "sim work per frame under 12 ms");
const s6 = createDaySim({ regionId: region }); s6.jump(start);
for (let i = 1; i <= 60; i++) s6.advance(start + i * 360e3, 21600);
check(Number.isFinite(s6.total.tracker) && s6.total.tracker > 0, "6 h per second runs (sliced)");
const sd = createDaySim({ regionId: region }); sd.jump(start);
for (let i = 1; i <= 120; i++) sd.advance(start + i * 1440e3, 86400);
check(sd.days.length >= 1 && sd.total.tracker > 0, "1 day per second runs (coarse)");
console.log(fails ? `\n${fails} check(s) failed` : "\nall checks passed");
process.exit(fails ? 1 : 0);
