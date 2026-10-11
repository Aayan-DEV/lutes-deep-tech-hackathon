// The sky: a dome shader (colours follow the sun from deep night to noon), the sun disc, stars,
// clouds, haze that grows with dust and humidity, and the two scene lights (sun and soft sky light).
//
// createSky(scene, renderer) -> { setSun(el, az), setWeather(sample), frame(dt), sunLight, hemi,
//                                 setRegion(id) /* optional: region haze and ground bounce colour */ }
// el, az: degrees, compass azimuth (0 north, 90 east). World: +x east, +z south, +y up.
// sample: { cloud 0..1, dust 0..1, kind, rh % } (other fields of the weather sample are ignored).
import { HAZE } from "./sky_haze.js";
import { SKY_KEYS, SKY_VERT, SKY_FRAG, STAR_VERT, STAR_FRAG } from "./sky_shader.js";
import { lookOf } from "./regions.js";

const rad = d => d * Math.PI / 180;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = x => Math.max(0, Math.min(1, x));
const lum = c => 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
const SHADOW_BOX = 120;     // cm: half size of the sun's shadow box around the tracker

export function createSky(scene, renderer) {
  const C = h => new THREE.Color(h);

  // ---- dome ----
  const U = {
    uZenith: { value: C(0x4e88d0) }, uSunCol: { value: C(0xfff4e0) }, uSunSize: { value: rad(1.1) },
    uSunVis: { value: 1 }, uHazeH: { value: 0.45 }, uCloud: { value: 0 }, uTime: { value: 0 },
    uCloudCol: { value: C(0xffffff) }, uCloudDark: { value: C(0xb0b4bc) }, ...HAZE,
  };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 32), new THREE.ShaderMaterial({
    uniforms: U, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  }));
  dome.renderOrder = -1000; dome.frustumCulled = false; dome.name = "sky";
  scene.add(dome);

  // ---- stars: fixed random directions, drawn behind everything ----
  const N = 1400, sp = new Float32Array(N * 3), sz = new Float32Array(N), ph = new Float32Array(N);
  let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) {
    const a = rnd() * Math.PI * 2, y = rnd() * 0.98 + 0.02, r = Math.sqrt(1 - y * y);
    sp.set([Math.cos(a) * r * 900, y * 900, Math.sin(a) * r * 900], i * 3);
    const b = rnd(); sz[i] = b > 0.97 ? 3.2 : b > 0.85 ? 2.3 : 1.5; ph[i] = rnd();
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  sg.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
  sg.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
  const starU = { uTime: U.uTime, uStars: { value: 0 } };
  const stars = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: starU, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  }));
  stars.renderOrder = -999; stars.frustumCulled = false;
  scene.add(stars);

  // ---- lights ----
  const hemi = new THREE.HemisphereLight(0xd0def0, 0xbfae88, 0.45);
  const sunLight = new THREE.DirectionalLight(0xffffff, 0.85);
  sunLight.castShadow = true;     // always on: switching it would rebuild every shader
  sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -SHADOW_BOX, right: SHADOW_BOX, top: SHADOW_BOX, bottom: -SHADOW_BOX, near: 50, far: 4000 });
  sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.4;
  sunLight.shadow.camera.updateProjectionMatrix();
  scene.add(hemi, sunLight, sunLight.target);

  scene.fog = new THREE.Fog(0xd8d2c2, 900, 7600);   // for other modules' plain materials

  // ---- state ----
  let el = 30, az = 180, look = lookOf("cholistan");
  let wx = { cloud: 0, dust: 0, kind: "clear", rh: 30 };
  const sunDir = new THREE.Vector3(0, 1, 0);
  const k = { zen: C(0), hor: C(0), glow: C(0), sun: C(0), hemiC: C(0), cloud: C(0) };
  const tmp = C(0), tmp2 = C(0);

  // blend the colour table at the current sun height
  function keysAt(e) {
    let i = 0; while (i < SKY_KEYS.length - 2 && e > SKY_KEYS[i + 1].e) i++;
    const a = SKY_KEYS[i], b = SKY_KEYS[i + 1], t = clamp01((e - a.e) / (b.e - a.e));
    for (const n of ["zen", "hor", "glow", "sun", "hemiC", "cloud"]) k[n].set(a[n]).lerp(tmp.set(b[n]), t);
    return { sunI: a.sunI + (b.sunI - a.sunI) * t, hemiI: a.hemi + (b.hemi - a.hemi) * t };
  }

  function update() {
    const { sunI, hemiI } = keysAt(el);
    const day = smooth(-8, 8, el);                       // 0 night .. 1 day
    const cloud = clamp01(wx.cloud || 0), dust = clamp01(wx.dust || 0), rh = clamp01((wx.rh || 30) / 100);
    const wet = { rain: 0.45, storm: 0.6, hail: 0.55, snow: 0.3 }[wx.kind] || 0;
    const over = smooth(0.45, 1, cloud);                 // how overcast
    const haze = clamp01(look.haze * 0.6 + rh * 0.25 + dust * 1.1 + wet * 0.3);

    // horizon: region tint and humidity whiten it a little by day
    k.hor.lerp(tmp.set(look.hazeTint).multiplyScalar(lum(k.hor) / lum(tmp.set(look.hazeTint))), clamp01((look.haze * 0.5 + rh * 0.2) * day));
    // overcast: everything toward a flat grey of the same brightness
    const greyH = lum(k.hor) * 0.92, greyZ = (lum(k.zen) + lum(k.hor)) * 0.5 * 0.85;
    k.hor.lerp(tmp.setRGB(greyH, greyH * 1.01, greyH * 1.04), over * 0.85);
    k.zen.lerp(tmp.setRGB(greyZ, greyZ * 1.01, greyZ * 1.05), over * 0.9);
    // dust: brown-orange haze that climbs up the sky, and dimmer light
    const dustH = tmp2.set(0xc9a477).multiplyScalar(Math.max(0.05, lum(k.hor)) / lum(tmp.set(0xc9a477)) * (1 - dust * 0.3));
    k.hor.lerp(dustH, dust * 0.9);
    k.zen.lerp(tmp.copy(dustH).multiplyScalar(0.85), dust * 0.75);
    // rain or storm: darker
    const dark = 1 - wet * 0.55 - dust * 0.25 * day;
    k.hor.multiplyScalar(dark); k.zen.multiplyScalar(dark);

    U.uZenith.value.copy(k.zen);
    HAZE.uHazeCol.value.copy(k.hor);
    HAZE.uGlowCol.value.copy(k.glow).multiplyScalar(1 - 0.7 * over - 0.5 * dust);
    HAZE.uGlowK.value = smooth(-10, -1, el);
    HAZE.uHazeSun.value.copy(sunDir);
    U.uHazeH.value = 0.42 + haze * 0.6;
    HAZE.uFogNear.value = 1800 * (1 - haze * 0.85);
    HAZE.uFogFar.value = 7600 - 5600 * clamp01(dust * 1.1 + wet * 0.4);
    HAZE.uHazeMax.value = 0.55 + 0.45 * clamp01(dust * 1.3 + wet * 0.6 + over * 0.3);
    scene.fog.color.copy(k.hor); scene.fog.near = HAZE.uFogNear.value; scene.fog.far = HAZE.uFogFar.value;

    // sun disc: whiter high up, redder low and in dust
    U.uSunCol.value.copy(k.sun).lerp(tmp.set(0xffffff), 0.45 * smooth(2, 25, el)).lerp(tmp.set(0xff7a3a), dust * 0.6);
    U.uSunCol.value.multiplyScalar(1 + 0.4 * smooth(0, 10, el));
    U.uSunVis.value = (1 - dust * 0.8) * smooth(-3, -0.5, el);
    U.uSunSize.value = rad(1.1 + dust * 0.8);
    U.uCloud.value = cloud;
    // clouds lit by the sun colour, darker underneath, much darker in rain
    U.uCloudCol.value.copy(k.cloud).multiplyScalar((1 - wet * 0.5) * (1 - over * 0.25));
    U.uCloudDark.value.copy(k.cloud).lerp(k.zen, 0.3).multiplyScalar(0.62 * (1 - wet * 0.45));
    starU.uStars.value = (1 - smooth(-12, -4, el)) * (1 - cloud * 0.95) * (1 - dust * 0.9);

    // lights
    sunLight.color.copy(k.sun).lerp(tmp.set(0xff9a50), dust * 0.4);
    sunLight.intensity = sunI * (1 - 0.82 * over) * (1 - 0.65 * dust) * (1 - wet * 0.5);
    hemi.color.copy(k.hemiC).lerp(k.hor, 0.25 * day);
    hemi.intensity = hemiI * (1 + 0.35 * over * day) * (1 - 0.3 * dust) * (1 - wet * 0.3);
    hemi.groundColor.set(look.hemiGround).multiplyScalar(0.25 + 0.75 * day);
  }

  return {
    sunLight, hemi, dome, sunDir,
    setSun(e, a) {
      el = e; az = a;
      sunDir.set(Math.sin(rad(az)) * Math.cos(rad(el)), Math.sin(rad(el)), -Math.cos(rad(az)) * Math.cos(rad(el))).normalize();
      // light on the sun's side of the origin (the scene may move it next to the tracker)
      sunLight.position.copy(sunLight.target.position).addScaledVector(sunDir, 1000);
      update();
    },
    setWeather(sample) { if (sample) { wx = { ...wx, ...sample }; update(); } },
    setRegion(id) { look = lookOf(id); update(); },
    frame(dt) { U.uTime.value += dt || 0; },
  };
}
