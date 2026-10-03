#!/usr/bin/env node
// The fix list: checks it, writes a prompt for whoever does the fixing, and keeps track of what is solved.
//
//   node scripts/fixes.mjs check  --out <folder>                 is the list in order? Locks the "before" numbers.
//   node scripts/fixes.mjs prompt --out <folder> [--only F1,F4]  writes <folder>/fix-prompt.md
//   node scripts/fixes.mjs status --out <folder>                 solved, partial or unsolved, judged by the newest measurement
//   node scripts/fixes.mjs choose --out <folder> F4 B            saves which variant the user chose
//
// The list lives in <folder>/fixes.json. The format is in templates/fixes-example.json.

import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SEVERITY, LABEL, date, exists, limitText, command, read, readIf, measuredPage, nameOf, met, fixStatus, write, value } from "./common.mjs";

const PC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { words, options } = command();
const [action, ...rest] = words;
const ACTIONS = ["check", "prompt", "status", "choose"];
if (!ACTIONS.includes(action) || !options.out || options.out === true) {
  console.error("Usage: node scripts/fixes.mjs <check|prompt|status|choose> --out <folder> [--only F1,F4] [<id> <letter>]");
  process.exit(2);
}
const OUT = resolve(options.out);
const FILE = join(OUT, "fixes.json");
if (!existsSync(FILE)) { console.error(`Missing ${FILE}. See templates/fixes-example.json.`); process.exit(2); }
const list = read(FILE);
const measurement = readIf(join(OUT, "measurement.json"));

const EFFORT = ["small", "medium", "large"];
const LETTERS = ["A", "B", "C"];
const REPLAY = /^(load|(click|hover|focus|press):\s*\S.*)$/;
const pageMeasured = (name) => measuredPage(measurement, name);
const pagesText = (f) => (f.pages === "all" ? "all pages" : f.pages.join(", "));
// A fix with a preview needs a chosen variant before it can be built.
const waitingForChoice = (f) => !!f.preview && !f.chosen;

// ---------- check ----------

