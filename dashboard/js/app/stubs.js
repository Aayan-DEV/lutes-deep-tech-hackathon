// Stand-ins for the scene parts other modules supply (terrain, sky, props, particles, people,
// truck). scene.js uses them until the real module loads, or for good if it is missing or broken,
// so the page always runs: a flat sand plane, a plain sky colour, no particles, nobody around.
import { REGIONS } from "../sun.js";

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const noop = () => {};

export function stubTerrain(scene) {
  const THREE = window.THREE;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(4000, 64), new THREE.MeshStandardMaterial({ color: 0xd9c19a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.name = "stub-ground"; scene.add(ground);
  return {
    stub: true, ground, heightAt: () => 0, frame: noop, setSun: noop,
    setRegion(id) { const r = REGIONS.find(x => x.id === id); if (r) ground.material.color.set(r.sand); },
    dispose() { scene.remove(ground); ground.geometry.dispose(); },
  };
}

export function stubSky(scene) {
  const THREE = window.THREE, day = new THREE.Color(0xbcd6ee), dusk = new THREE.Color(0xe9b48a), night = new THREE.Color(0x101a33);
  const grey = new THREE.Color(0xb8bec6), sand = new THREE.Color(0xd8b98a);
  const bg = new THREE.Color(0xbcd6ee), fog = new THREE.Fog(0xbcd6ee, 900, 4200);
  scene.background = bg; scene.fog = fog;
  const hemi = new THREE.HemisphereLight(0xdfeeff, 0xd9b07a, 0.6); scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xfff3df, 1.0); sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 500 });
  sunLight.shadow.bias = -0.0006; sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight); scene.add(sunLight.target);
  let el = 40, cloud = 0, dust = 0;
  function paint() {
    const c = bg;
    c.copy(night).lerp(dusk, smooth(-8, 2, el)).lerp(day, smooth(2, 20, el)).lerp(grey, 0.6 * cloud).lerp(sand, 0.7 * dust);
    fog.color.copy(c); fog.far = 4200 - 3400 * dust; fog.near = 900 - 800 * dust;
    const sunK = smooth(-1, 8, el) * (1 - 0.75 * cloud) * (1 - 0.6 * dust);
    sunLight.intensity = 1.05 * sunK; sunLight.castShadow = sunK > 0.15;
    hemi.intensity = 0.12 + 0.5 * smooth(-8, 10, el);
  }
  return {
    stub: true, sunLight, hemi, frame: noop,
    setSun(e) { el = e; paint(); },
    setWeather(s) { cloud = s ? Math.max(0, Math.min(1, s.cloud || 0)) : 0; dust = s ? Math.max(0, Math.min(1, s.dust || 0)) : 0; paint(); },
    dispose() { scene.remove(hemi, sunLight, sunLight.target); if (scene.background === bg) scene.background = null; if (scene.fog === fog) scene.fog = null; },
  };
}

export const stubProps = () => ({ stub: true, setRegion: noop, setWind: noop, frame: noop });
export const stubParticles = () => ({ stub: true, set: noop, frame: noop });
export const stubPeople = () => ({ stub: true, spawn: noop, walkTo: () => Promise.resolve(), carry: noop, act: noop, frame: noop, remove: noop });
export const stubTruck = () => ({ stub: true, driveTo: () => Promise.resolve(), openBack: noop, closeBack: noop, frame: noop, remove: noop });
