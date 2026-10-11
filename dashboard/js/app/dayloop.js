// One day on repeat. The Simulation (and the pretend sun in Live) plays one clear day at a place,
// from dawn to dusk, at a speed picked as "how long a day takes". The night is skipped in NIGHT_S
// real seconds (the sky goes dark and comes back), then the clock steps back 24 hours, so the
// same date plays again from dawn.
//
//   const day = createDayLoop(clock);
//   day.setPlace(geo, at)      the day for a place; at: optional {hh, mm} local start time
//   day.setSpeed("90s")        one of DAY_SPEEDS
//   clock.step(dt, day.factor()); day.wrap();     each frame
import { sunAt, localToUtc } from "../sim/daysim_sun.js";

export const DAY_SPEEDS = [
  { id: "4m", name: "1 day = 4 min", realS: 240 },
  { id: "90s", name: "90 s", realS: 90 },
  { id: "30s", name: "30 s", realS: 30 },
];
export const DEFAULT_DAY_SPEED = "90s";
export const NIGHT_S = 3;            // real seconds for the whole night
const EDGE_EL = -4;                  // the day runs from the sun 4 degrees under the horizon to the same at dusk
const DAY = 864e5, SCAN_MS = 120e3;
// The clear day each place plays (all three: midsummer, the longest day).
const DAY_DATE = { cholistan: [2024, 6, 21], thar: [2024, 6, 21], gobi: [2024, 6, 21] };

export function createDayLoop(clock) {
  let rise = 0, set = 0, speedId = DEFAULT_DAY_SPEED;
  const night = () => clock.ms < rise || clock.ms >= set;

  const day = {
    get speedId() { return speedId; },
    get rise() { return rise; },
    get set() { return set; },
    get night() { return night(); },
    setPlace(geo, at = null) {
      const [y, m, d] = DAY_DATE[geo.id] || [2024, 6, 21];
      const midnight = localToUtc(y, m, d, 0, 0, geo.utcOffsetS);
      rise = midnight + 6 * 3600e3; set = midnight + 18 * 3600e3;   // in case the scan finds nothing
      let prev = sunAt(midnight, geo).el;
      for (let t = midnight + SCAN_MS; t <= midnight + DAY; t += SCAN_MS) {
        const el = sunAt(t, geo).el;
        if (prev < EDGE_EL && el >= EDGE_EL) rise = t;
        if (prev >= EDGE_EL && el < EDGE_EL) set = t;
        prev = el;
      }
      clock.min = null; clock.max = null; clock.ended = false;
      clock.setDate(at ? localToUtc(y, m, d, at.hh, at.mm, geo.utcOffsetS) : rise + 1.5 * 3600e3);
      day.setSpeed(speedId);
    },
    // the clock's speed: the time from dawn to dusk takes realS real seconds
    setSpeed(id) {
      const s = DAY_SPEEDS.find(x => x.id === id) || DAY_SPEEDS.find(x => x.id === DEFAULT_DAY_SPEED);
      speedId = s.id; clock.speed = Math.max(1, (set - rise) / 1000 / s.realS);
    },
    // extra speed for this frame: 1 by day, by night enough to cross it in NIGHT_S seconds
    factor() {
      if (!night()) return 1;
      return (rise + DAY - set) / 1000 / NIGHT_S / clock.speed;
    },
    // past the next dawn: back to the same date. Returns true when it wrapped.
    wrap() {
      if (clock.ms < rise + DAY) return false;
      clock.setDate(clock.ms - DAY);
      return true;
    },
  };
  return day;
}
