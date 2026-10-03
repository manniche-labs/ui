// Based on Watermelon UI's “Contextual AI bar” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten with named tools and a working submit.
import { ArrowUp, Sparkles, Wrench } from 'lucide-react'
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'motion/react'
import { useId, useState, type ComponentType, type SubmitEvent } from 'react'
import { cn } from '@/lib/utils'

export type AiBarTool = {
  id: string
  /** Read aloud and shown as a tooltip. */
  label: string
  icon: ComponentType<{ className?: string }>
  onSelect?: () => void
}

export type AiActionBarProps = {
  tools: AiBarTool[]
  /** Runs with the instruction when the person sends it. */
  onAsk: (prompt: string) => void
  placeholder?: string
  labels?: { tools?: string; ask?: string; send?: string }
  defaultMode?: 'tools' | 'ask'
  className?: string
}

/** A toolbar that morphs into a one-line prompt for the AI, and back. */
export function AiActionBar({ tools, onAsk, placeholder = 'Ask AI to change it…', labels = {}, defaultMode = 'tools', className }: AiActionBarProps) {
  const [mode, setMode] = useState(defaultMode)
  const [text, setText] = useState('')
  const group = useId()
  const { tools: toolsLabel = 'Tools', ask = 'Ask AI', send = 'Send' } = labels
  const spring = { type: 'spring', stiffness: 260, damping: 32 } as const

  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const p = text.trim()
    if (!p) return
    onAsk(p)
    setText('')
  }

  const modes = [
    { id: 'tools', label: toolsLabel, Icon: Wrench },
    { id: 'ask', label: ask, Icon: Sparkles },
  ] as const

  return (
    <MotionConfig reducedMotion="user" transition={spring}>
      <LayoutGroup id={group}>
        <motion.div layout style={{ borderRadius: 28 }} className={cn('flex w-full max-w-md items-center gap-1 border bg-card p-1 shadow-sm', className)}>
          <div role="radiogroup" aria-label="Mode" className="flex shrink-0 items-center gap-0.5 rounded-full bg-background p-1 shadow-sm">
            {modes.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={mode === id}
                aria-label={label}
                title={label}
                onClick={() => setMode(id)}
                className="relative grid size-10 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {mode === id && <motion.span layoutId="mode" className="absolute inset-0 rounded-full bg-muted" />}
                <Icon className="relative size-[18px]" aria-hidden />
              </button>
            ))}
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            {mode === 'tools' ? (
              <motion.div
                key="tools"
                initial={{ opacity: 0, x: 24, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: 24, filter: 'blur(4px)' }}
                className="flex flex-1 items-center justify-end gap-1 pr-1"
              >
                {tools.map(({ id, label, icon: Icon, onSelect }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={onSelect}
                    aria-label={label}
                    title={label}
                    className="grid size-10 place-items-center rounded-full text-foreground transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[0.92]"
                  >
                    <Icon className="size-[18px]" />
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.form
                key="ask"
                onSubmit={submit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-w-0 flex-1 items-center gap-1 pl-2"
              >
                <input
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={placeholder}
                  aria-label={ask}
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  aria-label={send}
                  disabled={!text.trim()}
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-background transition-[opacity,transform] duration-150 active:scale-[0.92] disabled:opacity-30"
                >
                  <ArrowUp className="size-[18px]" aria-hidden />
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </MotionConfig>
  )
}
