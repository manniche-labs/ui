#!/usr/bin/env node
// Tests the measurement: runs measure.mjs against the test pages and checks that every metric fires on the page with faults
// and stays quiet on the page without. Then the comparison, the fix list, the preview and the report are tried on the same measurement,
// then the blind customer (browse.mjs) against the same test pages, then the extract of the measurement (extract.mjs) and the slices of tall images (slices.mjs),
// then the pattern catalogue (templates/patterns.md): the code in it must be readable by the browser and pass the measurement,
// and last the Tab walk on a long page and its counter-tests.
//
//   npm test                     (needs Google Chrome, or set PC_BROWSER=chromium)
//   node test/run.mjs --keep     (keeps the measurement folder and says where it is)

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync, rmSync, existsSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { browserChoice } from "../scripts/common.mjs";
import { OVERLAP, imageSize, readPng, writePng, slicesOf, sliceHeight, slicePlan } from "../scripts/png.mjs";
import { start, catalog, patterns } from "./server.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const server = await start(0);
const base = `http://127.0.0.1:${server.address().port}`;
const out = mkdtempSync(join(tmpdir(), "pc-test-"));
const BROWSER = process.env.PC_BROWSER === "chromium" ? { browser: "chromium" } : {};

const submit = (v) => [{ fill: [v, "not-an-email"] }, { submit: "form" }];
const plan = {
  base, impeccable: false, ...BROWSER,
  pages: [
    { name: "faults", path: "/faults" },
    { name: "faults-form", path: "/faults", performance: false, steps: submit("input[name=mail]") },
    { name: "clean", path: "/clean" },
    { name: "clean-form", path: "/clean", performance: false, steps: submit("#mail") },
    { name: "tight", path: "/tight", performance: false },
    { name: "ignored", path: "/faults", performance: false },
  ],
  ignore: [
    { metric: "aiLook:emojiAsIcon", page: "ignored", why: "Test: a whole AI-look rule is ignored" },
    { metric: "targetsUnder44", element: "a.mini", page: "ignored", why: "Test: one element is ignored" },
    { metric: "brokenImages", page: "ignored", why: "Test: a whole metric is ignored" },
    { metric: "contrastErrors", element: "not-on-the-page", page: "ignored", why: "Test: an exception that matches nothing" },
  ],
};
writeFileSync(join(out, "plan.json"), JSON.stringify(plan, null, 2));

// What needs the test pages runs in its own process while the server here answers. (spawnSync would block the server.)
// If the process stands still for eight minutes, it is stopped, so the self-test ends with an error instead of never finishing.
const withServer = (script, ...options) => new Promise((ok) => {
  const child = spawn(process.execPath, [join(here, "..", "scripts", script), ...options]);
  let text = "";
  const timer = setTimeout(() => { text += "\n(stopped after eight minutes)"; child.kill("SIGKILL"); }, 480000);
  child.stdout.on("data", (d) => (text += d));
  child.stderr.on("data", (d) => (text += d));
  child.on("close", (status) => { clearTimeout(timer); ok({ status, text, out: text }); });
});
const run = await withServer("measure.mjs", "--plan", join(out, "plan.json"), "--out", out);
if (run.status !== 0) {
  console.error(run.text);
  console.error("The measurement could not run.");
  process.exit(1);
}
const measurement = JSON.parse(readFileSync(join(out, "measurement.json"), "utf8"));
const page = Object.fromEntries(measurement.pages.map((p) => [p.name, p]));

// The pattern catalogue is measured on its own in its own folder, so the numbers in the main measurement do not move.
// The plan points to an address nobody answers on. --base corrects it, so that option is tried without an extra measurement.
const DEAD_BASE = "http://127.0.0.1:9";
writeFileSync(join(out, "plan-patterns.json"), JSON.stringify({ base: DEAD_BASE, impeccable: false, notFoundPage: false, ...BROWSER, pages: [{ name: "patterns", path: "/patterns" }] }, null, 2));
const catalogRun = await withServer("measure.mjs", "--plan", join(out, "plan-patterns.json"), "--out", join(out, "patterns"), "--base", base);
if (catalogRun.status !== 0) {
  console.error(catalogRun.text);
  console.error("The measurement of the pattern catalogue could not run.");
  process.exit(1);
}

// The pages for the Tab walk are also measured on their own: a long, calm page, a short page with the counter-tests, a table with more stops than the walk goes,
// and a page with links that can be seen and links hidden in different ways.
writeFileSync(join(out, "plan-walk.json"), JSON.stringify({ base, impeccable: false, notFoundPage: false, ...BROWSER, pages: [{ name: "walk", path: "/walk", performance: false }, { name: "walk-faults", path: "/walk-faults", performance: false }, { name: "walk-long", path: "/walk-long", performance: false }, { name: "visible", path: "/visible", performance: false }] }, null, 2));
const walkRun = await withServer("measure.mjs", "--plan", join(out, "plan-walk.json"), "--out", join(out, "walk"));
if (walkRun.status !== 0) {
  console.error(walkRun.text);
  console.error("The measurement of the pages for the Tab walk could not run.");
  process.exit(1);
}

let failures = 0, count = 0;
const check = (name, ok, got) => {
  count++;
  if (ok) return;
  failures++;
  console.log(`  FAIL  ${name}${got === undefined ? "" : `  (got: ${JSON.stringify(got)})`}`);
};
const same = (name, got, expected) => check(`${name} = ${JSON.stringify(expected)}`, JSON.stringify(got) === JSON.stringify(expected), got);
const atLeast = (name, got, limit) => check(`${name} ≥ ${limit}`, typeof got === "number" && got >= limit, got);

for (const n of Object.keys(page)) check(`${n} was seen`, !page[n].notSeen, page[n].notSeen);
if (failures) { console.log(run.text); console.log(`\n${failures} pages were not seen. Stopping.`); process.exit(1); }

