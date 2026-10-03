#!/usr/bin/env node
// Shows what the measurement knows about one page, as text and ordered by the checklist's items.
// For the agents in layers 1 and 3 and for whoever writes the findings in layer 2, so nobody has to search all of measurement.json.
//
//   node scripts/extract.mjs --out <folder>                          the measured pages
//   node scripts/extract.mjs --out <folder> --page <name>            everything about the page
//   node scripts/extract.mjs --out <folder> --page <name> --layer 1  only one layer (1, 2 or 3)
//
// Every field is shown with its path in measurement.json and its value as it stands there, so it can be used as evidence in a finding.

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { LABEL, LIMIT, GROUP, GROUP_METRICS, LAYER1, LAYER3, NEUTRAL, date, isMeasured, exists, command, read } from "./common.mjs";
import { imageSize, slicesOf, slicePlan } from "./png.mjs";

const { options } = command();
const stop = (text, code = 2) => { console.error(text); process.exit(code); };
if (!options.out || options.out === true || options.page === true || (exists(options.layer) && !["1", "2", "3"].includes(options.layer)))
  stop("Usage: node scripts/extract.mjs --out <folder> [--page <name>] [--layer 1|2|3]");
const OUT = resolve(options.out);
if (!existsSync(join(OUT, "measurement.json"))) stop(`Missing ${join(OUT, "measurement.json")}. Run the measurement first.`);
const measurement = read(join(OUT, "measurement.json"));

// The fields under each item, in the same order as LAYER1 and LAYER3. The same fields are listed in templates/checklist.md.
// A star stands for every width that was measured (alignment.*.nearlyAligned). notFoundPage sits at the top of the measurement and is the same for every page.
const FIELDS1 = [
  ["structure.h1", "structure.title"],
  [],
  ["copy"],
  ["fields", "form.invalidFields"],
  ["stress", "clipped", "notFoundPage"],
  ["doubleSubmit", "performance.inpMs"],
  ["structure.title", "structure.landmarks", "notFoundPage.linkHome"],
  [],
  ["structure.levelSkips", "structure.landmarks", "structure.lang", "structure.imagesWithoutAlt", "structure.live", "form.liveRegions", "form.focusOnError", "keyboard.stops", "keyboard.expectedWithArrowKeys", "keyboard.sameTargetReached", "keyboard.interrupted", "keyboard.notTried", "keyboard.trapped"],
  ["system.radii", "system.textColours", "system.surfaceColours", "typography.fonts"],
];
const FIELDS3 = [
  ["typography"],
  ["alignment.*.nearlyAligned", "alignment.*.cardsUnevenHeight", "alignment.*.fieldAndButtonUneven", "system.spacings"],
  ["system.shadows", "system.radii", "alignment.*.innerRadiusTooLarge"],
  ["system.textColours", "system.surfaceColours", "dark.exists"],
  ["mouse", "motion.hoverRules", "motion.hoverWithoutMedia", "motion.activeRules", "motion.focusVisibleRules"],
  ["motion.transitionAll", "motion.layoutProperties", "motion.keyframesWithLayout", "motion.overThreeHundred", "motion.linear", "motion.bouncyCurves",
    "motion.durations", "motion.curves", "motion.offscreen", "motion.reducedMotionRules", "motion.disabled", "reducedMotion.stillRunning", "reducedMotion.onlyFadeOrColour"],
  ["motion.transitions", "motion.keyframes", "motion.onLoad", "motion.onScroll", "motion.entrances", "motion.viewTransitions", "motion.scrollDriven"],
  ["aiLook.clear", "aiLook.suspect", "structure.imagesWithoutSize", "performance.cls", "notFoundPage"],
];
// What lies behind the numbers in each group in layer 2.
const FIELDS2 = {
  errors: ["consoleErrors", "failedRequests", "structure.brokenImages"],
  narrowScreen: ["overflow.320", "overflow.390"],
  fingers: ["targets", "fieldsMobile"],
  readability: ["contrast", "axe", "fields", "structure.viewport"],
  keyboard: ["keyboard"],
  form: ["form"],
  speed: ["performance"],
  calm: ["reducedMotion.stillRunning", "structure.imagesWithoutSize"],
};
const NONE = "(no fields in the measurement; see the screenshots)";
const NOTE = { Mobile: "(see the mobile screenshot; horizontal scroll, tap targets and field text size are under layer 2)" };

