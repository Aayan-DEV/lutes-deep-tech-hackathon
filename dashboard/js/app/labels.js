// The 4 part names (Solar panel, Light sensor, Small motor, Big motor) as HTML pills over the
// canvas. Each frame: project each part's anchor to the screen, then lay them out in that fixed
// order so no two ever overlap: a pill that hits one placed before it moves down by the overlap
// plus 6 px (the Big motor moves up instead, it sits at the bottom).
// The pills never catch the mouse (pointer-events: none), so the wheel, a pinch and drags over a
// pill reach the 3D. Clicks and hovers go through the canvas: pointer.js asks hit(x, y) which pill
// is under the mouse. Hidden while the tracker is being built (story) and when the camera is far.
const GAP = 6, FAR = 520, SLOP = 3;

export function createLabels(canvas, tracker, camera) {
  const THREE = window.THREE, v = new THREE.Vector3(), root = new THREE.Vector3();
  const box = document.createElement("div"); box.className = "part-labels"; box.setAttribute("aria-hidden", "true"); canvas.after(box);   // under the HUD
  const items = tracker.labels.map(l => {
    const el = document.createElement("span");
    el.className = "part-label"; el.textContent = l.text; el.dataset.id = l.id;
    box.appendChild(el);
    return { ...l, el, w: 0, h: 0, shown: null, x: 0, y: 0 };
  });
  let visible = true, showing = null, hover = null, selected = null;
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const measure = () => items.forEach(it => { it.w = 0; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);   // Inter arrives late: measure again

  return {
    setVisible(on) { visible = on; },
    // hover / selected: part ids or null. Only touches the DOM when they change.
    setState(h, s) {
      if (h === hover && s === selected) return;
      hover = h; selected = s;
      for (const it of items) { it.el.classList.toggle("hover", it.id === hover); it.el.classList.toggle("on", it.id === selected); }
    },
    // The part whose pill is under this point (client px), or null.
    hit(x, y) {
      if (!showing) return null;
      for (const it of items) if (it.shown && x >= it.x - SLOP && x <= it.x + it.w + SLOP && y >= it.y - SLOP && y <= it.y + it.h + SLOP) return it.id;
      return null;
    },
    frame() {
      const W = canvas.clientWidth, H = canvas.clientHeight;
      tracker.group.getWorldPosition(root);
      const show = visible && tracker.built && camera.position.distanceTo(root) < FAR;
      if (show !== showing) { box.hidden = !show; showing = show; }
      if (!show) return;
      const placed = [];
      for (const it of items) {
        if (!it.w) { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; }
        it.anchor.getWorldPosition(v); v.project(camera);
        const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
        if (!on) { if (it.shown !== false) { it.el.hidden = true; it.shown = false; } continue; }
        const r = { x: (v.x + 1) / 2 * W - it.w / 2, y: (1 - v.y) / 2 * H - it.h / 2, w: it.w, h: it.h };
        const up = it.id === "bigMotor";
        for (let pass = 0; pass < 4; pass++) {   // a move can create a new hit: re-check a few times
          let moved = false;
          for (const p of placed) if (overlap(r, p)) { r.y = up ? p.y - r.h - GAP : p.y + p.h + GAP; moved = true; }
          if (!moved) break;
        }
        placed.push(r);
        if (it.shown !== true) { it.el.hidden = false; it.shown = true; }
        if (Math.abs(r.x - it.x) > 0.4 || Math.abs(r.y - it.y) > 0.4) {   // no DOM write unless it moved
          it.x = r.x; it.y = r.y; it.el.style.transform = `translate(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px)`;
        }
      }
    },
  };
}