// 1. The page with faults: every number must fire.
{
  const { metrics: t, layer2 } = page.faults;
  const exact = {
    consoleErrors: 1, failedRequests: 1, brokenImages: 1, hScroll320: 1, hScroll390: 1, clippedText: 1,
    targetsUnder44: 6, targetFails: 6, fieldsUnder16px: 1, fieldsWithoutLabel: 1, contrastErrors: 1, zoomDisabled: 1, textUnder12px: 2,
    invisibleFocus: 2, notReachedByKeyboard: 2, hoverWithoutMedia: 1, transitionAll: 1, animatesLayout: 2, over300ms: 3,
    offscreenAnimations: 1, imagesWithoutSize: 1, h1Count: 2, formGaps: null, doubleSubmits: null,
  };
  for (const [k, v] of Object.entries(exact)) same(`faults.${k}`, t[k], v);
  atLeast("faults.axeErrors", t.axeErrors, 3);
  atLeast("faults.tightLineHeight", t.tightLineHeight, 1);
  atLeast("faults.noHover", t.noHover, 2);
  atLeast("faults.noPressed", t.noPressed, 2);
  atLeast("faults.motionDespiteReduced", t.motionDespiteReduced, 3);
  const rm = page.faults.reducedMotion, running = rm.stillRunning.map((a) => a.name);
  check("faults: the animation cut down to 0.01 ms does not count as motion", running.includes("slide-in") && !running.includes("slide-late"), running);
  same("faults: it was seen and stands as over within one frame", rm.withinOneFrame, ['slide-late on div.late "Arrives late"']);
  atLeast("faults.misaligned", t.misaligned, 4);
  atLeast("faults.inpMs (slow handler)", t.inpMs, 201);
  same("faults: layer 2 fails", layer2.failed, ["errors", "narrowScreen", "fingers", "readability", "keyboard", "speed", "calm"]);
  same("faults: layer 2 score", layer2.score, 1);

  const a = page.faults.alignment[1440];
  atLeast("faults.alignment.cardsUnevenHeight", a.cardsUnevenHeight.length, 1);
  atLeast("faults.alignment.fieldAndButtonUneven", a.fieldAndButtonUneven.length, 1);
  atLeast("faults.alignment.nearlyAligned", a.nearlyAligned.length, 1);
  atLeast("faults.alignment.innerRadiusTooLarge", a.innerRadiusTooLarge.length, 1);
  // The rule on inner corners has two outcomes: a number when there is less room than the frame's radius, and otherwise only that the inner may not be rounder.
  same("faults: inner corners, each with its advice", a.innerRadiusTooLarge.map((x) => x.split(": ")[1]), ["inner should not be rounder than the frame", "inner should be at most 8 px"]);
  check("faults: cards of uneven height in the same grid row are reported", a.cardsUnevenHeight.some((x) => x.startsWith("div.box and its neighbour in the same row")), a.cardsUnevenHeight);

  const rules = page.faults.aiLook.clear.map((x) => x.rule).sort();
  same("faults: AI look, clear signs", rules, ["allCentred", "bouncyCurve", "cardInCard", "colouredLeftBorder", "emojiAsIcon", "glassOnManyCards", "glow", "gradientText", "greyTextOnColour", "purpleBlueGradient", "sameEntranceEverywhere"]);
  const suspect = page.faults.aiLook.suspect.map((x) => x.rule).sort();
  same("faults: AI look, suspect", suspect, ["capsLineAboveHeading", "defaultFont", "numberedSections", "threeMatchingFeatureCards"]);
  same("faults.aiLook", t.aiLook, 11);

  const m = page.faults.motion;
  check("faults: entrances recorded on load", m.onLoad.some((x) => x.name === "slide-in"), m.onLoad.map((x) => x.name));
  check("faults: bouncy curve found", m.bouncyCurves.length === 1, m.bouncyCurves);
  // A transition written with var() must be read like one written with numbers.
  same("faults: layout properties, also with var()", m.layoutProperties, [".layout: width", ".variable: height"]);
  // The third has the shorthand with var() and the delay on its own. There the browser gives no duration back, and it is read on the element.
  same("faults: over 300 ms, also with var()", m.overThreeHundred, [".layout: 500 ms", ".variable: 500 ms", ".delayed: 800 ms"]);
  same("faults: linear curve, also with var()", m.linear, [".layout", ".variable"]);
  same("faults: only one rule with transition: all", m.transitionAll, [".all"]);
  // A transition that another rule turns off on everything it matches moves nothing. It stands on its own and is not in the lists above.
  same("faults: a transition another rule has turned off does not count", m.disabled, [".off"]);
  // An invisible field where nothing around it shows focus counts as invisible focus, even if the browser draws a ring on it.
  check("faults: invisible field without visible focus", page.faults.keyboard.invisibleFocus.some((x) => x.startsWith("input")), page.faults.keyboard.invisibleFocus);
  same("faults: fields are not tried with the mouse", page.faults.mouse.tried, 6);
  // The button slides away every time the mouse comes. A press next to it says nothing about its pressed state, so it is not judged.
  const fm = page.faults.mouse;
  same("faults: the button that runs from the mouse cannot be hit", fm.notHit, ['button.runaway "Catch me"']);
  check("faults: the button that runs from the mouse is not judged", ![...fm.noHover, ...fm.noPressed].some((x) => x.startsWith("button.runaway")), fm);
  // A checkbox is measured through its label, also when the field itself is made invisible. Here the label is only one line tall.
  check("faults: an invisible checkbox is measured through its label", page.faults.targets.some((f) => f.element.startsWith("label.tick") && f.under24 && f.control && f.field), page.faults.targets);
  // The exceptions must not hide real faults: a group with arrow keys that Tab never stops in is not reached,
  // and an element that can be pressed without having a role is still tried with the mouse.
  check("faults: a group Tab never stops in is reported as not reached", page.faults.keyboard.notReached.some((x) => x.includes("Bold text")), page.faults.keyboard.notReached);
  same("faults: nothing is expected to be reached with arrow keys", page.faults.keyboard.expectedWithArrowKeys, []);
  check("faults: a clickable element without a role is tried with the mouse", page.faults.mouse.noHover.some((x) => x.startsWith("div.clickable")), page.faults.mouse.noHover);
  check("faults: paste blocked in the field", page.faults.fields[0].pasteBlocked === true);
  check("faults: autocomplete missing on the email field", page.faults.fields[0].autocompleteMissing === true);
  check("faults: copy of the page saved", existsSync(join(out, "faults.copy.html")));
  // A shorthand with var() and one of its parts on its own: the browser gives the other parts back as empty. The copy must have the sheet's own text.
  const copyText = readFileSync(join(out, "faults.copy.html"), "utf8");
  check("faults: the copy has no empty values", !/[;{]\s*(?!--)[a-z-]+: ;/.test(copyText), (copyText.match(/[a-z-]+: ;/g) || []).slice(0, 5));
  check("faults: the copy has the shorthand, both from the page's own sheet and from the loaded one", copyText.includes("transition: opacity var(--slow) ease-out") && copyText.includes("border: 0 solid var(--edge, #767676)"));
  check("faults: screenshots", existsSync(join(out, "faults-desk.png")) && existsSync(join(out, "faults-mobile.png")));
}

// 2. The error state on the page with faults: the form reports nothing, and a double click submits twice.
{
  const r = page["faults-form"];
  same("faults-form.status", r.status, 400);
  same("faults-form.formGaps", r.metrics.formGaps, 3);
  same("faults-form.gaps", r.form.gaps, { errorNotAnnounced: true, fieldNotMarked: true, valueLost: true });
  same("faults-form.doubleSubmits", r.metrics.doubleSubmits, 1);
  same("faults-form.submits", r.doubleSubmit.submits, 2);
  check("faults-form: layer 2 fails form", r.layer2.failed.includes("form"), r.layer2.failed);
}

// 3. The page without faults: everything must be zero, and layer 2 must be 5.
const NEUTRAL_KEYS = ["h1Count", "fontSizes", "spacings", "lcpMs", "cls", "inpMs", "kB", "formGaps", "doubleSubmits"];
for (const n of ["clean", "clean-form"]) {
  const { metrics: t, layer2 } = page[n];
  for (const [k, v] of Object.entries(t)) if (!NEUTRAL_KEYS.includes(k)) same(`${n}.${k}`, v, 0);
  same(`${n}.h1Count`, t.h1Count, 1);
  same(`${n}: layer 2`, layer2.score, 5);
  same(`${n}: AI look, suspect`, page[n].aiLook.suspect.map((x) => x.rule), []);
}
{
  const t = page.clean.metrics;
  check("clean.lcpMs measured and under 2500", t.lcpMs !== null && t.lcpMs <= 2500, t.lcpMs);
  check("clean.inpMs measured and under 200", t.inpMs !== null && t.inpMs <= 200, t.inpMs);
  same("clean: three speed runs", page.clean.performance.runs, 3);
  const r = page["clean-form"];
  same("clean-form.status", r.status, 400);
  same("clean-form.formGaps", r.metrics.formGaps, 0);
  same("clean-form.doubleSubmits", r.metrics.doubleSubmits, 0);
  check("clean-form: the button shows that it is working", r.doubleSubmit.showsWork === true, r.doubleSubmit);
  check("clean-form: a colour change under reduced motion does not count", r.metrics.motionDespiteReduced === 0 && r.reducedMotion.onlyFadeOrColour.length > 0, r.reducedMotion);
  same("clean-form: the keyboard walk reaches everything despite autofocus", r.keyboard.stops, 10);
  // The clean page has a link that only responds with a line on ::after, a duration set alone and with var(), and a switch
  // with an invisible field that shows focus on the track next to it. None of it may give findings.
  // It also has what looks like faults without being them: a link to the page you are on and a selected tab (do not respond to the mouse),
  // a tab panel and a scroll area (can only take focus), small checkboxes in tall labels, radio buttons and tabs where Tab
  // only stops in one place, and a wide table that can be scrolled on a narrow screen.
  // And three more of the same kind: two cards that fill two rows of a grid (one set with span, the other with line numbers),
  // a key with a small corner in a frame with more room than its radius, and an edge faded out with blur behind a mask.
  same("clean: cards across several grid rows are not cards of uneven height", page.clean.alignment[1440].cardsUnevenHeight, []);
  same("clean: a corner in a frame with more room than the radius is free", [...page.clean.alignment[1440].innerRadiusTooLarge, ...page.clean.alignment[390].innerRadiusTooLarge], []);
  same("clean: blur behind a mask is not frosted glass", page.clean.aiLook.clear.map((x) => x.rule), []);
  same("clean: one link and two buttons tried with the mouse", page.clean.mouse.tried, 3);
  same("clean: the rest of a group is expected to be reached with arrow keys", page.clean.keyboard.expectedWithArrowKeys.map((x) => x.split(" ")[0]), ["input", "button#tab-2.tab"]);
  check("clean: the table is wider than a phone and sits in a scroll area", page.clean.overflow[320].hScroll === false && page.clean.clipped[320].length === 0, page.clean.clipped[320]);
  same("clean: transitions found, also those with var()", page.clean.motion.transitions, 6);
  check("clean: duration and curve read through var()", page.clean.motion.durations.includes(180) && page.clean.motion.curves.includes("cubic-bezier(0.23, 1, 0.32, 1)"), page.clean.motion);
  check("clean: the hover target without pseudo-element", page.clean.motion.hoverTargets.includes("nav a.underline"), page.clean.motion.hoverTargets);

  // The table must actually be wider than its scroll area on a phone. Otherwise the page does not test what it says it tests.
  const browser = await chromium.launch(browserChoice());
  try {
    const s = await browser.newPage({ viewport: { width: 320, height: 640 } });
    await s.goto(`${base}/clean`);
    const scroll = await s.evaluate(() => { const o = document.querySelector(".scroller"); return { content: o.scrollWidth, room: o.clientWidth, page: document.documentElement.scrollWidth }; });
    check("clean: the table is at least 100 px wider than its scroll area at 320 px, and the page itself does not scroll", scroll.content >= scroll.room + 100 && scroll.page <= 320, scroll);
  } finally {
    await browser.close();
  }
}

// 4. The tight page: fine at rest, but breaks under stress.
{
  const r = page.tight;
  same("tight.hScroll390 (at rest)", r.metrics.hScroll390, 0);
  same("tight.clippedText (at rest)", r.metrics.clippedText, 0);
  atLeast("tight.stressBreaks", r.metrics.stressBreaks, 2);
  atLeast("tight: longer text clips the label", r.stress.german.newClipped, 1);
  check("tight: a long word gives horizontal scroll", r.stress.longWord.hScroll === true, r.stress.longWord);
  check("tight: image of the break saved", existsSync(join(out, "tight-stress-long.png")));
  check("tight: suspect cream and serif", r.aiLook.suspect.some((x) => x.rule === "creamAndSerif"), r.aiLook.suspect.map((x) => x.rule));
  same("tight: stress does not fail layer 2", r.layer2.score, 5);
}

// 5. The ignore list: what is ignored is taken out of the numbers and written down with the reason.
{
  const r = page.ignored, f = page.faults;
  same("ignored.aiLook", r.metrics.aiLook, f.metrics.aiLook - 1);
  same("ignored.targetsUnder44", r.metrics.targetsUnder44, f.metrics.targetsUnder44 - 1);
  same("ignored.brokenImages", r.metrics.brokenImages, 0);
  same("ignored: three entries with a reason", r.ignored.map((i) => i.metric).sort(), ["aiLook:emojiAsIcon", "brokenImages", "targetsUnder44"]);
  check("ignored: every entry has a reason", r.ignored.every((i) => i.why && i.why.startsWith("Test")));
  // An exception that matches nothing is misspelt or no longer needed. It is written down, so it does not linger.
  same("ignored: the exception that matched nothing is in the measurement", (measurement.ignoreUnused || []).map((i) => i.element), ["not-on-the-page"]);
  check("ignored: and the run says so", run.text.includes('1 entry in "ignore" matched nothing') && run.text.includes("contrastErrors · not-on-the-page · page: ignored"), run.text.split("\n").slice(-6));
  same("ignored: the contrast is untouched by it", r.metrics.contrastErrors, f.metrics.contrastErrors);
}

// 6. The not-found page.
same("notFoundPage.status", measurement.notFoundPage.status, 404);
same("notFoundPage.linkHome", measurement.notFoundPage.linkHome, false);
same("measurement: mode", measurement.mode, "full");

// The other scripts only read files, so they can run while this process waits.
// The time limit is a guard: a script that stands still must give a failing check, not a self-test that never finishes.
const exec = (script, ...options) => {
  const r = spawnSync(process.execPath, [join(here, "..", "scripts", script), ...options], { encoding: "utf8", timeout: 120000 });
  return { status: r.status, out: (r.stdout || "") + (r.stderr || "") + (r.error ? `\n(${r.error.code || r.error.message})` : "") };
};
const example = join(here, "..", "templates", "fixes-example.json");
const measurementFile = join(out, "measurement.json");

// 6b. The plan: a plan with faults is rejected before the browser starts, and with a reason that can be acted on.
{
  const file = join(out, "plan-test.json");
  const checkPlan = (p, ...more) => { writeFileSync(file, typeof p === "string" ? p : JSON.stringify(p)); return exec("measure.mjs", "--plan", file, "--check", ...more); };
  const good = { base, pages: [{ name: "a", path: "/clean" }] };
  let k = checkPlan({ ...good, login: [{ goto: "/clean" }], ignore: [{ metric: "aiLook:glow", why: "Test" }] });
  same("plan: a good plan passes", k.status, 0);
  check("plan: and counts pages, steps and exceptions", k.out.includes(`The plan is valid: 1 page on ${base}, 1 step, 1 exception.`), k.out);
  const rejected = [
    ["without base", { pages: good.pages }, 'is missing "base"'],
    ["base without http", { ...good, base: "localhost:3000" }, "is not a full address"],
    ["without pages", { base, pages: [] }, 'is missing "pages"'],
    ["page without name", { base, pages: [{ path: "/" }] }, 'both "name" and "path"'],
    ["two pages with the same name", { base, pages: [{ name: "a", path: "/" }, { name: "a", path: "/b" }] }, "may not have the same name"],
    ["step with a typo", { base, pages: [{ name: "a", path: "/", steps: [{ clik: "a" }] }] }, "Every step must be exactly one of"],
    ["step with two things", { base, pages: [{ name: "a", path: "/", steps: [{ click: "a", wait: 400 }] }] }, "Every step must be exactly one of"],
    ["login step with a typo", { ...good, login: [{ type: ["a", "b"] }] }, "Every step must be exactly one of"],
    ["exception without a reason", { ...good, ignore: [{ metric: "contrastErrors" }] }, 'needs both "metric" and "why"'],
    ["exception with an unknown metric", { ...good, ignore: [{ metric: "contrastError", why: "x" }] }, "Unknown metric"],
    ["AI look per element", { ...good, ignore: [{ metric: "aiLook:glow", element: "a", why: "x" }] }, "not per element"],
    ["exception for a page the plan does not have", { ...good, ignore: [{ metric: "contrastErrors", page: "b", why: "x" }] }, "a page the plan does not have"],
    ["not JSON", "{ base: ", "could not be read"],
  ];
  for (const [name, p, reason] of rejected) {
    k = checkPlan(p);
    check(`plan: ${name} is rejected with a reason`, k.status === 2 && k.out.includes(reason), k);
  }
  k = checkPlan({ pages: good.pages }, "--base", base);
  same("plan: --base can stand in for the plan's base", k.status, 0);
  k = checkPlan(good, "--base");
  check("plan: --base without an address is rejected", k.status === 2 && k.out.includes("--base needs an address"), k);
  k = exec("measure.mjs", "--plan", join(here, "..", "templates", "plan-example.json"), "--check");
  same("plan: the example in templates/ is a valid plan", k.status, 0);
  k = exec("measure.mjs", "--plan", file);
  check("plan: without --out the usage is shown", k.status === 2 && k.out.includes("Usage: node scripts/measure.mjs"), k);
  rmSync(file);
}

// 7. Before and after: against an older measurement with two changed numbers, the comparison must give one better and one worse.
{
  const before = structuredClone(measurement);
  const t = before.pages.find((p) => p.name === "faults").metrics;
  t.contrastErrors += 2;
  t.consoleErrors = 0;
  if (typeof t.kB === "number") t.kB = Math.round(t.kB * 1.05); // within the noise limit, does not count
  writeFileSync(join(out, "measurement-previous.json"), JSON.stringify(before));
  const k = exec("compare.mjs", out);
  same("compare: ends without error", k.status, 0);
  check("compare: one better and one worse", k.out.includes("In total: 1 metric better, 1 metric worse."), k.out.trim().split("\n").pop());
  rmSync(join(out, "measurement-previous.json"));
}

// 8. The fix list: the example in templates/ must be a valid list for the test pages.
{
  const file = join(out, "fixes.json");
  const list = () => JSON.parse(readFileSync(file, "utf8"));
  const fix = (id) => list().fixes.find((f) => f.id === id);
  const prompt = () => readFileSync(join(out, "fix-prompt.md"), "utf8");
  copyFileSync(example, file);

  let k = exec("fixes.mjs", "check", "--out", out);
  same("fixes check: the example is valid", k.status, 0);
  check("fixes check: counts by severity", k.out.includes("3 fixes (1 blocker, 1 friction, 0 polish, 1 upgrade), 1 system decision."), k.out);
  check("fixes check: names the one that can be shown", k.out.includes("Can be shown in three variants: F3."), k.out);
  same("fixes check: the before numbers are locked", [fix("F1").targets.map((t) => t.before), fix("F2").targets.map((t) => t.before)], [[3, 1], [1]]);

  k = exec("fixes.mjs", "status", "--out", out);
  same("fixes status: ends without error", k.status, 0);
  check("fixes status: nothing is fixed yet", k.out.includes("2 unsolved, 1 needs a look."), k.out);
  same("fixes status: saved in the list", list().fixes.map((f) => f.status), ["unsolved", "unsolved", "needs a look"]);

  // A new measurement where one of F1's two targets and F2's target are reached.
  const after = structuredClone(measurement);
  after.pages.find((p) => p.name === "faults-form").metrics.formGaps = 0;
  after.pages.find((p) => p.name === "faults").metrics.fieldsUnder16px = 0;
  writeFileSync(measurementFile, JSON.stringify(after));
  k = exec("fixes.mjs", "status", "--out", out);
  check("fixes status: partial and solved", k.out.includes("1 partial, 1 solved, 1 needs a look."), k.out);
  writeFileSync(measurementFile, JSON.stringify(measurement, null, 2));

  k = exec("fixes.mjs", "prompt", "--out", out);
  check("fix prompt: the solved one is out, and the visual one waits for a choice",
    k.out.includes("1 ready to build, 1 waiting for a variant to be chosen (F3)") && prompt().includes("### F1 · Blocker") && !prompt().includes("### F2") && prompt().includes("## Waiting for a choice"), k.out);
  check("fix prompt: system decision and before numbers are included", prompt().includes("### S1 ·") && prompt().includes("(before: 3)"));

  k = exec("fixes.mjs", "choose", "--out", out, "f3", "b");
  check("fixes choose: the choice is saved", k.status === 0 && fix("F3").chosen === "B" && k.out.includes("F3: variant B (Medium) is chosen."), k.out);
  same("fixes choose: an unknown variant is rejected", exec("fixes.mjs", "choose", "--out", out, "F3", "D").status, 1);
  same("fixes choose: an unknown fix is rejected", exec("fixes.mjs", "choose", "--out", out, "F9", "A").status, 1);

  k = exec("fixes.mjs", "prompt", "--out", out, "--only", "F3");
  check("fix prompt: the chosen variant stands with its code",
    prompt().includes("**Chosen variant:** B, Medium") && prompt().includes("transform: scale(.97)") && !prompt().includes("### F1"), k.out);

  // A list with faults is rejected with a reason per fault.
  const bad = list();
  bad.fixes[0].evidence = [];
  bad.fixes[1] = { ...bad.fixes[1], status: undefined, pages: ["clean"], targets: [{ page: "clean", metric: "fieldsUnder16px", atMost: 0 }] };
  bad.fixes[2].layer = 2;
  bad.fixes[2].preview.variants[2].css = bad.fixes[2].preview.variants[1].css;
  writeFileSync(file, JSON.stringify(bad));
  k = exec("fixes.mjs", "check", "--out", out);
  same("fixes check: a list with faults is rejected", k.status, 1);
  for (const [name, text] of [["evidence missing", "F1: missing evidence"], ["the target is already met", "is already met (0)"], ["an upgrade outside layer 3", "an Upgrade belongs in layer 3"], ["two identical variants", "two variants are the same"]])
    check(`fixes check: ${name}`, k.out.includes(text), k.out);
  same("fixes: a folder without a list", exec("fixes.mjs", "check", "--out", join(out, "does-not-exist")).status, 2);
}

// 9. The preview: four panes (Before, A, B and C), each with its crop of the page and its variant.
{
  copyFileSync(example, join(out, "fixes.json"));
  const file = join(out, "preview-F3.html");
  const k = exec("preview.mjs", "--out", out, "--id", "F3", "--no-inline");
  same("preview: ends without error", k.status, 0);
  same("preview: four panes", ((existsSync(file) ? readFileSync(file, "utf8") : "").match(/<iframe /g) || []).length, 4);
  same("preview: a fix without variants is rejected", exec("preview.mjs", "--out", out, "--id", "F1", "--no-inline").status, 1);

  const browser = await chromium.launch(browserChoice());
  try {
    const p = await browser.newPage({ viewport: { width: 1200, height: 900 }, reducedMotion: "no-preference" });
    await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await p.goto(pathToFileURL(file).href);
    // Every pane reports its crop back, and the window is cut to it. The form is far lower than the pane's 600 px.
    const heights = () => p.evaluate(() => [...document.querySelectorAll(".window")].map((w) => `${w.style.height} ${w.querySelector("iframe").style.transform}`));
    const cropped = await p.waitForFunction(() => {
      const w = [...document.querySelectorAll(".window")];
      return w.length === 4 && w.every((x) => parseFloat(x.style.height) > 20 && parseFloat(x.style.height) < 300 && /scale\(/.test(x.querySelector("iframe").style.transform));
    }, null, { timeout: 15000 }).then(() => true, () => false);
    check("preview: all four panes show the crop", cropped, await heights());

    const frames = await p.$$(".pane iframe");
    const inPane = async (n) => (await frames[n].contentFrame()).evaluate(() => ({
      button: !!document.querySelector("form .btn"),
      variant: document.querySelector("style[data-pc-variant]")?.textContent ?? null,
      twin: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => /\.pc-active/.test(r.cssText)); } catch { return false; } }),
    }));
    const [before, a, b] = [await inPane(0), await inPane(1), await inPane(2)];
    check("preview: Before is the unchanged copy", before.button && before.variant === "", before);
    check("preview: A has its variant, and the pressed state can be replayed", a.variant.includes("form .btn:active") && a.twin, a);
    check("preview: B moves when motion is allowed", b.variant.includes("@media (min-width: 0px)") && b.variant.includes("scale(.97)"), b.variant);

    await p.check("#reduce");
    await p.waitForTimeout(700);
    const reduced = await inPane(2);
    check("preview: reduce motion turns B's motion off", reduced.variant.includes("@media (max-width: 0px)"), reduced.variant);

    await p.click('[data-choose="B"]');
    const answer = await p.evaluate(() => ({ text: document.getElementById("answer").textContent, hidden: document.getElementById("answer").hidden, chosen: document.querySelectorAll(".pane.chosen").length }));
    check("preview: the choice can be read and sent as an answer", !answer.hidden && answer.text.includes("F3: B") && answer.chosen === 1, answer);
  } finally {
    await browser.close();
  }
}

