# Changelog

Newest first.

## 1.1.1 — 2026-10-08

- **The report no longer scrolls sideways on a phone.** A screenshot in a list item could be 16 px wider than the item, and a long word quoted from a stress test could not wrap. Images in lists now fit their item, and text in the page sections wraps anywhere. Found in a real review at 390 px.

## 1.1.0 — 2026-10-06

- **`scripts/gather.mjs`.** Merges the agents' answers (`answer-*.json`) and the blind customers' logs (`customer-*/customer-log.json`) into a draft of `review.json` and `fixes.json`: the pages from both layers, findings with ids by severity (layer 1 before layer 3), life cards that point to their fix, and customers with their folder. It warns about unknown pattern names, Upgrade outside layer 3, customers without a result, and findings from two answers that point to the same lines (possible duplicates). It never overwrites an existing review or fix list without `--replace`. SKILL.md (step 4) and the README mention it.
- **Six rules for dangerous actions in layer 1, item 6 (feedback on actions).** Hold to delete small things, buttons that say verb and thing, the destructive button away from the "OK" place with focus on the safe one, red only for destructive actions, a danger zone at the bottom, and soft deletion with a deadline and a restore button. Points to the matching Manniche UI components.
- The self-test has 444 checks (17 new for `gather.mjs`).

## 1.0.0 — 2026-10-03

First release in English.

- The skill, its templates, prompts, scripts, report and self-test are written in English. Files, flags, JSON keys and IDs have English names: `scripts/measure.mjs`, `--out`, `--check`, `--quick`, `measurement.json`, `fixes.json`, `review.json`, fixes as F1, F2 and so on.
- The browser's default language in a measurement is `en-US`. Set `locale` in the plan to change it.
- The test pages and examples use neutral themes (a shop, a library).
- The measurement, the blind customer, the fix list, the three-variant preview, the fix prompt, before and after, and the report work as in the earlier Danish version. The self-test has 427 checks.
