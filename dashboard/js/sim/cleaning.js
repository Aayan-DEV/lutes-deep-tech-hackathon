// The dust watch and cleaning routine of the tracker's brain (logic.js), split out to keep that file
// small. It is the same code as watchDust(), cleanStep(), startClean(), endClean() and cancelClean()
// in firmware/tracker/tracker.ino: change both. The numbers (DUST_*, CLEAN_*) live in CFG in logic.js.
// s = the controller's state, c = its CFG, stopAxis = the controller's own, tiltMin / tiltMax = its tilt
// range now (it follows the flat angle on the prototype).
export const CL_IDLE = 0, CL_BLOCKED = 1, CL_CLEANING = 2, CL_HELP = 3;   // telemetry cl.st
const PAN = 0, TILT = 1;

export function createCleaning(s, c, stopAxis, tiltMin, tiltMax) {
  // Total light: the sum of the healthy sensors' rel values (4.0 = room level on all 4).
  function lightTotal() {
    let t = 0;
    for (let i = 0; i < 4; i++) if (s.healthy[i]) t += s.rel[i];
    return t;
  }

  // Dust watch, after both axes and the lost check (normal tracking only).
  function watchDust(now) {
    const light = s.torch || s.steering;   // light present: a torch, or enough light to steer by
    if (s.clBase <= 0) {   // first light: start the clean level here
      if (light && s.clTotal > 0) { s.clBase = s.clTotal; s.clHighAt = now; }
      return;
    }
    if (s.clTotal >= c.DUST_HIGH * s.clBase) s.clHighAt = now;
    if (s.clState === CL_HELP) {   // keeps tracking; clears by itself when the light is back
      if (s.clTotal >= c.CLEAN_DONE * s.clBase) s.clState = CL_IDLE;
      return;
    }
    if (s.clState === CL_BLOCKED) {
      if (!light || s.clTotal >= c.DUST_DROP * s.clBase || s.clTotal < c.DUST_FLOOR * s.clBase) s.clState = CL_IDLE;
      else {
        const still = !s.moving[PAN] && !s.moving[TILT] && !s.seeking;
        if (!still) s.clSince = now;   // the 2 s count only while the motors are still
        else if (now - s.clSince >= c.DUST_CONFIRM_MS) startClean(now);
        return;
      }
    }
    if (light && s.clTotal < c.DUST_DROP * s.clBase && s.clTotal >= c.DUST_FLOOR * s.clBase && now - s.clHighAt <= c.DUST_FALL_MS) {
      s.clState = CL_BLOCKED; s.clSince = now;
      return;
    }
    if (light) s.clBase += (s.clTotal - s.clBase) * c.UPDATE_MS / (s.clTotal > s.clBase ? c.DUST_RISE_MS : c.DUST_BASE_MS);
  }

  const sideAngle = side => (side === 0 ? tiltMax() : tiltMin());
  function cleanGo(target, now) { s.clTarget = target; s.clPhaseAt = now; s.clSum = 0; s.clCount = 0; }

  function startClean(now) {
    if (s.clBase <= 0) s.clBase = s.clTotal;
    s.clState = CL_CLEANING; s.clHome = s.angle; s.clRound = 1; s.clStep = 0; s.clFirst = 0; s.clOk = false;
    s.clSide = [0, 0]; s.clPrev = [0, 0];
    stopAxis(PAN); stopAxis(TILT);
    s.seeking = false; s.lostSince = 0; s.turnAround = false; s.turnWay = 0;
    cleanGo(sideAngle(0), now);
  }

  // Back to normal tracking (state: CL_IDLE, or CL_HELP if the light did not come back).
  function endClean(state) {
    s.clState = state;
    if (state === CL_IDLE) s.clRound = 0;
    stopAxis(PAN); stopAxis(TILT);
    s.seeking = false; s.lostSince = 0; s.lockStrength = s.strongest;
  }

  // One update of the cleaning routine (instead of normal tracking). Pan stays stopped; tilt moves at
  // full step to the target, holds, measures, then picks the next stop.
  function cleanStep(now) {
    stopAxis(PAN); stopAxis(TILT);
    const gap = s.clTarget - s.angle;
    if (gap !== 0) {
      if (Math.abs(gap) <= c.TILT_FULL_STEP) { s.angle = s.clTarget; s.clPhaseAt = now; }
      else s.angle += (gap > 0 ? 1 : -1) * c.TILT_FULL_STEP;
      return;
    }
    if (s.clStep === 3) { endClean(s.clOk ? CL_IDLE : CL_HELP); return; }   // home again: done
    const held = now - s.clPhaseAt;
    if (held < c.CLEAN_HOLD_MS) return;
    s.clSum += s.clTotal; s.clCount++;
    if (held < c.CLEAN_HOLD_MS + c.CLEAN_MEASURE_MS) return;
    const m = s.clSum / s.clCount;
    if (m >= c.CLEAN_DONE * s.clBase) {   // the light is back: go home and stop
      s.clOk = true; s.clStep = 3; cleanGo(s.clHome, now);
      return;
    }
    if (s.clStep < 2) {   // measured at one end
      const side = s.clStep === 0 ? s.clFirst : 1 - s.clFirst;
      s.clPrev[side] = s.clSide[side]; s.clSide[side] = m;
      s.clStep++;
      cleanGo(s.clStep === 1 ? sideAngle(1 - s.clFirst) : s.clHome, now);
      return;
    }
    // back home after a round, still dim
    if (s.clRound >= c.CLEAN_ROUNDS) { s.clOk = false; s.clStep = 3; cleanGo(s.clHome, now); return; }
    s.clRound++;
    // next round starts with the end that helped more (round 1: the bigger total; later: the bigger gain)
    s.clFirst = s.clSide[1] - s.clPrev[1] > s.clSide[0] - s.clPrev[0] ? 1 : 0;
    s.clStep = 0;
    cleanGo(sideAngle(s.clFirst), now);
  }

  // "D 0": stop the routine and forget the clean level (it starts again from the next light).
  function cancelClean() {
    if (s.clState === CL_CLEANING) endClean(CL_IDLE);
    s.clState = CL_IDLE; s.clBase = 0; s.clRound = 0;
  }

  return { lightTotal, watchDust, cleanStep, startClean, cancelClean };
}
