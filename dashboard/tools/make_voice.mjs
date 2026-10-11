// Makes one mp3 per story line with a free neural voice (Microsoft, through the open source
// edge-tts tool) and writes media/voice/index.json so the page can find them.
// Usage:  node dashboard/tools/make_voice.mjs            (needs `pip install edge-tts`, internet once)
//         EDGE_TTS=/path/to/edge-tts node dashboard/tools/make_voice.mjs
// Lines come from dashboard/js/story/lines.js (pure data). A line's file is named by a short hash
// of its text, so changing a sentence makes a new file and the old one is left alone.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT = join(ROOT, "media", "voice");
const VOICE = process.env.VOICE || "en-GB-RyanNeural";
const RATE = process.env.RATE || "-4%";
const BIN = process.env.EDGE_TTS || "edge-tts";

const norm = s => s.trim().replace(/\s+/g, " ");
const keyOf = s => createHash("sha1").update(norm(s)).digest("hex").slice(0, 10);

const { LINES } = await import(pathToFileURL(join(ROOT, "js", "story", "lines.js")).href);
mkdirSync(OUT, { recursive: true });
const indexPath = join(OUT, "index.json");
const index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, "utf8")) : {};

let made = 0, kept = 0, failed = 0;
for (const raw of LINES) {
  const text = norm(raw);
  if (!text) continue;
  const key = keyOf(text), file = `${key}.mp3`;
  if (existsSync(join(OUT, file))) { index[key] = file; kept++; continue; }
  const r = spawnSync(BIN, ["--voice", VOICE, `--rate=${RATE}`, "--text", text, "--write-media", join(OUT, file)], { encoding: "utf8" });
  if (r.status === 0 && existsSync(join(OUT, file))) { index[key] = file; made++; console.log("made ", key, text.slice(0, 60)); }
  else { failed++; console.error("FAILED", key, text.slice(0, 60), r.stderr?.trim().split("\n").pop()); }
}
writeFileSync(indexPath, JSON.stringify(index, null, 1));
console.log(`voice: ${made} made, ${kept} kept, ${failed} failed, ${Object.keys(index).length} in index (${VOICE})`);
