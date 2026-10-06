import type { GlImage } from '@/registry/manniche/hooks/use-gl-stage'

// Demo pictures for the WebGL carousels: twelve landscapes drawn as SVG, the same on every render and with no
// files to fetch. Each is a sky, a sun or moon, ranges of hills that grow darker as they come closer, sometimes
// water that mirrors them, and a fine grain so they read like prints rather than flat vector art.

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Look = {
  title: string
  alt: string
  sky: [string, string]
  sun: string
  /** Where the sun sits: x and y as parts of the width and height, and its radius in px. */
  at: [number, number, number]
  /** Hill colours from the farthest to the nearest. */
  hills: string[]
  /** How the hills are shaped. */
  form: 'soft' | 'sharp' | 'mesa' | 'dune' | 'pines'
  /** Water from this part of the height down, mirroring the sky and hills. */
  water?: number
}

const LOOKS: Look[] = [
  {
    title: 'Dunes',
    alt: 'Sand dunes in warm light under a low orange sun',
    sky: ['#efe2cb', '#f6ead6'],
    sun: '#d4683d',
    at: [0.68, 0.3, 54],
    hills: ['#e2c19c', '#cf9f72', '#b47a4e', '#8a5434', '#5c3420'],
    form: 'dune',
  },
  {
    title: 'Tide',
    alt: 'Blue-grey hills over a calm sea with a pale sun',
    sky: ['#c4d3da', '#e6ebe9'],
    sun: '#f4f1e8',
    at: [0.32, 0.28, 46],
    hills: ['#9fb3ba', '#78919a', '#56707b'],
    form: 'soft',
    water: 0.62,
  },
  {
    title: 'Ridge',
    alt: 'Jagged mountain ridges in violet dusk with a peach sky',
    sky: ['#2e3148', '#c98463'],
    sun: '#f3c992',
    at: [0.5, 0.52, 40],
    hills: ['#7a6274', '#5a4a60', '#3d3349', '#272236', '#161322'],
    form: 'sharp',
  },
  {
    title: 'Moonrise',
    alt: 'A full moon rising over dark hills at night',
    sky: ['#0e1822', '#2b3d4a'],
    sun: '#ece6d5',
    at: [0.3, 0.24, 36],
    hills: ['#2a3a45', '#1d2a33', '#131d24', '#0b1217'],
    form: 'soft',
  },
  {
    title: 'Fjord',
    alt: 'Green-grey cliffs above still water in a fjord',
    sky: ['#d3dacb', '#eef0e6'],
    sun: '#fbfaf3',
    at: [0.72, 0.2, 30],
    hills: ['#a3b09a', '#7a8c78', '#536654', '#334435'],
    form: 'sharp',
    water: 0.66,
  },
  {
    title: 'Mesa',
    alt: 'Flat-topped red rock mesas in a dry desert',
    sky: ['#f0d6b0', '#f7e8cf'],
    sun: '#fff6e4',
    at: [0.24, 0.26, 42],
    hills: ['#d79a6b', '#c37446', '#a1532f', '#73361c', '#47200f'],
    form: 'mesa',
  },
  {
    title: 'Fog bank',
    alt: 'Pale grey hills fading into fog',
    sky: ['#dde2e1', '#f1f2ef'],
    sun: '#ffffff',
    at: [0.6, 0.34, 64],
    hills: ['#cdd3d2', '#b4bdbc', '#97a3a2', '#748382', '#4d5c5c'],
    form: 'soft',
  },
  {
    title: 'Pines',
    alt: 'Dark pine forest on hills under an overcast sky',
    sky: ['#d8d6cb', '#ebe8de'],
    sun: '#f7f4ea',
    at: [0.4, 0.22, 34],
    hills: ['#a5a99a', '#7a8371', '#4f5c4a', '#2e3a2c'],
    form: 'pines',
  },
  {
    title: 'Salt flat',
    alt: 'A white salt flat under a wide blue sky, low hills on the horizon',
    sky: ['#9fbcd1', '#e6eef1'],
    sun: '#ffffff',
    at: [0.76, 0.18, 26],
    hills: ['#8ea6b3', '#b9c9cf'],
    form: 'soft',
    water: 0.7,
  },
  {
    title: 'Ember',
    alt: 'Black hills against a deep red sunset',
    sky: ['#1c1413', '#7a3220'],
    sun: '#f3934f',
    at: [0.46, 0.4, 58],
    hills: ['#43231d', '#2e1915', '#1d100e', '#100808'],
    form: 'sharp',
  },
  {
    title: 'Glacier',
    alt: 'Snow-capped peaks in cold blue light',
    sky: ['#e3edf2', '#f4f8f9'],
    sun: '#ffffff',
    at: [0.3, 0.2, 28],
    hills: ['#c4d4dc', '#9db4c2', '#d9e4e9', '#7894a6', '#4f6b7d'],
    form: 'sharp',
  },
  {
    title: 'Delta',
    alt: 'Low green river land at dawn, water reflecting a yellow sun',
    sky: ['#e6dfbf', '#f2eedb'],
    sun: '#e7b54a',
    at: [0.58, 0.4, 44],
    hills: ['#b8b98f', '#8f9a6c', '#66774d'],
    form: 'soft',
    water: 0.58,
  },
]

