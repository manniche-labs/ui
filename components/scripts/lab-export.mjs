// Copies the registry and the demo previews into the mikkelmanniche.dk repo, and writes the data its
// lab pages are generated from (descriptions, dependencies and highlighted code).
//
//   npm run lab -- ../../../mikkelmanniche-dk/mikkelmanniche.dk
//
// Writes lab/r/*.json and lab/ui/preview/* (served), and server/lab-ui.json (read by server/lab-sider.mjs, not served).
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
    files,
    demo: demoCode && { code: demoCode, html: await html(demoCode, 'tsx') },
  })
}

fs.writeFileSync(path.join(site, 'server/lab-ui.json'), JSON.stringify({ items }, null, 1) + '\n')
console.log(`${items.length} items, registry and previews copied to ${site}`)
