// The story's stage: wraps the scene parts the chapters use, keeps the tracker's story state
// (motor angles, dust and water on the panel, light level), plays the sounds that follow the scene
// (engine, footsteps, part pops) and builds the per-chapter `ctx`.
// Everything is laid out for the tracker at scale 1 and multiplied by S = tracker.group.scale.x
// (read at the start of each chapter), so people, the truck and the camera stay in proportion.
// With the real tracker following (link, hwlink.js): a chapter keeps the pose the last one ended
// on (the build chapters, build 0, go to the front and flat instead), and ctx.tween on ctx.pose
// lasts as long as the real motors need (pan: |delta| / speed + 0.4 s, tilt: 0.5 s at least).
// ctx.stretch(s, panSpan) does the same for a move a chapter drives itself in ctx.during.
import { createPeople } from "../scene/people.js";
import { BUILD_ORDER } from "../scene/tracker.js";
import { createTruck } from "../scene/truck.js";
import { guard } from "./timeline.js";
import { CAMERAS } from "./cameras.js";
import { regionInfo } from "./sunpath.js";
import { sound } from "./sound.js";
import { createLightsCard } from "./lights_card.js";
import { createPlaceCard } from "./place_card.js";

const QUAD = [1, 0.86, 1.08, 0.94];   // dust and water are never perfectly even (TL, TR, BL, BR)
const PARTS = BUILD_ORDER.length;    // a pop for each part in tracker.js BUILD_ORDER
const clamp01 = x => Math.max(0, Math.min(1, x));

export const CLEAR = { temp: 28, rain: 0, snow: 0, hail: false, cloud: 0.05, ghi: 700, dni: 850, dhi: 90, wind: 2, gust: 3, windDir: 300, rh: 25, dust: 0, code: 0, kind: "clear" };
export function weatherSample(kind, strength = 0.8) {
  const s = Object.assign({}, CLEAR, { kind });
  if (kind === "dust") Object.assign(s, { dust: strength, wind: 14 * strength, gust: 22 * strength, cloud: 0.3 * strength, ghi: 300, dni: 200, dhi: 180, rh: 12, code: 7 });
  if (kind === "rain") Object.assign(s, { rain: 6 * strength, cloud: 0.5 + 0.4 * strength, ghi: 150, dni: 10, dhi: 140, rh: 85, wind: 5, code: 63 });
  if (kind === "cloudy") Object.assign(s, { cloud: strength, ghi: 400, dni: 300, dhi: 160, rh: 50, code: 3 });
  if (kind === "snow") Object.assign(s, { snow: 2.4 * strength, temp: -9, cloud: 0.6 + 0.4 * strength, ghi: 120, dni: 20, dhi: 110, rh: 80, wind: 6 * strength, code: 73 });
  if (kind === "storm") Object.assign(s, { kind: "rain", rain: 8 * strength, cloud: 1, ghi: 60, dni: 0, dhi: 60, rh: 90, wind: 16 * strength, gust: 24 * strength, code: 95 });
  return s;
}

