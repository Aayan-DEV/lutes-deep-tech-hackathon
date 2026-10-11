// Far horizon pieces past the edge of the ground: a dune line, red cliffs, blue-grey mountains.
// Simple low-poly bands around the viewer. They are drawn just in front of the far plane (behind all
// the ground, never clipped by the camera's far plane) and fade into the haze by a fixed amount each.
import { applyHaze, HAZE } from "./sky_haze.js";
import { vnoise, fbm } from "./terrain_height.js";

const rad = d => d * Math.PI / 180;
// compass degrees and a distance to world x, z (+x east, +z south)
const at = (azDeg, r) => [Math.sin(rad(azDeg)) * r, -Math.cos(rad(azDeg)) * r];

// One band: columns around the compass (a0..a1 degrees), rows from front to back.
// rowFn(t, col) returns [radius, height] for row index; colorFn(y, h, col, row) returns [r, g, b].
function band(a0, a1, cols, rows, rowFn, colorFn) {
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= cols; i++) {
    const az = a0 + (a1 - a0) * i / cols;
    for (let j = 0; j < rows; j++) {
      const [r, y] = rowFn(i / cols, az, j), [x, z] = at(az, r);
      pos.push(x, y, z); col.push(...colorFn(y, az, j));
    }
  }
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows - 1; j++) {
    const a = i * rows + j, b = a + 1, c = a + rows, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();   // smooth shading: far away, flat facets only show up as stripes
  return g;
}

