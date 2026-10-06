---
name: page-critic
description: Reviews existing pages in a web app in three layers (does it work, does it hold up, is it delightful), measures them in a real browser, lets a blind customer try the task, and produces a report with scores, faults and concrete proposals for UI, animation and finish. Shows three variants of a visible fix before it is built, writes a prompt for whoever does the fixing, and measures again so the improvement shows in numbers. Use it for "review the pages", "UX review", "what can be better on this page", "make the page more polished", "does this look like AI" or before a launch.
---

# Page critic

Looks at the pages that already exist and says what should be fixed, and what could lift them from "fine" to something you show off. Does not build new pages from scratch.

`$PC` is the folder this file is in. `$OUT` is the measurement folder: a folder you choose yourself outside the app's repo, which you and the agents can read. If it is inside a repo, it must be in `.gitignore`. Write both as full paths in commands and in prompts to agents.

If it is only one page, the flow is the same with one group. Keep the plan small, but skip no steps.

## Three layers and a customer

| Layer | Question | Who answers | Score |
|---|---|---|---|
| 1. Does it work | Can the user complete their task without doubt? | Agent: screenshots, code and measurement | Ten items, 1 to 5 |
| 2. Does it hold up | Contrast, keyboard, fingers, narrow screen, speed, errors | `scripts/measure.mjs` in a real browser | 5 minus one per failing group |
| 3. Is it delightful | Typography, spacing, depth, states, motion, details | Agent: screenshots, CSS and measurement | Eight items, 1 to 5 |

Next to them stands **the blind customer**: a fresh agent that gets one goal and a browser and knows neither the code nor the measurement. It gives no score, only a result and the places where it stumbled.

Every page gets three scores. One overall score is never calculated. Items, thresholds, severity and what should not be reported are in `$PC/templates/checklist.md`. Read it before you gather the findings.

## Rules that apply all the way

- Change nothing in the app before the user has seen the report and said what should be built.
- Never measure against production. The measurement and the blind customer fill in and send forms. Use a local run or a demo with test data, and only a test account in the plan: it stands in plain text.
- Every finding has evidence: a screenshot, a measured number or a file with a line number. Without evidence it is left out.
- The agents' findings are claims, and the customer's words are a testimony. Verify them yourself in the image, the measurement or the code before they go on the list.
- Also say what is good. What works should not be redone.
- Proposals in layer 3 point to a specific element and give exact values. No general advice, no invented numbers.
- Deliberate demo content (demo banner, test data) is not a finding.
- The measurement folder is not committed and not shared. The copies of the pages (`*.copy.html`), the previews (`preview-*.html`), the customer's log and the screenshots can contain login links and information about people. The report has the screenshots in it: look through it before it is shared.

## Step 0: Set up (first time on a machine)

    cd $PC && npm install && npm test

Needs Node 20 or newer and Google Chrome. Without Chrome: run `npx playwright-core install chromium` in `$PC`, and set `PC_BROWSER=chromium` in the environment. That applies to every script. `npm test` measures the skill's own test pages and takes four to five minutes. If it does not pass, do not trust a measurement from that machine.

## Step 1: Map the pages

Find every page in the code (routes, page files, navigation), not only those in the menu. Write `$OUT/PAGES.md` with one row per page:

- The name the page gets in the plan, the address, and who sees it (everyone, logged in, admin).
- The page's one job in one sentence. If it cannot be written, that is a finding in itself.
- The kind: `showcase` (home page, landing page: visited rarely and should be remembered) or `tool` (login, forms, lists: visited often and should get out of the way). It decides how much motion the page can carry.
- States to be seen: empty, filled in, error, receipt, no access, open menu or dialog.
- The source files: the page's code and the CSS it uses. The agents get them.
- Deliberate demo content that should not count as findings.

Also note three things. The product's tone in two lines (e.g. "calm and trustworthy" or "playful and fast"): layer 3 judges by it. Where the design system is (tokens, component list, Figma). And whether the app has a lock against too many attempts (login, contact form), and how many it allows: every measurement sends the plan's forms, and the customer uses the same pool.

