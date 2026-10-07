import { Gift, Mail, PartyPopper, Send } from 'lucide-react'
import { useState } from 'react'
import { DialogStack } from '@/registry/manniche/dialog-stack/dialog-stack'

const field = 'w-full rounded-xl border bg-background px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring'
const primary = 'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground font-medium text-background active:scale-[0.98]'

export default function DialogStackDemo() {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => {
          setSent(false)
          setOpen(true)
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-6 font-medium shadow-sm transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <Gift className="size-5" aria-hidden />
        Send a gift card
      </button>
      <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
        {sent && 'Gift card on its way.'}
      </p>
      <DialogStack
        open={open}
        onOpenChange={setOpen}
        steps={[
          {
            id: 'form',
            title: 'Gift card',
            content: ({ next, close }) => (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  setSent(true)
                  close()
                }}
              >
                <label className="block space-y-1.5 text-sm">
                  <span className="text-muted-foreground">Their email</span>
                  <input type="email" required className={field} placeholder="name@example.com" />
                </label>
                <label className="block space-y-1.5 text-sm">
                  <span className="text-muted-foreground">A short note</span>
                  <textarea rows={3} className={`${field} resize-none`} />
                </label>
                <button type="submit" className={primary}>
                  Send <Send className="size-4" aria-hidden />
                </button>
                <button type="button" onClick={next} className="w-full text-sm text-muted-foreground hover:text-foreground">
                  How does it work?
                </button>
              </form>
            ),
          },
          {
            id: 'how',
            title: 'How it works',
            content: ({ back }) => (
              <div className="space-y-5">
                <p className="text-xl font-semibold">Three easy steps</p>
                {([
                  [Mail, 'They get an email with the card and your note.'],
                  [Gift, 'They spend it online or in the store, in one go or bit by bit.'],
                  [PartyPopper, 'The card lasts three years. No fees.'],
                ] as const).map(([Icon, text], i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-muted">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <p className="pt-2 text-sm">{text}</p>
                  </div>
                ))}
                <button type="button" onClick={back} className={primary}>
                  Got it
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
