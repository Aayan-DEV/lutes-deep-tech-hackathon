// The narrator's voice: one mp3 per line in media/voice/, found through media/voice/index.json
// ({ key: { file, rate } }, or the older { key: file }), key = the first 10 hex characters of the
// SHA-1 of the line (lines.js normLine). file may carry a "?v=..." cache-buster. rate is the line's
// own speed factor (1 = as recorded, up to about 1.35 for slow lines); it multiplies the presenter's
// voice speed (voice.rate), and a handle's duration and time are in real seconds at that speed.
// One line plays at a time. The story's sound toggle mutes the voice too.
//   voice.load()            fetches the index once (a missing index means no voice, no error)
//   voice.has(textOrKey)    is there a file for it (after load)
//   voice.play(textOrKey)   -> handle { duration (s, NaN until known), time (s), ended, failed } or null
//   voice.stop(handle?)     stops and rewinds the one playing (with a handle: only if it is that one)
//   voice.enabled           the sound toggle (sound.enabled)
import { sha1Hex } from "./sha1.js";
import { normLine } from "./lines.js";
import { sound } from "./sound.js";

const INDEX = new URL("../../media/voice/index.json", import.meta.url);
const ROOT = new URL("../../", import.meta.url);
const isKey = s => /^[0-9a-f]{10}$/.test(s);
export const voiceKey = text => sha1Hex(normLine(text)).slice(0, 10);

let files = null, loading = null, current = null;

function urlFor(file) {
  const f = String(file || "");
  if (!f) return null;
  if (/^https?:/i.test(f)) return f;
  return new URL(f, f.startsWith("media/") ? ROOT : INDEX).href;
}

// one index entry -> { url, rate } (null when it has no file). A string is the older form: rate 1.
function entry(v) {
  const url = urlFor(typeof v === "string" ? v : v && v.file);
  if (!url) return null;
  const r = v && typeof v === "object" ? Number(v.rate) : NaN;
  return { url, rate: r >= 0.5 && r <= 2 ? r : 1 };
}

export const voice = {
  load() {
    if (!loading) loading = (async () => {
      try {
        const r = await fetch(INDEX, { cache: "no-cache" });
        if (!r.ok) { files = new Map(); return; }
        const j = await r.json();
        files = new Map(Object.entries(j || {}).map(([k, v]) => [k, entry(v)]).filter(([, e]) => e));
        // warm the cache: small files, and the first ones play without a gap
        for (const e of [...files.values()].slice(0, 4)) fetch(e.url).catch(() => {});
      } catch (e) { files = new Map(); }
    })();
    return loading;
  },
  get ready() { return !!files; },
  get enabled() { return !!sound.enabled; },
  // Voice speed: 1 = as recorded. Set with ?rate=1.25 in the address or the story bar; remembered.
  get rate() {
    const q = parseFloat(new URLSearchParams(location.search).get("rate"));
    if (q >= 0.5 && q <= 2) return q;
    let s = NaN; try { s = parseFloat(localStorage.getItem("tracker-voice-rate")); } catch (e) {}
    return s >= 0.5 && s <= 2 ? s : 1;
  },
  setRate(r) {
    try { localStorage.setItem("tracker-voice-rate", String(r)); } catch (e) {}
    if (current && current.audio) current.audio.playbackRate = r * current.lineRate;
  },
  has(t) { return !!(files && files.get(isKey(t) ? t : voiceKey(t))); },
  play(t) {
    this.stop();
    if (!files || !sound.enabled || !t) return null;
    const e = files.get(isKey(t) ? t : voiceKey(t));
    if (!e) return null;
    const audio = new Audio(e.url);
    audio.preload = "auto";
    audio.playbackRate = e.rate * this.rate;       // faster voice, same pitch (Chrome keeps the pitch by default)
    try { audio.preservesPitch = true; } catch (err) { /* older browsers */ }
    // real seconds: the file's seconds over the speed it plays at now (the picker can change mid-line)
    const speed = () => audio.playbackRate > 0 ? audio.playbackRate : 1;
    const h = {
      audio, lineRate: e.rate, ended: false, failed: false,
      get duration() { return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration / speed() : NaN; },
      get time() { return (audio.currentTime || 0) / speed(); },
    };
    audio.addEventListener("ended", () => { h.ended = true; });
    audio.addEventListener("error", () => { h.failed = true; });
    const p = audio.play();
    if (p && p.catch) p.catch(() => { h.failed = true; });   // autoplay blocked: type at the old speed
    current = h;
    return h;
  },
  stop(h) {
    if (!current || (h && h !== current)) return;
    const { audio } = current;
    current.failed = true;
    current = null;
    try { audio.pause(); audio.currentTime = 0; audio.removeAttribute("src"); audio.load(); } catch (e) { /* already gone */ }
  },
};
