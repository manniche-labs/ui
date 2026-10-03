import { useEffect, useState } from 'react'
import { StreamingResponse } from '@/registry/manniche/streaming-response/streaming-response'

const REPLY = 'Your order ships tomorrow morning. It should reach you on Thursday.'

export default function StreamingResponseDemo() {
  const [shown, setShown] = useState('')

  // Stand-in for a streamed model reply: pass the text so far and whether more is coming.
  useEffect(() => {
    const words = REPLY.split(/(\s+)/)
    let i = 0
    const id = setInterval(() => {
      i += 2
      setShown(words.slice(0, i).join(''))
      if (i >= words.length) clearInterval(id)
    }, 70)
    return () => clearInterval(id)
  }, [])

  return <StreamingResponse text={shown} streaming={shown.length < REPLY.length} />
}
