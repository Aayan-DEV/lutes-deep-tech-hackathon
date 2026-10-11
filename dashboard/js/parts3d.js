// Shared 3D building blocks: materials, text labels and the textures drawn in code
// (LDR face, solar cell). Uses the global THREE from three.js r128.
import { css } from "./util.js";

export const T = () => window.THREE;

export function mat(color, rough = 0.8, metal = 0, extra = {}) {
  return new (T().MeshStandardMaterial)(Object.assign({ color, roughness: rough, metalness: metal }, extra));
}

export function box(w, h, d, material, x, y, z, parent) {
  const m = new (T().Mesh)(new (T().BoxGeometry)(w, h, d), material);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function cyl(r, h, material, x, y, z, parent, seg = 32, rTop = r) {
  const m = new (T().Mesh)(new (T().CylinderGeometry)(rTop, r, h, seg), material);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

// A text label that always faces the camera. update(text) redraws it in place.
export function label(text, { size = 1, weight = 600, mono = false, bg = true } = {}) {
  const THREE = T(), cv = document.createElement("canvas"), ctx = cv.getContext("2d");
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sprite.renderOrder = 10;
  function draw(t) {
    const lines = String(t).split("\n"), px = 44, font = `${weight} ${px}px ${mono ? "JetBrains Mono, monospace" : "Inter, Helvetica, sans-serif"}`;
    ctx.font = font;
    const w = Math.ceil(Math.max(...lines.map(l => ctx.measureText(l).width))) + 36, h = lines.length * px * 1.2 + 22;
    cv.width = w; cv.height = h;
    ctx.font = font; ctx.textBaseline = "middle";
    if (bg) {
      ctx.fillStyle = css("--panel") || "#fff"; ctx.globalAlpha = 0.9;
      roundRect(ctx, 2, 2, w - 4, h - 4, 18); ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = css("--line-2") || "#ccc"; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.fillStyle = css("--ink") || "#111";
    lines.forEach((l, i) => ctx.fillText(l, 18, 11 + px * 0.6 + i * px * 1.2));
    tex.needsUpdate = true;
    sprite.scale.set(size * w / 60, size * h / 60, 1);
  }
  let last = null;
  sprite.userData.update = t => { if (t !== last) { last = t; draw(t); } };
  sprite.userData.redraw = () => draw(last);
  sprite.userData.update(text);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// GL5528 face: two comb electrodes with the zig-zag CdS track between them (what you see on a real LDR).
let ldrTex = null;
export function ldrFaceTexture() {
  if (ldrTex) return ldrTex;
  const THREE = T(), cv = document.createElement("canvas"); cv.width = cv.height = 256;
  const c = cv.getContext("2d");
  c.fillStyle = "#e9e6df"; c.beginPath(); c.arc(128, 128, 126, 0, Math.PI * 2); c.fill();     // ceramic
  c.save(); c.beginPath(); c.arc(128, 128, 104, 0, Math.PI * 2); c.clip();
  c.fillStyle = "#8a8378"; c.fillRect(0, 0, 256, 256);                                        // CdS layer
  c.strokeStyle = "#d9d4c8"; c.lineWidth = 9; c.lineJoin = "round";                            // electrodes
  c.beginPath();
  const rows = 9, x0 = 38, x1 = 218;
  for (let i = 0; i <= rows; i++) {
    const y = 34 + i * (188 / rows);
    if (i % 2 === 0) { c.moveTo(x0 - 30, y); c.lineTo(x1, y); } else { c.moveTo(x0, y); c.lineTo(x1 + 30, y); }
  }
  c.stroke();
  c.restore();
  c.strokeStyle = "#bdb8ad"; c.lineWidth = 4; c.beginPath(); c.arc(128, 128, 104, 0, Math.PI * 2); c.stroke();
  ldrTex = new THREE.CanvasTexture(cv);
  return ldrTex;
}

// Solar cell: deep blue cells, thin gaps, two silver bus bars.
let cellTex = null;
export function cellTexture() {
  if (cellTex) return cellTex;
  const THREE = T(), cv = document.createElement("canvas"); cv.width = cv.height = 512;
  const c = cv.getContext("2d");
  c.fillStyle = "#13295c"; c.fillRect(0, 0, 512, 512);
  c.strokeStyle = "#3b5797"; c.lineWidth = 6;
  for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(i * 128, 0); c.lineTo(i * 128, 512); c.stroke(); }
  c.strokeStyle = "#1c3672"; c.lineWidth = 1.5;
  for (let y = 8; y < 512; y += 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }   // fingers
  c.fillStyle = "#9a9ea6"; c.fillRect(0, 150, 512, 7); c.fillRect(0, 355, 512, 7);                // bus bars
  cellTex = new THREE.CanvasTexture(cv);
  cellTex.anisotropy = 4;
  return cellTex;
}

// A curved arrow (part of a ring plus an arrow head) lying in the XZ plane around the origin.
export function arcArrow(radius, arcDeg, tube, material) {
  const THREE = T(), g = new THREE.Group();
  const arc = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 48, arcDeg * Math.PI / 180), material);
  arc.rotation.x = -Math.PI / 2;                         // torus lies flat, sweeps from +x toward -z
  g.add(arc);
  const head = new THREE.Mesh(new THREE.ConeGeometry(tube * 3.2, tube * 8, 16), material);
  const a = arcDeg * Math.PI / 180;
  head.position.set(radius * Math.cos(a), 0, -radius * Math.sin(a));
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a)));   // along the arc
  g.add(head);
  return g;
}

export function disposeTree(obj) {
  obj.traverse(o => { o.geometry && o.geometry.dispose(); });
}
