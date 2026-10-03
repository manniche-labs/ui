#!/usr/bin/env node
// Shows a fix before it is built: the page as it is today and three variants of the fix, side by side.
//
//   node scripts/preview.mjs --out <folder> --id F4 [--no-inline]
//
// Reads <folder>/fixes.json and the copy of the page (<page>.copy.html from the measurement) and writes <folder>/preview-F4.html.
// The variants are CSS, HTML and JavaScript laid on top of the copy. The app itself is not touched.
// The copy has no scripts. Whatever the page does with JavaScript today has to be recreated in "setup", or "Before" will not show reality.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { command, read, escape } from "./common.mjs";

const { options } = command(process.argv.slice(2), ["no-inline"]);
if (!options.out || options.out === true || !options.id || options.id === true) {
  console.error("Usage: node scripts/preview.mjs --out <folder> --id F4 [--no-inline]");
  process.exit(2);
}
const OUT = resolve(options.out);
const ID = String(options.id).toUpperCase();
const list = read(join(OUT, "fixes.json"));
const f = (list.fixes || []).find((x) => x.id === ID);
if (!f) { console.error(`${ID} is not in fixes.json.`); process.exit(1); }
const p = f.preview;
if (!p || (p.variants || []).length !== 3) { console.error(`${ID} has no preview with three variants. Run "fixes.mjs check".`); process.exit(1); }
const copyFile = join(OUT, `${p.page}.copy.html`);
if (!existsSync(copyFile)) { console.error(`Missing ${copyFile}. The measurement saves a copy of every page it reaches: run it, and check whether the page is listed as "NOT SEEN".`); process.exit(1); }

// ---------- make the copy self-contained ----------

// Fonts and images are fetched once and put into the file, so the preview also works somewhere that cannot fetch from the site.
const LIMIT = 1.5e6, CEILING = 10e6;
const TYPE = { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", avif: "image/avif", gif: "image/gif", svg: "image/svg+xml" };
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const fetched = new Map();
let used = 0, missing = 0;

async function get(address, asText) {
  if (fetched.has(address)) return fetched.get(address);
  let out = null;
  try {
    const answer = await fetch(address, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(10000) });
    if (answer.ok) {
      if (asText) out = await answer.text();
      else {
        const data = Buffer.from(await answer.arrayBuffer());
        const ending = new URL(address).pathname.split(".").pop().toLowerCase();
        const type = (answer.headers.get("content-type") || "").split(";")[0] || TYPE[ending];
        if (type && data.length <= LIMIT && used + data.length <= CEILING) { used += data.length; out = `data:${type};base64,${data.toString("base64")}`; }
      }
    }
  } catch { /* the site may be down; then the address stays */ }
  if (!out) missing++;
  fetched.set(address, out);
  return out;
}

async function replace(text, pattern, fn) {
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    parts.push(text.slice(last, m.index), await fn(...m));
    last = m.index + m[0].length;
  }
  return parts.join("") + text.slice(last);
}

async function inline(html) {
  const base = (html.match(/<base href="([^"]+)"/) || [])[1];
  // Style sheets from other domains (e.g. Google Fonts) could not be read in the browser and stand as @import. Fetch them as text.
  html = await replace(html, /@import url\("([^"]+)"\);/g, async (old, address) => {
    const css = await get(address, true);
    if (!css) return old;
    return css.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g, (a, u) => { try { return `url("${new URL(u, address).href}")`; } catch { return a; } }).replace(/<\/style/gi, "<\\/style");
  });
  html = await replace(html, /url\("(https?:[^"]+)"\)/g, async (old, address) => {
    const data = await get(address.replace(/&amp;/g, "&"));
    return data ? `url("${data}")` : old;
  });
  html = await replace(html, /<img\b[^>]*>/gi, async (tag) => {
    const src = (tag.match(/\ssrc="([^"]*)"/) || [])[1];
    if (!src || src.startsWith("data:")) return tag;
    let address;
    try { address = new URL(src.replace(/&amp;/g, "&"), base).href; } catch { return tag; }
    const data = await get(address);
    return data ? tag.replace(/\ssrcset="[^"]*"/, "").replace(/\ssrc="[^"]*"/, ` src="${data}"`) : tag;
  });
  return html;
}

