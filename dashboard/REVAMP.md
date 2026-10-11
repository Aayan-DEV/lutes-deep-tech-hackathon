# Solar tracker: full-screen revamp (contract for all modules)

Read this whole file before writing code. Several people (agents) build modules in parallel against
these interfaces. Only touch the files assigned to you. Do not commit. Do not edit `index.html`,
`main.js` or `css/console.css`: the old page keeps working as the fallback until the swap.

## What we are building

A full-screen 3D page `dashboard/game.html` with a thin overlay (HUD). Three modes:

1. **Story**: a short, skippable, narrated (text cards) story. A desert, a truck with people arrives,
   they build the tracker, drive away, the tracker works through days, seasons and weather.
   It explains, in plain words, why 2 axes (the sun's daily arc needs 1 axis, the slow seasonal
   drift of its noon height needs the 2nd), the cosine loss (light hitting at an angle counts less),
   and dust (blocked lights, the back-and-forth cleaning).
2. **Simulation**: replays **real hourly weather** for 2023, 2024 and 2025 at one of 3 real places,
   with the date on screen. Clouds, rain, snow, hail, wind and dust storms are drawn as particles
   and land on the panel. The tracker reacts the same way the Arduino would.
3. **Live**: the real Arduino over Web Serial. Same 3D, real light values, real motors. A
   "Simulate dust" button runs the cleaning routine on the real board.

Not photoreal: believable and smooth. 60 fps on a laptop with the page full screen.

## Hard rules (from the user)

- Plain words everywhere. No jargon in the UI. No em dashes anywhere (not in UI, not in comments).
- Light mode only. Inter font. 4 px corner radius. Amber accent `#f59e0b`. Cool greys. No blur glow.
- Icons: Hugeicons subset in `js/icons.js` (`hi(name)`), add names there if you need new ones.
- Simple HUD: only the 4 lights, the solar panel (watts, energy), the big and small motor, the date,
  the weather and the mode. Nothing else. No raw data.
- The big motor is always connected now. Remove every "big motor connected" switch idea.
- No god files. Split anything over about 350 lines.
- No build step. ES modules under `dashboard/js/`. three.js **r128** is a global `THREE` (loaded by
  `<script>` from cdnjs) plus `THREE.OrbitControls` from the r128 examples. Do not change versions.
- Everything must still work from `python3 dashboard/serve.py` (port 8766) and a hard refresh.
- The firmware and `js/logic.js` must stay exact mirrors (the parity harness in the scratchpad
  replays JS traces through the compiled `.ino`). Any logic change goes in both.

## Existing code you can reuse (read before building)

- `js/sun.js`: REGIONS (cholistan, thar, gobi with lat), `sunPosition(lat, dayOfYear, hour)`
  returns `{el, az}` compass degrees, `toModelAz(compassAz, lat)` to the tracker's pan frame
  (front faces the equator), `clearSky`, `fmtHour`, `partOfDay`.
- `js/logic.js`: the Arduino's brain in JS (`createController`, `CFG`, `TL/TR/BL/BR`).
- `js/world.js`: LDR physics (`countsAt`, `panelW`, `panelFrame`, `dirFrom`), cell model.
- `js/sim.js`: the old single-day simulation (SUN_MODE controller settings, night rest, energy
  tracker vs fixed vs ideal). The new multi-day sim replaces it but copies the ideas.
- `js/model3d.js` + `js/parts3d.js` + `js/desert3d.js`: the current tracker model, labels, old desert.
- `js/panels.js`: light tiles with the dither field (`lights()`), `torchScore`.
- `js/dither.js`, `js/icons.js`, `js/util.js`, `js/serial.js` (Web Serial), `js/pretend.js`
  (real motors follow the simulated sun), `js/lightsetup.js`.
- `firmware/tracker/tracker.ino` (630 lines, v4), serial commands in the header comment.

## Coordinate frames (do not break these)

