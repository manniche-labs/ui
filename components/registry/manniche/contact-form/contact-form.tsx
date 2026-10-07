// Contact form: a two-tile split. The form tile holds name, email, topic (Pills), message with a mono character
// count, and an optional consent checkbox; the info tile holds email, phone, address and the response time.
// Signature: the count turns destructive, with the words "12 over", only when over the limit.
// Screen readers: real labels, aria-invalid + aria-describedby on errors, focus moves to the first invalid field,
// and sending, sent and error states are announced through a live region. The form never sends anything itself:
// onSubmit returns a promise the section awaits. On a narrow tile the topic Pills become a native select.
// Reduced motion: the press feedback on the send button is dropped; nothing else moves.
import { useEffect, useId, useRef, useState, type FormEvent, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Pills, type PillOption } from '@/registry/manniche/chart-kit/chart-kit'

export type ContactFormValues = { name: string; email: string; topic: string; message: string; consent: boolean }

export type ContactInfo = {
  email?: string
  phone?: string
  address?: ReactNode
  /** "We reply within two working days." */
  responseTime?: ReactNode
}

export type ContactFormProps = Omit<HTMLAttributes<HTMLElement>, 'onSubmit' | 'title'> & {
  /** The section heading (h2). */
  heading: ReactNode
  /** One line under the heading. */
  intro?: ReactNode
  /** Topics shown as Pills. */
  topics: PillOption[]
  /** Message limit in characters. Default 800. */
  maxLength?: number
  /** Consent line (may hold a privacy link). The checkbox only appears when this is passed. */
  consent?: ReactNode
  /** Content of the info tile. */
  info: ContactInfo
  /** Called with the values; the section waits for it. Reject to show the error state. */
  onSubmit?: (values: ContactFormValues) => Promise<void> | void
  /** Visible text and screen reader text, with English defaults. */
  labels?: {
    name?: string; email?: string; topic?: string; message?: string; send?: string; sending?: string
    sentTitle?: string; sentText?: string; another?: string; errorText?: string; retry?: string
    nameError?: string; emailError?: string; messageError?: string; consentError?: string
    over?: (n: number) => string; infoTitle?: string; emailLabel?: string; phoneLabel?: string; addressLabel?: string
  }
}

type Status = 'idle' | 'sending' | 'sent' | 'error'
type Errors = Partial<Record<'name' | 'email' | 'message' | 'consent', string>>

const TILE = 'rounded-[26px] bg-card text-card-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_9%,transparent),0_1px_2px_rgba(0,0,0,0.03)]'
const FIELD =
  'mt-1.5 block min-h-11 w-full rounded-[14px] border border-border bg-background px-3.5 text-base outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring aria-[invalid=true]:border-destructive'