// strata: 0 plain, above 0 adds horizontal rock layers by world height (the cliffs).
function material(hazeMix, strata) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, fog: false, side: THREE.DoubleSide });
  m.onBeforeCompile = sh => {
    applyHaze(sh, { mode: "fixed", mix: hazeMix });
    sh.uniforms.uStrata = { value: strata };
    // squeeze the depth into the last sliver before the far plane: behind all the ground, never
    // clipped, and still in the right order among the pieces themselves
    sh.vertexShader = sh.vertexShader.replace("#include <fog_vertex>", `#include <fog_vertex>
      gl_Position.z = (0.99995 + 0.00004 * clamp(length(vHazeW - cameraPosition) / 40000.0, 0.0, 1.0)) * gl_Position.w;`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uStrata;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        float stW = sin(vHazeW.y * 0.05 + sin(atan(vHazeW.x, vHazeW.z) * 37.0) * 0.5);
        diffuseColor.rgb *= 1.0 + uStrata * (smoothstep(0.45, 0.75, stW) * 0.28 - smoothstep(-0.55, -0.85, stW) * 0.22);`);
  };
  m.customProgramCacheKey = () => "horizon-far";
  return m;
}

// Make a function of the compass angle join up at north (0 = 360 degrees): blend the last 40 degrees.
const periodic = fn => az => { const w = Math.max(0, Math.min(1, (az - 320) / 40)); return fn(az) * (1 - w) + fn(az - 360) * w; };

const rgb = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

// A line of dunes all around: crests sharp for Thar, soft for Cholistan.
function dunes(p) {
  const [h0, h1] = p.height, c = rgb(p.color);
  const prof = periodic(az => {
    const n = fbm(az / 22, p.seed, 3, p.seed);
    const crest = p.sharp ? 1 - Math.abs(Math.sin(rad(az * 7 + n * 90))) : 0.5 + 0.5 * Math.sin(rad(az * 5 + n * 120));
    return h0 + (h1 - h0) * (0.35 * n + 0.65 * Math.pow(crest, p.sharp ? 0.6 : 1.4));
  });
  const rows = [[-1200, -400, 0], [-500, 0.45, 1], [0, 1, 2], [900, 0.6, 3], [2200, 0.2, 4]];
  return band(0, 360, 240, rows.length, (t, az, j) => {
    const [dr, f] = rows[j];
    return [p.dist + dr, f < 0 ? f : prof(az) * f];
  }, (y, az, j) => shade(c, j === 2 ? 1.06 : j === 1 ? 0.95 : 0.9));
}

// Mountains: a long range with peaks and saddles, far behind everything.
function mountains(p) {
  const [h0, h1] = p.height, c = rgb(p.color);
  const ridge = periodic(az => {
    const big = fbm(az / 35, 1.7, 3, p.seed), n = fbm(az / 4, 3.3, 3, p.seed + 1), peak = 1 - Math.abs(n * 2 - 1);
    return h0 + (h1 - h0) * Math.max(0, 0.1 + 1.1 * (big - 0.3) + 0.35 * peak * peak);
  });
  // long slopes up to the ridge line, so the range reads as hills and not as a wall
  const rows = [[-6500, -600], [-4500, 0.12], [-2200, 0.48], [0, 1], [3000, 0.55], [6500, 0.1]];
  return band(0, 360, 540, rows.length, (t, az, j) => {
    const [dr, f] = rows[j], spur = periodic(a => vnoise(a / 6, 0.7, p.seed + 2) - 0.5)(az) * 900 * (j === 3 ? 0.3 : 1);
    return [p.dist + dr + spur, f < 0 ? f : ridge(az) * f];
  }, (y, az, j) => shade(c, j === 3 ? 1.0 : j < 3 ? 0.85 + 0.05 * j : 0.92));
}

// Cliffs: steep red-orange faces with a flat top (a mesa edge, like the Flaming Cliffs).
// Rock layers are added in the shader by height. Buttresses and bays come from the face moving
// in and out, the same for every row of a column so the face stays clean.
function cliffs(p) {
  const [h0, h1] = p.height, face = rgb(p.color), top = rgb(0xb08a68), foot = rgb(0xb07a58);
  const span = p.to - p.from;
  // broken into a few stretches with gaps, like eroded mesa edges
  const heightAt = (t, az) => {
    const ends = Math.min(1, Math.min(t, 1 - t) * 7), keep = Math.min(1, Math.max(0, (vnoise(az / 7, 4.4, p.seed) - 0.28) * 4));
    return (h0 + (h1 - h0) * fbm(az / 5, 2.2, 2, p.seed)) * Math.pow(ends * keep, 0.5);
  };
  // rows: buried foot, scree foot, face low, face mid, face high, top edge, top back, back slope
  const rows = [[-400, -300], [-150, 0.0], [0, 0.18], [40, 0.5], [80, 0.85], [110, 1], [1600, 0.96], [3400, -300]];
  return band(p.from, p.to, Math.round(span * 4), rows.length, (t, az, j) => {
    const [dr, f] = rows[j], bay = (vnoise(az * 0.4, 0.5, p.seed) - 0.5) * 900 + (vnoise(az * 1.3, 2.5, p.seed) - 0.5) * 200;
    return [p.dist + dr + bay, f < 0 ? f : heightAt(t, az) * f];
  }, (y, az, j) => (j >= 6 ? top : j <= 1 ? foot : face));
}

const BUILD = { dunes, mountains, cliffs };

// Build all horizon pieces for a region look. Returns { group, frame() }.
export function buildHorizon(look) {
  const group = new THREE.Group(); group.name = "horizon";
  const items = (look.horizon || []).map((p, i) => {
    const mix = { value: p.haze };
    const mesh = new THREE.Mesh(BUILD[p.kind](p), material(mix, p.kind === "cliffs" ? 1 : 0));
    mesh.frustumCulled = false; mesh.renderOrder = p.kind === "mountains" ? 1 : 2 + i;
    group.add(mesh);
    return { mesh, mix, base: p.haze };
  });
  return {
    group,
    // thicker haze (dust, rain) swallows the far pieces
    frame() {
      const extra = Math.max(0, Math.min(1, (7600 - HAZE.uFogFar.value) / 5600));
      for (const it of items) it.mix.value = it.base + (1 - it.base) * Math.min(1, extra * 1.3);
    },
    dispose() { for (const it of items) { it.mesh.geometry.dispose(); it.mesh.material.dispose(); } },
  };
}
