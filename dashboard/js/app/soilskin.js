// Dust, snow, water and leaves drawn on the panel face and on the 4 light sensor tops (used by
// scene/tracker.js). One small 64 x 64 canvas texture over the cell, redrawn only when a layer
// changed by more than 0.02. Quadrants TL TR BL BR: TL and BL on the panel's +x side, TL and TR
// on its +z side (the sensor's side), the same as the LDR positions.
const SIZE = 64, HALFPX = 32, STEP = 0.02;
const SAND = [205, 170, 120], SAND_DARK = [160, 125, 85];
const LEAF = [[139, 94, 52], [118, 120, 48], [104, 70, 36], [150, 128, 60]];   // brown, olive, dark brown, dry olive
const KINDS = ["dust", "snow", "water", "leaves"];

// A fixed list of random numbers, so the specks stay in place as the dust grows.
const RND = (() => { let s = 1234567; const out = []; for (let i = 0; i < 1024; i++) { s = (s * 16807) % 2147483647; out.push(s / 2147483647); } return out; })();
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
const clean = v => (Array.isArray(v) ? v : [0, 0, 0, 0]).map(x => Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);

export function createSoilSkin(panel, ldrMats, { size = 9.5, y = 0.33, srgb = false } = {}) {
  const THREE = window.THREE, cv = document.createElement("canvas"); cv.width = cv.height = SIZE;
  const ctx = cv.getContext("2d"), tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter;
  if (srgb) tex.encoding = THREE.sRGBEncoding;
  const geo = new THREE.PlaneGeometry(size, size); geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.95,
    polygonOffset: true, polygonOffsetFactor: -2 }));
  mesh.position.y = y; mesh.visible = false; mesh.receiveShadow = true; panel.add(mesh);
  const white = new THREE.Color(0xffffff), sand = new THREE.Color(0xcdaa78), wet = new THREE.Color(0x8c96a0), leaf = new THREE.Color(0x7d6a34), tmp = new THREE.Color();
  if (srgb) { sand.convertSRGBToLinear(); wet.convertSRGBToLinear(); leaf.convertSRGBToLinear(); }
  let shown = { dust: [0, 0, 0, 0], snow: [0, 0, 0, 0], water: [0, 0, 0, 0], leaves: [0, 0, 0, 0] };

  function quadrant(q, L) {
    // canvas: left = -x, top = -z (the plane is rotated flat, the texture's top row lies at -z)
    const x0 = q === 0 || q === 2 ? HALFPX : 0, y0 = q < 2 ? HALFPX : 0;
    const dust = L.dust[q], snow = L.snow[q], water = L.water[q];
    if (water > 0.01) {
      ctx.fillStyle = `rgba(30,45,60,${(0.35 * water).toFixed(3)})`; ctx.fillRect(x0, y0, HALFPX, HALFPX);
      ctx.fillStyle = "rgba(225,238,255,0.55)";
      for (let i = 0; i < 24 * water; i++) ctx.fillRect(x0 + Math.floor(RND[i * 2 + 300] * 31), y0 + Math.floor(RND[i * 2 + 301] * 31), 1, 1);
    }
    if (dust > 0.01) {
      ctx.fillStyle = rgba(SAND, 0.15 + 0.5 * dust); ctx.fillRect(x0, y0, HALFPX, HALFPX);
      for (let i = 0; i < 160; i++) {
        if (RND[i * 3 + q * 7] > dust) continue;
        ctx.fillStyle = rgba(RND[i * 3 + 1] > 0.5 ? SAND_DARK : SAND, 0.9);
        const s = RND[i * 3 + 2] > 0.7 ? 2 : 1;
        ctx.fillRect(x0 + Math.floor(RND[(i * 5 + q * 11) % 1024] * 31), y0 + Math.floor(RND[(i * 5 + q * 11 + 1) % 1024] * 31), s, s);
      }
    }
    if (L.leaves[q] > 0.01) leavesIn(x0, y0, q, L.leaves[q]);
    if (snow > 0.01) {
      ctx.fillStyle = `rgba(250,251,255,${(0.2 + 0.75 * snow).toFixed(3)})`; ctx.fillRect(x0, y0, HALFPX, HALFPX);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      for (let i = 0; i < 40 * snow; i++) ctx.fillRect(x0 + Math.floor(RND[i * 2 + 600] * 30), y0 + Math.floor(RND[i * 2 + 601] * 30), 3, 2);
    }
  }

  // Small leaf shapes (a pointed oval with a darker middle line), more of them as the cover grows.
  // Each leaf has a fixed place, angle and colour, so they stay put as more land.
  function leavesIn(x0, y0, q, cover) {
    const n = Math.round(14 * cover);
    for (let i = 0; i < n; i++) {
      const r = (k) => RND[(i * 7 + q * 53 + k) % 1024];
      const cx = x0 + 3 + r(0) * 26, cy = y0 + 3 + r(1) * 26, ang = r(2) * Math.PI, len = 3 + r(3) * 2.5;
      ctx.fillStyle = rgba(LEAF[Math.floor(r(4) * 4)], 0.95);
      ctx.beginPath(); ctx.ellipse(cx, cy, len, len * 0.45, ang, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(70,48,24,0.7)"; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(cx - Math.cos(ang) * len, cy - Math.sin(ang) * len); ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len); ctx.stroke();
    }
  }

  function draw(L) {
    ctx.clearRect(0, 0, SIZE, SIZE);
    for (let q = 0; q < 4; q++) quadrant(q, L);
    tex.needsUpdate = true;
    mesh.visible = [0, 1, 2, 3].some(q => KINDS.some(k => L[k][q] > 0.01));
    // the LDR tops: sandy with dust, white with snow, darker when wet, brown under leaves
    for (let q = 0; q < 4; q++) {
      tmp.copy(white).lerp(sand, 0.85 * L.dust[q]).lerp(white, L.snow[q]).lerp(wet, 0.5 * L.water[q]).lerp(leaf, 0.8 * L.leaves[q]);
      ldrMats[q].color.copy(tmp);
    }
  }

  return {
    mesh,
    set(layers) {
      if (!layers) return;
      const L = {};
      for (const k of KINDS) L[k] = clean(layers[k]);   // leaves may be missing: zeros
      const changed = KINDS.some(k => L[k].some((v, i) => Math.abs(v - shown[k][i]) > STEP || (v === 0) !== (shown[k][i] === 0)));
      if (!changed) return;
      shown = L; draw(L);
    },
  };
}
