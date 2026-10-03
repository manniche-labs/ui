#!/usr/bin/env node
// Writes the report as one HTML file that can be published as an artifact or opened directly in a browser.
//
//   node scripts/report.mjs --out <folder> [--no-images]
//
// Reads from <folder>:
//   measurement.json           what was measured (layer 2). Must exist.
//   review.json                layers 1 and 3, the good, life cards, AI look and the blind customer. Format: templates/review-example.json
//                              If a customer has the field "folder" (the name of the customer's folder in <folder>), the customer's last screen is shown.
//   fixes.json                 the fix list. Format: templates/fixes-example.json
//   measurement-previous.json  the previous measurement. If it exists, the report shows before and after.
// and writes <folder>/report.html. If the review or the list is missing, the report is written with what exists.
// The screenshots are scaled down in a browser and put into the file (Chrome, or PC_BROWSER=chromium).

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { SEVERITY, LABEL, LIMIT, GROUP, GROUP_METRICS, LAYER1, LAYER3, browserChoice, date, isMeasured, exists, limitText, command, read, readIf, nameOf, fixStatus, comparePage, escape } from "./common.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const { options } = command(process.argv.slice(2), ["no-images"]);
if (!options.out || options.out === true) {
  console.error("Usage: node scripts/report.mjs --out <folder> [--no-images]");
  process.exit(2);
}
const OUT = resolve(options.out);
if (!existsSync(join(OUT, "measurement.json"))) { console.error(`Missing ${join(OUT, "measurement.json")}. Run the measurement first.`); process.exit(2); }

// The list is checked by the script that owns the format, so there is only one set of rules.
if (existsSync(join(OUT, "fixes.json"))) {
  const r = spawnSync(process.execPath, [join(here, "fixes.mjs"), "check", "--out", OUT], { encoding: "utf8" });
  if (r.status !== 0) { console.error(((r.stdout || "") + (r.stderr || "")).trim()); process.exit(1); }
}
const measurement = read(join(OUT, "measurement.json"));
const previous = readIf(join(OUT, "measurement-previous.json"));
const rev = readIf(join(OUT, "review.json")) || {};
const list = readIf(join(OUT, "fixes.json")) || {};
const fixes = list.fixes || [];
const customers = [rev.customer || []].flat();

const RESULT = {
  COMPLETED: ["Completed the task", "l"], COMPLETED_WITH_DIFFICULTY: ["Completed the task with difficulty", "g"],
  ABANDONED: ["Gave up", "b"], BLOCKED: ["Could not get any further", "b"],
};

// ---------- is the review in order? ----------

function checkReview() {
  const errors = [];
  const names = measurement.pages.map((p) => p.name);
  const layer = (where, items, answer, name) => {
    if (!Array.isArray(items)) { errors.push(`${where}: ${name} must be a list.`); return; }
    for (const p of answer) if (!items.some((x) => x.item === p)) errors.push(`${where}: ${name} is missing the item "${p}".`);
    for (const x of items) {
      if (!answer.includes(x.item)) errors.push(`${where}: "${x.item}" is not an item in ${name}.`);
      const number = Number.isInteger(x.score) && x.score >= 1 && x.score <= 5;
      if (x.score !== null && !number) errors.push(`${where}: the score for "${x.item}" must be 1 to 5, or null when the item cannot be judged.`);
      // A low score has to say why, and an item without a score has to say why it was not judged.
      if ((x.score === null || x.score <= 3) && !x.note) errors.push(`${where}: "${x.item}" in ${name} is missing a note.`);
    }
  };
  for (const [name, b] of Object.entries(rev.pages || {})) {
    if (!names.includes(name)) { errors.push(`The page "${name}" is not in the measurement.`); continue; }
    if (b.layer1) layer(name, b.layer1, LAYER1, "layer1");
    if (b.layer3) layer(name, b.layer3, LAYER3, "layer3");
    if (b.type && !["showcase", "tool"].includes(b.type)) errors.push(`${name}: type must be "showcase" or "tool".`);
    if ((b.good || []).length > 3) errors.push(`${name}: at most three items under good.`);
    for (const [i, x] of (b.life || []).entries()) {
      for (const key of ["element", "moment", "pattern", "values", "reduced"]) if (!x[key]) errors.push(`${name}: life card ${i + 1} is missing ${key}.`);
      if (x.fix && !fixes.some((f) => f.id === x.fix)) errors.push(`${name}: life card ${i + 1} points to ${x.fix}, which is not on the fix list.`);
    }
    if ((b.life || []).length && !b.dontAnimate) errors.push(`${name}: has life cards, but does not say what should not be animated (dontAnimate).`);
  }
  for (const [i, c] of customers.entries()) {
    if (!c.task) errors.push(`customer ${i + 1}: missing task.`);
    if (!(c.result in RESULT)) errors.push(`customer ${i + 1}: result must be ${Object.keys(RESULT).join(", ")}.`);
    // The folder is used to fetch the customer's last screenshot. It has to be inside the measurement folder, so the name cannot be a path.
    if (exists(c.folder) && (typeof c.folder !== "string" || !/^[\w-][\w.-]*$/.test(c.folder))) errors.push(`customer ${i + 1}: folder must be the name of the customer's folder inside the measurement folder, e.g. "customer-mobile".`);
  }
  for (const x of rev.notSeen || []) if (!x.page || !x.why) errors.push("notSeen: every entry needs a page and a why.");
  return errors;
}

