// An email capture as one quiet Tiles card: a headline, a short "what you get" checklist and the form. The form
// validates on blur and on submit, keeps its width while it sends (the label fades out and a spinner fades in on the
// same button), and on success is replaced by a confirmation that says the address back in mono. Signature: the
// success state shows the address the user typed, so they can spot a typo at once. Nothing is sent by the section:
// `onSubmit` receives the values and returns a promise it awaits.
// Screen readers get a labelled section with one h2 and a list; the field has a real label, errors are tied to it
// with aria-invalid and aria-describedby and focus moves to it when it is invalid; the success text is announced
// through a polite live region. Under reduced motion the spinner stops turning and the success state appears at once.
import { Check } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

export type CtaSignupValues = {
  /** The address the user typed, trimmed. */
  email: string
}

export type CtaSignupLabels = {
  /** The visible label of the field. Default "Email address". */
  email?: string
  /** The submit button. Default "Subscribe". */
  submit?: string
  /** Hidden text on the button while it sends. Default "Sending". */
  sending?: string
  /** Shown when the field is empty. Default "Enter your email address." */
  required?: string
  /** Shown when the address does not look right. Default "That does not look like an email address. Check it for typos, for example name@example.com." */
  invalid?: string
  /** Shown when `onSubmit` rejects. Default "Something went wrong and nothing was saved. Try again in a moment." */
  failed?: string
  /** The heading of the success state. Default "You are on the list." */
  successTitle?: string
  /** The sentence in front of the address in the success state. Default "We sent a confirmation to" */
  successText?: string
  /** The button in the success state that goes back to the form. Default "Use a different address". */
  reset?: string
  /** The small heading of the checklist, hidden from sight and read by screen readers. Default "What you get". */
  includes?: string
}

const DEFAULT_LABELS: Required<CtaSignupLabels> = {
  email: 'Email address',
  submit: 'Subscribe',
  sending: 'Sending',
  required: 'Enter your email address.',
  invalid: 'That does not look like an email address. Check it for typos, for example name@example.com.',
  failed: 'Something went wrong and nothing was saved. Try again in a moment.',
  successTitle: 'You are on the list.',
  successText: 'We sent a confirmation to',
  reset: 'Use a different address',
  includes: 'What you get',
}

export type CtaSignupProps = Omit<ComponentProps<'section'>, 'children' | 'title' | 'onSubmit'> & {
  /** The headline of the card. */
  title: ReactNode
  /** One sentence under the headline. */
  description?: ReactNode
  /** What the person gets, 3 to 5 short items. Shown as a list with check marks. */
  items: ReactNode[]
  /** The consent line under the form, such as a sentence with a link to the privacy policy. */
  consent?: ReactNode
  /**
   * Called with the values when the form is valid. Return a promise; the button shows its sending state until it
   * settles. Resolve to show the success state, reject to show an error and keep the typed text. The section itself
   * never sends anything.
   */
  onSubmit?: (values: CtaSignupValues) => Promise<void> | void
  /** The `autocomplete` token of the field. Default "email". */
  autoComplete?: string
  /** Text for the interface itself, for translation. */
  labels?: CtaSignupLabels
}

type Status = 'idle' | 'sending' | 'sent'

