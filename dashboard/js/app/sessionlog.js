// The session log: from the moment the Arduino connects until it disconnects, one JSON line per
// thing that happened, saved to dashboard/logs/session-<time>.jsonl by serve.py (POST /log), so a
// session can be read back afterwards to see what really happened.
//   start  when it began, the page's address
//   rx     every line the Arduino sent (telemetry as an object: lights, both motors, settings)
//   tx     every command the page sent (a repeat of the same line within 1 s is counted, not written)
//   ui     what the page showed, when it changed (checked twice a second): the mode, the Sync up
//          step, the pretend sun, the slider, the 3D pose drawn, the 4 light numbers
//   note   answers and events (Sync up: "flat? no at 40", ...)
//   end    when it stopped
// Written in chunks every 2 s, so a crash or an unplugged cable loses at most 2 s. When the server
// has no /log (an old serve.py), the whole log downloads as a file at the end instead.
const FLUSH_MS = 2000, UI_MS = 500, REPEAT_MS = 1000;

export function createSessionLog({ live, getState, onSaved }) {
  const serial = live.serial;
  let on = false, name = "", t0 = 0, buf = [], all = null, lastTx = null, lastUi = "", flushing = false;
  const stamp = () => +((performance.now() - t0) / 1000).toFixed(3);
  const put = o => { if (on) buf.push(JSON.stringify(Object.assign({ t: stamp() }, o))); };

  function start() {
    const now = new Date(), p = n => String(n).padStart(2, "0");
    name = `session-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}_${p(now.getHours())}-${p(now.getMinutes())}-${p(now.getSeconds())}.jsonl`;
    on = true; t0 = performance.now(); buf = []; all = null; lastTx = null; lastUi = "";
    put({ k: "start", at: now.toISOString(), url: location.href });
  }
  async function flush() {
    if (flushing || !buf.length) return;
    const chunk = buf.join("\n") + "\n"; buf = [];
    if (all !== null) { all += chunk; return; }   // no server log: keep it for the download
    flushing = true;
    try {
      const r = await fetch(`/log?name=${encodeURIComponent(name)}`, { method: "POST", body: chunk, keepalive: chunk.length < 60000 });
      if (!r.ok) throw new Error(r.status);
    } catch (e) { all = chunk; console.warn("[log] the server cannot save logs (restart serve.py): the log downloads at the end"); }
    flushing = false;
  }
  async function stop() {
    if (lastTx && lastTx.n) put({ k: "tx", line: lastTx.line, n: lastTx.n });
    put({ k: "end" }); on = false;
    while (flushing) await new Promise(r => setTimeout(r, 50));
    await flush();
    if (all !== null) {   // download it instead
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([all], { type: "application/json" })); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      onSaved && onSaved(`Session log downloaded: ${name}`);
    } else onSaved && onSaved(`Session log saved: dashboard/logs/${name}`);
    all = null;
  }

  // what the Arduino sends
  live.lineFns.add(line => {
    if (!on) return;
    if (line[0] === "{") { try { put({ k: "rx", d: JSON.parse(line) }); return; } catch (e) {} }
    put({ k: "rx", line });
  });
  // what the page sends: wrap serial.send (everyone calls it through the serial object)
  const send = serial.send;
  serial.send = line => {
    if (on) {
      const now = performance.now();
      if (lastTx && lastTx.line === line && now - lastTx.at < REPEAT_MS) { lastTx.n++; lastTx.at = now; }
      else { if (lastTx && lastTx.n) put({ k: "tx", line: lastTx.line, n: lastTx.n }); put({ k: "tx", line }); lastTx = { line, at: now, n: 0 }; }
    }
    return send(line);
  };
  live.note = (text, data) => put(Object.assign({ k: "note", text }, data || {}));

  setInterval(() => {   // connected / disconnected, and what the page shows
    if (serial.connected && !on) start();
    else if (!serial.connected && on) { stop(); return; }
    if (!on) return;
    let s = null; try { s = getState(); } catch (e) { s = { err: e.message }; }
    const sig = JSON.stringify(s);
    if (sig !== lastUi) { lastUi = sig; put(Object.assign({ k: "ui" }, s)); }
  }, UI_MS);
  setInterval(flush, FLUSH_MS);
  window.addEventListener("pagehide", () => {   // closing the tab: send what is left
    if (!on || all !== null) return;
    put({ k: "end", why: "page closed" });
    navigator.sendBeacon(`/log?name=${encodeURIComponent(name)}`, buf.join("\n") + "\n"); buf = [];
  });
  return { get on() { return on; }, get name() { return name; } };
}
