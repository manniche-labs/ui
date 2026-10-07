// Fills `meta` on every item in registry.json (examples excluded), so the gallery on mikkelmanniche.dk
// reads it from the registry instead of from a hand-copied list.
//
//   node scripts/registry-meta.mjs            shows what would change
//   node scripts/registry-meta.mjs --write    writes registry.json
//   node scripts/registry-meta.mjs --check    exits 1 when registry.json is out of date (for CI)
//   add --verbose to list every item
//
// Run it from components/. What it sets (other keys in `meta`, such as `credit`, stay as they are):
//   tier     "free"
//   added    YYYY-MM-DD the item's first file was first added in git (today for a file git has not seen yet)
//   usedIn   the other items whose registryDependencies point at this one, sorted
//   props    [{ name, type, default, required, description }] from the exported <Pascal>Props type (or the props
//            parameter of the exported component), read with the TypeScript compiler API; [] for hooks and libs
//   extends  the base type text when the props type builds on one (for example Omit<HTMLAttributes<'div'>, 'children'>);
//            those inherited attributes are not listed in `props`. Left out when there is none.
//   parts    for a kit (one file exporting several components and none named after the item, like chart-kit):
//            [{ name, props, extends? }] per exported component, read the same way; `props` is then []. Left out otherwise.
//   a11y     never generated. Written by hand as [{ topic: 'keyboard' | 'motion' | 'screen-reader' | 'other', text, keys? }]
//            and kept exactly as it is.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

const TIER = 'free'
const REGISTRY = 'registry.json'
const TYPE_MAX = 200
const DEFAULT_MAX = 300
const A11Y_TOPICS = ['keyboard', 'motion', 'screen-reader', 'other']
// Written by this script, in this order, after the keys that were already in `meta`.
const MANAGED = ['tier', 'added', 'usedIn', 'props', 'extends', 'parts', 'a11y']

const args = new Set(process.argv.slice(2))
const WRITE = args.has('--write')
const CHECK = args.has('--check')
const VERBOSE = args.has('--verbose')
const unknown = [...args].filter((a) => !['--write', '--check', '--verbose'].includes(a))
if (unknown.length || (WRITE && CHECK)) {
  console.error('Usage: node scripts/registry-meta.mjs [--write | --check] [--verbose]')
  process.exit(2)
}
if (!fs.existsSync(REGISTRY)) {
  console.error(`No ${REGISTRY} here. Run this from components/.`)
  process.exit(2)
}

const registryText = fs.readFileSync(REGISTRY, 'utf8')
const registry = JSON.parse(registryText)
const items = registry.items.filter((i) => i.type !== 'registry:example')
const warnings = [] // reported, but they do not fail --check
const problems = [] // hand-written meta that is wrong: fail --check and --write
const warn = (item, msg) => warnings.push(`${item.name}: ${msg}`)
const problem = (item, msg) => problems.push(`${item.name}: ${msg}`)

/* --- added: one pass over git history -------------------------------------- */

const git = (...a) => execFileSync('git', ['-c', 'core.quotePath=false', ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] })

let inGit = true
let shallow = false
let prefix = ''
try {
  prefix = git('rev-parse', '--show-prefix').trim()
  shallow = git('rev-parse', '--is-shallow-repository').trim() === 'true'
} catch {
  inGit = false
}

/**
 * Path (from the repo root) -> date of the oldest add, following renames. Merge commits are read against each
 * parent (-m): a history imported with a new path prefix shows up there as renames, and `git log --follow` loses it.
 */
function firstAdded() {
  const born = new Map()
  const log = git('-c', 'diff.renameLimit=5000', 'log', '--topo-order', '--reverse', '-m', '-M', '--name-status', '--format=@%as')
  let date = ''
  for (const line of log.split('\n')) {
    if (/^@\d{4}-\d\d-\d\d$/.test(line)) {
      date = line.slice(1)
      continue
    }
    const m = line.match(/^([AR])\d*\t(.+)$/)
    if (!m) continue
    const [from, to] = m[1] === 'R' ? m[2].split('\t') : [null, m[2]]
    const older = from ? born.get(from) : undefined
    const mine = born.get(to)
    const oldest = [older, mine, date].filter(Boolean).sort()[0]
    born.set(to, oldest)
    if (from) born.delete(from)
  }
  return born
}

