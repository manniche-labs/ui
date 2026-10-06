import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Keycap } from '@/registry/manniche/keycap/keycap'

type Key = 'esc' | 'cmd' | 'k'

// The real key each cap mirrors while the row has focus.
const PHYSICAL: Record<string, Key> = { Meta: 'cmd', k: 'k', K: 'k', Escape: 'esc' }

export default function KeycapDemo() {
  const [latched, setLatched] = useState(false)
  const [text, setText] = useState('ready')
  const [on, setOn] = useState(false)
  const [held, setHeld] = useState<Key[]>([])
  const flash = useRef(0)
  const chord = useRef(false)

  useEffect(() => () => window.clearTimeout(flash.current), [])

  const show = (s: string, lit: boolean, after = 0) => {
    window.clearTimeout(flash.current)
    setText(s)
    setOn(lit)
    if (after) flash.current = window.setTimeout(() => show('ready', false), after)
  }

  const act = (key: Key, withCmd = latched) => {
    if (key === 'cmd') {
      setLatched(!latched)
      show(latched ? 'ready' : '⌘ _', !latched)
    } else if (key === 'esc') {
      setLatched(false)
      show('ready', false)
    } else if (withCmd) {
      setLatched(false)
      show('⌘ K  open', true, 1600)
    } else show('K', false, 900)
  }

  const hold = (k: Key, v: boolean) => setHeld((h) => (v ? [...h.filter((x) => x !== k), k] : h.filter((x) => x !== k)))

  // Real keys mirror onto the caps. Cmd+K is handled on key down, because macOS swallows the K key-up while Cmd is held.
  function keyDown(e: KeyboardEvent<HTMLDivElement>) {
    const k = PHYSICAL[e.key]
    if (!k || e.repeat) return
    e.preventDefault()
    hold(k, true)
    if (k === 'cmd') chord.current = false
    if (k === 'k' && e.metaKey) {
      chord.current = true
      act('k', true)
    }
  }
  function keyUp(e: KeyboardEvent<HTMLDivElement>) {
    const k = PHYSICAL[e.key]
    if (!k) return
    if (k === 'cmd') {
      setHeld([])
      if (!chord.current) act('cmd')
      return
    }
    hold(k, false)
    if (!(k === 'k' && chord.current)) act(k)
  }

  return (
    <div className="grid w-full justify-items-center gap-7 py-6">
      <div
        aria-hidden
        className="flex h-[46px] w-[276px] max-w-full items-center gap-3 rounded-md bg-[color-mix(in_oklab,var(--muted)_70%,var(--background))] px-3.5 font-mono text-sm leading-none font-medium tabular-nums shadow-[inset_0_0_0_1px_var(--border),inset_0_2px_3px_color-mix(in_oklab,var(--foreground)_9%,transparent)] dark:bg-[color-mix(in_oklab,var(--background),black_22%)]"
      >
        <span className="relative size-[7px] flex-none rounded-full shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_30%,transparent)]">
          <span
            className={`absolute inset-0 rounded-full bg-primary transition-opacity duration-120 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${on ? 'opacity-100' : 'opacity-0'}`}
          />
        </span>
        <span className="flex-1 tracking-[0.04em] whitespace-pre">{text}</span>
        <span className="text-[10.5px] font-normal text-muted-foreground">try ⌘ then K</span>
      </div>

      <div role="group" aria-label="Keys, demo" onKeyDown={keyDown} onKeyUp={keyUp} className="flex items-end gap-2.5">
        <Keycap legend="corner" aria-label="Escape, clears" down={held.includes('esc')} onClick={() => act('esc')}>
          esc
        </Keycap>
        <Keycap
          latch
          width={94}
          aria-label="Command, latches"
          pressed={latched}
          down={held.includes('cmd')}
          onClick={() => act('cmd')}
        >
          ⌘
        </Keycap>
        <Keycap aria-label="K" down={held.includes('k')} onClick={() => act('k')}>
          K
        </Keycap>
      </div>

      <p className="sr-only" aria-live="polite">
        {text === 'ready' ? '' : text.replace('⌘', 'Command')}
      </p>
    </div>
  )
}
