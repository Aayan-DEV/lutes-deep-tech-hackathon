// The real tracker in the story. The shell's bridge (js/app/hardware.js, window.__game.hardware)
// drives the real motors: while it follows, the story's tracker.setPan / setTilt become the real
// target and the 3D shows the real motors. This file only decides WHEN, and how long to wait.
// createHwLink(option) -> {
//   hw()            the bridge, or null (the page runs without it)
//   on              true once the presenter connected (or it was connected): "story hardware"
//   following       on and the bridge follows the story right now
//   follow(on)      starts or stops following (only when on)
//   panTime(to)     seconds the real big motor needs to reach pan `to`: |to - real pan| / speed + 0.4
//                   (big motor off or not responding: the tilt's time only)
//   stretch(s, span) a move of `span` degrees of pan planned for s seconds: as long as the real
//                   motor needs while following, else s (and s when the big motor is not responding)
//   gate(ui)        the question at the start of the story (see below)
//   end()           the story stops: stop following
// }
import { GATE } from "./texts.js";

const TILT_S = 0.5;   // the small motor is quick: any tilt move gets at least this long

export function createHwLink(option = null) {
  const L = { on: false };
  // window.__game.hardware wins when the key is there (tests swap in a fake, or null for "none")
  const hw = () => (typeof window !== "undefined" && window.__game && "hardware" in window.__game ? window.__game.hardware : option) || null;
  const state = () => { try { return hw()?.state || {}; } catch (e) { return {}; } };
  const speed = () => { const v = +hw()?.speed; return v > 1 ? v : 90; };
  const panStuck = () => !!state().panStuck;   // the board says the big motor is off or not responding
  const realPan = fallback => {
    try { const p = hw()?.pose?.(); if (p && Number.isFinite(p.pan)) return p.pan; } catch (e) { /* no pose */ }
    return fallback;
  };

  const link = {
    hw,
    get on() { return L.on; },
    set on(v) { L.on = !!v && !!hw(); },
    get following() { return L.on && !!state().following; },
    follow(on) {
      if (!L.on) return false;
      try { return hw().follow(!!on); } catch (e) { console.warn("[story] follow", e); return false; }
    },
    speed,
    panTime(to, from = 0) { return panStuck() ? TILT_S : Math.abs(to - realPan(from)) / speed() + 0.4; },
    tiltTime: () => TILT_S,
    stretch(seconds, span) { return link.following && !panStuck() ? Math.max(seconds, Math.abs(span) / speed() + 0.4) : seconds; },
    end() { if (L.on) { try { hw().cancelWatches?.(); hw().release?.(); } catch (e) { /* gone */ } } },

    // Before "The desert". ui = { ask({ lines, choices, timeout }) -> id, status(text, seconds), auto }
    //  - no bridge: nothing, the story starts at once
    //  - connected and calibrated: "Real tracker connected" for 2 s
    //  - auto play and not connected: nothing (no one is there to plug it in)
    //  - else the question: "Connect and calibrate" or "Skip"
    async gate(ui) {
      const b = hw();
      if (!b) return false;
      const st = state();
      if (st.connected && st.synced) { L.on = true; await ui.status(GATE.connected, 2); return true; }
      if (ui.auto && !st.connected) return false;
      let conn = null;
      const pick = await ui.ask({
        lines: [GATE.ask], timeout: ui.auto ? 60 : 0,
        choices: [
          // the port picker needs the click itself: connect() runs inside the click handler
          { id: "go", label: "Connect and calibrate", primary: true, onClick: () => { try { conn = Promise.resolve(b.connect()); } catch (e) { conn = Promise.resolve(false); } } },
          { id: "skip", label: "Skip" },
        ],
      });
      if (pick !== "go") return false;
      ui.status(GATE.connecting, 0);
      let ok = false;
      try {
        ok = !!(await (conn || Promise.resolve(b.connect())));
        if (ok) { ui.status(GATE.calibrating, 0); ok = !!(await b.calibrate()); }
      } catch (e) { console.warn("[story] connect", e); ok = false; }
      if (!ok) { await ui.status(GATE.failed, 3); return false; }
      L.on = true;
      await ui.status(GATE.calibrated, 2);
      return true;
    },
  };
  return link;
}
