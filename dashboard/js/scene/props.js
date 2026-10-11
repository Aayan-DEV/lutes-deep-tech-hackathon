// Desert props per region: instanced rocks, pebbles, shrubs, grass tufts and a few trees (one draw
// call per kind), plus the far horizon pieces. Plants sway with the wind in the vertex shader.
// Nothing is placed within 60 cm of the origin (the tracker).
//
// createProps(scene, terrain) -> { setRegion(id), setWind(vec3 /* m per s, x east, z south */), frame(dt) }
import { lookOf } from "./regions.js";
import { applyHaze } from "./sky_haze.js";
import { rockGeo, bushGeo, broomGeo, tuftGeo, treeGeo } from "./props_geo.js";
import { buildHorizon } from "./props_horizon.js";

const KEEP_OUT = 70;    // cm: free ring around the tracker (base is 30 by 20 cm)
const SHADOW_R = 130;   // cm: props closer than this cast shadows (the sun's shadow box is 120 cm)

// Shared material for plants: bends the top of each plant along the wind, in world space.
function plantMaterial(U, side, smoothNormals = false) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: !smoothNormals, side, fog: false });
  m.onBeforeCompile = sh => {
    applyHaze(sh, { mode: "distance", worldExpr: "swayW" });
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime; uniform vec3 uWind;")
      .replace("#include <project_vertex>", `
        vec4 swp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          swp = instanceMatrix * swp;
          float hgt = length(instanceMatrix[1].xyz);
          vec2 base = instanceMatrix[3].xz;
        #else
          float hgt = 1.0; vec2 base = vec2(0.0);
        #endif
        swp = modelMatrix * swp;
        float bend = clamp(transformed.y, 0.0, 1.2); bend *= bend;
        float wl = length(uWind.xz) + 1e-4;
        float gust = 0.7 + 0.3 * sin(uTime * 1.7 - dot(base, uWind.xz / wl) * 0.006 + base.x * 0.002);
        float flutter = 0.18 * sin(uTime * 6.5 + base.x * 0.31 + base.y * 0.23 + transformed.y * 4.0);
        swp.xz += uWind.xz * hgt * bend * (gust + flutter);
        swp.y -= wl * hgt * bend * 0.25;
        vec3 swayW = swp.xyz;
        vec4 mvPosition = viewMatrix * swp;
        gl_Position = projectionMatrix * mvPosition;`);
  };
  m.customProgramCacheKey = () => "plant-" + side + smoothNormals;
  return m;
}

