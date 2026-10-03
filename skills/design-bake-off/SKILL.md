---
name: design-bake-off
description: Run a design bake-off for a landing page or front page. Three parallel agents each build a complete, self-contained mockup from a sharp metaphor, using UI-library effects rewritten in plain JS. Show the three entries, let the user pick one, then port the winner into the real app. Use it when the user wants design options, a new front page or landing page, or says a design looks boring, generic or ugly.
---

# Design bake-off

Three competing directions beat one safe one. Each agent gets the same brief but a different idea to build around, and the user picks the winner from finished pages, not from descriptions.

`$DB` below is the folder this file is in. Write it as a full path in commands and in prompts to agents.

## Rules for the whole run

- Never build UI in the app before the user has seen the entries and clearly said which one to build. Praise alone is not a yes.
- No invented numbers, statistics, quotes or testimonials. Use real data, or data clearly labelled as demo data.
- No "AI look": no purple SaaS gradients, rows of generic icons or empty superlatives.
- One signature effect per section, not everything everywhere.
- All effects are plain JS/CSS with no React and no build step, so they port to any stack.
- `prefers-reduced-motion` gives a static end state. No horizontal scroll and no console errors.

## Step 1: Brief (you)

Write `BRIEF.md` in your scratch folder from `$DB/templates/brief.md`. It must contain:
- Brand: colours, fonts and logo.
- Tone and audience.
- The sections the page needs, in order.
- Real data and demo data, verbatim.
- What is forbidden.

Read the app's CSP, layout and data layer now, so the brief does not promise anything the app cannot serve.

Optional: clone the Magic UI source for the agents to read with `bash $DB/fetch-magicui.sh` (MIT, not bundled).

## Step 2: Three directions (three parallel agents)

Find three clearly different metaphors for the product. Each must be an idea, not a colour scheme. For a bookkeeping app for small businesses, for example:
- "The shoebox empties": loose receipts fly into neat, sorted rows.
- "The ledger": a calm, printed book that fills itself in.
- "The year at a glance": twelve months as a timeline that settles into place.

Start three `general-purpose` agents in the same message with `run_in_background: true`, using your strongest model. Fill in `$DB/templates/agent-direction.md` once per direction. Each agent must:
- Read the brief, and the previous round and its critique if there was one.
- Read `$DB/resources/effects.html` and, if cloned, the Magic UI source.
- Use the design skills that are installed (see the README for recommended ones).
- Build one self-contained HTML file.
- Take headless screenshots at 1440 and 390 px and improve the page at least twice based on them.
- Test the interactions in a real browser.

## Step 3: Show the entries

- Look through the screenshots yourself. Remove invented numbers and the agents' scratch files.
- Show the three entries side by side with screenshots and one line each. If you can publish pages (for example as artifacts), publish each entry as its own page, because links that open new tabs often do not work inside an embedded page.
- Give each file a unique `<title>`.
- Give a short recommendation, and ask which one to build.

## Step 4: Port the winner (one agent, after the user says yes)

Use `$DB/templates/agent-port.md`. The key points:
- The mockup is the source of truth. Nothing visual or animated may be lost.
- If the app is React with shadcn (`components.json`), install the effects as components instead of rewriting them. [Manniche UI](https://github.com/manniche-labs/ui/tree/main/components) is a shadcn registry with the same effects (blur-fade, text-reveal, highlighter, number-ticker, spotlight-card, marquee, dot-pattern, shimmer-button, toast, command-palette, sheet) plus agent components. Add it under `registries` in `components.json` and use `npx shadcn add @manniche/<name>` or the shadcn MCP. Each item has a `<name>-demo` example.
- Check the app's CSP first. If it only allows `'self'` scripts, the JS must be served by the app itself. Write small replacements for CDN libraries, and pass data in `<script type="application/json">` with escaping.
- Replace demo text with real data. The page must look intentional when the database is empty.
- The page must work without JS, with reduced motion and with a keyboard.
- Run tests and typecheck, screenshot both mockup and port, and compare them.
- Work on a branch and open a PR. Update the changelog. Deploying needs the user's yes.

## Files

| File | What |
|---|---|
| `templates/brief.md` | Template for the shared brief |
| `templates/agent-direction.md` | Prompt for each of the three design agents |
| `templates/agent-port.md` | Prompt for the port agent |
| `resources/effects.html` | Blur fade, text reveal, highlighter, number ticker, spotlight cards, marquee, dot pattern, shimmer button, toast, command palette and bottom sheet in plain JS/CSS |
| `fetch-magicui.sh` | Clones the Magic UI source (MIT) for reference |
