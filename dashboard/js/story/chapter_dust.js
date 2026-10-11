// Chapter 5: the strongest sandstorm in the weather data. The sky turns brown, sand blows and
// lands on the panel, the 4 lights drop (a small card shows them in %), the tracker rocks the panel
// back and forth until most sand slides off, then rain washes the rest and the sky clears.
import { sunAt, poseFor, dateFor } from "./sunpath.js";

const FALLBACK = new Date(Date.UTC(2024, 4, 12));   // only used when no weather events were given

function strongestDust(ctx) {
  let list = ctx.events;
  if ((!Array.isArray(list) || !list.length) && typeof ctx.sim?.events === "function") { try { list = ctx.sim.events(ctx.region.id); } catch { list = null; } }
  if (!Array.isArray(list)) return null;
  const dust = list.filter(e => e && e.kind === "dust");
  if (!dust.length) return null;
  return dust.reduce((a, b) => ((b.strength ?? 0) > (a.strength ?? 0) ? b : a));
}
const toDate = d => (d instanceof Date ? d : new Date(`${String(d).slice(0, 10)}T00:00:00Z`));
const fmtDay = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function dustText(ctx) {
  const ev = strongestDust(ctx);
  const first = ev ? `On ${fmtDay(toDate(ev.date))}, the biggest sandstorm of the three years arrives.` : "One day, a big sandstorm arrives.";
  return `${first} Sand covers the panel, and the four light sensors see less and less light. The tracker notices the drop and tilts the panel back and forth. Most of the sand slides off, and later the rain washes the rest away.`;
}

export async function runDust(ctx) {
  const T = window.THREE, { lat, lon } = ctx.region, ev = strongestDust(ctx), snd = ctx.sound, L = ctx.lights;
  const day = ev ? toDate(ev.date) : FALLBACK, year = day.getUTCFullYear();
  const doy = Math.round((day - Date.UTC(year, 0, 1)) / 86400e3) + 1;
  const s = sunAt(lat, doy, 11), home = poseFor(s.el, s.az, lat);
  ctx.sun(s.el, s.az);
  ctx.setDate(dateFor(year, doy, 11, lon));
  L.show(true); L.note("A clear morning. Plenty of light.");
  await Promise.all([ctx.tween(ctx.pose, "pan", home.pan, 1.2), ctx.tween(ctx.pose, "tilt", home.tilt, 1.2)]);

  // the storm comes: brown sky, wind, sand landing on the panel
  const wind = new T.Vector3(10, 0, 3);
  let lastW = -1;
  const storm = (k, kind = "dust") => {          // weather in steps of 0.05, so the sky is not redone every frame
    const q = Math.round(k * 20) / 20;
    if (q === lastW) return;
    lastW = q;
    ctx.weather(q > 0.02 ? kind : "clear", q);
    ctx.scene.particles.set(q > 0.02 ? kind : "none", q, wind);
  };
  ctx.look("dustClose", 4);
  L.note("Sand is landing on the panel.");
  await ctx.during(5.5, u => {
    storm(0.25 + 0.7 * u);
    snd.wind(0.25 + 0.75 * u);
    ctx.soil.dust = 0.82 * u * (2 - u);
  });
  L.note("The light dropped. Time to clean.");
  await ctx.during(1.4, u => { storm(0.95 - 0.7 * u); snd.wind(1 - 0.7 * u); });
  storm(0); snd.wind(0.12);

  // rock back and forth: steep angles make the sand slide, moving shakes it loose faster
  L.note("Rocking the panel to shake the sand off.");
  ctx.look("dustRock", 3);
  for (const end of [25, 155, 30, 150]) {
    const from = ctx.pose.tilt;
    snd.whoosh();
    await ctx.during(0.85, (u, dt) => {
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      ctx.pose.tilt = from + (end - from) * e;
      ctx.soil.dust = Math.max(0.16, ctx.soil.dust - dt * 0.15);
    });
    await ctx.during(0.35, (u, dt) => { ctx.soil.dust = Math.max(0.16, ctx.soil.dust - dt * 0.06); });
  }
  await ctx.tween(ctx.pose, "tilt", home.tilt, 0.9);
  L.note("Better. A little sand is still stuck.");

  // later that day: rain washes the rest, then the sky clears
  lastW = -1;
  ctx.look("dustWide", 3);
  const d0 = ctx.soil.dust;
  await ctx.during(1.2, u => { storm(0.7 * u, "rain"); snd.rain(0.7 * u); snd.wind(0.12 + 0.15 * u); });
  L.note("Rain washes the panel clean.");
  await ctx.during(3.2, u => { ctx.soil.dust = d0 * (1 - u); ctx.soil.water = 0.6 * Math.min(1, u * 2); });
  await ctx.during(1.5, u => { storm(0.7 * (1 - u), "rain"); snd.rain(0.7 * (1 - u)); snd.wind(0.27 * (1 - u)); });
  storm(0);
  L.note("Clean again. Full light.");
  await ctx.tween(ctx.soil, "water", 0, 1.8, "out");
}
