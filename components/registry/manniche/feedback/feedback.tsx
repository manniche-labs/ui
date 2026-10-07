// Based on Watermelon UI's “Feedback” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten with lucide icons, focus handling and an async submit.
import { Send, Sparkle, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type FeedbackRating = 'up' | 'down'

export type FeedbackProps = {
  /** Called with the rating and the trimmed text when the form is sent. The form closes once the returned promise resolves. */
  onSubmit: (data: { rating: FeedbackRating; text: string }) => Promise<void> | void
  /** The heading of the form. Default “Share feedback”. */
  title?: string
  /** The question above the field after a thumbs up. */
  upPrompt?: string
  /** The question above the field after a thumbs down. */
  downPrompt?: string
  /** The placeholder text in the field. Default “Optional”. */
  placeholder?: string
  /** The text on the send button. Default “Send”. */
  sendLabel?: string
  /** The text on the send button while it is sending. */
  sendingLabel?: string
  /** The line shown under the thumbs after sending. */
  thanksLabel?: string
  /** The accessible name of the thumbs up button. Default “Helpful”. */
  upLabel?: string
  /** The accessible name of the thumbs down button. Default “Not helpful”. */
  downLabel?: string
  /** The accessible name of the close button. Default “Close”. */
  closeLabel?: string
  /** Classes for the outer wrapper. */
  className?: string
}

/** Thumbs up or down. The thumb pops, then grows into a card that asks for a line more. */
export function Feedback({
  onSubmit,
  title = 'Share feedback',
  upPrompt = 'What did you like most?',
  downPrompt = 'What could be better?',
  placeholder = 'Optional',
  sendLabel = 'Send',
  sendingLabel = 'Sending…',
  thanksLabel = 'Thanks for the feedback',
  upLabel = 'Helpful',
  downLabel = 'Not helpful',
  closeLabel = 'Close',
  className,
}: FeedbackProps) {
  const [rating, setRating] = useState<FeedbackRating | null>(null)
  const [popping, setPopping] = useState<FeedbackRating | null>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [thanks, setThanks] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)
  const thumbs = useRef<HTMLDivElement>(null)
  const id = useId()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!popping) return
    const t = setTimeout(() => {
      setPopping(null)
      setOpen(true)
    }, 480)
    return () => clearTimeout(t)
  }, [popping])

  useEffect(() => {
    if (open) field.current?.focus()
  }, [open])

  const pick = (r: FeedbackRating) => {
    if (popping) return
    setThanks(false)
    setRating(r)
    // Without motion there is no pop to wait for, so the form opens at once.
    if (reduce) setOpen(true)
    else setPopping(r)
  }
  const close = () => {
    setOpen(false)
    setText('')
    requestAnimationFrame(() => thumbs.current?.querySelector<HTMLButtonElement>('[aria-pressed=true]')?.focus())
  }

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.3, ease: 'easeInOut' }}>
      <LayoutGroup id={id}>
        <div className={cn('grid min-h-16 place-items-center', className)}>
          <AnimatePresence mode="popLayout" initial={false}>
            {!open ? (
              <motion.div key="thumbs" ref={thumbs} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="flex flex-col items-center gap-2">
                <div className="flex gap-3">
                  {(['up', 'down'] as const).map((r) => {
                    const Icon = r === 'up' ? ThumbsUp : ThumbsDown
                    return (
                      <motion.button
                        key={r}
                        layoutId={rating === r ? `${id}-card` : undefined}
                        type="button"
                        aria-label={r === 'up' ? upLabel : downLabel}
                        aria-pressed={rating === r}
                        onClick={() => pick(r)}
                        whileTap={{ scale: 0.94 }}
                        style={{ borderRadius: 20 }}
                        className="relative grid size-14 place-items-center bg-foreground text-background shadow-lg"
                      >
                        {popping === r &&
                          [0, 1, 2, 3, 4, 5].map((i) => {
                            const a = (i * Math.PI) / 3
                            return (
                              <motion.span
                                key={i}
                                aria-hidden
                                className="pointer-events-none absolute text-foreground"
                                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                                animate={{ scale: [0, 1.2, 0], x: Math.cos(a) * 44, y: Math.sin(a) * 44, opacity: [1, 1, 0], rotate: 90 }}
                                transition={{ duration: 0.48, ease: 'easeOut' }}
                              >
                                <Sparkle className="size-3" fill="currentColor" />
                              </motion.span>
                            )
                          })}
                        <motion.span
                          animate={popping === r ? { scale: [1, 1.7, 1], rotate: [0, r === 'up' ? -30 : 30, 0], y: [0, -4, 0] } : { scale: 1 }}
                          transition={{ duration: 0.48, ease: 'easeOut' }}
                        >
                          <Icon className="size-6" fill={rating === r ? 'currentColor' : 'none'} aria-hidden />
                        </motion.span>
                      </motion.button>
                    )
                  })}
                </div>
                <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
                  {thanks && thanksLabel}
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="card"
                layoutId={`${id}-card`}
                style={{ borderRadius: 28 }}
                onKeyDown={(e) => e.key === 'Escape' && close()}
                onSubmit={async (e) => {
                  e.preventDefault()
                  setSending(true)
                  try {
                    await onSubmit({ rating: rating!, text: text.trim() })
                    setThanks(true)
                    close()
                  } finally {
                    setSending(false)
                  }
                }}
                aria-labelledby={`${id}-title`}
                className="relative w-full max-w-sm overflow-hidden border bg-card p-6 text-card-foreground shadow-2xl"
              >
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
                  <button
                    type="button"
                    aria-label={closeLabel}
                    onClick={close}
                    className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" strokeWidth={2.5} aria-hidden />
                  </button>
                  <h2 id={`${id}-title`} className="pr-10 text-xl font-semibold">
                    {title}
                  </h2>
                  <label htmlFor={`${id}-text`} className="mt-1 mb-4 block text-sm text-muted-foreground">
                    {rating === 'up' ? upPrompt : downPrompt}
                  </label>
                  <textarea
                    ref={field}
                    id={`${id}-text`}
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={placeholder}
                    className="w-full resize-none rounded-2xl border bg-muted p-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-foreground px-5 font-medium text-background active:scale-95 motion-reduce:active:scale-100 disabled:opacity-60"
                  >
                    <Send className="size-4" aria-hidden />
                    {sending ? sendingLabel : sendLabel}
                  </button>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </MotionConfig>
  )
}
