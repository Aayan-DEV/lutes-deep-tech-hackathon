// The desert around the tracker: sky (colours follow the sun), stars, dunes, rocks, plants, the sun
// and its light. Everything heavy is built once per region; per frame only colours and positions change.
import { T, label } from "./parts3d.js";   // label: compass letters
import { toModelAz } from "./sun.js";

const R_SKY = 420, R_SUN = 330;
const rad = d => d * Math.PI / 180;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Sky colours at key sun heights (degrees). Between keys the colours blend.
const KEYS = [
  { e: -14, top: 0x050a1c, hor: 0x111b3a, glow: 0x000000, sun: 0x000000, sunI: 0.0, hemi: 0.10 },
  { e: -5,  top: 0x1a2758, hor: 0x8a4f6e, glow: 0xff7a3d, sun: 0xff7a3d, sunI: 0.0, hemi: 0.22 },
  { e: 1,   top: 0x3a5ea8, hor: 0xf08a4b, glow: 0xffa04a, sun: 0xff9a4d, sunI: 0.45, hemi: 0.38 },
  { e: 10,  top: 0x3f7fd0, hor: 0xf6c99a, glow: 0xffd08a, sun: 0xffd2a0, sunI: 0.8, hemi: 0.45 },
  { e: 35,  top: 0x2f74c8, hor: 0xa9cdea, glow: 0xfff1cf, sun: 0xfff1dc, sunI: 0.85, hemi: 0.42 },
];

