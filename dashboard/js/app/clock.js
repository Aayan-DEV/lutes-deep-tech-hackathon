// The sim clock: a UTC date that moves at a chosen speed (sim seconds per real second).
// createClock({ date, speed, playing, min, max }) -> { date, speed, playing, step(dtReal, factor), setDate(d) }
export const DEFAULT_SPEED = 600;

export function createClock({ date = new Date(), speed = DEFAULT_SPEED, playing = true, min = null, max = null } = {}) {
  let ms = +date;
  const clock = {
    speed, playing, min, max, ended: false,
    get date() { return new Date(ms); },
    set date(d) { clock.setDate(d); },
    get ms() { return ms; },
    setDate(d) { const t = +d; if (Number.isFinite(t)) { ms = clamp(t); clock.ended = false; } },
    // dtReal: real seconds since the last frame. factor: extra speed (the night skip).
    step(dtReal, factor = 1) {
      if (!clock.playing) return;
      const next = ms + dtReal * clock.speed * factor * 1000;
      ms = clamp(next);
      if (clock.max != null && next >= clock.max) { clock.playing = false; clock.ended = true; }
    },
  };
  function clamp(t) {
    if (clock.min != null && t < clock.min) return clock.min;
    if (clock.max != null && t > clock.max) return clock.max;
    return t;
  }
  return clock;
}