// ---------- a value as text ----------

const MOST = 12, CUT = 220;
const clip = (t) => (t.length > CUT ? `${t.slice(0, CUT)}…` : t);
const simple = (v) => v === null || typeof v !== "object";
const entry = (v) => Object.entries(v).map(([k, x]) => `${k}: ${short(x)}`).join(", ");
// A value on one line.
function short(v) {
  if (simple(v)) return v === "" ? '""' : clip(String(v));
  if (Array.isArray(v)) return `[${v.slice(0, MOST).map(short).join("; ")}${v.length > MOST ? `; … and ${v.length - MOST} more` : ""}]`;
  return `{${entry(v)}}`;
}
// A field as lines. A list gets one line per entry, an object one line per field, and everything else stays on the line.
function show(name, v) {
  if (Array.isArray(v)) {
    if (!v.length) return [`${name}: none`];
    if (v.every((x) => typeof x === "number" || (typeof x === "string" && /^[^\s,;]{1,24}$/.test(x)))) return [`${name} (${v.length}): ${v.join(", ")}`];
    const entries = v.slice(0, MOST).map((x) => `  - ${simple(x) || Array.isArray(x) ? short(x) : entry(x)}`);
    return [`${name} (${v.length}):`, ...entries, ...(v.length > MOST ? [`  … and ${v.length - MOST} more`] : [])];
  }
  if (!simple(v)) return [`${name}:`, ...Object.entries(v).flatMap(([k, x]) => show(k, x)).map((line) => `  ${line}`)];
  return [`${name}: ${short(v)}`];
}
// Looks up a path. If the field does not exist, or is null, it was not measured.
function field(root, path) {
  let found = [[[], root]];
  for (const part of path.split(".")) {
    found = found.flatMap(([name, v]) => {
      if (simple(v)) return [[[...name, part], undefined]];
      return part === "*" ? Object.keys(v).map((k) => [[...name, k], v[k]]) : [[[...name, part], v[part]]];
    });
  }
  return found.flatMap(([name, v]) => (exists(v) ? show(name.join("."), v) : [`${name.join(".")}: not measured`]));
}

// ---------- the page ----------

// A tall image is scaled down when shown at once, and then the text cannot be read. So the extract also points to the slices.
function imageLines(file, what) {
  const line = `Screenshot, ${what}: ${join(OUT, file)}`, size = existsSync(join(OUT, file)) ? imageSize(join(OUT, file)) : null;
  if (!size || !slicePlan(size.width, size.height).length) return [line];
  const slices = slicesOf(OUT, file), tall = `${size.width} × ${size.height} px. Shown at once it is scaled down and only shows the page's layout`;
  if (!slices.length) return [`${line} (${tall}. Cut it into slices so it can be read: node scripts/slices.mjs --out ${options.out})`];
  return [`${line} (${tall}. Read it in the slices, from top to bottom:)`, ...slices.map((f) => `  ${join(OUT, "slices", f)}`)];
}

