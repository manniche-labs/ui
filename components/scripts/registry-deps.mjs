// Checks that every item in registry.json declares what its files import, so `shadcn add` installs a component that builds.
//
//   node scripts/registry-deps.mjs    exits 1 and lists each gap
//
// Run it from components/. For each import in an item's files:
//   npm package                    must be in `dependencies` (react and react-dom come with the app)
//   @/lib/utils                    needs "utils" in `registryDependencies`
//   @/registry/manniche/<path>     must be one of the item's own files, or a file of an item it depends on, directly or not
import fs from 'node:fs'

const r = JSON.parse(fs.readFileSync('registry.json', 'utf8'))
const byName = Object.fromEntries(r.items.map((i) => [i.name, i]))
const short = (d) => d.replace(/^.*\/r\//, '').replace(/\.json$/, '').replace(/^@[^/]+\//, '')

const closure = (it, seen = new Set()) => {
  for (const d of it.registryDependencies || []) {
    const n = short(d)
    if (seen.has(n)) continue
    seen.add(n)
    if (byName[n]) closure(byName[n], seen)
  }
  return seen
}

const gaps = []
for (const it of r.items) {
  const deps = new Set(it.dependencies || [])
  const reg = closure(it)
  const reachable = new Set([...it.files, ...[...reg].flatMap((n) => byName[n]?.files || [])].map((f) => f.path))
  for (const f of it.files) {
    if (!fs.existsSync(f.path)) {
      gaps.push(`${it.name}: file ${f.path} does not exist`)
      continue
    }
    for (const [, s] of fs.readFileSync(f.path, 'utf8').matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)) {
      if (s === 'react' || s === 'react-dom' || s.startsWith('react/') || s.startsWith('.')) continue
      if (s === '@/lib/utils') {
        if (!reg.has('utils')) gaps.push(`${it.name}: imports @/lib/utils without "utils" in registryDependencies`)
      } else if (s.startsWith('@/registry/manniche/')) {
        const p = s.slice(2)
        if (!['.ts', '.tsx'].some((e) => reachable.has(p + e))) gaps.push(`${it.name}: imports ${s}, which is not in its files or its registryDependencies`)
      } else if (s.startsWith('@/')) {
        gaps.push(`${it.name}: imports ${s}, which the registry cannot install`)
      } else {
        const pkg = s.startsWith('@') ? s.split('/').slice(0, 2).join('/') : s.split('/')[0]
        if (!deps.has(pkg)) gaps.push(`${it.name}: imports ${pkg} without it in dependencies`)
      }
    }
  }
}

if (gaps.length) {
  console.error(gaps.join('\n'))
  console.error(`\n${gaps.length} gap(s) in registry.json`)
  process.exit(1)
}
console.log(`registry-deps: ${r.items.length} items, every import declared`)
