# Changelog

## 2026-10-07

### Added

- Six gallery building blocks from the "control desk" design, for the coming /lab gallery. Each has a demo that shows its edge states with example data, keeps 44 px targets, animates only transform and opacity, and stands still under reduced motion. Every visible string comes through `labels`.
  - `badge`: the small label for free, pro, new, category and demo data.
  - `gallery-card`: a poster card (or a drawn fallback with the name) with a loop video on hover or focus, and one link stretched over the card that is described by its tier and description. `onOpen` opens a detail view on a plain click; Cmd, Ctrl and middle click keep the link.
  - `filter-bar`: a tier switch (All, Free, Pro, New, keys 1–4) and a scrolling category row. Both are real links, so it filters without JavaScript, and focus stays on the chosen link.
  - `preview-stage`: a preview frame with a width switch (320, 768, 1440) that scales to fit, light and dark, reload, open in a new tab, and loading and error states. W and T work only with focus inside, and announce the change.
  - `locked-code`: the locked view of a Pro file, with a blurred placeholder stub, the unlock link and price, and the CLI and MCP commands to copy.
  - `command-search`: a search field that opens a Cmd+K palette with grouped results, a preview pane, Cmd+Enter to copy the install line, and a no-results state with suggestions.
  - Single-key shortcuts (`/`, 1–4, W, T) can be turned off with `shortcuts={false}`, which also hides their hints.
- Registry metadata: `npm run meta` writes `meta.tier`, `added`, `usedIn`, `props` and `extends` into `registry.json` from the code and git history, and `--check` fails when it is out of date. `meta.a11y` (keyboard, screen reader and motion notes) is written by hand; the six new components have it. `npm run lab` now carries these fields to the site.
- `meta.parts` for kits: a file that exports several components without one main component (`chart-kit`) gets a props list per part, and `npm run lab` carries it to the site.
- `meta.a11y` for every component and template: keyboard, screen reader, motion and other notes, written from the code and checked sentence by sentence against it. Gaps found on the way are listed for a later fix, not described as features.
- Every visible and spoken string can be translated: `labels` on `tool-approval`, `code-block`, `marquee`, `toast`, `command-palette`, `sheet`, `hold-to-confirm`, `tag-picker`, `onboarding-checklist`, `card-swipe`, `deployment-card`, `shop-landing`, `pricing-page`, `store-dashboard` and `sign-in-page`, new keys on `signature-pad`, `event-reminders`, `ai-action-bar` and `trade-ticket`, and `savingLabel` on `save-toggle`.
- `continuous-tabs`: `children` renders the active tab's content in a built-in tab panel wired to its tab, `id` sets the base for the tab and panel ids, and a tab's `panelId` points at a panel you render yourself.
- `shop-landing`: `onAddToBag` is called with the product when its button is pressed.
- `store-dashboard`: the sales bars are one Tab stop with arrow keys, Home and End, the bar in focus shows its tooltip and is read out, and `barsHint` tells screen readers how.
- `StaticPlots` in `chart-kit` and `STATIC_STEPS` in `use-chart`: a chart in a static file is rendered at a phone, column, tablet and desktop width, and its own container shows the one that fits. `StaticChartFrame` takes an optional `height`.
- `npm run deps` checks that every import in a registry file is declared as a dependency of its item.
- `npm run meta` lists props that come in alternatives (a visible `label` or an `aria-label`), and reads defaults from a local function that takes the same props type when the component only passes its props on.
- `meta.a11y` notes are complete for all 132 items, and every prop has a description.

### Changed

- `switch` must have a name: pass `label`, `aria-label` or both. The types refuse a switch with neither.
- `continuous-tabs` and `marquee`: `label` is required, so the tab list and the region always have a name.
- `marquee` has a pause button next to the strip, and `className` now goes on the outer region that holds both. Under reduced motion the button is gone.
- `text-reveal`: unlit words are at 50% opacity (was 20%), so they keep enough contrast to read as large text.
- `data-tile`: on an inverted tile, the success and destructive colours are pulled further towards the text colour, so a `DeltaPill` keeps 4.5:1 in light and dark.

### Fixed

- `command-search` counts one hit in the singular: "1 hit of 7" in the footer and "1 of 1 hit" on a group, with the new labels `hitOf` and `groupHit`.
- `gallery-card` shows the drawn poster when a server-rendered image failed before React was listening, so `onError` never fired.
- Tap targets of 44 px on small buttons and links across the free components and templates, with an invisible hit area where the visible size stays.
- Ids come from `useId`, so two copies of a component on one page no longer share ids.
- Reduced motion: the last colour, size and position transitions now stand still, and spinners stop.
- Static template files: `area-chart` and `bubble-chart` fill their tile at every width instead of one fixed width.
- `dot-matrix`: each dot sits in the middle of its column, over the column name, at every width.
- `deployment-card`: each step is read as its name and status, without a stray space, and shows one focus outline.
- `confirm-dialog` demo: the delete button keeps its contrast on hover.
- `notification-stack`: a new notification is read out once, and the same words twice in a row are read again.
- `tag-picker`: focus follows a tag when it moves between the lists, and the move is announced.
- `tool-approval`: focus moves to the result after you approve or deny.
- `integration-card`: Escape closes the open card, and focus moves into it only when it opens, not on every render. The connected chip keeps 4.5:1 on its green tint in light mode.
- `account-home`, `business-finance`, `currency-wallet` and `wallet-dashboard`: the tiles under the h1 have h2 headings, and the transaction lists in them h3 day headings, so the outline skips no level.
- `transaction-list`: each day is a group named by its heading, not a region, so two lists on a page no longer fill the landmark list.
- `data-tile`: text on primary inside an inverted tile, such as the now pill in `week-schedule`, keeps 4.5:1 in light mode as well as dark.
- `spend-control`: a frozen card is muted through its colours instead of 60% opacity, so its text keeps 4.5:1.
- `bar-chart`: the label row has the card's colour behind it, so contrast checkers no longer read the hidden bars as its background.
- `dot-matrix` and `lollipop` demos: the tiles have different titles, so their regions have different names.
- `footer-status` demo: the second, narrowest footer sits in a section, so the page has one footer landmark.
- Template HTML for the lab: a template with a demo is rendered through it, so `footer-slim` is no longer an empty shell. Charts inside a `StaticChartFrame` start at 640 px, count as drawn and scale with their viewBox, so `area-chart`, `bar-chart`, `bubble-chart` and `sparkline` are no longer empty in the static files. Classes with `'` or `&` (the dial's grid areas) are read unescaped, so `rental-portfolio`'s dial keeps its layout.

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

- `donut` takes a `target` (#39): a mark across the ring where the goal falls, the centre reads the progress ("92% of target") and the ring's name adds the target for screen readers. A target above the sum widens the ring, so the empty part is what is left to go. `centre` replaces the centre content when nothing is active. New labels `target` and `ofTarget`.
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

- `changelog-page` no longer scrolls sideways at 320 px (#41): below 640 px the subscribe link is an icon button of 44 px with its name kept for screen readers. Found in a WebKit pass over all 35 templates and 26 widgets at 1440 and 320 px; the rest were clean.
- `npm run lab`: templates that need data are exported to HTML through their demos, so the export no longer stops at the Tiles templates.
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
