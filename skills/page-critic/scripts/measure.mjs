#!/usr/bin/env node
// Measures every page in the plan in a real browser and writes screenshots + measurement.json.
//
//   node scripts/measure.mjs --plan <plan.json> --out <folder> [--base <url>] [--quick]
//
// The plan:
//   {
//     "base": "http://localhost:8787",
//     "login": [ { "goto": "/sign-in" }, { "fill": ["#email", "test@example.com"] }, { "click": "button[type=submit]" } ],
//     "pages": [
//       { "name": "start", "path": "/sign-in" },
//       { "name": "error", "path": "/sign-in", "steps": [ { "fill": ["input[name=email]", "wrong"] }, { "submit": "form" } ] }
//     ],
//     "ignore": [ { "metric": "targetsUnder44", "element": "a.logo", "page": "*", "why": "The logo is not a button" } ]
//   }
// Steps: goto (path), fill [selector, value], click (selector), submit (selector of a form; skips the browser's own validation),
// press (key), wait (selector or milliseconds), js (code run in the page).
// Per page: "performance": false skips the speed measurement; "errorState": true says the state shows a form error
// (otherwise it is guessed from a submit step and a status code between 400 and 499); "inp": [selectors] are extra things to press in the INP measurement.
//
// --base runs the same plan against another address than the plan's "base" (first the demo, then a local run with the fixes).
// --check only reads the plan and says whether it is valid. No browser, and --out is not needed.
// --quick skips what takes time or needs extra loads: three speed runs (only one), INP, stress tests,
// double click on submit, the not-found page and the reload with "reduce motion".
//
// If the folder already has a measurement.json, it is moved to measurement-previous.json, so compare.mjs can show before and after.

import { chromium } from "playwright-core";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LABEL, GROUP_METRICS, NO_BROWSER, browserChoice, fails } from "./common.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : null; };
const planPath = arg("plan"), out = arg("out"), QUICK = process.argv.includes("--quick"), CHECK_ONLY = process.argv.includes("--check");
const reject = (text, code = 2) => { console.error(text); process.exit(code); };
if (!planPath || (!out && !CHECK_ONLY)) reject("Usage: node scripts/measure.mjs --plan <plan.json> --out <folder> [--base <url>] [--quick]\n       node scripts/measure.mjs --plan <plan.json> --check");
let plan;
try { plan = JSON.parse(readFileSync(planPath, "utf8")); } catch (e) { reject(`The plan could not be read (${planPath}): ${e.message}`); }
if (process.argv.includes("--base")) {
  if (!arg("base") || arg("base").startsWith("--")) reject("--base needs an address, e.g. --base http://localhost:8787");
  plan.base = arg("base");
}
if (!plan.base) reject('The plan is missing "base" (the address the pages live on). It can also be given with --base <url>.');
if (!/^https?:\/\//.test(plan.base) || !URL.canParse(plan.base)) reject(`"base" is not a full address: ${plan.base}. Write it with http:// or https:// in front.`);
if (!Array.isArray(plan.pages) || !plan.pages.length) reject('The plan is missing "pages": a list of at least one page, each with "name" and "path".');
const unnamed = plan.pages.filter((p) => !p.name || !p.path);
if (unnamed.length) reject(`Every page needs both "name" and "path". Missing in: ${JSON.stringify(unnamed)}`);
const duplicates = plan.pages.map((p) => p.name).filter((n, i, all) => all.indexOf(n) !== i);
if (duplicates.length) reject(`Two pages may not have the same name (the screenshots would overwrite each other): ${[...new Set(duplicates)].join(", ")}`);
// A step with a typo would be skipped silently, and then the state is not the one the plan asked for.
const STEPS = ["goto", "fill", "click", "submit", "press", "wait", "js"];
const unknown = [...(plan.login || []), ...plan.pages.flatMap((p) => p.steps || [])].filter((t) => !t || Object.keys(t).length !== 1 || !STEPS.includes(Object.keys(t)[0]));
if (unknown.length) reject(`Every step must be exactly one of: ${STEPS.join(", ")}. Cannot read: ${JSON.stringify(unknown)}`);
const noReason = (plan.ignore || []).filter((i) => !i.metric || !i.why);
if (noReason.length) reject(`Every entry in "ignore" needs both "metric" and "why". Missing in: ${JSON.stringify(noReason)}`);
const unknownMetrics = (plan.ignore || []).filter((i) => !(i.metric in LABEL) && !/^aiLook:\w+$/.test(i.metric));
if (unknownMetrics.length) reject(`Unknown metric in "ignore": ${unknownMetrics.map((i) => i.metric).join(", ")}. Metrics are named like the numbers in measurement.json (the list is in scripts/common.mjs), and an AI-look rule is written "aiLook:<rule>".`);
const aiWithElement = (plan.ignore || []).filter((i) => i.metric.startsWith("aiLook") && i.element);
if (aiWithElement.length) reject(`AI look is ignored per rule ("aiLook:<rule>"), not per element. Remove "element" in: ${JSON.stringify(aiWithElement)}`);
const noPage = (plan.ignore || []).filter((i) => i.page && i.page !== "*" && !plan.pages.some((p) => p.name === i.page));
if (noPage.length) reject(`"ignore" names a page the plan does not have: ${noPage.map((i) => i.page).join(", ")}`);
if (CHECK_ONLY) {
  const steps = (plan.login || []).length + plan.pages.reduce((n, p) => n + (p.steps || []).length, 0);
  console.log(`The plan is valid: ${plan.pages.length} ${plan.pages.length === 1 ? "page" : "pages"} on ${plan.base}, ${steps} ${steps === 1 ? "step" : "steps"}, ${(plan.ignore || []).length} ${(plan.ignore || []).length === 1 ? "exception" : "exceptions"}.`);
  process.exit(0);
}
// The exceptions that matched something. The rest are listed at the end: they are misspelt or no longer needed.
const matched = new Set();
mkdirSync(out, { recursive: true });

const IN_PAGE = readFileSync(join(here, "in-page.js"), "utf8");
const AXE = createRequire(import.meta.url).resolve("axe-core/axe.min.js");
const PERFORMANCE = `
  window.__pcPerformance = { lcp: null, cls: 0, presses: {} };
  const watch = (type, fn, more) => { try { new PerformanceObserver((l) => { for (const e of l.getEntries()) fn(e); }).observe({ type, buffered: true, ...more }); } catch {} };
  watch("largest-contentful-paint", (e) => { window.__pcPerformance.lcp = e.startTime; });
  watch("layout-shift", (e) => { if (!e.hadRecentInput) window.__pcPerformance.cls += e.value; });
  watch("event", (e) => { if (e.interactionId) window.__pcPerformance.presses[e.interactionId] = Math.max(window.__pcPerformance.presses[e.interactionId] || 0, e.duration); }, { durationThreshold: 16 });
`;

const DESK = { width: 1440, height: 900 }, MOBILE = { width: 390, height: 844 }, NARROW = { width: 320, height: 640 };
const address = (path) => new URL(path, plan.base).href;
const settle = async (page) => { await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(250); };
const short = (e) => String(e && e.message ? e.message : e).split("\n")[0];
const median = (values) => { const t = values.filter((x) => x !== null && x !== undefined).sort((a, b) => a - b); return t.length ? t[Math.floor((t.length - 1) / 2)] : null; };
const measureIn = (page) => (fn, ...a) => page.evaluate(([f, x]) => window.__pc[f](...x), [fn, a]);

// A click or a submit can change the page. Wait for the change if it comes, so the next step does not hit a page on its way out.
async function withNavigation(page, action, waitMs) {
  const navigation = page.waitForEvent("framenavigated", { predicate: (f) => f === page.mainFrame(), timeout: waitMs }).catch(() => null);
  await action().catch((e) => { if (!/context was destroyed|navigation/i.test(e.message)) throw e; });
  if (await navigation) await page.waitForLoadState("domcontentloaded").catch(() => {});
}

// Runs the steps and remembers what was typed into the fields, and what the page title was before the form was submitted.
async function runSteps(page, steps = []) {
  const run = { filled: [], titleBefore: null, submitted: false };
  for (const t of steps) {
    if (t.goto) await page.goto(address(t.goto), { waitUntil: "domcontentloaded" });
    else if (t.fill) { await page.fill(t.fill[0], t.fill[1]); run.filled.push(t.fill); }
    else if (t.click) await withNavigation(page, () => page.click(t.click), 1500);
    else if (t.submit) {
      run.titleBefore = await page.title();
      run.submitted = true;
      await withNavigation(page, () => page.$eval(t.submit, (f) => { f.noValidate = true; f.requestSubmit ? f.requestSubmit() : f.submit(); }), 4000);
    }
    else if (t.press) await page.keyboard.press(t.press);
    else if (t.js) await page.evaluate(t.js);
    else if (t.wait) typeof t.wait === "number" ? await page.waitForTimeout(t.wait) : await page.waitForSelector(t.wait);
    await settle(page);
  }
  return run;
}

// Scrolls through the page, so lazy images and content that only shows when scrolled into view are part of the measurement and the screenshot.
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, innerHeight * 0.8);
    for (let y = 0; y < Math.min(document.documentElement.scrollHeight, 40000); y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }).catch(() => {});
  await page.waitForTimeout(350);
}

