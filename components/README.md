# Manniche UI

Components for agent interfaces and calm motion, served as a [shadcn registry](https://ui.shadcn.com/docs/registry).
They use the standard shadcn tokens (`bg-card`, `text-muted-foreground`, `bg-primary` …), so they fit any shadcn project.

## Install a component

```bash
npx shadcn@latest add https://mikkelmanniche.dk/r/prompt-input.json
```

Or add the registry once in `components.json`:

```json
{
  "registries": {
    "@manniche": "https://mikkelmanniche.dk/r/{name}.json"
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

> The registry is not deployed yet. Until it is, run it locally (see below).

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
| `use-reduced-motion` | Hook: true when the visitor asked for less motion |

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
