import { useState, type KeyboardEvent } from 'react'
import { GravityGrid } from '@/registry/manniche/gravity-grid/gravity-grid'

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

export default function GravityGridDemo() {
  const [variant, setVariant] = useState<'dots' | 'lines'>('dots')

  return (
    <div className="flex w-full flex-col gap-4">
      <GravityGrid
        variant={variant}
        gap={variant === 'dots' ? 24 : 32}
        className="grid aspect-[16/10] w-full place-items-center rounded-3xl border bg-card p-6 text-center"
      >
        <div>
          <p className="text-sm font-medium text-muted-foreground">Move the pointer over the grid</p>
          <h3 className="mt-1 font-serif text-3xl text-balance">Everything leans towards you</h3>
        </div>
      </GravityGrid>
      <div role="radiogroup" aria-label="Grid" onKeyDown={arrows} className="flex gap-1">
        {(['dots', 'lines'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={variant === v}
            tabIndex={variant === v ? 0 : -1}
            onClick={() => setVariant(v)}
            className="min-h-11 rounded-xl px-3 text-sm font-medium capitalize text-muted-foreground transition-colors duration-150 hover:text-foreground aria-checked:bg-muted aria-checked:text-foreground"
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}
