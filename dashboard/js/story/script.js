// The story, as data: the short version for a 5 minute pitch (about 26 sentences).
// Each chapter: { id, title, text, region?, camera, cameraTime?, build?, buttons?, run }.
// `text` is a string of full sentences, an array of sentences, or a function of ctx returning
// either. The narrator types one sentence at a time and waits for the presenter (story.js).
// `region` switches the 3D to that place for the chapter; without it the chapter plays at the place
// the app is on. `run(ctx)` plays the scene and must only use ctx (see stage.js), so pressing on can
// cut it short cleanly; ctx.atSentence(k) waits for sentence k.
// Order: the desert, people came (the truck and the three builders), India, Mongolia, closer to
// home (Pakistan), the team, how we built it (the truck parked, the three to the side), off they
// went, the software, two motors, the numbers, what comes next, the real thing (real-world tests).
// preview(ctx) on the first chapter sets its first frame for the Play screen (story.js).
// Chapter flags used by story.js: still (does not move the tracker: the real one is not asked to
// follow yet), custom (run() shows its own cards with ctx.ask), homeAfter (with the real tracker,
// it goes home after this chapter, before the next one).
// All the sentence text lives in texts.js, places.js and facts_home.js (lines.js lists it for the voice).
// The team's chapters (chapter_team.js, chapter_steps.js, chapter_software.js, photos.js) load
// with a dynamic import: while one is missing or broken, the story skips it and still runs.
// The older, longer chapters (first day, seasons, sandstorm) are still in chapter_sky.js and
// chapter_dust.js if a longer story is wanted again; chapter_build.js holds the truck and people
// pieces that chapter_crew.js plays.
import { runMotors, motorsText } from "./chapter_motors.js";
import { runNumbers, numbersText, prepareNumbers, NUMBERS_REGION } from "./chapter_numbers.js";
import { placeChapter } from "./chapter_place.js";
import { homeChapter } from "./chapter_home.js";
import { futureChapter } from "./chapter_future.js";
import { PLACE_ORDER } from "./places.js";
import { addSources } from "./sources.js";
import { sunAt, dateFor } from "./sunpath.js";
import { birds } from "./props_extra.js";
import { realChapter } from "./chapter_real.js";
import { DAWN } from "./texts.js";
import { cameChapter, leftChapter, withCrew } from "./chapter_crew.js";

const EQUINOX = 80;   // about 21 March: the sun rises due east and sets due west
const DAWN_H0 = 5.6;  // the desert's first hour

// ---- the team's modules (agent B): skipped while missing ----
async function load(path) {
  try { return await import(path); } catch (e) { console.info(`[story] ${path} not loaded yet, skipping it:`, e.message); return null; }
}
const [stepsMod, teamMod, softwareMod, photosMod] = await Promise.all(
  ["./chapter_steps.js", "./chapter_team.js", "./chapter_software.js", "./photos.js"].map(load));
const isChapter = c => c && typeof c === "object" && c.id && c.title && (typeof c.run === "function" || c.text);
const list = v => (Array.isArray(v) ? v : v ? [v] : []).filter(isChapter);
const teamChapters = list(teamMod?.teamChapters);
const stepsChapters = list(stepsMod?.stepsChapters);
const softwareChapters = list(softwareMod?.softwareChapter);
for (const c of [...teamChapters, ...stepsChapters, ...softwareChapters]) addSources(c.title, c.sources);

// photos from the team's chapters stay up only in those chapters
function hidePhotos() { try { photosMod?.hidePhotos?.(); } catch (e) { console.warn("[story] hidePhotos", e); } }
window.addEventListener("story:exit", hidePhotos);
const clearPhotos = ch => (ch.run ? Object.assign({}, ch, { run: ctx => { hidePhotos(); return ch.run(ctx); } }) : ch);

const dawn = {
  id: "dawn",
  title: "The desert",
  text: DAWN,
  camera: "wideDawn", cameraTime: 0, build: 0, still: true,
  // the Play screen: the desert at the first moment of this chapter
  preview(ctx) {
    const { lat, lon } = ctx.region, s = sunAt(lat, EQUINOX, DAWN_H0);
    ctx.sun(s.el, s.az);
    ctx.setDate(dateFor(2023, EQUINOX, DAWN_H0, lon));
  },
  async run(ctx) {
    prepareNumbers(ctx.sim);   // load the Gobi weather now, for "The numbers" later
    const { lat, lon } = ctx.region;
    const flock = ctx.add(birds(2));
    flock.scale.setScalar(ctx.S);
    let t = 0;
    ctx.look("wideDawn2", 8);
    ctx.sound.wind(0.12);
    await ctx.during(8, (u, dt) => {
      t += dt;
      const h = DAWN_H0 + u * 1.2, s = sunAt(lat, EQUINOX, h);
      ctx.sun(s.el, s.az);
      ctx.setDate(dateFor(2023, EQUINOX, h, lon));
      flock.userData.frame(dt, t);
    });
  },
};

const motors = {
  id: "motors",
  title: "Two motors",
  text: motorsText,
  camera: "skyArc", cameraTime: 2,
  run: runMotors,
};

const numbers = {
  id: "numbers",
  title: "The numbers",
  region: NUMBERS_REGION,
  text: numbersText,
  camera: "numbersWide", cameraTime: 2.5,
  run: runNumbers,
};

export const CHAPTERS = [
  dawn,
  cameChapter,
  ...PLACE_ORDER.map(placeChapter),
  homeChapter,
  ...teamChapters,
  ...stepsChapters.map(withCrew),
  leftChapter,
  ...softwareChapters,
  motors,
  numbers,
  Object.assign({}, futureChapter, { homeAfter: true }),
  realChapter,
].map(clearPhotos);
