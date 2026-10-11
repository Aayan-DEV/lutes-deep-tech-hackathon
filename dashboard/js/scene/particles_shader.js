// One small shader for all weather particles. Each kind is one THREE.Points; the fragment shader
// draws the right shape inside each point square:
//   mode 0 = streak (rain): a thin line along the drop's direction on screen
//   mode 1 = soft dot (snow)
//   mode 2 = ball (hail): a small lit sphere
//   mode 3 = dust: tiny hard grains (1 to 3 screen px) and big, very faint haze puffs
// Sizes are in world units (cm) and shrink with distance like real things.
// Dust is drawn "lit" (define LIT): its colour is multiplied by the scene's sky and sun light and
// goes through the same tone mapping, colour encoding and fog as the ground, so the sand grains
// look like the sand they came from instead of glowing in a dim storm.

const VERT = `
attribute float aSize;
attribute float aAlpha;
uniform float uScale;
uniform float uMaxPx;
uniform float uHalf;
uniform float uPR;
uniform float uGrainSize;
varying float vAlpha;
varying float vPx;
varying float vGrain;
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float px = aSize * uScale / max(1.0, -mvPosition.z);
  // a point bigger than the GPU allows would be cut; fade it out instead (puffs close to the camera)
  vAlpha = aAlpha * (1.0 - smoothstep(uMaxPx * 0.6, uMaxPx, px));
  // fade out toward the sides of the box so its square edge does not show
  vAlpha *= 1.0 - smoothstep(0.65 * uHalf, uHalf, max(abs(position.x), abs(position.z)));
  px = min(px, uMaxPx);
  // dust grains stay 1 to 3 screen pixels, near or far
  vGrain = aSize < uGrainSize ? 1.0 : 0.0;
  if (vGrain > 0.5) px = clamp(px, 1.0 * uPR, 3.0 * uPR);
  vPx = px;
  gl_PointSize = max(px, 1.0);
  #include <fog_vertex>
}`;

const FRAG = `
uniform vec3 uColor;
uniform vec3 uLight;
uniform float uOpacity;
uniform int uMode;
uniform vec2 uDir;
varying float vAlpha;
varying float vPx;
varying float vGrain;
#include <fog_pars_fragment>
void main() {
  vec2 p = gl_PointCoord - 0.5;
  p.y = -p.y;
  float a = 0.0;
  vec3 col = uColor;
  if (uMode == 0) {
    float along = dot(p, uDir);
    float across = abs(dot(p, vec2(-uDir.y, uDir.x)));
    float w = max(0.75 / vPx, 0.015);
    a = (1.0 - smoothstep(w * 0.5, w, across)) * (1.0 - smoothstep(0.3, 0.5, abs(along)));
    a *= 0.45 + 0.55 * smoothstep(-0.5, 0.4, along);   // brighter at the head
  } else if (uMode == 1) {
    float d = length(p);
    a = 1.0 - smoothstep(0.22, 0.5, d);
    col = mix(vec3(0.80, 0.84, 0.90), uColor, 1.0 - smoothstep(0.05, 0.45, d));   // slightly grey edge so it shows on pale sand
  } else if (uMode == 2) {
    float d = length(p);
    if (d > 0.5) discard;
    vec3 nrm = vec3(p * 2.0, sqrt(max(0.0, 1.0 - 4.0 * d * d)));
    col *= 0.7 + 0.35 * max(0.0, dot(nrm, normalize(vec3(-0.4, 0.6, 0.7))));
    a = 1.0 - smoothstep(0.42, 0.5, d);
  } else if (vGrain > 0.5) {
    a = 1.0;                                            // a hard little square: a grain, not a glow
  } else {
    float d = length(p);
    a = exp(-d * d * 10.0);                             // haze puff: very faint, set by its alpha
  }
  a *= vAlpha * uOpacity;
  if (a < 0.004) discard;
  #ifdef LIT
    col *= uLight;
  #endif
  gl_FragColor = vec4(col, a);
  #ifdef LIT
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
  #endif
}`;

export const MODE = { streak: 0, dot: 1, ball: 2, haze: 3 };

export function makeMaterial(mode, color, opacity = 1, half = 75, lit = false) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, fog: lit, toneMapped: lit,
    defines: lit ? { LIT: 1 } : {},
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uColor: { value: new THREE.Color(color) }, uLight: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: opacity },
      uMode: { value: mode }, uDir: { value: new THREE.Vector2(0, -1) }, uScale: { value: 800 }, uMaxPx: { value: 256 },
      uHalf: { value: half }, uPR: { value: 1 }, uGrainSize: { value: mode === MODE.haze ? 5 : 0 },
    }]),
  });
  mat.userData.lit = lit;
  return mat;
}

// The scene's sky light and sun, found once (the sky module adds them).
let hemi = null, sun = null;
const _d = new THREE.Vector3();
function findLights(scene) {
  if (hemi && sun && hemi.parent && sun.parent) return;
  hemi = sun = null;
  scene.traverse(o => {
    if (o.isHemisphereLight && !hemi) hemi = o;
    if (o.isDirectionalLight && (!sun || o.intensity > sun.intensity)) sun = o;
  });
}

// Light on a grain: the sky light (half sky colour, half ground colour) plus some of the sun,
// more when the sun is high. Without lights in the scene the colour is used as it is.
function lightOf(scene, out) {
  findLights(scene);
  if (!hemi && !sun) return out.setRGB(1, 1, 1);
  out.setRGB(0, 0, 0);
  if (hemi) {
    out.r += (hemi.color.r + hemi.groundColor.r) * 0.5 * hemi.intensity;
    out.g += (hemi.color.g + hemi.groundColor.g) * 0.5 * hemi.intensity;
    out.b += (hemi.color.b + hemi.groundColor.b) * 0.5 * hemi.intensity;
  }
  if (sun && sun.visible) {
    _d.copy(sun.position).sub(sun.target.position).normalize();
    const k = sun.intensity * (0.25 + 0.45 * Math.max(0, _d.y));
    out.r += sun.color.r * k; out.g += sun.color.g * k; out.b += sun.color.b * k;
  }
  return out;
}

// Per frame, before drawing: pixels per world unit at distance 1, the drop direction on screen,
// and for dust the light it is in.
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _size = new THREE.Vector2();
let maxPx = 0;
export function updateMaterial(mat, renderer, camera, vel, scene) {
  if (!maxPx) {
    const gl = renderer.getContext();
    maxPx = Math.min(512, gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64);
  }
  renderer.getDrawingBufferSize(_size);
  const u = mat.uniforms, fov = camera.isPerspectiveCamera ? camera.fov : 45;
  u.uScale.value = _size.y / (2 * Math.tan(fov * Math.PI / 360));
  u.uMaxPx.value = maxPx;
  u.uPR.value = renderer.getPixelRatio();
  if (mat.userData.lit && scene) lightOf(scene, u.uLight.value);
  if (vel) {
    // project a short piece of the fall path around the camera's target area to screen pixels
    _a.set(0, 40, 0).project(camera);
    _b.set(vel.x * 0.02, 40 + vel.y * 0.02, vel.z * 0.02).project(camera);
    const dx = (_b.x - _a.x) * _size.x, dy = (_b.y - _a.y) * _size.y, L = Math.hypot(dx, dy);
    if (L > 1e-6) u.uDir.value.set(dx / L, dy / L);
  }
}