const errors = checkReview();
if (errors.length) {
  console.error(`${errors.length} ${errors.length === 1 ? "error" : "errors"} in review.json:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}

// ---------- text ----------

const l = (v) => (Array.isArray(v) ? v : []);
const num = (n, d = 1) => (exists(n) ? Number(n).toFixed(d) : "–");
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// `code` in the texts becomes <code>. Everything else is shown as it stands.
const text = (t) => escape(t).replace(/`([^`]+)`/g, "<code>$1</code>");
// A title that already ends with a sign (e.g. a question) does not get a full stop on top.
const withStop = (t) => text(t) + (/[.?!:…]$/.test(String(t).trim()) ? "" : ".");
const ex = (items, n = 3) => (items.length ? ` (${items.slice(0, n).map(escape).join("; ")}${items.length > n ? " …" : ""})` : "");
const metricText = (k, v) => (k === "cls" ? num(v, 2) : Number.isInteger(v) ? String(v) : num(v));
const tag = (t, cls) => `<span class="tag ${cls}">${escape(t)}</span>`;
const table = (head, rows) => `<div class="wrap"><table><tr>${head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr>${rows.join("")}</table></div>`;
const CLASS = { Blocker: "b", Friction: "g", Polish: "f", Upgrade: "l" };
const STATUS = { solved: "l", partial: "g", unsolved: "n", worse: "b", "needs a look": "f", "not measured": "f" };

// ---------- model ----------

const measured = measurement.pages.filter((p) => !p.notSeen);
// Status only makes sense once there has been a new measurement, or when someone has set it by hand.
const showStatus = !!previous || fixes.some((f) => f.status);
const stat = new Map(fixes.map((f) => [f.id, fixStatus(f, measurement)]));
const solved = (f) => showStatus && stat.get(f.id).status === "solved";
const bySeverity = (a, b) => SEVERITY.indexOf(a.severity) - SEVERITY.indexOf(b.severity);
const open = fixes.filter((f) => !solved(f)).sort(bySeverity);
const appliesTo = (f, name) => f.pages === "all" || f.pages.includes(name);
const acrossPages = (f) => measured.length > 1 && (f.pages === "all" || f.pages.length > 1);
const average = (items) => {
  const k = l(items).map((p) => p.score).filter(exists);
  return k.length ? k.reduce((a, b) => a + b, 0) / k.length : null;
};

// Worst first: most blocking findings, then the lowest of the three scores, then most friction findings. No overall score.
const pages = measured.map((m, i) => {
  const b = rev.pages?.[m.name] || {};
  const own = open.filter((f) => appliesTo(f, m.name));
  const layers = [average(b.layer1), m.layer2.score, average(b.layer3)];
  return {
    i, name: m.name, anchor: `page-${m.name.replace(/[^\w-]+/g, "-")}`, title: b.title || m.name, m, b, layers, fixes: own,
    lowest: Math.min(...layers.filter(exists)), count: Object.fromEntries(SEVERITY.map((s) => [s, own.filter((f) => f.severity === s).length])),
  };
}).sort((x, y) => y.count.Blocker - x.count.Blocker || x.lowest - y.lowest || y.count.Friction - x.count.Friction || x.i - y.i);
const titleOf = (name) => pages.find((p) => p.name === name)?.title || name;
const product = rev.product || list.product || new URL(measurement.base).host;

// ---------- images ----------

// The screenshots are scaled down and put in as WebP, so the report is one file and stays under the artifact's limit.
const WIDTH = 1100, TALLEST = 8000, BUDGET = 9e6;
// Runs in the browser. Images taller than the limit are cropped at the bottom.
const scale = ({ src, width, tallest }) => new Promise((ok, fail) => {
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, width / img.naturalWidth);
    const canvas = document.createElement("canvas");
    const full = Math.round(img.naturalHeight * k);
    canvas.width = Math.round(img.naturalWidth * k);
    canvas.height = Math.min(full, tallest);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, full);
    ok({ src: canvas.toDataURL("image/webp", 0.82), w: canvas.width, h: canvas.height, cropped: full > tallest });
  };
  img.onerror = () => fail(new Error("the image could not be read"));
  img.src = src;
});

async function loadImages(files) {
  const out = new Map();
  const onDisk = [...new Set(files)].filter((f) => f && existsSync(join(OUT, f)));
  if (options["no-images"] || !onDisk.length) return out;
  const raw = (f) => `data:image/png;base64,${readFileSync(join(OUT, f)).toString("base64")}`;
  const size = () => [...out.values()].reduce((n, b) => n + b.src.length, 0);
  let browser;
  try { browser = await chromium.launch(browserChoice()); } catch { /* then they go in as they are */ }
  if (browser) {
    const page = await browser.newPage();
    for (const k of [1, 0.7, 0.5]) {
      out.clear();
      for (const f of onDisk) {
        try { out.set(f, await page.evaluate(scale, { src: raw(f), width: Math.round(WIDTH * k), tallest: TALLEST })); } catch { /* the image is left out */ }
      }
      if (size() <= BUDGET) break;
    }
    await browser.close();
  } else {
    console.error("No browser to scale the images. They go in as they are.");
    for (const f of onDisk) out.set(f, { src: raw(f) });
  }
  // If there is still too much, the largest are left out until the rest fits.
  for (const [f] of [...out.entries()].sort((a, b) => b[1].src.length - a[1].src.length)) {
    if (size() <= BUDGET) break;
    out.delete(f);
  }
  return out;
}

const stressImages = (m) => ["german", "longWord"].map((k) => m.stress?.[k]?.image).filter(Boolean);
// The customer's last screen: the image from the last step. Only when the entry says which folder inside the measurement folder the customer ran in.
const lastScreen = (c) => {
  const name = c.folder ? l(c.steps).map((t) => t.image).filter((b) => /^step-\d+\.png$/.test(b || "")).pop() : null;
  return name ? join(c.folder, name) : null;
};
const images = await loadImages([
  ...measured.flatMap((m) => [m.images?.desk, m.images?.mobile, m.images?.dark, ...stressImages(m)]),
  measurement.notFoundPage?.image,
  ...customers.map(lastScreen),
]);

function image(file, alt, label) {
  if (!file) return "";
  const b = images.get(file);
  if (!b) return `<p class="meta">${escape(label)}: <code>${escape(file)}</code> is in the measurement folder and is not included here.</p>`;
  return `<figure><div class="frame" data-name="${escape(label)}"><img src="${b.src}" alt="${escape(alt)}"${b.w ? ` width="${b.w}" height="${b.h}"` : ""} decoding="async"></div>` +
    `<figcaption>${escape(label)}${b.cropped ? ` · cropped, the whole image is <code>${escape(file)}</code>` : ""}</figcaption></figure>`;
}

