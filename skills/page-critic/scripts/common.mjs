// Shared by the scripts in scripts/: metric names, file reading and the command line.

import { existsSync, readFileSync, writeFileSync } from "node:fs";

// Every number in measurement.json (page.metrics) with the label shown in tables and the report.
export const LABEL = {
  consoleErrors: "Console errors", failedRequests: "Failed requests", brokenImages: "Broken images",
  hScroll320: "Horizontal scroll at 320 px", hScroll390: "Horizontal scroll at 390 px", clippedText: "Clipped text",
  targetsUnder44: "Tap targets under 44 px", targetFails: "Tap targets that fail (under 24 px or a control)", fieldsUnder16px: "Fields with text under 16 px",
  fieldsWithoutLabel: "Fields without a label", contrastErrors: "Text with too little contrast", axeErrors: "axe errors", zoomDisabled: "Zoom disabled",
  textUnder12px: "Text under 12 px", tightLineHeight: "Paragraphs with tight line height",
  invisibleFocus: "Stops without visible focus", notReachedByKeyboard: "Not reachable by keyboard",
  focusObscured: "Focus hidden behind something else", focusOffscreen: "Focus ends up off screen", focusJumpsBack: "Focus jumps back", focusTrapped: "Places Tab cannot leave",
  formGaps: "Gaps in the form's error state", doubleSubmits: "Extra submits on double click",
  noHover: "No hover state", noPressed: "No pressed state", hoverWithoutMedia: "Hover motion outside (hover: hover)",
  transitionAll: "transition: all", animatesLayout: "Animates layout properties", over300ms: "Transitions over 300 ms",
  motionDespiteReduced: "Motion despite reduced motion", offscreenAnimations: "Animations running off screen",
  imagesWithoutSize: "Images without dimensions", misaligned: "Things that do not line up", aiLook: "Clear signs of the AI look", stressBreaks: "Breaks in the stress tests",
  h1Count: "Number of h1", fontSizes: "Different font sizes", spacings: "Different spacings",
  lcpMs: "LCP (ms)", cls: "CLS", inpMs: "INP (ms)", kB: "Transferred (kB)",
};

// Counts where fewer is not better in itself.
export const NEUTRAL = new Set(["h1Count", "fontSizes", "spacings"]);

// Speed and weight vary from run to run. Under 15 % difference is not counted as a change; for INP, not under 40 ms either.
export const noise = (k, x, y) =>
  (["lcpMs", "kB", "inpMs"].includes(k) && Math.abs(y - x) <= 0.15 * Math.max(x, y)) || (k === "inpMs" && Math.abs(y - x) <= 40);

// The eight groups in layer 2 with the label the report shows.
export const GROUP = {
  errors: "Errors", narrowScreen: "Narrow screen", fingers: "Fingers", readability: "Readability",
  keyboard: "Keyboard", form: "Form", speed: "Speed", calm: "Calm",
};

// Which metrics can fail each group. Only metrics with a published threshold are listed (see templates/checklist.md).
export const GROUP_METRICS = {
  errors: ["consoleErrors", "failedRequests", "brokenImages"],
  narrowScreen: ["hScroll320", "hScroll390"],
  fingers: ["targetFails", "fieldsUnder16px"],
  readability: ["contrastErrors", "axeErrors", "fieldsWithoutLabel", "zoomDisabled"],
  keyboard: ["invisibleFocus", "notReachedByKeyboard", "focusObscured", "focusOffscreen", "focusJumpsBack", "focusTrapped"],
  form: ["formGaps"],
  speed: ["lcpMs", "cls", "inpMs"],
  calm: ["motionDespiteReduced", "imagesWithoutSize"],
};
// The metrics that may be above zero. Every other metric in a group must be 0. A metric that was not measured (null) does not fail.
export const LIMIT = { lcpMs: 2500, cls: 0.1, inpMs: 200 };
export const fails = (metrics, k) => (k in LIMIT ? exists(metrics[k]) && metrics[k] > LIMIT[k] : !!metrics[k]);
// A group that was not measured counts as passed in the score. That must be visible wherever the score is shown.
export const isMeasured = (page, g) => (g === "form" ? exists(page.metrics.formGaps) : g === "speed" ? GROUP_METRICS.speed.some((k) => exists(page.metrics[k])) : true);

export const SEVERITY = ["Blocker", "Friction", "Polish", "Upgrade"];