export function createDesert(scene, renderer) {
  const THREE = T(), C = h => new THREE.Color(h);
  scene.fog = new THREE.Fog(0xb4dbf7, 160, 430);

  // ---- sky dome ----
  const skyU = { top: { value: C(0x2b78d6) }, hor: { value: C(0xb4dbf7) }, ground: { value: C(0xd9b07a) },
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, glow: { value: C(0xffffff) }, glowK: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(R_SKY, 48, 24), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 ground; uniform vec3 sunDir; uniform vec3 glow; uniform float glowK; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 col = h > 0.0 ? mix(hor, top, pow(h, 0.5)) : mix(hor, ground, min(1.0, -h * 5.0));
        float s = max(dot(d, sunDir), 0.0);
        col += glow * glowK * (pow(s, 80.0) * 0.9 + pow(s, 8.0) * 0.28 + pow(s, 2.0) * 0.06 * (1.0 - h));
        gl_FragColor = vec4(col, 1.0); }`,
  }));
  sky.renderOrder = -1; scene.add(sky);

  // ---- stars ----
  const sp = [];
  for (let i = 0; i < 900; i++) { const a = Math.random() * Math.PI * 2, y = 0.08 + Math.random() * 0.92, r = Math.sqrt(1 - y * y); sp.push(Math.cos(a) * r * 400, y * 400, Math.sin(a) * r * 400); }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  scene.add(new THREE.Points(starGeo, starMat));

  // ---- sun: a bright disc with a soft glow ----
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: 0xfff1c4, fog: false }));
  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 256;
  const g = gcv.getContext("2d"), grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,240,200,1)"); grad.addColorStop(0.18, "rgba(255,210,120,0.55)"); grad.addColorStop(0.5, "rgba(255,170,80,0.12)"); grad.addColorStop(1, "rgba(255,150,60,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gcv), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  glowSprite.scale.set(110, 110, 1);
  const sunGroup = new THREE.Group(); sunGroup.add(sunMesh, glowSprite); scene.add(sunGroup);

  // ---- lights ----
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0xd9b07a, 0.55); scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffffff, 1); sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048); Object.assign(sunLight.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 10, far: 220 });
  sunLight.shadow.bias = -0.0006; sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight); scene.add(sunLight.target);
  const night = new THREE.AmbientLight(0x6f86c9, 0); scene.add(night);

  // ---- ground: dunes, flat where the tracker stands ----
  const groundGeo = new THREE.PlaneGeometry(900, 900, 180, 180); groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  ground.receiveShadow = true; scene.add(ground);
  let duneH = () => 0;

  // ---- props, rebuilt per region ----
  const props = new THREE.Group(); scene.add(props);
  const compass = new THREE.Group(); scene.add(compass);

  function buildRegion(region) {
    const amp = { cholistan: 0.8, thar: 1.3, gobi: 0.45 }[region.id] || 1, ph = region.lat * 0.37;
    duneH = (x, z) => {
      const r = Math.hypot(x, z), keep = smooth(34, 80, r);
      const h = 3.4 * Math.sin(x * 0.03 + Math.sin(z * 0.018 + ph) * 2.2) + 1.8 * Math.sin((x + z) * 0.055 + ph)
        + 0.9 * Math.sin(z * 0.11 - x * 0.04) + 0.35 * Math.sin(x * 0.23 + z * 0.19);
      return keep * amp * (h + 3.5) * (0.6 + r / 500);
    };
    const pos = groundGeo.attributes.position, cols = [], c1 = C(region.sand), c2 = C(region.sand2), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = duneH(x, z);
      pos.setY(i, y);
      tmp.copy(c2).lerp(c1, Math.min(1, 0.35 + y / (14 * amp + 1)));
      cols.push(tmp.r, tmp.g, tmp.b);
    }
    groundGeo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    pos.needsUpdate = true; groundGeo.computeVertexNormals();
    skyU.ground.value.set(region.sand);
    hemi.groundColor.set(region.sand);

    // rocks and plants (instanced: one draw call each)
    props.clear();
    let seed = Math.abs(region.lat * 1000) | 0;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const place = (n, rMin, rMax, fn) => { for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, r = rMin + rnd() * (rMax - rMin), x = Math.cos(a) * r, z = Math.sin(a) * r; fn(x, duneH(x, z), z, rnd); } };
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), e3 = new THREE.Euler();
    const instanced = (geo, color, n, rMin, rMax, size) => {
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true }), n);
      let k = 0;
      place(n, rMin, rMax, (x, y, z, r) => {
        const sc = size[0] + r() * (size[1] - size[0]);
        q.setFromEuler(e3.set(r() * 0.4, r() * Math.PI * 2, r() * 0.4)); s3.set(sc, sc * (0.6 + r() * 0.6), sc); p3.set(x, y + sc * 0.2, z);
        mesh.setMatrixAt(k++, m4.compose(p3, q, s3));
      });
      mesh.castShadow = true; mesh.receiveShadow = true; props.add(mesh);
    };
    instanced(new THREE.DodecahedronGeometry(1, 0), region.rock, region.id === "gobi" ? 60 : region.id === "cholistan" ? 30 : 16, 30, 260, [0.6, 3.2]);
    if (region.plant === "shrub") instanced(new THREE.IcosahedronGeometry(1, 0), region.id === "thar" ? 0x6f8a3a : 0x8a8f4a, region.id === "thar" ? 55 : 35, 28, 240, [0.8, 2.2]);
    if (region.plant === "grass") instanced(new THREE.ConeGeometry(0.6, 1.6, 5), 0xb2a35a, 90, 26, 220, [0.6, 1.4]);

    // compass letters on the ground (the panel's front faces the equator)
    compass.clear();
    for (const [t, deg] of [["N", 0], ["E", 90], ["S", 180], ["W", 270]]) {
      const a = rad(toModelAz(deg, region.lat)), l = label(t, { size: 1.5, weight: 700 });
      l.position.set(Math.sin(a) * 30, 1.2, Math.cos(a) * 30); compass.add(l);
    }
  }

  const lerpKey = (el, key) => {
    let i = 0; while (i < KEYS.length - 2 && el > KEYS[i + 1].e) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = smooth(a.e, b.e, el);
    if (key === "sunI" || key === "hemi") return a[key] + (b[key] - a[key]) * t;   // numbers; the rest are colours
    return C(a[key]).lerp(C(b[key]), t);
  };

  return {
    buildRegion,
    groundHeight: (x, z) => duneH(x, z),
    // el, az: the sun in the model's frame (degrees); el may be below the horizon.
    setSun(el, az) {
      const d = new THREE.Vector3(Math.sin(rad(az)) * Math.cos(rad(el)), Math.sin(rad(el)), Math.cos(rad(az)) * Math.cos(rad(el)));
      skyU.top.value.copy(lerpKey(el, "top")); skyU.hor.value.copy(lerpKey(el, "hor"));
      skyU.glow.value.copy(lerpKey(el, "glow")); skyU.sunDir.value.copy(d); skyU.glowK.value = smooth(-10, 0, el);
      scene.fog.color.copy(skyU.hor.value);
      starMat.opacity = 1 - smooth(-12, -3, el);
      sunGroup.position.copy(d).multiplyScalar(R_SUN); sunGroup.visible = el > -4;
      sunMesh.material.color.copy(lerpKey(Math.max(el, 1), "sun")).lerp(C(0xffffff), 0.35);
      sunLight.color.copy(lerpKey(el, "sun")); sunLight.intensity = lerpKey(el, "sunI");
      sunLight.position.copy(d).multiplyScalar(90); sunLight.target.position.set(0, 0, 0);
      sunLight.castShadow = el > 0.5;
      hemi.intensity = lerpKey(el, "hemi"); hemi.color.copy(skyU.top.value).lerp(C(0xffffff), 0.5);
      night.intensity = 0.25 * (1 - smooth(-10, 0, el));
    },
  };
}
