#!/usr/bin/env node
// The blind customer: a browser steered with words, one command at a time.
// An agent that knows neither the code nor the measurements gets a task and only what a user sees.
//
//   node scripts/browse.mjs start <address> --out <folder> --task "<what the customer wants>" [--mobile] [--max 30]
//   node scripts/browse.mjs look       --out <folder>
//   node scripts/browse.mjs click <nr> --out <folder> [--because "<why>"]
//   node scripts/browse.mjs type <nr> "<text>" --out <folder> [--because "…"]   (on a select: the option to choose)
//   node scripts/browse.mjs press <key> --out <folder> [--because "…"]          (Enter, Tab, Escape, arrow keys …)
//   node scripts/browse.mjs scroll [down|up] --out <folder> [--because "…"]
//   node scripts/browse.mjs back       --out <folder> [--because "…"]
//   node scripts/browse.mjs goto <path> --out <folder> [--because "…"]          (only addresses on the same site)
//   node scripts/browse.mjs finish --out <folder> --result <CODE> --conclusion "<one sentence>" [--stumbled "<where>" …]
//   node scripts/browse.mjs stop --out <folder>                                 (abort without a result)
//
// start opens a browser that stays open between the commands, and shows the screen as text:
// what the eye can see, with every button, link and field as a numbered bracket, e.g. [4 field: Your email · empty].
// Every action answers with what happened and saves a picture of the screen (step-NN.png).
// finish writes customer-log.json: the task, the result and every step (step, saw, thought). It can be put in as "customer" in review.json.
// "step" and "saw" are written by the tool itself from what happened in the browser. Only "thought" (--because) is the customer's own words.
//
// Result: COMPLETED, COMPLETED_WITH_DIFFICULTY, ABANDONED or BLOCKED.
// One customer per folder. Several customers can run at the same time, each in its own folder.
// Links off the site are not followed. Strings that look like keys or login links are written as "…" in answers and the log.
// Never use production: the customer fills in and sends real forms.

import { spawn } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { createServer, request } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NO_BROWSER, browserChoice, readIf, write } from "./common.mjs";

const THIS = fileURLToPath(import.meta.url);
const RESULTS = ["COMPLETED", "COMPLETED_WITH_DIFFICULTY", "ABANDONED", "BLOCKED"];
const KEYS = ["Enter", "Tab", "Shift+Tab", "Escape", "Space", "Backspace", "Delete", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"];
const COMMANDS = ["start", "look", "click", "type", "press", "scroll", "back", "goto", "finish", "stop"];
const MOBILE = { width: 390, height: 844 }, DESK = { width: 1440, height: 900 };
const MAX = 30;
const IDLE_MS = 20 * 60 * 1000;

const USAGE = `Usage:
  node scripts/browse.mjs start <address> --out <folder> --task "<what the customer wants>" [--mobile] [--max ${MAX}]
  node scripts/browse.mjs look --out <folder>
  node scripts/browse.mjs click <nr> --out <folder> [--because "<why>"]
  node scripts/browse.mjs type <nr> "<text>" --out <folder> [--because "<why>"]
  node scripts/browse.mjs press <${KEYS.slice(0, 4).join("|")}|…> --out <folder> [--because "<why>"]
  node scripts/browse.mjs scroll [down|up] --out <folder>
  node scripts/browse.mjs back --out <folder>
  node scripts/browse.mjs goto <path> --out <folder>
  node scripts/browse.mjs finish --out <folder> --result <${RESULTS.join("|")}> --conclusion "<one sentence>" [--stumbled "<where>" …]
  node scripts/browse.mjs stop --out <folder>`;

// An option with a value always takes the next word, also when it begins with "--". --stumbled can be repeated and becomes a list.
function parse(argv) {
  const words = [], options = { stumbled: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--") || a === "--") { words.push(a); continue; }
    const name = a.slice(2);
    if (name === "mobile") options.mobile = true;
    else if (i + 1 >= argv.length) options[name] = "";
    else if (name === "stumbled") options.stumbled.push(argv[++i]);
    else options[name] = argv[++i];
  }
  return { words, options };
}

const { words, options } = parse(process.argv.slice(2));
if (words[0] === "__server") await server(resolve(words[1]));
else await client();

// ---------- the client: sends one command to the browser that is open ----------

function send(state, message, waitMs = 120000) {
  return new Promise((ok, fail) => {
    const body = JSON.stringify({ key: state.key, ...message });
    const q = request({ host: "127.0.0.1", port: state.port, method: "POST", path: "/", timeout: waitMs,
      headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } }, (s) => {
      let text = "";
      s.setEncoding("utf8");
      s.on("data", (d) => { text += d; });
      s.on("end", () => ok({ ok: s.statusCode === 200, text }));
    });
    q.on("timeout", () => q.destroy(new Error("no answer in time")));
    q.on("error", fail);
    q.end(body);
  });
}