// ---------- layer 2: why does a group fail? ----------

function reasons(m, g) {
  const t = m.metrics, out = [];
  // Examples the plan asked to ignore are not shown.
  const add = (k, examples = []) => {
    if (!t[k]) return;
    const ignored = new Set(l(m.ignored).filter((i) => i.metric === k).map((i) => i.what));
    out.push(`${LABEL[k]}: ${t[k]}${ex(examples.map(String).filter((e) => !ignored.has(e)))}`);
  };
  if (g === "errors") { add("consoleErrors", l(m.consoleErrors)); add("failedRequests", l(m.failedRequests)); add("brokenImages", l(m.structure?.brokenImages)); }
  if (g === "narrowScreen") for (const w of [320, 390]) {
    const o = m.overflow?.[w];
    if (o?.hScroll) out.push(`Horizontal scroll at ${w} px: the content is ${o.content} px wide${ex(l(o.culprits), 2)}`);
  }
  if (g === "fingers") {
    add("targetFails", l(m.targets).filter((f) => f.under24 || f.control).map((f) => `${f.element}: ${f.width} × ${f.height} px`));
    add("fieldsUnder16px", l(m.fieldsMobile));
  }
  if (g === "readability") {
    add("contrastErrors", l(m.contrast?.errors).map((f) => `${f.example}: ${num(f.ratio, 2)}:1, needs ${num(f.required)}:1`));
    add("axeErrors", l(m.axe?.errors).map((f) => `${f.id} on ${f.first}`));
    add("fieldsWithoutLabel", l(m.fields).filter((f) => !f.label).map((f) => f.element));
    if (t.zoomDisabled) out.push("Zoom is disabled in the page's viewport");
  }
  if (g === "keyboard") {
    add("invisibleFocus", l(m.keyboard?.invisibleFocus));
    add("notReachedByKeyboard", l(m.keyboard?.notReached));
    add("focusObscured", l(m.keyboard?.obscured));
    add("focusOffscreen", l(m.keyboard?.offscreen));
    add("focusJumpsBack", l(m.keyboard?.jumpsBack));
    if (t.focusTrapped) out.push(`Tab cannot get past: ${l(m.keyboard?.trapped).map(escape).join(", ")}`);
  }
  if (g === "form" && m.form) {
    const x = m.form.gaps;
    if (x.errorNotAnnounced) out.push("The error is not announced: no message for screen readers, and focus does not move to the field");
    if (x.fieldNotMarked) out.push("The field with the error is not marked and linked to the error text (aria-invalid, aria-describedby)");
    if (x.valueLost) out.push("What was typed is gone");
  }
  if (g === "speed") for (const k of GROUP_METRICS.speed) {
    if (exists(t[k]) && t[k] > LIMIT[k]) out.push(`${LABEL[k]}: ${metricText(k, t[k])}, the limit is ${metricText(k, LIMIT[k])}`);
  }
  if (g === "calm") {
    add("motionDespiteReduced", l(m.reducedMotion?.stillRunning).map((a) => `${a.name} on ${a.element}`));
    add("imagesWithoutSize", l(m.structure?.imagesWithoutSize));
  }
  return out;
}

function layer2(m) {
  const failed = m.layer2.failed.map((g) => GROUP[g].toLowerCase());
  const rows = Object.keys(GROUP).map((g) => {
    const ok = m.layer2.groups[g], wasMeasured = isMeasured(m, g);
    // A caveat is shown even when the group passes: a walk that was interrupted has not tried the rest of the page.
    const caveat = g === "keyboard" && m.keyboard?.interrupted ? [`The Tab walk was interrupted after ${m.keyboard.stops} stops. ${m.keyboard.notTried} clickable elements were not tried.`] : [];
    return `<tr><td>${GROUP[g]}</td><td class="${!wasMeasured ? "weak" : ok ? "pass" : "fail"}">${!wasMeasured ? "not measured" : ok ? "passes" : "fails"}</td><td>${[...(ok ? [] : reasons(m, g)), ...caveat].join("<br>")}</td></tr>`;
  });
  return `<details${failed.length ? " open" : ""}><summary>Layer 2: ${m.layer2.score} of 5${failed.length ? `, fails ${failed.join(", ")}` : ", every group passes"}</summary>${table(["Group", "Result", "Why"], rows)}</details>`;
}

const allMetrics = (m) => `<details><summary>Every measured number</summary>${table(["Metric", "Value"], Object.keys(LABEL).filter((k) => exists(m.metrics[k])).map((k) => `<tr><td>${LABEL[k]}</td><td class="n">${metricText(k, m.metrics[k])}</td></tr>`))}</details>`;

function layerTable(name, items, score) {
  if (!l(items).length) return "";
  const rows = items.map((p) => `<tr><td>${escape(p.item)}</td><td class="n">${p.score ?? "–"}</td><td>${text(p.note || "")}</td></tr>`);
  return `<details><summary>${name}: ${num(score)} on average, all ${items.length} scores</summary>${table(["Item", "Score", "Note"], rows)}</details>`;
}

// ---------- fixes ----------

// "Fields under 16 px text on Login: at most 0 (before 1, now 0)"
const targetText = (f) => stat.get(f.id).targets.map((t) => `${nameOf(t.metric)} on ${escape(titleOf(t.page))}: ${limitText(t)} (${showStatus && exists(t.before) && t.before !== t.now ? `before ${t.before}, ` : ""}now ${t.now ?? "not measured"})`).join("; ");

