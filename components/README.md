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
| `prompt-input` | Chat input that grows with the text, takes files and turns into a stop button while the agent writes |
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
| `text-reveal` | Words go from faint to full as the reader scrolls |
| `spotlight-card` | A card with a soft light that follows the mouse |
| `marquee` | Items scroll sideways in a loop and pause on hover or focus |
| `dot-pattern` | A quiet dot grid behind content, CSS only |
| `rolling-number` | A number whose changed digits roll up or down |
| `stepper` | Plus and minus counter with rolling digits and arrow keys |
| `switch` | On and off switch whose knob stretches when pressed |
| `copy-button` | Copies a value; icon and label roll over to say it worked or failed |
| `timed-undo` | Delete button that counts down and can be undone first |
| `hold-to-confirm` | Fills while held and fires when full |
| `tag-picker` | Pick tags from a pool; they fly into the box and back |
| `signature-pad` | Draw or type a signature, get a sharp PNG |
| `continuous-tabs` | Tab list with a sliding pill and arrow keys |
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
| `wave-loader` | A ball hops along bars and sends a spring wave through them |
| `jelly-slider` | Slider whose soft thumb stretches with drag speed |
| `notification-stack` | Notifications in a pile that fans out into a list |
| `cloud-drift` | Soft clouds drifting behind content, on a tiny canvas |
| `liquid-metal` | Flowing chrome surface from a small WebGL shader |
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
| `use-reduced-motion` | Hook: true when the visitor asked for less motion |

Several of the newer components are adapted from [Watermelon UI](https://github.com/WatermelonCorp/watermelon-platform) (MIT). Each such file says so at the top; see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## Rules every component follows

- Only `opacity`, `transform` and `filter` animate. Responses to an action take 300 ms or less.
- Easing is `cubic-bezier(0.23, 1, 0.32, 1)` (`ease-out-quint` in the theme).
- Touch targets are at least 44 px.
- Under `prefers-reduced-motion` everything is shown in its final state.
- No gradient text, glow or bounce.

## Work on it

```bash
npm install
npm run dev              # gallery at http://localhost:5173
npm run build            # type-check and build the gallery
npx shadcn build         # write the registry to public/r
```

Source files live in `registry/manniche/<name>/`, examples in `registry/manniche/examples/<name>-demo.tsx`. Add each new item and its demo to `registry.json`.