const today = new Intl.DateTimeFormat('sv-SE').format(new Date())
const born = inGit ? firstAdded() : new Map()
const addedOf = (item) => born.get(prefix + item.files[0].path) ?? today

/* --- usedIn ----------------------------------------------------------------- */

/** The item name a registryDependencies entry points at: `name`, `@scope/name` or a URL ending in `/name.json`. */
const depName = (d) => (/^https?:\/\//.test(d) ? d.match(/\/([^/]+?)\.json(?:[?#].*)?$/)?.[1] : d.replace(/^@[\w-]+\//, ''))
const usedIn = new Map(items.map((i) => [i.name, new Set()]))
for (const item of items) {
  for (const d of item.registryDependencies ?? []) {
    const target = depName(d)
    if (target && target !== item.name) usedIn.get(target)?.add(item.name)
  }
}

/* --- props -------------------------------------------------------------------- */

const squash = (s) => s.replace(/\s+/g, ' ').trim()
// Cuts at a word boundary, so a long type never ends in half a word.
const shorten = (s, max) => (s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, '').trimEnd() + ' …' : s)

// A node as one line of source: comments left out, members of an object type joined with `;`.
const printer = ts.createPrinter({ removeComments: true })
function text(node, sf) {
  try {
    return squash(printer.printNode(ts.EmitHint.Unspecified, node, sf))
      .replace(/;\s*}/g, ' }')
      .replace(/,\s*([}\]])/g, (_, c) => (c === '}' ? ' }' : c))
      .replace(/\[\s+/g, '[')
      .replace(/\s+\]/g, ']')
  } catch {
    return squash(node.getText(sf))
  }
}
const pascal = (name) => name.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('')

const parsed = new Map()
function parse(file) {
  if (!parsed.has(file)) {
    const text = fs.readFileSync(file, 'utf8')
    const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind)
    parsed.set(file, { sf, ...declarations(sf) })
  }
  return parsed.get(file)
}

const isExported = (node) => node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
const functionLike = (n) => ts.isArrowFunction(n) || ts.isFunctionExpression(n)

/** The function inside `const X = (…) => …`, `const X = forwardRef(function …)` and the like. */
function functionOf(init) {
  if (!init) return null
  if (functionLike(init)) return { fn: init, call: null }
  if (ts.isCallExpression(init)) {
    for (const a of init.arguments) {
      const inner = functionOf(a)
      if (inner) return { fn: inner.fn, call: inner.call ?? init }
    }
  }
  if (ts.isParenthesizedExpression(init) || ts.isAsExpression(init)) return functionOf(init.expression)
  return null
}

function declarations(sf) {
  const types = new Map()
  const funcs = new Map()
  const exportedNames = new Set()
  for (const st of sf.statements) {
    if (ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st)) {
      types.set(st.name.text, { node: st, exported: isExported(st) })
    } else if (ts.isFunctionDeclaration(st) && st.name) {
      funcs.set(st.name.text, { fn: st, call: null, exported: isExported(st) })
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        const f = ts.isIdentifier(d.name) ? functionOf(d.initializer) : null
        if (f) funcs.set(d.name.text, { ...f, exported: isExported(st) })
      }
    } else if (ts.isExportDeclaration(st) && !st.moduleSpecifier && st.exportClause && ts.isNamedExports(st.exportClause)) {
      for (const e of st.exportClause.elements) exportedNames.add((e.propertyName ?? e.name).text)
    }
  }
  for (const n of exportedNames) {
    if (types.has(n)) types.get(n).exported = true
    if (funcs.has(n)) funcs.get(n).exported = true
  }
  return { types, funcs }
}

// The text of a JSDoc block in front of a node, up to its first @tag; null when there is none.
function jsdoc(node, sf) {
  const text = sf.text
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []
  const doc = [...ranges].reverse().find((r) => text.startsWith('/**', r.pos))
  if (!doc) return null
  const body = text
    .slice(doc.pos + 3, doc.end - 2)
    .split('\n')
    .map((l) => l.replace(/^\s*\*? ?/, ''))
  const tag = body.findIndex((l) => /^@\w/.test(l.trim()))
  const out = squash((tag === -1 ? body : body.slice(0, tag)).join(' '))
  return out || null
}