Split the pages into groups of four to six that belong together. States of the same page belong in the same group.

## Step 2: Measure

Write `$OUT/plan.json` from `$PC/templates/plan-example.json`: one entry per page and per state.

| In the plan | What |
|---|---|
| `base` | The address the pages are on, with `http://` or `https://` in front. |
| `login` | Steps run once. The session is used for every page. If they fail, no pages are measured. |
| `pages` | `name` (used in file names, and two pages may not have the same name) and `path`. Optional: `steps` that lead to the state; `"performance": false` on states that are not a fresh page load; `"errorState": true` when the state shows a form error without a `submit` step; `"inp": [selectors]` with extra things to press in the INP measurement. |
| `ignore` | What the measurement should disregard. Every entry has `metric` and `why`, and optionally `element` and `page`. |
| `locale` | The browser's language. The default is `en-US`. |
| `notFoundPage`, `impeccable` | `false` turns off the visit to an address that does not exist, and Impeccable's detector. The detector only runs when Impeccable is installed on the machine. |

A step is exactly one of: `goto` (path), `fill` (`[selector, value]`), `click` (selector), `submit` (selector on a form; submits without the browser's own validation, so the server's error display is seen), `press` (key), `wait` (selector or milliseconds) and `js` (code run in the page).

`ignore` is for what is there on purpose, not for what is tedious to fix. `metric` is the name of a metric in the measurement (the list is in `$PC/scripts/common.mjs`) or an AI-look rule written `aiLook:<rule>`. `element` is part of the element's name as the measurement writes it (`div.demo-banner "Demo"`). Without `element` the whole metric is set to 0 on the page. AI look is ignored per rule, never per element. What is ignored stands in the report with the reason.

    node $PC/scripts/measure.mjs --plan $OUT/plan.json --check
    node $PC/scripts/measure.mjs --plan $OUT/plan.json --out $OUT

The first only reads the plan and says whether it is valid. A plan with faults (a step with a typo, a metric that does not exist) is rejected with a reason before the browser starts. The second measures.

- `--base <address>` uses the same plan against another address: first the demo, then a local run with the fixes.
- `--quick` skips what takes time: two of the three speed runs, INP, the stress tests, double click on submit, the not-found page, the reload with "reduce motion" and Impeccable. Use it while the plan is taking shape, and for pages you do not own. The report builds on a full measurement.

The run gives per page `<name>-desk.png` (1440 px), `<name>-mobile.png` (390 px), possibly `<name>-dark.png` and images from the stress tests, `<name>.copy.html` (the page as the browser saw it) and, for all pages together, `measurement.json`. If there was a `measurement.json` already, it is moved to `measurement-previous.json`.

The image of a long page is too tall to read in one piece: shown at once it is scaled down, and the text cannot be read. So the measurement cuts the tall images into slices itself, in `$OUT/slices/` as `<image>-1.png`, `-2.png` and so on from top to bottom. Two slices in a row share 100 px, so nothing is only half seen. `node $PC/scripts/slices.mjs --out $OUT` cuts them again, e.g. in a measurement folder from before.

Read what the run prints before you go on:

- **The status code** for every state. An error state typically gives 400, a receipt 200. If the code is something else, the image is not the state you asked for.
- **429** means the app's lock has kicked in. Wait until it has expired, and run again. Count beforehand: every run sends every form in the plan once. The double-click test holds its requests back in the browser and does not count.
- **NOT SEEN:** fix the plan, and run again. If the page cannot be reached, it stands in the report as not seen, never as passed.
- **"matched nothing":** an entry in `ignore` is misspelt or no longer needed. Fix it, or remove it.

Look through every image yourself, the tall ones in their slices. If it does not show the state `PAGES.md` promises, the plan is wrong, and so are the numbers.

What the measurement cannot see is tried by hand in a browser when the page has it: drag and drop, embedded frames, content that only comes on scroll, long flows across several pages, arrow keys in tabs and menus, and how an animation actually feels.

## Step 3: Judge

Start in the same message, in the background, for every group:

- one agent with the prompt in `$PC/templates/agent-works.md` (layer 1), and
- one agent with the prompt in `$PC/templates/agent-polish.md` (layer 3).

