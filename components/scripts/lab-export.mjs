// Copies the registry and the demo previews into the mikkelmanniche.dk repo, and writes the data its
// lab pages are generated from (descriptions, dependencies and highlighted code).
//
//   npm run lab -- ../../../mikkelmanniche-dk/mikkelmanniche.dk
//
// Writes lab/r/*.json, lab/ui/preview/*, lab/t/* and lab/a/*.md (served), and server/lab-ui.json (read by server/lab-sider.mjs, not served).
import fs from 'node:fs'
import path from 'node:path'
import { codeToHtml } from 'shiki'

const site = process.argv[2]
if (!site || !fs.existsSync(path.join(site, 'server/lab-sider.mjs'))) {
  console.error('Give the path to the mikkelmanniche.dk repo.')
  process.exit(1)
}

const registry = JSON.parse(fs.readFileSync('registry.json', 'utf8'))

function copyDir(from, to) {
  fs.rmSync(to, { recursive: true, force: true })
  fs.cpSync(from, to, { recursive: true })
}

copyDir('public/r', path.join(site, 'lab/r'))
copyDir('dist-lab', path.join(site, 'lab/ui/preview'))
// The templates as plain HTML files, and the theme block per colour (from scripts/template-html.mjs).
copyDir('dist-templates', path.join(site, 'lab/t'))
// The Claude Code agents, served as single files to download into ~/.claude/agents/.
fs.rmSync(path.join(site, 'lab/a'), { recursive: true, force: true })
fs.mkdirSync(path.join(site, 'lab/a'), { recursive: true })
for (const f of fs.readdirSync('../agents').filter((f) => f.endsWith('.md') && f !== 'README.md')) fs.copyFileSync(path.join('../agents', f), path.join(site, 'lab/a', f))

// In an app the components land in components/, so the examples are shown with that import path.
const forApp = (code) => code.replace(/@\/registry\/manniche\/(?:[\w-]+\/)*([\w-]+)/g, '@/components/$1')

async function html(code, lang) {
  const out = await codeToHtml(code.replace(/\n$/, ''), { lang, theme: 'vesper' })
  // The page draws its own frame and background.
  return out.replace(/ style="[^"]*"/, '').replace(/ tabindex="0"/, '')
}

const items = []
for (const item of registry.items) {
  if (item.type === 'registry:example') continue
  const files = []
  for (const f of item.files) {
    const code = fs.readFileSync(f.path, 'utf8')
    files.push({ name: path.basename(f.path), html: await html(code, 'tsx') })
  }
  const demo = registry.items.find((i) => i.name === `${item.name}-demo`)
  const demoCode = demo ? forApp(fs.readFileSync(demo.files[0].path, 'utf8')) : null
  items.push({
    name: item.name,
    title: item.title,
    description: item.description,
    category: item.categories?.[0] ?? 'other',
    type: item.type,
    dependencies: item.dependencies ?? [],
    registryDependencies: item.registryDependencies ?? [],
    // Set on items adapted from another MIT library; the page names the source.
    credit: item.meta?.credit ?? null,
    files,
    demo: demoCode && { code: demoCode, html: await html(demoCode, 'tsx') },
  })
}

// The agents: the frontmatter fields the page shows, and the whole file highlighted.
const agents = []
for (const f of fs.readdirSync('../agents').filter((f) => f.endsWith('.md') && f !== 'README.md').sort()) {
  const text = fs.readFileSync(path.join('../agents', f), 'utf8').replace(/\r\n/g, '\n')
  const head = text.match(/^---\n([\s\S]*?)\n---/)[1]
  const field = (k) => head.match(new RegExp(`^${k}: (.*)$`, 'm'))?.[1] ?? null
  agents.push({
    name: field('name'),
    description: field('description'),
    model: field('model'),
    effort: field('effort'),
    tools: (field('tools') ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    mcp: [...head.matchAll(/^ {2}- ([\w-]+):$/gm)].map((m) => m[1]),
    lines: text.split('\n').length,
    html: await html(text, 'markdown'),
  })
}

const themes = JSON.parse(fs.readFileSync('dist-templates/themes.json', 'utf8'))
const colours = Object.entries(themes).map(([id, t]) => ({ id, name: t.name, light: t.light, dark: t.dark }))

fs.writeFileSync(path.join(site, 'server/lab-ui.json'), JSON.stringify({ items, colours, agents }, null, 1) + '\n')
console.log(`${items.length} items, ${agents.length} agents, registry and previews copied to ${site}`)
