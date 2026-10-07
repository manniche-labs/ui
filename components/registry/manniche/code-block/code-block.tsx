import { Check, Copy } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type CodeBlockProps = {
  /** The code as text. This is what the copy button copies. */
  code: string
  /** Shown in the header, e.g. "tsx" or "bash". */
  language?: string
  /** Shown in the header instead of the language, e.g. "src/app.tsx". */
  filename?: string
  /** Already highlighted markup (from Shiki or similar). Without it the plain code is shown. */
  children?: ReactNode
  /** Number the lines. */
  lineNumbers?: boolean
  /** Visible text and screen reader text. Keys: `copy`, `copied` and `code` (the header and region name when there is no filename or language). */
  labels?: { copy?: string; copied?: string; code?: string }
  /** Classes for the outer figure. */
  className?: string
}

/**
 * Code with a header and a copy button. It does no highlighting itself, so it adds no weight;
 * pass highlighted markup as children if you want colours.
 */
export function CodeBlock({ code, language, filename, children, lineNumbers = false, labels = {}, className }: CodeBlockProps) {
  const { copy: copyLabel = 'Copy', copied: copiedLabel = 'Copied', code: codeLabel = 'Code' } = labels
  const title = filename ?? language ?? codeLabel
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(id)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      // The clipboard can be blocked (an insecure page, a denied permission). The code can still be selected by hand.
    }
  }

  const lines = code.replace(/\n$/, '').split('\n')

  return (
    <figure className={cn('overflow-hidden rounded-2xl border bg-card text-card-foreground', className)}>
      <figcaption className="flex items-center justify-between gap-3 border-b bg-muted/50 py-1 pr-1 pl-4">
        <span className="truncate font-mono text-[0.8125rem] text-muted-foreground">{title}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground motion-reduce:transition-none"
        >
          {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
        </button>
      </figcaption>
      <pre className="max-h-[28rem] overflow-auto py-3 font-mono text-[0.8125rem] leading-6" tabIndex={0} role="region" aria-label={title}>
        {children ? (
          <div className="px-4">{children}</div>
        ) : lineNumbers ? (
          <code className="grid grid-cols-[auto_1fr]">
            {lines.map((line, i) => (
              <span key={i} className="contents">
                <span className="pr-4 pl-4 text-right text-muted-foreground select-none" aria-hidden>
                  {i + 1}
                </span>
                <span className="pr-4">{line || ' '}</span>
              </span>
            ))}
          </code>
        ) : (
          <code className="block px-4">{code}</code>
        )}
      </pre>
    </figure>
  )
}
