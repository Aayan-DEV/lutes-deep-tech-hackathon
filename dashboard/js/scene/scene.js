// The one 3D scene of game.html: renderer, camera, orbit controls, and the parts other modules
// supply (terrain, sky, props, particles, people, truck) around the tracker.
// createScene(canvas) returns at once with stand-ins (js/app/stubs.js) so the page always runs;
// the real modules load in the background (scene.ready) and replace them. A part that fails to
// load or to build keeps its stand-in and the error goes to the console.
// It renders only when the app calls frame(dt).
// The tracker is drawn TRACKER_SCALE times its real size so it reads well in the desert. Its
// clicking, labels and outline use world matrices, so they follow; the particles' panel size is
// scaled here (surface below). setInset(px) keeps the tracker centred in the space left of the cards.
import { createTracker } from "./tracker.js";
import { stubTerrain, stubSky, stubProps, stubParticles, stubPeople, stubTruck } from "../app/stubs.js";
import { PRESETS, createCameraMover } from "../app/camera.js";
import { createLabels } from "../app/labels.js";
import { createLightNums } from "../app/lightnums.js";
import { createPointer } from "../app/pointer.js";
import { createOrbit } from "../app/orbit.js";
import { REGION_LOOK } from "./regions.js";

// Colour output. The terrain, sky and people were tuned with three.js's plain (linear) output, so
// that is the default; ?srgb=1 switches to sRGB output with ACES tone mapping (the tracker then
// converts its own colours, the other parts do not).
const SRGB = new URLSearchParams(location.search).get("srgb") === "1";
export const TRACKER_SCALE = 1.6;
const rad = d => d * Math.PI / 180;
const tryImport = async path => { try { return await import(path); } catch (e) { console.warn(`[scene] ${path} not loaded:`, e.message); return null; } };
const attempt = (what, fn) => { try { return fn(); } catch (e) { console.error(`[scene] ${what} failed:`, e); return null; } };

