// Looking around, on top of three.js r128 OrbitControls (left drag turns, right drag pans, a touch
// screen pinches and pans with two fingers):
// - The wheel and a trackpad pinch zoom toward the point under the cursor, eased over a few frames.
//   r128 has no zoomToCursor, so this catches the wheel before OrbitControls sees it.
// - The browser's own page zoom is blocked on the whole page (a trackpad pinch arrives as a wheel
//   event with ctrlKey set; Safari also sends gesture events). A plain wheel over the HUD cards
//   still scrolls them and never turns the 3D.
// - Soft limits: never under the ground, at most 85 degrees from straight up, the look-at point
//   springs back to within 1.5 m of the tracker.
// - Double click on empty ground: fly back to the default distance around the tracker, same angle.
// createOrbit({ canvas, camera, controls, mover, groundAt(x, z), center(outVec3), home() -> {target, dist}, partAt(x, y) })
//   -> { before(dt) (the eased zoom, before controls.update), after(dt) (the limits), zoomAt(x, y, amount) }
export const PAN_LIMIT = 150, MAX_POLAR_DEG = 85, MIN_DIST = 30, MAX_DIST = 450;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function createOrbit({ canvas, camera, controls, mover, groundAt, center, home, partAt }) {
  const THREE = window.THREE;
  Object.assign(controls, {
    enableDamping: true, dampingFactor: 0.09, rotateSpeed: 0.7, panSpeed: 0.9, zoomSpeed: 0.9,
    minDistance: MIN_DIST, maxDistance: MAX_DIST, minPolarAngle: 0.05, maxPolarAngle: MAX_POLAR_DEG * Math.PI / 180, screenSpacePanning: true,
  });
  const ray = new THREE.Raycaster(), cursor = new THREE.Vector2(), fwd = new THREE.Vector3(), P = new THREE.Vector3();
  const c = new THREE.Vector3(), off = new THREE.Vector3();
  let zoomAcc = 0, gestureScale = 1;

  function aim(x, y) {
    const r = canvas.getBoundingClientRect();
    cursor.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  }
  // amount: log of the distance factor (positive = out). Many small turns add up, capped.
  function addZoom(x, y, amount) { aim(x, y); zoomAcc = clamp(zoomAcc + clamp(amount, -0.6, 0.6), -1.6, 1.6); mover.stop(); }

  window.addEventListener("wheel", e => {
    if (e.target !== canvas) { if (e.ctrlKey) e.preventDefault(); return; }   // HUD: scrolls as usual, a pinch does nothing
    e.preventDefault(); e.stopPropagation();   // OrbitControls never sees it, the page never zooms
    const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    addZoom(e.clientX, e.clientY, px * (e.ctrlKey ? 0.012 : 0.0016));
  }, { passive: false, capture: true });
  // Safari: a trackpad pinch comes as gesture events; turn it into the same zoom over the 3D
  const onGesture = e => {
    e.preventDefault();
    if (e.type === "gesturestart") gestureScale = 1;
    else if (e.type === "gesturechange" && e.target === canvas && e.scale > 0) { addZoom(e.clientX, e.clientY, -Math.log(e.scale / gestureScale)); gestureScale = e.scale; }
  };
  for (const t of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(t, onGesture, { passive: false });

  canvas.addEventListener("dblclick", e => {
    if (partAt(e.clientX, e.clientY)) return;   // a part: the click already picked it
    const h = home(), dir = camera.position.clone().sub(controls.target).normalize();
    mover.go({ pos: h.target.clone().addScaledVector(dir, h.dist), target: h.target }, 0.9);
  });

  // Scale the camera's distance by k around the point under the cursor (at the look-at depth):
  // that point stays put on the screen while everything grows or shrinks around it.
  function zoomBy(k) {
    const tgt = controls.target, dist = camera.position.distanceTo(tgt);
    const nd = clamp(dist * k, controls.minDistance, controls.maxDistance);
    if (Math.abs(nd - dist) < 1e-3) { zoomAcc = 0; return; }   // at a limit: drop the rest
    k = nd / dist;
    camera.updateMatrixWorld(); ray.setFromCamera(cursor, camera); camera.getWorldDirection(fwd);
    P.copy(ray.ray.origin).addScaledVector(ray.ray.direction, dist / Math.max(0.25, ray.ray.direction.dot(fwd)));
    camera.position.sub(P).multiplyScalar(k).add(P);
    tgt.sub(P).multiplyScalar(k).add(P);
  }

  return {
    zoomAt(x, y, amount) { addZoom(x, y, amount); },   // for tests
    get pendingZoom() { return zoomAcc; },
    // Before controls.update(): the eased zoom. After it: the limits.
    before(dt) {
      if (Math.abs(zoomAcc) < 1e-4) { zoomAcc = 0; return; }
      const step = zoomAcc * (1 - Math.exp(-dt * 14));
      zoomAcc -= step; zoomBy(Math.exp(step));
    },
    after(dt) {
      const tgt = controls.target; center(c);
      off.set(tgt.x - c.x, 0, tgt.z - c.z);
      const L = off.length();
      if (L > PAN_LIMIT) {   // spring back toward the limit: soft, not a wall
        const back = off.multiplyScalar(-(L - PAN_LIMIT) / L * Math.min(1, dt * 8));
        tgt.add(back); camera.position.add(back);
      }
      const y = clamp(tgt.y, c.y, c.y + 90);
      if (y !== tgt.y) { camera.position.y += y - tgt.y; tgt.y = y; }
      const g = (groundAt(camera.position.x, camera.position.z) || 0) + 4;
      if (camera.position.y < g) camera.position.y = g;
    },
  };
}