- World units: 1 unit = 1 cm. Tracker base is near the origin, on the ground plane y = 0.
- Tracker model: pan 0 = facing the front mark = facing the equator (south in the north). Pan
  positive turns toward the east side (check `toModelAz`). Tilt is the SG-90 angle: 90 = panel flat
  (facing up), 180 = facing the front fully (horizon), lower = tipped back. TILT_UP = 90.
- Sun: `{el, az}` compass (az 0 = north, 90 = east). Scene lights and sky use compass az.
  The scene's +x axis is east, +z is south, +y is up. Compass letters already exist in desert3d.

## File ownership

| Owner | Files (create or edit only these) |
|---|---|
| A: terrain | `js/scene/regions.js`, `js/scene/terrain.js`, `js/scene/sky.js`, `js/scene/props.js`, `dev/terrain.html` |
| B: weather | `tools/fetch_weather.py`, `data/weather/*.json`, `js/weather/weather.js`, `js/weather/events.js`, `js/scene/particles.js`, `dev/weather.html` |
| C: dust | `js/sim/soiling.js`, `js/logic.js` (dust detection only), `firmware/tracker/tracker.ino`, `wokwi/sketch.ino`, `tests/soiling_test.mjs`, parity files in the scratchpad |
| D: story | `js/scene/people.js`, `js/scene/truck.js`, `js/story/story.js`, `js/story/script.js`, `dev/story.html` |
| E: shell | `game.html`, `css/game.css`, `js/app/*.js`, `js/hud/*.js`, `js/scene/scene.js`, `js/scene/tracker.js`, `js/sim/daysim.js` |

`dev/*.html` are standalone test pages for one module each, served by the same server
(`http://localhost:8766/dev/terrain.html`). They may use a flat ground and fake data.

## Shared interfaces

### Region (A owns the look, B owns the weather)

```js
// js/scene/regions.js
export const REGION_LOOK = {
  cholistan: { ... }, thar: { ... }, gobi: { ... }   // colours, dune params, props, horizon, haze
};
```
Weather files use the same ids: `data/weather/cholistan.json`, `thar.json`, `gobi.json`.
Coordinates to use: Cholistan near Bahawalpur 29.0 N 71.9 E (elev ~110 m), Thar near Jaisalmer
26.9 N 70.9 E, Gobi near Dalanzadgad 43.6 N 104.4 E. B adds `lon` and `tz` to `js/sun.js` REGIONS
(small, additive edit only).

### Scene (E composes; A, B, D supply parts)

```js
// js/scene/terrain.js
export function createTerrain(scene) -> { setRegion(id), setSun(sunDir /*THREE.Vector3*/, el), frame(dt), ground /*Mesh, receives shadows*/, heightAt(x, z) }
// js/scene/sky.js
export function createSky(scene, renderer) -> { setSun(el, az), setWeather(sample), frame(dt), sunLight /*DirectionalLight*/, hemi /*HemisphereLight*/ }
// js/scene/props.js
export function createProps(scene, terrain) -> { setRegion(id), setWind(vec3), frame(dt) }
// js/scene/particles.js
export function createParticles(scene, { panelSurface /*() => {center, normal, halfW, halfH, quadrantOf(worldPoint)}*/ , onDeposit /*(kind, quadrant, amount)*/ })
  -> { set(kind /*'none'|'rain'|'snow'|'hail'|'dust'*/, intensity /*0..1*/, windVec3), frame(dt) }
// js/scene/people.js
export function createPeople(scene) -> { spawn(n), walkTo(i, pos, seconds) /*Promise*/, carry(i, object), act(i, 'wave'|'kneel'|'idle'), frame(dt), remove() }
// js/scene/truck.js
export function createTruck(scene) -> { driveTo(pos, seconds) /*Promise*/, openBack(), closeBack(), frame(dt), remove() }
// js/scene/tracker.js  (E: adapt model3d + parts3d)
export function createTracker(scene) -> { setPan(deg), setTilt(deg), setLights([tl,tr,bl,br] /*0..100*/), setSoiling({dust:[4], snow:[4], water:[4]} /*0..1 per quadrant*/), surface() /*for particles*/, pickAt(ndcX, ndcY) -> partId|null, setBuildProgress(0..1) /*story: parts appear*/, group }
// js/scene/scene.js  (E)
export function createScene(canvas) -> { renderer, scene, camera, controls, terrain, sky, props, particles, tracker, people, truck, setRegion(id), setSun(el, az), setWeather(sample), frame(dt), resize(), lookAt(preset|{pos, target}, seconds) }
```
Shadows: one `DirectionalLight` from the sun with a 2048 map following the tracker; the terrain
receives, the tracker and props cast. Pixel ratio capped at 1.5. Instancing for rocks and plants.

