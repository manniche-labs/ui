# page-critic

A Claude Code skill that reviews the pages a web app already has, measures them in a real browser, and helps make them properly good.

## What it does

Every page gets three separate scores. They are never averaged into one.

| Layer | Question | Who answers |
|---|---|---|
| 1. Does it work? | Can the user finish the task without doubt: copy, forms, states, feedback, wayfinding, mobile | An agent reading screenshots, code and the measurement |
| 2. Does it hold up? | Contrast, keyboard and focus, touch targets, narrow screens, form errors, console errors, LCP, CLS and INP, reduced motion | `scripts/measure.mjs` in a real browser |
| 3. Is it delightful? | Typography, spacing, depth, states for every element, the motion that exists and the motion that is missing | An agent reading screenshots, CSS and the measurement |

Around the three layers:

- **A blind customer.** A fresh agent with one goal and a browser it steers with words. It knows neither the code nor the measurement, and it shows where a first-time visitor gets stuck.
- **AI-look detection.** Rules for pages that look assembled from stock parts: gradient text, glow, glass cards, cards inside cards, the same entrance animation on everything.
- **A fix list.** Every finding has evidence (a screenshot, a measured number, or a file and line), a concrete change and, where possible, a target number that can be measured again.
- **Three variants before anything is built.** A visible fix, such as an animation or a pressed state, is shown as three variants next to the page as it is today, rendered on a copy of the real page.
- **A fix prompt.** The list becomes a self-contained prompt for the session that does the fixing.
- **Before and after.** Measure again and see, number by number and fix by fix, what was solved.
- **A report.** One HTML file with all of the above.

The recipe is in [SKILL.md](SKILL.md). The checklist with thresholds and sources is in [templates/checklist.md](templates/checklist.md), and the 25 motion patterns are in [templates/patterns.md](templates/patterns.md).

## Example report

[example/report.html](example/report.html) is a full report on the skill's own test pages: one page built with faults on purpose and one built without. Download the file and open it in a browser, because GitHub shows an HTML file as source.

The measurement in it is real. The scores for layers 1 and 3, the blind customer and the fix list are the hand-written example files in `templates/`, not an agent's verdict. The section with before and after is missing because the pages were measured only once. It appears when the output folder holds an older measurement.

To build it again, start the test pages with `node test/server.mjs 8799` and run this in another terminal:

    node scripts/measure.mjs --plan example/plan.json --out runs/example
    cp templates/review-example.json runs/example/review.json
    cp templates/fixes-example.json runs/example/fixes.json
    node scripts/report.mjs --out runs/example

## Requirements

- Node 20 or newer.
- Google Chrome. Without Chrome, run `npx playwright-core install chromium` in the skill folder and set `PC_BROWSER=chromium` in the environment.
- Claude Code for the full review. The measuring scripts run without it.

## Install

macOS and Linux:

    git clone <repo-url> ~/.claude/skills/page-critic
    cd ~/.claude/skills/page-critic
    npm install
    npm test

Windows (PowerShell):

    git clone <repo-url> "$env:USERPROFILE\.claude\skills\page-critic"
    cd "$env:USERPROFILE\.claude\skills\page-critic"
    npm install
    npm test

`npm test` measures the skill's own test pages in a real browser and takes four to five minutes. It ends with a line like `427 of 427 checks passed.` This version is tested on Windows 11. macOS and Linux have not been tried with it yet.

If you keep the repository somewhere else, link it instead: `ln -s "$PWD" ~/.claude/skills/page-critic`.

## Use

In Claude Code: `/page-critic`, or ask, for example "review the pages in this app".

The scripts also work on their own. A plan lists the pages and states to measure. See [templates/plan-example.json](templates/plan-example.json).

    node scripts/measure.mjs --plan plan.json --check
    node scripts/measure.mjs --plan plan.json --out ./measurement
    node scripts/report.mjs --out ./measurement

The first command checks the plan without starting a browser. The second measures every page and writes screenshots (1440 and 390 px), a copy of each page and `measurement.json`. A screenshot of a long page is also cut into slices in `slices/`, because a very tall image is scaled down when it is viewed and its text becomes unreadable. The third writes `report.html`. Run the second one again after fixing, and the previous measurement is kept for comparison.

| Script | What it does |
|---|---|
| `scripts/measure.mjs` | Measures the pages in the plan. `--base <url>` runs the same plan against another address, `--quick` skips the slow parts |
| `scripts/extract.mjs` | Prints what the measurement knows about one page, ordered by the checklist |
| `scripts/slices.mjs` | Cuts tall screenshots into slices that can be read at full size. The measurement runs it by itself |
| `scripts/browse.mjs` | The blind customer's browser: `start`, `click`, `type`, `press`, `scroll`, `finish` |
| `scripts/fixes.mjs` | Checks the fix list, writes the fix prompt, and tracks what is solved |
| `scripts/preview.mjs` | Shows one fix as three variants next to the page as it is |
| `scripts/report.mjs` | Writes the report as one HTML file |
| `scripts/compare.mjs` | Before and after, number by number |

## Limits

- The measurement and the blind customer fill in and submit forms. Run them against a local app or a demo with test data, never against production.
- The output folder can contain login links and personal data: page copies, screenshots and the customer's log. Do not commit it or share it.
- LCP, CLS and INP are lab numbers from one machine emulating a slow phone. They are not field data.
- axe-core finds only part of the accessibility problems. No axe errors does not mean the page is accessible, and nothing is tested with a screen reader.
- Drag and drop, iframes, content that appears on scroll, arrow keys inside tabs and menus, and how an animation actually feels have to be tried by hand.
- Pages are measured in Chrome or Chromium only. Firefox and Safari are not measured.

## Sources

The thresholds in layer 2 are published ones: WCAG 2.2, Apple's Human Interface Guidelines (44 pt touch targets), web.dev (Core Web Vitals) and axe-core. The rules for motion and detail are written with inspiration from Vercel's Web Interface Guidelines and Emil Kowalski's writing on animation. No text is copied. Where a rule is the skill's own choice, the checklist says so.

## License

MIT. See [LICENSE](LICENSE).
