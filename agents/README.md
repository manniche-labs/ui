# Agents for Claude Code

Subagents that Claude Code can hand a task to. Each agent is one Markdown file with its own instructions, tools and model. Pages with examples: https://mikkelmanniche.dk/lab/agents

| Agent | What it does | Model | MCP server |
|---|---|---|---|
| [dansk-jurist](dansk-jurist.md) | Finds the legal basis for a question in a project (Danish, German and EU law) and quotes it verbatim with the source. Writes in Danish. Not a lawyer. | opus | `dk-lov` (needs [uv](https://docs.astral.sh/uv/)) |
| [klarsprog](klarsprog.md) | Edits Danish copy on pages, buttons, emails and error messages into clear, short language, shown as before and after. | sonnet | |
| [ui-builder](ui-builder.md) | Builds screens in a React and shadcn app from Manniche UI components and templates, and checks them in the browser. | sonnet | `manniche-ui` |
| [feature-planner](feature-planner.md) | Turns a feature request into a plan of small, mergeable steps. Writes no code. | opus | |
| [ci-local](ci-local.md) | Runs a repository's GitHub Actions checks on your own machine and reports what passed and failed. | sonnet | |

## Install

Put the file in `~/.claude/agents/` so the agent works in every project. For `ui-builder`:

```bash
mkdir -p ~/.claude/agents && curl -fsSL https://raw.githubusercontent.com/manniche-labs/ui/main/agents/ui-builder.md -o ~/.claude/agents/ui-builder.md
```

Windows (PowerShell):

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\agents" | Out-Null; Invoke-WebRequest https://raw.githubusercontent.com/manniche-labs/ui/main/agents/ui-builder.md -OutFile "$env:USERPROFILE\.claude\agents\ui-builder.md"
```

Restart Claude Code or run `/agents` to see it. Claude Code picks an agent by itself when a task matches its description, or you can ask for it by name.

The MCP servers are written into the agent files and start only while the agent runs. In a project's `.claude/agents/` folder they need the folder to be trusted; in `~/.claude/agents/` they do not.
