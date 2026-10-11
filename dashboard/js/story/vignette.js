// The 3D half of a country chapter: a plain fixed panel next to the tracker, and one kind of weather
// that plays on both. Phases follow the 2 sentences:
//   sentence 1 (the event)        the weather comes, both panels get covered, the light drops;
//                                 then it passes and the fixed panel stays covered
//   sentence 2 (this tracker)     the tracker sheds it (rocks for dust, tilts steep for snow)
// A small card shows the light each one catches now: "Fixed panel" and "This tracker".
// runVignette(ctx, kind, then) with kind 'dust' | 'snow' | 'heat' | 'storm'. With then = 'snow' the
// second sentence first shakes the dust off, then a short snow fall covers both panels and the tracker
// tilts steep to drop it. Each phase is short, so it all fits inside the two sentences.
import { sunAt, poseFor, dateFor, catchFactor } from "./sunpath.js";
import { tag } from "./props.js";
import { fixedPanel } from "./props_extra.js";

const FULL = 96;   // the light a clean panel facing the sun catches, in %
const KINDS = {
  dust:  { doy: 135, hour: 11,   weather: "dust",  soil: "dust",  peak: [0.82, 0.7], shed: "rock",
           notes: ["Sand is landing on both panels.", "The fixed panel cannot move. The sand stays.", "The tracker tilts and the sand slides off."] },
  snow:  { doy: 20,  hour: 11.5, weather: "snow",  soil: "snow",  peak: [0.9, 0.8],  shed: "steep",
           notes: ["Snow is covering both panels.", "The fixed panel cannot move. The snow stays.", "The tracker tilts steep and the snow slides off."] },
  heat:  { doy: 172, hour: 12.5, weather: "clear", soil: null,    peak: [0, 0],      shed: "follow",
           notes: ["A hot day, with the sun high up.", "The fixed panel stays at one angle.", "The tracker keeps facing the sun."] },
  storm: { doy: 200, hour: 15,   weather: "storm", soil: "water", peak: [0.6, 0.6],  shed: "stow",
           notes: ["A storm with rain and strong wind.", "The fixed panel takes the wind as it is.", "The tracker lies flat until it passes, then faces the sun again."] },
};

// a few wavy see-through sheets over the sand, for heat shimmer
function shimmer() {
  const T = window.THREE, g = new T.Group(), sheets = [];
  for (let i = 0; i < 3; i++) {
    const geo = new T.PlaneGeometry(150, 10, 30, 2);
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide, fog: false }));
    m.position.set(-15, 5 + i * 2, -30 - i * 25);
    g.add(m); sheets.push({ m, base: geo.attributes.position.array.slice(), ph: i * 1.7 });
  }
  g.userData.frame = (t, k) => {
    for (const s of sheets) {
      const a = s.m.geometry.attributes.position;
      for (let j = 0; j < a.count; j++) a.array[j * 3 + 1] = s.base[j * 3 + 1] + Math.sin(s.base[j * 3] * 0.12 + t * 3 + s.ph) * 0.8;
      a.needsUpdate = true;
      s.m.material.opacity = 0.09 * k;
    }
  };
  return g;
}

