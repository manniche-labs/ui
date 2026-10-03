# design-bake-off

A [Claude Code](https://claude.com/claude-code) skill that runs a design bake-off for a landing page: three agents each build a complete mockup around a different idea, you pick the winner from finished pages, and one agent ports it into your app.

## How a round works

1. **Brief.** Claude writes a short brief: brand, tone, sections, the real data the page may show, and what is forbidden.
2. **Three directions.** Three agents work in parallel. Each builds one self-contained HTML page around its own metaphor, screenshots it at desktop and mobile width, and improves it at least twice.
3. **You choose.** You see the three pages side by side and pick one. Nothing touches your app before that.
4. **Port.** One agent ports the winner into your app on a branch: same look and motion, real data, your CSP, works without JS and with reduced motion.

The rules are strict on purpose: no invented numbers or testimonials, no generic AI look, one signature effect per section, and all effects in plain JS/CSS so they work in any stack.

## Install

The skill lives in the [manniche-labs/ui](https://github.com/manniche-labs/ui) repository. Clone it once and link the skill folder into Claude Code.

```bash
git clone https://github.com/manniche-labs/ui.git ~/manniche-labs-ui
ln -s ~/manniche-labs-ui/skills/design-bake-off ~/.claude/skills/design-bake-off
```

On Windows (PowerShell):

```powershell
git clone https://github.com/manniche-labs/ui.git "$env:USERPROFILE\manniche-labs-ui"
New-Item -ItemType Junction -Path "$env:USERPROFILE\.claude\skills\design-bake-off" -Target "$env:USERPROFILE\manniche-labs-ui\skills\design-bake-off"
```

Then ask Claude Code for "a design bake-off for the front page", or run `/design-bake-off`.

Screenshots use Playwright (`npx playwright`), so Node.js is needed. The agents run in parallel and each one iterates on its page, so a round uses a fair amount of model capacity.

## What is inside

| Path | What |
|---|---|
| `SKILL.md` | The recipe Claude follows |
| `templates/` | The brief and the prompts for the design agents and the port agent |
| `resources/effects.html` | Effects known from Magic UI, Aceternity, React Bits, Sonner, cmdk and Vaul, rewritten in plain JS/CSS. Open it in a browser to see them |
| `fetch-magicui.sh` | Optional: clones the [Magic UI](https://github.com/magicuidesign/magicui) source for the agents to read |

## Recommended companion skills

The design agents use these if they are installed:

- [frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) from Anthropic's skills repo
- [frontend-design-direction](https://github.com/affaan-m/ECC/tree/main/skills/frontend-design-direction) and [make-interfaces-feel-better](https://github.com/affaan-m/ECC/tree/main/skills/make-interfaces-feel-better) from ECC

## License

MIT. Made by [Mikkel Manniche](https://mikkelmanniche.dk).
