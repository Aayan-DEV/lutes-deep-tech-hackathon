// "Two motors": why the tracker needs both, in 2 sentences.
//   Sentence 1: one day. The sun runs from east to west and leaves a trail; the big motor turns.
//   Sentence 2: the year. The three noon paths come ONE BY ONE, each with its name: summer (the
//   panel tilts to face the high sun), spring and autumn, then winter (it tilts low for the low sun).
//   Only the newest path is bright; at the end all three show together. The three paths take about
//   5 s, inside the sentence's voice, so auto play's quick cut never hides the winter one.
// A fixed panel stands next to it with a tag, for comparison.
import { sunAt, poseFor, dateFor } from "./sunpath.js";
import { tag, arcTube, arcLine, sunBall, skyPoint } from "./props.js";
import { fixedPanel } from "./props_extra.js";
import { MOTORS } from "./texts.js";

const EQUINOX = 80, SUMMER = 172, WINTER = 355, R = 36, PANEL_Y = 12.6;
const ARCS = [
  { doy: SUMMER, col: 0xea580c, name: "Summer: tilts high", css: "#c2410c" },
  { doy: EQUINOX, col: 0xf5b84a, name: "Spring and autumn", css: "#b45309" },
  { doy: WINTER, col: 0x8a8a8a, name: "Winter: tilts low", css: "#404040" },
];

export const motorsText = MOTORS;

export async function runMotors(ctx) {
  const { lat, lon } = ctx.region, T = window.THREE;
  const g = ctx.put(new T.Group(), 0, PANEL_Y, 0);
  const ball = sunBall(R); g.add(ball);
  const label = tag("", { size: 3.8, dot: "#f59e0b" }); g.add(label);
  const move = (el, az, text) => {
    ball.userData.setSun(el, az); ctx.sun(el, az);
    const p = skyPoint(el, az, R + 7);
    label.position.set(p.x, p.y - 6, p.z); label.visible = el > -1 && !!text; label.userData.set(text || " ");
  };
  const fixed = ctx.put(fixedPanel(lat), -38, 0, 8);
  ctx.put(tag("Fixed panel: never moves", { size: 3.2, dot: "#9a9a9a" }), -38, 2.2, 16);

  // sentence 1: one day, the big motor follows the sun from east to west, a trail grows behind it
  const noon = sunAt(lat, EQUINOX, 12), tilt = poseFor(noon.el, noon.az, lat).tilt;
  const H0 = 6.4, H1 = 17.6, s0 = sunAt(lat, EQUINOX, H0);
  const trail = arcLine(lat, { r: R, color: 0xf59e0b, opacity: 0.8 }); g.add(trail);
  const pts = [];
  for (let h = H0; h <= H1 + 1e-6; h += 0.2) { const s = sunAt(lat, EQUINOX, h); if (s.el > -2) pts.push(skyPoint(s.el, s.az, R)); }
  const trailGeo = trail.geometry;
  const drawTrail = k => { trailGeo.setFromPoints(pts.slice(0, Math.max(2, k)).map(p => new T.Vector3(p.x, p.y, p.z))); };
  drawTrail(2);
  move(s0.el, s0.az, "Big motor: east to west");
  fixed.userData.glow(0.4);
  await Promise.all([ctx.tween(ctx.pose, "pan", poseFor(s0.el, s0.az, lat).pan, 0.8), ctx.tween(ctx.pose, "tilt", tilt, 0.8)]);
  ctx.look("skyArc2", 6);
  const sweep = poseFor(sunAt(lat, EQUINOX, H1).el, sunAt(lat, EQUINOX, H1).az, lat).pan - poseFor(s0.el, s0.az, lat).pan;
  await ctx.during(ctx.stretch(4.2, sweep), u => {
    const h = H0 + u * (H1 - H0), s = sunAt(lat, EQUINOX, h);
    move(s.el, s.az, "Big motor: east to west");
    ctx.pose.pan = poseFor(s.el, s.az, lat).pan;
    ctx.setDate(dateFor(2023, EQUINOX, h, lon));
    drawTrail(Math.round(u * pts.length));
  });

  // sentence 2: the seasons, one path at a time
  await ctx.atSentence(1);
  ctx.look("skyArc", 2);
  await ctx.during(0.4, u => { trail.material.opacity = 0.8 * (1 - u); });
  trail.visible = false;
  const shown = [];
  for (const [i, a] of ARCS.entries()) {
    const tube = arcTube(lat, a.doy, { r: R, thick: 0.38, color: a.col, opacity: 0.95 });
    const at = sunAt(lat, a.doy, 9.2), q = skyPoint(at.el, at.az, R + 4);
    const name = tag(a.name, { size: 3.4, color: a.css }); name.position.set(q.x + 8, q.y + 2 - i * 1.5, q.z);
    g.add(tube, name);
    for (const o of shown) { o.tube.material.opacity = 0.35; o.name.userData.fade(0.45); }
    shown.push({ tube, name });
    name.userData.fade(0);
    const s = sunAt(lat, a.doy, 12), p = poseFor(s.el, s.az, lat), from = { ...ctx.pose };
    ctx.sound.whoosh();
    const prev = shown.length > 1 ? sunAt(lat, ARCS[i - 1].doy, 12) : s;
    await ctx.during(ctx.stretch(1.1, p.pan - from.pan), u => {
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      tube.material.opacity = 0.95 * Math.min(1, u * 2);
      name.userData.fade(Math.min(1, u * 2));
      move(prev.el + (s.el - prev.el) * e, prev.az + (s.az - prev.az) * e, i === 0 ? "Small motor: summer" : i === 1 ? "Small motor: spring" : "Small motor: winter");
      ctx.pose.pan = from.pan + (p.pan - from.pan) * e; ctx.pose.tilt = from.tilt + (p.tilt - from.tilt) * e;
      ctx.setDate(dateFor(2023, a.doy, 12, lon));
    });
    await ctx.wait(0.5);
  }
  for (const o of shown) { o.tube.material.opacity = 0.95; o.name.userData.fade(1); }   // all three, at the end
}