Fill in `<…>` in the prompts from `PAGES.md`. The two kinds of agents must not see each other's answers. They must be able to read files, look at images and run `node`, and they do not open the pages themselves. The answers land in `$OUT/answer-layer1-<group>.json` and `$OUT/answer-layer3-<group>.json`.

Also start the blind customer with `$PC/templates/agent-customer.md`: a fresh agent that only gets the prompt, one goal written in the customer's own words, and what the customer already knows. At least one customer on a phone (`--mobile`). Against a page with a lock, only one customer runs at a time, and not at the same time as a measurement. The log lands in `$OUT/customer-<name>/customer-log.json`.

Layer 2 needs no agent: the score is in `measurement.json`. `node $PC/scripts/extract.mjs --out $OUT --page <name> --layer 2` shows the numbers for one page with path and value, so they can be used as evidence. The extract also shows where the page's images and their slices are. A finding always points to the whole image's name, also when it was seen in a slice: the slices' numbers move when the page is measured again.

## Step 4: Gather the review and the fix list

Start by gathering the answers:

    node $PC/scripts/gather.mjs --out $OUT --product "<name>"

`gather.mjs` reads `$OUT/answer-*.json` and the customers' `customer-*/customer-log.json`, and writes a draft of `review.json` and `fixes.json`: the pages from both layers, the findings with ids by severity, life cards that point to their fix, and the customers with their folder. It warns about unknown pattern names, Upgrade outside layer 3, customers without a result, and findings from two answers that point to the same lines (possible duplicates). The draft is not verified. Correct the two files afterwards. `--replace` writes them from scratch.

1. **Verify.** Every finding is checked in the image, the measurement or the code. What does not hold is dropped. Two findings about the same thing are merged, and what recurs on several pages stands once with `"pages": "all"`.
2. **Write the findings in layer 2 yourself** from the numbers. A number alone is not a finding: point to the element, and say who it hits.
3. **`$OUT/fixes.json`** following `$PC/templates/fixes-example.json`. Every finding that holds gets an id (F1, F2 …), layer, severity (Blocker, Friction, Polish; Upgrade only in layer 3), finding, evidence, change, files and effort. If it can be measured, it gets `targets`: `{ "page", "metric", "atMost" }`. Choices that apply to the whole product (one button height, one curve) are written as system decisions (S1 …). The project's own rules for whoever does the fixing go in `rules`.
4. **Preview.** A finding that can be seen, and that has more than one good answer (an animation, a state, a surface), gets a `preview` with three variants: A calm, B medium, C clear. The variants are CSS, HTML and JavaScript on top of the copy of the page. Take the code from `$PC/templates/patterns.md` and the values from the life card.
5. **`$OUT/review.json`** following `$PC/templates/review-example.json`. For every page: `title`, `job` and `type` from `PAGES.md`, `layer1` and `layer3` from the agents, at most three things under `good`, the life cards and `dontAnimate`. In a life card, the agent's `finding` is replaced with `"fix": "F…"`. At the top: `summary`, `aiLook`, `customer` (the customer's log with `"folder": "customer-<name>"`), `notSeen` and `limits`.

Check the list:

    node $PC/scripts/fixes.mjs check --out $OUT

`check` says what is missing, and locks the "before" number on every target. A target that is already met is rejected: then it is not a finding.

## Step 5: The report

    node $PC/scripts/report.mjs --out $OUT

writes `$OUT/report.html`, one file: the overview with every page, worst first, and three scores per page; the customer; the fix list; what recurs across pages; AI look; every page with images, scores, numbers, life cards and what is ignored; the not-found page; and the method with its limits. The script rejects a review where an item is missing, or where a low score stands without a note. If there is a `measurement-previous.json` in the folder, the report shows before and after.

Publish it as an artifact, or open the file in a browser. Answer briefly in the chat: the three worst pages, the most important thing across pages, the three upgrades with the most effect for the effort, and the link. Do not rewrite the report in the chat.

## Step 6: Show and choose

For a fix with a preview:

    node $PC/scripts/preview.mjs --out $OUT --id F4