function card(f) {
  const p = f.preview;
  const parts = [];
  if (l(f.evidence).length) parts.push(`Evidence: ${f.evidence.map(text).join(" · ")}`);
  if (l(f.files).length) parts.push(`Where: ${f.files.map((x) => `<code>${escape(x)}</code>`).join(", ")}`);
  if (l(f.targets).length) parts.push(`Done when: ${targetText(f)}`);
  if (f.effort) parts.push(`Effort: ${escape(f.effort)}`);
  const s = showStatus ? stat.get(f.id).status : null;
  return `<li id="${f.id}">${tag(f.severity, CLASS[f.severity])}${s && s !== "unsolved" ? tag(s, STATUS[s]) : ""}<b>${f.id} · ${withStop(f.title)}</b> ${text(f.finding)}` +
    `<span class="fix">${text(f.change)}</span>` +
    (p ? `<span class="choice">Can be seen in three variants: ${p.variants.map((v) => `${v.letter} ${escape(v.name)}`).join(", ")}. ${f.chosen ? `Chosen: ${escape(f.chosen)}.` : `Say “show ${f.id}”.`}</span>` : "") +
    `<span class="meta">${parts.join(" · ")}</span></li>`;
}

function cardList(own) {
  const problems = own.filter((f) => f.severity !== "Upgrade"), upgrades = own.filter((f) => f.severity === "Upgrade");
  return (problems.length ? `<h3>Problems</h3><ul>${problems.map(card).join("")}</ul>` : "") + (upgrades.length ? `<h3>Upgrades</h3><ul>${upgrades.map(card).join("")}</ul>` : "");
}

function fixesSection() {
  if (!fixes.length) return "";
  const sys = list.systemDecisions || [];
  const done = fixes.filter(solved);
  const counts = SEVERITY.map((s) => `${open.filter((f) => f.severity === s).length} ${s.toLowerCase()}`).join(", ");
  const pagesText = (f) => (f.pages === "all" ? "all" : f.pages.map((n) => escape(titleOf(n))).join(", "));
  const row = (f) => {
    const s = stat.get(f.id).status;
    return `<tr><td class="n">${solved(f) ? f.id : `<a href="#${f.id}">${f.id}</a>`}</td><td>${tag(f.severity, CLASS[f.severity])}</td><td>${text(f.title)}${f.preview ? ` <span class="weak">· three variants${f.chosen ? `, chose ${escape(f.chosen)}` : ""}</span>` : ""}</td>` +
      `<td>${pagesText(f)}</td><td>${escape(f.effort || "")}</td>${showStatus ? `<td>${tag(s, STATUS[s])}</td>` : ""}</tr>`;
  };
  const visual = open.filter((f) => f.preview);
  const next = [
    visual.length ? `Say “show ${visual[0].id}” to see a fix in three variants, and answer with e.g. “${visual[0].id}: B” to choose.` : "",
    "Say “write the fix prompt” when the list is as it should be. Nothing gets fixed before then.",
  ].filter(Boolean).join(" ");
  return `<section id="fixes">
  <h2>Fixes</h2>
  <p>${plural(open.length, "open fix", "open fixes")}: ${counts}.${done.length ? ` ${plural(done.length, "is", "are")} solved since last time.` : ""}</p>
  ${sys.length ? `<h3>System decisions</h3>
  <p>Choices for the whole product. They need to be in place before the individual fixes make sense.</p>
  <ul>${sys.map((s) => `<li id="${s.id}"><b>${s.id} · ${withStop(s.title)}</b> ${text(s.why)}<span class="fix${s.decided ? " decided" : ""}">${text(s.decided || s.proposal)}</span>${l(s.affects).length ? `<span class="meta">Affects: ${s.affects.map((id) => `<a href="#${id}">${id}</a>`).join(", ")}</span>` : ""}</li>`).join("")}</ul>` : ""}
  <h3>The list</h3>
  ${table(["No.", "Severity", "Fix", "Pages", "Effort", ...(showStatus ? ["Status"] : [])], [...open, ...done].map(row))}
  <p class="note">${next}</p>
</section>`;
}

function acrossSection() {
  const own = open.filter(acrossPages);
  if (!own.length) return "";
  return `<section id="across">
  <h2>Across pages</h2>
  <p>What comes up on more than one page. It is fixed in one place, not page by page.</p>
  ${cardList(own)}
</section>`;
}

// ---------- overview, before and after ----------

function overview() {
  const sc = (n, d) => (exists(n) ? num(n, d) : "–");
  const rows = pages.map((p) => `<tr><td><a href="#${p.anchor}">${escape(p.title)}</a></td><td class="score">${sc(p.layers[0], 1)}${p.b.fromCode && exists(p.layers[0]) ? "**" : ""}</td><td class="score">${sc(p.layers[1], 0)}</td><td class="score">${sc(p.layers[2], 1)}${p.b.fromCode && exists(p.layers[2]) ? "**" : ""}</td>` +
    SEVERITY.map((s) => `<td class="n">${p.count[s]}</td>`).join("") + "</tr>");
  const failing = Object.keys(GROUP).map((g) => [GROUP[g].toLowerCase(), measured.filter((m) => !m.layer2.groups[g]).length]).filter(([, n]) => n);
  const everywhere = failing.filter(([, n]) => n === measured.length && measured.length > 1).map(([g]) => g);
  const some = failing.filter(([g]) => !everywhere.includes(g)).map(([g, n]) => `${g} (${n} of ${measured.length})`);
  const layer2Text = !failing.length ? "No page fails a group in layer 2." :
    [everywhere.length ? `All ${measured.length} pages fail ${everywhere.join(" and ")}.` : "", some.length ? `Fails on some pages: ${some.join(", ")}.` : ""].filter(Boolean).join(" ");
  const judged = pages.some((p) => exists(p.layers[0]) || exists(p.layers[2]));
  return `<section id="overview">
  <h2>Overview, worst first</h2>
  ${table(["Page", "Layer 1<br>Works", "Layer 2<br>Holds up", "Layer 3<br>Delightful", ...SEVERITY], rows)}
  <p>${judged ? "Layers 1 and 3 are averages of the individual scores, which are listed under each page. " : "Layers 1 and 3 have not been judged yet. "}Layer 2 is measured: 5 minus one point for each group that fails. ${layer2Text}</p>
  ${pages.some((p) => p.b.fromCode) ? `<p class="meta">** Judged from the code, not from the screenshot.</p>` : ""}
  ${rev.summary ? `<p>${text(rev.summary)}</p>` : ""}
</section>`;
}

