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
- **Manniche UI first.** If [Manniche UI](https://github.com/manniche-labs/ui/tree/main/components/registry/manniche) has the component, the agents recreate that one instead of another library's version of the effect. Its source is the `components/registry/manniche/` folder of the clone this skill is linked from (find it with `realpath $DB`); if the skill was copied out on its own, read it on GitHub. Effects from other libraries are rebuilt from scratch.
- **Dangerous actions** (delete, close, cancel a plan) follow the six rules under "Dangerous actions" in [components/README.md](https://github.com/manniche-labs/ui/blob/main/components/README.md#dangerous-actions):
  - Buttons name the verb and the thing ("Delete project" / "Keep project"), never "Yes" or "OK".
  - The safe button has focus, and the destructive one sits away from where "OK" usually is.
  - Red only for what destroys something.
  - Settings that destroy things sit together in a framed danger zone at the bottom.
  - Small, frequent deletions are held to confirm, not confirmed in a dialog.
  - Deleting is soft first: a few seconds to undo for one item, a grace period of days for accounts and projects.

  The matching components are `hold-to-confirm`, `confirm-dialog`, `danger-zone`, `timed-undo` and `scheduled-deletion`.

## Step 1: Brief (you)

Write `BRIEF.md` in your scratch folder from `$DB/templates/brief.md`. It must contain:
- Brand: colours, fonts and logo.
- Tone and audience.
- The sections the page needs, in order.
- Real data and demo data, verbatim.
- What is forbidden.

Read the app's CSP, layout and data layer now, so the brief does not promise anything the app cannot serve.

Pick one to three styles on [Refero Styles](https://styles.refero.design/) that fit the tone. Each is a `DESIGN.md` for a real website, with colours, typography, spacing and components. Save them in your scratch folder and note in the brief which direction uses which style as its frame. They are inspiration only: no colours, logos or text are copied verbatim. Use the free pages only; no purchase and no MCP is needed.

Optional: clone the Magic UI source for the agents to read with `bash $DB/fetch-magicui.sh` (MIT, not bundled).

## Step 2: Three directions (three parallel agents)

Find three clearly different metaphors for the product. Each must be an idea, not a colour scheme. For a bookkeeping app for small businesses, for example:
- "The shoebox empties": loose receipts fly into neat, sorted rows.
- "The ledger": a calm, printed book that fills itself in.
- "The year at a glance": twelve months as a timeline that settles into place.

Start three `general-purpose` agents in the same message with `run_in_background: true`, using your strongest model. Fill in `$DB/templates/agent-direction.md` once per direction. Each agent must:
- Read the brief, and the previous round and its critique if there was one.
- Read `$DB/resources/effects.html` and, if cloned, the Magic UI source.
- Read the style `DESIGN.md` assigned to its direction, as the frame for type scale, spacing and component feel.
- Prefer Manniche UI components, recreated in plain JS/CSS, and follow the dangerous-actions rules for anything that deletes.
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

## Sources outside the folder

| Source | Use |
|---|---|
| [Manniche UI](https://github.com/manniche-labs/ui/tree/main/components) | The components in this repo. Use them first |
| [Refero Styles](https://styles.refero.design/) | Real websites as `DESIGN.md` files. The frame for each direction in step 1 |
| [React Bits Background Studio](https://reactbits.dev/tools/background-studio) | Turn on an animated background (Silk, Aurora …) and read off the values. Its licence (MIT + Commons Clause) lets you use it in your own and clients' sites, but not redistribute the components |
| [React Bits Texture Lab](https://reactbits.dev/tools/texture-lab) | Put effects (grain, dither, ASCII …) on an image and read off the values for a texture. Same licence |
| [Aceternity UI](https://ui.aceternity.com/components) | Inspiration only. Its licence restricts redistributing the source files, so do not copy them into a library or repo you publish. Build the effect yourself from scratch |
| [transitions.dev](https://github.com/Jakubantalik/transitions.dev) (skill `transitions-dev`) | Ready-made CSS transitions with motion tokens. Fine to use directly in a site, but its licence does not allow redistributing the library itself as a product, so do not bundle it |
| [make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better) (skill, MIT) | Detail check for radius, shadows, numbers, icons and motion. Use its review format for the last pass on the winner |