const memberName = (n, sf) => (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n) ? n.text : n.getText(sf))

/** Splits a props type into the members it declares itself and the base types it builds on. */
function expand(node, decls, seen = new Set()) {
  const out = { members: [], bases: [] }
  const merge = (o) => {
    out.members.push(...o.members)
    out.bases.push(...o.bases)
  }
  const sf = decls.sf
  if (ts.isParenthesizedTypeNode(node)) return expand(node.type, decls, seen)
  if (ts.isTypeLiteralNode(node)) {
    out.members.push(...node.members.map((m) => ({ m, sf })))
  } else if (ts.isIntersectionTypeNode(node)) {
    for (const t of node.types) merge(expand(t, decls, seen))
  } else if (ts.isUnionTypeNode(node) && node.types.every((t) => ts.isTypeLiteralNode(ts.isParenthesizedTypeNode(t) ? t.type : t))) {
    // Props that come in alternatives, such as a visible label or a spoken one. Every member is listed, and a member
    // is only required when each alternative requires it.
    const branches = node.types.map((t) => expand(t, decls, seen).members)
    const requiredIn = (b, name) => b.some(({ m, sf: s }) => memberName(m.name, s) === name && !m.questionToken)
    for (const b of branches) {
      for (const mm of b) out.members.push({ ...mm, optional: !branches.every((o) => requiredIn(o, memberName(mm.m.name, mm.sf))) })
    }
  } else if (ts.isTypeReferenceNode(node) || ts.isExpressionWithTypeArguments(node)) {
    const name = ts.isTypeReferenceNode(node) ? node.typeName.getText(sf) : node.expression.getText(sf)
    const local = decls.types.get(name)
    if (local && !seen.has(name)) {
      seen.add(name)
      const d = local.node
      if (ts.isTypeAliasDeclaration(d)) merge(expand(d.type, decls, seen))
      else {
        out.members.push(...d.members.map((m) => ({ m, sf })))
        for (const h of d.heritageClauses ?? []) for (const t of h.types) merge(expand(t, decls, seen))
      }
    } else out.bases.push(text(node, sf))
  } else out.bases.push(text(node, sf))
  return out
}

function memberToProp({ m, sf, optional }) {
  if (ts.isPropertySignature(m)) {
    return { name: memberName(m.name, sf), type: shorten(m.type ? text(m.type, sf) : 'any', TYPE_MAX), required: !m.questionToken && !optional, description: jsdoc(m, sf) }
  }
  if (ts.isMethodSignature(m)) {
    const params = m.parameters.map((p) => text(p, sf)).join(', ')
    const type = `(${params}) => ${m.type ? text(m.type, sf) : 'void'}`
    return { name: memberName(m.name, sf), type: shorten(type, TYPE_MAX), required: !m.questionToken && !optional, description: jsdoc(m, sf) }
  }
  return null
}

/** name -> default value text, from `({ a = 1, b: renamed = 2 }: Props)` or `const { a = 1 } = props` in the body. */
function defaultsOf(fn, sf) {
  const out = new Map()
  const take = (pattern) => {
    for (const el of pattern.elements) {
      if (el.dotDotDotToken || !el.initializer) continue
      const key = el.propertyName ?? el.name
      if (ts.isIdentifier(key) || ts.isStringLiteral(key)) out.set(key.text, shorten(text(el.initializer, sf), DEFAULT_MAX))
    }
  }
  const p = fn.parameters[0]
  if (!p) return out
  if (ts.isObjectBindingPattern(p.name)) take(p.name)
  else if (ts.isIdentifier(p.name) && fn.body && ts.isBlock(fn.body)) {
    for (const st of fn.body.statements) {
      if (!ts.isVariableStatement(st)) continue
      for (const d of st.declarationList.declarations) {
        if (ts.isObjectBindingPattern(d.name) && d.initializer && ts.isIdentifier(d.initializer) && d.initializer.text === p.name.text) take(d.name)
      }
    }
  }
  return out
}