function beforeAfter() {
  if (!previous) return "";
  let better = 0, worse = 0;
  const rows = [], moved = [];
  for (const p of pages) {
    const f = previous.pages.find((x) => x.name === p.name);
    if (!f || f.notSeen) { rows.push(`<tr><td>${escape(p.title)}</td><td class="score">–</td><td class="score">${p.m.layer2.score}</td><td colspan="2">new page, nothing to compare with</td></tr>`); continue; }
    const x = comparePage(f, p.m);
    better += x.better;
    worse += x.worse;
    rows.push(`<tr><td>${escape(p.title)}</td><td class="score">${f.layer2?.score ?? "–"}</td><td class="score">${p.m.layer2.score}</td><td class="n pass">${x.better}</td><td class="n${x.worse ? " fail" : ""}">${x.worse}</td></tr>`);
    for (const r of x.rows.filter((r) => r.sign === "better" || r.sign === "worse")) {
      moved.push(`<tr><td>${escape(p.title)}</td><td>${LABEL[r.metric]}</td><td class="n">${metricText(r.metric, r.before)}</td><td class="n">${metricText(r.metric, r.after)}</td><td class="${r.sign === "better" ? "pass" : "fail"}">${r.sign}</td></tr>`);
    }
  }
  const withTargets = fixes.filter((f) => l(f.targets).length || f.status);
  const caveat = previous.mode && previous.mode !== measurement.mode ? ` The before measurement was ${previous.mode} and this one ${measurement.mode}, so some numbers exist in only one of them.` : "";
  return `<section id="before-after">
  <h2>Before and after</h2>
  <p class="meta">Before: ${date(previous.measured)} · Now: ${date(measurement.measured)}</p>
  ${table(["Page", "Layer 2 before", "Layer 2 now", "Metrics better", "Metrics worse"], rows)}
  <p>In total ${plural(better, "metric", "metrics")} better and ${worse} worse. Speed and weight only count when they move more than 15 %.${caveat}</p>
  ${moved.length ? `<details><summary>Every number that moved</summary>${table(["Page", "Metric", "Before", "Now", "Direction"], moved)}</details>` : ""}
  ${withTargets.length ? `<h3>The fixes</h3>
  ${table(["No.", "Fix", "Status", "Done when"], withTargets.sort(bySeverity).map((f) => { const s = stat.get(f.id).status; return `<tr><td class="n">${f.id}</td><td>${text(f.title)}</td><td>${tag(s, STATUS[s])}</td><td>${targetText(f) || "Cannot be measured. Needs a look."}</td></tr>`; }))}` : ""}
</section>`;
}

// ---------- AI look and the blind customer ----------

function aiLook() {
  const combined = new Map(), imp = new Map();
  for (const p of pages) {
    for (const [kind, found] of [["Clear", p.m.aiLook?.clear], ["Suspect", p.m.aiLook?.suspect]]) for (const x of l(found)) {
      const c = combined.get(x.rule) || { text: x.text || x.rule, kind, pages: [], examples: [] };
      c.pages.push(p.title);
      c.examples.push(...l(x.examples));
      combined.set(x.rule, c);
    }
    for (const x of l(p.m.impeccable)) {
      const c = imp.get(x.rule) || { category: x.category, count: 0, pages: [], snippets: [] };
      c.count += x.count || 1;
      c.pages.push(p.title);
      c.snippets.push(...l(x.snippets));
      imp.set(x.rule, c);
    }
  }
  const b = rev.aiLook;
  const rows = [...combined.values()].sort((x, y) => (x.kind === y.kind ? 0 : x.kind === "Clear" ? -1 : 1))
    .map((c) => `<tr><td>${tag(c.kind, c.kind === "Clear" ? "g" : "n")}</td><td>${escape(c.text)}</td><td>${c.pages.map(escape).join(", ")}</td><td>${[...new Set(c.examples)].slice(0, 2).map(escape).join("<br>")}</td></tr>`);
  return `<section id="ai-look">
  <h2>AI look</h2>
  ${b?.answer ? `<p><b>Could a completely different product use these pages unchanged?</b> ${text(b.answer)}</p>` : ""}
  ${l(b?.findings).length ? `<ul>${b.findings.map((x) => `<li>${text(x)}</li>`).join("")}</ul>` : ""}
  ${rows.length ? table(["Kind", "Sign", "Pages", "Example"], rows) : "<p>The measurement found none of the signs it looks for.</p>"}
  <p class="weak">“Clear” are patterns seen almost only on machine-made pages. “Suspect” are common choices that only become a problem when several of them appear together. Neither counts in layer 2.</p>
  ${imp.size ? `<h3>Impeccable</h3>${table(["Rule", "Count", "Pages", "Snippet"], [...imp.entries()].map(([rule, c]) => `<tr><td><code>${escape(rule)}</code></td><td class="n">${c.count}</td><td>${[...new Set(c.pages)].map(escape).join(", ")}</td><td>${[...new Set(c.snippets)].slice(0, 2).map(escape).join("<br>")}</td></tr>`))}` : ""}
</section>`;
}

function customerSection() {
  if (!customers.length) return "";
  return `<section id="customer">
  <h2>The blind customer</h2>
  <p>An agent that does not know the code was given a task and only what a user sees. It says what it thought at each step.</p>
  ${customers.map((c) => `<h3>${text(c.task)}</h3>
  <p>${tag(RESULT[c.result][0], RESULT[c.result][1])}${text(c.conclusion || "")}</p>
  ${l(c.steps).length ? table(["Step", "Did", "Saw", "Thought"], c.steps.map((t, i) => `<tr><td class="n">${i + 1}</td><td>${text(t.step)}</td><td>${text(t.saw || "")}</td><td>${text(t.thought || "")}</td></tr>`)) : ""}
  ${l(c.stumbled).length ? `<ul>${c.stumbled.map((x) => `<li>${tag("Stumbled", "g")}${text(x)}</li>`).join("")}</ul>` : ""}
  ${lastScreen(c) ? `<div class="last${/^phone/.test(c.screen || "") ? " narrow" : ""}">${image(lastScreen(c), "The last screen the customer saw", "Last screen")}</div>` : ""}`).join("")}
</section>`;
}