### Weather (B)

```js
// js/weather/weather.js
export async function loadWeather(regionId) -> series
series.start /*Date UTC*/, series.end, series.utcOffsetS, series.tz
series.at(dateUTC) -> {
  temp /*C*/, rain /*mm per h*/, snow /*cm per h*/, hail /*bool*/, cloud /*0..1*/,
  ghi, dni, dhi /*W per m2*/, wind /*m per s*/, gust, windDir /*compass deg*/, rh /*%*/,
  dust /*0..1 storm strength*/, code /*WMO*/, kind /*'clear'|'cloudy'|'overcast'|'rain'|'snow'|'hail'|'dust'|'storm'*/
}   // values interpolated between hours; kind from code + thresholds
series.days() -> [{ date /*YYYY-MM-DD*/, kind, ghiKWh, note /*'sandstorm', 'first snow' ...*/ }]  // one per day, for the timeline
// js/weather/events.js
export function pickEvents(series) -> [{ date, kind, title /*plain words*/, strength }]   // the 20 or so most interesting days over 3 years, for the story and the timeline marks
```
Data file: one JSON per region, hourly, 2023-01-01 to 2025-12-31, compact (arrays of numbers,
1 decimal, nulls allowed), under 2 MB each. Source: Open-Meteo archive API (free, no key) plus the
Open-Meteo air-quality `dust` field (CAMS) where it exists. Dust storm strength = CAMS dust scaled,
boosted by gusts over 50 km/h with humidity under 30 %. Keep the fetch script re-runnable.

### Sun and light (E uses in daysim)

For a real date: day of year and local solar hour come from the date and `utcOffsetS` plus the
longitude correction (`lon / 15` hours from the zone's middle, keep it simple, plus or minus a few
minutes is fine). `sunPosition(lat, doy, solarHour)` then gives el and az.
Light on a surface with normal n (unit) and sun direction s (unit): `dni * max(0, n.s) + dhi * (1 + n.y) / 2`
(plus a small ground bounce, 0.2 * ghi * (1 - n.y) / 2). The cell and the 4 LDRs use this through the
existing `world.js` model (`countsAt` takes lux: 105 lux per W per m2). Soiling multiplies the light
reaching each LDR and the cell by its transmission (see C).

### Soiling and the cleaning routine (C)

```js
// js/sim/soiling.js
export function createSoiling() -> {
  layers /*{dust:[4], snow:[4], water:[4]} 0..1 coverage per quadrant TL,TR,BL,BR*/,
  deposit(kind, amount, quadrant),               // from particles
  update(dt, { tiltDeg, panMoving, tiltMoving, temp, sunW, rain, wind }),  // slide, melt, wash, evaporate
  transmission() -> { ldr:[4] /*0..1*/, cell /*0..1*/ },
  isClean() }
```
Physics to use: dust slides when the panel's steepness (|tilt - 90|) is over about 35 degrees and
loses coverage faster while the tilt is moving; snow slides when steep and melts above 0 C with sun;
water drains when steep and evaporates; rain washes dust (rain rate times a factor). Keep it simple
and stable (no NaN, clamp 0..1).

Detection and cleaning in `js/logic.js` AND `tracker.ino` (mirror, same constants):
- Keep a slow baseline of total light (sum of the 4 `rel` values, or counts in SUN_MODE) over about
  30 s while tracking normally.
- "Blocked" = the total drops to under 60 % of the baseline within 3 s and stays there 2 s, while a
  torch or the sun was present. Clouds can trigger it too: accepted, the routine is cheap.
