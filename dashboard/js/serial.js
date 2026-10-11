// Live mode: talks to the Arduino over Web Serial (Chrome / Edge) at 115200 baud.
// Every line is kept for the raw-data log; tracker JSON lines become the live data.
export function createSerial({ onData, onEvent, onLine, onStatus }) {
  const link = {
    port: null, reader: null, writer: null, pipes: [], data: null, lastData: 0, version: null,
    stats: { since: 0, bytes: 0, lines: 0, json: 0, junk: 0 },
    get connected() { return !!link.port; },
    get fresh() { return !!link.data && performance.now() - link.lastData < 1500; },
  };

  link.connect = async function () {
    if (link.port) { await link.disconnect(); return; }
    if (!("serial" in navigator)) { onStatus("This browser cannot talk to USB. Open the console in Chrome or Edge."); return; }
    let p;
    try { p = await navigator.serial.requestPort(); await p.open({ baudRate: 115200 }); }
    catch (e) {
      onStatus(e.name === "NotFoundError" ? "No port chosen." :
        "Could not open the port. Another program has it: close the Arduino IDE Serial Monitor, or this console in another tab. (" + e.message + ")");
      return;
    }
    link.port = p; link.data = null; link.version = null;
    link.stats = { since: performance.now(), bytes: 0, lines: 0, json: 0, junk: 0 };
    onStatus("Connected. Listening…");
    const enc = new TextEncoderStream(), dec = new TextDecoderStream();
    link.pipes = [enc.readable.pipeTo(p.writable).catch(() => {}), p.readable.pipeTo(dec.writable).catch(() => {})];
    link.writer = enc.writable.getWriter(); link.reader = dec.readable.getReader();
    let buf = "";
    try {
      while (true) {
        const { value, done } = await link.reader.read();
        if (done) break;
        link.stats.bytes += value.length;
        link.stats.junk += (value.match(/[^\x09\x0a\x0d\x20-\x7e]/g) || []).length;
        buf += value;
        let k;
        while ((k = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, k).trim(); buf = buf.slice(k + 1);
          if (!line) continue;
          link.stats.lines++; onLine(line);
          if (line[0] !== "{") continue;
          try {
            const o = JSON.parse(line);
            if (o.hello) link.version = o.ver;
            else if (o.evt === "test") onEvent(o.step);
            else if (o.raw) { link.data = o; link.lastData = performance.now(); link.stats.json++; onData(o); }
          } catch (e) { /* a line cut in half while connecting */ }
        }
      }
    } catch (e) { onStatus("Disconnected: " + e.message); }
    link.port = null; link.writer = null;
  };

  // Releasing a Web Serial port: cancel the reader, close the writer, wait for both pipes
  // (they hold locks on the port's streams), then close the port itself.
  link.disconnect = async function () {
    const p = link.port;
    try { link.reader && await link.reader.cancel(); } catch (e) {}
    try { link.writer && await link.writer.close(); } catch (e) {}
    await Promise.allSettled(link.pipes);
    try { p && await p.close(); } catch (e) { onStatus("Could not release the port (" + e.message + "). Close this tab to free it."); }
    link.port = null; link.writer = null; link.reader = null; link.pipes = [];
    onStatus("Disconnected. The Arduino IDE can use the port now.");
  };

  link.send = async ch => { if (link.writer) await link.writer.write(ch + "\n"); };

  // What is wrong, in plain words, from what has (not) arrived.
  link.diagnose = function () {
    if (!link.port) return { state: "bad", text: "Arduino not connected", sub: "Click Connect and choose the Arduino. Close the IDE Serial Monitor first." };
    const age = performance.now() - link.stats.since, st = link.stats;
    if (link.fresh && !("lt" in link.data)) return { state: "bad", text: "Arduino runs the OLD tracker code", sub: "Upload the new firmware/tracker/tracker.ino (v4). Disconnect here first." };
    if (link.fresh && link.data.cfg && !("kst" in link.data.cfg)) return { state: "bad", text: "Arduino runs older tracker code", sub: "Upload the newest firmware/tracker/tracker.ino (Disconnect here first)." };
    if (link.fresh) return { state: "ok", text: "Arduino sending data", sub: `tracker v${link.version || 4} · 10 updates a second` };
    if (age < 2500) return { state: "wait", text: "Listening…", sub: "" };
    if (st.bytes === 0) return { state: "bad", text: "Connected, but the Arduino sends nothing", sub: "Upload firmware/tracker/tracker.ino, or press the board's RESET button." };
    if (st.junk > st.bytes * 0.2) return { state: "bad", text: "Wrong speed: the Arduino runs old code", sub: "It talks at 9600 baud. Upload firmware/tracker/tracker.ino (Disconnect here first)." };
    if (st.json === 0) return { state: "bad", text: "Arduino runs a different sketch", sub: "It sends text, not tracker data. Upload firmware/tracker/tracker.ino (Disconnect here first)." };
    return { state: "bad", text: "Data stopped", sub: "The Arduino may have restarted. Wait a second, or reconnect." };
  };

  window.addEventListener("beforeunload", () => { if (link.port) link.disconnect(); });
  return link;
}
