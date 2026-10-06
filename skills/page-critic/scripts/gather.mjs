#!/usr/bin/env node
// Gathers the agents' answers and the customers' logs into review.json and fixes.json, which report.mjs and fixes.mjs read.
//
//   node scripts/gather.mjs --out <folder> --product "<name>" [--replace]
//
// Reads in <folder>:
//   answer-*.json (or .md/.txt)   the agents' answers from step 3. A text with the JSON answer in it is good enough; the first JSON object is used.
//                                 Layer 1 (templates/agent-works.md) has pages.<name>.layer1, layer 3 (agent-polish.md) pages.<name>.layer3 and life.
//                                 Your own findings in layer 2 can stand in a file of the same form, e.g. answer-layer2.json with "findings" alone.
//   customer-*/customer-log.json  the blind customer's log from browse.mjs. Gets "folder", so the report finds the customer's last screen.
// The findings get ids F1, F2 … in the order Blocker, Friction, Polish, Upgrade, and a finding from layer 1 before one from layer 3 with the same severity.
// A life card whose "finding" is the title of a finding gets "fix" with the finding's id instead.
// If review.json or fixes.json already exists, nothing is written without --replace, so a verified list is not overwritten by accident.
//
// The agents' findings are claims. Gather first, then verify every finding, and correct the two files (SKILL.md, step 4).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { SEVERITY, command, write } from "./common.mjs";

const { options } = command(process.argv.slice(2), ["replace"]);
if (!options.out || options.out === true || !options.product || options.product === true) {
  console.error('Usage: node scripts/gather.mjs --out <folder> --product "<name>" [--replace]');
  process.exit(2);
}
const OUT = resolve(options.out);
if (!existsSync(OUT)) { console.error(`The folder ${OUT} does not exist.`); process.exit(2); }
const REVIEW = join(OUT, "review.json"), FIXES = join(OUT, "fixes.json");
if (!options.replace && (existsSync(REVIEW) || existsSync(FIXES))) {
  console.error("review.json or fixes.json already exists. Use --replace to write them from scratch.");
  process.exit(2);
}

// The first whole JSON object in the text: counts braces and skips what stands inside strings.
function firstObject(text) {
  for (let start = text.indexOf("{"); start > -1; start = text.indexOf("{", start + 1)) {
    let depth = 0, inString = false, escaped = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (inString) { if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') inString = false; continue; }
      if (c === '"') inString = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { break; }
      }
    }
  }
  return null;
}

const review = { product: options.product, pages: {}, customer: [], notSeen: [] };
const findings = [], aiAnswers = [], aiFindings = [], problems = [];
const entries = readdirSync(OUT, { withFileTypes: true });
const files = entries.filter((f) => f.isFile() && /^answer-.+\.(json|md|txt)$/i.test(f.name)).map((f) => f.name).sort();
const customers = entries.filter((f) => f.isDirectory() && /^customer-/.test(f.name) && existsSync(join(OUT, f.name, "customer-log.json"))).map((f) => f.name).sort();
if (!files.length && !customers.length) { console.error(`No answer-*.json and no customer-*/customer-log.json in ${OUT}.`); process.exit(2); }

for (const file of files) {
  const answer = firstObject(readFileSync(join(OUT, file), "utf8"));
  if (!answer) { problems.push(`${file}: no JSON object found.`); continue; }
  if (!answer.pages && !answer.findings) { problems.push(`${file}: neither pages nor findings.`); continue; }
  for (const [name, p] of Object.entries(answer.pages || {})) {
    const page = (review.pages[name] ||= {});
    for (const key of ["title", "job", "type", "layer1", "layer3", "life", "dontAnimate"]) {
      if (p[key] === undefined) continue;
      if (page[key] !== undefined && JSON.stringify(page[key]) !== JSON.stringify(p[key])) problems.push(`${file}: ${name}.${key} already exists from another answer. The first one is kept.`);
      else page[key] = p[key];
    }
    // Good from both layers, at most three in all (what the report allows). Layer 1 first, because it is about the page working.
    page.good = [...(page.good || []), ...(p.good || [])];
  }
  for (const f of answer.findings || []) findings.push({ ...f, source: file });
  if (answer.aiLook?.answer) aiAnswers.push(answer.aiLook.answer);
  aiFindings.push(...(answer.aiLook?.findings || []));
  review.notSeen.push(...(answer.notSeen || []));
}

