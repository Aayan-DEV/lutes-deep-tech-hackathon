// Camera spots and eased camera moves for scene.lookAt. Units: cm, the tracker at the origin
// (+x east, +z south, +y up), drawn 1.6 times its real size (scene.js TRACKER_SCALE).
// A drag or a wheel turn by the user stops a move at once.
// The cell centre sits about 28 to 34 up (the rebuilt, taller tracker, about 33 to the top plate):
// close, panel, dust and front aim near it, a bit further back so the whole tracker fits.
// "close" is the default view: the tracker fills about half the screen height at 1440 x 900, with
// the right column of cards beside it (scene.js shifts the picture's centre left of the cards).
export const PRESETS = {
  wide:    { pos: [240, 112, 336], target: [0, 19, 0] },   // the tracker small in the desert
  close:   { pos: [82, 51, 110], target: [4, 27, 0] },      // the default view
  panel:   { pos: [14, 88, 49], target: [0, 30, 3] },      // from above the panel face
  sky:     { pos: [-38, 16, -102], target: [16, 112, 192] }, // behind the tracker, looking up at the sun's path
  dust:    { pos: [21, 63, 41], target: [0, 30, 5] },      // close on the panel and the 4 lights
  numbers: { pos: [-112, 54, 160], target: [22, 19, 0] },  // the tracker off to the left, room for cards
  front:   { pos: [0, 36, 120], target: [0, 26, 0] },       // straight from the front: the panel faces you at pan 0
};

const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

export function createCameraMover(camera, controls) {
  const THREE = window.THREE;
  let move = null;
  const stop = () => { if (move) { move.resolve(false); move = null; } };
  controls.addEventListener("start", stop);
  return {
    get moving() { return !!move; },
    stop,
    // spec: {pos, target} as arrays or THREE.Vector3. Resolves true when it got there.
    go(spec, seconds = 1.6) {
      if (!spec) return Promise.resolve(false);
      const v = a => (a && a.isVector3 ? a.clone() : new THREE.Vector3(...a));
      const to = { pos: v(spec.pos), target: v(spec.target) };
      if (move) move.resolve(false);
      if (!(seconds > 0)) { camera.position.copy(to.pos); controls.target.copy(to.target); controls.update(); move = null; return Promise.resolve(true); }
      return new Promise(resolve => {
        move = { from: { pos: camera.position.clone(), target: controls.target.clone() }, to, t: 0, dur: seconds, resolve };
      });
    },
    frame(dt) {
      if (!move) return;
      move.t = Math.min(move.dur, move.t + dt);
      const e = ease(move.t / move.dur);
      camera.position.lerpVectors(move.from.pos, move.to.pos, e);
      controls.target.lerpVectors(move.from.target, move.to.target, e);
      if (move.t >= move.dur) { const m = move; move = null; m.resolve(true); }
    },
  };
}
