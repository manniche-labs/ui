# Changelog

Newest first.

## 1.2.1 — 2026-10-22

- **The scroll walk no longer reports deliberate translucency.** Tried on a real page, a stamp kept at 80% opacity at every stop was reported as "never shows up". An element with the same opacity of at least 0.5 at every stop is now treated as design. A "Sent" stamp that only appears after a form still looks like a reveal that never fires and belongs in `ignore`; the checklist says so. The clean test page has a muted note as a counter-test (it fails without the fix).

## 1.2.0 — 2026-10-22

- **The scroll walk.** The measurement now scrolls each page from top to bottom (up to 24 stops, 250 ms each, desktop and phone) and looks for two things Tab and screenshots miss. **Dead scroll:** a stretch where the page moves by at least a quarter of a screen and the picture does not change (a pinned section that never plays). **Content that never shows up:** an element that stands on screen at every stop where it belongs and is never seen (opacity under 0.9, hidden, or under a fifth of it visible), for example a reveal that waits for an observer that never fires. It is judged where the element would stand without any transform, so a slide-in that never runs still counts. Carousels, tickers, fixed bars, closed panels and skip links are left out. A second pass with reduced motion only looks at what was not already missing, and fails Calm.
- **Focus on something transparent.** A stop in the Tab walk whose effective opacity is under 0.85 now counts (`keyboard.focusTransparent`) and fails Keyboard.
- New metrics: `deadScroll`, `neverShows`, `neverShowsReduced`, `focusTransparent`. Errors fails on the first two, Calm on the third and Keyboard on the last. Contact sheets of the walk (`<page>-walk.png`, `<page>-walk-mobile.png`) go in the report and are not cut into slices.
- `"scrollWalk": false` on a page in the plan switches the walk off. `--quick` skips it. Both show as "not measured".
- Five new test pages (`scroll-clean`, `-dead`, `-missing`, `-reduced`, `-invisible`). The self-test has 483 checks (39 new). The scroll-walk idea comes from the MIT-licensed scroll-craft verify checklist.

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
