// A tiny event bus: the HUD says what the user asked for, the app listens.
export function createBus() {
  const map = new Map();
  return {
    on(name, fn) { if (!map.has(name)) map.set(name, new Set()); map.get(name).add(fn); return () => map.get(name).delete(fn); },
    emit(name, ...args) { for (const fn of map.get(name) || []) { try { fn(...args); } catch (e) { console.error(`bus "${name}"`, e); } } },
  };
}
