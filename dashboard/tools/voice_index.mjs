// Rebuilds media/voice/index.json from the story lines and the mp3 files present.
// Each entry is { file, dur, rate }: `file` carries a cache-buster (the file size) so a re-recorded
// line is never served from the browser cache; `rate` evens out the narrator's pace per line, so a
// slow line is played a little faster and a fast line is left alone. Prints what is missing.
// Usage: node dashboard/tools/voice_index.mjs
import { createHash } from "node:crypto";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "media", "voice");
const MAX_RATE = 1.35;          // the slowest line is sped up at most this much
const norm = s => s.trim().replace(/\s+/g, " ");
const keyOf = s => createHash("sha1").update(norm(s)).digest("hex").slice(0, 10);
const durationOf = f => {
  try { const m = execFileSync("afinfo", [f], { encoding: "utf8" }).match(/duration: ([\d.]+)/); return m ? parseFloat(m[1]) : NaN; }
  catch (e) { return NaN; }
};
const { LINES } = await import(pathToFileURL(join(ROOT, "js", "story", "lines.js")).href);
const rows = [], missing = [];
for (const l of LINES) {
  const text = norm(l), key = keyOf(text), file = `${key}.mp3`, path = join(OUT, file);
  if (!existsSync(path)) { missing.push(`${file}  <-  ${text}`); continue; }
  const dur = durationOf(path), size = statSync(path).size;
  rows.push({ key, file: `${file}?v=${size}`, dur, cps: text.length / dur, text });
}
// pace: letters per second of speech. Lines already at or above the 70th percentile keep rate 1.
const paces = rows.map(r => r.cps).filter(Number.isFinite).sort((a, b) => a - b);
const target = paces.length ? paces[Math.floor(paces.length * 0.7)] : 15;
const index = {};
for (const r of rows) {
  const rate = Number.isFinite(r.cps) ? Math.min(MAX_RATE, Math.max(1, target / r.cps)) : 1;
  index[r.key] = { file: r.file, dur: +r.dur.toFixed(2), rate: +rate.toFixed(3) };
}
writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 1));
console.log(`voice index: ${rows.length} of ${LINES.length} lines have a file; target pace ${target.toFixed(1)} letters/s`);
for (const r of rows.filter(r => index[r.key].rate > 1.001).sort((a, b) => a.cps - b.cps).slice(0, 8))
  console.log(`  ${index[r.key].rate}x  ${r.cps.toFixed(1)} l/s  ${r.text.slice(0, 50)}`);
if (missing.length) { console.log("missing (save the mp3 under this name in dashboard/media/voice/):"); missing.forEach(m => console.log("  " + m)); }
