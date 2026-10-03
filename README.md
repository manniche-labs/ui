# Manniche Labs UI

Everything from Manniche Labs that has to do with interfaces: components you can install, and Claude Code skills that design and review pages.

| Folder | What it is |
|---|---|
| [components](components) | Manniche UI: 19 React components for agent interfaces and calm motion, served as a shadcn registry. Install them with `npx shadcn add`, or let an agent find them through the shadcn MCP. |
| [skills/design-bake-off](skills/design-bake-off) | A Claude Code skill. Three agents compete on a landing-page design, you pick the winner, and one agent ports it into your app. In React and shadcn apps it installs the components from this repo. |
| [skills/page-critic](skills/page-critic) | A Claude Code skill. It reviews the pages of a web app in three layers, measures them in a real browser and compares before and after. |

## Components in one line

```bash
npx shadcn@latest add https://mikkelmanniche.dk/lab/r/prompt-input.json
```

See [components/README.md](components/README.md) for the full list and for setting up the `@manniche` registry.

## Skills

Clone the repository once and link the skills you want into Claude Code:

```bash
git clone https://github.com/manniche-labs/ui.git ~/manniche-labs-ui
ln -s ~/manniche-labs-ui/skills/design-bake-off ~/.claude/skills/design-bake-off
ln -s ~/manniche-labs-ui/skills/page-critic ~/.claude/skills/page-critic
```

Each skill's README has the Windows steps and what else it needs.

## License

MIT. See [LICENSE](LICENSE).
