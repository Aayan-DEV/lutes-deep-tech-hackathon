// The ground: one mesh, a polar grid (rings around the tracker) whose rings get wider with distance.
// Small cells near the tracker (about 3 to 10 cm within 6 m), big ones near the 80 m edge. One mesh
// means no seam between a near patch and a far ring. Heights come from terrain_height.js;
// colours by height, slope and patches are baked into vertex colours; the sand detail is in the shader.
//
// createTerrain(scene) -> { setRegion(id), setSun(sunDir, el), frame(dt), ground, heightAt(x, z), regionId }
import { lookOf } from "./regions.js";
import { heightFn, vnoise, smooth, TERRAIN_R, FLAT_R } from "./terrain_height.js";
import { createSandMaterial } from "./terrain_material.js";

const RINGS = 230, SEGS = 360;     // about 83k vertices
const STEP0 = 2.5;                 // cm between the first rings

// Ring radius for ring i: r = r0 * (e^(k t) - 1), so spacing grows smoothly with distance.
function ringRadii() {
  // solve r0 * (e^k - 1) = TERRAIN_R with r0 * k / (RINGS - 1) = STEP0 (a few Newton steps)
  const ratio = TERRAIN_R / (STEP0 * (RINGS - 1));
  let k = 4;
  for (let i = 0; i < 30; i++) { const f = (Math.exp(k) - 1) / k - ratio, d = (Math.exp(k) * (k - 1) + 1) / (k * k); k -= f / d; }
  const r0 = TERRAIN_R / (Math.exp(k) - 1), out = new Float32Array(RINGS);
  for (let i = 0; i < RINGS; i++) out[i] = r0 * (Math.exp(k * i / (RINGS - 1)) - 1);
  return out;
}

function buildGeometry() {
  const radii = ringRadii(), n = RINGS * SEGS;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEGS; j++) {
    const a = (j / SEGS) * Math.PI * 2, k = (i * SEGS + j) * 3;
    pos[k] = Math.cos(a) * radii[i]; pos[k + 2] = Math.sin(a) * radii[i];
  }
  const idx = new Uint32Array((RINGS - 1) * SEGS * 6);
  let t = 0;
  for (let i = 0; i < RINGS - 1; i++) for (let j = 0; j < SEGS; j++) {
    const a = i * SEGS + j, b = i * SEGS + (j + 1) % SEGS, c = a + SEGS, d = b + SEGS;
    idx[t++] = a; idx[t++] = b; idx[t++] = c;   // counter-clockwise seen from above
    idx[t++] = b; idx[t++] = d; idx[t++] = c;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), TERRAIN_R * 1.05);
  return g;
}

export function createTerrain(scene) {
  const geo = buildGeometry();
  const { mat, U } = createSandMaterial();
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true; ground.castShadow = false; ground.name = "ground";
  ground.frustumCulled = false;
  scene.add(ground);

  let h = (x, z) => 0, regionId = null;
  const tmp = new THREE.Color(), cLow = new THREE.Color(), cHigh = new THREE.Color(), cSlope = new THREE.Color(), cPatch = new THREE.Color();

  function setRegion(id) {
    const L = lookOf(id);
    regionId = id; h = heightFn(id);
    const P = geo.attributes.position, C = geo.attributes.color, n = P.count;
    // heights first, then normals (for the slope colour)
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const y = h(P.getX(i), P.getZ(i)); P.setY(i, y);
      if (y < lo) lo = y; if (y > hi) hi = y;
    }
    P.needsUpdate = true;
    geo.computeVertexNormals();
    const N = geo.attributes.normal;
    cLow.set(L.sandLow); cHigh.set(L.sandHigh); cSlope.set(L.slope); cPatch.set(L.patch);
    for (let i = 0; i < n; i++) {
      const x = P.getX(i), z = P.getZ(i), y = P.getY(i), r = Math.hypot(x, z);
      // height relative to the local range: big dunes far away, small bumps near
      const local = Math.max(30, Math.min(hi - lo, 30 + r * 0.25));
      const ht = Math.max(0, Math.min(1, 0.5 + y / local));
      tmp.copy(cLow).lerp(cHigh, ht);
      const slope = 1 - N.getY(i);                                     // 0 flat .. bigger is steeper
      tmp.lerp(cSlope, smooth(0.08, 0.4, slope) * 0.8);
      const pn = vnoise(x / 900 + 4.1, z / 900 - 2.3, 31) * 0.7 + vnoise(x / 260, z / 260, 32) * 0.3;
      tmp.lerp(cPatch, smooth(0.6, 0.78, pn) * L.patchAmt);
      const mottle = 1 + (vnoise(x / 70, z / 70, 33) - 0.5) * 0.06;
      // a slightly darker, firmer ring where people walked around the tracker
      const trod = 1 - 0.035 * (1 - smooth(FLAT_R, FLAT_R + 80, r));
      C.setXYZ(i, tmp.r * mottle * trod, tmp.g * mottle * trod, tmp.b * mottle * trod);
    }
    C.needsUpdate = true;

    U.uGrain.value = L.grain; U.uRipple.value = L.ripple; U.uRippleK.value = 2 * Math.PI / L.rippleLen;
    U.uGravel.value = L.gravel; U.uSparkle.value = L.sparkle;
    U.uWindT.value.set(L.wind[0], L.wind[1]).normalize();
    const pb = L.pebbles;
    [U.uPeb0, U.uPeb1, U.uPeb2, U.uPeb3].forEach((u, i) => u.value.set(pb[i % pb.length]));
  }

  // sunDir: unit vector toward the sun (world). el: degrees above the horizon.
  function setSun(sunDir, el) {
    U.uSunDirT.value.copy(sunDir).normalize();
    U.uSunK.value = smooth(-1, 8, el);
  }

  setRegion("cholistan");
  return {
    setRegion, setSun, ground,
    frame() {},
    heightAt: (x, z) => h(x, z),
    get regionId() { return regionId; },
    uniforms: U,
  };
}