function header(m) {
  const b = m.images || {};
  const images = [[b.mobile, "390 px"], [b.desk, "1440 px"], [b.dark, "dark mode"]].filter(([file]) => file);
  const failed = m.layer2.failed.map((g) => GROUP[g]);
  const notMeasured = Object.keys(GROUP).filter((g) => !isMeasured(m, g)).map((g) => GROUP[g]);
  const about = (k) => [LABEL[k], k in LIMIT ? `at most ${LIMIT[k]}` : "", NEUTRAL.has(k) ? "a count" : ""].filter(Boolean).join(", ");
  const without = Object.keys(LABEL).filter((k) => !exists(m.metrics[k]));
  return [
    `# ${m.name}`,
    `Address: ${m.finalUrl || measurement.base + m.path} (path ${m.path}${m.steps ? ` after ${m.steps} ${m.steps === 1 ? "step" : "steps"}` : ""}), status ${m.status}`,
    `Measured: ${date(measurement.measured)}${measurement.mode === "quick" ? ", quick measurement" : ""}`,
    ...images.flatMap(([file, what]) => imageLines(file, what)),
    ...(m.copy ? [`Copy of the page as the browser saw it: ${join(OUT, m.copy)}`] : []),
    "",
    `Layer 2: ${m.layer2.score} of 5. ${failed.length ? `Fails: ${failed.join(", ")}.` : "Every group passes."}${notMeasured.length ? ` Not measured: ${notMeasured.join(", ")}.` : ""}`,
    "",
    "Numbers above zero:",
    ...Object.keys(LABEL).filter((k) => m.metrics[k]).map((k) => `  ${k}: ${m.metrics[k]} (${about(k)})`),
    ...(without.length ? [`Numbers not measured: ${without.join(", ")}`] : []),
    ...((m.ignored || []).length ? ["Ignored by the plan:", ...m.ignored.map((i) => `  - ${i.metric}: ${i.what}. ${i.why}`)] : []),
  ];
}

function items(root, heading, names, fields) {
  const out = [`## ${heading}`];
  names.forEach((item, i) => out.push("", `### ${i + 1}. ${item}`, ...(fields[i].length ? fields[i].flatMap((path) => field(root, path)) : [NOTE[item] || NONE])));
  return out;
}

function layer2(m) {
  const out = ["## Layer 2: Does it hold up (measured)"];
  for (const g of Object.keys(GROUP)) {
    const metrics = GROUP_METRICS[g].map((k) => `${k}: ${exists(m.metrics[k]) ? m.metrics[k] : "not measured"}${k in LIMIT ? ` (at most ${LIMIT[k]})` : ""}`);
    out.push("", `### ${GROUP[g]}: ${!isMeasured(m, g) ? "not measured" : m.layer2.groups[g] ? "passes" : "fails"}`, metrics.join(" · "), ...FIELDS2[g].flatMap((path) => field(m, path)));
  }
  return out;
}

// ---------- the answer ----------

if (!options.page) {
  const line = (p) => (p.notSeen
    ? `${p.name} · ${p.path} · not seen: ${p.notSeen}`
    : `${p.name} · ${p.path}${p.steps ? ` after ${p.steps} ${p.steps === 1 ? "step" : "steps"}` : ""} · layer 2: ${p.layer2.score} of 5 · screenshots: ${[p.images?.mobile, p.images?.desk].filter(Boolean).join(", ")}`);
  console.log([
    `Measurement of ${measurement.base} on ${date(measurement.measured)}${measurement.mode === "quick" ? " (quick measurement)" : ""}. The screenshots are in ${OUT}.`,
    "",
    ...measurement.pages.map(line),
    "",
    `See one page: node scripts/extract.mjs --out ${options.out} --page <name> [--layer 1|2|3]`,
  ].join("\n"));
  process.exit(0);
}

const m = measurement.pages.find((p) => p.name === options.page);
if (!m) stop(`The page "${options.page}" is not in the measurement. Measured: ${measurement.pages.map((p) => p.name).join(", ")}.`);
if (m.notSeen) stop(`The page "${m.name}" was not seen: ${m.notSeen}`, 1);

const root = { ...m, notFoundPage: measurement.notFoundPage };
const layers = {
  1: () => items(root, "Layer 1: Does it work", LAYER1, FIELDS1),
  2: () => layer2(m),
  3: () => items(root, "Layer 3: Is it delightful", LAYER3, FIELDS3),
};
console.log([...header(m), ...(options.layer ? [options.layer] : ["1", "2", "3"]).flatMap((n) => ["", ...layers[n]()])].join("\n"));