// Walks the page with Tab and notes every stop: is focus visible, and does the order follow the eye?
// The walk is done when focus lands on an element it has been on before. The ceiling guards against a page that keeps making new stops.
const TAB_CEILING = 600;
async function keyboard(page, clickableCount) {
  let stops = [], done = false;
  const trapped = [];
  await page.evaluate(() => { window.__pc.startWalk(); document.activeElement && document.activeElement.blur(); window.scrollTo({ top: 0, left: 0, behavior: "instant" }); });
  for (let n = 0, empty = 0, inPlace = 0; n < TAB_CEILING && !done; n++) {
    await page.keyboard.press("Tab");
    const f = await page.evaluate(() => window.__pc.focus());
    // Focus can sit outside the page for a moment when the walk goes from the last element to the first. If it sits there from the first press and stays, there is nothing to stop at.
    if (!f) { done = ++empty > (stops.length ? 2 : 20); continue; }
    empty = 0;
    if (f.round) done = true;
    else if (!f.same) {
      inPlace = 0;
      // Obscured or out of sight may have been read while the page was moving. Then the position is read again once the page stands still.
      // What moves along in an infinite animation never stands still and has already been tested through its whole run.
      if ((f.offscreen || f.obscured) && !f.moving) Object.assign(f, await page.evaluate(() => window.__pc.focusSettled()));
      stops.push(f);
    }
    // Tab did not move focus. In a frame (iframe) and in an element with several parts (a date, a player) Tab goes round inside the element, and that is fine.
    // If the page itself swallowed the press, twenty presses are enough to call it a trap. Otherwise it takes two hundred, because no element has that many parts.
    // If the element is the page's only clickable one, a trap cannot be told apart from a trip round the page.
    else if (++inPlace > (f.swallowed && !f.frame ? 20 : 200)) {
      if (f.frame) break;
      if (clickableCount > 1) trapped.push(f.element);
      done = true;
    }
  }
  await page.evaluate(() => window.__pc.endWalk()).catch(() => {});
  // If the walk was cut short, only the stretch from the first to the last stop has been tested.
  const numbers = stops.map((s) => s.i).filter((i) => i !== null);
  const interrupted = !done && stops.length > 0, span = [numbers[0] ?? null, numbers[numbers.length - 1] ?? null];
  // If the page set focus itself (autofocus), the walk starts in the middle of the page. Rotate the list so it starts at the page's first element.
  const first = stops.reduce((best, x, n) => (x.i !== null && (best === -1 || x.i < stops[best].i) ? n : best), -1);
  if (first > 0) stops = [...stops.slice(first), ...stops.slice(0, first)];
  // Focus jumps back when the next stop sits higher on the page and not in a column to the right of the previous one.
  const backwards = [];
  for (let n = 1; n < stops.length; n++) {
    const a = stops[n - 1], b = stops[n];
    if (b.y < a.y - 40 && b.x < a.right && !a.fixed && !b.fixed) backwards.push(`${a.element} → ${b.element}`);
  }
  // Inside a frame the frame's own page draws focus. That cannot be seen from here, so the frame is not judged.
  const judged = stops.filter((s) => !s.frame);
  return { stops: stops.length, interrupted, trapped, invisibleFocus: judged.filter((s) => !s.visible).map((s) => s.element), obscured: judged.filter((s) => s.obscured).map((s) => s.element), offscreen: judged.filter((s) => s.offscreen).map((s) => s.element), jumpsBack: backwards, reached: numbers, span };
}