// 10. The report: written from the measurement alone, and with review, fix list and an older measurement.
{
  const file = join(out, "report.html");
  const report = () => (existsSync(file) ? readFileSync(file, "utf8") : "");
  const reviewFile = join(out, "review.json");

  let k = exec("report.mjs", "--out", out, "--no-images");
  same("report: can be written without a review", k.status, 0);
  check("report: says that layers 1 and 3 are missing", k.out.includes("No review.json"), k.out);
  let h = report();
  for (const id of ["overview", "fixes", "F1", "S1", "ai-look", "page-faults", "page-clean-form", "not-found", "method"]) check(`report: the section ${id} is included`, h.includes(`id="${id}"`));
  check("report: no customer and no before and after without data", !h.includes('id="customer"') && !h.includes('id="before-after"'));
  check("report: --no-images puts no images in", !h.includes("data:image/"));
  check("report: failed groups stand with a cause", h.includes("Zoom is disabled in the page's viewport") && h.includes("What was typed is gone"));

  // With a review and an older measurement (the same two changes as in section 7).
  copyFileSync(join(here, "..", "templates", "review-example.json"), reviewFile);
  const before = structuredClone(measurement);
  const t = before.pages.find((p) => p.name === "faults").metrics;
  t.contrastErrors += 2;
  t.consoleErrors = 0;
  writeFileSync(join(out, "measurement-previous.json"), JSON.stringify(before));
  k = exec("report.mjs", "--out", out);
  same("report: can be written with a review and a before measurement", k.status, 0);
  h = report();
  check("report: title from the review", h.includes("<title>Test pages review</title>") && h.includes("<h1>Review of the test pages</h1>"));
  check("report: before and after counts one better and one worse", h.includes("In total 1 metric better and 1 worse."));
  check("report: the blind customer is included", h.includes('id="customer"') && h.includes("Gave up"));
  check("report: layers 1 and 3 are averaged", h.includes("Layer 1: 1.5 on average") && h.includes("Layer 3: 3.8 on average"));
  check("report: the life card points to its fix", h.includes('<td>Only the colour change</td><td class="n"><a href="#F3">F3</a></td>'));
  check("report: the worst page comes first", h.indexOf('id="page-faults-form"') < h.indexOf('id="page-clean"') && h.indexOf('id="page-faults"') < h.indexOf('id="page-clean"'));
  atLeast("report: the screenshots are embedded", (h.match(/src="data:image\//g) || []).length, 12);
  check("report: stays under the artifact limit", h.length < 16e6, h.length);

  const browser = await chromium.launch(browserChoice());
  try {
    const p = await browser.newPage({ viewport: { width: 390, height: 800 } });
    await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const errors = [];
    p.on("pageerror", (e) => errors.push(String(e)));
    await p.goto(pathToFileURL(file).href);
    const m = await p.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth, pages: document.querySelectorAll("section.state").length }));
    check("report: no horizontal scroll at 390 px", m.content <= m.width, m);
    same("report: one section per page and one for the not-found page", m.pages, 7);
    same("report: no script errors", errors, []);
  } finally {
    await browser.close();
  }

  // A review with faults is rejected with a reason per fault.
  const bad = JSON.parse(readFileSync(reviewFile, "utf8"));
  bad.pages.faults.layer1.pop();
  bad.pages.faults.layer3[0].score = 7;
  bad.pages.clean.layer1[0] = { item: "One job", score: 2 };
  bad.pages.faults.life[0].fix = "F9";
  bad.pages.doesNotExist = {};
  bad.customer.result = "MAYBE";
  writeFileSync(reviewFile, JSON.stringify(bad));
  k = exec("report.mjs", "--out", out, "--no-images");
  same("report: a review with faults is rejected", k.status, 1);
  for (const [name, text] of [["an item is missing", 'layer1 is missing the item "Whole"'], ["score outside the scale", "must be 1 to 5"], ["low score without a note", '"One job" in layer1 is missing a note'],
    ["life card without a fix", "points to F9"], ["unknown page", 'The page "doesNotExist" is not in the measurement'], ["unknown result", "result must be"]])
    check(`report: ${name}`, k.out.includes(text), k.out);
  copyFileSync(join(here, "..", "templates", "review-example.json"), reviewFile);
  same("report: a folder without a measurement", exec("report.mjs", "--out", join(out, "does-not-exist")).status, 2);
}

