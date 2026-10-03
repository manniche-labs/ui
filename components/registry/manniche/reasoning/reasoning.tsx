import { Brain, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ReasoningProps = {
  /** The model's reasoning so far. Plain text or your own markup. */
  children: ReactNode
  /** True while the model is still thinking. */
  streaming?: boolean
  /** How long the thinking took, in milliseconds. Shown once it is done. */
  ms?: number
  /** Start open. By default it is open while streaming and closes when done. */
  defaultOpen?: boolean
  className?: string
}

function seconds(ms: number) {
  const s = Math.max(1, Math.round(ms / 1000))
  return s === 1 ? '1 second' : `${s} seconds`
}

/**
 * The model's thinking, folded away by default. It opens while the model thinks and closes when the answer starts,
 * unless the reader has opened or closed it themselves; then their choice stands.
 */
export function Reasoning({ children, streaming = false, ms, defaultOpen, className }: ReasoningProps) {
  const [open, setOpen] = useState(defaultOpen ?? streaming)
  const touched = useRef(false)
  const id = useId()

  useEffect(() => {
    if (!touched.current) setOpen(streaming)
  }, [streaming])

  const label = streaming ? 'Thinking' : ms !== undefined ? `Thought for ${seconds(ms)}` : 'Reasoning'

  return (
    <div className={cn('text-sm', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          touched.current = true
          setOpen((o) => !o)
        }}
        className="-ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <Brain className={cn('size-4', streaming && 'animate-pulse motion-reduce:animate-none')} aria-hidden />
        <span>{label}</span>
        <ChevronRight className={cn('size-4 transition-transform duration-150 ease-out-quint', open && 'rotate-90')} aria-hidden />
      </button>
      <div
        id={id}
        hidden={!open}
        className="mt-1 border-l-2 pl-4 leading-6 whitespace-pre-wrap text-muted-foreground animate-[manniche-reasoning_200ms_cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none"
      >
        <style href="manniche-reasoning" precedence="default">
          {'@keyframes manniche-reasoning { from { opacity: 0; transform: translateY(-4px) } }'}
        </style>
        {children}
      </div>
    </div>
  )
}
