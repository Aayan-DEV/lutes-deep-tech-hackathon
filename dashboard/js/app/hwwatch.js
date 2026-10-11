// The two real-world checks the story runs on the real tracker, read from its telemetry:
//  - tracking: the board follows a torch by itself and holds it for a few seconds;
//  - cleaning: the dust routine starts (cl.st 1 or 2) and ends (cl.st 0) with the light back.
// createWatches({ subscribe }) -> { tracking(opts), cleaning(), cancelAll(), lastTrack, lastClean }
// subscribe(fn) -> unsubscribe, fn(d) gets each telemetry object. Every watch resolves to 'ok' or
// 'timeout' (never rejects); cancelAll() resolves the pending ones to 'timeout' (link dropped).

const TRACK_TIMEOUT_S = 90, CLEAN_TIMEOUT_S = 120;
const BACK_SHARE = 0.85;      // the light is "back" over 85 % of what it was before the drop
const BEFORE_MS = 8000;       // "before the drop" = the brightest total in the last 8 s before the routine

// Total light x 100: the board's own cl.now, or the sum of the 4 relative values.
const total = d => (d.cl && Number.isFinite(d.cl.now) ? d.cl.now : (d.lt || []).reduce((a, b) => a + (+b || 0), 0));
const num = (x, dflt) => (Number.isFinite(+x) ? +x : dflt);

// On target, as the board sees it: light is there (the torch, or "lit": light to steer by), and each axis
// is inside its stop band (pct = imbalance in %, cfg.stop = the band), or both axes hold still inside the
// start band. Big motor off or not responding (pan.stuck): only the tilt counts.
export function onTarget(d) {
  if (!d || !(d.torch || d.lit) || !d.pan || !d.tilt) return false;
  const cfg = d.cfg || {}, stop = num(cfg.stop, 5), start = num(cfg.start, 15);
  const pp = d.pan.stuck || d.pe === 0 ? 0 : Math.abs(num(d.pan.pct, 100)), tp = Math.abs(num(d.tilt.pct, 100));
  if (pp <= stop && tp <= stop) return true;
  return !d.pan.mv && !d.tilt.mv && pp < start && tp < start;
}

export function createWatches({ subscribe }) {
  const pending = new Set();
  const w = { lastTrack: { torch: false, onTarget: false, heldS: 0 }, lastClean: { st: 0, round: 0 } };

  function watch(limitS, test) {
    return new Promise(resolve => {
      let unsub = null, timer = 0;
      const job = {
        end(result) {
          if (!pending.delete(job)) return;
          clearTimeout(timer); if (unsub) unsub();
          resolve(result);
        },
      };
      pending.add(job);
      timer = setTimeout(() => job.end("timeout"), limitS * 1000);
      unsub = subscribe(d => { try { if (test(d)) job.end("ok"); } catch (e) { console.warn("[hardware] watch", e); } });
    });
  }

  // 'ok' once the torch is seen and the panel is on it for `seconds` in a row.
  w.tracking = ({ seconds = 3 } = {}) => {
    let since = 0;
    w.lastTrack = { torch: false, onTarget: false, heldS: 0 };
    return watch(TRACK_TIMEOUT_S, d => {
      const now = performance.now(), on = onTarget(d);
      if (!on) since = 0; else if (!since) since = now;
      const heldS = since ? (now - since) / 1000 : 0;
      w.lastTrack = { torch: !!d.torch, onTarget: on, heldS };
      return on && heldS >= seconds;
    });
  };

  // 'ok' once the routine ran (st 1 or 2 seen) and then ended (st 0) with the light back.
  w.cleaning = () => {
    const hist = [];   // [time, total] while idle, for "what it was before the drop"
    let seen = false, before = 0;
    return watch(CLEAN_TIMEOUT_S, d => {
      const now = performance.now(), st = d.cl ? num(d.cl.st, 0) : 0, t = total(d);
      w.lastClean = { st, round: d.cl ? num(d.cl.round, 0) : 0 };
      if (!seen) {
        if (st === 1 || st === 2) {
          seen = true;
          const recent = hist.filter(h => now - h[0] < BEFORE_MS).map(h => h[1]);
          before = Math.max(recent.length ? Math.max(...recent) : 0, d.cl ? num(d.cl.base, 0) : 0);
          return false;
        }
        hist.push([now, t]);
        while (hist.length && now - hist[0][0] > BEFORE_MS) hist.shift();
        return false;
      }
      return st === 0 && t >= BACK_SHARE * before;
    });
  };

  w.cancelAll = () => { for (const job of [...pending]) job.end("timeout"); };
  Object.defineProperty(w, "pending", { get: () => pending.size });
  return w;
}