// ---------- one section per page ----------

function stress(m) {
  if (!m.stress) return "";
  const out = [];
  for (const [k, name] of [["german", "Longer texts, as in German"], ["longWord", "A long word without spaces"]]) {
    const x = m.stress[k];
    if (!x || x.notTried) { out.push(`<li>${name}: not tried${x?.notTried ? ` (${escape(x.notTried)})` : ""}.</li>`); continue; }
    const breaks = [x.hScroll ? `the page scrolls sideways${ex(l(x.culprits), 2)}` : "", x.newClipped ? `${plural(x.newClipped, "text gets clipped", "texts get clipped")}${ex(l(x.clipped).map((a) => a.element || a), 2)}` : ""].filter(Boolean);
    // The test only counts what breaks on top of what is already wrong at rest.
    const holds = m.metrics.hScroll390 ? tag("Nothing new", "n") : tag("Holds", "l");
    out.push(`<li>${breaks.length ? tag("Breaks", "g") : holds}${name}${breaks.length ? `: ${breaks.join("; ")}.` : "."}${x.image ? image(x.image, `${name} at 390 px`, `${name}, 390 px`) : ""}</li>`);
  }
  return `<h3>Stress tests at 390 px</h3>${m.metrics.hScroll390 ? "<p>The page already scrolls sideways at 390 px. The tests only show what breaks on top of that.</p>" : ""}<ul>${out.join("")}</ul>`;
}

function form(m) {
  const out = [];
  if (m.form) {
    const x = m.form.gaps, missing = Object.values(x).filter(Boolean).length;
    out.push(missing ? `The error state is missing ${missing} of 3 things (see layer 2).` : "The error state holds up: the error is announced, the field is marked, and what was typed stays.");
  }
  const d = m.doubleSubmit;
  if (d && !d.notTried && exists(d.submits)) out.push(`A double press on “${escape(d.button)}” submits the form ${d.submits === 1 ? "once" : `${d.submits} times`}${d.showsWork ? ", and the button shows that it is working" : ", and the button does not show that it is working"}.`);
  return out.length ? `<p><b>Form:</b> ${out.join(" ")}</p>` : "";
}

function measuredLine(m) {
  const y = m.performance || {};
  const parts = [`response ${m.status}`, `<code>${escape(m.path)}</code>${m.steps ? ` after ${plural(m.steps, "step", "steps")}` : ""}`];
  if (exists(y.lcpMs)) parts.push(`LCP ${num(y.lcpMs / 1000)} s`);
  if (exists(y.cls)) parts.push(`CLS ${num(y.cls, 2)}`);
  if (exists(y.inpMs)) parts.push(`INP ${Math.round(y.inpMs)} ms`);
  if (exists(y.kB)) parts.push(`${Math.round(y.kB)} kB`);
  if (y.skipped) parts.push("speed not measured");
  return parts.join(" · ");
}

