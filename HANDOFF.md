# Handoff: Manniche UI (manniche-labs/ui)

Updated 2026-10-06 by the Work Mac session. Everything the next session needs is in this repo; nothing depends on files on the Mac.

## The plan

The scrolltide-inspired plan for Manniche UI, built in our own **Tiles** design language (Mikkel's choice, 6/10). Never copy scrolltide's names, copy or code.

| Phase | What | Status |
|---|---|---|
| 1–4 | Effects, carousel engine, WebGL carousels, late slides | Merged (#12, #15, #16, #17, #18) |
| Pro move | Six components moved to Manniche UI Pro | Merged (#19) |
| 5 | Tiles data primitives: chart-kit, data-tile + 11 primitives | Merged (#21). Live on mikkelmanniche.dk/lab with phases 2–4 and the Tiles pass (site PR #109, deployed 6/10) |
| 6 | 17 page sections (footers, bento, CTA, contact) | In progress (6/10). Footers 7/7 written: draft PR #28. Bento + CTA 6/6 written: draft PR #26. Contact (4): another session, PR #27. Brief: `plans/fase-6-sektioner.md` |
| Templates | 13 screen templates built from the phase 5 primitives | Not started. Brief: `plans/skabeloner.md` |
| Tiles pass 2–4 | Nine phase 2–4 components restyled to Tiles | Merged (#20, claude-a9, 6/10); live on /lab |

Progress on the plan: 5 of 7 parts merged (phases 1–5; phase 6 and the templates are left), about 71 %. The Tiles pass for phases 2–4 is counted by the session that owns it.

## Branches and PRs

- `main`: phases 1–5 plus the Tiles pass for phases 2–4 (merge commit 0e17f34)
- `fase-5-data-fliser`, PR #21: merged 2026-10-06. The branch can be deleted
- `tiles-fase-2-4`, PR #20: merged 2026-10-06. Owned by claude-a9; leave the branch for its owner to delete.
- `glass-navbar`, `lab-glas-og-effekter`: owned by other sessions. Do not touch.
- Old merged branches (`fase-2-effekter`, `fase-3-karrusel-motor`, `fase-4-webgl-karruseller`, `karrusel-sene-slides`) can be deleted later.

## Next steps, in order

1. Run `git fetch` and look at the open PRs and branches, so you do not build over another session. Then read `plans/fase-6-sektioner.md` and `plans/skabeloner.md`, and open `plans/tiles-mockup.html`.
2. **Phase 6** per `plans/fase-6-sektioner.md`. #28 (footers) and #26 (bento + CTA) have all sections written with oxlint and `tsc` clean, but none has been seen in a browser. Left on each: the browser pass (1440/500/280 px, light/dark, `&mini=1`, keyboard, reduced motion), `registry.json` entries + `npx shadcn build` + `public/r`, README, CHANGELOG, ManiLens. Known fix: `footer-sitemap` link hit areas overlap neighbouring rows by 6 px. Contact (`fase-6-kontakt`, #27) and the dashboard templates (`skabeloner-dashboards`, #25) belong to other sessions.
3. **Templates** per `plans/skabeloner.md`: three groups (finance, dashboards, the rest) on three branches.
4. Each PR: local CI, ManiLens (`/manilens-lokal`), CHANGELOG entry, then merge. Deploying to mikkelmanniche.dk/lab needs Mikkel's yes.

## What can run in parallel (separate sessions, no shared files)

| Session | Folders it writes | Branch |
|---|---|---|
| Footers (7) | `registry/manniche/footer-*/`, `examples/footer-*-demo.tsx` | `fase-6-footers` |
| Bento + CTA (6) | `registry/manniche/bento-*/`, `cta-*/` + demos | `fase-6-bento-cta` |
| Contact (4) | `registry/manniche/contact-*/` + demos | `fase-6-kontakt` |
| Templates (13, three groups) | `registry/manniche/<screen>/` + demos | one branch per group |

Shared files (`registry.json`, `components/README.md`, `CHANGELOG.md`, `public/r/`, `chart-kit/`, `data-tile/`, `src/`) are edited by one lead only, at merge time, one PR at a time. Building a PR regenerates `public/r/registry.json`, so rebase onto `main` and rebuild before each merge.

## How to check

From `components/`:

```
npm run lint && npx tsc -p tsconfig.app.json --noEmit && npm run build && npx shadcn build
```

`npx shadcn build` writes `public/r/*.json`. Those files are tracked: commit them with every new or changed component, or `shadcn add` gives a 404 after publish.

Preview: `npm run dev`, then `/preview.html?c=<name>` with `&full=1&mode=light|dark` or `&mini=1`.

## Deploying to /lab

From the site repo (mikkelmanniche.dk), after the site PR is merged: `server/udrul.sh` (dry run), then `server/udrul.sh --live`. Never the old `deploy-side.sh`: it deletes server files and uploads `server/`.

## Known open items

Phase 5 primitives, not yet checked in a browser:

- WebKit/Safari: not tested at all.
- Hover tooltips on `bubble-chart`, `dot-matrix` and `lollipop`; touch scrub; Escape closing a tooltip.
- Reduced-motion end state, compact density, and widths below 500 px (280–360 px containers).
- `dot-matrix`: centring of the active-cell ring, and the top-row tooltip covering the figure.
- `bubble-chart`: how the focus ring looks, and its scale-from-centre origin.

Check these when a template first uses the primitive, and fix them in the primitive itself.

A QA run on 6/10 could not check them: the shared Vite server lost its prebundled deps (`node_modules/.vite/deps` gone, `motion_react.js` 504). Start the dev server with `npx vite --force` before the next browser check. From code reading, reduced motion should pass for all 11 (no entry animations; donut, dial, lollipop, card-stack, transaction-list and chart-kit's digits check `prefers-reduced-motion`). Use the preview URL with `c=<name>`, not `c=<name>-demo`.
