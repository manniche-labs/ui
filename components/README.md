# Manniche UI

Components for AI interfaces, everyday controls and calm motion, served as a [shadcn registry](https://ui.shadcn.com/docs/registry).
They use the standard shadcn tokens (`bg-card`, `text-muted-foreground`, `bg-primary` …), so they fit any shadcn project.

## Install a component

```bash
npx shadcn@latest add https://mikkelmanniche.dk/lab/r/prompt-input.json
```

Or add the registry once in `components.json`:

```json
{
  "registries": {
    "@manniche": "https://mikkelmanniche.dk/lab/r/{name}.json"
  }
}
```

and then `npx shadcn@latest add @manniche/prompt-input`.

## Use it from an agent (shadcn MCP)

With `@manniche` in `components.json`, run this in the project:

```bash
npx shadcn@latest mcp init --client claude
```

It writes `.mcp.json` with the shadcn MCP server. The agent can then list and search `@manniche`, read each component's source, get a usage example (`<name>-demo`, e.g. `toast-demo`) and the install command.

There is also a hosted MCP server just for this registry, with no key: `https://mikkelmanniche.dk/api/mcp`. See [mikkelmanniche.dk/lab/ui/mcp](https://mikkelmanniche.dk/lab/ui/mcp).

## Components

| Name | What it does |
|---|---|
| `prompt-input` | Chat input that grows with the text, takes files and turns into a stop button while the agent writes; optional `halo` lights the ring while there is something to send |
| `tool-approval` | Asks before the agent runs a tool, shows the arguments in full, marks risky calls |
| `agent-activity` | The agent's steps: waiting, running, done or failed, with timings |
| `streaming-response` | A reply as it is written, with a caret at the end |
| `reasoning` | The model's thinking, folded away; open while it thinks, closed when the answer starts |
| `code-block` | Code with a file name, optional line numbers and a copy button; bring your own highlighting |
| `sources` | Numbered citations after a claim and the list of sources they point to |
| `file-diff` | A change to one file from a unified diff, with line numbers and +/− |
| `number-ticker` | Counts up to a number when it scrolls into view |
| `blur-fade` | Fades an element up out of a soft blur the first time it enters the view |
| `toast` | Short messages that stack in a corner and leave on their own; `toast()` works from anywhere |
| `command-palette` | Searchable commands in a modal, opened with Cmd+K, on the native `<dialog>` |
| `sheet` | A panel from the bottom that can be dragged down to close |
| `shimmer-button` | Primary button with a slow sheen and an optional lean towards the mouse |
| `highlighter` | A marker stroke draws behind a phrase when it scrolls into view |
| `text-reveal` | Words go from half strength to full as the reader scrolls |
| `spotlight-card` | A card with a soft light that follows the mouse |
| `marquee` | Items scroll sideways in a loop, with a pause button, and pause on hover or focus |
| `dot-pattern` | A quiet dot grid behind content, CSS only |
| `rolling-number` | A number whose changed digits roll up or down |
| `stepper` | Plus and minus counter with rolling digits and arrow keys |
| `switch` | On and off switch whose knob stretches when pressed |
| `copy-button` | Copies a value; icon and label roll over to say it worked or failed |
| `timed-undo` | Delete button that counts down and can be undone first |
| `hold-to-confirm` | Fills while held and fires when full |
| `confirm-dialog` | Confirmation where both buttons name the action, the safe one has focus, red only for destructive ones, optional type-to-confirm |
| `danger-zone` | Red-framed last section of a settings page, one row per action that is hard to undo |
| `scheduled-deletion` | Banner for something deleted but still recoverable: final date, days left, restore |
| `glass-navbar` | Sticky top bar on frosted glass: full width, floating pill, or see-through until the page scrolls; solid with reduced transparency or more contrast |
| `tilt-card` | Card that tilts towards the mouse in 3D, with layers floating above it; flat on touch and under reduced motion |
| `flip-words` | One word in a sentence swaps for the next, pauses on hover, stops after a few rounds |
| `moving-border` | Frame with a light running round its border, plain CSS; `iridescent` variant runs thin-film hues round the ring |
| `hover-highlight` | Grid of cards where one highlight glides to the hovered or focused card |
| `tag-picker` | Pick tags from a pool; they fly into the box and back |
| `signature-pad` | Draw or type a signature, get a sharp PNG |
| `continuous-tabs` | Tab list with a sliding pill, arrow keys and an optional built-in tab panel |
| `pagination` | Previous and next with a rolling page number |
| `onboarding-checklist` | Collapsible getting-started card with progress |
| `event-reminders` | When and how people are reminded of an event |
| `opening-hours` | Opening hours per weekday, several ranges a day |
| `ai-action-bar` | Toolbar that morphs into a one-line prompt for the agent |
| `task-rows` | An agent's steps as rows: queued, running, done or failed, with details that fold out |
| `image-generation` | An image being made: a glow that sharpens into the result as progress rises |
| `voice-orb` | Orb for a voice assistant that reacts to state and loudness |
| `trade-ticket` | Buy or sell one of two outcomes, with the payout worked out as you type |
| `receipt-printer` | Checkout terminal; the receipt rolls out of the slot after payment |
| `cube-carousel` | Carousel on the sides of a cube, a quarter turn per step |
| `curve-carousel` | Cards on a curve in ten layouts (fan, arc, coverflow, cylinder, curl, helix, double helix, rolodex, shingle, bulge) with drag momentum, keys and trackpad |
| `post-carousel` | A post whose pictures swing out and tuck in behind each other as you swipe |
| `lens-strip` | Pictures sliding behind a fixed glass lens that magnifies the one in it and bends it at the rim with faint colour fringes (WebGL) |
| `sand-edge` | Carousel whose side pictures erode into sand that blows off with the strip's speed and settles to a weathered edge (WebGL) |
| `wave-ribbon` | Pictures on a ribbon that undulates in depth, neighbours fading into fog in the theme's background (WebGL, CSS 3D fallback) |
| `wave-loader` | A ball hops along bars and sends a spring wave through them |
| `jelly-slider` | Slider whose soft thumb stretches with drag speed |
| `notification-stack` | Notifications in a pile that fans out into a list |
| `cloud-drift` | Soft clouds drifting behind content, on a tiny canvas |
| `liquid-metal` | Flowing chrome surface from a small WebGL shader |
| `shader-backdrop` | Moving WebGL background in seven families (mesh, swirl, halftone, metal, aurora, flame, cells) and 55 named looks, or your own colours |
| `gravity-grid` | Dots or grid lines that bend towards the pointer and light up around it |
| `notch-card` | Card with a cut corner whose image blooms from grey into colour |
| `accordion-gallery` | Rack of modules that slide open with transforms; stacks vertically when narrow |
| `logo-grid` | Logos around a centre heading, for integrations or partners |
| `split-button` | A button that splits into a row of choices |
| `dock` | App icons that bounce when picked, with labels and arrow keys |
| `inline-edit` | Text that turns into a field in place; Enter saves, Escape cancels |
| `dialog-stack` | Modal with steps that stack behind each other, on the native `<dialog>` |
| `save-toggle` | Save button that shrinks to a spinner and pops a check |
| `morphing-button` | Button that grows into an email field |
| `feedback` | Thumbs up or down, then a short comment form |
| `step-indicator` | Bars per step with one tooltip that slides between them |
| `floating-input` | Text field with a floating label, hint and error, CSS only |
| `list-stack` | Cards in a pile that fan out into a list |
| `card-swipe` | Cards that turn away like pages as you swipe |
| `deployment-card` | Build status with an animated bar per step |
| `integration-card` | Integrations that open into a card with a connect button |
| `data-tile` | The tile a figure or chart sits in: name, control, figure, fine print; `inverted` lifts the one that matters, `compact` for dense dashboards |
| `empty-state` | Says something is empty: icon, title, one line, example labels and the action that starts things; dashed card or `plain` inside a tile, `live` after a search |
| `chart-kit` | Shared parts of the Tiles charts: number formatting, axis ticks, smooth line, one tooltip, the big display figure, change pill, pill switch, screen-reader table, static plots for HTML files |
| `bar-chart` | Column chart with round caps, today's dot, a pale comparison bar and automatic weekly buckets when bars get thin |
| `area-chart` | Smooth line over a soft tint, with a dashed comparison line and a crosshair tooltip that reads the difference |
| `sparkline` | Tiny trend line beside a figure or in a table cell, with a dot on the latest point |
| `dot-matrix` | A days × hours grid of dots that grow with the value, with a now cell and keyboard reading |
| `donut` | Ring of rounded segments with a centre figure and a legend list that light each other; optional target mark |
| `dial` | Segmented arc that lights up to a value, or a three-zone gauge with a needle; read-only or a slider |
| `bubble-chart` | Bubbles sized by value, on x/y axes or packed, with direct labels, a tooltip and keyboard stepping |
| `lollipop` | Ranked lollipop list: stems, big heads, ranks that stay with their row, sorting that slides |
| `card-stack` | Fanned payment cards: drag, tap or key the front one away and the next comes forward |
| `transaction-list` | Payments by day with the day's net; incoming, pending and failed shown with more than colour |
| `week-schedule` | A week by the hour: overlapping events in lanes, 44 px blocks, a now line, day tabs when narrow |
| `badge` | Small label for tier, category, new and demo data |
| `gallery-card` | Catalogue card: poster or drawn fallback, loop video on hover/focus, one stretched link |
| `filter-bar` | Tier switch (keys 1–4) and a scrolling category chip row; plain links without JS |
| `preview-stage` | Measured preview frame: width switch with ruler and shutters, scale to fit, light/dark, reload, open in new tab, loading and error states |
| `locked-code` | A locked Pro file: blurred stub, unlock link with price, and CLI/MCP commands to copy once you have a key |
| `command-search` | A search field that opens a Cmd+K palette, with grouped results, a preview pane and a no-results state with suggestions |
| `use-reduced-motion` | Hook: true when the visitor asked for less motion |
| `use-carousel-engine` | Hook: drag with momentum, trackpad, snapping and glides for your own carousel; you draw each frame |
| `use-gl-stage` | Hook: a WebGL canvas that handles its context, size, theme colours and pausing, plus a texture atlas for pictures |

Several of the newer components are adapted from [Watermelon UI](https://github.com/WatermelonCorp/watermelon-platform) (MIT). Each such file says so at the top; see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## Templates

Whole pages, built from the same tokens. Install one like a component, or download it from the site as one HTML file with all CSS built in, in six colours and light or dark: <https://mikkelmanniche.dk/lab/templates>. Every interaction in them (toggles, filters, menus, validation) is plain HTML and CSS, so the static file behaves like the React version.

| Name | What it is |
|---|---|
| `shop-landing` | Landing page for a homeware shop: hero, products, collections, story, reviews, FAQ, newsletter |
| `pricing-page` | Three plans with a monthly and yearly switch, comparison table, FAQ |
| `store-dashboard` | Shop admin with sidebar, KPI cards, revenue chart with a period switch, orders |
| `sign-in-page` | Split-screen sign-in and sign-up with passkey and inline validation |
| `changelog-page` | Release timeline with a filter, version index and subscribe form |
| `spend-control` | Company spend in Tiles: icon rail, virtual cards with limits, spending bars, merchant bubble chart |
| `widget-wall` | Thirteen Tiles widgets: highlight, trades, sparkline KPIs, dot matrix, profile ring, bars, lollipop |
| `workspace-home` | Workspace start page in Tiles: pill navbar, large search, offer tile, deal bars, week schedule |
| `sales-floor` | Sales team dashboard in Tiles: target dial, live call card, bars per seller, revenue donut |
| `bento-features` | Section: features as a bento grid of Tiles with one inverted lead tile |
| `bento-metrics` | Section: big figures that roll in on first view, with sparklines and change pills |
| `bento-product` | Section: a product with a media tile that cross-fades between variants, and its facts |
| `bento-steps` | Section: numbered steps joined by a line, with done, now and up next |
| `cta-band` | Section: an inverted call-to-action band with two actions and a fact line |
| `cta-signup` | Section: email signup card with validation, sending state and confirmation |
| `rental-portfolio` | Property dashboard in Tiles: portfolio figures, income vs payouts, rent-collection dial, transfers |
| `delivery-board` | Project board in Tiles: client progress, day strip, roadmap lanes, assistant tile |
| `people-ops` | People dashboard in Tiles: hiring funnel, today's schedule, payroll, attendance matrix |
| `health-overview` | Health dashboard in Tiles: vitals, patient card, score dial, calorie bars with macros |
| `gallery-shop` | Gallery and shop page in Tiles: side menu, two-tone headline, counters, events, collections |
| `wallet-dashboard` | Wallet in Tiles: balance, stack of payment cards, cash flow, spending donut, subscriptions |
| `account-home` | Account start page in Tiles: payment card, balance, three-state dial, transactions |
| `currency-wallet` | Multi-currency wallet in Tiles: currency switch, rewards, spending donut, allocation bars |
| `business-finance` | Business finance in Tiles: income vs payments, growth ring, stock sparkline, activity, checklist |
| `footer-columns` | Section: classic footer with link columns, a newsletter tile and a legal row |
| `footer-desk` | Section: inverted front-desk footer with a contact person and office clocks |
| `footer-sitemap` | Section: dense sitemap footer whose groups fold on narrow boxes |
| `footer-slim` | Section: one-row app footer with a theme switch and 44 px targets |
| `footer-statement` | Section: closing statement in an inverted tile with fluid type |
| `footer-status` | Section: product footer with a status chip, version and back to top |
| `footer-tiles` | Section: bento footer with address, opening hours and links |
| `contact-channels` | Section: contact channels with response times and a FAQ |
| `contact-form` | Section: contact form with topic, character count and an info tile |
| `contact-offices` | Section: office tiles with local time and open or closed signals |
| `contact-people` | Section: people grid with a team filter and copyable emails |

`npm run lab` writes the HTML files with `scripts/template-html.mjs`; the colours live in `src/template-theme.ts`.

## Rules every component follows

- Only `opacity`, `transform` and `filter` animate. Responses to an action take 300 ms or less.
- Easing is `cubic-bezier(0.23, 1, 0.32, 1)` (`ease-out-quint` in the theme).
- Touch targets are at least 44 px.
- Under `prefers-reduced-motion` everything is shown in its final state.
- No gradient text, glow or bounce.

Browsers keep about 16 WebGL contexts per page and drop the oldest beyond that. `liquid-metal`, `shader-backdrop`, `lens-strip`, `sand-edge` and `wave-ribbon` each use one and pause when off screen, so a page can hold a handful but not a grid of dozens.

## Dangerous actions

Six rules for anything that deletes or cannot easily be undone, and the component for each:

1. Small, frequent destructive actions are held, not confirmed in a dialog: `hold-to-confirm`.
2. Buttons name the verb and the thing (“Delete project” / “Keep project”), never “Yes”, “No” or “OK”: `confirm-dialog`.
3. The destructive button sits apart from where “OK” usually is, and the safe one has focus: `confirm-dialog`.
4. Red only for actions that destroy something. Everything else uses the primary colour.
5. Settings that destroy things sit together at the bottom, in a framed section with a heading: `danger-zone`.
6. Deleting is soft first. Seconds for a single item (`timed-undo`), days for accounts and projects (`scheduled-deletion`, 14 days by default).

## Work on it

```bash
npm install
npm run dev              # gallery at http://localhost:5173
npm run build            # type-check and build the gallery
npx shadcn build         # write the registry to public/r
```

Source files live in `registry/manniche/<name>/`, examples in `registry/manniche/examples/<name>-demo.tsx`. Add each new item and its demo to `registry.json`.