let copy = readFileSync(copyFile, "utf8").replace(/\sautofocus(="[^"]*")?/gi, "");
if (!options["no-inline"]) copy = await inline(copy);

// ---------- the page ----------

const data = {
  id: f.id, page: p.page,
  width: p.width || 390, height: p.height || 720,
  crop: p.crop || null, padding: p.padding ?? 24,
  replay: p.replay || "load",
  setup: p.setup || "",
  shared: p.shared || {},
  variants: p.variants,
  copy,
};
const json = JSON.stringify(data).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, "");
const [kind, selector] = data.replay === "load" ? ["load", ""] : data.replay.split(/:\s*(.*)/s);
const WHAT_HAPPENS = {
  load: "The page loads from the start.",
  click: `${selector} is clicked.`,
  hover: `The mouse rests on ${selector}.`,
  focus: `Keyboard focus is put on ${selector}.`,
  press: `${selector} is pressed and released.`,
}[kind];
const code = (v) => [...(v.html || []).map((h) => h.html.trim()), v.css?.trim(), v.js?.trim()].filter(Boolean).join("\n\n");

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview ${escape(f.id)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Bricolage+Grotesque:opsz,wght@12..96,600&display=swap">
<style>
/* Layout: heading and buttons at the top, below them four panes (Before, A, B, C) in two columns; one column on narrow screens and for wide crops. */
:root{
  --bg:#f3f5f8; --surface:#ffffff; --ink:#15181f; --muted:#4d5360; --line:#d6dae2;
  --accent:#2a48d8; --accent-tint:#e7ebfb; --ok:#17603a; --ok-tint:#e2f3e8;
  --display:"Bricolage Grotesque","IBM Plex Sans",system-ui,sans-serif;
  --sans:"IBM Plex Sans",system-ui,-apple-system,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --bg:#12141a; --surface:#1b1e26; --ink:#eceef3; --muted:#a8aebb; --line:#333845;
  --accent:#8fa2ff; --accent-tint:#232a4d; --ok:#7fd3a2; --ok-tint:#16361f; color-scheme:dark } }
:root[data-theme="dark"]{
  --bg:#12141a; --surface:#1b1e26; --ink:#eceef3; --muted:#a8aebb; --line:#333845;
  --accent:#8fa2ff; --accent-tint:#232a4d; --ok:#7fd3a2; --ok-tint:#16361f; color-scheme:dark }
*{ box-sizing:border-box; }
body{ margin:0; background:var(--bg); color:var(--ink); font-family:var(--sans); font-size:16px; line-height:1.55; padding:40px 16px 96px; }
main{ max-width:1040px; margin:0 auto; display:flex; flex-direction:column; gap:28px; }
h1,h2{ font-family:var(--display); text-wrap:balance; line-height:1.15; margin:0; }
h1{ font-size:clamp(28px,4.4vw,40px); letter-spacing:-0.02em; }
h2{ font-size:20px; }
p{ margin:0; max-width:68ch; }
header{ display:flex; flex-direction:column; gap:12px; }
.meta{ font-family:var(--mono); font-size:13px; color:var(--muted); }
.lede{ font-size:18px; color:var(--muted); }
.toolbar{ display:flex; flex-wrap:wrap; align-items:center; gap:12px 20px; position:sticky; top:0; z-index:2; background:var(--bg); padding:12px 0; border-bottom:1px solid var(--line); }
button{ font:inherit; cursor:pointer; min-height:44px; padding:0 18px; border:1px solid var(--ink); background:var(--ink); color:var(--bg); font-weight:600; }
button.quiet{ background:transparent; color:var(--ink); border-color:var(--line); font-weight:500; }
button:focus-visible, input:focus-visible, summary:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; }
button:active{ transform:scale(.97); }
.toggle{ display:inline-flex; align-items:center; gap:10px; min-height:44px; cursor:pointer; }
.toggle input{ width:20px; height:20px; accent-color:var(--accent); }
.grid{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; }
.grid.wide{ grid-template-columns:minmax(0,1fr); }
/* Each pane shares rows with its neighbour, so the windows line up even when the texts differ in length. */
.pane{ background:var(--surface); border:1px solid var(--line); display:grid; grid-row:span 4; grid-template-rows:subgrid; gap:0; min-width:0; }
.pane.chosen{ border-color:var(--ok); box-shadow:0 0 0 1px var(--ok); }
.pane > .top{ display:flex; flex-wrap:wrap; align-items:baseline; gap:4px 12px; padding:14px 16px 0; }
.pane .letter{ font-family:var(--mono); font-size:13px; color:var(--muted); }
.pane > p{ padding:6px 16px 14px; color:var(--muted); font-size:15px; }
.window{ position:relative; overflow:hidden; margin:0 auto; width:100%; align-self:end; background:#fff; border-block:1px solid var(--line); }
.window iframe{ position:absolute; left:0; top:0; border:0; transform-origin:0 0; background:#fff; }
.pane > .bottom{ display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px 12px; padding:12px 16px; }
details{ flex:1 1 220px; min-width:0; }
summary{ cursor:pointer; font-size:14px; color:var(--muted); min-height:44px; display:flex; align-items:center; }
pre{ margin:0 0 4px; padding:12px; background:var(--bg); border:1px solid var(--line); font-family:var(--mono); font-size:12.5px; line-height:1.5; overflow-x:auto; white-space:pre; }
.answer{ position:fixed; left:0; right:0; bottom:0; background:var(--ok-tint); color:var(--ok); border-top:1px solid var(--ok); padding:14px 16px; text-align:center; font-weight:600; }
.answer[hidden]{ display:none; }
.answer code{ font-family:var(--mono); font-size:1.05em; }
@media (max-width:760px){ .grid{ grid-template-columns:minmax(0,1fr); } }
@media (prefers-reduced-motion: reduce){ button:active{ transform:none; } }
</style>
</head>
<body>
<main>
<header>
  <p class="meta">${escape(list.product || "")} · the page "${escape(p.page)}" · shown at ${data.width} px</p>
  <h1>${escape(f.id)}: ${escape(f.title)}</h1>
  <p class="lede">${escape(f.change)}</p>
  <p>Top left is the page as it is today. The other three are proposals, built on top of a copy of the page. Nothing has been changed in the app.</p>
</header>
<div class="toolbar">
  <button type="button" id="replay">Replay</button>
  <label class="toggle"><input type="checkbox" id="reduce"> Show with "reduce motion" turned on</label>
  <span class="meta">${escape(WHAT_HAPPENS)}</span>
</div>
<div class="grid" id="grid">
  <section class="pane" data-n="0">
    <div class="top"><span class="letter">Before</span><h2>As it is today</h2></div>
    <p>${escape(f.finding)}</p>
    <div class="window"><iframe title="Before" sandbox="allow-scripts allow-forms"></iframe></div>
    <div class="bottom"><span class="meta">Unchanged copy of the page</span></div>
  </section>
${data.variants.map((v, i) => `  <section class="pane" data-n="${i + 1}">
    <div class="top"><span class="letter">${escape(v.letter)}</span><h2>${escape(v.name)}</h2></div>
    <p>${escape(v.what)}</p>
    <div class="window"><iframe title="Variant ${escape(v.letter)}" sandbox="allow-scripts allow-forms"></iframe></div>
    <div class="bottom"><details><summary>See the code</summary><pre>${escape(code({ ...v, html: [...(data.shared.html || []), ...(v.html || [])], css: [data.shared.css, v.css].filter(Boolean).join("\n"), js: [data.shared.js, v.js].filter(Boolean).join("\n") }))}</pre></details><button type="button" class="quiet" data-choose="${escape(v.letter)}">Choose ${escape(v.letter)}</button></div>
  </section>`).join("\n")}
</div>
</main>
<p class="answer" id="answer" role="status" hidden></p>
<script type="application/json" id="pc-data">${json}</script>
<script>
(() => {
  const D = JSON.parse(document.getElementById("pc-data").textContent);
  const panes = [...document.querySelectorAll(".pane")];
  const reduce = document.getElementById("reduce");
  reduce.checked = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // What runs inside each pane. Written as a function and inserted as text.
  const inPane = (K) => {
    addEventListener("submit", (e) => e.preventDefault(), true);
    addEventListener("click", (e) => { const a = e.target.closest && e.target.closest("a[href]"); if (a) e.preventDefault(); }, true);
    // Hover, press and keyboard focus cannot be triggered from a script. So the rules get a twin with a class that can be set.
    const TWIN = [[/:hover/g, ".pc-hover"], [/:active/g, ".pc-active"], [/:focus-visible/g, ".pc-focus"]];
    const twins = (rules) => {
      for (let i = rules.cssRules.length - 1; i >= 0; i--) {
        const rule = rules.cssRules[i];
        if (rule.cssRules && rule.cssRules.length) twins(rule);
        if (rule.selectorText && /:(hover|active|focus-visible)/.test(rule.selectorText)) {
          let v = rule.selectorText;
          for (const [from, to] of TWIN) v = v.replace(from, to);
          try { rules.insertRule(rule.cssText.replace(rule.selectorText, v), i + 1); } catch (e) {}
        }
      }
    };
    for (const sheet of document.styleSheets) try { twins(sheet); } catch (e) {}
    const run = (js) => { if (js) try { new Function(js)(); } catch (e) { console.error(e); } };
    run(K.setup);
    const PLACE = { before: "beforebegin", after: "afterend", first: "afterbegin", last: "beforeend" };
    for (const h of K.html) {
      const el = document.querySelector(h.selector);
      if (!el) continue;
      if (h.where === "replace") el.outerHTML = h.html; else el.insertAdjacentHTML(PLACE[h.where] || "beforeend", h.html);
    }
    run(K.js);
    const measure = () => {
      const el = K.crop && document.querySelector(K.crop);
      if (!el) return parent.postMessage({ pc: "crop", n: K.n, missing: !!K.crop }, "*");
      // The pane scrolls itself. scrollIntoView can also scroll the page the pane sits in.
      const before = el.getBoundingClientRect();
      scrollTo(0, Math.max(0, before.top + scrollY - (innerHeight - before.height) / 2));
      const b = el.getBoundingClientRect();
      parent.postMessage({ pc: "crop", n: K.n, x: b.left, y: b.top, w: b.width, h: b.height }, "*");
    };
    // Not requestAnimationFrame: the browser does not run it in a pane that is off screen.
    measure();
    setTimeout(measure, 150);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    const parts = K.replay.split(/:\\s*(.*)/s);
    const play = () => {
      const el = parts[1] && document.querySelector(parts[1]);
      if (!el) return;
      if (parts[0] === "click") el.click();
      if (parts[0] === "hover") { el.classList.add("pc-hover"); setTimeout(() => el.classList.remove("pc-hover"), 1800); }
      if (parts[0] === "press") { el.classList.add("pc-hover", "pc-active"); setTimeout(() => el.classList.remove("pc-active"), 240); setTimeout(() => el.classList.remove("pc-hover"), 1000); }
      if (parts[0] === "focus") { el.classList.add("pc-focus"); el.focus({ preventScroll: true }); }
    };
    addEventListener("message", (e) => { if (e.data && e.data.pc === "replay") play(); });
  };

  // "Reduce motion" is made into something the page can toggle: the media query is swapped for one that is always or never true.
  const TRUE = "(min-width: 0px)", FALSE = "(max-width: 0px)";
  const motion = (text, reduced) => text
    .replace(/\\(\\s*prefers-reduced-motion\\s*:\\s*no-preference\\s*\\)/g, reduced ? FALSE : TRUE)
    .replace(/\\(\\s*prefers-reduced-motion\\s*(:\\s*reduce\\s*)?\\)/g, reduced ? TRUE : FALSE);

  function doc(n, reduced) {
    const v = n ? D.variants[n - 1] : null;
    const s = D.shared || {};
    const css = v ? [s.css, v.css].filter(Boolean).join("\\n") : "";
    const K = {
      n, crop: D.crop, replay: D.replay, setup: D.setup,
      html: v ? [...(s.html || []), ...(v.html || [])] : [],
      js: v ? [s.js, v.js].filter(Boolean).join("\\n;") : "",
    };
    const style = "<style data-pc-variant>" + css.replace(/<\\/style/gi, "<\\\\/style") + "</style>";
    const script = "<script>(" + inPane.toString() + ")(" + JSON.stringify(K).replace(/</g, "\\\\u003c") + ")</" + "script>";
    let h = D.copy;
    const head = h.lastIndexOf("</head>"), body = h.lastIndexOf("</body>");
    h = h.slice(0, head) + style + h.slice(head, body) + script + h.slice(body);
    return motion(h, reduced);
  }

  const crops = [];
  function fit(n) {
    const pane = panes[n], win = pane.querySelector(".window"), frame = pane.querySelector("iframe");
    const c = crops[n];
    const x = c ? Math.max(0, c.x - D.padding) : 0, y = c ? Math.max(0, c.y - D.padding) : 0;
    const w = c ? Math.min(D.width - x, c.w + 2 * D.padding) : D.width, h = c ? Math.min(D.height - y, c.h + 2 * D.padding) : D.height;
    win.style.maxWidth = w + "px";
    const k = Math.min(1, win.clientWidth / w);
    win.style.height = Math.round(h * k) + "px";
    frame.style.width = D.width + "px";
    frame.style.height = D.height + "px";
    frame.style.transform = "translate(" + (-x * k) + "px," + (-y * k) + "px) scale(" + k + ")";
  }
  const fitAll = () => panes.forEach((_, n) => fit(n));
  const widest = () => Math.max(...panes.map((_, n) => (crops[n] ? crops[n].w + 2 * D.padding : D.width)));
  const layout = () => { document.getElementById("grid").classList.toggle("wide", widest() > 520); fitAll(); };

  addEventListener("message", (e) => {
    if (!e.data || e.data.pc !== "crop") return;
    const n = panes.findIndex((p) => p.querySelector("iframe").contentWindow === e.source);
    if (n < 0) return;
    crops[n] = e.data.w ? e.data : null;
    layout();
  });
  addEventListener("resize", fitAll);

  function replay() {
    panes.forEach((pane, n) => {
      const frame = pane.querySelector("iframe");
      frame.onload = () => { if (D.replay !== "load") setTimeout(() => frame.contentWindow.postMessage({ pc: "replay" }, "*"), 450); };
      frame.srcdoc = doc(n, reduce.checked);
    });
  }
  document.getElementById("replay").addEventListener("click", replay);
  reduce.addEventListener("change", replay);

  const answer = document.getElementById("answer");
  document.querySelectorAll("[data-choose]").forEach((button) => button.addEventListener("click", () => {
    const text = D.id + ": " + button.dataset.choose;
    panes.forEach((p) => p.classList.toggle("chosen", p.contains(button)));
    answer.hidden = false;
    answer.innerHTML = "Reply <code>" + text + "</code> in the chat, and that variant gets built.";
    try { navigator.clipboard.writeText(text).then(() => { answer.innerHTML = "<code>" + text + "</code> is copied. Paste it into the chat."; }, () => {}); } catch (e) {}
  }));

  layout();
  replay();
})();
</script>
</body>
</html>
`;

const file = join(OUT, `preview-${f.id}.html`);
writeFileSync(file, page);
const kB = Math.round(Buffer.byteLength(page) / 1024);
console.log(`Wrote ${file} (${kB} kB${options["no-inline"] ? ", not inlined" : `, ${fetched.size - missing} files inlined${missing ? `, ${missing} could not be fetched` : ""}`}).`);
console.log(`Save the user's answer with: node scripts/fixes.mjs choose --out ${OUT} ${f.id} <A|B|C>`);
