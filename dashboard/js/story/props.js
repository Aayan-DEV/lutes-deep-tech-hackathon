// 3D extras the story adds and removes: name tags that face the camera, the sun's path across the
// sky as a soft tube, and the sun ball with a beam to the panel. Sizes are for the tracker at
// scale 1; the chapters pass the scale S so everything stays in proportion.
import { dayPath } from "./sunpath.js";

const T = () => window.THREE;
const rad = d => d * Math.PI / 180;

// A text tag that always faces the camera. set(text) redraws only when the text changed.
// opts: size (height in cm), color (text), dot (a coloured dot before the text), bg.
export function tag(text, { size = 5, color = "#111111", bg = "rgba(255,255,255,0.94)", dot = null, depthTest = false } = {}) {
  const THREE = T(), cv = document.createElement("canvas"), g = cv.getContext("2d");
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest, fog: false }));
  sprite.renderOrder = 20;
  let last = null;
  sprite.userData.set = t => {
    if (t === last) return;
    last = t;
    const px = 44, font = `600 ${px}px Inter, Helvetica, sans-serif`, pad = 22, dw = dot ? 30 : 0;
    g.font = font;
    const w = Math.ceil(g.measureText(t).width) + pad * 2 + dw, h = px + 30;
    cv.width = w; cv.height = h;
    g.fillStyle = bg; g.beginPath();
    if (g.roundRect) g.roundRect(0, 0, w, h, 8); else g.rect(0, 0, w, h);
    g.fill();
    if (dot) { g.fillStyle = dot; g.beginPath(); g.arc(pad + 9, h / 2, 9, 0, Math.PI * 2); g.fill(); }
    g.font = font; g.fillStyle = color; g.textBaseline = "middle"; g.fillText(t, pad + dw, h / 2 + 2);
    tex.needsUpdate = true;
    sprite.scale.set(size * w / h, size, 1);
  };
  sprite.userData.set(text);
  sprite.userData.fade = a => { sprite.material.opacity = a; sprite.visible = a > 0.01; };
  return sprite;
}

// The sun's path for one day as a soft tube of radius `thick` (r is the sky radius).
export function arcTube(lat, doy, { r = 60, thick = 0.35, color = 0xf59e0b, opacity = 0.9 } = {}) {
  const THREE = T(), pts = dayPath(lat, doy, r, 72).map(p => new THREE.Vector3(...p));
  const mat = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: false, depthWrite: opacity >= 1 });
  if (pts.length < 2) return new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, thick, 8, false), mat);
  mesh.userData.points = pts;
  mesh.userData.top = pts.reduce((a, b) => (b.y > a.y ? b : a), pts[0]);
  mesh.userData.ends = [pts[0], pts[pts.length - 1]];
  return mesh;
}

// A thin line version (cheap to redraw every frame). setDay(doy) moves it.
export function arcLine(lat, { r = 60, color = 0xf59e0b, opacity = 0.85 } = {}) {
  const THREE = T(), geo = new THREE.BufferGeometry();
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity, fog: false, depthWrite: false }));
  line.frustumCulled = false;
  line.userData.setDay = doy => {
    geo.setAttribute("position", new THREE.Float32BufferAttribute(dayPath(lat, doy, r).flat(), 3));
    geo.computeBoundingSphere();
  };
  return line;
}

// The sun ball with a soft halo and a beam to the panel. setSun(el, az) moves it on a sphere of
// radius r around the group's origin (put the group at the panel's height).
export function sunBall(r, { size = 2.6 } = {}) {
  const THREE = T(), g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(size, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffc24a, fog: false }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(size * 1.6, 20, 14), new THREE.MeshBasicMaterial({ color: 0xff9a20, transparent: true, opacity: 0.22, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  ball.add(halo); g.add(ball);
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  const beam = new THREE.Line(beamGeo, new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: size * 0.9, gapSize: size * 0.6, transparent: true, opacity: 0.85, fog: false }));
  beam.frustumCulled = false; g.add(beam);
  g.userData.ball = ball;
  g.userData.setSun = (el, az) => {
    const e = rad(el), a = rad(az), x = Math.sin(a) * Math.cos(e) * r, y = Math.sin(e) * r, z = -Math.cos(a) * Math.cos(e) * r;
    ball.position.set(x, y, z); ball.visible = el > -2;
    const p = beamGeo.attributes.position; p.setXYZ(1, x, y, z); p.needsUpdate = true;
    beam.computeLineDistances();
    beam.visible = el > 0;
  };
  return g;
}

// A world position on the sky sphere (radius r, centre c) for a sun direction.
export function skyPoint(el, az, r, c = { x: 0, y: 0, z: 0 }) {
  const e = rad(el), a = rad(az);
  return { x: c.x + Math.sin(a) * Math.cos(e) * r, y: c.y + Math.sin(e) * r, z: c.z - Math.cos(a) * Math.cos(e) * r };
}
