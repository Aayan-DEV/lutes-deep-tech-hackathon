// Clicking and hovering the tracker's parts, all through the canvas: first the name pills
// (labels.hit, the pills themselves never catch the mouse), then a ray into the 3D (tracker.pickAt).
// Hover: a pointer cursor, the pill turns amber and a faint amber box shows around the part.
// createPointer({ canvas, tracker, labels, scene, onPick }) -> { partAt(x, y), pick(id), select(id), frame() }
const PART_OBJ = { light: "sensor" };   // pick ids to tracker.parts names, where they differ

export function createPointer({ canvas, tracker, labels, scene, onPick }) {
  const THREE = window.THREE;
  const glow = new THREE.BoxHelper(undefined, 0xf59e0b);
  Object.assign(glow.material, { transparent: true, opacity: 0.45, depthTest: false });
  glow.renderOrder = 8; glow.visible = false; scene.add(glow);
  let down = null, hover = null, selected = null, lastMove = 0;

  const ndcOf = (x, y) => { const r = canvas.getBoundingClientRect(); return [((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1]; };
  const partAt = (x, y) => labels.hit(x, y) || tracker.pickAt(...ndcOf(x, y));
  const objOf = id => id && tracker.parts && tracker.parts[PART_OBJ[id] || id];
  const select = id => { selected = id || null; tracker.select(selected); };   // no onPick: for the app
  function pick(id) { select(id); onPick && onPick(selected); }
  function setHover(id) {
    if (id === hover) return;
    hover = id; canvas.style.cursor = id ? "pointer" : "";
  }

  canvas.addEventListener("pointerdown", e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener("click", e => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;   // a drag, not a click
    pick(partAt(e.clientX, e.clientY));
  });
  canvas.addEventListener("pointermove", e => {
    if (e.buttons) { setHover(null); return; }
    const now = performance.now();
    if (now - lastMove < 60) return;
    lastMove = now; setHover(partAt(e.clientX, e.clientY));
  });
  canvas.addEventListener("pointerleave", () => setHover(null));

  return {
    partAt, pick, select,
    frame() {
      if (!tracker.built) { setHover(null); }
      labels.setState(hover, selected);
      const obj = hover && hover !== selected ? objOf(hover) : null;
      glow.visible = !!obj;
      if (obj) glow.setFromObject(obj);
    },
  };
}
