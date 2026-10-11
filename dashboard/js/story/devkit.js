// Stand-ins for the story's dev page only (dev/story.html): a flat desert, a simple sky, a box
// tracker with the same methods as js/scene/tracker.js, and plain dust and rain points.
// The real game uses js/scene/scene.js instead; nothing here ships in game.html.
import { createPeople } from "../scene/people.js";
import { createTruck } from "../scene/truck.js";
import { sunDir } from "./sunpath.js";

const rad = d => d * Math.PI / 180;

function standInTracker(T) {
  const group = new T.Group(), parts = [];
  const M = c => new T.MeshStandardMaterial({ color: c, roughness: 0.75 });
  const wood = M(0xd8b98c), dark = M(0xb8915e), orange = M(0xf6a04d), black = M(0x1f1f1f), blue = M(0x2f62c9);
  const cell = new T.MeshStandardMaterial({ color: 0x24406e, roughness: 0.35, metalness: 0.2 });
  const add = (geo, m, x, y, z, parent, step) => {
    const o = new T.Mesh(geo, m); o.castShadow = o.receiveShadow = true;
    const holder = new T.Group(); holder.position.set(x, y, z); holder.add(o); parent.add(holder);   // parts grow from their own middle
    if (step !== undefined) parts.push({ holder, step }); return o;
  };
  const B = (w, h, d) => new T.BoxGeometry(w, h, d);
  add(B(2, 1.2, 17), dark, -9, 0.6, 0, group, 0); add(B(2, 1.2, 17), dark, 16, 0.6, 0, group, 0);
  add(B(27, 1.2, 17), wood, 3.5, 1.8, 0, group, 1);
  add(B(6.9, 0.2, 5.3), M(0x0f7a8a), 12.6, 2.5, 4.6, group, 2); add(B(8.3, 0.85, 5.5), M(0xf4f1ea), 12.6, 2.8, -4.4, group, 2);
  add(B(4, 4.3, 2), black, 1, 0.5, 0, group, 3);
  const pan = new T.Group(); group.add(pan);
  add(new T.CylinderGeometry(6.5, 6.5, 0.5, 40), wood, 0, 3.9, 0, pan, 4);
  add(B(0.5, 0.08, 2.2), black, 0, 4.2, 5, pan, 4);
  add(B(0.6, 9.6, 2.6), orange, -5.7, 8.9, 0, pan, 5); add(B(0.6, 9.6, 2.6), orange, 5.7, 8.9, 0, pan, 5);
  add(B(2.3, 2.2, 1.2), blue, 7.4, 12.1, 0, pan, 6);
  const tilt = new T.Group(); tilt.position.y = 12.6; pan.add(tilt);
  add(B(10.4, 0.4, 10.4), wood, 0, 0, 0, tilt, 7);
  add(B(9.5, 0.12, 9.5), cell, 0, 0.26, 0, tilt, 7);
  const ldr = [];
  add(B(2.8, 0.5, 2.8), M(0xf4f1ea), 0, 0.25, 6.6, tilt, 8);
  [[0.62, 0.62], [-0.62, 0.62], [0.62, -0.62], [-0.62, -0.62]].forEach(([x, z]) => {
    const m = new T.MeshStandardMaterial({ color: 0xe8d9b0, emissive: 0x000000 }); ldr.push(m);
    add(new T.CylinderGeometry(0.3, 0.3, 0.3, 12), m, x, 0.65, 6.6 + z, tilt, 8);
  });
  const clean = new T.Color(0x24406e), sand = new T.Color(0xc9a46a), wet = new T.Color(0x5f8fb5);
  return {
    group,
    setPan(d) { pan.rotation.y = rad(d); },
    setTilt(d) { tilt.rotation.x = rad(d - 90); },
    setLights(v) { v.forEach((x, i) => { const g = Math.max(0, Math.min(1, x / 100)); ldr[i].emissive.setRGB(g, g * 0.8, g * 0.3); }); },
    setSoiling({ dust, water }) {
      const d = dust.reduce((a, b) => a + b, 0) / 4, w = water.reduce((a, b) => a + b, 0) / 4;
      cell.color.copy(clean).lerp(sand, Math.min(1, d * 1.1)).lerp(wet, w * 0.35);
      cell.roughness = 0.35 + d * 0.5 - w * 0.2;
    },
    setBuildProgress(p) {
      const s = p * 9;
      for (const { holder, step } of parts) {
        const k = Math.max(0, Math.min(1, s - step));
        holder.visible = k > 0.001;
        holder.scale.setScalar(Math.max(0.001, k < 1 ? 1 - Math.pow(1 - k, 3) : 1));
      }
    },
  };
}

