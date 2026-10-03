#!/usr/bin/env node
// Puts two measurements side by side, page by page. Writes a markdown table.
//
//   node scripts/compare.mjs <folder>                        (measurement-previous.json against measurement.json)
//   node scripts/compare.mjs <before.json> <after.json>

import { join } from "node:path";
import { LABEL, read, comparePage } from "./common.mjs";

const [a, b] = process.argv.slice(2);
if (!a) { console.error("Usage: node scripts/compare.mjs <folder> | <before.json> <after.json>"); process.exit(2); }
const before = read(b ? a : join(a, "measurement-previous.json"));
const after = read(b ? b : join(a, "measurement.json"));

console.log(`Before: ${before.measured}${before.mode ? ` (${before.mode})` : ""} · After: ${after.measured}${after.mode ? ` (${after.mode})` : ""}\n`);
let better = 0, worse = 0;
for (const e of after.pages) {
  const f = before.pages.find((p) => p.name === e.name);
  console.log(`### ${e.name}`);
  if (e.notSeen) { console.log(`Not seen: ${e.notSeen}\n`); continue; }
  if (!f || f.notSeen) { console.log("New page, nothing to compare with.\n"); continue; }
  console.log("| Metric | Before | After | |\n|---|---|---|---|");
  if (e.layer2) {
    const x = f.layer2?.score, y = e.layer2.score;
    console.log(`| **Layer 2, score** | ${x ?? "–"} | ${y} | ${x === undefined || x === y ? "" : y > x ? "better" : "worse"} |`);
  }
  const s = comparePage(f, e);
  for (const r of s.rows) console.log(`| ${LABEL[r.metric]} | ${r.before ?? "–"} | ${r.after ?? "–"} | ${r.sign} |`);
  better += s.better;
  worse += s.worse;
  console.log("");
}
const gone = before.pages.filter((f) => !after.pages.some((e) => e.name === f.name)).map((p) => p.name);
if (gone.length) console.log(`Only in the before measurement: ${gone.join(", ")}\n`);
console.log(`In total: ${better} ${better === 1 ? "metric" : "metrics"} better, ${worse} ${worse === 1 ? "metric" : "metrics"} worse.`);