async function client() {
  const stop = (text, code = 2) => { console.error(text); process.exit(code); };
  const show = (answer) => { (answer.ok ? console.log : console.error)(answer.text); process.exit(answer.ok ? 0 : 1); };
  const cmd = words[0];
  if (!COMMANDS.includes(cmd)) stop(USAGE);
  if (!options.out) stop(`--out <folder> is missing.\n\n${USAGE}`);
  const out = resolve(options.out);
  const file = join(out, "browse.json");

  if (cmd === "start") {
    if (!words[1]) stop(`The address is missing.\n\n${USAGE}`);
    let address = null;
    try { address = new URL(words[1]); } catch { /* reported below */ }
    if (!address || !/^https?:$/.test(address.protocol)) stop(`"${words[1]}" is not a full address. Write it with http:// or https:// in front.`);
    if (!options.task) stop('--task "<what the customer wants>" is missing. Write it as a goal, not as a path through the site.');
    const max = options.max === undefined ? MAX : Number(options.max);
    if (!Number.isInteger(max) || max < 1 || max > 200) stop("--max must be a whole number from 1 to 200.");

    mkdirSync(out, { recursive: true });
    const old = readIf(file);
    if (old) {
      const alive = await send(old, { command: "ping" }, 3000).then((s) => s.ok, () => false);
      if (alive) stop(`A customer is already running in ${out}. End it with finish or stop, or use another folder.`, 1);
      rmSync(file, { force: true });
    }
    for (const f of readdirSync(out)) if (/^step-\d+\.png$/.test(f) || f === "customer-log.json" || f === "browse-errors.log") rmSync(join(out, f), { force: true });

    // The browser has to live on when this command is done. So a detached process that writes its errors to a file.
    const logFile = join(out, "browse-errors.log");
    const log = openSync(logFile, "a");
    const child = spawn(process.execPath, [THIS, "__server", out], { detached: true, stdio: ["ignore", log, log], windowsHide: true });
    closeSync(log);
    let dead = false;
    child.on("exit", () => { dead = true; });
    child.unref();
    const deadline = Date.now() + 20000;
    while (!existsSync(file) && !dead && Date.now() < deadline) await new Promise((r) => setTimeout(r, 60));
    if (!existsSync(file)) {
      const tail = existsSync(logFile) ? readFileSync(logFile, "utf8").trim().split("\n").slice(-12).join("\n") : "";
      stop(`The browser did not start.${tail ? `\n${tail}` : ""}`, 1);
    }
    show(await send(readIf(file), { command: "open", address: address.href, task: options.task, mobile: !!options.mobile, max })
      .catch((e) => ({ ok: false, text: `The browser did not answer: ${e.message}` })));
  }

  const state = readIf(file);
  if (!state) stop(`No customer is running in ${out}. Begin with start.`, 1);
  const message = { command: cmd, because: options.because || "" };
  if (cmd === "click" || cmd === "type") {
    message.nr = Number(words[1]);
    if (!Number.isInteger(message.nr) || message.nr < 1) stop(`The number is missing. Use the number in the bracket, e.g.: ${cmd} 4${cmd === "type" ? ' "text"' : ""}`);
    if (cmd === "type") {
      if (words.length < 3) stop('The text is missing. Use: type <nr> "<text>"');
      message.text = words.slice(2).join(" ");
    }
  }
  if (cmd === "press") {
    message.keyName = KEYS.find((t) => t.toLowerCase() === String(words[1] || "").toLowerCase());
    if (!message.keyName) stop(`Unknown key. Use one of: ${KEYS.join(", ")}.`);
  }
  if (cmd === "scroll") {
    message.direction = words[1] || "down";
    if (!["down", "up"].includes(message.direction)) stop("Use: scroll down or scroll up.");
  }
  if (cmd === "goto") {
    if (!words[1]) stop("The path is missing. Use: goto /path");
    message.path = words[1];
  }
  if (cmd === "finish") {
    if (!RESULTS.includes(options.result)) stop(`--result must be one of: ${RESULTS.join(", ")}.`, 1);
    if (!options.conclusion) stop('--conclusion "<one sentence>" is missing.', 1);
    Object.assign(message, { result: options.result, conclusion: options.conclusion, stumbled: options.stumbled.filter(Boolean) });
  }
  show(await send(state, message).catch((e) => {
    // If the browser no longer answers, there is no customer to continue with.
    if (e.code === "ECONNREFUSED") rmSync(file, { force: true });
    return { ok: false, text: `The browser does not answer (${e.message}). Start over with start.` };
  }));
}

