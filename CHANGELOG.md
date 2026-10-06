# Changelog

## 2026-10-06

### Added

- Four contact sections in the Tiles language (#27): `contact-channels` (a tile per channel with its response time, and a FAQ), `contact-form` (topic, character count, optional consent and an info tile), `contact-offices` (local time and an open or closed signal in words per office) and `contact-people` (person cards with a team filter and an email to copy). Focus stays put while a form sends, and status changes are announced to screen readers.
- Seven footer sections in the Tiles language (#28): `footer-columns` (link columns and a newsletter tile), `footer-desk` (a contact person and office clocks), `footer-sitemap` (link groups that fold on a narrow box), `footer-slim` (one row with a theme switch), `footer-statement` (one large closing line), `footer-status` (a service status chip and the version) and `footer-tiles` (address, opening hours with an open-now signal, and links). Each adapts to its own box rather than the viewport, keeps 44 px targets, and is a <footer> landmark with a heading for screen readers.
- Four finance templates in Tiles (#32), each with a demo and example data: `wallet-dashboard` (balance, a stack of payment cards, cash flow, a spending donut and subscriptions), `account-home` (a payment card, balance, a three-state dial and transactions), `currency-wallet` (a currency switch, rewards that name the next tier, a spending donut and allocation bars) and `business-finance` (income against payments, a growth ring against target, a stock sparkline, activity and a checklist). Amounts follow `locale` and `format`.
- Five more templates in Tiles (#31), each with a demo and example data: `rental-portfolio` (portfolio figures, income against payouts, a rent-collection dial and transfers), `delivery-board` (client progress, a day strip that opens on today, roadmap lanes and an assistant tile), `people-ops` (hiring funnel, today's schedule, payroll and an attendance matrix), `health-overview` (vitals, a patient card, a score dial and calorie bars) and `gallery-shop` (side menu, counters, events and collections with optional pictures).
- Six page sections from phase 6 (#26), each with a demo and example data: `bento-features` (a bento grid with one inverted lead tile), `bento-metrics` (figures that roll in once on first view and are final at once under reduced motion), `bento-product` (a media tile that cross-fades between variants), `bento-steps` (numbered steps joined by a line, with done, now and up next in words), `cta-band` (an inverted call-to-action band) and `cta-signup` (an email card with validation, a sending state and a confirmation; it sends nothing itself).
- Four dashboard templates built from the Tiles data primitives (#25): `spend-control` (company spend with virtual cards and a merchant bubble chart), `widget-wall` (thirteen widgets), `workspace-home` (search, offer, deals and the week's schedule) and `sales-floor` (target dial, live call card, bars per seller). Buttons on an inverted tile stay visible, tiles fill their row, and every demo uses example data.
- `HANDOFF.md`: phase 6 started; footers (#28) and bento + CTA (#26) are written as draft PRs, with what each still needs.
- `HANDOFF.md` updated after the lab export: phases 2–5 and the Tiles pass are live on mikkelmanniche.dk/lab (site PR #109), with how to deploy to /lab; the open browser checks for phase 5 are still open.
- `HANDOFF.md` and `plans/`: where the work stands after phase 5, and the briefs for phase 6 (17 page sections) and the 13 screen templates, with the approved Tiles mockup. Any machine can continue from the repo alone.
- Tiles data primitives: eleven charts and cards in one design language, each with a demo that shows a normal, a compact and an inverted tile. They share one tooltip, one display figure and one keyboard pattern (one Tab stop, arrow keys, Home, End, Escape), give screen readers a table or a list that is the data, animate only transform and opacity, and stand still under reduced motion. Every demo uses example data.
  - `chart-kit`: the shared parts: number formatting with a muted unit, nice axis ticks, a monotone smooth line, the tooltip, `BigNumber`, `DeltaPill`, `Pills` and `SrTable`, plus the `--chart-1` to `--chart-5` colours. `DeltaPill` shows the size of a change and lets the arrow carry its direction, so it never prints a sign.
  - `data-tile`: the tile they sit in, with `inverted` to lift the figure that matters most and `compact` for dense dashboards.
  - `bar-chart`, `area-chart`, `sparkline`, `dot-matrix`, `donut`, `dial`, `bubble-chart` and `lollipop` for figures over time, shares, ranks and grids. `bar-chart` groups day points into weeks when bars would get too thin.
  - `card-stack`, `transaction-list` and `week-schedule` for money and time. Week-schedule blocks are at least 44 px tall, so a 15-minute event stays easy to hit; a block too narrow for its title shows only its colour bar, and events outside the visible hours are left out.

### Changed

- Nine free components now share the Tiles look of the data tiles instead of the Instrument look. Surfaces are tiles with 26 px corners and a hairline shadow instead of a border; cards and pictures inside them get 14 px corners; buttons are round, muted and 44 px; and `--primary` is kept as a signal. The effects, the motion and the public API are unchanged.
  - `notch-card`: 26 px corners and a 56 px notch with a 14 px turn, a round arrow button, and a tabular footer.
  - `accordion-gallery`: the strips show number pills instead of screws, and the open panel sits inset with 14 px corners.
  - `prompt-input`: a tile with no border, round attach, send and stop buttons, and pill-shaped file chips. The halo is unchanged. In Windows high contrast (forced colors) the form gets a real border and a Highlight outline on focus, because box-shadow is dropped there.
  - `moving-border`: 26 px corners on an opaque hairline base. The demo uses the display font and pill buttons.
  - `curve-carousel` and `post-carousel`: round controls, 14 px cards, a rounded rule, and a pill layout switch in the demo. The post is a tile with an inset picture.
  - `lens-strip`, `sand-edge` and `wave-ribbon`: the shaders draw 14 px card corners (was 3–6 px), with round buttons and a rounded rule.

### Removed

- `dot-globe`, `focus-frame`, `pill-to-card`, `keycap`, `glass-button` and `folder-card` have moved to Manniche UI Pro and are no longer in the free registry. Their files, demos and registry entries are gone, and so is the Natural Earth notice, which only `dot-globe` used. Copies you have already installed keep working.

### Fixed

- `dot-matrix`: on the top rows the tooltip opens below the cell, so it no longer covers the tile's title and figure.
- `donut`: long legend names wrap instead of being cut off.
- `data-tile`: `headingLevel` sets the title's heading level (default 3), so a page without an `h2` above its tiles keeps a sound outline.
- `bubble-chart`: a tooltip opened by hover now closes on Escape without moving the pointer (WCAG 1.4.13).
- `Pills` in `chart-kit`: segments are 44 px tall (were 36 px), so they meet the touch target size.
- `week-schedule`: the day strip fits seven days at 320 px, so Sunday is no longer pushed out of view. Days stay 44 px tall.
- `spend-control` and `workspace-home`: the last colour transitions are gone; only opacity, transform and filter animate.
- `curve-carousel` and `post-carousel`: slides that arrive after the first render now show. Before, the carousel stayed empty or unpositioned until the window was resized.

### Added

- Three WebGL carousels on the carousel engine, each with a demo of twelve landscape prints drawn as SVG (`gl-pictures.ts`, no files to fetch). Each uses one WebGL context, draws only while something moves, shows one still frame under reduced motion, and falls back to a DOM carousel driven by the same engine without WebGL or when the GPU drops the context. The DOM slides are always there for screen readers, and pictures that arrive after the first render are picked up.
  - `lens-strip`: pictures slide behind a fixed lens of thick glass. The lens magnifies the picture in it, bends the image at its bevelled rim with faint colour fringes, and adds a little dispersion and smear with speed. Without `loop`, the caption stays on the end picture while the strip is pulled past it.
  - `sand-edge`: the middle picture is solid and its neighbours erode into fine sand in their own colours. The grains blow off on a wind set by the strip's speed and settle to a weathered edge at rest. `shimmer` lets loose grains drift while on screen.
  - `wave-ribbon`: pictures on a long ribbon that undulates gently in depth, with neighbours receding into fog in the theme's background. A fast drag deepens the wave a little. Its fallback is the same ribbon in CSS 3D.
- `use-gl-stage`: the hook under the three. It runs a WebGL scene in a fresh canvas with a pixel cap, reads theme colours live, loops only on screen, and releases the context on teardown or failure. `glAtlas` packs pictures into one mipmapped texture with gutters, within 2048 px by default. `glProgram` logs why a shader failed.
- `curve-carousel`: cards on a curve in ten layouts: `fan`, `arc`, `coverflow`, `cylinder`, `curl`, `helix`, `double-helix`, `rolodex`, `shingle` and `bulge` (a row that bulges towards you while it moves fast). Each layout is a pure function from a card's distance to a pose, so you can pass your own. Drag or swipe with momentum, sideways trackpad scroll, arrow keys, Home and End, buttons, or click a card. Frames are written straight to transform, opacity and filter, so React renders only when the card changes. Under reduced motion each move jumps.
- `post-carousel`: a post with pictures to swipe through; the one in view swings out and tucks in behind while its neighbour comes forward. Buttons on hover and on focus, always shown on touch screens, a dot that follows the position, and a counter.
- `use-carousel-engine`: the hook under both. Drag with momentum and rubber-band ends, trackpad, snapping, controlled or uncontrolled index, and ease-out-quint glides that start at the finger's speed. You draw each frame.
- Eight components in a shared "Instrument" style (hairlines, small radii, short mechanical motion with a hard stop), each with a demo:
  - `focus-frame`: a rangefinder frame that steps through a sentence and pulls one word into focus; follows the pointer and the arrow keys.
  - `pill-to-card`: an avatar pill that morphs into a profile card (FLIP) as a dialog; Escape or a click outside folds it back.
  - `glass-button`: a glass lens in a bevel that magnifies whatever sits behind it.
  - `keycap`: a mechanical key with travel, pointer tilt and an optional latch.
  - `folder-card`: a folder whose front slides down while the drawing inside rises.
  - `notch-card`: a card with a cut corner whose image blooms from grey into colour.
  - `accordion-gallery`: a rack of modules where one opens and the rest close to labelled strips, moved only with transforms; stacks vertically when narrow.
  - `dot-globe`: a dotted globe on a canvas from an embedded Natural Earth land mask (public domain, noted in THIRD_PARTY_NOTICES.md), with drag momentum, arrow keys and a lon/lat readout. Pauses off screen; still under reduced motion.
- `prompt-input`: `halo` runs a band of primary light round the border while there is something to send. Off by default.
- `moving-border`: `variant="iridescent"` lights the whole ring with thin-film hues around `--primary`. The default is unchanged.
- `shader-backdrop`: a moving WebGL background in seven families (mesh, swirl, halftone, metal, aurora, flame, cells) with 55 named looks, or your own colours through `colors`. One still frame under reduced motion; pauses off screen; CSS gradient until the first frame or without WebGL. The `cells` border distance is based on Inigo Quilez's MIT-licensed "Voronoi - distances", credited in the file and in THIRD_PARTY_NOTICES.md.
- `gravity-grid`: dots or grid lines that bend towards the pointer like a gravity well, light up around it and settle when it leaves. Static under reduced motion.
- Demos for both. Their radio groups take one tab stop, and the arrow keys move the choice.

### Changed

- `prompt-input`: Stop and Send now have separate keys, so React swaps the element instead of turning Stop into a submit button mid-click (a click on Stop could send the prompt again). The colour transitions on the form and the attach button are gone; only opacity, transform and filter animate.
- `liquid-metal` stayed blank in React StrictMode and after a remount: the effect ran twice on the same canvas, and a canvas whose WebGL context was lost cannot get a new one. Each effect run now makes a fresh canvas. If the shader fails to link, the context is now released at once instead of waiting for garbage collection, since browsers only keep about 16 per page.
- README: the ten new components and the three WebGL carousels, the component count (61 was out of date; now 81) and a note on the limit of about 16 WebGL contexts per page.

### Removed

- Nothing.
