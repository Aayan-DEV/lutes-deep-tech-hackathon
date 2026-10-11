// The haze that ties the ground to the sky. The sky writes these uniforms every time the sun or the
// weather changes; the ground, the plants and the far horizon read them, so far things fade into
// exactly the colour of the sky at the horizon (no visible edge where the ground ends).
//
// Shared by reference: every material that calls applyHaze() points at these same objects.

export const HAZE = {
  uHazeCol: { value: new THREE.Color(0xd8d2c2) },   // the sky colour right at the horizon
  uGlowCol: { value: new THREE.Color(0xffd08a) },   // extra warm light around the sun
  uGlowK: { value: 1 },                             // how strong that glow is (0 at night)
  uHazeSun: { value: new THREE.Vector3(0, 1, 0) },  // unit vector toward the sun (world)
  uFogNear: { value: 900 },                         // cm: haze starts
  uFogFar: { value: 7600 },                         // cm: fully hazed (the ground mesh ends at 8000)
  uHazeMax: { value: 0.72 },                        // how far the ground fades (1 in dust or rain)
};

// GLSL: the haze colour seen when looking along direction d (world, any length).
// The sky shader uses the same formula at the horizon, so the two always match.
export const HAZE_GLSL = /* glsl */`
uniform vec3 uHazeCol; uniform vec3 uGlowCol; uniform float uGlowK; uniform vec3 uHazeSun;
uniform float uFogNear; uniform float uFogFar; uniform float uHazeMax;
vec3 hazeColor(vec3 d) {
  vec3 h = normalize(vec3(d.x, 0.0, d.z) + vec3(0.0, 1e-4, 0.0));
  float s = max(dot(h, uHazeSun), 0.0);
  return uHazeCol + uGlowCol * uGlowK * (pow(s, 8.0) * 0.30 + pow(s, 2.0) * 0.14);
}
`;

// Patch a built-in material (MeshStandardMaterial and friends) through onBeforeCompile:
// adds a world position varying and replaces three's fog with distance haze in the sky's colour.
// mode "distance": fade by distance from the camera (ground, plants).
// mode "fixed": fade by a fixed amount uHazeMix (far horizon pieces, which sit at any distance).
// Call inside your own onBeforeCompile (pass the shader), or use hazeMaterial() below.
// worldExpr: a GLSL expression for the world position, when the caller moves vertices itself.
export function applyHaze(shader, { mode = "distance", mix = null, worldExpr = null } = {}) {
  Object.assign(shader.uniforms, HAZE);
  if (mix) shader.uniforms.uHazeMix = mix;
  const world = worldExpr ? `vHazeW = ${worldExpr};` : `{ vec4 hw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          hw = instanceMatrix * hw;
        #endif
        vHazeW = (modelMatrix * hw).xyz; }`;
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vHazeW;")
    .replace("#include <project_vertex>", "#include <project_vertex>\n" + world);
  // fixed: thick at the foot of a far piece, thinner toward its top. distance: slow at first,
  // complete just before the ground ends.
  const amount = mode === "fixed"
    ? "float hz = mix(min(1.0, uHazeMix + 0.25), uHazeMix, smoothstep(-200.0, 400.0, vHazeW.y));"
    : "float hz = uHazeMax * pow(smoothstep(uFogNear, uFogFar, length(vHazeW - cameraPosition)), 1.5);";
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>\nvarying vec3 vHazeW;\n${HAZE_GLSL}${mode === "fixed" ? "uniform float uHazeMix;" : ""}`)
    .replace("#include <fog_fragment>", `{ ${amount}
      gl_FragColor.rgb = mix(gl_FragColor.rgb, hazeColor(vHazeW - cameraPosition), clamp(hz, 0.0, 1.0)); }`);
}

// A MeshStandardMaterial with the haze already applied. fog is off: the haze replaces it.
export function hazeMaterial(params, opts) {
  const m = new THREE.MeshStandardMaterial({ ...params, fog: false });
  m.onBeforeCompile = sh => applyHaze(sh, opts);
  // three caches shader programs by the onBeforeCompile source text, which is the same for every
  // call here; the key keeps the two haze modes apart.
  m.customProgramCacheKey = () => "haze-" + ((opts && opts.mode) || "distance");
  return m;
}
