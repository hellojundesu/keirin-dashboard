import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "data", "data.js");
const girlsSourcePath = resolve(root, "data", "girls-stats.js");
const indexPath = resolve(root, "public", "index.html");
const outputDir = resolve(root, "dist");

const source = (await readFile(sourcePath, "utf8")).trim();
const match = source.match(/^window\.KEIRIN_RECORDS\s*=\s*([\s\S]*);$/);
if (!match) throw new Error("data/data.js must assign an array to window.KEIRIN_RECORDS");
const records = JSON.parse(match[1]);
if (!Array.isArray(records)) throw new Error("data/data.js must contain an array");

const required = ["id", "date", "venue", "race", "time", "points", "hit", "confirmed", "stake", "payout"];
const seen = new Set();
for (const [index, record] of records.entries()) {
  for (const key of required) {
    if (!(key in record)) throw new Error(`Record ${index + 1}: missing ${key}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) throw new Error(`Record ${index + 1}: invalid date`);
  if (seen.has(record.id)) throw new Error(`Duplicate id: ${record.id}`);
  seen.add(record.id);
}

records.sort((a, b) => a.date.localeCompare(b.date) || a.venue.localeCompare(b.venue, "ja") || a.race - b.race);
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "index.html"), await readFile(indexPath));
await writeFile(resolve(outputDir, "data.js"), `window.KEIRIN_RECORDS = ${JSON.stringify(records)};\n`, "utf8");
await writeFile(resolve(outputDir, "girls-stats.js"), await readFile(girlsSourcePath));
await writeFile(resolve(outputDir, ".nojekyll"), "", "utf8");

console.log(`Built ${records.length} records into dist/`);
