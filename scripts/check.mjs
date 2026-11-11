import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dashboardSources = [
  { name: "main", path: resolve(root, "data", "data.js"), allowEmpty: false },
  { name: "user2", path: resolve(root, "data", "user2", "data.js"), allowEmpty: true }
];

async function readAndCheckDashboard(source) {
  const text = (await readFile(source.path, "utf8")).trim();
  const match = text.match(/^window\.KEIRIN_RECORDS\s*=\s*([\s\S]*);$/);
  if (!match) throw new Error(`${source.name}: invalid data format`);
  const records = JSON.parse(match[1]);
  if (!Array.isArray(records) || (!source.allowEmpty && records.length === 0)) throw new Error(`${source.name}: no records found`);
  const ids = new Set(records.map((record) => record.id));
  if (ids.size !== records.length) throw new Error(`${source.name}: duplicate record ids found`);
  for (const [index, record] of records.entries()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) throw new Error(`${source.name} record ${index + 1}: invalid date`);
    for (const key of ["race", "points", "confirmed", "stake", "payout"]) {
      if (!Number.isFinite(Number(record[key]))) throw new Error(`${source.name} record ${index + 1}: invalid ${key}`);
    }
  }
  return records;
}

const records = await readAndCheckDashboard(dashboardSources[0]);
const user2Records = await readAndCheckDashboard(dashboardSources[1]);
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
  if (girls.schemaVersion >= 3 && (!athlete.nameKana || typeof athlete.nameKana !== "string")) {
    throw new Error(`girls-stats.js: missing nameKana for ${athlete.registrationNo}`);
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
console.log(JSON.stringify({ records: records.length, user2Records: user2Records.length, stake, payout, profit: payout - stake, hits, girlsAthletes: girls.athletes.length, girlsResults: girls.resultRows, girlsDecisionChecked: girls.decisionCheckedRows }));

