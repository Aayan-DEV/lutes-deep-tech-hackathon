// Runs whole simulated days in every region and season, headless. Usage: node dashboard/tests/day_test.mjs
import { createSim } from "../js/sim.js";
import { REGIONS, SEASONS } from "../js/sun.js";

for (const r of REGIONS) for (const se of SEASONS) {
  const sim = createSim();
  sim.setRegion(r.id); sim.setSeason(se.id); sim.setHour(sim.rise - 0.6);
  sim.secPerDay = 60;
  let worst = 0, moves = 0, wasMoving = false, firstLock = null, steps = 0;
  const errs = [];
  while (steps < 200000) {           // until the sun has set
    sim.step(); steps++;
    const s = sim.ctl.s, moving = !!(s.panOff || s.moving[1]);
    if (moving && !wasMoving) moves++;
    wasMoving = moving;
    if (sim.sun.el > 5) {
      const e = sim.world.aim().errDeg;
      errs.push(e);
      if (firstLock === null && e < 10) firstLock = sim.hour;
      if (sim.hour > sim.rise + 1) worst = Math.max(worst, e);
    }
    if (sim.hour > sim.set + 0.3) break;
  }
  const mean = errs.reduce((a, b) => a + b, 0) / errs.length, E = sim.energy;
  const within5 = errs.filter(e => e < 5).length / errs.length * 100;
  console.log(`${r.id.padEnd(8)} ${se.id.padEnd(7)} mean aim error ${mean.toFixed(1)}°, worst after 1st hour ${worst.toFixed(1)}°, within 5° ${within5.toFixed(0)}% of the day, ` +
    `moves ${moves}, energy tracker ${E.tracker.toFixed(2)} Wh vs fixed ${E.fixed.toFixed(2)} Wh (+${((E.tracker / E.fixed - 1) * 100).toFixed(0)}%), ideal ${E.ideal.toFixed(2)} Wh`);
}
