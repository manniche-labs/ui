import { ArrowRight } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { SHADER_PRESETS, ShaderBackdrop, type ShaderPreset, type ShaderVariant } from '@/registry/manniche/shader-backdrop/shader-backdrop'

const FAMILIES: ShaderVariant[] = ['mesh', 'swirl', 'halftone', 'metal', 'aurora', 'flame', 'cells']
const NAMES = Object.keys(SHADER_PRESETS) as ShaderPreset[]

// Radio groups take one tab stop; the arrow keys move the choice, as with native radio buttons.
function arrows(e: KeyboardEvent<HTMLDivElement>) {
  const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key]
  if (!step) return
  e.preventDefault()
  const radios = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
  const next = radios[(radios.indexOf(document.activeElement as HTMLButtonElement) + step + radios.length) % radios.length]
  next.focus()
  next.click()
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 150
}

export default function ShaderBackdropDemo() {
  const [preset, setPreset] = useState<ShaderPreset>('mesh-lilac')
  const { variant, colors } = SHADER_PRESETS[preset]
  // Light text on dark looks. Aurora and flame are night skies whatever their ramp, so they always get light text;
  // flame burns at the bottom, so its text goes to the top.
  const light = variant !== 'aurora' && variant !== 'flame' && isLight(colors[0])

  return (
    <div className="flex w-full flex-col gap-4">
      <ShaderBackdrop preset={preset} className={`flex aspect-[16/10] w-full flex-col rounded-3xl p-6 sm:p-8 ${variant === 'flame' ? 'justify-start' : 'justify-end'}`}>
        <div className={light ? 'text-neutral-950' : 'text-white'}>
          <p className="text-sm font-medium opacity-75">Spring collection</p>
          <h3 className="mt-1 max-w-xs font-serif text-3xl leading-tight text-balance">Made slowly, worn for years</h3>
          <a
            href="#shop"
            className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium ${light ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-950'}`}
          >
            Shop the collection
            <ArrowRight className="size-4" aria-hidden />
          </a>
        </div>
      </ShaderBackdrop>

      <div role="radiogroup" aria-label="Family" onKeyDown={arrows} className="flex flex-wrap gap-1">
        {FAMILIES.map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={variant === f}
            tabIndex={variant === f ? 0 : -1}
            onClick={() => setPreset(NAMES.find((n) => SHADER_PRESETS[n].variant === f)!)}
            className="min-h-11 rounded-xl px-3 text-sm font-medium capitalize text-muted-foreground hover:text-foreground aria-checked:bg-muted aria-checked:text-foreground"
          >
            {f}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label="Look" onKeyDown={arrows} className="flex flex-wrap gap-2">
        {NAMES.filter((n) => SHADER_PRESETS[n].variant === variant).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={preset === n}
            tabIndex={preset === n ? 0 : -1}
            title={n}
            onClick={() => setPreset(n)}
            className="grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-background transition-transform duration-150 ease-out-quint active:scale-[0.94] motion-reduce:transition-none aria-checked:ring-2 aria-checked:ring-foreground"
          >
            <span
              className="size-9 rounded-full border border-black/10"
              style={{ background: `conic-gradient(${[...SHADER_PRESETS[n].colors, SHADER_PRESETS[n].colors[0]].join(',')})` }}
            />
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        <code>{preset}</code> · one of {NAMES.length} looks
      </p>
    </div>
  )
}
