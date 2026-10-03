// A small server for the test pages. Used by test/run.mjs and can be started alone: node test/server.mjs [port]
//
//   GET  /faults       the page with known faults
//   POST /faults-form  answers 400 with the same page: no error message, and what was typed is gone
//   GET  /clean        the page without faults
//   POST /clean-form   answers 400 with the error reported, the field marked and what was typed kept
//   GET  /tight        the page that is fine at rest, but breaks with longer text
//   GET  /out          the page for the blind customer: links off the site, a new tab, things that cannot be seen
//   GET  /patterns     the pattern catalogue (templates/patterns.md) inserted into a page, so it can be measured
//   GET  /walk         a long, calm page for the Tab walk: more than 80 links, hidden menus, copies, columns and smooth scrolling
//   GET  /walk-faults  the counter-tests: focus that cannot be seen, is covered, is off screen, jumps back or is trapped
//   GET  /walk-long    a table with 640 cells that can take focus: more stops than the walk goes
//   GET  /visible      links that can be seen and links hidden in different ways: tests what the measurement counts as visible
//   anything else      404 as plain text
//
// Next to it, an extra server listens on its own port. It answers with a small stylesheet without CORS headers, whatever the path.
// Another port is another origin, so /walk loads a stylesheet the page may use, but a script may not read.

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(join(here, "pages", name), "utf8");
const safe = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function clean(value, withError) {
  return read("clean.html")
    .replace("{{title}}", withError ? "Error: Sign up" : "Sign up")
    .replace("{{value}}", safe(value))
    .replace("{{field}}", withError ? 'aria-invalid="true" aria-describedby="mail-error" autofocus' : "")
    .replace("{{error}}", withError ? '<p class="error" id="mail-error" role="alert">The address is missing a domain, e.g. name@example.com.</p>' : "");
}

// The code blocks in the pattern catalogue: all CSS and all JS, in the order they appear.
export function catalog() {
  const md = readFileSync(join(here, "..", "templates", "patterns.md"), "utf8");
  const blocks = [...md.matchAll(/^```(css|js)\n([\s\S]*?)^```$/gm)];
  const of = (lang) => blocks.filter((b) => b[1] === lang).map((b) => b[2]);
  return { css: of("css"), js: of("js") };
}

// The catalogue inserted into the test page. Every JS block gets its own scope, so two blocks can use the same name.
export function patterns() {
  const { css, js } = catalog();
  return read("patterns.html").replace("{{css}}", () => css.join("\n")).replace("{{js}}", () => js.map((b) => `{\n${b}}`).join("\n"));
}

// The long page: six sections with fourteen links in the middle of the sentences. That is 84 places to stop, more than the 80 presses the walk used to give up after.
const CHAPTERS = ["who may borrow", "what can be borrowed", "what cannot leave the house", "how a reservation is handled", "how long a loan may last", "how to complain"];
function walk(otherPort) {
  const sections = CHAPTERS.map((topic, k) => {
    const links = Array.from({ length: 14 }, (_, n) => `<a href="/walk#r${k * 14 + n + 1}">Rule ${k * 14 + n + 1}</a>`);
    return `<p>Chapter ${k + 1} is about ${topic}. It is in ${links.slice(0, -1).join(", ")} and ${links.at(-1)}, which are read in that order.</p>`;
  });
  return read("walk.html").replaceAll("{{other}}", String(otherPort)).replace("{{sections}}", () => sections.join("\n  "));
}

// The very long page: 128 weeks with five days in each. Every cell can take focus, so the page has 640 stops and two links, more than the 600 presses the walk goes.
function walkLong() {
  const weeks = Array.from({ length: 128 }, (_, w) => `<tr><th scope="row">${w + 1}</th>${Array.from({ length: 5 }, (_, d) => `<td tabindex="0">${(w * 7 + d * 3) % 10}</td>`).join("")}</tr>`);
  return read("walk-long.html").replace("{{weeks}}", () => weeks.join("\n      "));
}

export function start(port = 0) {
  const other = createServer((_, res) => { res.writeHead(200, { "content-type": "text/css; charset=utf-8" }); res.end(".from-other-origin { letter-spacing: 0; }\n"); });
  const server = createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    const html = (status, text) => { res.writeHead(status, { "content-type": "text/html; charset=utf-8" }); res.end(text); };
    if (req.method === "POST") {
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("end", () => {
        if (path === "/faults-form") return html(400, read("faults.html"));
        if (path === "/clean-form") return html(400, clean(new URLSearchParams(body).get("mail") || "", true));
        html(404, "Not found");
      });
      return;
    }
    // A stylesheet the page loads: a shorthand with var() and one of the shorthand's longhands on its own. The browser gives the other longhands back as empty.
    if (path === "/shorthand.css") { res.writeHead(200, { "content-type": "text/css; charset=utf-8" }); return res.end(".wide { border: 0 solid var(--edge, #767676); border-bottom: 0; }\n"); }
    if (path === "/faults") return html(200, read("faults.html"));
    if (path === "/clean") return html(200, clean("", false));
    if (path === "/tight") return html(200, read("tight.html"));
    if (path === "/patterns") return html(200, patterns());
    // The link off the site points to the same server under another host name (localhost instead of 127.0.0.1).
    if (path === "/out") return html(200, read("out.html").replaceAll("{{port}}", String(req.socket.localPort)));
    if (path === "/walk") return html(200, walk(other.address().port));
    if (path === "/walk-faults") return html(200, read("walk-faults.html"));
    if (path === "/walk-long") return html(200, walkLong());
    if (path === "/visible") return html(200, read("visible.html"));
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });
  server.on("close", () => { other.closeAllConnections(); other.close(); });
  return new Promise((ok) => other.listen(0, "127.0.0.1", () => server.listen(port, "127.0.0.1", () => ok(server))));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await start(Number(process.argv[2]) || 8799);
  console.log(`Test pages at http://127.0.0.1:${server.address().port}/faults and /clean`);
}