function check() {
  const errors = [], seen = new Set();
  const sys = list.systemDecisions || [];
  const fixes = list.fixes || [];
  if (!list.product) errors.push("Missing product.");
  if (!fixes.length) errors.push("The list has no fixes.");
  for (const s of sys) {
    const where = s.id || "(system decision without id)";
    if (!/^S\d+$/.test(s.id || "")) errors.push(`${where}: the id must be S1, S2 …`);
    if (seen.has(s.id)) errors.push(`${where}: the id is used twice.`);
    seen.add(s.id);
    for (const key of ["title", "why", "proposal"]) if (!s[key]) errors.push(`${where}: missing ${key}.`);
  }
  for (const f of fixes) {
    const where = f.id || "(fix without id)";
    if (!/^F\d+$/.test(f.id || "")) errors.push(`${where}: the id must be F1, F2 …`);
    if (seen.has(f.id)) errors.push(`${where}: the id is used twice.`);
    seen.add(f.id);
    for (const key of ["title", "finding", "change"]) if (!f[key]) errors.push(`${where}: missing ${key}.`);
    if (f.pages !== "all" && !(Array.isArray(f.pages) && f.pages.length)) errors.push(`${where}: pages must be "all" or a list of page names.`);
    if (![1, 2, 3].includes(f.layer)) errors.push(`${where}: layer must be 1, 2 or 3.`);
    if (!SEVERITY.includes(f.severity)) errors.push(`${where}: severity must be ${SEVERITY.join(", ")}.`);
    if (f.severity === "Upgrade" && f.layer !== 3) errors.push(`${where}: an Upgrade belongs in layer 3. If something is broken, it is not an upgrade.`);
    if (f.effort && !EFFORT.includes(f.effort)) errors.push(`${where}: effort must be ${EFFORT.join(", ")}.`);
    // A finding without evidence does not make the list.
    if (!(Array.isArray(f.evidence) && f.evidence.length)) errors.push(`${where}: missing evidence (a screenshot, a measurement or a file with a line number).`);
    for (const e of f.evidence || []) if (/^[\w.-]+\.(png|jpe?g|webp)$/i.test(e) && !existsSync(join(OUT, e))) errors.push(`${where}: the evidence ${e} is not in the folder.`);
    if (measurement && Array.isArray(f.pages)) for (const p of f.pages) if (!measurement.pages.some((x) => x.name === p)) errors.push(`${where}: the page "${p}" is not in the measurement.`);
    for (const t of f.targets || []) {
      if (!t.page || !t.metric) { errors.push(`${where}: a target needs a page and a metric.`); continue; }
      if (t.metric !== "layer2" && !(t.metric in LABEL)) errors.push(`${where}: "${t.metric}" is not a metric in the measurement.`);
      if (exists(t.atMost) === exists(t.atLeast)) errors.push(`${where}: the target for ${t.metric} needs either atMost or atLeast.`);
      const page = pageMeasured(t.page);
      if (measurement && !page) errors.push(`${where}: the target points to the page "${t.page}", which was not measured.`);
      // "Before" is locked the first time, so status can later see whether the number has moved.
      if (page && !exists(t.before)) t.before = value(page, t.metric) ?? null;
      if (page && exists(t.before) && met(t, t.before) && !f.status) errors.push(`${where}: the target for ${t.metric} on ${t.page} is already met (${t.before}). Then it is not a finding.`);
    }
    const p = f.preview;
    if (p) {
      if (!p.page) errors.push(`${where}: the preview is missing a page.`);
      else if (!existsSync(join(OUT, `${p.page}.copy.html`))) errors.push(`${where}: ${p.page}.copy.html does not exist. The measurement saves a copy of every page it reaches: run it, and check whether the page is listed as "NOT SEEN".`);
      if (p.replay && !REPLAY.test(p.replay)) errors.push(`${where}: replay must be "load" or "click: <selector>", "hover: …", "focus: …", "press: …".`);
      const v = p.variants || [];
      if (v.length !== 3 || v.some((x, i) => x.letter !== LETTERS[i])) errors.push(`${where}: the preview needs three variants, A, B and C.`);
      for (const x of v) {
        if (!x.name || !x.what) errors.push(`${where}: variant ${x.letter || "?"} is missing name or what.`);
        if (!x.css && !x.js && !(x.html || []).length) errors.push(`${where}: variant ${x.letter || "?"} changes nothing (css, js or html).`);
      }
      if (new Set(v.map((x) => `${x.css || ""}|${x.js || ""}|${JSON.stringify(x.html || [])}`)).size < v.length) errors.push(`${where}: two variants are the same.`);
    }
    if (f.chosen && !(p?.variants || []).some((x) => x.letter === f.chosen)) errors.push(`${where}: chosen is "${f.chosen}", but that variant does not exist.`);
  }
  for (const s of sys) for (const id of s.affects || []) if (!fixes.some((f) => f.id === id)) errors.push(`${s.id}: affects ${id}, which does not exist.`);
  return errors;
}

// ---------- prompt ----------

