import { cn } from '@/lib/utils'

export type StreamingResponseProps = {
  /** The text so far. Append to it as tokens arrive. */
  text: string
  /** True while more text is coming. Shows the caret. */
  streaming?: boolean
  className?: string
}

/**
 * Shows a reply as it is written. New words fade in; the caret blinks at the end while streaming.
 * Paragraphs are split on blank lines. Under reduced motion the words appear without fading.
 */
export function StreamingResponse({ text, streaming = false, className }: StreamingResponseProps) {
  const paragraphs = text.split(/\n{2,}/)

  return (
    <div className={cn('max-w-[65ch] text-base leading-7 text-pretty', className)} aria-busy={streaming}>
      {paragraphs.map((p, i) => {
        const last = i === paragraphs.length - 1
        return (
          <p key={i} className="mb-4 last:mb-0">
            {p.split(/(\s+)/).map((word, j) =>
              /^\s+$/.test(word) ? (
                word
              ) : (
                // A stable key per position: a word only animates the first time it renders.
                <span key={j} className="animate-[stream-in_240ms_cubic-bezier(0.23,1,0.32,1)_both] motion-reduce:animate-none">
                  {word}
                </span>
              ),
            )}
            {last && streaming && (
              <span
                className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.2em] animate-[stream-caret_1s_steps(1)_infinite] bg-foreground motion-reduce:animate-none"
                aria-hidden
              />
            )}
          </p>
        )
      })}
      <style href="manniche-streaming" precedence="default">{`
        @keyframes stream-in { from { opacity: 0 } }
        @keyframes stream-caret { 50% { opacity: 0 } }
      `}</style>
    </div>
  )
}
