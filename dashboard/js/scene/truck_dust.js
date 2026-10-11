// A dust trail behind the truck's back wheels: up to 90 soft puffs in one THREE.Points (one draw
// call). Puffs rise a little, grow and fade. createDust(scene) -> { emit(x, y, z, scale), frame(dt), remove(), clear() }

const N = 90, LIFE = 1.8;

const VERT = `
attribute float aSize; attribute float aAlpha;
varying float vAlpha;
uniform float uScale;
void main() {
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(1.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = dot(c, c) * 4.0;
  if (r > 1.0) discard;
  float a = vAlpha * (1.0 - r) * (1.0 - r);
  gl_FragColor = vec4(uColor, a);
}`;

export function createDust(scene, color = 0xd6c19c) {
  const THREE = window.THREE;
  const pos = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N);
  const vel = new Float32Array(N * 3), age = new Float32Array(N).fill(LIFE), base = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uScale: { value: 1170 } },
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false; pts.renderOrder = 4;
  let next = 0, live = 0, added = false;

  return {
    // one puff at a world point; s is the truck's scale
    emit(x, y, z, s = 1) {
      if (!added) { scene.add(pts); added = true; }
      const i = next; next = (next + 1) % N;
      pos[i * 3] = x + (Math.random() - 0.5) * 3 * s; pos[i * 3 + 1] = y + Math.random() * s; pos[i * 3 + 2] = z + (Math.random() - 0.5) * 3 * s;
      vel[i * 3] = (Math.random() - 0.5) * 6 * s; vel[i * 3 + 1] = (3 + Math.random() * 5) * s; vel[i * 3 + 2] = (Math.random() - 0.5) * 6 * s;
      age[i] = 0; base[i] = (5 + Math.random() * 4) * s;
      live = N;
    },
    frame(dt) {
      if (!live) return;
      let any = 0;
      for (let i = 0; i < N; i++) {
        if (age[i] >= LIFE) { alpha[i] = 0; continue; }
        age[i] += dt; any++;
        const u = Math.min(1, age[i] / LIFE);
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        vel[i * 3 + 1] *= 1 - 1.5 * dt;
        size[i] = base[i] * (1 + 2.6 * u);
        alpha[i] = 0.42 * Math.min(1, u * 6) * (1 - u);
      }
      geo.attributes.position.needsUpdate = geo.attributes.aSize.needsUpdate = geo.attributes.aAlpha.needsUpdate = true;
      if (!any) live = 0;
    },
    setColor(c) { mat.uniforms.uColor.value.set(c); },
    setViewport(h) { mat.uniforms.uScale.value = h * 1.3; },
    clear() { age.fill(LIFE); alpha.fill(0); geo.attributes.aAlpha.needsUpdate = true; live = 0; },
    remove() { this.clear(); if (added) { scene.remove(pts); added = false; } },
  };
}