/** { props, extends } for one item, or { props: [], error } when the props could not be read. */
function propsOf(item) {
  if (item.type === 'registry:hook' || item.type === 'registry:lib' || item.type === 'registry:style') return { props: [] }
  const main = item.files.find((f) => /\.tsx?$/.test(f.path) && path.basename(f.path).replace(/\.tsx?$/, '') === item.name) ?? item.files[0]
  if (!fs.existsSync(main.path)) return { props: [], error: `${main.path} does not exist` }
  const decls = parse(main.path)
  const want = pascal(item.name)

  const exportedFuncs = [...decls.funcs].filter(([n, f]) => f.exported && /^[A-Z]/.test(n))
  // The component named like the item, or the only exported one. A file with several (a kit) has no main component.
  const comp = (exportedFuncs.find(([n]) => n === want) ?? (exportedFuncs.length === 1 ? exportedFuncs[0] : null))?.[1]
  const propsType = decls.types.get(`${want}Props`)
  let typeNode = null

  if (!propsType?.exported && comp) {
    const p = comp.fn.parameters[0]
    if (!p) return { props: [] }
    typeNode = p.type ?? (comp.call?.typeArguments?.length >= 2 ? comp.call.typeArguments[1] : null)
    if (!typeNode) return { props: [], error: 'the component takes props without a type' }
  }
  if (!typeNode && !propsType?.exported) {
    // A kit: every exported component is a part with its own props.
    if (exportedFuncs.length > 1) {
      const parts = []
      for (const [n, f] of exportedFuncs) {
        const p = f.fn.parameters[0]
        const t = p ? (p.type ?? (f.call?.typeArguments?.length >= 2 ? f.call.typeArguments[1] : null)) : null
        if (p && !t) return { props: [], error: `the kit part ${n} takes props without a type` }
        parts.push({ name: n, ...(t ? propList(expand(t, decls), f) : { props: [] }) })
      }
      return { props: [], parts }
    }
    return { props: [], error: exportedFuncs.length ? `no ${want}Props type and no component named ${want} among ${exportedFuncs.map(([n]) => n).join(', ')}` : `no ${want}Props type and no exported component` }
  }

  return propList(typeNode ? expand(typeNode, decls) : expandNamed(`${want}Props`, decls), comp)

  /** { props, extends } from expanded members, with defaults from the component's destructuring. */
  function propList({ members, bases }, c) {
    const defaults = c ? defaultsOf(c.fn, decls.sf) : new Map()
    // A component that only passes `...props` on, such as a wrapper that picks a static or a live plot, keeps its
    // defaults in a local function that takes the same props type.
    const own = c?.fn.parameters[0]?.type
    if (own && ts.isTypeReferenceNode(own)) {
      for (const [, f] of decls.funcs) {
        const t = f.fn.parameters[0]?.type
        if (f === c || !t || !ts.isTypeReferenceNode(t) || t.typeName.getText(decls.sf) !== own.typeName.getText(decls.sf)) continue
        for (const [k, v] of defaultsOf(f.fn, decls.sf)) if (!defaults.has(k)) defaults.set(k, v)
      }
    }
    const props = []
    for (const mm of members) {
      const p = memberToProp(mm)
      if (!p || props.some((q) => q.name === p.name)) continue
      props.push({ name: p.name, type: p.type, default: defaults.get(p.name) ?? null, required: p.required, description: p.description })
    }
    return bases.length ? { props, extends: bases.join(' & ') } : { props }
  }
}

function expandNamed(name, decls) {
  const local = decls.types.get(name)
  const sf = decls.sf
  const d = local.node
  const seen = new Set([name])
  if (ts.isTypeAliasDeclaration(d)) return expand(d.type, decls, seen)
  const out = { members: d.members.map((m) => ({ m, sf })), bases: [] }
  for (const h of d.heritageClauses ?? []) for (const t of h.types) {
    const o = expand(t, decls, seen)
    out.members.push(...o.members)
    out.bases.push(...o.bases)
  }
  return out
}

/* --- build the new registry --------------------------------------------------- */