// Hovers over every clickable element and presses down on it (without releasing on the element, so nothing gets clicked).
async function mouse(page, clickables) {
  const noHover = [], noPressed = [], aimedAgain = [], notHit = [];
  const response = (i) => page.evaluate((i) => window.__pc.change(i), i), hit = (i) => page.evaluate((i) => window.__pc.underMouse(i), i);
  // Fields are not tested: they should respond neither to hover nor to press, and pressing a select opens it.
  // The selected item (the page you are on; the selected tab) and what can only take focus (a scroll area) are not tested either: a press changes nothing.
  const tested = clickables.filter((k) => !k.field && !k.selected && !k.focusOnly).slice(0, 40);
  for (const k of tested) {
    const el = page.locator(`[data-pc="${k.i}"]`);
    let down = false;
    try {
      // The resting style is taken once the element is scrolled into view, so what the scroll itself starts does not look like a response to the mouse.
      await el.scrollIntoViewIfNeeded({ timeout: 1500 });
      await page.evaluate((i) => window.__pc.rest(i), k.i);
      await el.hover({ timeout: 1500 });
      await page.waitForTimeout(350);
      let h = await response(k.i), again = false;
      // The page can move the target when the mouse arrives (a fan that opens). Then the mouse sits beside it, and a press hits something
      // else. It aims once more, while whatever moved the target is still open.
      if (!(await hit(k.i))) {
        await el.hover({ timeout: 1500 });
        await page.waitForTimeout(350);
        h = await response(k.i);
        if (!(await hit(k.i))) throw new Error("the mouse did not hit the element");
        again = true;
      }
      await page.mouse.down();
      down = true;
      await page.waitForTimeout(200);
      const a = await response(k.i), on = await hit(k.i);
      await page.mouse.move(0, 0);
      await page.mouse.up();
      down = false;
      if (again) aimedAgain.push(k.element);
      if (h && h.length === 0) noHover.push(k.element);
      // A press that landed beside the element says nothing about its pressed state.
      if (a && h && a.join() === h.join() && k.button && on) noPressed.push(k.element);
    } catch {
      // The element could not be hit with the mouse: it is covered, does not stand still or moves away every time the mouse arrives.
      // It is not judged: a response that cannot be called up is not a response that is missing.
      notHit.push(k.element);
      await page.mouse.move(0, 0).catch(() => {});
      if (down) await page.mouse.up().catch(() => {});
    }
  }
  await page.mouse.move(0, 0);
  return { tried: tested.length, noHover, noPressed, aimedAgain, notHit };
}

// With "reduce motion" on: hovers over the first clickable elements and over what has a :hover rule,
// while everything that moves is recorded.
async function hoverUnderReduced(page, clickables, hoverTargets) {
  const targets = [...clickables.slice(0, 12).map((k) => `[data-pc="${k.i}"]`), ...hoverTargets.slice(0, 12)];
  await page.evaluate((ms) => window.__pc.record(ms), 400 * targets.length + 1000);
  for (const v of targets) {
    try {
      await page.locator(v).first().hover({ timeout: 1000 });
      await page.waitForTimeout(120);
    } catch { /* could not be reached */ }
  }
  await page.mouse.move(0, 0);
  await page.waitForTimeout(120);
  return { found: await page.evaluate(() => window.__pc.recorded()), tried: targets.length };
}