export function createScene(canvas) {
  const THREE = window.THREE;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (SRGB) { renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 1, 20000);
  camera.position.set(...PRESETS.close.pos);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.target.set(...PRESETS.close.target);

  const api = {
    renderer, scene, three: scene, camera, controls, regionId: null, sun: { el: 40, az: 150 }, weather: null,
    terrain: stubTerrain(scene), sky: null, props: stubProps(), particles: stubParticles(), people: stubPeople(), truck: stubTruck(),
    tracker: createTracker(scene, { camera, srgb: SRGB }),
    loaded: {}, onPick: null, onHover: null, onDeposit: null,
    add: o => scene.add(o),
  };
  api.sky = stubSky(scene);
  api.tracker.group.scale.setScalar(TRACKER_SCALE);
  api.trackerScale = TRACKER_SCALE;
  const mover = createCameraMover(camera, controls);
  const sunDir = new THREE.Vector3(), trackerPos = new THREE.Vector3(), wscale = new THREE.Vector3();
  api.labels = createLabels(canvas, api.tracker, camera);
  api.lightNums = createLightNums(canvas, api.tracker, camera);   // the live number on each 3D light
  api.pointer = createPointer({ canvas, tracker: api.tracker, labels: api.labels, scene, onPick: id => api.onPick && api.onPick(id) });
  api.select = id => api.pointer.select(id);
  const groundAt = (x, z) => attempt("terrain.heightAt", () => api.terrain.heightAt(x, z)) || 0;
  const home = () => {
    const p = PRESETS.close, t = new THREE.Vector3(...p.target);
    api.tracker.group.getWorldPosition(trackerPos);
    return { target: t.clone().add(trackerPos), dist: t.distanceTo(new THREE.Vector3(...p.pos)) };
  };
  api.orbit = createOrbit({ canvas, camera, controls, mover, groundAt, home, partAt: api.pointer.partAt,
    center: out => api.tracker.group.getWorldPosition(out) });

  api.setRegion = id => {
    api.regionId = id;
    attempt("terrain.setRegion", () => api.terrain.setRegion(id));
    attempt("props.setRegion", () => api.props.setRegion(id));
    attempt("sky.setRegion", () => api.sky.setRegion && api.sky.setRegion(id));
    attempt("particles.setSand", () => api.particles.setSand && REGION_LOOK[id] && api.particles.setSand(REGION_LOOK[id].sand));
    api.tracker.group.position.y = attempt("terrain.heightAt", () => api.terrain.heightAt(0, 0)) || 0;
    api.setSun(api.sun.el, api.sun.az);
  };
  // el, az: degrees, compass azimuth. The shadow light sits on the sun's side of the tracker.
  api.setSun = (el, az) => {
    api.sun = { el, az };
    const ce = Math.cos(rad(el));
    sunDir.set(Math.sin(rad(az)) * ce, Math.sin(rad(el)), -Math.cos(rad(az)) * ce);
    attempt("sky.setSun", () => api.sky.setSun(el, az));
    attempt("terrain.setSun", () => api.terrain.setSun(sunDir, el));
    const L = api.sky.sunLight;
    if (L) {
      api.tracker.group.getWorldPosition(trackerPos);
      L.target.position.copy(trackerPos); L.position.copy(trackerPos).addScaledVector(sunDir, 300);
      if (!L.target.parent) scene.add(L.target);
      L.target.updateMatrixWorld();
    }
  };
  // sample: a weather sample (weather.js). Particles get the kind, strength and wind.
  // setRegion(id) only changes the look (ground, props, sky, dust colour); the story uses it too.
  let wk = null, windVec = null, particleKind = null;
  api.setWeather = sample => {
    api.weather = sample;
    attempt("sky.setWeather", () => api.sky.setWeather(sample));
    // sample.fx (the Simulation's weather buttons) names the particles itself, leaves included
    const pk = !sample ? { kind: "none", intensity: 0 } : sample.fx || (particleKind ? particleKind(sample) : basicKind(sample));
    const w = sample ? (windVec ? windVec(sample) : basicWind(sample)) : { x: 0, y: 0, z: 0 };
    const v = new THREE.Vector3(w.x, w.y || 0, w.z);
    attempt("props.setWind", () => api.props.setWind(v));
    const key = `${pk.kind}|${pk.intensity.toFixed(2)}|${v.x.toFixed(1)}|${v.z.toFixed(1)}`;
    if (key !== wk) { wk = key; attempt("particles.set", () => api.particles.set(pk.kind, pk.intensity, v)); }
  };
  api.lookAt = (spec, seconds = 1.6) => mover.go(typeof spec === "string" ? PRESETS[spec] : spec, seconds);
  // inset: px on the right covered by the cards. The picture's centre moves left by half of it
  // (a wider virtual picture, cropped), eased so a mode switch slides instead of jumping.
  let inset = 0, insetGoal = 0, W = 1, H = 1;
  api.setInset = px => { insetGoal = Math.max(0, px || 0); };
  function project() {
    const x = Math.round(inset);
    camera.aspect = (W + x) / H;
    if (x > 0) camera.setViewOffset(W + x, H, x, 0, W, H); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  api.resize = () => {
    W = canvas.clientWidth || window.innerWidth; H = canvas.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false); project();
  };
  const parts = ["terrain", "sky", "props", "particles", "people", "truck"];
  api.frame = dt => {
    if (inset !== insetGoal) { inset += (insetGoal - inset) * Math.min(1, dt * 6); if (Math.abs(insetGoal - inset) < 0.5) inset = insetGoal; project(); }
    mover.frame(dt);
    api.orbit.before(dt);
    controls.update();
    api.orbit.after(dt);
    for (const k of parts) { const p = api[k]; if (p && p.frame && !p.broken) { try { p.frame(dt); } catch (e) { p.broken = true; console.error(`[scene] ${k}.frame failed, it stops drawing:`, e); } } }
    api.tracker.frame(dt);
    api.pointer.frame();
    renderer.render(scene, camera);
    api.labels.frame();
    api.lightNums.frame();
  };
  window.addEventListener("resize", api.resize);
  api.resize();

  // ---- the real parts, as they load ----
  // tracker.surface() gives the centre, normal and quadrants in world space, but halfW / halfH in
  // the model's own cm: scale those to the world here (unless the tracker says it already did).
  const surface = () => {
    const s = api.tracker.surface();
    if (s && !s.worldScaled) { const k = api.tracker.group.getWorldScale(wscale).x; s.halfW *= k; s.halfH *= k; }
    return s;
  };
  const deposit = (kind, quadrant, amount) => api.onDeposit && api.onDeposit(kind, quadrant, amount);
  const swap = (key, make) => {
    const made = attempt(`create ${key}`, make);
    if (!made) return false;
    const old = api[key]; api[key] = made; api.loaded[key] = true;
    if (old && old.dispose) attempt(`dispose stub ${key}`, () => old.dispose());
    return true;
  };
  api.ready = (async () => {
    const [ter, sky, props, parts_, ppl, trk, wx] = await Promise.all(["./terrain.js", "./sky.js", "./props.js", "./particles.js", "./people.js", "./truck.js", "../weather/weather.js"].map(tryImport));
    if (wx) { windVec = wx.windVec || null; particleKind = wx.particleKind || null; }
    if (sky && sky.createSky) swap("sky", () => sky.createSky(scene, renderer));
    if (ter && ter.createTerrain) swap("terrain", () => ter.createTerrain(scene));
    const heightAt = (x, z) => api.terrain.heightAt(x, z);
    if (props && props.createProps) swap("props", () => props.createProps(scene, api.terrain));
    if (parts_ && parts_.createParticles) swap("particles", () => parts_.createParticles(scene, { panelSurface: surface, onDeposit: deposit }));
    if (ppl && ppl.createPeople) swap("people", () => ppl.createPeople(scene, { heightAt }));
    if (trk && trk.createTruck) swap("truck", () => trk.createTruck(scene, { heightAt }));
    wk = null;
    if (api.regionId) api.setRegion(api.regionId); else api.setSun(api.sun.el, api.sun.az);
    if (api.weather) api.setWeather(api.weather);
    return api.loaded;
  })();
  return api;
}

// Without weather.js: a simple particle kind and wind vector from a sample.
function basicKind(s) {
  if (s.hail) return { kind: "hail", intensity: 0.8 };
  if (s.snow > 0.05) return { kind: "snow", intensity: Math.min(1, s.snow / 2) };
  if (s.rain > 0.1) return { kind: "rain", intensity: Math.min(1, s.rain / 5) };
  if (s.dust > 0.25) return { kind: "dust", intensity: Math.min(1, s.dust) };
  return { kind: "none", intensity: 0 };
}
function basicWind(s) { const r = (s.windDir || 0) * Math.PI / 180, v = s.wind || 0; return { x: -Math.sin(r) * v, y: 0, z: Math.cos(r) * v }; }