function prompt(only) {
  const included = (list.fixes || []).filter((f) => (only ? only.includes(f.id) : f.status !== "solved"));
  const ready = included.filter((f) => !waitingForChoice(f)).sort((a, b) => SEVERITY.indexOf(a.severity) - SEVERITY.indexOf(b.severity));
  const waiting = included.filter(waitingForChoice);
  const sys = (list.systemDecisions || []).filter((s) => !only || (s.affects || []).some((id) => only.includes(id)) || !(s.affects || []).length);
  const L = [];
  L.push(`# Fix ${list.product}: ${ready.length} ${ready.length === 1 ? "fix" : "fixes"} from the page review`, "");
  L.push(`Your job is to fix the findings below${list.repo ? `, in \`${list.repo}\`` : ""}. The list comes from a review where the pages were opened and measured in a real browser${measurement ? ` on ${date(measurement.measured)} against ${measurement.base}` : ""}. Every finding has evidence, and most have a target that can be measured again afterwards.`, "");

  L.push("## Rules", "");
  L.push("- Fix only what is on the list. If you notice something else on the way, mention it in your answer instead of fixing it.");
  L.push("- Take one fix at a time in the order they are listed, and make one commit per fix with the id first in the message, e.g. `F3: larger tap targets in the menu`.");
  L.push("- Read the file before you change it. \"Where\" is where the problem was seen. If the cause lies elsewhere, fix it there, and say so.");
  if (sys.length) L.push("- The system decisions apply to every fix. Do not introduce colours, font sizes, spacings or curves beyond them.");
  L.push("- New motion must be possible to turn off: write it inside `@media (prefers-reduced-motion: no-preference)`, or remove it under `reduce`. Hover effects go inside `@media (hover: hover) and (pointer: fine)`. Never write `transition: all`.");
  L.push("- If a variant was chosen, its CSS is a starting point that was tried on a copy of the page. Rewrite it to use the project's own tokens and classes.");
  L.push("- Run the project's own tests before you report back. Do not deploy, and do not push, unless you are asked to.");
  for (const rule of list.rules || []) L.push(`- ${rule}`);
  L.push("");

  if (sys.length) {
    L.push("## System decisions", "", "These are choices for the whole product. They need to be in place before the individual fixes make sense.", "");
    for (const s of sys) {
      L.push(`### ${s.id} · ${s.title}`, "");
      L.push(`- **Why:** ${s.why}`);
      L.push(`- **Decision:** ${s.decided || s.proposal}${s.decided ? "" : " (proposal, not confirmed by the user)"}`);
      if ((s.affects || []).length) L.push(`- **Affects:** ${s.affects.join(", ")}`);
      L.push("");
    }
  }

  L.push("## Fixes", "");
  if (!ready.length) L.push("No fixes are ready to be built.", "");
  for (const f of ready) {
    L.push(`### ${f.id} · ${f.severity}${f.effort ? ` · ${f.effort}` : ""} · ${f.title}`, "");
    L.push(`- **Pages:** ${pagesText(f)}`);
    L.push(`- **Finding:** ${f.finding}`);
    L.push(`- **Evidence:** ${f.evidence.join(" · ")}`);
    L.push(`- **Change:** ${f.change}`);
    if ((f.files || []).length) L.push(`- **Where:** ${f.files.map((x) => `\`${x}\``).join(", ")}`);
    if ((f.targets || []).length) L.push(`- **Done when:** ${f.targets.map((t) => `"${nameOf(t.metric)}" on ${t.page} is ${limitText(t)}${exists(t.before) ? ` (before: ${t.before})` : ""}`).join("; ")}.`);
    else L.push("- **Done when:** the change can be seen on the page. It cannot be measured, so take a screenshot before and after.");
    const v = f.chosen && f.preview.variants.find((x) => x.letter === f.chosen);
    if (v) {
      L.push(`- **Chosen variant:** ${v.letter}, ${v.name}. ${v.what}`, "");
      for (const part of [f.preview.shared, v]) {
        if (part?.html?.length) for (const h of part.html) L.push(`Insert (${h.where || "last"} in \`${h.selector}\`):`, "", "```html", h.html.trim(), "```", "");
        if (part?.css) L.push("```css", part.css.trim(), "```", "");
        if (part?.js) L.push("```js", part.js.trim(), "```", "");
      }
    } else L.push("");
  }

  if (waiting.length) {
    L.push("## Waiting for a choice", "", "These fixes are visual, and the user has not chosen a variant yet. Do not build them.", "");
    for (const f of waiting) L.push(`- ${f.id} · ${f.title}`);
    L.push("");
  }

  const plan = list.plan || "<plan.json>";
  L.push("## How to verify", "");
  L.push("Start the app with your changes somewhere that is not production. The measurement fills in and submits forms.", "");
  L.push("```", `node ${PC}/scripts/measure.mjs --plan ${plan} --out ${OUT}`, `node ${PC}/scripts/fixes.mjs status --out ${OUT}`, "```", "");
  L.push("The first command measures the pages again and keeps the old measurement as `measurement-previous.json`. The second shows, for each fix, whether it is solved, partly solved or unsolved. If the plan's `base` points to a deployed address, measure your local version by adding `--base <address>` to the first command.", "");
  L.push("## Answer with", "");
  L.push("One line per fix: the id, what you changed (file and line), and what the status command says. Then whatever you noticed on the way but did not fix.", "");
  return { text: L.join("\n"), ready, waiting };
}

