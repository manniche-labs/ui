import { useState } from 'react'
import { FloatingInput } from '@/registry/manniche/floating-input/floating-input'

export default function FloatingInputDemo() {
  const [zip, setZip] = useState('')
  const bad = zip !== '' && !/^\d{4,5}$/.test(zip)

  return (
    <form className="mx-auto flex w-full max-w-sm flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      <FloatingInput label="Full name" autoComplete="name" />
      <FloatingInput label="Email" type="email" autoComplete="email" hint="We send the receipt here." />
      <FloatingInput
        label="Postcode"
        inputMode="numeric"
        autoComplete="postal-code"
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        error={bad ? 'Use 4 or 5 digits.' : undefined}
      />
    </form>
  )
}
