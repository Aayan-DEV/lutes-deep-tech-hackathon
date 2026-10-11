// One weather button = one run that plays by itself (the Simulation's Rain, Snow, Dust storm and
// Leaves), about 7 to 10 real seconds from the press to "Clean again":
//  1. landing   real time. The sky turns (SKY_IN_S), heavy particles fall, the stuff lands on the
//               panel (gusts.js: a thin layer, then one gust at 2.2 s, all on by 2.8 s), LAND_S
//               seconds (it stops early if the tracker already started cleaning).
//  2. cleaning  the sky clears over CLEAR_S seconds and the sim clock runs at CLEAN_SPEED sim
//               seconds per real second (timeScale): the firmware's holds (1.5 s) and measures
//               (0.5 s) are what make the routine long, and the controller and the soiling physics
//               speed up together. Dust, snow and leaves: the firmware's own rule fires from the
//               gust; if the routine has not started NUDGE_S real seconds after the storm, the run
//               starts it ("D 1"). Rain water blocks only 15 % of the light, so the rule never
//               fires: the routine starts RAIN_NUDGE_S seconds after the rain. If the routine ends
//               with stuff still on the panel, it starts again (up to MAX_TRIES times).
//  3. done      real time. The panel is clean: "Clean again" for DONE_S seconds, then the chosen
//               day speed.
// Before the landing, a sun under MIN_EL waits (the day plays on at its own speed until it is up).
// Pressing the running button again cancels: clear sky, the routine stops ("D 0"), the dirt stays.
//
//   const run = createStormRun({ mix, daysim, toast });
//   run.start("dust"); run.cancel(); run.frame(dt)   (each frame while the clock plays)
//   run.active, run.id, run.timeScale (sim seconds per real second, or 0 = the day's own speed),
//   run.view()  -> { id, phase, words, p } or null
// All the times here are real seconds.
import { createGusts } from "./gusts.js";

export const RUN = { LAND_S: 3, SKY_IN_S: 0.6, HEAVY: 1.25, CLEAR_S: 1, CLEAN_SPEED: 2.5, NUDGE_S: 1.5, RAIN_NUDGE_S: 0.5,
  RETRY_S: 0.5, MAX_TRIES: 3, GIVE_UP_S: 20, DONE_S: 1.2, MIN_EL: 10, CLEAN_COVER: 0.12, EXPECT_S: 8.5 };
const KINDS = ["dust", "snow", "water", "leaves"];
const KIND_OF = { rain: "water", snow: "snow", dust: "dust", leaves: "leaves" };
const WORDS = { wait: "waiting for sun", landing: "landing", cleaning: "cleaning", done: "done" };
const CL_BLOCKED = 1, CL_CLEANING = 2;
// CLEAN_COVER: clean enough to end the run once the routine has the light back (the HUD calls a
// panel dirty over 0.15; what is left under it is a thin film the next rocking or rain takes)

