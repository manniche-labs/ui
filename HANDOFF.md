# Handoff: Manniche UI (manniche-labs/ui)

Updated 2026-10-06 in the evening by the Windows steering session, for the Work Mac on 7/10. Everything the next session needs is in this repo; nothing depends on files on the Windows machine.

## The plan

The scrolltide-inspired plan for Manniche UI, built in our own **Tiles** design language (Mikkel's choice, 6/10). Never copy scrolltide's names, copy or code.

| Phase | What | Status |
|---|---|---|
| 1–4 | Effects, carousel engine, WebGL carousels, late slides | Merged (#12, #15, #16, #17, #18) |
| Pro move | Six components moved to Manniche UI Pro | Merged (#19) |
| 5 | Tiles data primitives: chart-kit, data-tile + 11 primitives | Merged (#21). Live on mikkelmanniche.dk/lab (site PR #109) |
| Tiles pass 2–4 | Nine phase 2–4 components restyled to Tiles | Merged (#20); live on /lab |
| Templates | 13 screen templates built from the phase 5 primitives | **All 13 merged 6/10**: dashboards #25, the rest #31, finance #32. Not on /lab yet |
| 6 | 17 page sections (footers, bento, CTA, contact) | Bento + CTA merged (#26). Footers draft #28 and contact draft #27 are being finished by a separate session; see their PR bodies |

Not on /lab yet: #25, #26, #31 and #32 (and #27, #28 and #34 once merged). Deploying needs Mikkel's yes.

## Open PRs

- **#34 `fix-primitiver`** (draft): primitive fixes found in the template browser passes. These are bubble-chart closing on Escape after hover, `Pills` at 44 px, week-schedule fitting 7 days at 320 px, and two colour transitions removed. Local CI is green. If it is still a draft, check those four things in the browser (see Shared QA setup) and merge it.
- **#28 `fase-6-footers`** and **#27 `fase-6-kontakt`**: drafts. When they are ready, the lead adds registry items, README rows and CHANGELOG entries, then merges.

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

## Remaining primitive issues (not in #34)

Fix these in the primitive itself, each with a CHANGELOG entry under Fixed:

- `lollipop`: the overlay overlaps at 320 px.
- `dot-matrix`: the tooltip on the top row covers the title.
- `bubble-chart`: labels collide at 320 px.
- `donut`: needs a target or centre prop, and legend names are truncated.
- `data-tile`: uses `h3` with no `h2` above it in the demos; let the caller choose the heading level.
- `preview.css` asks for `/assets/fonts/inter-latin.woff2`, which does not exist (404 in the preview only).
- WebKit/Safari has not been tested at all. The Mac can do this.

## Next steps on the Mac, in order

1. `git fetch`, `gh pr list`, and read this file. Check whether #34, #28 and #27 are merged.
2. Merge what is left, one PR at a time, as described above.
3. Run a Safari pass of the templates and primitives, then fix the primitive issues listed above.
4. Build the `/lab/ui/pro` page on the site (it gives a 404 today); Stripe is set up in sandbox (79 €, introductory price 49 € until 31/12-2026).
5. Export to /lab and deploy **only after Mikkel's yes**.

## How to check

From `components/`:

```
npm run lint && npx tsc -p tsconfig.app.json --noEmit && npm run build && npx shadcn build
```

`npx shadcn build` writes `public/r/*.json`. Those files are tracked: commit them with every new or changed component, or `shadcn add` gives a 404 after publish.

## Deploying to /lab

From the site repo (mikkelmanniche.dk), after the site PR is merged: `server/udrul.sh` (dry run), then `server/udrul.sh --live`. Never the old `deploy-side.sh`: it deletes server files and uploads `server/`.
