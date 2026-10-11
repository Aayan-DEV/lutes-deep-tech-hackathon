// The 4 light numbers on the 3D sensors: each light's name and the same number as its HUD tile
// (lights() in ../hud/lights.js), as a small pill pinned just above its sensor head. Amber while that
// light is lit. highlight(i) marks one light ("Cover this one", Sync up's light step), -1 none.
// Shown in Live and Simulation once the tracker is built and the camera is close.
// set(view) at HUD rate (10 a second) changes the text; frame() every frame moves the pills.
import { lights } from "../hud/lights.js";

const FAR = 520, GAP = 3;

export function createLightNums(canvas, tracker, camera) {
  const THREE = window.THREE, v = new THREE.Vector3(), root = new THREE.Vector3();
  const box = document.createElement("div"); box.className = "light-nums"; box.setAttribute("aria-hidden", "true");
  (canvas.parentNode.querySelector(".part-labels") || canvas).after(box);   // over the part names, under the HUD
  const NAMES = ["Top left", "Top right", "Bottom left", "Bottom right"];
  const items = tracker.lightAnchors.map((anchor, i) => {
    const el = document.createElement("span"); el.className = "light-num";
    el.innerHTML = `<small>${NAMES[i]}</small><b></b>`; box.appendChild(el);
    return { anchor, el, num: el.querySelector("b"), text: "", lit: null, x: 0, y: 0, w: 0, h: 0 };
  });
  let marked = -1;
  const order = [items[2], items[3], items[0], items[1]];   // the bottom (front) pair keeps its spot, the top pair moves
  let visible = false, showing = null;
  return {
    setVisible(on) { visible = on; },
    highlight(i) {
      if (i === marked) return;
      marked = i;
      items.forEach((it, k) => { it.el.classList.toggle("mark", k === i); it.el.querySelector("small").textContent = k === i ? "Cover this one" : NAMES[k]; it.w = 0; });
    },
    // view: what the HUD gets (simView / liveView): { d, ctx }
    set(view) {
      if (!view || !view.d || !view.d.raw) return;
      lights(view.d, view.ctx || {}).forEach((l, i) => {
        const it = items[i]; if (!it) return;
        const text = !l.ok ? "–" : l.scored ? String(l.pct) : l.pct + "%";
        if (text !== it.text) { it.num.textContent = text; it.text = text; it.w = 0; }   // measure again
        if (l.lit !== it.lit) { it.el.classList.toggle("lit", l.lit); it.lit = l.lit; }
      });
    },
    frame() {
      const W = canvas.clientWidth, H = canvas.clientHeight;
      tracker.group.getWorldPosition(root);
      const show = visible && tracker.built && camera.position.distanceTo(root) < FAR;
      if (show !== showing) { box.hidden = !show; showing = show; }
      if (!show) return;
      const placed = [];
      for (const it of order) {
        it.anchor.getWorldPosition(v); v.project(camera);
        const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
        it.el.hidden = !on; if (!on) continue;
        if (!it.w) { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; }
        // centred above the sensor; a pill that hits one placed before moves up past it (seen from
        // low down the far pair lands on the near pair)
        const r = { x: (v.x + 1) / 2 * W - it.w / 2, y: (1 - v.y) / 2 * H - it.h, w: it.w, h: it.h };
        for (let pass = 0; pass < 4; pass++) {
          let moved = false;
          for (const p of placed) if (r.x < p.x + p.w && p.x < r.x + r.w && r.y < p.y + p.h && p.y < r.y + r.h) { r.y = p.y - r.h - GAP; moved = true; }
          if (!moved) break;
        }
        placed.push(r);
        if (Math.abs(r.x - it.x) > 0.4 || Math.abs(r.y - it.y) > 0.4) {
          it.x = r.x; it.y = r.y; it.el.style.transform = `translate(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px)`;
        }
      }
    },
  };
}
