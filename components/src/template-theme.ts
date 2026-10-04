// The colours a template can be shown in. Used by the preview, the static HTML export and the lab pages,
// so a colour picked on the site is the same colour in the downloaded file.
export type Mode = 'light' | 'dark'

export type Colour = { id: string; name: string; hue: number; chroma: number }

export const COLOURS: Colour[] = [
  { id: 'blue', name: 'Blue', hue: 262, chroma: 0.2 },
  { id: 'green', name: 'Green', hue: 155, chroma: 0.14 },
  { id: 'amber', name: 'Amber', hue: 55, chroma: 0.16 },
  { id: 'rose', name: 'Rose', hue: 10, chroma: 0.19 },
  { id: 'violet', name: 'Violet', hue: 295, chroma: 0.19 },
  { id: 'graphite', name: 'Graphite', hue: 80, chroma: 0 },
]

/** The theme variables that change with the colour. Everything else comes from the base theme. */
export function colourVars(c: Colour, mode: Mode): Record<string, string> {
  const { hue: h, chroma: k } = c
  if (k === 0) {
    return mode === 'light'
      ? {
          '--primary': 'oklch(0.24 0.01 80)',
          '--primary-foreground': 'oklch(0.99 0 0)',
          '--accent': 'oklch(0.94 0.004 90)',
          '--accent-foreground': 'oklch(0.24 0.01 80)',
          '--ring': 'oklch(0.24 0.01 80)',
        }
      : {
          '--primary': 'oklch(0.93 0.006 90)',
          '--primary-foreground': 'oklch(0.2 0.01 80)',
          '--accent': 'oklch(0.28 0.006 80)',
          '--accent-foreground': 'oklch(0.93 0.006 90)',
          '--ring': 'oklch(0.93 0.006 90)',
        }
  }
  return mode === 'light'
    ? {
        '--primary': `oklch(0.52 ${k} ${h})`,
        '--primary-foreground': 'oklch(0.99 0 0)',
        '--accent': `oklch(0.95 ${(k * 0.17).toFixed(3)} ${h})`,
        '--accent-foreground': `oklch(0.36 ${(k * 0.7).toFixed(3)} ${h})`,
        '--ring': `oklch(0.52 ${k} ${h})`,
      }
    : {
        '--primary': `oklch(0.74 ${(k * 0.75).toFixed(3)} ${h})`,
        '--primary-foreground': `oklch(0.18 ${(k * 0.12).toFixed(3)} ${h})`,
        '--accent': `oklch(0.29 ${(k * 0.25).toFixed(3)} ${h})`,
        '--accent-foreground': `oklch(0.9 ${(k * 0.25).toFixed(3)} ${h})`,
        '--ring': `oklch(0.74 ${(k * 0.75).toFixed(3)} ${h})`,
      }
}

export const colourById = (id: string | null) => COLOURS.find((c) => c.id === id) ?? COLOURS[0]