export function createStage({ scene, clock, hud, sim, timeline, regionId, events, link = null }) {
  const T = window.THREE, three = scene.scene || scene.three;
  let ownPeople = null, ownTruck = null;
  // the scene swaps its stand-ins for the real people and truck when they load, so look them up late
  const people = () => (scene.people && !scene.people.stub ? scene.people : (ownPeople || (ownPeople = createPeople(three))));
  const truck = () => (scene.truck && !scene.truck.stub ? scene.truck : (ownTruck || (ownTruck = createTruck(three))));
  const tracker = scene.tracker || {};
  const particles = () => scene.particles || { set() {}, frame() {} };
  let homeId = regionId || sim?.regionId || scene.regionId || "cholistan";
  let region = regionInfo(homeId);
  const st = { pose: { pan: 0, tilt: 90 }, soil: { dust: 0, water: 0, snow: 0 }, light: { level: 80 }, build: 1, sun: { el: 30, az: 150 }, lights: [80, 80, 80, 80] };
  const last = { pan: null, tilt: null, soil: "", lights: "", build: null, parts: -1 };
  const card = createLightsCard(), place = createPlaceCard();
  let cardAuto = true;
  let props = [], userCam = false, camMove = null, S = 1, cardT = 0;

  const scaleNow = () => (tracker.group && tracker.group.scale.x > 0 ? tracker.group.scale.x : 1);
  const baseY = () => (tracker.group ? tracker.group.position.y : 0);
  const groundAt = (x, z) => { try { return scene.terrain?.heightAt ? scene.terrain.heightAt(x, z) : 0; } catch (e) { return 0; } };

  function setBuild(p) {
    st.build = clamp01(p);
    if (last.build === st.build) return;
    const parts = Math.floor(st.build * PARTS + 1e-6);
    if (last.parts >= 0 && parts > last.parts && st.build < 1.0001 && st.build > 0) sound.pop();
    last.parts = parts; last.build = st.build;
    if (tracker.setBuildProgress) tracker.setBuildProgress(st.build);
    else if (tracker.group) tracker.group.visible = st.build > 0.001;   // no build-up: just show it at the end
  }

  function applyTracker() {
    const { pose, soil, light } = st;
    if (pose.pan !== last.pan) { last.pan = pose.pan; tracker.setPan?.(pose.pan); }
    if (pose.tilt !== last.tilt) { last.tilt = pose.tilt; tracker.setTilt?.(pose.tilt); }
    const q = v => QUAD.map(m => clamp01(v * m));
    const sk = `${soil.dust.toFixed(3)}|${soil.water.toFixed(3)}|${soil.snow.toFixed(3)}`;
    if (sk !== last.soil) { last.soil = sk; tracker.setSoiling?.({ dust: q(soil.dust), snow: q(soil.snow), water: q(soil.water) }); }
    st.lights = QUAD.map((m, i) => Math.round(Math.max(0, light.level) * (1 - 0.92 * clamp01(soil.dust * m)) * (1 - 0.25 * clamp01(soil.water * QUAD[3 - i]))));
    const lk = st.lights.join();
    if (lk !== last.lights) { last.lights = lk; tracker.setLights?.(st.lights); }
  }

  // Camera: presets are {pos, target} for scale 1. If the user drags, story moves wait for the next chapter.
  function onUserCam() { userCam = true; if (camMove) camMove.stop = true; }
  function look(spec, seconds = 2.5) {
    if (userCam) return;
    const p = typeof spec === "string" ? CAMERAS[spec] : spec;
    if (!p) return;
    const y0 = baseY();
    const pos = new T.Vector3(p.pos[0] * S, p.pos[1] * S + y0, p.pos[2] * S), target = new T.Vector3(p.target[0] * S, p.target[1] * S + y0, p.target[2] * S);
    target.y -= 0.09 * pos.distanceTo(target);   // aim a little low: the subject sits above the sentences
    if (scene.lookAt) { scene.lookAt({ pos, target }, seconds); return; }
    const cam = scene.camera, ctl = scene.controls;      // fallback: ease the camera ourselves
    if (!cam) return;
    if (camMove) camMove.stop = true;
    const from = cam.position.clone(), fromT = ctl ? ctl.target.clone() : target.clone(), mv = { stop: false };
    camMove = mv;
    const apply = u => {
      if (mv.stop) return;
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      cam.position.lerpVectors(from, pos, e);
      if (ctl) ctl.target.lerpVectors(fromT, target, e); else cam.lookAt(target);
    };
    if (seconds <= 0) apply(1); else timeline.during(seconds, apply).catch(() => {});
  }

  function sun(el, az) {
    st.sun = { el, az };
    scene.setSun?.(el, az);
    st.light.level = el > 0 ? Math.min(95, 15 + 85 * Math.sin(el * Math.PI / 180) * 1.3) : Math.max(0, 6 + el);
  }

  // switch the 3D to another place (the country chapters); the app's own place stays as it was
  function setRegion(id) {
    if (!id || id === region.id) return region;
    region = regionInfo(id);
    try { scene.setRegion?.(id); } catch (e) { console.warn("[story] setRegion", e); }
    try { hud?.setRegion?.(id); } catch (e) { /* the top bar may not know it */ }
    scene.setWeather?.(CLEAR);
    sun(st.sun.el, st.sun.az);
    return region;
  }

  function reset(ch) {
    // the app switched the place itself (the top bar): that is the new home
    if (scene.regionId && scene.regionId !== region.id) { homeId = scene.regionId; region = regionInfo(homeId); }
    people().remove();
    truck().remove();
    particles().set("none", 0, new T.Vector3());
    scene.setWeather?.(CLEAR);
    for (const o of props) o.parent?.remove(o);
    props = [];
    sound.stopAll();
    card.show(false); card.setup(); cardAuto = true;
    place.hide();
    setRegion(ch ? (ch.region || homeId) : homeId);
    S = scaleNow();
    people().setScale?.(S); truck().setScale?.(S);
    const keep = !!(ch && link && link.following && (ch.build ?? 1) > 0);   // the real motors carry on from here
    if (!keep) { st.pose.pan = 0; st.pose.tilt = 90; }
    st.soil.dust = st.soil.water = st.soil.snow = 0;
    last.parts = -1;
    setBuild(ch ? (ch.build ?? 1) : 1);
    userCam = false;
    applyTracker();
  }

  function makeCtx(token, say, sentenceNow = () => 0) {
    const live = () => !token.cancelled;
    const sceneApi = { people: people(), truck: truck(), tracker, particles: particles(), sky: scene.sky, three, setSun: sun, setWeather: s => scene.setWeather?.(s), lookAt: look };
    // place a story prop at scale-1 coordinates (x, z on the ground, y above it), scaled by S
    const put = (obj, x = 0, y = 0, z = 0) => {
      if (!live()) return obj;
      obj.scale.multiplyScalar(S);
      obj.position.set(x * S, groundAt(x * S, z * S) + y * S, z * S);
      three.add(obj); props.push(obj);
      return obj;
    };
    const ctx = {
      scene: guard(sceneApi, token, ["people", "truck", "tracker", "particles", "sky"]),
      clock, hud, sim, region, events, sound, S, camera: scene.camera,
      pose: st.pose, soil: st.soil, light: st.light,
      cancelled: () => token.cancelled,
      at: (x, z) => ({ x: x * S, z: z * S }),
      groundAt, put,
      panelY: () => baseY() + 12.6 * S,
      wait: s => timeline.wait(s),
      tween: (obj, prop, to, s, ease) => {
        if (obj === st.pose && link && link.following) s = Math.max(s, prop === "pan" ? link.panTime(to, st.pose.pan) : link.tiltTime());
        return timeline.tween(obj, prop, to, s, ease);
      },
      get following() { return !!(link && link.following); },
      stretch: (s, panSpan = 0) => (link ? link.stretch(s, panSpan) : s),
      during: (s, fn) => timeline.during(s, fn),
      look: (spec, s) => { if (live()) look(spec, s); },
      sun: (el, az) => { if (live()) sun(el, az); },
      build: p => { if (live()) setBuild(p); },
      weather: (kind, strength) => { if (live()) scene.setWeather?.(kind === "clear" ? CLEAR : weatherSample(kind, strength)); },
      setDate: d => { if (!live() || !clock) return; if (clock.setDate) clock.setDate(d); else clock.date = d; },
      add: obj => { if (!live()) return obj; three.add(obj); props.push(obj); return obj; },
      say: text => { if (live()) say(text); },
      // the small light card: 4 sensors by default, or setup({ title, names }) and set(values) by hand
      lights: {
        show: on => live() && card.show(on), note: t => live() && card.note(t), get values() { return st.lights.slice(); },
        setup: o => { if (live()) { card.setup(o); cardAuto = !o; } },
        set: vals => { if (live()) card.update(vals); },
      },
      place: { show: (fact, hooks) => live() && place.show(fact, hooks), hide: () => place.hide() },
      setRegion: id => { if (live()) ctx.region = setRegion(id); return ctx.region; },
      // resolves once the narrator has reached sentence k (0 = the first one)
      // (token.at: the action has done everything before sentence k; story.js hurries it when behind)
      atSentence: async k => { token.at = Math.max(token.at || 0, k); while (sentenceNow() < k) await timeline.wait(0.05); },
      get sentence() { return sentenceNow(); },
    };
    return ctx;
  }

  function onStep() { sound.step(); }

  return {
    reset, makeCtx,
    frame(dt) {
      const ppl = people(), trk = truck();
      if (ppl === ownPeople) ppl.frame(dt);
      if (trk === ownTruck) trk.frame(dt);
      if (ppl.onStep !== onStep && "onStep" in ppl) ppl.onStep = onStep;
      applyTracker();
      sound.engine(trk.engineLevel || 0);
      trk.setLights?.(clamp01((10 - st.sun.el) / 10));
      cardT += dt;
      if (cardT > 0.1) { cardT = 0; if (cardAuto) card.update(st.lights); }
    },
    attach() {
      const g = scene.terrain?.heightAt;
      if (g) { const f = (x, z) => scene.terrain.heightAt(x, z); people().setGround?.(f); truck().setGround?.(f); }
      scene.controls?.addEventListener?.("start", onUserCam);
      scene.labels?.setVisible?.(false);         // the part names would cover the story
    },
    detach() {
      scene.controls?.removeEventListener?.("start", onUserCam);
      if (camMove) camMove.stop = true;
      sound.stopAll(); card.remove(); place.remove();
      scene.labels?.setVisible?.(true);
    },
  };
}