export function ContactForm({ heading, intro, topics, maxLength = 800, consent, info, onSubmit, labels = {}, className, ...rest }: ContactFormProps) {
  const L = {
    name: 'Name', email: 'Email', topic: 'Topic', message: 'Message', send: 'Send message', sending: 'Sending',
    sentTitle: 'Message sent', sentText: 'Thank you. We will be in touch.', another: 'Write another',
    errorText: 'The message did not go through. Your text is still here, so you can try again.', retry: 'Try again',
    nameError: 'Enter your name.', emailError: 'Enter an email address like name@example.com.',
    messageError: 'Write a message, or shorten it to the limit.', consentError: 'Tick the box to agree before sending.',
    over: (n: number) => `${n} over`, infoTitle: 'Other ways to reach us', emailLabel: 'Email', phoneLabel: 'Phone', addressLabel: 'Address',
    ...labels,
  }
  const uid = useId()
  const [values, setValues] = useState<ContactFormValues>({ name: '', email: '', topic: topics[0]?.id ?? '', message: '', consent: false })
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>('idle')
  const formRef = useRef<HTMLFormElement>(null)
  const sentRef = useRef<HTMLHeadingElement>(null)
  const reset = useRef(false)
  // The form disappears when sent, so focus moves to the confirmation instead of being lost; after "Write another"
  // it moves back to the first field.
  useEffect(() => {
    if (status === 'sent') sentRef.current?.focus()
    if (status === 'idle' && reset.current) {
      reset.current = false
      formRef.current?.querySelector<HTMLElement>('[name="name"]')?.focus()
    }
  }, [status])

  const validate = (v: ContactFormValues): Errors => {
    const e: Errors = {}
    if (!v.name.trim()) e.name = L.nameError
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = L.emailError
    if (!v.message.trim() || v.message.length > maxLength) e.message = L.messageError
    if (consent && !v.consent) e.consent = L.consentError
    return e
  }
  const set = <K extends keyof ContactFormValues>(k: K, val: ContactFormValues[K]) => setValues((v) => ({ ...v, [k]: val }))
  const blur = (k: keyof Errors) => setErrors((e) => ({ ...e, [k]: validate(values)[k] }))

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (status === 'sending') return
    const e = validate(values)
    setErrors(e)
    const first = (['name', 'email', 'message', 'consent'] as const).find((k) => e[k])
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setStatus('sending')
    try {
      await onSubmit?.(values)
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  const left = maxLength - values.message.length
  const over = left < 0
  const err = (k: keyof Errors) => (errors[k] ? `${uid}-${k}-err` : undefined)
  const errMsg = (k: keyof Errors) =>
    errors[k] ? (
      <p id={`${uid}-${k}-err`} className="mt-1.5 text-sm text-destructive">
        {errors[k]}
      </p>
    ) : null

  return (
    <section aria-labelledby={`${uid}-h`} className={cn('@container mx-auto w-full max-w-6xl px-4 py-12 sm:px-6', className)} {...rest}>
      <header className="max-w-2xl">
        <h2 id={`${uid}-h`} className="font-[family-name:var(--font-display,inherit)] text-3xl font-semibold tracking-tight text-balance @min-[40rem]:text-4xl">
          {heading}
        </h2>
        {intro && <p className="mt-3 text-muted-foreground">{intro}</p>}
      </header>

      <div className="mt-8 grid gap-3 @min-[52rem]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className={cn(TILE, '@container/form p-6')}>
          <div role="status" aria-live="polite" className="sr-only">
            {status === 'sending' ? L.sending : status === 'sent' ? L.sentTitle : status === 'error' ? L.errorText : ''}
          </div>
          {status === 'sent' ? (
            <div>
              <h3 ref={sentRef} tabIndex={-1} className="text-xl font-semibold outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring">{L.sentTitle}</h3>
              <p className="mt-2 text-muted-foreground">{L.sentText}</p>
              <p className="mt-4 font-mono text-xs tabular-nums text-muted-foreground">{values.email}</p>
              <button
                type="button"
                onClick={() => {
                  setValues({ name: '', email: '', topic: topics[0]?.id ?? '', message: '', consent: false })
                  reset.current = true
                  setStatus('idle')
                }}
                className="mt-6 inline-flex min-h-11 items-center rounded-full bg-muted px-4 text-sm font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {L.another}
              </button>
            </div>
          ) : (
            <form ref={formRef} onSubmit={submit} noValidate className="grid gap-5">
              <div>
                <label htmlFor={`${uid}-name`} className="text-sm font-medium">{L.name}</label>
                <input id={`${uid}-name`} name="name" type="text" autoComplete="name" value={values.name}
                  onChange={(e) => set('name', e.target.value)} onBlur={() => blur('name')}
                  aria-invalid={!!errors.name} aria-describedby={err('name')} className={FIELD} />
                {errMsg('name')}
              </div>
              <div>
                <label htmlFor={`${uid}-email`} className="text-sm font-medium">{L.email}</label>
                <input id={`${uid}-email`} name="email" type="email" autoComplete="email" inputMode="email" value={values.email}
                  onChange={(e) => set('email', e.target.value)} onBlur={() => blur('email')}
                  aria-invalid={!!errors.email} aria-describedby={err('email')} className={FIELD} />
                {errMsg('email')}
              </div>
              {topics.length > 1 && (
                <div>
                  <p id={`${uid}-topic`} className="mb-1.5 text-sm font-medium">{L.topic}</p>
                  {/* Pills cannot wrap, so a narrow tile gets the same choice as a native select. */}
                  <div className="hidden @min-[26rem]/form:block">
                    <Pills label={L.topic} options={topics} value={values.topic} onChange={(t) => set('topic', t)} />
                  </div>
                  <select name="topic" aria-labelledby={`${uid}-topic`} value={values.topic} onChange={(e) => set('topic', e.target.value)}
                    className={cn(FIELD, 'mt-0 @min-[26rem]/form:hidden')}>
                    {topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor={`${uid}-message`} className="text-sm font-medium">{L.message}</label>
                <textarea id={`${uid}-message`} name="message" rows={6} value={values.message}
                  onChange={(e) => set('message', e.target.value)} onBlur={() => blur('message')}
                  aria-invalid={!!errors.message} aria-describedby={[err('message'), `${uid}-count`].filter(Boolean).join(' ')}
                  className={cn(FIELD, 'min-h-32 resize-y py-2.5')} />
                <p id={`${uid}-count`} className={cn('mt-1.5 text-right font-mono text-xs tabular-nums', over ? 'text-destructive' : 'text-muted-foreground')}>
                  {over ? L.over(-left) : `${values.message.length} / ${maxLength}`}
                </p>
                {errMsg('message')}
              </div>
              {consent && (
                <div>
                  <label className="flex min-h-11 items-start gap-3 text-sm">
                    <input name="consent" type="checkbox" checked={values.consent}
                      onChange={(e) => set('consent', e.target.checked)} onBlur={() => blur('consent')}
                      aria-invalid={!!errors.consent} aria-describedby={err('consent')}
                      className="mt-0.5 size-5 shrink-0 accent-[var(--primary)] outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring" />
                    <span>{consent}</span>
                  </label>
                  {errMsg('consent')}
                </div>
              )}
              {status === 'error' && <p className="text-sm text-destructive">{L.errorText}</p>}
              {/* aria-disabled only: a disabled button would drop keyboard focus to the body while sending. submit() ignores repeats. */}
              <button type="submit" aria-disabled={status === 'sending'}
                className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground outline-offset-2 transition-[opacity,transform] duration-200 ease-out-quint focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.98] aria-disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100">
                {status === 'sending' ? L.sending : status === 'error' ? L.retry : L.send}
              </button>
            </form>
          )}
        </div>

        <aside aria-labelledby={`${uid}-info`} className={cn(TILE, 'h-fit p-6')}>
          <h3 id={`${uid}-info`} className="text-lg font-semibold">{L.infoTitle}</h3>
          <dl className="mt-4 grid gap-4 text-sm">
            {info.email && (
              <div><dt className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{L.emailLabel}</dt>
                <dd className="break-words"><a className="inline-flex min-h-11 items-center underline underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring" href={`mailto:${info.email}`}>{info.email}</a></dd></div>
            )}
            {info.phone && (
              <div><dt className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{L.phoneLabel}</dt>
                <dd className="tabular-nums"><a className="inline-flex min-h-11 items-center underline underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring" href={`tel:${info.phone.replace(/[^\d+]/g, '')}`}>{info.phone}</a></dd></div>
            )}
            {info.address && (
              <div><dt className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{L.addressLabel}</dt>
                <dd className="mt-1">{info.address}</dd></div>
            )}
          </dl>
          {info.responseTime && <p className="mt-6 border-t border-border pt-4 font-mono text-xs text-muted-foreground">{info.responseTime}</p>}
        </aside>
      </div>
    </section>
  )
}
