// "The numbers": the tracker against a fixed panel over three years of real Gobi weather (the
// biggest gain of the three places). Two bars grow with a rising tone over a warm pad. The sentence
// and the bars use fixed figures from sim.totals('gobi') with the real weather (the voice file needs
// one exact sentence); prepareNumbers() still warms the Gobi weather for the Simulation.
import { sunAt, poseFor } from "./sunpath.js";
import { tag } from "./props.js";
import { energyBars, fixedPanel } from "./props_extra.js";
import { NUMBERS } from "./texts.js";

export const NUMBERS_REGION = "gobi";
// sim.totals('gobi') with the 2023 to 2025 Gobi weather: 5.11 kWh tracker, 4.11 kWh fixed (+24 %)
const KNOWN = { trackerKWh: 5.11, fixedKWh: 4.11 };

const fmt = v => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));
const gain = t => Math.round((t.trackerKWh / t.fixedKWh - 1) * 100);

// Load the Gobi weather and work out its totals ahead of time (cached in localStorage by the sim).
export async function prepareNumbers(sim) {
  if (!sim || !sim.whenTotals || sim.seriesFor?.[NUMBERS_REGION]) return;
  try {
    const { loadWeather } = await import("../weather/weather.js");
    await sim.whenTotals(NUMBERS_REGION, loadWeather);
  } catch (e) { /* the known figures are used */ }
}

// Fixed text, so the voice file matches (texts.js): the same figures the totals give with weather.
export function numbersText() {
  return NUMBERS;
}

export async function runNumbers(ctx) {
  const { lat } = ctx.region, s = sunAt(lat, 80, 14.5), p = poseFor(s.el, s.az, lat);
  ctx.sun(s.el, s.az);
  ctx.setDate(new Date(Date.UTC(2025, 11, 31, 9)));   // the end of the three years
  ctx.sound.pad(true);
  const fixed = ctx.put(fixedPanel(lat), -34, 0, 10);
  fixed.userData.glow(0.2);
  const pose = Promise.all([ctx.tween(ctx.pose, "pan", p.pan, 2), ctx.tween(ctx.pose, "tilt", p.tilt, 2)]);
  pose.catch(() => {});           // awaited below; no "unhandled" noise if the chapter is cut short first
  await growBars(ctx, KNOWN);   // the same figures as the spoken sentence
  await pose;
}

async function growBars(ctx, t) {
  const bars = ctx.put(energyBars([t.trackerKWh, t.fixedKWh], { gap: 18, maxH: 40 }), -96, 0, 6);
  const more = gain(t);
  const tags = [ctx.put(tag(`Tracker ${fmt(t.trackerKWh)} kWh`, { size: 3.8, dot: "#f59e0b" }), 0, 0, 0), ctx.put(tag(`Fixed ${fmt(t.fixedKWh)} kWh`, { size: 3.8, dot: "#9a9a9a" }), 0, 0, 0)];
  const plus = ctx.put(tag(`+${more} %`, { size: 5, color: "#92400e", bg: "rgba(254,243,199,0.96)" }), 0, 0, 0);
  plus.userData.fade(0);
  await ctx.wait(0.3);   // the bars grow with the sentence
  ctx.sound.rise(2.6, 196, 523);
  const S = ctx.S, base = bars.position;
  await ctx.during(2.6, u => {
    const e = 1 - Math.pow(1 - u, 3);
    bars.userData.grow(e);
    bars.userData.tops().forEach((b, i) => tags[i].position.set(base.x + b.x * S, base.y + (b.y + 5) * S, base.z));
  });
  ctx.sound.chime();
  const top = bars.userData.tops()[0];
  plus.position.set(base.x + (top.x + 9) * S, base.y + (top.y + 13) * S, base.z);
  await ctx.during(0.5, u => plus.userData.fade(u));
}
