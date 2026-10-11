// Chapters 3 and 4: the sun's path over one day (the big motor follows it, the shadow swings round)
// and over a year (the noon sun climbs and sinks, the small motor tips the panel, a fixed panel
// next to it loses out). Positions are for the tracker at scale 1; ctx.put scales them by S.
import { sunAt, poseFor, dateFor, catchFactor } from "./sunpath.js";
import { tag, arcTube, arcLine, sunBall, skyPoint } from "./props.js";
import { fixedPanel } from "./props_extra.js";

const EQUINOX = 80, R = 38, RS = 36, PANEL_Y = 12.6;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const easeTo = (ctx, p, s) => Promise.all([ctx.tween(ctx.pose, "pan", p.pan, s), ctx.tween(ctx.pose, "tilt", p.tilt, s)]);
const fmtHour = h => { const hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 15) * 15; return `${hh}:${String(mm).padStart(2, "0")}`; };

// the share of a whole day's light a fixed panel catches, compared with a panel that always faces the sun
function dayShare(normal, lat, doy) {
  let got = 0, all = 0;
  for (let h = 4; h <= 20; h += 0.25) {
    const s = sunAt(lat, doy, h);
    if (s.el <= 0) continue;
    const w = Math.pow(Math.sin(s.el * Math.PI / 180), 0.4);   // a low sun is weaker
    got += w * catchFactor(normal, s.el, s.az); all += w;
  }
  return all > 0 ? got / all : 0;
}

// a sky group centred on the panel, with the sun ball and a tag that follows it
function sky(ctx, size = 4, r = R) {
  const g = ctx.put(new window.THREE.Group(), 0, PANEL_Y, 0);
  const ball = sunBall(r); g.add(ball);
  const label = tag("", { size, dot: "#f59e0b" }); g.add(label);
  return { g, ball, label, move(el, az, text) {
    ball.userData.setSun(el, az);
    const p = skyPoint(el, az, r + 7);
    label.position.set(p.x, p.y - 6, p.z); label.visible = el > -1;   // under the sun, so it never leaves the top
    label.userData.set(text);
  } };
}
function endTags(g, tube, names) {
  const [a, b] = tube.userData.ends || [];
  if (!a) return;
  for (const [p, n] of [[a, names[0]], [b, names[1]]]) { const t = tag(n, { size: 3.6, color: "#404040" }); t.position.set(p.x * 1.08, p.y + 4, p.z * 1.08); g.add(t); }
}

export async function runDay(ctx) {
  const { lat, lon } = ctx.region;
  const noon = sunAt(lat, EQUINOX, 12), tilt = poseFor(noon.el, noon.az, lat).tilt;
  const s0 = sunAt(lat, EQUINOX, 6.4);
  ctx.sun(s0.el, s0.az);
  const k = sky(ctx);
  const path = arcTube(lat, EQUINOX, { r: R, thick: 0.45, color: 0xf59e0b, opacity: 0.85 });
  k.g.add(path);
  endTags(k.g, path, ["East: sunrise", "West: sunset"]);
  k.move(s0.el, s0.az, fmtHour(6.4));
  await easeTo(ctx, { pan: poseFor(s0.el, s0.az, lat).pan, tilt }, 1.2);
  ctx.look("dayWide2", 16);
  await ctx.during(16, u => {
    const h = 6.4 + u * 11.2, s = sunAt(lat, EQUINOX, h);   // about 6:25 to 17:35
    ctx.sun(s.el, s.az);
    k.move(s.el, s.az, fmtHour(h));
    ctx.pose.pan = poseFor(s.el, s.az, lat).pan;
    ctx.pose.tilt = tilt;                                   // the small motor just holds still today
    ctx.setDate(dateFor(2023, EQUINOX, h, lon));
  });
}

export async function runSeasons(ctx) {
  const { lat, lon } = ctx.region;
  const k = sky(ctx, 3.4, RS);
  const arcs = [[172, 0xea580c, "Summer", "#ea580c", 0.95], [EQUINOX, 0xf5b84a, "Spring and autumn", "#b45309", 0.7], [355, 0x8a8a8a, "Winter", "#404040", 0.95]];
  arcs.forEach(([doy, col, name, css, op], i) => {
    const tube = arcTube(lat, doy, { r: RS, thick: 0.35, color: col, opacity: op });
    k.g.add(tube);
    const at = sunAt(lat, doy, 9.2), p = skyPoint(at.el, at.az, RS + 4);   // name the path on its morning side
    const t = tag(name, { size: 3.4, color: css }); t.position.set(p.x + 7 + i * 2, p.y + 2 - i * 2, p.z); k.g.add(t);
    if (i === 1) endTags(k.g, tube, ["East", "West"]);
  });
  const today = arcLine(lat, { r: RS, color: 0xf59e0b, opacity: 0.9 }); k.g.add(today);

  // a fixed panel next to the tracker, and how much light each one catches
  const fixed = ctx.put(fixedPanel(lat), -36, 0, 6);
  const fixedTag = ctx.put(tag("Fixed panel", { size: 4.2, dot: "#9a9a9a" }), -36, 22, 6);
  const trackTag = ctx.put(tag("Tracker 100 %", { size: 4.2, dot: "#f59e0b" }), 3, 28, 0);
  const s0 = sunAt(lat, 1, 12);
  ctx.sun(s0.el, s0.az);
  k.move(s0.el, s0.az, "January"); today.userData.setDay(1);
  await easeTo(ctx, poseFor(s0.el, s0.az, lat), 1.0);
  ctx.look("skyArc2", 18);
  let shown = -1;
  await ctx.during(18, u => {
    const doy = 1 + Math.floor(u * 364), s = sunAt(lat, doy, 12);
    ctx.sun(s.el, s.az);
    const p = poseFor(s.el, s.az, lat);
    ctx.pose.pan = p.pan; ctx.pose.tilt = p.tilt;
    if (doy === shown) return;
    shown = doy;
    const month = MONTHS[Math.min(11, new Date(Date.UTC(2023, 0, doy)).getUTCMonth())];
    k.move(s.el, s.az, `Noon in ${month}`);
    today.userData.setDay(doy);
    ctx.setDate(dateFor(2023, doy, 12, lon));
    const f = dayShare(fixed.userData.normal, lat, doy);
    fixed.userData.glow(f);
    fixedTag.userData.set(`Fixed panel ${Math.round(f * 100)} %`);
    trackTag.userData.set("Tracker 100 %");
  });
}