const results = new Map()
for (const item of items) {
  let r
  try {
    r = propsOf(item)
  } catch (e) {
    r = { props: [], error: String(e.message ?? e) }
  }
  if (r.error) warn(item, `props not read: ${r.error}`)
  results.set(item.name, r)
}

function withMeta(item) {
  const old = item.meta ?? {}
  const r = results.get(item.name)
  // `added` falls back to what is stored when git has no full history (a shallow CI checkout).
  const added = shallow && old.added ? old.added : addedOf(item)
  const meta = {}
  for (const [k, v] of Object.entries(old)) if (!MANAGED.includes(k)) meta[k] = v
  meta.tier = TIER
  meta.added = added
  meta.usedIn = [...usedIn.get(item.name)].sort()
  meta.props = r.props
  if (r.extends) meta.extends = r.extends
  if (r.parts) meta.parts = r.parts
  if (old.a11y !== undefined) {
    const ok = Array.isArray(old.a11y) && old.a11y.every((a) => A11Y_TOPICS.includes(a?.topic) && typeof a.text === 'string' && (a.keys === undefined || Array.isArray(a.keys)))
    if (!ok) problem(item, `a11y does not match [{ topic: ${A11Y_TOPICS.join(' | ')}, text, keys? }]`)
    meta.a11y = old.a11y
  }
  const { meta: _drop, ...rest } = item
  return { ...rest, meta }
}

const next = { ...registry, items: registry.items.map((i) => (i.type === 'registry:example' ? i : withMeta(i))) }
const nextText = JSON.stringify(next, null, 2) + '\n'

/* --- report --------------------------------------------------------------------- */

const changed = registry.items.filter((old, n) => JSON.stringify(old) !== JSON.stringify(next.items[n]))
const withProps = items.filter((i) => results.get(i.name).props.length).length
const summary = [
  `${items.length} items (examples left alone): ${changed.length} need a change, ${items.length - changed.length} are up to date.`,
  `props: ${withProps} items with props, ${items.length - withProps} without; extends on ${[...results.values()].filter((r) => r.extends).length}; kits with parts: ${[...results.values()].filter((r) => r.parts).length}.`,
  `usedIn: ${items.filter((i) => usedIn.get(i.name).size).length} items are used by another item.`,
  `a11y: ${next.items.filter((i) => i.meta?.a11y?.length).length} items have hand-written notes.`,
  ...(shallow ? ['Shallow git history: `added` is kept as stored, not checked.'] : []),
  ...(!inGit ? ['No git: `added` is today for new items.'] : []),
]
const names = (list) => list.map((i) => i.name).join(', ')

if (warnings.length) console.error(warnings.map((w) => `warning: ${w}`).join('\n'))
if (problems.length) {
  console.error(problems.map((w) => `error: ${w}`).join('\n'))
  if (CHECK || WRITE) process.exit(1)
}

if (CHECK) {
  if (nextText === registryText) {
    console.log(`${REGISTRY} meta is up to date (${items.length} items).`)
    process.exit(0)
  }
  console.error(`${REGISTRY} meta is out of date for ${changed.length} item(s): ${names(changed)}`)
  console.error('Run `npm run meta -- --write` and commit registry.json.')
  process.exit(1)
}

if (WRITE) {
  if (shallow) {
    console.error('Shallow git history: run `git fetch --unshallow` first, so `added` is right.')
    process.exit(1)
  }
  if (nextText !== registryText) fs.writeFileSync(REGISTRY, nextText)
  console.log(`${nextText !== registryText ? 'Wrote' : 'No change in'} ${REGISTRY}.\n${summary.join('\n')}`)
  process.exit(0)
}

console.log(summary.join('\n'))
if (VERBOSE) {
  for (const item of items) {
    const r = results.get(item.name)
    console.log(`  ${item.name.padEnd(24)} ${String(r.props.length).padStart(2)} props${r.parts ? ` (kit: ${r.parts.map((p) => p.name).join(', ')})` : ''}${r.extends ? `  extends ${r.extends}` : ''}  used in ${usedIn.get(item.name).size}  added ${addedOf(item)}`)
  }
} else if (changed.length) console.log(`Would change: ${shorten(names(changed.filter((i) => i.type !== 'registry:example')), 400)}`)
console.log('Nothing written. Use --write to update registry.json.')
