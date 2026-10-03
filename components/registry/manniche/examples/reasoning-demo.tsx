import { useEffect, useState } from 'react'
import { Reasoning } from '@/registry/manniche/reasoning/reasoning'

export default function ReasoningDemo() {
  const [streaming, setStreaming] = useState(true)

  // Stand-in for a model that thinks for two seconds before it answers.
  useEffect(() => {
    const id = setTimeout(() => setStreaming(false), 2000)
    return () => clearTimeout(id)
  }, [])

  return (
    <Reasoning streaming={streaming} ms={2000}>
      The customer asks when order 4821 arrives. It left the warehouse this morning, and standard delivery takes two days.
    </Reasoning>
  )
}