// ---------- run ----------

const errors = check();
if (errors.length) {
  console.error(`${errors.length} ${errors.length === 1 ? "error" : "errors"} in fixes.json:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}

if (action === "check") {
  write(FILE, list);
  const count = (s) => list.fixes.filter((f) => f.severity === s).length;
  const n = list.fixes.length, s = (list.systemDecisions || []).length;
  console.log(`The list is in order: ${n} ${n === 1 ? "fix" : "fixes"} (${SEVERITY.map((x) => `${count(x)} ${x.toLowerCase()}`).join(", ")}), ${s} ${s === 1 ? "system decision" : "system decisions"}.`);
  const visual = list.fixes.filter((f) => f.preview);
  if (visual.length) console.log(`Can be shown in three variants: ${visual.map((f) => f.id + (f.chosen ? ` (chose ${f.chosen})` : "")).join(", ")}.`);
  if (!measurement) console.log("No measurement.json in the folder, so the targets have not been checked against a measurement.");
}

if (action === "status") {
  if (!measurement) { console.error(`Missing ${join(OUT, "measurement.json")}.`); process.exit(2); }
  console.log(`Measurement: ${date(measurement.measured)} against ${measurement.base}\n`);
  console.log("| | Fix | Status | Targets |\n|---|---|---|---|");
  const counts = {};
  for (const f of list.fixes) {
    const s = fixStatus(f, measurement);
    f.status = s.status;
    for (const [i, t] of s.targets.entries()) f.targets[i].now = t.now;
    counts[s.status] = (counts[s.status] || 0) + 1;
    const targets = s.targets.map((t) => `${nameOf(t.metric)} on ${t.page}: ${t.before ?? "–"} → ${t.now ?? "–"} (${limitText(t)})`).join("<br>") || "cannot be measured";
    console.log(`| ${f.id} | ${f.title} | **${s.status}** | ${targets} |`);
  }
  write(FILE, list);
  console.log(`\n${Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(", ")}.`);
  if (counts["needs a look"]) console.log("\"Needs a look\" has no target. Check the screenshots, and set the status yourself in fixes.json.");
}

if (action === "choose") {
  const [id, letter] = [rest[0]?.toUpperCase(), rest[1]?.toUpperCase()];
  const f = list.fixes.find((x) => x.id === id);
  if (!f) { console.error(`${id || "(no id)"} is not on the list.`); process.exit(1); }
  const v = f.preview?.variants.find((x) => x.letter === letter);
  if (!v) { console.error(`${id} has no variant ${letter || "(no letter)"}.`); process.exit(1); }
  f.chosen = letter;
  write(FILE, list);
  console.log(`${id}: variant ${letter} (${v.name}) is chosen.`);
}

if (action === "prompt") {
  const only = typeof options.only === "string" ? options.only.split(",").map((s) => s.trim().toUpperCase()) : null;
  const unknown = (only || []).filter((id) => !list.fixes.some((f) => f.id === id));
  if (unknown.length) { console.error(`Not on the list: ${unknown.join(", ")}.`); process.exit(1); }
  const { text, ready, waiting } = prompt(only);
  const file = join(OUT, "fix-prompt.md");
  writeFileSync(file, text);
  console.log(`Wrote ${file}: ${ready.length} ready to build${waiting.length ? `, ${waiting.length} waiting for a variant to be chosen (${waiting.map((f) => f.id).join(", ")})` : ""}.`);
}