function pageSection(p) {
  const { m, b } = p;
  const sc = (n, d) => (exists(n) ? num(n, d) : "–");
  const own = p.fixes.filter((f) => !acrossPages(f)), shared = p.fixes.filter(acrossPages);
  const life = l(b.life);
  return `<section class="state" id="${p.anchor}">
  <div class="top"><h2>${escape(p.title)}</h2><div class="layers"><span>Works <b>${sc(p.layers[0], 1)}</b></span><span>Holds up <b>${sc(p.layers[1], 0)}</b></span><span>Delightful <b>${sc(p.layers[2], 1)}</b></span></div></div>
  ${b.job ? `<p><b>The page's job:</b> ${text(b.job)}</p>` : ""}
  <div class="shots">${image(m.images?.desk, `${p.title} at 1440 px`, "1440 px")}${image(m.images?.mobile, `${p.title} at 390 px`, "390 px")}</div>
  <p class="meta">Measured: ${measuredLine(m)}</p>
  ${layer2(m)}
  ${layerTable("Layer 1", b.layer1, p.layers[0])}
  ${layerTable("Layer 3", b.layer3, p.layers[2])}
  ${allMetrics(m)}
  ${l(b.good).length ? `<h3>Good</h3><ul class="good">${b.good.map((x) => `<li>${text(x)}</li>`).join("")}</ul>` : ""}
  ${cardList(own)}
  ${shared.length ? `<p class="meta">Also applies here, see Across pages: ${shared.map((f) => `<a href="#${f.id}">${f.id}</a> ${text(f.title)}`).join(" · ")}</p>` : ""}
  ${life.length ? `<h3>Life</h3>
  <p>Places where a motion would explain something. These are suggestions, not problems.</p>
  ${table(["Element", "Moment", "Pattern", "Values", "Under “reduce motion”", "Fix"], life.map((x) => `<tr><td>${text(x.element)}</td><td>${text(x.moment)}</td><td>${text(x.pattern)}</td><td>${text(x.values)}</td><td>${text(x.reduced)}</td><td class="n">${x.fix ? `<a href="#${x.fix}">${x.fix}</a>` : ""}</td></tr>`))}` : ""}
  ${b.dontAnimate ? `<p><b>Should not be animated:</b> ${text(b.dontAnimate)}</p>` : ""}
  ${form(m)}
  ${stress(m)}
  ${m.images?.dark ? `<details><summary>Dark mode</summary>${image(m.images.dark, `${p.title} in dark mode`, "Dark mode, 1440 px")}</details>` : ""}
  ${l(m.ignored).length ? `<details><summary>Ignored by the plan: ${m.ignored.length}</summary><ul>${m.ignored.map((i) => `<li><code>${escape(i.metric)}</code>: ${escape(i.what)}. ${text(i.why)}</li>`).join("")}</ul></details>` : ""}
</section>`;
}

// ---------- the 404 page, not seen, method ----------

function notFoundPage() {
  const f = measurement.notFoundPage;
  if (!f) return "";
  if (f.notSeen) return `<section id="not-found"><h2>The 404 page</h2><p>An address that does not exist could not be opened: ${escape(f.notSeen)}</p></section>`;
  const checks = [
    [f.status === 404, "answers 404", `answers ${f.status} and not 404`],
    [l(f.h1).length > 0, "has a heading", "has no heading"],
    [f.linkHome, "has a link to the front page", "has no link to the front page"],
    [f.styled, "is styled", "has no styling"],
    [f.main, "has a main landmark", "has no main landmark"],
  ];
  const good = checks.filter(([ok]) => ok).map((c) => c[1]), bad = checks.filter(([ok]) => !ok).map((c) => c[2]);
  return `<section class="state" id="not-found">
  <div class="top"><h2>The 404 page</h2></div>
  <p>What the user meets at an address that does not exist. ${bad.length ? `${tag("Missing", "g")}The page ${bad.join(", ")}.` : ""} ${good.length ? `${bad.length ? "It" : "The page"} ${good.join(", ")}.` : ""}</p>
  ${image(f.image, "The 404 page at 1440 px", "1440 px")}
</section>`;
}

function notSeen() {
  const rows = [
    ...measurement.pages.filter((p) => p.notSeen).map((p) => [p.name, `Could not be measured: ${p.notSeen}`]),
    ...(rev.pages ? pages.filter((p) => !exists(p.layers[0]) && !exists(p.layers[2])).map((p) => [p.title, "Measured, but layers 1 and 3 have not been judged."]) : []),
    ...l(rev.notSeen).map((x) => [x.page, x.why]),
  ];
  return rows.length ? `<h3>Not seen</h3>${table(["What", "Why"], rows.map(([a, b]) => `<tr><td>${escape(a)}</td><td>${text(b)}</td></tr>`))}` : "";
}

function method() {
  const conditions = measured.map((m) => m.performance?.conditions).find(Boolean);
  const ignored = measured.reduce((n, m) => n + l(m.ignored).length, 0);
  const items = [
    `The pages were opened in a real browser on ${date(measurement.measured)} at <code>${escape(measurement.base)}</code>, at 1440, 390 and 320 px wide.`,
    measurement.mode === "quick" ? "This is a quick measurement. INP, stress tests, double press, the 404 page and reloading with “reduce motion” were skipped." : "",
    "Layer 2 is measured. A group only fails on numbers with a published limit; the rest of the numbers are evidence for the review.",
    rev.pages ? "Layers 1 and 3 were judged by agents from screenshots, code and measurement. The findings were verified before they were included, but the scores are a judgement." : "",
    conditions ? `Speed was measured on one machine (${escape(conditions)}). It is a pointer, not the users' real numbers.` : "",
    "axe only finds some accessibility errors. A clean result does not mean the page is accessible; it has not been tried with a screen reader.",
    "The measurement cannot see drag and drop, nor what happens on a slow or broken network.",
    ignored ? `${plural(ignored, "thing was", "things were")} ignored by the plan. They are listed with a reason under each page.` : "",
    ...l(rev.limits).map(text),
  ].filter(Boolean);
  return `<section id="method">
  <h2>Not seen, and what the measurement does not cover</h2>
  ${notSeen()}
  <ul>${items.map((p) => `<li>${p}</li>`).join("")}</ul>
</section>`;
}

// ---------- the page ----------