const W = 800
const H = 1000
const f = (v: number) => v.toFixed(1)

/** One range of hills as a closed path, from a base height and how tall and how rough it is. */
function range(r: () => number, form: Look['form'], base: number, rise: number, rough: number) {
  const pts: [number, number][] = []
  const phase = r() * 10
  const waves = [0.6 + r() * 0.8, 1.6 + r() * 1.4, 3.5 + r() * 3]
  for (let x = -10; x <= W + 10; x += 8) {
    const u = x / W
    let y = Math.sin(u * waves[0] * Math.PI + phase) * 0.55 + Math.sin(u * waves[1] * Math.PI + phase * 1.7) * 0.3
    if (form === 'sharp') y = 1 - Math.abs(Math.sin(u * waves[1] * Math.PI + phase)) * 1.4 + Math.sin(u * waves[2] * Math.PI) * 0.25
    if (form === 'dune') y = Math.sin(u * waves[0] * Math.PI + phase) * 0.7 + Math.pow(Math.abs(Math.sin(u * waves[1] * Math.PI + phase)), 3) * 0.6
    if (form === 'mesa') y = Math.max(-0.1, Math.min(0.55, Math.sin(u * waves[1] * Math.PI + phase) * 1.6)) + Math.sin(u * 40 + phase) * 0.02
    y += (r() - 0.5) * rough
    pts.push([x, base - y * rise])
  }
  if (form === 'pines') {
    // Trees: a row of narrow spikes along the ridge.
    const out: [number, number][] = []
    for (let i = 0; i < pts.length - 1; i++) {
      const [x, y] = pts[i]
      const h = 14 + r() * 26
      out.push([x, y], [x + 4, y - h], [x + 8, pts[i + 1][1]])
    }
    pts.splice(0, pts.length, ...out)
  }
  return `M${f(-10)} ${H}` + pts.map(([x, y]) => `L${f(x)} ${f(y)}`).join('') + `L${W + 10} ${H}Z`
}

function svg(look: Look, seed: number) {
  const r = rng(seed)
  const horizon = look.water ? look.water * H : H
  const n = look.hills.length
  const [sx, sy, sr] = look.at
  const hills = look.hills
    .map((c, i) => {
      // Farther ranges sit higher and are calmer.
      const k = i / Math.max(1, n - 1)
      const base = look.water ? horizon - (n - 1 - i) * 26 - 4 : H * (0.46 + k * 0.4)
      const rise = look.water ? 40 + k * 30 : 110 - k * 30
      return `<path d="${range(r, look.form, base, rise, look.form === 'sharp' ? 0.12 : 0.04)}" fill="${c}"/>`
    })
    .join('')
  const scene = `<rect width="${W}" height="${H}" fill="url(#s)"/><circle cx="${f(sx * W)}" cy="${f(sy * H)}" r="${sr}" fill="${look.sun}"/>${hills}`
  const water = look.water
    ? // The water mirrors the scene above it, darkened, with thin bright lines where light breaks on it.
      `<g clip-path="url(#w)"><g transform="matrix(1 0 0 -1 0 ${f(horizon * 2)})" opacity=".78">${scene}</g>` +
      `<rect y="${f(horizon)}" width="${W}" height="${f(H - horizon)}" fill="${look.hills[n - 1]}" opacity=".28"/>` +
      Array.from({ length: 22 }, (_, i) => {
        const y = horizon + 6 + i * i * 0.8
        const x = sx * W - 30 - r() * 60
        return `<rect x="${f(x)}" y="${f(y)}" width="${f(60 + r() * 120)}" height="1.6" fill="${look.sun}" opacity="${(0.55 - i * 0.02).toFixed(2)}"/>`
      }).join('') +
      `</g>`
    : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${look.sky[0]}"/><stop offset="1" stop-color="${look.sky[1]}"/></linearGradient>` +
    `<clipPath id="w"><rect y="${f(horizon)}" width="${W}" height="${f(H - horizon)}"/></clipPath>` +
    `<filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .9 0"/></filter></defs>` +
    scene +
    water +
    `<rect width="${W}" height="${H}" filter="url(#g)" opacity=".16" style="mix-blend-mode:overlay"/>` +
    `</svg>`
  )
}

export type GlPicture = GlImage & { title: string }

/** Twelve landscapes, 4:5, as SVG data addresses. */
export const glPictures: GlPicture[] = LOOKS.map((look, i) => ({
  title: look.title,
  alt: look.alt,
  src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg(look, i * 7 + 3))}`,
}))
