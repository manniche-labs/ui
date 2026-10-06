import { useState } from 'react'
import { PromptInput } from '@/registry/manniche/prompt-input/prompt-input'

export default function PromptInputDemo() {
  const [busy, setBusy] = useState(false)

  return (
    <PromptInput
      halo
      accept="image/*,.pdf"
      busy={busy}
      placeholder="Ask about an order"
      onSubmit={(text, files) => {
        console.log(text, files)
        setBusy(true)
        setTimeout(() => setBusy(false), 2000)
      }}
      onStop={() => setBusy(false)}
      footer={
        <>
          {/* The form carries data-armed while the halo is lit, so the footer can follow it. */}
          <span className="inline-flex min-h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 font-mono text-xs text-muted-foreground shadow-[inset_0_0_0_1px_var(--color-border)]">
            <span className="relative size-1.5 rounded-full shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-foreground)_30%,transparent)]">
              <span className="absolute inset-0 rounded-full bg-primary opacity-0 transition-opacity duration-100 ease-out-quint in-data-armed:opacity-100 motion-reduce:transition-none" />
            </span>
            demo model
          </span>
          <span className="truncate text-sm text-muted-foreground max-sm:hidden">Enter sends · Shift+Enter for a new line</span>
        </>
      }
    />
  )
}