writes `$OUT/preview-F4.html`: the page as it is today and the three variants side by side, with a button that replays, a checkbox for "reduce motion" and the code for every variant. The copy of the page has no scripts. What the page does with JavaScript is recreated in `setup`, or "Before" does not show reality. Look at it yourself before the user gets it. When the user has chosen:

    node $PC/scripts/fixes.mjs choose --out $OUT F4 B

## Step 7: Fix

Ask what should be built. Three ways:

- **Fix it.** `node $PC/scripts/fixes.mjs prompt --out $OUT` writes `$OUT/fix-prompt.md`: the rules, the system decisions, every fix with evidence, change, place and "done when", the chosen variant's code, and the commands to verify. `--only F1,F4` takes only those. A fix waiting for a variant to be chosen is not built. The prompt can stand alone: give it to another session, or follow it yourself. One fix at a time, and one commit per fix with the id first.
- **Redesign it.** A page that must be rethought is not fixed in small pieces. Make two or three proposals as HTML mockups, show them, and only build after a yes.
- **Prompt for Figma.** Write a prompt from `$PC/templates/figma-prompt.md` that can stand alone.

Write down the choices made, and the findings deliberately not fixed, wherever the project keeps its decisions.

## Step 8: Measure again

After every round of fixes, locally or once they are deployed to the demo:

    node $PC/scripts/measure.mjs --plan $OUT/plan.json --out $OUT
    node $PC/scripts/compare.mjs $OUT
    node $PC/scripts/fixes.mjs status --out $OUT
    node $PC/scripts/report.mjs --out $OUT

`compare` shows every number before and after. `status` says for every fix whether it is solved, partial, unsolved or worse. A fix without targets stands as "needs a look": you decide it yourself from the images and write it in `fixes.json`. The report now shows before and after.

A number that got worse is fixed or explained before the round is over. Look through the new images yourself: a number can improve while the page gets uglier. Run the agents in layers 1 and 3 again on the changed pages once layer 2 passes. Stop when all three layers are at 4 or above, or when the user says it is good enough.

Only the latest measurement is kept as `measurement-previous.json`. If the first measurement is needed later (several rounds, a new session), copy `measurement.json` to a lasting place right away. Two files are compared with `node $PC/scripts/compare.mjs <before.json> <after.json>`, and the report compares with the file named `measurement-previous.json` in the folder. A measurement contains the pages' texts and addresses: look through it before it is committed.

## Files

| File | What |
|---|---|
| `scripts/measure.mjs` | Measures the pages in the plan and takes screenshots |
| `scripts/in-page.js` | The measurements that run inside the page |
| `scripts/common.mjs` | The names of the metrics, the groups in layer 2 and the limits |
| `scripts/extract.mjs` | What the measurement knows about one page, ordered by the checklist's items |
| `scripts/slices.mjs` | Cuts the tall screenshots into slices that can be read |
| `scripts/png.mjs` | Reads and writes PNG without packages; used for the slices |
| `scripts/browse.mjs` | The blind customer's browser, steered with words |
| `scripts/gather.mjs` | Merges the agents' answers and the customer logs into a draft of `review.json` and `fixes.json` |
| `scripts/fixes.mjs` | Checks the fix list, writes the fix prompt and keeps status |
| `scripts/preview.mjs` | A fix in three variants next to the page as it is |
| `scripts/report.mjs` | The report as one HTML file |
| `scripts/compare.mjs` | Before and after, number by number |
| `templates/checklist.md` | The three layers: items, thresholds, severity and sources |
| `templates/patterns.md` | 25 patterns for motion and states, with code |
| `templates/plan-example.json` | Example of a plan |
| `templates/fixes-example.json` | Example of a fix list |
| `templates/review-example.json` | Example of a review |
| `templates/agent-works.md` | Prompt for the agent in layer 1 |
| `templates/agent-polish.md` | Prompt for the agent in layer 3 |
| `templates/agent-customer.md` | Prompt for the blind customer |
| `templates/figma-prompt.md` | Template for a prompt Figma can build from |
| `test/run.mjs` | The self-test (`npm test`) |