export async function runVignette(ctx, kind, then = null) {
  const T = window.THREE, v = KINDS[kind] || KINDS.dust, { lat, lon } = ctx.region, L = ctx.lights, snd = ctx.sound;
  const s = sunAt(lat, v.doy, v.hour), home = poseFor(s.el, s.az, lat);
  ctx.sun(s.el, s.az);
  ctx.setDate(dateFor(2024, v.doy, v.hour, lon));

  const fixed = ctx.put(fixedPanel(lat), -30, 0, 8);
  const labels = [                                    // at the foot of each stand, below the big card
    ctx.put(tag("Fixed panel", { size: 3.4, dot: "#9a9a9a" }), -30, 2.2, 15),
    ctx.put(tag("This tracker", { size: 3.4, dot: "#f59e0b" }), 3, 2.2, 13),
  ];
  const fixedCatch = catchFactor(fixed.userData.normal, s.el, s.az);
  fixed.userData.glow(fixedCatch);
  const heat = kind === "heat" ? ctx.put(shimmer(), 0, 0, 0) : null;

  // what the two panels catch now: f = cover on the fixed one, sky = how much the weather dims both
  const st = { f: 0, fk: v.soil, sky: 1, heat: 0, t: 0, hideT: 0 };
  const trackerSoil = () => Math.max(ctx.soil.dust || 0, ctx.soil.snow || 0, 0.4 * (ctx.soil.water || 0));
  L.setup({ title: "Light caught right now", names: ["Fixed panel", "This tracker"] });
  L.show(true); L.note(v.notes[0]);
  const feed = ctx.during(600, (u, dt) => {
    st.t += dt;
    const fx = FULL * fixedCatch * st.sky * (1 - 0.92 * st.f), tr = FULL * st.sky * (1 - 0.92 * trackerSoil());
    L.set([fx, tr]);
    if (st.fk) fixed.userData.soil(st.fk, st.f);
    if (heat) heat.userData.frame(st.t, st.heat);
    if ((st.hideT -= dt) <= 0) { st.hideT = 0.1; hideUnderCard(labels, ctx.camera); }
  });
  feed.catch(() => {});

  const wind = new T.Vector3(10, 0, 3);
  let lastW = -1;
  const weather = (q, w = v.weather) => {   // in steps of 0.05, so the sky is not redone every frame
    q = Math.round(q * 20) / 20;
    if (q === lastW || w === "clear") return;
    lastW = q;
    ctx.weather(q > 0.02 ? w : "clear", q);
    const pk = w === "storm" ? "rain" : w;
    ctx.scene.particles.set(q > 0.02 ? pk : "none", q, wind);
    st.sky = 1 - 0.55 * q;
  };
  await Promise.all([ctx.tween(ctx.pose, "pan", home.pan, 1.2), ctx.tween(ctx.pose, "tilt", home.tilt, 1.2)]);
  await ctx.wait(0.5);

  // 1. the weather comes (about 5 s)
  ctx.look("placeClose", 6);
  await ctx.during(5, u => {
    weather(0.3 + 0.65 * u);
    if (kind === "dust" || kind === "storm") snd.wind(0.25 + 0.7 * u);
    if (kind === "storm") { snd.rain(0.8 * u); ctx.pose.tilt = home.tilt + (90 - home.tilt) * Math.min(1, u * 1.5); }
    if (kind === "heat") st.heat = u;
    const e = u * (2 - u);
    st.f = v.peak[0] * e;
    if (v.soil) ctx.soil[v.soil] = v.peak[1] * e;
  });

  // 1b. it passes; the fixed panel keeps its cover (about 1.6 s)
  L.note(v.notes[1]);
  await ctx.during(1.6, u => {
    weather(0.95 * (1 - u));
    snd.wind(0.95 * (1 - u) * (kind === "dust" || kind === "storm" ? 1 : 0)); snd.rain(kind === "storm" ? 0.8 * (1 - u) : 0);
  });
  weather(0); snd.wind(0.1); snd.rain(0);

  // 2. this tracker sheds it (about 5 s)
  await ctx.atSentence(1);
  L.note(v.notes[2]);
  ctx.look("placeShed", 3);
  if (then === "snow" && kind !== "snow") {
    await shed(ctx, home, "rock", [25, 155]);              // the dust first, quickly
    L.note("Then winter: snow covers both panels.");
    lastW = -1; st.f = 0; st.fk = "snow";
    await ctx.during(1.8, u => { weather(0.3 + 0.6 * Math.sin(Math.PI * u), "snow"); st.f = 0.9 * u; ctx.soil.snow = 0.8 * u; });
    lastW = -1; weather(0, "snow");
    L.note("The tracker tilts steep and the snow slides off.");
    await shed(ctx, home, "steep");
  } else {
    await shed(ctx, home, v.shed);
  }
  snd.whoosh();
  await Promise.all([ctx.tween(ctx.pose, "tilt", home.tilt, 1.1), ctx.tween(ctx.pose, "pan", home.pan, 1.1)]);
}

// the tracker gets rid of what covers it: rock (dust), steep (snow), stow (rain), or just follow
async function shed(ctx, home, how, ends = [25, 155, 30, 150]) {
  const snd = ctx.sound;
  if (how === "rock") {
    for (const end of ends) {
      const from = ctx.pose.tilt;
      snd.whoosh();
      await ctx.during(0.8, (u, dt) => {
        ctx.pose.tilt = from + (end - from) * (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
        ctx.soil.dust = Math.max(0.06, ctx.soil.dust - dt * (ends.length < 4 ? 0.4 : 0.2));
      });
      await ctx.during(0.25, (u, dt) => { ctx.soil.dust = Math.max(0.06, ctx.soil.dust - dt * 0.1); });
    }
  } else if (how === "steep") {
    const end = home.tilt >= 90 ? 165 : 15;
    snd.whoosh();
    await ctx.tween(ctx.pose, "tilt", end, 0.9);
    const s0 = ctx.soil.snow;
    await ctx.during(1.6, u => { ctx.soil.snow = s0 * (1 - u) * (1 - u) + 0.04 * u; ctx.pose.tilt = end + Math.sin(u * 28) * 1.5 * (1 - u); });
  } else if (how === "stow") {
    const w0 = ctx.soil.water;
    await ctx.during(1.5, u => { ctx.soil.water = w0 * (1 - u); });
  } else {
    await ctx.wait(1.5);
  }
}

// Hide a label whose box on screen touches the big fact card (.story-place), show it otherwise.
const _v = [];
function hideUnderCard(labels, camera) {
  const card = document.querySelector(".story-place.in");
  if (!camera) return;
  const r = card ? card.getBoundingClientRect() : null, W = window.innerWidth, H = window.innerHeight, T = window.THREE;
  if (!_v.length) for (let i = 0; i < 3; i++) _v.push(new T.Vector3());
  const [c, right, up] = _v;
  right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
  for (const s of labels) {
    if (!r) { s.visible = true; continue; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      c.copy(s.position).addScaledVector(right, a * s.scale.x / 2).addScaledVector(up, b * s.scale.y / 2).project(camera);
      const px = (c.x + 1) / 2 * W, py = (1 - c.y) / 2 * H;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    s.visible = !(x1 > r.left && x0 < r.right && y1 > r.top && y0 < r.bottom);
  }
}
