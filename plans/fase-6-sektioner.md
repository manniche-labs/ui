# Phase 6: Tiles page sections (brief)

17 page sections for Manniche UI in the **Tiles** design language: 7 footers, 4 bento grids, 2 calls to action and 4 contact sections. Mikkel picked Tiles as the visual language of the whole library and wants the highest possible quality: "they must all be perfect, because we will use them ourselves for years". Every section must feel finished, in light and dark, at 280–1440 px.

Scrolltide.co, Aceternity and others were early inspiration. Do not open, fetch or search them, and do not copy anyone's code, names or copy. The concepts below are our own. Build everything from scratch.

This file is the shared brief for every agent or session that builds phase 6. It was written for three parallel agents (a: footers, b: bento + CTA, c: contact). Each family touches only its own folders, so the three can also run as three separate sessions.

## How to run it

- Branch from `main` after phase 5 (PR #21) is merged, one branch per family: `fase-6-footers`, `fase-6-bento-cta`, `fase-6-kontakt`. One PR per family.
- Machine limits: run at most one browser at a time across agents on the same machine (use a lock directory, `mkdir <lock>` / `rmdir <lock>`), one shared Vite dev server (`npm run dev` in `components/`), and no extra `npm run build` while agents work. Write code first, check with `npx tsc -p tsconfig.app.json --noEmit` and `npx oxlint <files>`, and only then open a browser.
- Screenshots: headless Chrome needs a viewport of at least 500 px; test 280–499 px by placing the section in a narrow container.
- Preview URLs: `/preview.html?c=<name>` (demo in a `max-w-xl` column), `&mini=1` (lab card), `&full=1&mode=light|dark` (full-bleed themed). Sections are wide; judge them mainly in `&full=1` at 1440 and 500 and in `&mini=1`.
- The Tiles mockup is `plans/tiles-mockup.html` (plain HTML/CSS/JS). Open it in a browser at 1440 and 500 px.
- The lead (the session that merges) registers the sections in `registry.json` (category `templates`), adds README rows and a CHANGELOG entry, runs local CI and ManiLens, and merges.

## The design language: Tiles

The reference is the approved Tiles mockup: `plans/tiles-mockup.html` (plain HTML/CSS/JS; open it in Chrome at 1440 and 500 px). It shows data tiles, not page sections, so you port its **vocabulary**, not its layouts:

- **Tiles:** quiet `bg-card` blocks with radius 26 px (inner elements 14 px), 1 px `--border` or none on a `--background` page, generous inner padding (24 px; 18 px compact), 12–16 px gaps between tiles. One tile per idea.
- **The inverted tile:** one tile per section may swap to the opposite theme to lift the most important thing. Use `DataTile`'s mechanism: read `registry/manniche/data-tile/data-tile.tsx` and reuse its `inverted` prop when the section is built from `DataTile`, or copy its token-swap pattern (outer snapshot + inner swap) locally when you need it on another element. Every token inside must follow.
- **Type:** big display lines and figures in `--font-display` with a fallback to the app font (see how `BigNumber` in `chart-kit.tsx` does it); never hard-code a font family. Small labels, codes, times, versions and numbers in mono tabular (`font-mono tabular-nums`), 11–12 px, muted. Body in the app font.
- **Pills:** the segment switch (`Pills` in `chart-kit.tsx`) for any either/or choice. Chips are small rounded-full labels in `--muted`.
- **Colour:** neutrals carry everything. `--primary` is a **signal only** (now, open, the one primary action, the selected value), never a large fill area except a single primary button. `--chart-1…5` only for categories and small marks. No gradients on text, no glow, no coloured shadows.
- **Restraint:** each section has one memorable idea (its signature), not effects everywhere.

Build on the library before inventing: `DataTile`, `TileFact`, `TileLegend` (data-tile), `BigNumber`, `Pills`, `DeltaPill`, `ChartTooltip` (chart-kit), and from phase 5 `Sparkline`, `AreaChart`, `BarChart`, `Dial` etc. in `registry/manniche/<name>/`. Look in `registry/manniche/` for controls you can reuse (`copy-button`, `floating-input`, `shimmer-button`, `rolling-number`, `continuous-tabs` …) and read their files before you use them. Read `components/README.md` (hard rules, "Dangerous actions", how descriptions are written) and `registry/manniche/pricing-page/pricing-page.tsx` and `store-dashboard/store-dashboard.tsx` for the house style of templates.

## What a section is

- A section is a full-width page block: `<footer>` for footers, `<section aria-labelledby>` for the rest, with a sensible max content width (e.g. `max-w-6xl mx-auto px-4 sm:px-6`) that can be overridden through `className`.
- It works from **280 px** to 1440 px wide and reflows deliberately (stack, collapse, reorder), never just squeezes. Use container queries (`@container` and `@min-[…]:`) so it adapts to the box it is placed in, not only the viewport. No horizontal scroll at any width.
- **Generic, typed props, not a hard-coded page.** Every visible string, link list, person, office etc. comes from props with a typed shape and JSDoc. Defaults are allowed only for UI strings (`labels?` for i18n), never for content: the demo file passes the content. Links take `href`; let callers render their own router link through an optional `renderLink?` or `asChild`-like prop only if it is simple; otherwise plain `<a>`.
- External links (`target="_blank"`) get `rel="noopener noreferrer"` and a visually hidden "(opens in a new tab)" from `labels`.
- Rest props on the root, `className` merged with `cn`.
- JSDoc on every prop in the repo's short, plain style, and a file header comment: what the section is, its signature idea, how it reads to a screen reader, what happens under reduced motion.

## Library rules (no exceptions)

**Motion:** only `opacity`, `transform` and `filter` animate. Never `transition-all` or `transition-colors`; name the properties. Each transition ≤300 ms with ease-out-quint (`ease-out-quint` utility or `EASE`/`EASE_CSS` from chart-utils). An entrance may stagger but must be done within 600 ms. No bounce, no overshoot. Reduced motion shows the final state at once. Hover-only effects must have a focus-visible equivalent, and nothing may depend on hover to be usable.

**Visual:** shadcn tokens only. Light, dark, inverted tile and any `--primary` must work. Shadows are black and soft. No emoji. Honey (`--chart-2`) and sage (`--chart-4`) are under 3:1 on light cards: never let colour alone carry meaning.

**Accessibility:** landmark and heading structure that makes sense on a real page (one `h2` per section, `h3` inside). Real lists for link groups. Every actionable control ≥44 px touch target (links in dense footers: give them a 44 px tall hit area with padding or `min-h-11`, without making the visual line spacing loose; or make the row itself the target). Visible `--ring` focus ring everywhere (`:focus-visible` outline 2 px, as in `src/index.css`), never clipped by `overflow: hidden`. Forms: real `<label>`s, `autocomplete` attributes, inline validation on blur and on submit with `aria-invalid` + `aria-describedby`, error text that says how to fix it, focus moves to the first invalid field, success announced through a live region. No placeholder-as-label.

**Robustness:** no `'use client'`. StrictMode and SSR safe: no `window`/`document` at module level or during render; every effect cleans up. Anything time-based (local time, open now, ©-year) takes `now?: Date` as a prop; when it is absent, compute it in an effect after mount and render a neutral placeholder on the server, so the first render is pure. Time zones through `Intl.DateTimeFormat` with `timeZone`. `import { cn } from '@/lib/utils'`. No new npm dependencies (`motion` and `lucide-react` are allowed). Forms never send anything: `onSubmit?(values)` returns a promise the section awaits, and the demo resolves it after a short delay.

**Demo content:** English. An invented company **"Halden Studio"** (a small product studio in Munich and Aalborg) unless your section needs another invented subject, with invented people, addresses and links (`example.com`, `+49 89 0000 0000`-style numbers). **Never invented statistics, ratings, customer counts, testimonials or real brands.** Where a figure appears (bento metrics), it is plainly example data and the section says "Example data." somewhere visible. No lorem ipsum.

## Files you may touch

ONLY, per section `<name>` you own:
- `registry/manniche/<name>/<name>.tsx` (extra files in that folder if needed)
- `registry/manniche/examples/<name>-demo.tsx`

Do NOT touch anything else: not `chart-kit/`, `data-tile/`, phase 5 primitives, `registry.json`, `public/r`, `README.md`, `CHANGELOG.md`, `src/`, other components or package files. Other agents may write in the same working tree. If a shared file needs a fix, describe it exactly in your report; the lead makes it.

Each demo renders the section with realistic content, and where the section has variants or states (empty, sending, sent, error, open/closed), a small control in the demo or a second instance shows them. It must look good in `&full=1` light and dark at 1440 and 500, and in `&mini=1` (the lab card; the section may be shown scaled or in its narrowest layout there; check how `src/preview.tsx` frames mini).

## The 17 sections

Names are final. Each line: the name, then what it is and its signature idea.

### Footers (agent a)

1. **`footer-columns`**: the classic. Brand block (wordmark slot + one-line description), 3–5 link columns, a newsletter tile (email field + button, inline validation, sent state), and a legal row (© year, legal links, a language or region `<select>`). Signature: the newsletter sits in its own tile beside the columns; on mobile the columns become two-up, the newsletter tile goes first.
2. **`footer-statement`**: a closing statement. One very large display line (e.g. "Let's make the next one together.") in an inverted tile that spans the width, with a single primary action and an email link with a copy button; underneath, one quiet row of links and the legal line. Signature: the display line sets itself to the width with fluid type (`clamp`) and never breaks mid-word.
3. **`footer-tiles`**: the footer as a small bento of 4 tiles: address (with a "Directions" link), opening hours with an **open now / closed, opens at 09:00** signal computed from a weekly schedule, time zone and `now`, links, and social links (icon + text). Signature: the open-now dot is the only `--primary` on the page.
4. **`footer-slim`**: one row for apps and docs: wordmark, inline links, a theme switch (light / dark / system as `Pills`, controlled through `theme`/`onThemeChange`; it does not touch the DOM itself), and the © line. Wraps into two centred rows on narrow widths. Signature: it is 56 px tall and still has 44 px targets.
5. **`footer-sitemap`**: a dense sitemap for big sites: 5–7 groups; on narrow widths each group collapses into a disclosure (`<button aria-expanded>` + region; height animates via `grid-template-rows` is NOT allowed, so use opacity/transform on the content and let the height jump, or measure and use transform on an inner wrapper), plus a region/language picker as a list of links. Signature: on wide screens every group is open with a mono count of its links.
6. **`footer-desk`**: a "front desk" footer: an inverted tile with a contact person (initials avatar, name, role), an email with copy button, a "book a call" link, and the **local time in two offices** (Munich and Aalborg in the demo; generic `offices: { city, timeZone }[]`), ticking once a minute, mono tabular. Signature: the two clocks, aligned on the minute, with "same time" shown when the offsets match.
7. **`footer-status`**: for products: a status chip (operational / degraded / outage from a prop, with text, not just colour), the current version with a link to the changelog, a short link list, and a **back to top** button that smooth-scrolls (instant under reduced motion) and moves focus to the top of the page (`focusTarget` id prop). Signature: the status chip with a mono "Updated 14:20" from a prop.

### Bento grids (agent b)

8. **`bento-features`**: 6 feature tiles in a bento with one large lead tile (spans 2×2 on wide screens) and mixed spans; each tile has a title, one sentence and a small visual slot (`ReactNode`); the demo fills the slots with tiny Tiles-styled illustrations made of DOM/SVG (no images). Signature: the lead tile is inverted.
9. **`bento-metrics`**: a grid of figure tiles for a landing page or report: each tile is `{ label, value, format, delta?, trend?: number[], note }`, rendering `BigNumber` (+ `DeltaPill`) and, when `trend` is given, the phase 5 `Sparkline`. One tile can be inverted. The section heading has a one-line intro and a visible "Example data." in the demo. Signature: figures roll in when the section first comes into view (BigNumber already does this; respect reduced motion).
10. **`bento-product`**: a product showcase: a large media tile (`media: ReactNode`; demo uses a Tiles-styled SVG illustration, no stock photos), 3–4 spec tiles (`{ label, value }`, mono values), a price tile with `BigNumber`, a variant `Pills` (e.g. colour or size) that updates the price and the media label, and a primary CTA. Signature: switching variant cross-fades the media (opacity) and rolls the price.
11. **`bento-steps`**: a process in 3–5 steps as tiles: mono "01–05", title, sentence, optional duration chip; on wide screens one row with the current step highlighted (`current` prop; primary signal), on narrow a vertical list with a thin connecting line. Ordered list semantics (`<ol>`). Signature: completed steps show a check mark and text "Done"; the current one says "Now".

### Calls to action (agent b)

12. **`cta-band`**: an inverted full-width band tile: display headline, one sentence, a primary and a secondary action, and a small fact line (a plain promise like "No card needed. Cancel any time." passed as a prop, never a statistic). Signature: on wide screens the actions sit right, aligned to the headline baseline; on narrow they stack full width.
13. **`cta-signup`**: email capture with a "what you get" checklist (3–5 items with check marks), a consent line passed as a prop (`ReactNode`, so a privacy-policy link fits), inline validation, a sending state on the button (spinner via opacity/transform, button keeps its width), and a success state that replaces the form and is announced. Signature: the success state shows the email address back to the user in mono.

### Contact sections (agent c)

14. **`contact-form`**: a two-tile split: the form tile (name, email, a topic as `Pills` or a select, message with a character count in mono, a consent checkbox when `consent` is passed), and an info tile (email, phone, address, response time as a prop like "We reply within two working days."). Full form rules above, sending/sent/error states; error state keeps the user's text and offers "Try again". Signature: the character count turns `--destructive` (with text "12 over") only when over the limit.
15. **`contact-people`**: a grid of person cards (initials avatar or `avatar` image slot, name, role, languages as chips, email with copy button, an optional "Book a call" link). A filter by team as `Pills` when more than one team exists. Signature: copying an email shows a short "Copied" in place, announced through a live region.
16. **`contact-offices`**: office tiles (city, address, phone, opening hours per weekday, time zone) with **local time and open/closed now** per office, from `now` + time zone; the tile of the office that is open and nearest to closing time shows "Closes in 40 min" in mono. A "Copy address" button and a directions link per office. Signature: the open office's tile carries the one `--primary` dot; closed offices say when they open next ("Opens Mon 09:00").
17. **`contact-channels`**: channel tiles (email, phone, chat, in person …, each `{ icon, title, detail, action: { label, href }, responseTime? }`), with the recommended channel as the inverted tile, and below a short FAQ as an accessible disclosure list (`<details>`/`<summary>` is fine; animate only opacity/transform of the answer). Signature: every channel states how fast it answers, in mono.

## Verify (measure, don't assume)

1. `npx oxlint <your files>` clean, and `npx tsc -p tsconfig.app.json --noEmit` with zero errors in your files.
2. Screenshots (one browser at a time) at 1440 and 500 px in `&full=1` light and dark, plus `&mini=1`, plus a narrow container at 320 px. Look at them as a demanding designer: spacing rhythm, alignment to a grid, type scale, line lengths, edges, empty space, how it reflows. Iterate **at least three full rounds**. Compare the overall feel with the Tiles mockup.
3. Interaction checks in Chrome (one browser at a time): Tab order and focus ring, every button and link, keyboard on Pills and disclosures, form validation and states, copy buttons, live-region text, reduced motion (`reducedMotion: 'reduce'`) giving the final state at once, no console errors or warnings (apart from the dev server's known font 404s), no horizontal scroll at any width, and `getComputedStyle` showing only opacity/transform/filter in `transition-property` on animated elements. WebKit if you have time; say whether you ran it.

## Report back (English, concise)

- Files.
- Public API per section (props, types, defaults).
- How each works in 2–4 sentences, its signature idea, and how it reads to a screen reader.
- Design decisions and the iterations you made.
- Verification results per check.
- Screenshot paths.
- Anything unverified, and any fix you want in shared files (exact).
- Per section: a one-line registry description in the style of `registry.json`, and a one-line README row in the style of `components/README.md`.
