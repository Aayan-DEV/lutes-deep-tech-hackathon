// Where the real big motor starts turning (Sync up, big motor). A continuous servo does nothing for
// pulses close to its stop pulse (its dead band), and with the panel's weight on USB power that band
// is wide: the board sent 100..160 us off the stop pulse, said "Turning", and the real one never moved.
// ramp(way): the pulse moves away from the stop pulse in STEP_US steps every STEP_MS (J lines, each
// a little longer than the next one so it never pauses), from FROM_US to MAX_US. press() = "It turns
// now": stops it and resolves with the offset reached. At MAX_US without a press it resolves null.
const FROM_US = 60, STEP_US = 10, STEP_MS = 450, MAX_US = 400, SEND_MS = 150;

export function createStartFinder({ send, getFlat, onLevel }) {
  let timer = 0, done = null, off = 0;
  function stop(result) {
    clearInterval(timer); timer = 0;
    send(`J 0 0 ${getFlat().toFixed(1)}`);
    const f = done; done = null; if (f) f(result);
  }
  function ramp(way) {
    if (timer) stop(null);
    off = FROM_US; let next = performance.now() + STEP_MS;
    return new Promise(resolve => {
      done = resolve;
      const tick = () => {
        const now = performance.now();
        if (now >= next) { off += STEP_US; next = now + STEP_MS; }
        if (off > MAX_US) { stop(null); return; }
        send(`J ${1500 + way * off} ${SEND_MS * 3} ${getFlat().toFixed(1)}`);
        onLevel && onLevel(off);
      };
      tick(); timer = setInterval(tick, SEND_MS);
    });
  }
  return { ramp, press: () => { if (timer) stop(off); }, stop: () => { if (timer) stop(null); }, get running() { return !!timer; }, MAX_US };
}
