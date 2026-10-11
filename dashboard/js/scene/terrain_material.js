// The sand look: a MeshStandardMaterial patched in its shader (onBeforeCompile). All procedural,
// no textures. Adds, in world space so nothing swims when the camera moves:
// - fine grain (two noise layers), faded out where a grain would be smaller than a pixel,
// - wind ripples (the surface normal is tilted along the wind), faded with distance and on steep sides,
// - small stones painted into the ground (the Gobi gravel),
// - a few grains that sparkle when they face the sun.
// Ground colour by height and slope comes from the vertex colours (terrain.js).
import { applyHaze } from "./sky_haze.js";

export function createSandMaterial() {
  const U = {
    uSunDirT: { value: new THREE.Vector3(0, 1, 0) }, uSunK: { value: 1 },
    uGrain: { value: 0.12 }, uRipple: { value: 0.3 }, uRippleK: { value: 2 * Math.PI / 8 },
    uGravel: { value: 0 }, uSparkle: { value: 0.5 }, uWindT: { value: new THREE.Vector2(0.7, -0.7) },
    uPeb0: { value: new THREE.Color() }, uPeb1: { value: new THREE.Color() },
    uPeb2: { value: new THREE.Color() }, uPeb3: { value: new THREE.Color() },
  };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, fog: false });
  mat.extensions = { derivatives: true };
  mat.customProgramCacheKey = () => "sand-v1";
  mat.onBeforeCompile = sh => {
    applyHaze(sh, { mode: "distance" });
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\n" + HEAD)
      .replace("#include <color_fragment>", "#include <color_fragment>\n" + COLOR)
      .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n" + NORMAL)
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + SPARKLE);
  };
  return { mat, U };
}

const HEAD = /* glsl */`
uniform vec3 uSunDirT; uniform float uSunK;
uniform float uGrain; uniform float uRipple; uniform float uRippleK; uniform float uGravel; uniform float uSparkle;
uniform vec2 uWindT; uniform vec3 uPeb0; uniform vec3 uPeb1; uniform vec3 uPeb2; uniform vec3 uPeb3;
float sHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float sNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), u.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

// Runs right after the vertex colour is applied. Sets up values the next two steps reuse.
const COLOR = /* glsl */`
  vec2 sP = vHazeW.xz;
  float sFw = length(fwidth(sP)) + 1e-4;                 // cm covered by one pixel here
  // ripples: phase along the wind, bent by slow noise so the lines wander
  float sPh = dot(sP, uWindT) * uRippleK * (0.85 + 0.3 * sNoise(sP * 0.006)) + sNoise(sP * 0.011) * 9.0 + sNoise(sP * 0.045) * 2.2;
  float sRip = uRipple * (1.0 - smoothstep(0.25, 0.9, sFw * uRippleK))
             * (0.55 + 0.45 * smoothstep(0.2, 0.6, sNoise(sP * 0.004 + 3.0)));
  // grain: a fine layer and a coarser one, each faded before it gets smaller than a pixel
  float sG1 = sNoise(sP * 2.6) - 0.5, sG2 = sNoise(sP * 0.42 + 7.0) - 0.5, sG3 = sNoise(sP * 0.035 + 1.0) - 0.5;
  float sShade = uGrain * (sG1 * 1.3 * (1.0 - smoothstep(0.12, 0.45, sFw)) + sG2 * 0.9 * (1.0 - smoothstep(0.9, 3.0, sFw)))
               + sG3 * 0.08 + 0.05 * sRip * sin(sPh);
  diffuseColor.rgb *= 1.0 + sShade;
  // gravel: at most one stone per 1.6 cm cell, random size, offset and colour
  // (the cell grid is turned and stretched a little so no rows of stones line up)
  vec2 sGc = mat2(0.83, 0.56, -0.56, 0.83) * sP / vec2(1.3, 1.1), sGi = floor(sGc), sGf = fract(sGc) - 0.5;
  float sRad = 0.1 + 0.3 * pow(sHash(sGi + 2.9), 2.0);
  vec2 sOff = (vec2(sHash(sGi + 1.3), sHash(sGi + 5.7)) - 0.5) * (0.9 - 2.0 * sRad);
  vec2 sD = (sGf - sOff) / sRad;
  float sStone = step(1.0 - uGravel * 0.55, sHash(sGi + 7.1)) * (1.0 - smoothstep(0.65, 1.0, length(sD)))
               * (1.0 - smoothstep(0.15, 0.6, sFw / 1.2));
  float sPick = sHash(sGi + 9.1);
  vec3 sPc = sPick < 0.25 ? uPeb0 : sPick < 0.5 ? uPeb1 : sPick < 0.75 ? uPeb2 : uPeb3;
  diffuseColor.rgb = mix(diffuseColor.rgb, sPc * (0.85 + 0.3 * sHash(sGi + 4.4)), sStone);
`;

// Tilt the normal: ripple slopes plus the round tops of the stones.
const NORMAL = /* glsl */`
  vec3 sNw = inverseTransformDirection(normal, viewMatrix);
  float sFlat = smoothstep(0.78, 0.95, sNw.y);
  vec2 sGrad = uWindT * (cos(sPh) + 0.55 * cos(2.0 * sPh)) * 0.22 * sRip * sFlat;
  vec3 sNw2 = normalize(sNw - vec3(sGrad.x, 0.0, sGrad.y) + vec3(sD.x, 0.0, sD.y) * 0.5 * sStone);
  normal = normalize((viewMatrix * vec4(sNw2, 0.0)).xyz);
`;

// A few grains act like tiny mirrors: bright when their random facet faces halfway between sun and eye.
const SPARKLE = /* glsl */`
  {
    vec2 sc = floor(sP * 4.0);
    vec3 jit = vec3(sHash(sc + 1.0), sHash(sc + 2.0), sHash(sc + 3.0)) - 0.5;
    vec3 fN = normalize(sNw2 + jit * 1.1);
    vec3 V = normalize(cameraPosition - vHazeW);
    float g = pow(max(dot(fN, normalize(uSunDirT + V)), 0.0), 600.0) * step(0.82, sHash(sc + 11.0));
    totalEmissiveRadiance += vec3(1.0, 0.96, 0.88) * g * 2.5 * uSparkle * uSunK * (1.0 - smoothstep(0.06, 0.25, sFw));
  }
`;