// Opens a copy of the page (HTML from copy() in in-page.js) on the page's own address, without asking the server for the page again.
async function openCopy(ctx, html, pageAddress, options = {}) {
  const page = await ctx.newPage();
  if (options.viewport) await page.setViewportSize(options.viewport);
  if (options.reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  const u = new URL("/__pc-copy", pageAddress).href;
  await page.route(u, (route) => route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html }));
  await page.goto(u, { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(400);
  return page;
}

// Stress tests on a copy of the page at 390 px: longer texts (as in German) and a long word without spaces.
async function stress(ctx, html, pageAddress, name) {
  const result = {};
  for (const [key, fn, file] of [["german", "lengthen", "stress-german"], ["longWord", "longWord", "stress-long"]]) {
    const page = await openCopy(ctx, html, pageAddress, { viewport: MOBILE });
    try {
      const s = measureIn(page);
      const before = { o: await s("overflow"), c: await s("clipped") };
      const changed = await s(fn);
      await page.waitForTimeout(150);
      const after = { o: await s("overflow"), c: await s("clipped") };
      const newScroll = after.o.hScroll && !before.o.hScroll;
      const newClipped = Math.max(0, after.c.length - before.c.length);
      result[key] = { changedTexts: changed, hScroll: newScroll, culprits: newScroll ? after.o.culprits : [], newClipped, clipped: newClipped ? after.c.slice(0, 6) : [] };
      if (newScroll || newClipped) {
        await page.screenshot({ path: join(out, `${name}-${file}.png`), fullPage: true });
        result[key].image = `${name}-${file}.png`;
      }
    } catch (e) { result[key] = { notTried: short(e) }; }
    await page.close();
  }
  return result;
}

// Presses submit twice quickly. Every request that is not GET is held back in the browser, so nothing reaches the server.
const doubleSeen = new Map();
async function doubleSubmit(ctx, page0) {
  const i = page0.steps.findIndex((t) => t.submit);
  const key = `${page0.path}|${page0.steps[i].submit}`;
  if (doubleSeen.has(key)) return doubleSeen.get(key);
  const page = await ctx.newPage();
  const held = [];
  await page.route("**/*", (route) => {
    const q = route.request();
    if (["GET", "HEAD", "OPTIONS"].includes(q.method())) return route.continue();
    held.push(route);
  });
  let r;
  try {
    await page.goto(address(page0.path), { waitUntil: "domcontentloaded", timeout: 30000 });
    await settle(page);
    await runSteps(page, page0.steps.slice(0, i));
    const answer = await page.evaluate(async (v) => {
      const f = document.querySelector(v);
      if (!f) return { notTried: "the form was not found" };
      if ((f.method || "get").toLowerCase() === "get") return { notTried: "the form submits with GET" };
      const button = f.querySelector("button[type=submit], button:not([type]), input[type=submit]");
      if (!button) return { notTried: "the form has no submit button" };
      f.noValidate = true;
      const readButton = () => ({ text: (button.innerText || button.value || "").trim(), disabled: button.disabled || button.getAttribute("aria-disabled") === "true", busy: button.getAttribute("aria-busy") === "true" || f.getAttribute("aria-busy") === "true" });
      const before = readButton();
      button.click();
      await new Promise((ok) => setTimeout(ok, 120));
      const after = readButton();
      button.click();
      await new Promise((ok) => setTimeout(ok, 450));
      return { button: before.text, before, after };
    }, page0.steps[i].submit);
    if (answer.notTried) r = answer;
    else r = { button: answer.button, submits: held.length, showsWork: answer.after.disabled || answer.after.busy || answer.after.text !== answer.before.text, buttonAfterFirstPress: answer.after };
  } catch (e) { r = { notTried: short(e) }; }
  for (const route of held) await route.abort().catch(() => {});
  await page.close().catch(() => {});
  doubleSeen.set(key, r);
  return r;
}

// Interactions for INP: what a user typically touches. Submits no forms and follows no links.
async function touch(page, page0) {
  let count = 0;
  const attempt = async (fn) => { try { await fn(); count++; await page.waitForTimeout(250); } catch { /* could not be touched */ } };
  const fields = page.locator("input[type=text], input[type=email], input[type=search], input[type=tel], input:not([type]), textarea");
  for (let i = 0, used = 0; i < await fields.count() && used < 2; i++) {
    if (!(await fields.nth(i).isVisible().catch(() => false))) continue;
    used++;
    await attempt(async () => { await fields.nth(i).tap({ timeout: 1500 }); await page.keyboard.type("abc", { delay: 60 }); });
  }
  const toggles = page.locator("summary, button[aria-expanded], [role=button][aria-expanded], [role=tab]");
  for (let i = 0, used = 0; i < await toggles.count() && used < 3; i++) {
    if (!(await toggles.nth(i).isVisible().catch(() => false))) continue;
    used++;
    await attempt(() => toggles.nth(i).tap({ timeout: 1500 }));
  }
  for (const v of page0.inp || []) await attempt(() => page.locator(v).first().tap({ timeout: 1500 }));
  await attempt(() => page.keyboard.press("Tab"));
  await attempt(() => page.keyboard.press("Tab"));
  return count;
}

// A loaded stylesheet's own text, as it came from the server. It is read through the browser's debugging port: without a new request
// to the server and around the page's CSP. If it cannot be read, the copy uses the rules as the browser writes them.
async function sheetTexts(page, addresses) {
  const result = {};
  if (!addresses.length) return result;
  let cdp = null;
  try {
    cdp = await page.context().newCDPSession(page);
    const sheets = [];
    cdp.on("CSS.styleSheetAdded", (e) => sheets.push(e.header));
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    for (const a of sheets) {
      if (a.isInline || !addresses.includes(a.sourceURL) || a.sourceURL in result) continue;
      result[a.sourceURL] = (await cdp.send("CSS.getStyleSheetText", { styleSheetId: a.styleSheetId })).text;
    }
  } catch { /* a browser without the debugging port */ }
  await cdp?.detach().catch(() => {});
  return result;
}

async function onePerformanceRun(browser, page0, withInp) {
  const ctx = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 2, isMobile: true, hasTouch: true, bypassCSP: true });
  await ctx.addInitScript(PERFORMANCE);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  let bytes = 0, requests = 0;
  cdp.on("Network.loadingFinished", (e) => { bytes += e.encodedDataLength; requests++; });
  try {
    await page.goto(address(page0.path), { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(1500);
    const weight = { requests, kB: Math.round(bytes / 1024) };
    const m = await page.evaluate(() => ({ lcp: window.__pcPerformance.lcp, cls: window.__pcPerformance.cls, dcl: performance.getEntriesByType("navigation")[0]?.domContentLoadedEventEnd ?? null }));
    let inp = null, touched = 0;
    if (withInp) {
      touched = await touch(page, page0);
      await page.waitForTimeout(300);
      const presses = await page.evaluate(() => Object.values(window.__pcPerformance.presses)).catch(() => []);
      // With so few interactions INP is the slowest of them. Under 16 ms the browser does not record; then 16 is the upper bound.
      if (touched) inp = presses.length ? Math.round(Math.max(...presses)) : 16;
    }
    return { lcpMs: m.lcp === null ? null : Math.round(m.lcp), cls: Math.round(m.cls * 1000) / 1000, domReadyMs: m.dcl === null ? null : Math.round(m.dcl), ...weight, inpMs: inp, interactions: touched };
  } catch (e) {
    return { error: short(e) };
  } finally { await ctx.close(); }
}

// Speed on a simulated phone. Three runs and their median, so a single outlier does not decide the number.
async function performanceOf(browser, page0) {
  const runs = [];
  for (let n = 0; n < (QUICK ? 1 : 3); n++) runs.push(await onePerformanceRun(browser, page0, !QUICK));
  const good = runs.filter((k) => !k.error);
  if (!good.length) return { error: runs[0].error };
  const m = (k) => median(good.map((x) => x[k]));
  return {
    lcpMs: m("lcpMs"), cls: m("cls"), domReadyMs: m("domReadyMs"), requests: m("requests"), kB: m("kB"), inpMs: m("inpMs"), interactions: m("interactions"),
    runs: good.length, allLcpMs: good.map((x) => x.lcpMs), allInpMs: good.map((x) => x.inpMs),
    conditions: "phone, 4x slower processor, slow 4G",
  };
}

// What does the user meet at an address that does not exist?
async function notFoundPage(ctx) {
  const page = await ctx.newPage();
  try {
    const answer = await page.goto(address(`/pc-does-not-exist-${Date.now().toString(36)}`), { waitUntil: "domcontentloaded", timeout: 20000 });
    await settle(page);
    const d = await page.evaluate((home) => {
      const links = [...document.querySelectorAll("a[href]")].filter((a) => a.getBoundingClientRect().width > 0);
      return {
        title: document.title, h1: [...document.querySelectorAll("h1")].map((h) => h.innerText.trim().slice(0, 80)),
        text: document.body.innerText.trim().replace(/\s+/g, " ").slice(0, 200),
        linkHome: links.some((a) => a.href === home || a.href === home.replace(/\/$/, "")), links: links.length,
        styled: document.styleSheets.length > 0, main: document.querySelectorAll("main, [role=main]").length > 0,
      };
    }, new URL("/", plan.base).href);
    await page.screenshot({ path: join(out, "notfound-desk.png"), fullPage: true });
    return { status: answer ? answer.status() : null, ...d, image: "notfound-desk.png" };
  } catch (e) { return { notSeen: short(e) }; } finally { await page.close(); }
}

// Optional: if Impeccable is on the machine (IMPECCABLE_BIN or "impeccable" on PATH), its detector runs on pages without steps.
// Only the rule's name, category and the snippet found are kept, counted per rule.
function impeccable(url) {
  const bin = process.env.IMPECCABLE_BIN || "impeccable";
  const k = spawnSync(bin, ["detect", "--json", "--no-config", url], { encoding: "utf8", timeout: 90000 });
  if (k.error || k.status === 1 || k.status === null) return null;
  try {
    const found = new Map();
    for (const f of JSON.parse(k.stdout)) {
      const x = found.get(f.antipattern) || { rule: f.antipattern, category: f.category, count: 0, snippets: [] };
      x.count++;
      if (x.snippets.length < 3 && f.snippet) x.snippets.push(String(f.snippet).slice(0, 120));
      found.set(f.antipattern, x);
    }
    return [...found.values()];
  } catch { return null; }
}

async function measurePage(browser, ctx, page0) {
  const page = await ctx.newPage();
  const console0 = [], failed = [];
  // The page's own response (e.g. 400 for an error state or 410 for an expired link) is a state, not an error.
  let lastStatus = null;
  const isThePage = (q) => q.isNavigationRequest() && q.frame() === page.mainFrame();
  // "Failed to load resource" in the console is a failed request and is counted under failedRequests, not again here.
  page.on("console", (m) => { if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) console0.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => console0.push(String(e.message).slice(0, 200)));
  page.on("response", (r) => {
    if (isThePage(r.request())) lastStatus = r.status();
    else if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 120)}`);
  });
  page.on("requestfailed", (r) => failed.push(`failed ${r.url().slice(0, 120)}`));

  const r = { name: page0.name, path: page0.path, steps: (page0.steps || []).length, ignored: [], images: {} };
  const s = measureIn(page);

  // What the plan says to ignore is taken out of the lists and noted with the reason, so it can be seen in the report.
  const ign = (plan.ignore || []).filter((i) => !i.page || i.page === "*" || i.page === page0.name);
  const textOf = (x) => (typeof x === "string" ? x : x.element || x.example || x.rule || JSON.stringify(x));
  const keep = (metric, list) => {
    const rules = ign.filter((i) => i.metric === metric);
    if (!rules.length || !Array.isArray(list)) return list;
    return list.filter((x) => {
      const rule = rules.find((i) => !i.element || textOf(x).includes(i.element));
      if (rule) { r.ignored.push({ metric, what: textOf(x), why: rule.why }); matched.add(rule); }
      return !rule;
    });
  };

  await page.goto(address(page0.path), { waitUntil: "domcontentloaded", timeout: 30000 });
  await settle(page);
  const run = await runSteps(page, page0.steps);
  r.status = lastStatus;
  r.finalUrl = page.url();

  // Form errors: measured straight away, before anything else moves focus.
  const isError = page0.errorState === true || (page0.errorState !== false && run.submitted && r.status >= 400 && r.status < 500 && r.status !== 429);
  r.form = isError ? await s("form", run.filled, run.titleBefore) : null;

  // What moved on load, and what is waiting to be scrolled into view? Then the page is scrolled through.
  await page.waitForTimeout(500);
  const onLoad = await s("recorded");
  const entrances = await s("entrances");
  await s("record", 8000);
  await scrollThrough(page);
  const onScroll = await s("recorded");

  r.structure = await s("structure");
  r.fields = await s("fields");
  r.contrast = await s("contrast");
  r.contrast.errors = keep("contrastErrors", r.contrast.errors);
  r.typography = await s("typography");
  r.motion = await s("motion");
  r.motion.onLoad = onLoad;
  r.motion.onScroll = onScroll;
  r.motion.entrances = entrances;
  r.overflow = { 1440: await s("overflow") };
  r.clipped = { 1440: await s("clipped") };
  r.alignment = { 1440: await s("alignment") };
  r.system = await s("system");
  r.aiLook = await s("aiLook", entrances);
  r.aiLook.clear = r.aiLook.clear.filter((f) => {
    const rule = ign.find((i) => i.metric === `aiLook:${f.rule}` || i.metric === "aiLook");
    if (rule) { r.ignored.push({ metric: `aiLook:${f.rule}`, what: f.text, why: rule.why }); matched.add(rule); }
    return !rule;
  });
  await page.screenshot({ path: join(out, `${page0.name}-desk.png`), fullPage: true });
  r.images.desk = `${page0.name}-desk.png`;

  // A copy of the page as it stands now. Used for stress tests and previews of fixes.
  let copy = null;
  try {
    copy = await s("copy", await sheetTexts(page, await s("sheetsWithLoss")));
    writeFileSync(join(out, `${page0.name}.copy.html`), copy);
    r.copy = `${page0.name}.copy.html`;
  } catch (e) { r.copy = null; }

  try {
    await page.addScriptTag({ path: AXE });
    // preload: false: otherwise axe fetches the page's stylesheets once more. If a stylesheet lives on another origin without CORS headers,
    // that gives a console error and a failed request the page did not make itself. The findings are the same without.
    const a = await page.evaluate(() => window.axe.run(document, { preload: false, runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] }));
    r.axe = { errors: keep("axeErrors", a.violations.map((v) => ({ id: v.id, element: v.id, impact: v.impact, help: v.help, count: v.nodes.length, first: v.nodes[0]?.target?.join(" ") }))), incomplete: a.incomplete.map((v) => v.id) };
  } catch (e) { r.axe = { notRun: short(e) }; }

  await page.setViewportSize(MOBILE);
  await page.waitForTimeout(300);
  r.overflow[390] = await s("overflow");
  r.clipped[390] = await s("clipped");
  r.alignment[390] = await s("alignment");
  r.targets = keep("targetsUnder44", await s("targets"));
  r.fieldsMobile = keep("fieldsUnder16px", (await s("fields")).filter((f) => f.fontSize < 16).map((f) => `${f.element}: ${f.fontSize} px`));
  r.typography.textUnder12pxMobile = (await s("typography")).textUnder12px;
  await page.screenshot({ path: join(out, `${page0.name}-mobile.png`), fullPage: true });
  r.images.mobile = `${page0.name}-mobile.png`;
  await page.setViewportSize(NARROW);
  await page.waitForTimeout(300);
  r.overflow[320] = await s("overflow");
  r.clipped[320] = await s("clipped");

  await page.setViewportSize(DESK);
  await page.waitForTimeout(300);
  const clickables = await s("mark");
  r.keyboard = await keyboard(page, clickables.length);
  const reached = new Set(r.keyboard.reached), [from, to] = r.keyboard.span;
  // If the walk was cut short, what lies after the last stop has not been tested. That is not the same as it being unreachable.
  const untested = (i) => r.keyboard.interrupted && (from === null || (to < from ? i > to && i < from : i > to || i < from));
  // In a group with arrow keys (radio buttons with the same name, tabs, a menu) Tab stops only once. Once the group is reached, the rest of it
  // does not count as unreached. The arrow keys are not tried here (they can change the page's state), so those members are listed separately.
  const reachedGroups = new Set(clickables.filter((k) => k.group !== null && reached.has(k.i)).map((k) => k.group));
  const withoutTab = clickables.filter((k) => !reached.has(k.i) && !untested(k.i));
  // A link Tab passes over is not a finding when Tab reaches another link to the same place: the copies in a ticker,
  // the image next to a heading. They are listed separately, so it can be seen what was discounted.
  const reachedTargets = new Set(clickables.filter((k) => k.target && reached.has(k.i)).map((k) => k.target));
  const hasTwin = (k) => !!k.target && reachedTargets.has(k.target);
  r.keyboard.notReached = keep("notReachedByKeyboard", withoutTab.filter((k) => !reachedGroups.has(k.group) && !hasTwin(k)).map((k) => k.element));
  r.keyboard.sameTargetReached = withoutTab.filter((k) => !reachedGroups.has(k.group) && hasTwin(k)).map((k) => k.element);
  r.keyboard.expectedWithArrowKeys = withoutTab.filter((k) => reachedGroups.has(k.group)).map((k) => k.element);
  r.keyboard.notTried = clickables.filter((k) => !reached.has(k.i) && untested(k.i)).length;
  r.keyboard.invisibleFocus = keep("invisibleFocus", r.keyboard.invisibleFocus);
  // The same goes for the four other focus findings. A ticker that stops when a link in it gets focus cannot be seen by the measurement; the plan can take it out.
  r.keyboard.obscured = keep("focusObscured", r.keyboard.obscured);
  r.keyboard.offscreen = keep("focusOffscreen", r.keyboard.offscreen);
  r.keyboard.jumpsBack = keep("focusJumpsBack", r.keyboard.jumpsBack);
  r.keyboard.trapped = keep("focusTrapped", r.keyboard.trapped);
  delete r.keyboard.reached;
  delete r.keyboard.span;
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo({ top: 0, left: 0, behavior: "instant" }); });
  await s("mark");
  r.mouse = await mouse(page, clickables);
  r.mouse.noHover = keep("noHover", r.mouse.noHover);
  r.mouse.noPressed = keep("noPressed", r.mouse.noPressed);

  // Reduce motion. First the transitions from the mouse settle, so only what runs by itself is counted.
  // Only what moves or scales something is a violation; a short fade or a colour change may stay.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(700);
  const before = await s("running");
  r.motion.offscreen = await s("offscreen");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(300);
  const atRest = await s("running");
  const hover = await hoverUnderReduced(page, clickables, r.motion.hoverTargets);
  const onHover = hover.found;
  let onReload = null;
  if (!QUICK) {
    try {
      if ((page0.steps || []).length === 0) {
        await page.reload({ waitUntil: "load", timeout: 30000 });
        await page.waitForTimeout(900);
        onReload = await s("recorded");
        await s("record", 8000);
        await scrollThrough(page);
        onReload.push(...(await s("recorded")));
      } else if (copy) {
        const k = await openCopy(ctx, copy, r.finalUrl, { reduced: true });
        await k.waitForTimeout(600);
        onReload = await measureIn(k)("recorded");
        await k.close();
      }
    } catch { onReload = null; }
  }
  const unique = (l) => [...new Map(l.map((a) => [`${a.name}|${a.element}`, a])).values()];
  // An animation that is over within one frame (0.01 ms and one iteration) moves nothing anyone can see. It is listed separately and does not count.
  const all = unique([...atRest, ...onHover, ...(onReload || [])]), seen = all.filter((a) => !a.instant);
  const still = keep("motionDespiteReduced", seen.filter((a) => a.moves));
  r.reducedMotion = {
    runningNormally: before.length, runningReduced: still.length, stillRunning: still.slice(0, 12),
    onlyFadeOrColour: seen.filter((a) => !a.moves).map((a) => `${a.name} on ${a.element}`).slice(0, 12),
    withinOneFrame: all.filter((a) => a.instant).map((a) => `${a.name} on ${a.element}`).slice(0, 12),
    tried: { rest: true, hover: hover.tried, load: onReload !== null },
  };

  await page.emulateMedia({ reducedMotion: null, colorScheme: "dark" });
  if (r.motion.darkModeRules > 0) {
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(out, `${page0.name}-dark.png`), fullPage: true });
    r.images.dark = `${page0.name}-dark.png`;
    r.dark = { exists: true, contrast: await s("contrast") };
  } else r.dark = { exists: false };

  r.consoleErrors = keep("consoleErrors", [...new Set(console0)]);
  r.failedRequests = keep("failedRequests", [...new Set(failed)]);
  await page.close();

  r.stress = !QUICK && copy ? await stress(ctx, copy, r.finalUrl, page0.name) : null;
  r.doubleSubmit = !QUICK && (page0.steps || []).some((t) => t.submit) ? await doubleSubmit(ctx, page0) : null;
  r.performance = page0.performance === false ? { skipped: true } : await performanceOf(browser, page0);

  // The numbers compare.mjs puts side by side before and after. Lower is better for all of them (apart from the neutral counts).
  const sum = (l, k = "count") => l.reduce((n, x) => n + (x[k] || 0), 0);
  const unique2 = (...lists) => new Set(lists.flat().map((x) => x.element)).size;
  const alignmentCount = (f) => f.cardsUnevenHeight.length + f.fieldAndButtonUneven.length + f.nearlyAligned.length + f.innerRadiusTooLarge.length;
  const stressBreaks = (x) => (!x || x.notTried ? 0 : (x.hScroll ? 1 : 0) + x.newClipped);
  r.clipped[1440] = keep("clippedText", r.clipped[1440]);
  r.clipped[390] = keep("clippedText", r.clipped[390]);
  r.clipped[320] = keep("clippedText", r.clipped[320]);
  r.metrics = {
    consoleErrors: r.consoleErrors.length, failedRequests: r.failedRequests.length, brokenImages: keep("brokenImages", r.structure.brokenImages).length,
    hScroll320: r.overflow[320].hScroll ? 1 : 0, hScroll390: r.overflow[390].hScroll ? 1 : 0,
    clippedText: unique2(r.clipped[1440], r.clipped[390], r.clipped[320]),
    targetsUnder44: r.targets.length, targetFails: r.targets.filter((f) => f.under24 || f.control).length, fieldsUnder16px: r.fieldsMobile.length,
    fieldsWithoutLabel: keep("fieldsWithoutLabel", r.fields.filter((f) => !f.label)).length,
    contrastErrors: sum(r.contrast.errors), axeErrors: r.axe.errors ? sum(r.axe.errors) : null, zoomDisabled: r.structure.zoomDisabled ? 1 : 0,
    textUnder12px: Math.max(sum(keep("textUnder12px", r.typography.textUnder12px)), sum(keep("textUnder12px", r.typography.textUnder12pxMobile))),
    tightLineHeight: keep("tightLineHeight", r.typography.tightLineHeight).length,
    invisibleFocus: r.keyboard.invisibleFocus.length, notReachedByKeyboard: r.keyboard.notReached.length,
    focusObscured: r.keyboard.obscured.length, focusOffscreen: r.keyboard.offscreen.length, focusJumpsBack: r.keyboard.jumpsBack.length, focusTrapped: r.keyboard.trapped.length,
    formGaps: r.form ? Object.values(r.form.gaps).filter(Boolean).length : null,
    doubleSubmits: r.doubleSubmit && r.doubleSubmit.submits ? Math.max(0, r.doubleSubmit.submits - 1) : null,
    noHover: r.mouse.noHover.length, noPressed: r.mouse.noPressed.length,
    hoverWithoutMedia: keep("hoverWithoutMedia", r.motion.hoverWithoutMedia).length,
    transitionAll: r.motion.transitionAll.length, animatesLayout: r.motion.layoutProperties.length + r.motion.keyframesWithLayout.length,
    over300ms: r.motion.overThreeHundred.length, motionDespiteReduced: r.reducedMotion.runningReduced,
    offscreenAnimations: keep("offscreenAnimations", r.motion.offscreen).length,
    imagesWithoutSize: keep("imagesWithoutSize", r.structure.imagesWithoutSize).length,
    misaligned: Math.max(alignmentCount(r.alignment[1440]), alignmentCount(r.alignment[390])),
    aiLook: r.aiLook.clear.length,
    stressBreaks: r.stress ? stressBreaks(r.stress.german) + stressBreaks(r.stress.longWord) : null,
    h1Count: r.structure.h1.length, fontSizes: r.typography.fontSizes.length, spacings: r.system.spacings.distinct,
    lcpMs: r.performance.lcpMs ?? null, cls: r.performance.cls ?? null, inpMs: r.performance.inpMs ?? null, kB: r.performance.kB ?? null,
  };
  // A whole metric can also be ignored (without "element"): the number is set to 0 and noted with the reason.
  for (const i of ign.filter((x) => !x.element && typeof r.metrics[x.metric] === "number" && r.metrics[x.metric] > 0)) {
    r.ignored.push({ metric: i.metric, what: `the whole metric (${r.metrics[i.metric]})`, why: i.why });
    r.metrics[i.metric] = 0;
    matched.add(i);
  }

  // Layer 2: 5 minus one point for every group that does not pass (see templates/checklist.md). At least 1.
  // Only metrics with a published threshold can fail a group; the rest of the numbers are evidence for the review in layers 1 and 3.
  const groups = Object.fromEntries(Object.entries(GROUP_METRICS).map(([g, metrics]) => [g, !metrics.some((k) => fails(r.metrics, k))]));
  const failedGroups = Object.keys(groups).filter((g) => !groups[g]);
  r.layer2 = { score: Math.max(1, 5 - failedGroups.length), failed: failedGroups, groups };
  return r;
}

const browser = await chromium.launch(browserChoice(plan)).catch((e) => reject(`${NO_BROWSER}\n(${short(e)})`, 1));
const ctx = await browser.newContext({ viewport: DESK, bypassCSP: true, locale: plan.locale || "en-US" });
await ctx.addInitScript(IN_PAGE);
if (plan.login) {
  const p = await ctx.newPage();
  // Without login every page behind it is a different page from the one the plan asked for. Better no measurement than a wrong one.
  try { await runSteps(p, plan.login); } catch (e) {
    await browser.close().catch(() => {});
    reject(`The login steps in the plan failed: ${short(e)}\nNo pages were measured.`, 1);
  }
  await p.close();
}

const pages = [];
for (const page0 of plan.pages) {
  process.stdout.write(`${page0.name} … `);
  try {
    const r = await measurePage(browser, ctx, page0);
    pages.push(r);
    if (r.status === 429) console.log("NOTE: the page answered 429 (too many requests). The state is not the one the plan asked for. Wait, and run again.");
    const t = r.metrics;
    console.log(`ok (${r.status}) layer 2: ${r.layer2.score}/5${r.layer2.failed.length ? ` (fails: ${r.layer2.failed.join(", ")})` : ""} · contrast ${t.contrastErrors}, axe ${t.axeErrors}, focus ${t.invisibleFocus}, AI look ${t.aiLook}, LCP ${t.lcpMs} ms, INP ${t.inpMs} ms${r.ignored.length ? ` · ignored: ${r.ignored.length}` : ""}`);
  } catch (e) {
    pages.push({ name: page0.name, path: page0.path, notSeen: short(e) });
    console.log(`NOT SEEN: ${short(e)}`);
  }
}
const notFound = QUICK || plan.notFoundPage === false ? null : await notFoundPage(ctx);
await browser.close();

if (!QUICK && plan.impeccable !== false) {
  for (const r of pages.filter((x) => !x.notSeen && x.steps === 0)) {
    const found = impeccable(address(r.path));
    if (found) r.impeccable = found;
  }
}

const unused = (plan.ignore || []).filter((i) => !matched.has(i));
if (unused.length) console.log(`\nNOTE: ${unused.length} ${unused.length === 1 ? "entry" : "entries"} in "ignore" matched nothing in this run. Fix them, or remove them:\n${unused.map((i) => `  ${i.metric}${i.element ? ` · ${i.element}` : ""}${i.page ? ` · page: ${i.page}` : ""}`).join("\n")}`);

const file = join(out, "measurement.json");
if (existsSync(file)) renameSync(file, join(out, "measurement-previous.json"));
writeFileSync(file, JSON.stringify({ base: plan.base, measured: new Date().toISOString(), mode: QUICK ? "quick" : "full", pages, notFoundPage: notFound, ignoreUnused: unused }, null, 2));
console.log(`\nWritten: ${resolve(file)}`);

// Tall screenshots are cut into slices, so they can be seen in one piece (slices.mjs). If that fails, the measurement is just as good.
// The time limit is a guard: if the cutting stalls, the measurement must not stall with it.
const cut = spawnSync(process.execPath, [join(here, "slices.mjs"), "--out", out], { encoding: "utf8", timeout: 300000 });
const sliced = (cut.stdout || "").trim().split("\n").filter((l) => l && !l.startsWith("No images"));
if (sliced.length) console.log(sliced.join("\n"));
if (cut.error) console.log(`The slices were not finished (${cut.error.code || cut.error.message}). Run them again: node scripts/slices.mjs --out ${out}`);
