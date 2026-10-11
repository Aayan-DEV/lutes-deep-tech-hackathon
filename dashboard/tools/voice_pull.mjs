// Downloads finished ElevenLabs takes from a saved creative_get_flow_run_status JSON into media/voice/<key>.mp3
// and updates index.json. Usage: node dashboard/tools/voice_pull.mjs <status.json> [...more]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "media", "voice");
mkdirSync(OUT, { recursive: true });
const idxPath = join(OUT, "index.json");
const index = existsSync(idxPath) ? JSON.parse(readFileSync(idxPath, "utf8")) : {};
const norm = s => s.trim().replace(/\s+/g, " ");
const keyOf = s => createHash("sha1").update(norm(s)).digest("hex").slice(0, 10);
let n = 0;
for (const f of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(f, "utf8"));
  for (const m of j.media || []) {
    if (m.kind !== "audio" || !m.url || !m.prompt) continue;
    const key = keyOf(m.prompt), file = `${key}.mp3`;
    execFileSync("curl", ["-sL", "-o", join(OUT, file), m.url]);
    index[key] = file; n++; console.log("got", key, norm(m.prompt).slice(0, 50), m.duration_secs + "s");
  }
}
writeFileSync(idxPath, JSON.stringify(index, null, 1));
console.log(`pulled ${n}; index has ${Object.keys(index).length}`);
