// Pretend sun with real motors, headless: drive a pretend "real" big motor through a whole day and
// check the panel stays pointed at the sun. Usage: node dashboard/tests/pretend_test.mjs
import { createPretendDriver } from "../js/pretend.js";
import { createSim } from "../js/sim.js";
import { panelFrame, dirFrom } from "../js/world.js";

// The "real" motor: takes commands in 20 ms frames (a turn starts on the next frame and lasts whole
// frames), and loses SPIN_UP degrees each time it starts (it has to speed up). trueSpeed can differ
// from the 90°/s the driver assumes, as if the speed was measured a little wrong.
const SPIN_UP = 0.4;
for (const [region, trueSpeed] of [["thar", 90], ["gobi", 90], ["cholistan", 84], ["gobi", 96]]) {
  // the "real" motor: turns at trueSpeed while a timed turn runs (the driver thinks 90°/s)
  let realPan = 0, jogStart = 0, jogEnd = 0, jogWay = 0, clock = 0, turns = 0, longest = 0;
  const realTilt = { v: 90 };
  const driver = createPretendDriver(line => {
    const [cmd, a, b, c] = line.split(" ");
    if (cmd === "J") {
      const start = Math.ceil((clock + 1) / 20) * 20;   // next servo frame
      jogWay = Math.sign(+a - 1500); jogStart = start; jogEnd = start + Math.round(+b / 20) * 20; realTilt.v = +c; turns++; longest = Math.max(longest, +b);
      realPan -= jogWay * SPIN_UP;
    }
    if (cmd === "M") realTilt.v = +b;
  });
  const sim = createSim(); sim.setRegion(region); sim.setHour(sim.rise - 0.3); sim.secPerDay = 60;
  const realNow = () => clock;
  globalThis.performance = { now: realNow };
  let errSum = 0, n = 0, worst = 0;
  for (let step = 0; sim.hour < sim.set + 0.5 && step < 400000; step++) {
    clock += 10; sim.step();
    if (step % 2 === 0) driver.update(sim.sun, sim.region.lat, true);   // every 20 ms, like the page
    if (clock > jogStart && clock <= jogEnd) realPan += jogWay * trueSpeed * 0.01;
    if (sim.sun.el > 5) {
      // how far the REAL panel points from the sun (angle between its face and the sun)
      const nrm = panelFrame(realPan, realTilt.v).n, L = dirFrom(sim.sun.az, sim.sun.el);
      const e = Math.acos(Math.min(1, nrm[0] * L[0] + nrm[1] * L[1] + nrm[2] * L[2])) * 180 / Math.PI;
      errSum += e; n++; if (sim.hour > sim.rise + 1) worst = Math.max(worst, e);
    }
  }
  console.log(`${region.padEnd(9)} motor really ${trueSpeed}°/s: ${turns} timed turns (longest ${longest} ms), panel off the sun on average ${(errSum / n).toFixed(1)}°, worst ${worst.toFixed(1)}°`);
}