// A forgiving check: something@something.tld without spaces. The server decides what is really valid.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** The email capture card: checklist, one field, validation, a sending state and a confirmation that echoes the address. */
export function CtaSignup({
  title,
  description,
  items,
  consent,
  onSubmit,
  autoComplete = 'email',
  labels,
  className,
  ...rest
}: CtaSignupProps) {
  const l = { ...DEFAULT_LABELS, ...labels }
  const uid = useId()
  const headingId = `${uid}-title`
  const inputId = `${uid}-email`
  const errorId = `${uid}-error`
  const consentId = `${uid}-consent`
  const inputRef = useRef<HTMLInputElement>(null)
  const resetRef = useRef<HTMLButtonElement>(null)
  const alive = useRef(false)
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [failed, setFailed] = useState(false)
  const [sentTo, setSentTo] = useState('')

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // The submit button goes away with the form, so focus moves to the success state's only control instead of
  // falling back to the page. The live region still reads the confirmation.
  useEffect(() => {
    if (status === 'sent') resetRef.current?.focus()
  }, [status])

  const trimmed = value.trim()
  const problem = !trimmed ? l.required : !EMAIL.test(trimmed) ? l.invalid : null
  const showProblem = touched && problem
  const sending = status === 'sending'

  const submit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (sending) return
      setTouched(true)
      if (problem) {
        inputRef.current?.focus()
        return
      }
      setFailed(false)
      setStatus('sending')
      try {
        await onSubmit?.({ email: trimmed })
        if (!alive.current) return
        setSentTo(trimmed)
        setStatus('sent')
      } catch {
        if (!alive.current) return
        setFailed(true)
        setStatus('idle')
      }
    },
    [sending, problem, onSubmit, trimmed],
  )

  const reset = () => {
    setValue('')
    setTouched(false)
    setFailed(false)
    setStatus('idle')
    // Wait for the form to render again before moving focus into it.
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const describedBy = [showProblem || failed ? errorId : null, consent ? consentId : null].filter(Boolean).join(' ') || undefined

  return (
    <section
      aria-labelledby={headingId}
      {...rest}
      className={cn('@container mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 @3xl:py-20', className)}
    >
      <div className="grid gap-10 rounded-[calc(var(--radius)*2+2px)] bg-card px-6 py-8 text-card-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)] @min-[40rem]:px-10 @min-[40rem]:py-12 @min-[56rem]:grid-cols-2 @min-[56rem]:gap-16 @min-[64rem]:px-14 @min-[64rem]:py-14">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="max-w-[20ch] text-[clamp(1.75rem,6cqi,3rem)] leading-[1.04] font-extrabold tracking-[-0.04em] text-balance"
            style={{ fontFamily: 'var(--font-display, inherit)', fontStretch: '86%' }}
          >
            {title}
          </h2>
          {description && <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-pretty text-muted-foreground">{description}</p>}
          <h3 className="sr-only">{l.includes}</h3>
          <ul className="mt-7 grid gap-3">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] leading-snug">
                <span aria-hidden className="mt-px grid size-5 flex-none place-items-center rounded-full bg-muted text-foreground">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span className="min-w-0 text-pretty">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 self-center">
          <div role="status" aria-live="polite">
            {status === 'sent' && (
              <div className="rounded-[14px] bg-muted p-6 transition-[opacity,transform] duration-300 ease-out-quint starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none">
                <span aria-hidden className="grid size-9 place-items-center rounded-full bg-foreground text-background">
                  <Check className="size-[18px]" strokeWidth={2.5} />
                </span>
                <p className="mt-4 text-xl leading-tight font-semibold tracking-[-0.02em]">{l.successTitle}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{l.successText}</p>
                <p className="mt-1 font-mono text-[13px] leading-relaxed break-all tabular-nums">{sentTo}</p>
                <button
                  ref={resetRef}
                  type="button"
                  onClick={reset}
                  className="mt-4 -ml-3 inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium underline underline-offset-4 transition-[opacity,transform] duration-150 ease-out-quint hover:opacity-70 active:scale-[0.97] motion-reduce:transition-none"
                >
                  {l.reset}
                </button>
              </div>
            )}
          </div>

          {status !== 'sent' && (
            <form noValidate onSubmit={submit} aria-busy={sending || undefined}>
              <label htmlFor={inputId} className="block text-sm font-medium">
                {l.email}
              </label>
              <div className="mt-2 flex flex-col gap-3 @min-[32rem]:flex-row">
                <input
                  ref={inputRef}
                  id={inputId}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete={autoComplete}
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={value}
                  readOnly={sending}
                  onChange={(e) => setValue(e.target.value)}
                  onBlur={() => value && setTouched(true)}
                  aria-invalid={showProblem ? true : undefined}
                  aria-describedby={describedBy}
                  className={cn(
                    'h-12 w-full min-w-0 rounded-[14px] @min-[32rem]:flex-1 bg-background px-4 text-base text-foreground shadow-[inset_0_0_0_1px_var(--border)] outline-offset-2 placeholder:text-muted-foreground/70',
                    showProblem && 'shadow-[inset_0_0_0_1.5px_var(--destructive)]',
                  )}
                  placeholder="name@example.com"
                />
                <button
                  type="submit"
                  aria-disabled={sending || undefined}
                  className="relative inline-flex h-12 flex-none items-center justify-center rounded-full bg-primary px-6 text-[15px] font-medium whitespace-nowrap text-primary-foreground transition-[transform,opacity] duration-150 ease-out-quint hover:opacity-90 active:scale-[0.97] aria-disabled:cursor-progress motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                  <span className={cn('transition-[opacity,transform] duration-150 ease-out-quint motion-reduce:transition-none', sending && 'scale-95 opacity-0')}>
                    {l.submit}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-0 grid place-items-center transition-[opacity,transform] duration-150 ease-out-quint motion-reduce:transition-none',
                      sending ? 'opacity-100' : 'scale-90 opacity-0',
                    )}
                  >
                    <svg viewBox="0 0 24 24" className="size-5 animate-spin motion-reduce:animate-none" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="9" opacity="0.25" />
                      <path d="M21 12a9 9 0 0 0-9-9" />
                    </svg>
                  </span>
                  {sending && <span className="sr-only">{l.sending}</span>}
                </button>
              </div>
              <div id={errorId} role={failed ? 'alert' : undefined} className="empty:hidden">
                {showProblem ? (
                  <p className="mt-2 text-sm leading-snug text-destructive">{problem}</p>
                ) : failed ? (
                  <p className="mt-2 text-sm leading-snug text-destructive">{l.failed}</p>
                ) : null}
              </div>
              {consent && (
                <p id={consentId} className="mt-4 text-[13px] leading-relaxed text-pretty text-muted-foreground [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-foreground">
                  {consent}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
