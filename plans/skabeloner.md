# Screen templates: 13 full screens in Tiles (brief)

13 complete app screens for Manniche UI, built from the phase 5 Tiles primitives (merged in PR #21). They sit next to the existing `store-dashboard` template. Same quality bar as phase 6: "they must all be perfect, because we will use them ourselves for years".

The idea came from the screen gallery on scrolltide.co. Do not open, fetch or copy it. **The names below are our own and final; never use scrolltide's screen names or copy.** Build everything from scratch.

## Read first

- `plans/fase-6-sektioner.md`: the Tiles vocabulary, library rules, accessibility, robustness and demo-content rules. They all apply here too. Ignore its "17 sections" and "files you may touch" parts.
- `plans/tiles-mockup.html`: the approved Tiles mockup (open it at 1440 and 500 px).
- `registry/manniche/store-dashboard/store-dashboard.tsx`: house style for a template.
- The primitives in `registry/manniche/`: `chart-kit` (BigNumber, DeltaPill, Pills, ChartTooltip, formatValue), `data-tile` (DataTile, TileFact, TileLegend, inverted tiles), `bar-chart`, `area-chart`, `sparkline`, `dot-matrix`, `donut`, `dial`, `bubble-chart`, `lollipop`, `card-stack`, `transaction-list`, `week-schedule`.

## Rules for screens

- Each screen is one component `registry/manniche/<name>/<name>.tsx` plus `registry/manniche/examples/<name>-demo.tsx`. Category `templates` in `registry.json`.
- Compose the primitives; do not copy their code. When a screen needs something the primitives cannot do, stop and describe the missing prop instead of forking (the lead decides whether the primitive gets it).
- Typed props for all content (`data` per tile), `labels?` for UI strings, `now?: Date`. Demo data is invented, plainly example data ("Example data." visible on screen), never real brands, ratings or statistics.
- One inverted tile per screen at most. `--primary` is a signal only.
- 360–1440 px: a grid that reflows on container queries; on phones the most important tile comes first.

## The 13 screens

| Name | Category | Content |
|---|---|---|
| `rental-portfolio` | Property | Portfolio figures, income vs payout area chart, rent-collection dial, recent transfers |
| `delivery-board` | Projects | Client progress, date strip, roadmap lanes with initials avatars, a small assistant tile |
| `wallet-dashboard` | Finance | Balance, a fanned stack of three payment cards, cash flow, spending donut, subscriptions |
| `account-home` | Finance | Payment card, balance, a three-state dial, transactions |
| `currency-wallet` | Finance | Currency switch, rewards panel, spending donut, allocation bars |
| `business-finance` | Finance | Income vs payments, growth ring, stock sparkline, activity, verification checklist |
| `people-ops` | People | Hiring funnel, today's schedule, payroll list, attendance dot matrix |
| `health-overview` | Health | Three vital figures, patient card, score dial, calorie bars with macros |
| `gallery-shop` | Media | Vertical side menu, two-tone headline, counters, events, collections |
| `spend-control` | Dashboard | Icon rail, upsell panel, virtual cards, spending curve, bubble chart |
| `widget-wall` | Dashboard | 12 widgets: profile ring, lollipop, trades, team, sparklines, profit matrix (`trade-ticket` already covers one widget) |
| `workspace-home` | Dashboard | Pill navbar, large search field, offer tile, deals bars, week schedule |
| `sales-floor` | Dashboard | Segmented arc dial, live call card, performance bars, revenue by source |

## Order and split

Build in groups that touch different folders, so they can run in parallel sessions:

1. Finance: `wallet-dashboard`, `account-home`, `currency-wallet`, `business-finance`.
2. Dashboards: `spend-control`, `widget-wall`, `workspace-home`, `sales-floor`.
3. The rest: `rental-portfolio`, `delivery-board`, `people-ops`, `health-overview`, `gallery-shop`.

Each group is one branch and one PR. Only the lead edits `registry.json`, `README.md` and `CHANGELOG.md` (merge them one PR at a time to avoid conflicts).

## Verify

As in `plans/fase-6-sektioner.md`: tsc and oxlint clean; screenshots at 1440 and 500 in light and dark, `&mini=1` and a 360 px container; three design rounds; keyboard, reduced motion, no console errors, no horizontal scroll; only opacity/transform/filter in transitions.