// ---------- the server: keeps the browser open and runs the commands one at a time ----------

async function server(out) {
  const { chromium } = await import("playwright-core");
  const IN_PAGE = readFileSync(join(dirname(THIS), "in-page.js"), "utf8");
  const file = join(out, "browse.json"), logFile = join(out, "browse-errors.log"), logPath = join(out, "customer-log.json");
  const key = randomBytes(24).toString("hex");
  process.on("unhandledRejection", (e) => console.error(e));

  // What the customer sees and logs must not carry keys along: long values in addresses and long strings become "…".
  const scrub = (t) => String(t ?? "").replace(/([?&#][\w.-]*=)([^&#\s"'<>]{16,})/g, "$1…").replace(/\b[A-Za-z0-9_-]{32,}\b/g, "…");
  const cut = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
  const brief = (t, n = 140) => cut(scrub(t).replace(/\s+/g, " ").trim(), n);
  class Refused extends Error {}
  const refuse = (text) => { throw new Refused(text); };
  // Playwright's errors translated into what a user would have experienced.
  const why = (e) => {
    const m = String(e && e.message ? e.message : e);
    if (/intercepts pointer events/.test(m)) return "Something else lies on top and takes the press.";
    if (/not visible/.test(m)) return "It cannot be seen on the screen.";
    if (/not enabled/.test(m)) return "It is disabled.";
    if (/not editable|cannot be filled/.test(m)) return "It cannot be typed in.";
    if (/Malformed value/.test(m)) return "The field does not accept that text. Try another format, e.g. 2026-10-01 for a date.";
    if (/not attached/.test(m)) return "It is no longer on the page.";
    if (/Timeout \d+ms exceeded/.test(m)) return "Nothing happened within five seconds.";
    return brief(m.split("\n")[0], 200);
  };

  let browser = null, ctx = null, page = null, home = null, mobile = false, last = null, stopNow = false;
  const tabs = [], known = new WeakSet();      // the tab the customer is on lies last
  const log = { task: "", result: null, conclusion: "", steps: [], stumbled: [] };
  const extra = { start: "", screen: "", started: new Date().toISOString(), finished: null, max: MAX, actions: 0, withoutReason: 0 };
  let events = [];                              // what happened beside the action: dialogs, links off the site, 429
  let away = [];                                // addresses elsewhere that a press would have opened
  const net = new Map();                        // requests on their way, with the time they began
  let netTime = 0;

  const pathOf = (address) => { try { const u = new URL(address); return scrub(u.pathname + u.search + u.hash); } catch { return scrub(address); } };
  const offSite = (address) => { try { const u = new URL(address); return /^https?:$/.test(u.protocol) && u.origin !== home; } catch { return false; } };
  const onSite = (address) => { try { return new URL(address).origin === home; } catch { return false; } };
  const hostOf = (address) => { try { return new URL(address).host; } catch { return scrub(address); } };
  const topLevel = (q) => { try { return q.frame().parentFrame() === null; } catch { return true; } };
  const pageChange = (q) => { try { return q.isNavigationRequest() && topLevel(q); } catch { return false; } };

  // Waits until the page has settled: no request on its way for 350 ms. At most five seconds, but a new page gets twenty to answer.
  async function settle(most = 5000) {
    await new Promise((r) => setTimeout(r, 400));
    const begun = Date.now();
    for (;;) {
      const gone = Date.now() - begun;
      if (!net.size && Date.now() - netTime >= 350) return;
      if (gone >= most && !(gone < 20000 && [...net.keys()].some(pageChange))) return;
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  function newTab(s) {
    if (known.has(s)) return;
    known.add(s);
    tabs.push(s);
    s.setDefaultTimeout(8000);
    s.setDefaultNavigationTimeout(25000);
    s.on("close", () => { const i = tabs.indexOf(s); if (i > -1) tabs.splice(i, 1); });
    s.on("dialog", (d) => {
      const asks = d.type() === "prompt";
      events.push(`The page showed a dialog: “${brief(d.message(), 200)}”. ${asks ? "It was closed without an answer." : "OK was pressed."}`);
      (asks ? d.dismiss() : d.accept()).catch(() => {});
    });
    s.on("download", (d) => {
      events.push(`The page wanted to download a file (“${brief(d.suggestedFilename(), 80)}”). It was not saved.`);
      d.cancel().catch(() => {});
    });
    s.on("filechooser", () => events.push("The page asked to choose a file. The customer cannot do that here."));
    s.on("response", (r) => {
      const text = "The page answered 429: too many attempts. Stop here, and finish with the result BLOCKED.";
      if (r.status() === 429 && !events.includes(text)) events.push(text);
    });
  }

  async function open({ address, task, mobile: m, max }) {
    if (browser) refuse("The customer is already under way.");
    mobile = m;
    home = new URL(address).origin;
    log.task = task;
    Object.assign(extra, { start: scrub(address), screen: mobile ? `phone ${MOBILE.width} × ${MOBILE.height}` : `computer ${DESK.width} × ${DESK.height}`, max });
    browser = await chromium.launch(browserChoice()).catch((e) => refuse(`${NO_BROWSER}\n(${why(e)})`));
    ctx = await browser.newContext(mobile
      ? { viewport: MOBILE, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: DESK });
    await ctx.addInitScript(IN_PAGE);
    // Links off the site are not followed: a page change to another host gets the answer 204 (no content) before anything is requested.
    // Then the browser stays on the page the customer was on, with everything typed into it.
    await ctx.route("**/*", (r) => {
      const q = r.request();
      if (last && pageChange(q) && offSite(q.url())) { away.push(q.url()); return r.fulfill({ status: 204, body: "" }).catch(() => {}); }
      return r.continue().catch(() => {});
    });
    ctx.on("request", (q) => { if (!["eventsource", "websocket", "media", "ping"].includes(q.resourceType())) { net.set(q, Date.now()); netTime = Date.now(); } });
    const done = (q) => { net.delete(q); netTime = Date.now(); };
    ctx.on("requestfinished", done);
    ctx.on("requestfailed", done);
    // A new tab on the same site becomes the one the customer is on. back closes it again.
    ctx.on("page", newTab);
    page = await ctx.newPage();
    newTab(page);
    await page.goto(address, { waitUntil: "domcontentloaded" }).catch((e) => refuse(`The page could not be opened: ${why(e)}`));
    await settle();
    // If the start address sends on by itself (from http to https or to www), that is where the customer belongs.
    home = new URL(page.url()).origin;
    const now = await read();
    const step = `Opened ${pathOf(address)} on a ${mobile ? `phone (${MOBILE.width} × ${MOBILE.height})` : `computer (${DESK.width} × ${DESK.height})`}`;
    const happened = drain();
    const image = await remember(step, `The page “${brief(now.title, 80)}”${firstHeading(now)}.${happened}`, "");
    return [`The task: ${task}`, `You have ${max} actions. look does not count.`, ...(happened ? [happened.trim()] : []), "", show(now), "", `Image: ${image}`,
      "", `Commands: look · click <nr> · type <nr> "<text>" · press <key> · scroll down|up · back · finish. All with --out <folder>; say why with --because "<one sentence>".`].join("\n");
  }

  // ---------- the screen as text ----------

  async function read() {
    page = tabs[tabs.length - 1] || page;
    for (let i = 0; ; i++) {
      try { last = await page.evaluate(() => (window.__pc ? window.__pc.screen() : null)); break; }
      catch (e) {
        // The page was on its way somewhere else. Wait, and try again.
        if (i === 2) throw e;
        await page.waitForLoadState("domcontentloaded").catch(() => {});
        await settle(1500);
      }
    }
    // The browser's own error page (no connection, the page no longer exists) cannot be read as a page.
    if (!last) {
      const text = "(The browser shows its own error page: the page could not be fetched.)", s = mobile ? MOBILE : DESK;
      last = { title: "", url: page.url(), width: s.width, height: s.height, scrolled: 0, scrollable: 0, sideways: 0, focus: null,
        lines: [{ text, plain: text, where: "on", heading: false, brackets: [] }], controls: [] };
    }
    return last;
  }

  const lineBelow = (l) => (l.heading || !l.brackets.length ? cut(scrub(l.text), 160)
    : l.brackets.slice(0, 6).map(scrub).join("  ") + (l.brackets.length > 6 ? `  … and ${l.brackets.length - 6} more` : ""));

  function show(s) {
    const on = s.lines.filter((l) => l.where === "on"), above = s.lines.filter((l) => l.where === "above");
    const below = s.lines.filter((l) => l.where === "below" && (l.heading || l.brackets.length));
    const scroll = s.scrollable <= 4 ? "The whole page can be seen without scrolling."
      : s.scrolled <= 4 ? "You are at the top of the page. There is more further down."
      : s.scrolled >= s.scrollable - 4 ? "You are at the bottom of the page."
      : `You have scrolled ${s.scrolled} px down. The page is ${s.scrollable + s.height} px tall.`;
    const out = [
      `Page: ${brief(s.title, 120) || "(no title)"}`,
      `Address: ${pathOf(s.url)}`,
      `Screen: ${s.width} × ${s.height} px. ${scroll}`,
      "",
      ...(on.length ? on.map((l) => scrub(l.text)) : ["(There is no text on the screen right now.)"]),
    ];
    if (above.length) out.push("", `Above the screen: ${above.length} ${above.length === 1 ? "line" : "lines"}. Scroll up to see ${above.length === 1 ? "it" : "them"}.`);
    if (below.length) {
      out.push("", "Further down (scroll down to read the text; the numbers can be used directly):", ...below.slice(0, 40).map((l) => `↓ ${lineBelow(l)}`));
      if (below.length > 40) out.push(`↓ … and ${below.length - 40} more lines.`);
    }
    if (s.sideways) out.push("", `Outside the edge of the screen to the side: ${s.sideways} ${s.sideways === 1 ? "line" : "lines"}, not shown here.`);
    return out.join("\n");
  }

  const withoutHash = (address) => address.split("#")[0];
  const numbers = (s) => s.controls.map((k) => `${k.kind}|${k.name}|${k.disabled ? "off" : "on"}`).join("\n");
  const bracket = (k) => `[${k.nr === null ? "" : `${k.nr} `}${k.kind}${k.disabled ? ", disabled" : ""}: ${k.name}${k.state.length ? ` · ${k.state.join(" · ")}` : ""}${k.obscured ? " (covered by something else)" : ""}]`;
  const WHERE = { above: " (above the screen)", below: " (further down)" };

  // What is different after the customer did something? Compared on the text without numbers and state.
  function difference(before, after) {
    const a = new Set(before.lines.map((l) => l.plain)), b = new Set(after.lines.map((l) => l.plain));
    const sameNumbers = numbers(before) === numbers(after);
    // Whether something is covered can only be decided for what is on the screen. So a change only counts when it was there both before and after.
    const changed = (k, g) => k.state.join(" · ") !== g.state.join(" · ") || (k.where === "on" && g.where === "on" && k.obscured !== g.obscured);
    return {
      added: after.lines.filter((l) => !a.has(l.plain)), gone: before.lines.filter((l) => !b.has(l.plain)),
      changed: sameNumbers ? after.controls.filter((k, i) => changed(k, before.controls[i])).map(bracket) : [],
      samePage: withoutHash(before.url) === withoutHash(after.url) && before.title === after.title,
      sameNumbers, scrolled: Math.abs(before.scrolled - after.scrolled) > 4,
    };
  }

  const drain = () => { const h = events.map((x) => ` ${x}`).join(""); events = []; return h; };
  const firstHeading = (s) => { const l = s.lines.find((x) => x.where === "on" && x.heading); return l ? `. The first heading is “${brief(l.plain.replace(/^#+ /, ""), 100)}”` : ""; };
  // A page that changes in the middle of a press is not an error: that is what the press was meant to do.
  const CHANGED_PAGE = /context was destroyed|has been closed|frame was detached|interrupted by another navigation/i;

  // The log is written after every step, so it exists even if the customer is interrupted.
  const save = (interrupted) => write(logPath, { ...log, ...extra, ...(interrupted ? { interrupted } : {}) });

  // Writes the step in the log and takes a picture of what the screen shows.
  async function remember(step, saw, thought) {
    const name = `step-${String(log.steps.length + 1).padStart(2, "0")}.png`;
    const saved = await page.screenshot({ path: join(out, name) }).then(() => true, () => false);
    log.steps.push({ step, saw: saw.trim(), thought, ...(saved ? { image: name } : {}) });
    save("The customer has not finished yet.");
    return saved ? join(out, name) : "(the picture could not be taken)";
  }

  // Runs an action, waits for the page and tells what happened.
  // wholeScreen: always show the whole screen afterwards. ownChoice: the customer asked for another page. showFocus: say where focus is.
  async function action(step, because, does, { wholeScreen = false, ownChoice = false, showFocus = false } = {}) {
    const before = last, tabCount = tabs.length;
    away = [];
    let failed = null;
    try { await does(); } catch (e) {
      if (e instanceof Refused) throw e;
      if (!CHANGED_PAGE.test(e.message)) failed = why(e);
    }
    await settle();

    // A press can open a new tab. If it is on the same site, the customer now stands there; otherwise it is closed.
    for (const t of tabs.slice(tabCount)) {
      await t.waitForLoadState("domcontentloaded").catch(() => {});
      if (onSite(t.url())) events.push("It opened in a new tab.");
      else {
        if (offSite(t.url())) away.push(t.url());
        await t.close().catch(() => {});
      }
    }
    page = tabs[tabs.length - 1] || page;
    // A redirect on the server can lead elsewhere without it being possible to stop it in advance. Then the customer is put back.
    if (offSite(page.url()) || page.url().startsWith("about:")) {
      if (offSite(page.url())) away.push(page.url());
      else events.push("It led to an empty page. The customer was put back where they came from.");
      await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
      await settle();
    }
    for (const u of new Set(away.map(hostOf))) events.push(`It leads off the site (to ${u}). It is not followed.`);

    const now = await read();
    const f = difference(before, now);
    const quote = (lines) => `${lines.slice(0, 3).map((l) => `“${brief(l.plain, 140)}”`).join("; ")}${lines.length > 3 ? ` and ${lines.length - 3} more lines` : ""}`;
    const top = now.lines.find((l) => l.where === "on");
    const hasFocus = now.controls.find((k) => k.nr !== null && k.nr === now.focus);
    const focus = !showFocus ? "" : hasFocus ? `Focus is on ${scrub(bracket(hasFocus))}.` : "Nothing that can be pressed has focus.";
    const happened = drain();
    // What happened beside it (a link off the site, a dialog) is answer enough: then it is not also written that nothing changed.
    const saw = [failed ? `It did not go through: ${failed}`
      : !f.samePage ? `Came to the page “${brief(now.title, 80)}” (${pathOf(now.url)})${firstHeading(now)}.`
      : f.added.length ? `New on the page: ${quote(f.added)}.`
      : f.changed.length ? `Changed: ${f.changed.slice(0, 3).map((x) => brief(x, 140)).join("; ")}.`
      : f.gone.length ? `Disappeared from the page: ${quote(f.gone)}.`
      : f.scrolled ? `The screen now shows another part of the page${top ? `. At the top it says “${brief(top.plain.replace(/^#+ /, ""), 100)}”` : ""}.`
      : happened ? "" : "No text on the page changed.", focus, happened.trim()].filter(Boolean).join(" ");
    extra.actions += 1;
    if (!because) extra.withoutReason += 1;
    const image = await remember(step, saw, because || "");

    const answer = [`${step}.`];
    if (failed) answer.push(`It did not go through: ${failed}`);
    if (happened) answer.push(happened.trim());
    if (focus) answer.push(focus);
    if (!f.samePage) answer.push(...(ownChoice ? [] : ["It led to a new page."]), "", show(now));
    else if (wholeScreen || f.scrolled || !f.sameNumbers || f.added.length > 8 || f.gone.length > 8) {
      if (!wholeScreen) answer.push(!f.sameNumbers ? "The page changed. The numbers are new." : f.scrolled ? "The screen now shows another part of the page. The numbers are the same as before." : "Much on the page changed. The numbers are the same as before.");
      else if (!f.scrolled) answer.push("The page did not scroll.");
      answer.push("", show(now));
    } else {
      if (f.added.length) answer.push("New on the page:", ...f.added.map((l) => `  ${cut(scrub(l.text), 300)}${WHERE[l.where] || ""}`));
      if (f.gone.length) answer.push("Gone from the page:", ...f.gone.slice(0, 4).map((l) => `  ${cut(scrub(l.plain), 160)}`), ...(f.gone.length > 4 ? [`  … and ${f.gone.length - 4} more lines`] : []));
      if (f.changed.length) answer.push("Changed:", ...f.changed.map((x) => `  ${scrub(x)}`));
      if (!f.added.length && !f.gone.length && !f.changed.length && !failed && !happened) answer.push("No text on the page changed. Look at the image if you want to know whether something looks different.");
      answer.push("The numbers are the same as before.");
    }
    const left = extra.max - extra.actions;
    if (left <= 0) answer.push("", "You have used all your actions. Finish now with finish.");
    else if (left <= 5) answer.push("", `You have ${left} ${left === 1 ? "action" : "actions"} left.`);
    answer.push("", `Image: ${image}`);
    return answer.join("\n");
  }

  const KIND = { link: "the link", button: "the button", field: "the field", checkbox: "the checkbox", radio: "the radio button", select: "the select", disclosure: "the disclosure", tab: "the tab", "menu item": "the menu item", option: "the option", clickable: "the area" };

  // Finds the element the number belongs to, as the customer last saw the screen.
  async function find(nr) {
    const k = last.controls.find((x) => x.nr === nr);
    const h = k && (await page.evaluateHandle((n) => (window.__pc ? window.__pc.control(n) : null), nr).catch(() => null))?.asElement();
    if (!k || !h) refuse(`Number ${nr} is not on the screen. Run look, and use a number from there.`);
    return { k, h };
  }

  async function run(b) {
    if (b.command === "ping") return "ok";
    if (b.command === "open") return open(b);
    if (!last) refuse("The customer is not under way. Begin with start.");
    if (b.command === "look") { const now = await read(), happened = drain(); return `${happened ? `${happened.trim()}\n\n` : ""}${show(now)}`; }
    if (b.command === "stop" || b.command === "finish") {
      stopNow = true;
      extra.finished = new Date().toISOString();
      if (b.command === "stop") { save("Stopped with stop, without a result."); return `Stopped without a result. The log is in ${logPath}`; }
      Object.assign(log, { result: b.result, conclusion: b.conclusion, stumbled: b.stumbled });
      save();
      return [`Saved: ${logPath}`, `${b.result} after ${extra.actions} ${extra.actions === 1 ? "action" : "actions"}.`,
        ...(extra.withoutReason ? [`${extra.withoutReason} of them are without --because, so the log does not say what the customer thought there.`] : [])].join("\n");
    }
    if (extra.actions >= extra.max) refuse(`You have used ${extra.max === 1 ? "your one action" : `all ${extra.max} actions`}. Finish now with: finish --result <${RESULTS.join("|")}> --conclusion "<one sentence>"`);

    if (b.command === "click") {
      const { k, h } = await find(b.nr);
      if (k.list) refuse(`Number ${b.nr} is a select. Choose in it with: type ${b.nr} "<option>". ${k.state.find((t) => t.startsWith("options")) || ""}`);
      const href = await h.evaluate((el) => (el.closest("a[href]") || {}).href || "").catch(() => "");
      const other = /^mailto:/i.test(href) ? "an email program" : /^(tel|sms):/i.test(href) ? "the phone" : "";
      const scrolled = k.where === "below" ? "Scrolled down and pressed" : k.where === "above" ? "Scrolled up and pressed" : "Pressed";
      return action(`${scrolled} ${KIND[k.kind] || "it"} “${brief(k.name, 80)}”`, b.because, async () => {
        const y = last.scrolled;
        try { await (mobile ? h.tap({ timeout: 5000 }) : h.click({ timeout: 5000 })); } catch (e) {
          // The browser scrolls the page while it tries to hit. If it was on the screen, the page is put back where the customer had it.
          if (k.where === "on" && !CHANGED_PAGE.test(e.message)) await page.evaluate((top) => scrollTo({ top, behavior: "instant" }), y).catch(() => {});
          throw e;
        }
        if (other) events.push(`The link opens ${other}, not a page. That does not happen here.`);
      });
    }
    if (b.command === "type") {
      const { k, h } = await find(b.nr);
      if (k.list) return action(`Chose “${brief(b.text, 80)}” in the select “${brief(k.name, 80)}”`, b.because, async () => {
        const i = await h.evaluate((el, t) => { const n = (x) => x.replace(/\s+/g, " ").trim().toLowerCase(); return [...el.options].findIndex((o) => n(o.textContent) === n(t)); }, b.text);
        if (i < 0) throw new Error(`The select has no option called “${b.text}”.`);
        await h.selectOption({ index: i }, { timeout: 5000 });
      });
      if (!k.writable) refuse(`Number ${b.nr} is not a field that can be typed in (${k.kind}: ${k.name}). Use click.`);
      const step = k.password ? `Typed a password in the field “${brief(k.name, 80)}”` : `Typed “${brief(b.text, 120)}” in the field “${brief(k.name, 80)}”`;
      return action(step, b.because, () => h.fill(b.text, { timeout: 5000 }));
    }
    if (b.command === "press") return action(`Pressed the key ${b.keyName}`, b.because, () => page.keyboard.press(b.keyName), { showFocus: true });
    if (b.command === "scroll") {
      const down = b.direction === "down", more = last.lines.some((l) => l.where === (down ? "below" : "above"));
      if (!more && (down ? last.scrolled >= last.scrollable - 4 : last.scrolled <= 4)) refuse(`You are at the ${down ? "bottom" : "top"} of the page. There is nothing more to scroll ${down ? "down" : "up"} to.`);
      return action(`Scrolled ${b.direction}`, b.because, async () => {
        await page.mouse.move(last.width / 2, last.height / 2);
        await page.mouse.wheel(0, Math.round(last.height * 0.8) * (down ? 1 : -1));
      }, { wholeScreen: true });
    }
    if (b.command === "back") {
      const canGoBack = await page.evaluate(() => (window.navigation ? window.navigation.canGoBack : history.length > 1)).catch(() => false);
      if (!canGoBack && tabs.length < 2) refuse("There is no page to go back to.");
      // A tab that has just been opened has no page to go back to. Then it is closed, and the customer stands in the previous one.
      return action("Went one page back", b.because, () => (canGoBack ? page.goBack({ waitUntil: "domcontentloaded" }) : page.close()), { ownChoice: true });
    }
    if (b.command === "goto") {
      let target = null;
      try { target = new URL(b.path, page.url()); } catch { /* reported below */ }
      if (!target) refuse(`"${b.path}" is not an address.`);
      if (target.origin !== home) refuse(`The address is somewhere other than the site being tried (${hostOf(home)}). It is not opened.`);
      return action(`Typed the address ${pathOf(target.href)} in the address bar`, b.because, () => page.goto(target.href, { waitUntil: "domcontentloaded" }), { ownChoice: true });
    }
    refuse("Unknown command.");
  }

  // ---------- the local server ----------

  let queue = Promise.resolve(), idle = null;
  const close = async (interrupted) => {
    clearTimeout(idle);
    if (interrupted && last) { extra.finished = new Date().toISOString(); save(interrupted); }
    rmSync(file, { force: true });
    if (browser) await browser.close().catch(() => {});
    try { if (statSync(logFile).size === 0) rmSync(logFile, { force: true }); } catch { /* missing or in use */ }
    process.exit(0);
  };
  const idleTimer = () => {
    clearTimeout(idle);
    idle = setTimeout(() => { queue = queue.then(() => close("No commands for 20 minutes. The customer was closed without a result.")); }, IDLE_MS);
  };

  const http = createServer((q, s) => {
    const reply = (code, text, then) => { s.writeHead(code, { "content-type": "text/plain; charset=utf-8" }); s.end(text, then); };
    // Only commands from this machine's command line: a web page does not know the key and cannot avoid sending Origin.
    if (q.method !== "POST" || q.headers.origin || q.headers.host !== `127.0.0.1:${http.address().port}` || !/^application\/json/.test(q.headers["content-type"] || "")) return reply(403, "Refused.");
    let body = "";
    q.setEncoding("utf8");
    q.on("data", (d) => { body += d; if (body.length > 200000) q.destroy(); });
    q.on("end", () => {
      let b = null;
      try { b = JSON.parse(body); } catch { /* refused below */ }
      const got = Buffer.from(String((b && b.key) || "")), expected = Buffer.from(key);
      if (got.length !== expected.length || !timingSafeEqual(got, expected)) return reply(403, "Refused.");
      idleTimer();
      queue = queue.then(async () => {
        let code = 200, text = "";
        try { text = await run(b); } catch (e) {
          code = e instanceof Refused ? 409 : 500;
          text = e instanceof Refused ? e.message : `Something went wrong in the tool: ${why(e)}`;
          if (code === 500) console.error(e);
          // If the customer never got under way, there is nothing to keep open.
          if (b.command === "open") stopNow = true;
        }
        // The state file is gone before the answer is sent, so the next command cannot hit a browser that is closing.
        if (stopNow) rmSync(file, { force: true });
        reply(code, text, () => { if (stopNow) close(); });
      });
    });
  });
  http.listen(0, "127.0.0.1", () => {
    // Written beside and renamed, so the client never reads half a file.
    write(`${file}.new`, { port: http.address().port, pid: process.pid, key, started: extra.started });
    renameSync(`${file}.new`, file);
    idleTimer();
  });
  process.on("SIGTERM", () => { queue = queue.then(() => close("The customer was interrupted from outside, without a result.")); });
}
