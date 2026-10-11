// Sky dome and star shaders, plus the colour table the sky blends between as the sun moves.
import { HAZE_GLSL } from "./sky_haze.js";

// Colours at key sun heights (degrees). Between two keys everything blends smoothly.
// zen: straight up, hor: at the horizon, glow: warm light around the sun, sun: sunlight colour,
// sunI: sunlight strength, hemi / hemiC: soft sky light strength and colour, cloud: lit cloud colour.
export const SKY_KEYS = [
  { e: -18, zen: 0x02050f, hor: 0x060b1a, glow: 0x000000, sun: 0x000000, sunI: 0,    hemi: 0.42, hemiC: 0x6a80c4, cloud: 0x0b0f1a },
  { e: -12, zen: 0x050c24, hor: 0x0f1a3a, glow: 0x000000, sun: 0x000000, sunI: 0,    hemi: 0.42, hemiC: 0x6e84c4, cloud: 0x121a2c },
  { e: -6,  zen: 0x112150, hor: 0x46466e, glow: 0x7a4058, sun: 0x000000, sunI: 0,    hemi: 0.42, hemiC: 0x7a8ac0, cloud: 0x2e3048 },
  { e: -2.5, zen: 0x1f3676, hor: 0x93687a, glow: 0xc8603c, sun: 0xff6a30, sunI: 0,   hemi: 0.44, hemiC: 0x9890b4, cloud: 0x76566a },
  { e: 0.5, zen: 0x30539a, hor: 0xcf9d88, glow: 0xff8434, sun: 0xff8a40, sunI: 0.58, hemi: 0.45, hemiC: 0xc0a8b0, cloud: 0xdc9670 },
  { e: 5,   zen: 0x3e6cb4, hor: 0xe2bf9e, glow: 0xffa858, sun: 0xffb070, sunI: 0.82, hemi: 0.46, hemiC: 0xccc2c8, cloud: 0xf2cdb0 },
  { e: 12,  zen: 0x4a80c6, hor: 0xd6dadb, glow: 0xffd49a, sun: 0xffdcb0, sunI: 0.74, hemi: 0.42, hemiC: 0xc8d6ea, cloud: 0xf6eee4 },
  { e: 30,  zen: 0x4e88d0, hor: 0xc6daea, glow: 0xffefd6, sun: 0xfff1de, sunI: 0.8,  hemi: 0.42, hemiC: 0xd0def0, cloud: 0xfafaf8 },
  { e: 90,  zen: 0x4280d0, hor: 0xbcd6ee, glow: 0xfff6ea, sun: 0xfff8ee, sunI: 0.82, hemi: 0.42, hemiC: 0xd4e2f2, cloud: 0xffffff },
];

export const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  // centred on the camera, drawn at the far depth, so it never clips and never moves
  vec4 p = projectionMatrix * vec4((viewMatrix * vec4(position, 0.0)).xyz, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.99999, p.w);
}`;

export const SKY_FRAG = /* glsl */`
uniform vec3 uZenith; uniform vec3 uSunCol; uniform float uSunSize; uniform float uSunVis;
uniform float uHazeH; uniform float uCloud; uniform float uTime;
uniform vec3 uCloudCol; uniform vec3 uCloudDark;
varying vec3 vDir;
${HAZE_GLSL}
float kHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float kNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(kHash(i), kHash(i + vec2(1.0, 0.0)), u.x), mix(kHash(i + vec2(0.0, 1.0)), kHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float kFbm(vec2 p) { return kNoise(p) * 0.55 + kNoise(p * 2.1 + 3.7) * 0.3 + kNoise(p * 4.3 - 1.3) * 0.15; }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 hz = hazeColor(d);
  float t = pow(clamp(h, 0.0, 1.0), uHazeH);          // 0 at the horizon, 1 straight up
  vec3 col = mix(hz, uZenith, t);
  float s = max(dot(d, uHazeSun), 0.0);
  float above = smoothstep(-0.004, 0.006, h);
  col += uGlowCol * uGlowK * (pow(s, 90.0) * 0.55 + pow(s, 7.0) * 0.16) * (1.0 - 0.5 * t) * above;
  // clouds: a noise layer projected on a flat ceiling; more cover with more cloud
  if (uCloud > 0.02 && h > 0.0) {
    vec2 uv = d.xz / (h + 0.15) * 1.4 + vec2(uTime * 0.006, uTime * 0.0025);
    float n = kFbm(uv);
    float dens = smoothstep(1.02 - uCloud, 1.32 - uCloud * 0.85, n);
    dens = mix(dens, 0.9 + 0.1 * n, smoothstep(0.82, 1.0, uCloud));        // overcast: a full grey lid
    dens *= smoothstep(0.0, 0.18, h);                                       // fade into the haze low down
    float lit = clamp(0.45 + (n - 0.5) * 1.4 + pow(s, 4.0) * 0.4, 0.0, 1.0);
    col = mix(col, mix(uCloudDark, uCloudCol, lit), dens * 0.95);
  }
  // the sun disc with a soft rim
  float cd = dot(d, uHazeSun);
  float disc = smoothstep(cos(uSunSize * 1.25), cos(uSunSize), cd) * above * uSunVis;
  if (uCloud > 0.02 && h > 0.0) disc *= 1.0 - smoothstep(0.55, 0.95, uCloud);
  col = mix(col, uSunCol, clamp(disc, 0.0, 1.0));
  // a tiny random offset per pixel hides colour banding in the smooth gradient
  col += (kHash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

export const STAR_VERT = /* glsl */`
attribute float aSize; attribute float aPhase;
uniform float uTime; uniform float uStars;
varying float vA;
void main() {
  vec4 p = projectionMatrix * vec4((viewMatrix * vec4(position, 0.0)).xyz, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.99998, p.w);
  float tw = 0.75 + 0.25 * sin(uTime * (1.5 + aPhase) + aPhase * 20.0);
  vA = uStars * tw * smoothstep(0.02, 0.2, normalize(position).y);
  gl_PointSize = aSize;
}`;

export const STAR_FRAG = /* glsl */`
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = vA * (1.0 - smoothstep(0.15, 0.5, length(c)));
  gl_FragColor = vec4(vec3(0.92, 0.95, 1.0), a);
}`;