export function createStormRun({ mix, daysim, toast = () => {} }) {
  const layers = () => daysim.soiling && daysim.soiling.layers;
  const land = createGusts(layers, (k, a, q) => { if (daysim.soiling) daysim.soiling.deposit(k, a, q); });
  let id = null, phase = null, t = 0, tEnd = 0, tDone = 0, started = false, nudged = false, tries = 0, idleAt = -1, lastSt = 0, lastRound = 0;
  const log = [];   // for tests: [phase or event, seconds since the press]

  const st = () => daysim.ctl.s.clState;
  const isClean = () => {
    const s = daysim.soiling;
    if (!s) return true;
    return (s.isClean && s.isClean()) || KINDS.every(k => s.layers[k].every(v => v < RUN.CLEAN_COVER));
  };
  const mark = what => log.push([what, +t.toFixed(2)]);

  // the routine's state changes, for the log (1 = the rule sees a block, 2 = rocking)
  function watch() {
    const s = st(), round = daysim.ctl.s.clRound;
    if (s !== lastSt || (s === CL_CLEANING && round !== lastRound)) {
      mark(s === CL_BLOCKED ? "rule sees block" : s === CL_CLEANING ? `rocking, round ${round}` : `routine idle (${s})`);
      lastSt = s; lastRound = round;
    }
    if (s === CL_CLEANING) started = true;
    return s;
  }
  function begin() {
    phase = "landing"; t = 0; log.length = 0; lastSt = st(); lastRound = 0; mark("landing");
    mix.set(id, RUN.SKY_IN_S, RUN.HEAVY); land.start(KIND_OF[id]);
  }
  function endStorm() {
    phase = "cleaning"; tEnd = t; idleAt = -1; mark("storm ends");
    mix.set("clear", RUN.CLEAR_S);   // the landed cover holds (land.frame) until the routine starts
  }
  function startClean(why) { daysim.cleanNow(); tries++; mark(why); }
  function finish() {
    phase = null; id = null; land.stop(); daysim.stormCleans = true;
  }

  const run = {
    log,
    get active() { return phase !== null; },
    get id() { return id; },
    get phase() { return phase; },
    // sim seconds per real second: real time to watch the landing and the clean panel, faster
    // through the routine's holds; 0 = the day's own speed (no run, or waiting for the sun)
    get timeScale() { return phase === "cleaning" ? RUN.CLEAN_SPEED : phase === "landing" || phase === "done" ? 1 : 0; },
    start(next) {
      if (!KIND_OF[next] || phase) return;
      id = next; started = false; nudged = false; tries = 0; daysim.stormCleans = false;
      if (daysim.sun.el < RUN.MIN_EL) { phase = "wait"; t = 0; toast("Waiting for the sun to be up, then the storm comes.", 3000); }
      else begin();
    },
    cancel() {
      if (!phase) return;
      mark("cancel");
      mix.set("clear", RUN.CLEAR_S);
      if (daysim.cleanStop) daysim.cleanStop();
      finish();
    },
    // particles reaching the panel (only counted while landing)
    hit(kind, q, amount) { if (phase === "landing") land.hit(kind, q, amount); },
    frame(dt) {
      if (!phase) return;
      t += dt;
      if (phase === "wait") { if (daysim.sun.el >= RUN.MIN_EL) begin(); return; }
      if (phase === "landing") {
        land.frame(t);
        watch();
        if (t >= RUN.LAND_S || started) endStorm();
        return;
      }
      if (phase === "cleaning") {
        const s = watch(), since = t - tEnd;
        // until the routine starts, what slid off the still panel comes back (the last of the storm):
        // the firmware's 2 s check for a block then is not lost to a few leaves sliding off
        if (started) land.stop(); else land.frame(tEnd);
        const nudgeAt = id === "rain" ? RUN.RAIN_NUDGE_S : RUN.NUDGE_S;
        if (!started && !nudged && since >= nudgeAt) { nudged = true; started = true; startClean("routine started by the run"); return; }
        if (!started || s === CL_CLEANING || s === CL_BLOCKED) { idleAt = -1; return; }
        if (isClean()) { phase = "done"; tDone = t; mark("clean"); return; }
        // the routine stopped with stuff left: once it has rested RETRY_S, rock again
        if (idleAt < 0) idleAt = t;
        if (t - idleAt >= RUN.RETRY_S && tries < RUN.MAX_TRIES && since < RUN.GIVE_UP_S) { idleAt = -1; startClean("routine again (stuff left)"); }
        else if (tries >= RUN.MAX_TRIES || since >= RUN.GIVE_UP_S) { mark("gave up"); finish(); toast("Some of it is still on the panel. The next rain or cleaning will take it.", 4000); }
        return;
      }
      if (phase === "done" && t - tDone >= RUN.DONE_S) { mark("end"); finish(); }
    },
    // for the weather button and the Cleaning card
    view() {
      if (!phase) return null;
      const p = phase === "done" ? 1 : phase === "wait" ? 0 : Math.min(0.95, t / RUN.EXPECT_S);
      return { id, phase, words: WORDS[phase], p };
    },
  };
  return run;
}