// 11. The blind customer: a browser steered with words, one command at a time. The test pages must answer meanwhile.
const folder = join(out, "customer"), other = join(out, "customer-2");
try {
  const logFile = join(folder, "customer-log.json");
  const customer = (...command) => withServer("browse.mjs", ...command, "--out", folder);
  const customer2 = (...command) => withServer("browse.mjs", ...command, "--out", other);
  const nr = (text, kind, name) => (text.match(new RegExp(`\\[(\\d+) ${kind}: ${name}`)) || [])[1] || "0";
  const task = "Sign up with your email address", because = "The field asks for my email address";

  let k = await customer("start", `${base}/clean`, "--mobile", "--task", task);
  same("customer start: ends without error", k.status, 0);
  check("customer start: the screen is shown as text on a phone", k.out.includes("390 × 844") && k.out.includes("# A calm page without faults") && k.out.includes(`The task: ${task}`), k.out);
  same("customer start: a label only stands in its field", k.out.split("Your email address").length - 1, 1);
  const field = nr(k.out, "field", "Your email address"), button = nr(k.out, "button", "Send me a link");
  check("customer start: field and button each have their own number", field !== "0" && button !== "0" && field !== button, [field, button]);
  same("customer start: only one customer per folder", (await customer("start", `${base}/clean`, "--task", task)).status, 1);
  same("customer start: without a task it is rejected", (await withServer("browse.mjs", "start", `${base}/clean`, "--out", join(out, "customer-none"))).status, 2);

  k = await customer("type", field, "name@", "--because", because);
  check("customer type: the field shows what was typed", k.status === 0 && k.out.includes('contains "name@"') && k.out.includes("The numbers are the same as before."), k.out);
  k = await customer("click", button, "--because", "The button submits the form");
  check("customer click: a new page shows the error and what was typed",
    k.status === 0 && k.out.includes("It led to a new page.") && k.out.includes("Page: Error: Sign up") && k.out.includes("The address is missing a domain") && k.out.includes('contains "name@"'), k.out);
  same("customer goto: an address somewhere else is rejected", (await customer("goto", `http://localhost:${server.address().port}/clean`)).status, 1);

  k = await customer("goto", "/out");
  const onOut = k.out;
  check("customer look: disabled, without text and covered stand in the bracket", k.status === 0 && onOut.includes("[button, disabled: Cannot be pressed]") && onOut.includes("icon without visible text") && onOut.includes("(covered by something else)"), onOut);
  check("customer look: what the eye cannot see is not included", !onOut.includes("Only for screen readers") && !onOut.includes("Hidden link"), onOut);
  check("customer look: what is further down stands with an arrow and a number", onOut.includes("↓ ## At the bottom of the page") && /↓ \[\d+ link: To the calm page\]/.test(onOut), onOut);

  k = await customer("click", nr(onOut, "link", "To another site on the web"));
  check("customer click: a link off the site is not followed", k.status === 0 && k.out.includes("It is not followed.") && !k.out.includes("It led to a new page."), k.out);
  k = await customer("click", nr(onOut, "link", "Write to us"));
  check("customer click: an email link opens nothing", k.status === 0 && k.out.includes("an email program"), k.out);
  k = await customer("click", nr(onOut, "button", "Lies under something"));
  check("customer click: a covered button cannot be pressed, and the screen stays", k.status === 0 && k.out.includes("Something else lies on top and takes the press.") && k.out.includes("The numbers are the same as before."), k.out);
  k = await customer("type", nr(onOut, "select", "Topic"), "book club");
  check("customer type: chooses in a select regardless of capital letters", k.status === 0 && k.out.includes("selected: Book club"), k.out);
  same("customer click: a select cannot be clicked", (await customer("click", nr(onOut, "select", "Topic"))).status, 1);
  k = await customer("click", nr(onOut, "disclosure", "What happens afterwards"));
  check("customer click: a disclosure shows what was hidden", k.status === 0 && k.out.includes("You get an answer within seven days."), k.out);
  k = await customer("click", nr(onOut, "button", "Count up"));
  check("customer click: new and gone are reported separately", k.status === 0 && k.out.includes("New on the page:") && k.out.includes("Pressed 1 time") && k.out.includes("Gone from the page:"), k.out);
  k = await customer("press", "tab");
  check("customer press: says where focus is", k.status === 0 && /Focus is on \[\d+ /.test(k.out), k.out);
  same("customer press: an unknown key is rejected", (await customer("press", "F13")).status, 2);

  k = await customer("click", nr(onOut, "link", "Open the calm page in a new tab"));
  check("customer click: a new tab on the same site becomes the one the customer is on", k.status === 0 && k.out.includes("It opened in a new tab.") && k.out.includes("Page: Sign up"), k.out);
  k = await customer("back");
  check("customer back: closes the tab, and the first page stands as it was left", k.status === 0 && k.out.includes("Page: Links off the page") && k.out.includes("selected: Book club"), k.out);
  k = await customer("scroll", "down");
  check("customer scroll: the screen moves", k.status === 0 && k.out.includes("Above the screen:"), k.out);
  same("customer click: an unknown number is rejected", (await customer("click", "99")).status, 1);
  same("customer look: does not count as an action", (await customer("look")).status, 0);

  // Another customer at the same time, on a computer and with only one action.
  k = await customer2("start", `${base}/clean`, "--task", task, "--max", "1");
  check("customer 2: runs at the same time on a computer", k.status === 0 && k.out.includes("1440 × 900"), k.out);
  k = await customer2("type", nr(k.out, "field", "Your email address"), "name@example.com");
  check("customer 2: says when the actions are used up", k.status === 0 && k.out.includes("You have used all your actions."), k.out);
  same("customer 2: more actions are rejected", (await customer2("scroll", "down")).status, 1);
  k = await customer2("stop");
  const stopped = existsSync(join(other, "customer-log.json")) ? JSON.parse(readFileSync(join(other, "customer-log.json"), "utf8")) : {};
  check("customer 2: stop saves the log without a result", k.status === 0 && stopped.result === null && !!stopped.interrupted && !existsSync(join(other, "browse.json")), stopped);

  same("customer finish: an unknown result is rejected", (await customer("finish", "--result", "GAVE_UP", "--conclusion", "x")).status, 1);
  k = await customer("finish", "--result", "COMPLETED_WITH_DIFFICULTY", "--conclusion", "The error only came after submitting.", "--stumbled", "The field did not say what was missing", "--stumbled", "The link off the site was not followed");
  same("customer finish: ends without error", k.status, 0);
  check("customer finish: the log is saved, and the browser is closed", existsSync(logFile) && !existsSync(join(folder, "browse.json")), k.out);
  same("customer look: after finish there is no customer", (await customer("look")).status, 1);

  const log = existsSync(logFile) ? JSON.parse(readFileSync(logFile, "utf8")) : { steps: [], stumbled: [] };
  same("customer log: task, result and stumbling blocks", [log.task, log.result, log.stumbled.length, log.interrupted], [task, "COMPLETED_WITH_DIFFICULTY", 2, undefined]);
  same("customer log: one step per action and one for the start", [log.steps.length, log.actions], [14, 13]);
  check("customer log: the first step says what the customer saw", /phone/.test(log.steps[0]?.step) && /The first heading is “A calm page without faults”/.test(log.steps[0]?.saw), log.steps[0]);
  check("customer log: what the customer thought is the customer's own words", log.steps[1]?.thought === because && log.withoutReason === 11, [log.steps[1], log.withoutReason]);
  check("customer log: one image per step", log.steps.length > 0 && log.steps.every((s) => s.image && existsSync(join(folder, s.image))), log.steps.map((s) => s.image));

  // The log can be put in as the customer in the review, alone or together with others. With the folder's name, the customer's last screen comes along.
  const reviewFile = join(out, "review.json"), review = JSON.parse(readFileSync(reviewFile, "utf8"));
  const report = () => (existsSync(join(out, "report.html")) ? readFileSync(join(out, "report.html"), "utf8") : "");
  writeFileSync(reviewFile, JSON.stringify({ ...review, customer: { ...log, folder: "../customer" } }));
  k = exec("report.mjs", "--out", out, "--no-images");
  check("report: a customer folder outside the measurement folder is rejected", k.status === 1 && k.out.includes("customer 1: folder must be the name"), k.out);
  writeFileSync(reviewFile, JSON.stringify({ ...review, customer: [review.customer, log] }));
  k = exec("report.mjs", "--out", out, "--no-images");
  let h = report();
  check("report: the customer's log can be put in as it is", k.status === 0 && h.includes("Completed the task with difficulty") && h.includes(because) && h.includes("Gave up"), k.out);
  check("report: without a folder there is no last screen", !h.includes("Last screen"));
  writeFileSync(reviewFile, JSON.stringify({ ...review, customer: [review.customer, { ...log, folder: "customer" }] }));
  k = exec("report.mjs", "--out", out);
  h = report();
  check("report: the customer's last screen is embedded, narrow like the phone", k.status === 0 && /<div class="last narrow"><figure><div class="frame" data-name="Last screen"><img src="data:image\//.test(h), k.out);
} finally {
  // If something goes wrong on the way, no browser may be left running.
  for (const f of [folder, other]) if (existsSync(join(f, "browse.json"))) await withServer("browse.mjs", "stop", "--out", f);
}

// 12. The extract: what the measurement knows about one page, as text and ordered by the checklist's items.
{
  const extract = (...options) => exec("extract.mjs", "--out", out, ...options);
  const notMeasured = (text) => text.split("\n").filter((l) => l.endsWith(": not measured")).map((l) => l.trim());

  let k = extract();
  same("extract: the page list ends without error", k.status, 0);
  check("extract: the page list has path, layer 2 and screenshots",
    k.out.includes("faults-form · /faults after 2 steps · layer 2: 1 of 5 · screenshots: faults-form-mobile.png, faults-form-desk.png") && k.out.includes("clean · /clean · layer 2: 5 of 5"), k.out);

  k = extract("--page", "faults-form", "--layer", "1");
  same("extract layer 1: ends without error", k.status, 0);
  check("extract: the header says what fails and what is not measured", k.out.includes("Layer 2: 1 of 5. Fails: Errors, Narrow screen, Fingers, Readability, Keyboard, Form, Calm. Not measured: Speed."), k.out.split("\n").find((l) => l.startsWith("Layer 2")));
  check("extract: the screenshots stand with the full path", k.out.includes(`Screenshot, 390 px: ${join(out, "faults-form-mobile.png")}`), k.out.split("\n").find((l) => l.startsWith("Screenshot")));
  check("extract: numbers above zero stand with name and explanation", k.out.includes("  formGaps: 3 (Gaps in the form's error state)") && k.out.includes("  h1Count: 2 (Number of h1, a count)"));
  same("extract layer 1: the ten items in the checklist's order", (k.out.match(/^### \d+\. .+$/gm) || []).map((l) => l.replace(/^### \d+\. /, "")),
    ["One job", "Order and weight", "Copy", "Forms", "States", "Feedback on actions", "Wayfinding", "Mobile", "Accessibility", "Whole"]);
  check("extract layer 1: the fields stand with path and value", k.out.includes("autocompleteMissing: true") && k.out.includes("notFoundPage.linkHome: false") && k.out.includes("  submits: 2") && k.out.includes('value: ""'), k.out);
  check("extract layer 1: the other layers are not included", !k.out.includes("## Layer 2") && !k.out.includes("## Layer 3"));

  const three = extract("--page", "faults-form", "--layer", "3");
  same("extract layer 3: the eight items in the checklist's order", (three.out.match(/^### \d+\. .+$/gm) || []).map((l) => l.replace(/^### \d+\. /, "")),
    ["Typography", "Spacing and alignment", "Depth and surfaces", "Colour", "States for every element", "Motion that exists", "Motion that is missing", "Details"]);
  check("extract layer 3: alignment per width, curves and AI look",
    three.out.includes("alignment.1440.cardsUnevenHeight (3):") && three.out.includes("cubic-bezier(0.68, -0.55, 0.27, 1.55)") && /rule: gradientText, text: /.test(three.out), three.out);
  check("extract layer 3: what the mouse could not hit, and the transition that is turned off, are there",
    three.out.includes('  notHit (1):\n    - button.runaway "Catch me"') && three.out.includes("motion.disabled (1): .off"), three.out);
  // A field the extract cannot find stands as "not measured". Here only the speed is skipped, so everything else must have a value.
  same("extract: every path in layers 1 and 3 exists in the measurement", notMeasured(k.out + "\n" + three.out), ["performance.inpMs: not measured", "performance.cls: not measured"]);

  k = extract("--page", "faults-form", "--layer", "2");
  same("extract layer 2: the eight groups with result", (k.out.match(/^### .+$/gm) || []).map((l) => l.slice(4)),
    ["Errors: fails", "Narrow screen: fails", "Fingers: fails", "Readability: fails", "Keyboard: fails", "Form: fails", "Speed: not measured", "Calm: fails"]);
  check("extract layer 2: what lies behind the numbers", k.out.includes("  - test error in the console") && k.out.includes("    errorNotAnnounced: true") && k.out.includes("lcpMs: not measured (at most 2500)"), k.out);

  k = extract("--page", "faults");
  check("extract: without --layer all three layers come, and the speed is measured", ["## Layer 1", "## Layer 2", "## Layer 3"].every((o) => k.out.includes(o)) && /performance\.cls: [\d.]+/.test(k.out) && k.out.includes("### Form: not measured"), notMeasured(k.out));
  k = extract("--page", "clean");
  check("extract: a clean page passes", k.status === 0 && k.out.includes("Layer 2: 5 of 5. Every group passes.") && k.out.includes("### Errors: passes") && k.out.includes("consoleErrors: none"), k.out.split("\n").find((l) => l.startsWith("Layer 2")));
  // What the measurement has not tried with the arrow keys itself stands under Accessibility, so the agent in layer 1 looks in the code.
  check("extract layer 1: what is expected to be reached with arrow keys stands with a name", k.out.includes("keyboard.expectedWithArrowKeys (2):") && k.out.includes('  - button#tab-2.tab "Afterwards"'), k.out.split("\n").filter((l) => l.includes("ArrowKeys") || l.includes("tab-2")));
  k = extract("--page", "ignored", "--layer", "1");
  check("extract: what the plan asked to ignore stands with the reason", k.out.includes("Ignored by the plan:") && k.out.includes("Test: one element is ignored"), k.out);

  k = extract("--page", "does-not-exist");
  check("extract: an unknown page is rejected with the names of the measured ones", k.status === 2 && k.out.includes('The page "does-not-exist" is not in the measurement. Measured: faults, faults-form, clean, clean-form, tight, ignored.'), k.out);
  same("extract: an unknown layer is rejected", extract("--page", "faults", "--layer", "4").status, 2);
  same("extract: a folder without a measurement", exec("extract.mjs", "--out", join(out, "does-not-exist")).status, 2);
}

// 12b. Slices: a tall screenshot is cut into pieces that can be seen without being scaled down, and every pixel is the same as in the original.
{
  // The plan: equally tall slices, 100 px overlap, the last ends at the bottom, and a low image is not cut.
  same("slices: the height follows the width", [1440, 390, 320, 3000].map(sliceHeight), [800, 1500, 1500, 600]);
  same("slices: an image of 1440 × 900 is not cut", slicePlan(1440, 900), []);
  same("slices: nor one that is one and a half times as tall as a slice", slicePlan(1440, 1200), []);
  same("slices: 1440 × 1201 is cut in two", slicePlan(1440, 1201), [[0, 651], [550, 1201]]);
  same("slices: 64 × 5000 is cut in four", slicePlan(64, 5000), [[0, 1325], [1225, 2550], [2450, 3775], [3675, 5000]]);
  const covers = [[1440, 8401], [390, 9641], [903, 9702], [680, 2443], [1440, 1315]].map(([w, h]) => {
    const p = slicePlan(w, h), each = p[0][1] - p[0][0];
    return p[0][0] === 0 && p.at(-1)[1] === h && each <= sliceHeight(w) && p.every(([from, to], i) => to - from === each && (!i || (p[i - 1][1] - from >= OVERLAP && from > p[i - 1][0])));
  });
  same("slices: the whole image is covered, with overlap and without too-tall slices", covers, [true, true, true, true, true]);

  // An artificial image where every row is its own: 64 × 5000 px in colours with alpha.
  const sliceOut = join(out, "slices-test"), wide = 64, tall = 5000, row = wide * 4;
  mkdirSync(sliceOut);
  const pixels = Buffer.alloc(tall * row);
  for (let y = 0; y < tall; y++) for (let x = 0; x < row; x++) pixels[y * row + x] = (y * 31 + x * 7 + (y >> 8) * 13) & 255;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(wide, 0); header.writeUInt32BE(tall, 4); header[8] = 8; header[9] = 6;
  const source = { width: wide, height: tall, row, bpp: 4, header, others: [], pixels };
  writeFileSync(join(sliceOut, "tall.png"), writePng(source));
  writeFileSync(join(sliceOut, "low.png"), writePng(source, 0, 900));
  writeFileSync(join(sliceOut, "not-an-image.png"), "not a PNG");
  same("slices: the image's size is read from the file", imageSize(join(sliceOut, "tall.png")), { width: wide, height: tall });
  same("slices: a file that is not a PNG has no size", imageSize(join(sliceOut, "not-an-image.png")), null);
  const again = readPng(readFileSync(join(sliceOut, "tall.png")));
  check("slices: an image can be written and read again without changing", again.width === wide && again.height === tall && Buffer.compare(again.pixels, pixels) === 0, [again.width, again.height]);

  let k = exec("slices.mjs", "--out", sliceOut);
  same("slices: ends without error", k.status, 0);
  // Right after heavy work, Node can lock up in process.exit(). So the script must end by itself.
  check("slices: the script ends without process.exit() after the work", !/^process\.exit\(/m.test(readFileSync(join(here, "..", "scripts", "slices.mjs"), "utf8")));
  check("slices: says what was cut", k.out.includes("tall.png: 64 × 5000 px, cut into 4 slices of 1325 px") && !k.out.includes("low.png"), k.out);
  same("slices: four slices of the tall image, none of the low one", readdirSync(join(sliceOut, "slices")).sort(), ["tall-1.png", "tall-2.png", "tall-3.png", "tall-4.png"]);
  same("slices: they are found again from top to bottom", slicesOf(sliceOut, "tall.png"), ["tall-1.png", "tall-2.png", "tall-3.png", "tall-4.png"]);
  const identical = slicePlan(wide, tall).map(([from, to], i) => {
    const u = readPng(readFileSync(join(sliceOut, "slices", `tall-${i + 1}.png`)));
    return u.width === wide && u.height === to - from && Buffer.compare(u.pixels, pixels.subarray(from * row, to * row)) === 0;
  });
  same("slices: every pixel in every slice is the same as in the original", identical, [true, true, true, true]);

  // Old slices are removed when cutting again, so an image that has become lower does not keep its old slices.
  writeFileSync(join(sliceOut, "slices", "old-1.png"), writePng(source, 0, 10));
  k = exec("slices.mjs", "--out", sliceOut);
  check("slices: old slices are removed when cutting again", k.status === 0 && !existsSync(join(sliceOut, "slices", "old-1.png")) && slicesOf(sliceOut, "tall.png").length === 4, readdirSync(join(sliceOut, "slices")));
  rmSync(join(sliceOut, "tall.png"));
  k = exec("slices.mjs", "--out", sliceOut);
  check("slices: without tall images there are no slices", k.status === 0 && k.out.includes("No images are too tall to see in one piece.") && !existsSync(join(sliceOut, "slices")), k.out);
  // An image that cannot be read does not stop the others, but the command says so and ends with an error.
  const damaged = writePng(source);
  writeFileSync(join(sliceOut, "damaged.png"), damaged.subarray(0, 200));
  writeFileSync(join(sliceOut, "tall.png"), damaged);
  k = exec("slices.mjs", "--out", sliceOut);
  check("slices: a damaged image is reported, and the others are cut", k.status === 1 && k.out.includes("damaged.png: could not be cut (") && slicesOf(sliceOut, "tall.png").length === 4 && !slicesOf(sliceOut, "damaged.png").length, k.out);
  same("slices: without --out", exec("slices.mjs").status, 2);
  same("slices: a folder that does not exist", exec("slices.mjs", "--out", join(out, "does-not-exist")).status, 2);

  // The measurement cuts by itself: every image that is too tall has its slices, and the others have none.
  const images = readdirSync(out).filter((f) => f.endsWith(".png"));
  const tallOnes = images.filter((f) => { const m = imageSize(join(out, f)); return slicePlan(m.width, m.height).length; });
  atLeast("slices: the measurement has images too tall to see in one piece", tallOnes.length, 2);
  check("slices: the measurement says what it has cut", tallOnes.every((f) => run.text.includes(`${f}: `)) && run.text.includes(`The slices are in ${join(out, "slices")}`), run.text.split("\n").slice(-12));
  same("slices: the measurement has cut every tall image and only those",
    images.filter((f) => { const m = imageSize(join(out, f)); return slicesOf(out, f).length !== slicePlan(m.width, m.height).length; }), []);

  // A real screenshot: the slices put together again give the original, pixel by pixel.
  const big = tallOnes.find((f) => f === "faults-desk.png") || tallOnes[0], original = readPng(readFileSync(join(out, big))), m = imageSize(join(out, big));
  const matches = slicePlan(m.width, m.height).map(([from, to], i) => {
    const u = readPng(readFileSync(join(out, "slices", slicesOf(out, big)[i])));
    return u.row === original.row && u.height === to - from && Buffer.compare(u.pixels, original.pixels.subarray(from * original.row, to * original.row)) === 0;
  });
  check(`slices: ${big} is the same pixel by pixel in its slices`, matches.length >= 2 && matches.every(Boolean), matches);

  // The browser must be able to show a slice, and it must be the same as that place in the original.
  const browser = await chromium.launch(browserChoice());
  try {
    const s = await browser.newPage();
    const [from, to] = slicePlan(m.width, m.height)[1], data = (file) => `data:image/png;base64,${readFileSync(file).toString("base64")}`;
    const seen = await s.evaluate(async ([whole, slice, from, to]) => {
      const load = async (src) => createImageBitmap(await (await fetch(src)).blob());
      const a = await load(whole), b = await load(slice);
      const pixelsOf = (image, y, h) => {
        const c = new OffscreenCanvas(image.width, h).getContext("2d");
        c.drawImage(image, 0, y, image.width, h, 0, 0, image.width, h);
        return c.getImageData(0, 0, image.width, h).data;
      };
      const pa = pixelsOf(a, from, to - from), pb = pixelsOf(b, 0, b.height);
      let difference = 0;
      for (let i = 0; i < pa.length; i++) if (pa[i] !== pb[i]) difference++;
      return { width: b.width, height: b.height, difference, length: pa.length === pb.length };
    }, [data(join(out, big)), data(join(out, "slices", slicesOf(out, big)[1])), from, to]);
    same("slices: the browser shows the slice as the same place in the original", seen, { width: m.width, height: to - from, difference: 0, length: true });
  } finally {
    await browser.close();
  }

  // The extract points to the slices, and says how to make them when they are missing.
  k = exec("extract.mjs", "--out", out, "--page", "faults", "--layer", "1");
  const desk = slicesOf(out, "faults-desk.png");
  check("extract: a tall image stands with its size and its slices",
    k.out.includes(`Screenshot, 1440 px: ${join(out, "faults-desk.png")} (1440 × ${imageSize(join(out, "faults-desk.png")).height} px. Shown at once it is scaled down and only shows the page's layout. Read it in the slices, from top to bottom:)`)
      && desk.length >= 2 && desk.every((f) => k.out.includes(`\n  ${join(out, "slices", f)}\n`)), k.out.split("\n").slice(0, 14));
  k = exec("extract.mjs", "--out", out, "--page", "tight", "--layer", "1");
  check("extract: an image that can be seen in one piece stands without slices", /^Screenshot, 1440 px: .+tight-desk\.png$/m.test(k.out) && !k.out.includes(join(out, "slices")), k.out.split("\n").slice(0, 8));
  renameSync(join(out, "slices"), join(out, "slices-kept"));
  k = exec("extract.mjs", "--out", out, "--page", "faults", "--layer", "1");
  check("extract: when the slices are missing, the command that makes them stands there", k.status === 0 && k.out.includes(`Cut it into slices so it can be read: node scripts/slices.mjs --out ${out})`), k.out.split("\n").slice(0, 8));
  renameSync(join(out, "slices-kept"), join(out, "slices"));
}

// 13. The pattern catalogue: every line of CSS must be readable by the browser, every selector must match something on the test page,
// and the page with all the patterns must pass the same measurement as everything else.
{
  const { css, js } = catalog();
  same("catalogue: code blocks with CSS", css.length, 26);
  same("catalogue: code blocks with JS", js.length, 5);
  const source = css.join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
  const browser = await chromium.launch(browserChoice());
  try {
    const s = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = [];
    s.on("pageerror", (e) => errors.push(String(e)));
    s.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await s.setContent(patterns());
    const found = await s.evaluate((source) => {
      const root = getComputedStyle(document.documentElement);
      // Every declaration is tried on its own. var() is looked up on :root, where the test page has set what the catalogue asks the page for.
      const rejected = [], unknown = [];
      for (const [, property, raw] of source.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)(?=[;}])/g)) {
        if (property === "navigation") continue; // a descriptor in @view-transition, not a property
        const value = raw.trim().replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (all, name, fallback) => {
          const v = root.getPropertyValue(name).trim();
          if (v) return v;
          if (fallback !== undefined) return fallback.trim();
          unknown.push(name);
          return all;
        });
        if (!CSS.supports(property, value)) rejected.push(`${property}: ${value}`);
      }
      // A rule the browser does not understand drops out of the stylesheet. So there must be as many rules as there are { in the source.
      const countRules = (rules) => [...rules].reduce((n, r) => n + 1 + (r.cssRules ? countRules(r.cssRules) : 0), 0);
      const sheet = document.getElementById("catalog").sheet;
      const selectors = [];
      const collect = (rules) => {
        for (const r of rules) {
          if (r instanceof CSSKeyframesRule) continue;
          if (r.selectorText) selectors.push(...r.selectorText.split(/,(?![^(]*\))/).map((v) => v.trim()));
          if (r.cssRules) collect(r.cssRules);
        }
      };
      collect(sheet.cssRules);
      // States that only come with use (mouse, press, focus, classes set by script) are peeled off before searching.
      const peel = (v) => v.replace(/::view-transition-[\w-]+\([^)]*\)/g, "").replace(/::(before|after|backdrop)/g, "").replace(/:(hover|active|focus-visible|checked|popover-open)/g, "").replace(/\.(scrolled|leaving|waiting|seen)(?![\w-])/g, "").trim();
      const empty = selectors.filter((v) => { const k = peel(v); if (!k) return false; try { return !document.querySelector(k); } catch { return true; } });
      return { rejected, unknown, rules: countRules(sheet.cssRules), selectors: selectors.length, empty };
    }, source);
    const version = browser.version();
    same(`catalogue: every declaration can be read by the browser (${version})`, found.rejected, []);
    same("catalogue: every variable is set on the test page or has a fallback", found.unknown, []);
    same("catalogue: no rule has dropped out of the stylesheet", found.rules, (source.match(/\{/g) || []).length);
    atLeast("catalogue: selectors searched for on the test page", found.selectors, 60);
    same("catalogue: every selector matches something on the test page", found.empty, []);
    same("catalogue: the scripts run without errors", errors, []);

    // The page header stays put and must lie above what scrolls in under it, also when that has its own position.
    const onTop = await s.evaluate(async () => {
      const head = document.querySelector(".top"), under = document.querySelector(".switch");
      scrollTo(0, under.getBoundingClientRect().top + scrollY - 10);
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      const r = under.getBoundingClientRect();
      return head.contains(document.elementFromPoint(r.left + r.width / 2, r.top + 4));
    });
    check("catalogue: the page header lies above what scrolls under it", onTop === true, onTop);

    // The switch's track must keep its size when the label is long and breaks over several lines on a narrow screen.
    const narrow = await browser.newPage({ viewport: { width: 320, height: 640 } });
    await narrow.setContent(patterns());
    const track = await narrow.evaluate(() => {
      const label = document.querySelector(".switch");
      label.lastChild.textContent = "Email me every time a book I reserved is ready, and when a loan is about to run out and has to be returned or renewed";
      const r = label.querySelector(".track").getBoundingClientRect();
      return { width: Math.round(r.width), height: Math.round(r.height), lines: Math.round(label.getBoundingClientRect().height / parseFloat(getComputedStyle(label).lineHeight)) };
    });
    same("catalogue: the switch's track is 44 × 24 px with a long label at 320 px", [track.width, track.height], [44, 24]);
    atLeast("catalogue: the long label breaks over several lines", track.lines, 3);
  } finally {
    await browser.close();
  }

  const catalogMeasurement = JSON.parse(readFileSync(join(out, "patterns", "measurement.json"), "utf8")), m = catalogMeasurement.pages[0];
  same("measurement: --base goes before the plan's base", catalogMeasurement.base, base);
  check("measurement: and the page was seen at that address", !m.notSeen && m.finalUrl.startsWith(base), m.notSeen || m.finalUrl);
  const fires = Object.entries(m.metrics).filter(([k, v]) => !NEUTRAL_KEYS.includes(k) && v !== 0 && v !== null);
  same("catalogue: no metric fires on the page with all the patterns", fires, []);
  same("catalogue: layer 2", m.layer2, { score: 5, failed: [], groups: Object.fromEntries(Object.keys(m.layer2.groups).map((g) => [g, true])) });
  same("catalogue: no curve bounces", m.motion.bouncyCurves, []);
  same("catalogue: no transition is linear", m.motion.linear, []);
  same("catalogue: no clear signs of AI look", m.aiLook.clear.map((x) => x.rule), []);
}

// 14. The Tab walk. The long, calm page has what the measurement used to mistake on real pages, and must not give findings.
// The page with faults has the counter-tests, so the exceptions do not hide real faults.
{
  const v = Object.fromEntries(JSON.parse(readFileSync(join(out, "walk", "measurement.json"), "utf8")).pages.map((p) => [p.name, p]));
  for (const n of ["walk", "walk-faults", "walk-long", "visible"]) check(`${n} was seen`, !!v[n] && !v[n].notSeen, v[n]?.notSeen);

  // axe must not load the page's stylesheets again by itself. The long page uses a stylesheet from another origin without CORS headers:
  // loaded by a script, it gives a console error and a failed request the page did not make itself.
  const sheet = (await (await fetch(`${base}/walk`)).text()).match(/<link rel="stylesheet" href="([^"]+)"/)?.[1];
  const sheetAnswer = sheet ? await fetch(sheet) : null;
  await sheetAnswer?.arrayBuffer();
  check("walk: the stylesheet is on another origin and has no CORS headers", !!sheetAnswer && sheetAnswer.ok && new URL(sheet).origin !== base && !sheetAnswer.headers.has("access-control-allow-origin"), sheet);
  same("walk: no console errors once axe has run", v.walk.consoleErrors, []);
  same("walk: no failed requests once axe has run", v.walk.failedRequests, []);

  // The walk goes all the way round the page and knows by itself when it is round. The 104 stops are the skip link, two in the menu, the button, six shortcuts,
  // the link in the fan, three answers, the frame with the letter, two questions, the guide, 84 rules and two in the footer. The frame is one stop, also when Tab goes round inside it.
  const t = v.walk.keyboard;
  same("walk: Tab reaches all 104 stops", t.stops, 104);
  same("walk: the walk is not interrupted, and nothing is untried", [t.interrupted, t.notTried], [false, 0]);
  same("walk: from the bottom of one column to the top of the next is not a jump back", t.jumpsBack, []);
  same("walk: the frame is not judged for a focus that cannot be seen from outside", t.invisibleFocus, []);
  same("walk: focus is not trapped anywhere", t.trapped, []);
  same("walk: smooth scrolling does not make focus look covered or out of sight", [t.obscured, t.offscreen], [[], []]);
  check("walk: the link in what is disabled (inert) is not something Tab should have reached", !t.notReached.some((x) => x.includes("Read the reminder")), t.notReached);
  // What is hidden is neither something Tab should have reached nor a target: the closed menu (clipped away), the collapsed answer
  // (without height), the bubble (transparent) and the skip link (1 × 1 px until it gets focus). Only the ticker's copies remain, and they have a partner.
  same("walk: the ticker's copies lead to the same place as the links Tab reaches, and are the only ones counted out", t.sameTargetReached, ['a "North Library"', 'a "Harbour Library"', 'a "West Library"']);
  same("walk: what is hidden in the menu, the answer and the bubble is not something Tab should have reached", t.notReached, []);
  same("walk: what is hidden and the skip link do not count as targets", v.walk.targets.map((x) => x.element), []);
  same("walk: no group fails in layer 2", [v.walk.layer2.score, v.walk.layer2.failed], [5, []]);
  // The link in the fan slides aside when the mouse enters the line. The first press would land next to it, so the measurement aims again.
  const wm = v.walk.mouse;
  same("walk: the link that moves away from the mouse is hit on the second try", [wm.aimedAgain, wm.notHit], [['a "Reading circle on Thursday evenings"'], []]);
  same("walk: everything the mouse hits responds to hover and press", [wm.noHover, wm.noPressed], [[], []]);

  // The counter-tests: a real jump back and a real trap must still be found, and what lies after the trap cannot be reached.
  const f = v["walk-faults"].keyboard;
  same("walk-faults: ten stops, and the trap is the last", f.stops, 10);
  same("walk-faults: focus jumps back in one place", f.jumpsBack, ['a#bottom.block "First in the code, bottom of the page" → a#top.block "Last in the code, top of the page"']);
  same("walk-faults: Tab cannot get past the note field", f.trapped, ["textarea#note"]);
  same("walk-faults: the mouse-only link and the button after the trap cannot be reached", f.notReached, ['a.block "Only for the mouse"', 'button "Save the note"']);
  same("walk-faults: the ticker's copies are counted out", f.sameTargetReached, ['a "North Library has news"', 'a "West Library has news"']);
  same("walk-faults: a trap is not an interrupted walk", [f.interrupted, f.notTried], [false, 0]);
  same("walk-faults: focus lands on the link in the transparent box, and it cannot be seen", f.invisibleFocus, ['a.block "A link nobody can see"']);
  const fm = v["walk-faults"].metrics;
  same("walk-faults: the four focus findings also stand as numbers (covered, off screen, jumps back, trapped)", [fm.focusObscured, fm.focusOffscreen, fm.focusJumpsBack, fm.focusTrapped], [1, 3, 1, 1]);
  same("walk-faults: Fingers and Keyboard fail", v["walk-faults"].layer2.failed, ["fingers", "keyboard"]);
  same("walk-faults: the button in the box that is only clipped at the corners is still too small", v["walk-faults"].targets.map((x) => x.element), ['a.small "Small button"']);
  same("walk-faults: only the link under the bar is covered", f.obscured, ['a.under "Under the bar"']);
  same("walk-faults: the ticker's two links and the link left of the screen stand off screen", f.offscreen, ['a "North Library has news"', 'a "West Library has news"', 'a.outside "Outside the screen"']);

  // More stops than the walk goes: it stops at the ceiling and says so. What it did not get to is not tried, and that is not a finding.
  // The link it passed on the way is still a finding.
  const l = v["walk-long"].keyboard;
  same("walk-long: the walk stops after 600 stops and is interrupted", [l.stops, l.interrupted], [600, true]);
  same("walk-long: the last 41 cells and the link after them are not tried", l.notTried, 42);
  check("walk-long: the link Tab passes is the only one that cannot be reached", l.notReached.length === 1 && l.notReached[0].includes("the description of the method"), l.notReached);
  same("walk-long: no focus is covered or off screen", [l.obscured, l.offscreen], [[], []]);
  same("walk-long: the link without a partner is not counted out", l.sameTargetReached, []);
  same("walk-long: only Keyboard fails", v["walk-long"].layer2.failed, ["keyboard"]);

  // Can it be seen? Every link on the page is taken out of the Tab order. Those that can be seen must stand as not reached, and the hidden ones must not stand anywhere.
  const linkTexts = [...(await (await fetch(`${base}/visible`)).text()).matchAll(/tabindex="-1">((?:seen|hidden): [^<]+)<\/a>/g)].map((x) => x[1]);
  const seen = linkTexts.filter((x) => x.startsWith("seen: ")), hidden = linkTexts.filter((x) => x.startsWith("hidden: "));
  same("visible: the page has 14 links that can be seen and 17 that are hidden", [seen.length, hidden.length], [14, 17]);
  same("visible: exactly the links that can be seen stand as not reached", v.visible.keyboard.notReached, seen.map((x) => `a "${x.slice(0, 40)}"`));
  same("visible: no hidden link is a target or counted out", [v.visible.targets.map((x) => x.element), v.visible.keyboard.sameTargetReached], [[], []]);

  // The report and the extract say the same in words.
  const wout = join(out, "walk");
  let k = exec("report.mjs", "--out", wout, "--no-images");
  const h = k.status === 0 ? readFileSync(join(wout, "report.html"), "utf8") : "";
  check("walk: the report names the trap", h.includes("Tab cannot get past: textarea#note"), k.out);
  check("walk: the report names the covered focus and the one that ends up off screen", h.includes("Focus hidden behind something else: 1") && h.includes("Focus ends up off screen: 3"), k.out);
  check("walk: the report makes a reservation for the interrupted walk", h.includes("The Tab walk was interrupted after 600 stops. 42 clickable elements were not tried."), k.out);
  k = exec("extract.mjs", "--out", wout, "--page", "walk-long", "--layer", "1");
  check("walk: the extract for layer 1 says the walk is interrupted", k.out.includes("keyboard.interrupted: true") && k.out.includes("keyboard.notTried: 42") && k.out.includes("keyboard.trapped: none"), k.out.split("\n").filter((x) => x.startsWith("keyboard.")));
}

console.log(`\n${count - failures} of ${count} checks passed.`);
if (process.argv.includes("--keep")) console.log(`The measurement is in ${out}`);
else rmSync(out, { recursive: true, force: true });
// End without process.exit() (see scripts/slices.mjs): the server is closed, and then Node has nothing left to wait for.
// The timer is a guard if something keeps the process alive anyway. It does not keep the process alive itself.
process.exitCode = failures ? 1 : 0;
server.closeAllConnections();
server.close();
setTimeout(() => process.exit(), 10000).unref();