- Cleaning = **back and forth, watching which side helps**: tilt to one end, hold 1.5 s, measure;
  tilt to the other end, hold, measure; go again toward the side that improved more; up to 3 rounds;
  stop early when the total is back over 85 % of the baseline. Then resume tracking. If still under,
  state "needs a hand" (keeps tracking; clears by itself when light returns).
- Serial: `D 1` starts the routine now (the page's "Simulate dust" in live mode), `D 0` cancels.
  Telemetry adds `cl: {st, base, now, round}` with st 0 idle, 1 blocked, 2 cleaning, 3 needs a hand.
- Test with `tests/soiling_test.mjs`: dust sprinkle on 1 quadrant and on all 4 gets cleaned; a
  passing cloud does not loop forever; torch off indoors is not treated as dust.

### Story (D)

```js
// js/story/story.js
export function createStory({ scene, clock, hud, sim }) -> { start(), next(), back(), skip(), stop(), chapterIndex, frame(dt) }
// js/story/script.js : the chapters as data: { id, title, text (plain words, 1 to 3 short sentences), camera, actions: async (ctx) => {} }
```
Chapters (keep each under 25 s, all skippable):
1. The desert at dawn. "Once upon a time there was a desert with a lot of sun and nobody to use it."
2. A truck arrives, people get out, parts appear one by one (tracker `setBuildProgress`), they
   step back, get in, drive away.
3. First day: the sun crosses the sky, the panel turns. "One motor is enough for one day."
4. Months fly by: the sun's noon height moves up and down with the seasons. A fixed panel loses
   out. "That is why there are two motors."
5. Weather from the real data: the strongest sandstorm of the 3 years. Dust lands, the lights drop,
   the tracker rocks back and forth, dust slides off. Then rain washes the rest.
6. The numbers: tracker vs fixed energy over the 3 years from the sim's precomputed totals (E
   provides `sim.totals(regionId)`), and the cosine rule in one line.
7. "Your turn": buttons to Simulation or Live.
People and the truck are low-poly, built from boxes and capsules, with a simple walk cycle. No
loaded assets. Faces not needed.

### HUD and app (E)

- `js/app/bus.js` tiny event bus; `js/app/clock.js` `createClock()` with `date` (UTC Date),
  `speed` (sim seconds per real second: 1 min, 10 min, 1 h, 6 h, 1 day per second), `playing`,
  `step(dtReal)`; `js/app/app.js` boot and the mode switch; `js/sim/daysim.js` the multi-day
  simulation: the `Controller` from logic.js (SUN_MODE settings as in old sim.js) stepped at
  20 Hz sim time, skipping fast at night, energy totals for tracker vs fixed vs ideal per day and
  overall, `totals(regionId)` precomputed once per region (cache in localStorage).
- HUD layout: top-left mode (Story, Simulation, Live) and Connect; top-right the place, the date and
  time, the weather in a chip with an icon; bottom a 3-year timeline you can scrub, with marks on
  the interesting days, play/pause and speed; right side the 4 lights (reuse `panels.js` light
  tiles), panel watts now and today (tracker vs fixed), big motor angle, small motor angle, a
  "Simulate dust" button and the cleaning state in words. Clicking a 3D part shows that part's
  card. Everything else hidden.
- Live mode keeps the old behaviour (`serial.js`, `pretend.js`, sensitivity, learn the room, the
  light positions dialog) but through the new HUD.

## Performance budget

- One `requestAnimationFrame` loop, paused when the tab is hidden.
- Draw calls under 150. Terrain one mesh (~160x160 grid, bigger far ring with lower detail).
- Particles: one `THREE.Points` per kind, max 6000 points, updated in a shader or a typed array.
- No per-frame DOM writes unless a value changed. HUD text updates at most 10 per second.

## Dev pages

Each `dev/*.html` loads three r128 the same way as `index.html` and shows one module with
on-screen controls (region buttons, a time slider, a weather kind selector, etc.). Test it in the
browser before you report done. Report: what works, what does not, the fps you saw.