const tab = rev.tab || `${product} review`;
const lede = rev.subtitle || `${plural(measured.length, "page", "pages")} opened and measured in a real browser. Each page gets three scores: does it work, does it hold up, and is it delightful.`;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(tab)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Bricolage+Grotesque:opsz,wght@12..96,600&display=swap">
<style>
/* Layout: one reading column. Overview and fixes at the top, then one section per page with images, three scores, findings and suggestions. */
:root{
  --bg:#f3f5f8; --surface:#ffffff; --ink:#15181f; --muted:#4d5360; --line:#d6dae2;
  --accent:#2a48d8; --accent-tint:#e7ebfb;
  --bad:#a4261b; --bad-tint:#fbe9e6; --warn:#7a5200; --warn-tint:#fbf0d2; --ok:#17603a; --ok-tint:#e2f3e8;
  --display:"Bricolage Grotesque","IBM Plex Sans",system-ui,sans-serif;
  --sans:"IBM Plex Sans",system-ui,-apple-system,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --bg:#12141a; --surface:#1b1e26; --ink:#eceef3; --muted:#a8aebb; --line:#333845;
  --accent:#8fa2ff; --accent-tint:#232a4d;
  --bad:#ff9d91; --bad-tint:#43201c; --warn:#f0c868; --warn-tint:#3d3113; --ok:#7fd3a2; --ok-tint:#16361f; color-scheme:dark } }
:root[data-theme="dark"]{
  --bg:#12141a; --surface:#1b1e26; --ink:#eceef3; --muted:#a8aebb; --line:#333845;
  --accent:#8fa2ff; --accent-tint:#232a4d;
  --bad:#ff9d91; --bad-tint:#43201c; --warn:#f0c868; --warn-tint:#3d3113; --ok:#7fd3a2; --ok-tint:#16361f; color-scheme:dark }
*{ box-sizing:border-box; }
body{ margin:0; background:var(--bg); color:var(--ink); font-family:var(--sans); font-size:16px; line-height:1.55; padding:40px 16px 72px; }
main{ max-width:920px; margin:0 auto; display:flex; flex-direction:column; gap:44px; }
h1,h2,h3{ font-family:var(--display); text-wrap:balance; line-height:1.15; margin:0; }
h1{ font-size:clamp(30px,5vw,44px); letter-spacing:-0.02em; }
h2{ font-size:26px; letter-spacing:-0.01em; }
h3{ font-family:var(--sans); font-size:13px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
p{ margin:0; max-width:66ch; }
a{ color:var(--accent); }
a:focus-visible,summary:focus-visible,.frame:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; }
.meta{ font-family:var(--mono); font-size:13px; color:var(--muted); max-width:none; }
.lede{ font-size:18px; color:var(--muted); }
.weak{ color:var(--muted); }
header,section{ display:flex; flex-direction:column; gap:16px; min-width:0; }
.note{ border-left:3px solid var(--accent); background:var(--accent-tint); padding:14px 16px; }
.wrap{ overflow-x:auto; }
table{ border-collapse:collapse; width:100%; min-width:520px; font-variant-numeric:tabular-nums; background:var(--surface); border:1px solid var(--line); }
th,td{ text-align:left; padding:10px 14px; border-bottom:1px solid var(--line); vertical-align:top; }
th{ font-size:12px; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); font-weight:600; }
td.n{ font-family:var(--mono); white-space:nowrap; }
tr:last-child td{ border-bottom:0; }
.score{ font-family:var(--mono); font-weight:500; font-size:18px; white-space:nowrap; }
.state{ background:var(--surface); border:1px solid var(--line); padding:24px; gap:20px; }
.state > .top{ display:flex; flex-wrap:wrap; justify-content:space-between; align-items:baseline; gap:8px 16px; }
.layers{ display:flex; flex-wrap:wrap; gap:8px; }
.layers span{ font-family:var(--mono); font-size:13px; border:1px solid var(--line); padding:4px 10px; }
.layers b{ font-weight:500; font-size:15px; }
.shots{ display:grid; grid-template-columns:minmax(0,2.88fr) minmax(0,1fr); gap:12px; align-items:start; }
figure{ margin:0; display:flex; flex-direction:column; gap:6px; min-width:0; }
figcaption{ font-family:var(--mono); font-size:12px; color:var(--muted); }
.frame{ max-height:560px; overflow:auto; border:1px solid var(--line); background:var(--bg); }
.frame img{ display:block; width:100%; height:auto; }
li figure{ margin-top:10px; max-width:320px; }
.last{ max-width:640px; }
.last.narrow{ max-width:300px; }
ul{ margin:0; padding-left:20px; display:flex; flex-direction:column; gap:12px; max-width:70ch; }
code{ font-family:var(--mono); font-size:.88em; overflow-wrap:anywhere; }
.tag{ display:inline-block; font-size:12px; font-weight:600; padding:1px 8px; margin-right:6px; white-space:nowrap; }
.b{ background:var(--bad-tint); color:var(--bad); }
.g{ background:var(--warn-tint); color:var(--warn); }
.f{ background:var(--accent-tint); color:var(--accent); }
.l{ background:var(--ok-tint); color:var(--ok); }
.n{ color:var(--muted); box-shadow:inset 0 0 0 1px var(--line); }
td.n{ box-shadow:none; color:inherit; }
.fix,.choice,li > .meta{ display:block; margin-top:4px; }
.fix{ color:var(--muted); }
.fix::before{ content:"Suggestion: "; font-weight:600; color:var(--ink); }
.fix.decided::before{ content:"Decided: "; }
.choice{ color:var(--accent); }
.good li::marker{ color:var(--ok); }
details{ border:1px solid var(--line); }
summary{ cursor:pointer; padding:10px 14px; font-weight:600; font-size:14px; }
details > .wrap{ border-top:1px solid var(--line); }
details > ul,details > figure{ padding:12px 14px 14px 34px; border-top:1px solid var(--line); max-width:none; }
details > figure{ padding-left:14px; }
details table{ border:0; font-size:14px; }
.fail{ color:var(--bad); font-weight:600; }
.pass{ color:var(--ok); }
@media (max-width:560px){ .shots{ grid-template-columns:1fr; } .shots figure:last-child{ max-width:280px; } .state{ padding:16px; } }
</style>
</head>
<body>
<main>
<header>
  <p class="meta">${escape(product)} · page review in three layers · ${date(measurement.measured)}${measurement.mode === "quick" ? " · quick measurement" : ""}</p>
  <h1>${escape(rev.title || `Review of ${product}`)}</h1>
  <p class="lede">${text(lede)}</p>
  ${rev.note ? `<p class="note">${text(rev.note)}</p>` : ""}
</header>
${[overview(), beforeAfter(), customerSection(), fixesSection(), acrossSection(), aiLook(), ...pages.map(pageSection), notFoundPage(), method()].filter(Boolean).join("\n")}
</main>
<script>
// Tables and images larger than their frame must be scrollable with the keyboard.
function scrollables() {
  for (const r of document.querySelectorAll(".wrap, .frame")) {
    const scrolls = r.scrollWidth > r.clientWidth + 1 || r.scrollHeight > r.clientHeight + 1;
    if (scrolls) { r.tabIndex = 0; r.setAttribute("role", "group"); r.setAttribute("aria-label", (r.dataset.name || "Table") + ", scrollable"); }
    else { r.removeAttribute("tabindex"); r.removeAttribute("role"); r.removeAttribute("aria-label"); }
  }
}
addEventListener("load", scrollables);
addEventListener("resize", scrollables);
document.addEventListener("toggle", scrollables, true);
</script>
</body>
</html>
`;

const file = join(OUT, "report.html");
writeFileSync(file, html);
const leftOut = [...new Set(measured.flatMap((m) => [m.images?.desk, m.images?.mobile]))].filter((f) => f && !images.has(f)).length;
console.log(`Wrote ${file}: ${plural(pages.length, "page", "pages")}, ${plural(open.length, "open fix", "open fixes")}, ${Math.round(html.length / 1024)} kB.${rev.pages ? "" : " No review.json, so layers 1 and 3 are missing."}${leftOut && !options["no-images"] ? ` ${leftOut} screenshots could not be included.` : ""}`);
