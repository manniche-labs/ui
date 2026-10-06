// Turns each template (registry items in the "templates" category) into one self-contained HTML file:
// the React markup rendered once, plus only the Tailwind CSS it uses. Every interaction in the templates is
// plain HTML and CSS, so the static file behaves like the React version.
//
//   node scripts/template-html.mjs
//
// Writes dist-templates/<name>.html and dist-templates/themes.json (the <style id="theme"> block per colour,
// so the lab page can swap the colour of a download).
import fs from 'node:fs'
import path from 'node:path'
import { compile, optimize } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import * as prettier from 'prettier'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const out = 'dist-templates'
const registry = JSON.parse(fs.readFileSync('registry.json', 'utf8'))
const templates = registry.items.filter((i) => i.categories?.includes('templates') && i.type !== 'registry:example')

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { COLOURS, colourVars } = await vite.ssrLoadModule('/src/template-theme.ts')

// The base theme lives in src/index.css: light tokens in :root, dark in .dark. The theme block is kept out of
// the Tailwind build so it stays readable and can be swapped as a whole.
const indexCss = fs.readFileSync('src/index.css', 'utf8')
const block = (selector) => Object.fromEntries([...indexCss.match(new RegExp(`^${selector} \\{([^}]*)\\}`, 'm'))[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]))
const base = { light: block(':root'), dark: block('\\.dark') }

const decl = (vars, indent) =>
  Object.entries(vars)
    .map(([k, v]) => `${indent}${k}: ${v};`)
    .join('\n')

function themeCss(colour) {
  const light = { ...base.light, ...colourVars(colour, 'light') }
  const dark = { ...base.dark, ...colourVars(colour, 'dark') }
  return [
    `/* Colour: ${colour.name}. Light by default, dark when the system asks for it or <html data-theme="dark">. */`,
    `:root {\n  color-scheme: light;\n${decl(light, '  ')}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme='light']) {\n    color-scheme: dark;\n${decl(dark, '    ')}\n  }\n}`,
    `:root[data-theme='dark'] {\n  color-scheme: dark;\n${decl(dark, '  ')}\n}`,
  ].join('\n')
}

// Everything in index.css except the token blocks and the gallery's @source: the @theme mapping and base styles.
const tailwindInput = indexCss
  .replace(/^@source .*$/m, '')
  .replace(/^:root \{[^}]*\}/m, '')
  .replace(/^\.dark \{[^}]*\}/m, '')
  .replace('"Inter", ', '')
  .replace('"Fraunces", ', '')
const compiler = await compile(tailwindInput, { base: process.cwd(), onDependency() {} })

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })

const scanner = new Scanner({})
for (const t of templates) {
  const entry = t.files[0].path
  const mod = await vite.ssrLoadModule('/' + entry)
  const Component = Object.values(mod).find((v) => typeof v === 'function')
  // A template that needs data (the dashboards, sections and finance screens) is rendered through its demo, which passes example data.
  const demo = `registry/manniche/examples/${t.name}-demo.tsx`
  let body
  try {
    body = renderToStaticMarkup(createElement(Component))
  } catch {
    const demoMod = await vite.ssrLoadModule('/' + demo)
    body = renderToStaticMarkup(createElement(Object.values(demoMod).find((v) => typeof v === 'function')))
  }
  // Classes from the rendered markup and from the source, so classes that only show in another state are kept too.
  const candidates = scanner.scanFiles([
    { content: body, extension: 'html' },
    ...t.files.map((f) => ({ content: fs.readFileSync(f.path, 'utf8'), extension: 'tsx' })),
  ])
  const css = optimize(compiler.build(candidates), { minify: true }).code
  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.title}</title>
<!-- ${t.title}, a template from Manniche UI: https://mikkelmanniche.dk/lab/templates/${t.name}. MIT licence. -->
<style id="theme">
${themeCss(COLOURS[0])}
</style>
<style>${css}</style>
</head>
<body>
${body}
</body>
</html>
`
  const pretty = await prettier.format(page, { parser: 'html', printWidth: 160, htmlWhitespaceSensitivity: 'css' })
  fs.writeFileSync(path.join(out, `${t.name}.html`), pretty)
  console.log(`${t.name}.html  ${(pretty.length / 1024).toFixed(0)} kB`)
}

const themes = Object.fromEntries(COLOURS.map((c) => [c.id, { name: c.name, css: themeCss(c), light: colourVars(c, 'light'), dark: colourVars(c, 'dark') }]))
fs.writeFileSync(path.join(out, 'themes.json'), JSON.stringify(themes, null, 1) + '\n')

await vite.close()