// A customer without a result cannot stand in the report (agent-customer.md). It is written down, so it can be run again.
for (const folder of customers) {
  const log = firstObject(readFileSync(join(OUT, folder, "customer-log.json"), "utf8"));
  if (!log?.result) { problems.push(`${folder}: the customer has no result. Run the customer again, or write under limits that the task was not tried.`); continue; }
  review.customer.push({ ...log, folder });
}

// The fix list: worst first, and a finding from layer 1 before one from layer 3 with the same severity.
const EFFORT = ["small", "medium", "large"];
const sorted = findings
  .map((f, i) => ({ f, i }))
  .sort((a, b) => SEVERITY.indexOf(a.f.severity) - SEVERITY.indexOf(b.f.severity) || (a.f.layer || 9) - (b.f.layer || 9) || a.i - b.i)
  .map(({ f }) => f);
const fixes = sorted.map((f, i) => {
  const x = { id: `F${i + 1}`, title: f.title, pages: f.pages, layer: f.layer, severity: f.severity, finding: f.finding, evidence: f.evidence || [], change: f.change };
  if (f.files?.length) x.files = f.files;
  if (EFFORT.includes(f.effort)) x.effort = f.effort;
  if (f.targets?.length) x.targets = f.targets;
  if (!SEVERITY.includes(f.severity)) problems.push(`${x.id} (${f.source}): severity "${f.severity}" is not one of ${SEVERITY.join(", ")}.`);
  if (f.severity === "Upgrade" && f.layer !== 3) problems.push(`${x.id} (${f.source}): Upgrade is only used in layer 3.`);
  return x;
});

// The pattern names in the life cards must stand in templates/patterns.md, so the report can refer to them.
// A life card that names a finding by its title points to the finding's id afterwards.
const PATTERNS = new Set([...readFileSync(new URL("../templates/patterns.md", import.meta.url), "utf8")
  .matchAll(/^### (.+)$/gm)].map((m) => m[1].trim().toLowerCase()));
for (const [name, p] of Object.entries(review.pages)) {
  for (const [i, card] of (p.life || []).entries()) {
    if (card.pattern && !PATTERNS.has(String(card.pattern).trim().toLowerCase())) problems.push(`${name}: the pattern "${card.pattern}" is not in templates/patterns.md.`);
    if (!card.finding) continue;
    const id = fixes.find((x) => x.title === card.finding)?.id;
    if (id) { const { finding: _, ...rest } = card; p.life[i] = { ...rest, fix: id }; }
    else problems.push(`${name}: life card ${i + 1} names the finding "${card.finding}", which is not among the findings.`);
  }
  if (p.good.length > 3) { problems.push(`${name}: ${p.good.length} things under good. The first three are kept.`); p.good = p.good.slice(0, 3); }
  if (!p.good.length) delete p.good;
  if (!p.title || !p.job) problems.push(`${name}: title and job are missing. Copy them from PAGES.md.`);
}
if (aiAnswers.length) review.aiLook = { answer: aiAnswers.join(" "), findings: [...new Set(aiFindings)] };
if (!review.customer.length) delete review.customer;
if (!review.notSeen.length) delete review.notSeen;

// Possible duplicates: findings from two different answers that point to overlapping lines in the same file.
const places = (f) => (f.files || []).map((s) => String(s).match(/^(.+?):(\d+)(?:-(\d+))?$/)).filter(Boolean)
  .map(([, file, from, to]) => ({ file, from: +from, to: +(to || from) }));
for (let a = 0; a < sorted.length; a++) for (let b = a + 1; b < sorted.length; b++) {
  if (sorted[a].source === sorted[b].source) continue;
  const shared = places(sorted[a]).find((x) => places(sorted[b]).some((y) => x.file === y.file && x.from <= y.to && y.from <= x.to));
  if (shared) problems.push(`${fixes[a].id} and ${fixes[b].id} both point to ${shared.file}:${shared.from}. Merge them if it is the same finding.`);
}

write(REVIEW, review);
if (fixes.length) write(FIXES, { product: options.product, fixes });
const pageCount = Object.keys(review.pages).length, c = review.customer?.length || 0;
console.log(`Gathered ${files.length} ${files.length === 1 ? "answer" : "answers"} and ${c} ${c === 1 ? "customer" : "customers"}: ${pageCount} ${pageCount === 1 ? "page" : "pages"}, ${fixes.length} ${fixes.length === 1 ? "finding" : "findings"}.`);
console.log(`Wrote review.json${fixes.length ? " and fixes.json" : ""}. Verify the findings, then run: node scripts/fixes.mjs check --out ${options.out}`);
if (problems.length) console.log(`\nCheck:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
