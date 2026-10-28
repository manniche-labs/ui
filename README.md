# Manniche Labs UI

Everything from Manniche Labs that has to do with interfaces: components you can install and Claude Code agents.

| Folder | What it is |
|---|---|
| [components](components) | Manniche UI: 81 React components, three hooks and 5 page templates for AI interfaces, everyday controls, calm motion and whole pages, served as a shadcn registry. Install them with `npx shadcn add`, or let an agent find them through the shadcn MCP. |
| [agents](agents) | Five Claude Code subagents, one file each: a Danish legal researcher, a Danish plain-language editor, a UI builder for this library, a feature planner and local CI. Copy a file into `~/.claude/agents/`. |

## Components in one line

```bash
npx shadcn@latest add https://mikkelmanniche.dk/lab/r/prompt-input.json
```

See [components/README.md](components/README.md) for the full list and for setting up the `@manniche` registry.

## License

MIT. See [LICENSE](LICENSE). Made by [Mikkel Manniche](https://mikkelmanniche.dk/en/).
