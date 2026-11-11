import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const girlsSourcePath = resolve(root, "data", "girls-stats.js");
const indexPath = resolve(root, "public", "index.html");
const outputDir = resolve(root, "dist");
const dashboards = [
  { name: "main", sourcePath: resolve(root, "data", "data.js"), outputDir },
  { name: "user2", sourcePath: resolve(root, "data", "user2", "data.js"), outputDir: resolve(outputDir, "user2") }
];

function parseRecords(source, label) {
  const match = source.trim().match(/^window\.KEIRIN_RECORDS\s*=\s*([\s\S]*);$/);
  if (!match) throw new Error(`${label} must assign an array to window.KEIRIN_RECORDS`);
  const records = JSON.parse(match[1]);
  if (!Array.isArray(records)) throw new Error(`${label} must contain an array`);
  return records;
}

const required = ["id", "date", "venue", "race", "time", "points", "hit", "confirmed", "stake", "payout"];
function validateRecords(records, label) {
  const seen = new Set();
  for (const [index, record] of records.entries()) {
    for (const key of required) {
      if (!(key in record)) throw new Error(`${label} record ${index + 1}: missing ${key}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) throw new Error(`${label} record ${index + 1}: invalid date`);
    if (seen.has(record.id)) throw new Error(`${label} duplicate id: ${record.id}`);
    seen.add(record.id);
  }
}

const index = await readFile(indexPath);
const girls = await readFile(girlsSourcePath);
const buildResults = [];
for (const dashboard of dashboards) {
  const records = parseRecords(await readFile(dashboard.sourcePath, "utf8"), dashboard.sourcePath);
  validateRecords(records, dashboard.name);
  records.sort((a, b) => a.date.localeCompare(b.date) || a.venue.localeCompare(b.venue, "ja") || a.race - b.race);
  await mkdir(dashboard.outputDir, { recursive: true });
  await writeFile(resolve(dashboard.outputDir, "index.html"), index);
  await writeFile(resolve(dashboard.outputDir, "data.js"), `window.KEIRIN_RECORDS = ${JSON.stringify(records)};\n`, "utf8");
  await writeFile(resolve(dashboard.outputDir, "girls-stats.js"), girls);
  buildResults.push(`${dashboard.name}: ${records.length}`);
}
await writeFile(resolve(outputDir, ".nojekyll"), "", "utf8");

console.log(`Built dashboards into dist/ (${buildResults.join(", ")})`);

