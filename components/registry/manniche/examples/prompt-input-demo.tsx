import { useState } from 'react'
import { PromptInput } from '@/registry/manniche/prompt-input/prompt-input'

export default function PromptInputDemo() {
  const [busy, setBusy] = useState(false)

  return (
    <PromptInput
      accept="image/*,.pdf"
      busy={busy}
      placeholder="Ask about an order"
      onSubmit={(text, files) => {
        console.log(text, files)
        setBusy(true)
        setTimeout(() => setBusy(false), 2000)
      }}
      onStop={() => setBusy(false)}
      footer={<span className="text-sm text-muted-foreground">Enter sends · Shift+Enter for a new line</span>}
    />
  )
}
