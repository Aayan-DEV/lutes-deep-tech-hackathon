// Small helpers shared by every part of the console.
export const $ = id => document.getElementById(id);
export const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const fmt = (x, d = 0) => (x == null || Number.isNaN(x) ? "–" : Number(x).toFixed(d));

const NS = "http://www.w3.org/2000/svg";
export function el(tag, attrs, parent, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  parent && parent.appendChild(e);
  return e;
}
// Only touch the DOM when the content really changed, so buttons stay clickable and nothing flickers.
export function setHTML(node, html) {
  if (node._html !== html) { node._html = html; node.innerHTML = html; }
}

// Watches whether an element is on screen, so hidden 3D views can skip drawing.
export function onScreen(node) {
  const state = { visible: true };
  new IntersectionObserver(([e]) => { state.visible = e.isIntersecting; }, { rootMargin: "100px" }).observe(node);
  return state;
}
