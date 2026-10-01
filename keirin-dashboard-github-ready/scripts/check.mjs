import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = (await readFile(resolve(root, "data", "data.js"), "utf8")).trim();
const match = source.match(/^window\.KEIRIN_RECORDS\s*=\s*([\s\S]*);$/);
if (!match) throw new Error("data/data.js has an invalid format");
const records = JSON.parse(match[1]);
if (!Array.isArray(records) || records.length === 0) throw new Error("No records found");
const ids = new Set(records.map((record) => record.id));
if (ids.size !== records.length) throw new Error("Duplicate record ids found");
for (const [index, record] of records.entries()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) throw new Error(`Record ${index + 1}: invalid date`);
  for (const key of ["race", "points", "confirmed", "stake", "payout"]) {
    if (!Number.isFinite(Number(record[key]))) throw new Error(`Record ${index + 1}: invalid ${key}`);
  }
}

const stake = records.reduce((sum, record) => sum + Number(record.stake || 0), 0);
const payout = records.reduce((sum, record) => sum + Number(record.payout || 0), 0);
const hits = records.filter((record) => record.hit).length;
console.log(JSON.stringify({ records: records.length, stake, payout, profit: payout - stake, hits }));
