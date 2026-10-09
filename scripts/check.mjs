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
const girlsSource = (await readFile(resolve(root, "data", "girls-stats.js"), "utf8")).trim();
const girlsMatch = girlsSource.match(/^window\.GIRLS_TRACK_STATS\s*=\s*([\s\S]*);$/);
if (!girlsMatch) throw new Error("data/girls-stats.js has an invalid format");
const girls = JSON.parse(girlsMatch[1]);
if (!Array.isArray(girls.athletes)) throw new Error("girls-stats.js: athletes must be an array");
for (const athlete of girls.athletes) {
  if (!athlete.registrationNo || !athlete.name || !Array.isArray(athlete.venues)) {
    throw new Error("girls-stats.js: invalid athlete record");
  }
  for (const venue of athlete.venues) {
    if (venue.wins > venue.top2 || venue.top2 > venue.top3 || venue.top3 > venue.starts) {
      throw new Error(`girls-stats.js: invalid counts for ${athlete.registrationNo} ${venue.venueCode}`);
    }
    const decisions = ["decisionEscape", "decisionSprint", "decisionPass", "decisionMark"];
    if (decisions.some((key) => !Number.isInteger(venue[key]) || venue[key] < 0)) {
      throw new Error(`girls-stats.js: invalid decision counts for ${athlete.registrationNo} ${venue.venueCode}`);
    }
    if (decisions.reduce((sum, key) => sum + venue[key], 0) > venue.decisionChecked) {
      throw new Error(`girls-stats.js: decision counts exceed checked rows for ${athlete.registrationNo} ${venue.venueCode}`);
    }
  }
}
console.log(JSON.stringify({ records: records.length, stake, payout, profit: payout - stake, hits, girlsAthletes: girls.athletes.length, girlsResults: girls.resultRows, girlsDecisionChecked: girls.decisionCheckedRows }));