export function createProps(scene, terrain) {
  const U = { uTime: { value: 0 }, uWind: { value: new THREE.Vector3() } };
  const windTarget = new THREE.Vector3();
  const geos = { rock: rockGeo(1), pebble: rockGeo(4), bush: bushGeo(3), broom: broomGeo(5), tuft: tuftGeo(7) };
  const mats = {
    rock: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true, fog: false }),
    plant: plantMaterial(U, THREE.FrontSide), grass: plantMaterial(U, THREE.FrontSide, true),
  };
  mats.rock.onBeforeCompile = sh => applyHaze(sh, { mode: "distance" });
  mats.rock.customProgramCacheKey = () => "rock-haze";
  mats.tree = plantMaterial(U, THREE.FrontSide);

  const root = new THREE.Group(); root.name = "props"; scene.add(root);
  let meshes = [], horizon = null, treeGeoCur = null;

  // a seeded random so a region always looks the same
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const q = new THREE.Quaternion(), e3 = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
  const slopeAt = (x, z) => {
    const d = 15, h = terrain.heightAt;
    return Math.hypot(h(x + d, z) - h(x - d, z), h(x, z + d) - h(x, z - d)) / (2 * d);
  };

  // Place n instances. spec: { n, r: [min, max] cm, size: [min, max] cm, color }.
  // opts: tilt (rocks lean), sink (fraction of size pushed into the ground), maxSlope, near (anchor points)
  function scatter(geo, mat, spec, opts = {}) {
    const base = new THREE.Color(spec.color), palette = opts.palette ? opts.palette.map(h => new THREE.Color(h)) : null;
    const placed = [], items = [];
    let tries = 0;
    while (items.length < spec.n && tries++ < spec.n * 8) {
      let x, z;
      if (opts.near && opts.near.length && rnd() < 0.45) {   // clump near an anchor (grass around shrubs)
        const a = opts.near[Math.floor(rnd() * opts.near.length)], ang = rnd() * Math.PI * 2, d = a.s * (0.5 + rnd() * 0.9);
        x = a.x + Math.cos(ang) * d; z = a.z + Math.sin(ang) * d;
      } else {
        const ang = rnd() * Math.PI * 2, r = spec.r[0] + (spec.r[1] - spec.r[0]) * Math.pow(rnd(), 1.8);
        x = Math.cos(ang) * r; z = Math.sin(ang) * r;
      }
      const r = Math.hypot(x, z);
      if (r < KEEP_OUT + spec.size[1] * 0.6) continue;
      if (opts.maxSlope && slopeAt(x, z) > opts.maxSlope) continue;
      const s = spec.size[0] + (spec.size[1] - spec.size[0]) * Math.pow(rnd(), 1.5);
      const tilt = opts.tilt || 0.08;
      q.setFromEuler(e3.set((rnd() - 0.5) * tilt, rnd() * Math.PI * 2, (rnd() - 0.5) * tilt));
      const w = s * (opts.wide || 1) * (0.8 + rnd() * 0.4);
      s3.set(w, s, w * (0.8 + rnd() * 0.4));
      p3.set(x, terrain.heightAt(x, z) - s * (opts.sink || 0.05), z);
      const c = (palette ? palette[Math.floor(rnd() * palette.length)] : base).clone().multiplyScalar(0.82 + rnd() * 0.3);
      c.offsetHSL((rnd() - 0.5) * 0.03, 0, 0);
      items.push({ m: new THREE.Matrix4().compose(p3, q, s3), c, near: r < SHADOW_R });
      placed.push({ x, z, s });
    }
    // two meshes: the few near the tracker cast shadows (inside the sun's shadow box), the rest do not
    for (const near of [true, false]) {
      const list = items.filter(it => it.near === near);
      if (!list.length) continue;
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((it, i) => { mesh.setMatrixAt(i, it.m); mesh.setColorAt(i, it.c); });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = near; mesh.receiveShadow = true;
      mesh.frustumCulled = false;   // instances spread over the whole desert
      root.add(mesh); meshes.push(mesh);
    }
    return placed;
  }

  function clear() {
    for (const m of meshes) { root.remove(m); if (m.dispose) m.dispose(); }
    meshes = [];
    if (horizon) { scene.remove(horizon.group); horizon.dispose(); horizon = null; }
    if (treeGeoCur) { treeGeoCur.dispose(); treeGeoCur = null; }
  }

  function setRegion(id) {
    if (terrain.regionId !== id) terrain.setRegion(id);
    const L = lookOf(id), P = L.props;
    clear();
    seed = { cholistan: 1031, thar: 2053, gobi: 3079 }[id] || 999;
    const steep = id === "thar" ? 0.32 : 0;   // keep Thar plants off the steep dune faces
    if (P.rock) scatter(geos.rock, mats.rock, P.rock, { tilt: 0.5, sink: 0.2, wide: 1.3, palette: [P.rock.color, ...L.pebbles.slice(0, 2)] });
    if (P.pebble) scatter(geos.pebble, mats.rock, P.pebble, { tilt: 0.6, sink: 0.25, wide: 1.4, palette: L.pebbles });
    const anchors = [];
    if (P.bush) anchors.push(...scatter(geos.bush, mats.plant, P.bush, { maxSlope: steep, sink: 0.03, wide: 1.25 }));
    if (P.broom) anchors.push(...scatter(geos.broom, mats.plant, P.broom, { maxSlope: steep, sink: 0.02, wide: 1.1 }));
    if (P.tree) { treeGeoCur = treeGeo(P.tree.color, seed % 97); scatter(treeGeoCur, mats.tree, { ...P.tree, color: 0xffffff }, { maxSlope: steep, sink: 0.01, wide: 1.6, tilt: 0.04 }); }
    if (P.tuft) scatter(geos.tuft, mats.grass, P.tuft, { maxSlope: steep ? 0.5 : 0, sink: 0.04, wide: 1.2, near: anchors });
    horizon = buildHorizon(L);
    scene.add(horizon.group);
  }

  // wind: m per s (x east, z south). The top of a plant leans up to about a fifth of its height.
  function setWind(v) {
    if (!v) return;
    const s = Math.hypot(v.x, v.z), lean = Math.min(0.22, s * 0.014);
    windTarget.set(v.x, 0, v.z);
    if (s > 1e-3) windTarget.multiplyScalar(lean / s); else windTarget.set(0, 0, 0);
  }

  function frame(dt) {
    dt = dt || 0;
    U.uTime.value += dt;
    U.uWind.value.lerp(windTarget, Math.min(1, dt * 1.5));   // ease toward the new wind
    if (horizon) horizon.frame();
  }

  return { setRegion, setWind, frame, group: root };
}
