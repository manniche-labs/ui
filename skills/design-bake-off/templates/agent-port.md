# Prompt: port the winning entry into the app

Send it only after the user has said which entry to build. Use a `general-purpose` agent with `run_in_background: true`. Read the app's CSP, layout, routes and data layer before you fill in the prompt, so the constraints are exact.

```
Port the approved landing-page mockup "<NAME>" into the real <PRODUCT> app, faithful to every pixel and every motion, with real data. The port must lose NOTHING visually or in motion.

REPO: <PATH> (<STACK>). Create branch `<branch>`. Commit when done using the repo's git author config. Do NOT push or deploy.

MOCKUP (source of truth): <PATH>/<file>.html (+ -desk.png, -mob.png). Brand and data rules: BRIEF.md. Read the whole mockup first, then <THE APP'S RELEVANT FILES>.

HARD CONSTRAINTS
1. CSP: <copy the CSP>. If scripts are 'self'-only: serve the page JS as a static route from the app (cache-busted), replace CDN libraries with small self-written plain-JS versions, and pass data via data attributes or <script type="application/json"> with proper escaping (user-controlled strings!). Do not loosen the CSP.
1b. Components: <IF THE APP IS REACT + SHADCN: "Install the mockup's effects from the @manniche shadcn registry (`npx shadcn add @manniche/<name>`; each has a `<name>-demo` example) and style them with the app's tokens. Only write your own when no item fits." OTHERWISE DELETE THIS LINE>
2. Styles in <CSS LOCATION>, scoped so other pages are unaffected. If the global header or footer changes, screenshot every other page.
3. Real data, no invented numbers: map each mockup section to a real query (<section → function>). Anything the mockup fakes (e.g. a demo "send" with confetti) must not pretend on the real page; move it to the real success page. Every section needs an intentional empty state.
4. Progressive enhancement: complete and readable without JS, prefers-reduced-motion = static end state, no horizontal scroll at 390/768/1440, no console errors or CSP violations, keyboard + ARIA (combobox/listbox for the command palette, dialog for sheets), WCAG AA contrast.
5. Tests: keep existing ones green, update page tests, add tests for new routes or endpoints, the empty database and escaping. Run typecheck and tests.
6. Visual check: run the app locally, take headless screenshots at 1440 and 390, compare with the mockup, and iterate. Stop the dev server afterwards.
7. Update the changelog (not yet deployed). Match the repo's language and comment style.
8. Stay inside the repo and the scratch folder. Clean up temp files.

REPORT BACK (concise): files, how each effect was ported, deviations and why, test output, screenshot paths, commit hash, anything unverified.
```