// The items in layer 1 and layer 3, in the checklist's order (templates/checklist.md).
export const LAYER1 = ["One job", "Order and weight", "Copy", "Forms", "States", "Feedback on actions", "Wayfinding", "Mobile", "Accessibility", "Whole"];
export const LAYER3 = ["Typography", "Spacing and alignment", "Depth and surfaces", "Colour", "States for every element", "Motion that exists", "Motion that is missing", "Details"];

export const exists = (v) => v !== null && v !== undefined;
export const read = (file) => JSON.parse(readFileSync(file, "utf8"));
export const readIf = (file) => (existsSync(file) ? read(file) : null);
export const write = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + "\n");

// Splits the command line into words and options. `--out dir` gives options.out = "dir"; `--quick` gives options.quick = true.
export function command(argv = process.argv.slice(2), flags = []) {
  const words = [], options = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { words.push(a); continue; }
    const name = a.slice(2);
    if (flags.includes(name) || i + 1 >= argv.length || argv[i + 1].startsWith("--")) options[name] = true;
    else options[name] = argv[++i];
  }
  return { words, options };
}

export const escape = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Which browser Playwright starts. Google Chrome, unless told otherwise.
// With PC_BROWSER=chromium in the environment or "browser": "chromium" in the plan, Playwright's own Chromium is used.
export const browserChoice = (plan) => (process.env.PC_BROWSER === "chromium" || plan?.browser === "chromium" ? {} : { channel: "chrome" });
// What is printed when the browser cannot start. PC_BROWSER applies to all scripts; "browser" in the plan only to the measurement.
export const NO_BROWSER = 'The browser could not be started. The skill uses Google Chrome. Without Chrome: run "npx playwright-core install chromium" in the skill folder, and set PC_BROWSER=chromium in the environment.';

// ---------- before and after ----------

// Puts two measurements of the same page side by side: one row per metric that has a value in at least one of them.
// Neutral counts and changes within the noise count as neither better nor worse.
export function comparePage(b, a) {
  const rows = [];
  let better = 0, worse = 0;
  for (const k of Object.keys(LABEL)) {
    const x = b.metrics?.[k], y = a.metrics?.[k];
    if (!exists(x) && !y) continue;
    let sign = "";
    if (!exists(x)) sign = "new metric";
    else if (!exists(y)) sign = "not measured";
    else if (x !== y && !NEUTRAL.has(k) && !noise(k, x, y)) { if (y < x) { sign = "better"; better++; } else { sign = "worse"; worse++; } }
    if (x !== y || x) rows.push({ metric: k, before: x ?? null, after: y ?? null, sign });
  }
  return { rows, better, worse };
}

// ---------- the fix list ----------

export const measuredPage = (measurement, name) => measurement?.pages.find((p) => p.name === name && !p.notSeen);
// A target is either a number in page.metrics or "layer2" (the score from 1 to 5).
export const value = (page, metric) => (metric === "layer2" ? page.layer2?.score : page.metrics?.[metric]);
export const met = (t, v) => exists(v) && (exists(t.atMost) ? v <= t.atMost : v >= t.atLeast);
export const limitText = (t) => (exists(t.atMost) ? `at most ${t.atMost}` : `at least ${t.atLeast}`);
export const nameOf = (metric) => (metric === "layer2" ? "Layer 2, score" : LABEL[metric] || metric);

// Solved: every target met. Partial: at least one target met or moved the right way. Unsolved: nothing has moved.
// Without targets a measurement cannot decide, and the fix has to be checked by eye.
export function fixStatus(f, measurement) {
  // A status set by hand stays.
  if (!(f.targets || []).length) return { status: ["solved", "partial", "unsolved"].includes(f.status) ? f.status : "needs a look", targets: [] };
  const targets = f.targets.map((t) => {
    const page = measuredPage(measurement, t.page);
    const now = page ? value(page, t.metric) : undefined;
    const reached = met(t, now);
    const better = exists(now) && exists(t.before) && (exists(t.atMost) ? now < t.before : now > t.before);
    const worse = exists(now) && exists(t.before) && (exists(t.atMost) ? now > t.before : now < t.before);
    return { ...t, now: now ?? null, reached, better, worse };
  });
  if (targets.some((t) => !exists(t.now))) return { status: "not measured", targets };
  if (targets.every((t) => t.reached)) return { status: "solved", targets };
  if (targets.some((t) => t.reached || t.better)) return { status: "partial", targets };
  return { status: targets.some((t) => t.worse) ? "worse" : "unsolved", targets };
}

// 2026-10-01 14:05
export const date = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso ?? "");
  const two = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
};