function weatherPoints(T, scene) {
  const N = 1800, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 300; pos[i * 3 + 1] = Math.random() * 90; pos[i * 3 + 2] = (Math.random() - 0.5) * 300; }
  const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3));
  const mat = new T.PointsMaterial({ color: 0xd2b07a, size: 0.9, transparent: true, opacity: 0.8, depthWrite: false });
  const pts = new T.Points(geo, mat); pts.visible = false; pts.frustumCulled = false; scene.add(pts);
  let kind = "none", amount = 0, wind = new T.Vector3();
  return {
    set(k, a = 0, w) { kind = k; amount = a; if (w) wind.copy(w); pts.visible = k !== "none" && a > 0;
      mat.color.set(k === "rain" ? 0x9fb7d0 : 0xd2b07a); mat.size = k === "rain" ? 0.6 : 0.9; mat.opacity = 0.35 + 0.5 * a; },
    frame(dt) {
      if (!pts.visible) return;
      const n = Math.floor(N * amount), fall = kind === "rain" ? 160 : 12, side = kind === "rain" ? 0.3 : 9;
      for (let i = 0; i < N; i++) {
        let x = pos[i * 3] + wind.x * side * dt, y = pos[i * 3 + 1] - fall * dt, z = pos[i * 3 + 2] + wind.z * side * dt;
        if (y < 0 || x > 150 || z > 150) { x = x > 150 ? -150 : x; z = z > 150 ? -150 : z; y = y < 0 ? 90 : y; }
        pos[i * 3] = x; pos[i * 3 + 1] = i < n ? y : -999; pos[i * 3 + 2] = z;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

export function createDevScene(canvas) {
  const T = window.THREE;
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.fog = new T.Fog(0xcfe0ea, 300, 900);
  const camera = new T.PerspectiveCamera(45, 1, 1, 3000);
  camera.position.set(80, 50, 110);
  const controls = new T.OrbitControls(camera, canvas);
  controls.target.set(0, 10, 0); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49;
  const ground = new T.Mesh(new T.PlaneGeometry(2000, 2000), new T.MeshStandardMaterial({ color: 0xdcc39a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const hemi = new T.HemisphereLight(0xdfeeff, 0xc9a77a, 0.6); scene.add(hemi);
  const sunLight = new T.DirectionalLight(0xffffff, 1.0);
  sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -130, right: 130, top: 130, bottom: -130, near: 10, far: 900 });
  scene.add(sunLight, sunLight.target);
  const sunBall = new T.Mesh(new T.SphereGeometry(9, 16, 12), new T.MeshBasicMaterial({ color: 0xfff1c4, fog: false }));
  scene.add(sunBall);
  const tracker = standInTracker(T); scene.add(tracker.group);
  const people = createPeople(scene), truck = createTruck(scene), particles = weatherPoints(T, scene);
  const night = new T.Color(0x1d2433), dawn = new T.Color(0xf0b48a), day = new T.Color(0xbcd7ea), dusty = new T.Color(0xcfa877), grey = new T.Color(0x9aa5ae);
  const sky = new T.Color(), tint = { dust: 0, rain: 0 };
  let el = 30;
  function paintSky() {
    const e = Math.max(-1, Math.min(1, el / 25));
    if (e < 0) sky.copy(dawn).lerp(night, -e); else sky.copy(dawn).lerp(day, Math.min(1, e * 1.6));
    sky.lerp(dusty, tint.dust * 0.7).lerp(grey, tint.rain * 0.6);
    scene.background = sky; scene.fog.color.copy(sky);
  }
  return {
    renderer, scene, camera, controls, tracker, people, truck, particles, terrain: { heightAt: () => 0 },
    setSun(e, az) {
      el = e;
      const d = sunDir(e, az);
      sunLight.position.set(d.x * 400, d.y * 400, d.z * 400);
      sunBall.position.set(d.x * 700, d.y * 700, d.z * 700);
      sunLight.intensity = Math.max(0, Math.min(0.8, (e + 2) / 16)) * (1 - 0.5 * tint.dust - 0.5 * tint.rain);
      hemi.intensity = 0.2 + 0.3 * Math.max(0, Math.min(1, (e + 6) / 20));
      paintSky();
    },
    setWeather(s) { tint.dust = s.dust || 0; tint.rain = s.rain > 0 ? Math.min(1, s.rain / 6) : 0; paintSky(); },
    frame(dt) {
      people.frame(dt); truck.frame(dt); particles.frame(dt); controls.update();
      renderer.render(scene, camera);
    },
    resize() {
      const w = innerWidth, h = innerHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    },
  };
}
