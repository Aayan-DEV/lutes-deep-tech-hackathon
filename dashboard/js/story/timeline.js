// Frame-driven timers for the story: wait, tween and "do this every frame for N seconds".
// Everything runs on story.frame(dt), so it pauses with the render loop. cancelAll() rejects
// every pending promise with a Cancelled error, so a chapter stops at its next await.

export class Cancelled extends Error { constructor() { super("story chapter cancelled"); this.name = "Cancelled"; } }
export const isCancel = e => e instanceof Cancelled;

export const easings = {
  linear: u => u,
  inOut: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  out: u => 1 - Math.pow(1 - u, 3),
  in: u => u * u * u,
  sine: u => 0.5 - 0.5 * Math.cos(Math.PI * u),
};

export function createTimeline() {
  let items = [];

  // Call fn(u /*0..1*/, dt) every frame for `seconds`, then resolve.
  function during(seconds, fn) {
    const p = new Promise((resolve, reject) => {
      items.push({ t: 0, dur: Math.max(0, seconds), fn, resolve, reject });
    });
    p.catch(() => {});   // no "unhandled rejection" noise when a chapter is cut short; awaiters still see it
    return p;
  }
  const wait = seconds => during(seconds, null);
  function tween(obj, prop, to, seconds, ease = "inOut") {
    const from = obj[prop], f = typeof ease === "function" ? ease : easings[ease] || easings.inOut;
    return during(seconds, u => { obj[prop] = from + (to - from) * f(u); });
  }
  function frame(dt) {
    if (!items.length) return;
    const now = items;
    items = [];
    const keep = [];
    for (const it of now) {
      it.t += dt;
      const u = it.dur > 0 ? Math.min(1, it.t / it.dur) : 1;
      if (it.fn) { try { it.fn(u, dt); } catch (e) { it.reject(e); continue; } }
      if (u >= 1) it.resolve(); else keep.push(it);
    }
    items = keep.concat(items);   // anything added during this frame starts next frame
  }
  function cancelAll() {
    const old = items;
    items = [];
    for (const it of old) it.reject(new Cancelled());
  }
  return { during, wait, tween, frame, cancelAll, get size() { return items.length; } };
}

// Wrap an object so every method call throws Cancelled once token.cancelled is true, and every
// promise a method returns rejects if the chapter was cancelled while it was pending.
// THREE objects pass through untouched (scene.add needs the real object).
export function guard(target, token, depthKeys = []) {
  if (!target || typeof target !== "object") return target;
  const check = () => { if (token.cancelled) throw new Cancelled(); };
  return new Proxy(target, {
    get(t, k) {
      const v = Reflect.get(t, k);
      if (typeof v === "function") {
        return (...args) => {
          check();
          const r = v.apply(t, args);
          if (!r || typeof r.then !== "function") return r;
          const p = r.then(x => { check(); return x; });
          p.catch(() => {});
          return p;
        };
      }
      if (depthKeys.includes(k)) return guard(v, token);
      return v;
    },
  });
}
