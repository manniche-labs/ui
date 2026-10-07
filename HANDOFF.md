# Handoff: Manniche UI (manniche-labs/ui)

Updated 2026-10-07 by the Work Mac session (phase 1 of the /lab plan). Everything the next session needs is in this repo; nothing depends on files on the Windows machine.

## The plan

The scrolltide-inspired plan for Manniche UI, built in our own **Tiles** design language (Mikkel's choice, 6/10). Never copy scrolltide's names, copy or code.

| Phase | What | Status |
|---|---|---|
| 1–4 | Effects, carousel engine, WebGL carousels, late slides | Merged (#12, #15, #16, #17, #18) |
| Pro move | Six components moved to Manniche UI Pro | Merged (#19) |
| 5 | Tiles data primitives: chart-kit, data-tile + 11 primitives | Merged (#21). Live on mikkelmanniche.dk/lab (site PR #109) |
| Tiles pass 2–4 | Nine phase 2–4 components restyled to Tiles | Merged (#20); live on /lab |
| Templates | 13 screen templates built from the phase 5 primitives | **All 13 merged 6/10**: dashboards #25, the rest #31, finance #32. Not on /lab yet |
| 6 | 17 page sections (footers, bento, CTA, contact) | **All 17 merged 6/10**: bento + CTA #26, footers #28, contact #27. Not on /lab yet |

All seven parts of the plan are merged. Not on /lab yet: #25, #26, #27, #28, #31, #32, #34 and #35. Deploying needs Mikkel's yes.

## Open PRs

None. The primitive fixes are merged too: #34 (bubble-chart closes on Escape after hover, `Pills` at 44 px, week-schedule fits 7 days at 320 px, colour transitions removed) and #35 (dot-matrix tooltip opens below the top rows, donut legend names wrap, `data-tile` `headingLevel`). Both were checked in Chromium at 1440 and 320 px.

## How the lead merges (one PR at a time)

Only the lead edits `registry.json`, `components/README.md`, `CHANGELOG.md` and `public/r/`. Never force-push or rebase a shared branch: merge `origin/main` into it instead.

1. `git worktree add --detach ../ui-leadN origin/<branch>`, then `git merge --no-edit origin/main`.
2. Link `components/node_modules` from the main checkout (`ln -s` on the Mac, `mklink /J` on Windows) instead of a fresh install.
3. Add one `registry:block` item and one `registry:example` demo item per component, in the category the PR body names, and a README row per component.
4. Add the CHANGELOG bullet at the top of `### Added` (or `### Fixed`) under today's date.
5. Run local CI (below), commit, `git push origin HEAD:<branch>`, then `gh pr merge <n> --merge`.
6. Remove the link first, then `git worktree remove`.

## Shared QA setup

One Vite server and one browser per machine.

- Run the server from a detached worktree of `main` (`ui-qa`): `npx vite --force --port 5173 --strictPort`. Use `--force`, otherwise the prebundled deps can go missing (504 on `motion_react.js`).
- Copy the files a check needs into that worktree; do not start a second server.
- Preview: `/preview.html?c=<name>&full=1` (add `&mode=dark` or `&mini=1`). Use the component name, not `<name>-demo`.
- Browser lock: `mkdir ../.browser-laas` before you open a browser and `rmdir` it when you close it. Always close the browser in `finally`.

## Status after 7/10

- Phase 1 of the /lab plan (Notion: "Plan: /lab og Manniche UI Pro fra start til slut"): six gallery building blocks from Mikkel's chosen design, "Kontrolpulten" (bid 2): `badge`, `gallery-card`, `filter-bar`, `preview-stage`, `locked-code` and `command-search`. Phase 2 rebuilds the /lab gallery from them.
- `npm run meta` (`scripts/registry-meta.mjs`) writes `meta.tier`, `added`, `usedIn`, `props` and `extends` into `registry.json`. Run it after adding or changing a component; `--check` fails when it is stale. `meta.a11y` is hand-written; every component and template has it (7/10), and a new component needs it before merge. A kit without one main component (`chart-kit`) gets `meta.parts`, a props list per exported part.
- `scripts/template-html.mjs` renders a template through its demo when it has one, inside `StaticChartFrame` (from `chart-kit/use-chart.tsx`), so charts draw at 640 px in the static files. `area-chart` and `bubble-chart` use `StaticPlots` (in `chart-kit.tsx`) to carry four widths, and their container shows the one that fits. Leave the provider out of live apps.
- A11y gap round (7/10): every gap the `meta.a11y` notes listed is fixed, and every prop has a description. Breaking: `switch` needs `label` or `aria-label`; `continuous-tabs` and `marquee` need `label`. `npm run deps` checks that each import in a registry file is declared. Final check: axe (WCAG 2.2 AA and best practice) and console errors on every preview with a demo, in dark, real light and reduced motion at 1024 px, and sideways scroll at 375 px: the first pass over all 128 previews found 10 components with findings (contrast, heading levels, landmarks); all are fixed, and a second full pass found 0. Script: `.wt/huller/slut-akse.mjs` on the Work Mac (outside the repo).
- Not done: a11y notes for the 60 Manniche UI Pro components (`ui-pro`); /lab/ui/pro shows an empty state for them until then. Waiting on Mikkel's go.
- Not verified: Safari, real screen readers, FilterBar with JavaScript off in a browser, and the GalleryCard loop with a real video.

## Status after 6/10 evening

- WebKit (the Safari engine, via Playwright) has been run on all 35 templates and 26 widgets at 1440 and 320 px. Only `changelog-page` failed, and it is fixed (#41). `lollipop` and `bubble-chart` look right inside the templates at 320 px; there was nothing to fix.
- `donut` takes `target` and `centre` (#39, #40).
- /lab is deployed from 7733f59 (site PR #113), including /lab/ui/pro, which has noindex and a closed buy button until `PRO_KOEB_URL` holds the live payment link.

## Next steps

1. `git fetch`, `gh pr list`, and read this file. Nothing should be open.
2. Optional: check the templates in real Safari on the Mac (WebKit in Playwright is close to it, but not the same browser).
3. Figma: the free components go into Figma next, when Mikkel says so.
4. A11y notes for the Pro components in `ui-pro`, when Mikkel says so.
5. Pro at launch: put the live payment link in `PRO_KOEB_URL` (site `server/lab-pro-tekster.mjs`), run `node server/lab-sider.mjs .` and deploy.

## How to check

From `components/`:

```
npm run lint && npx tsc -p tsconfig.app.json --noEmit && npm run build && npx shadcn build && npm run meta -- --check && npm run deps
```

`npx shadcn build` writes `public/r/*.json`. Those files are tracked: commit them with every new or changed component, or `shadcn add` gives a 404 after publish.

## Deploying to /lab

From the site repo (mikkelmanniche.dk), after the site PR is merged: `server/udrul.sh` (dry run), then `server/udrul.sh --live`. Never the old `deploy-side.sh`: it deletes server files and uploads `server/`.

The 404 on `/assets/fonts/inter-latin.woff2` in local preview is expected: `preview.css` points at the site's self-hosted fonts, which exist on mikkelmanniche.dk.
