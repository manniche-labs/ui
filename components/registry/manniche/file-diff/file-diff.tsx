import { FileDiff as FileDiffIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FileDiffProps = {
  /** The file the change is in. */
  filename: string
  /** A unified diff, as `git diff` writes it. Header lines (diff, index, ---, +++) are skipped. */
  diff: string
  className?: string
}

type Line = { kind: 'add' | 'del' | 'same' | 'hunk'; text: string; oldNo?: number; newNo?: number }

function parse(diff: string): Line[] {
  const out: Line[] = []
  let oldNo = 0
  let newNo = 0
  for (const raw of diff.replace(/\n$/, '').split('\n')) {
    if (/^(diff |index |--- |\+\+\+ )/.test(raw)) continue
    const hunk = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/)
    if (hunk) {
      oldNo = Number(hunk[1])
      newNo = Number(hunk[2])
      out.push({ kind: 'hunk', text: hunk[3].trim() })
    } else if (raw.startsWith('+')) out.push({ kind: 'add', text: raw.slice(1), newNo: newNo++ })
    else if (raw.startsWith('-')) out.push({ kind: 'del', text: raw.slice(1), oldNo: oldNo++ })
    else out.push({ kind: 'same', text: raw.slice(1), oldNo: oldNo++, newNo: newNo++ })
  }
  return out
}

const ROW = {
  add: 'bg-success/10',
  del: 'bg-destructive/10',
  same: '',
  hunk: 'bg-muted/60 text-muted-foreground',
}

/** A change to one file, the way a coding agent proposes it. Added and removed lines are told apart by colour and by a + or − sign. */
export function FileDiff({ filename, diff, className }: FileDiffProps) {
  const lines = parse(diff)
  const added = lines.filter((l) => l.kind === 'add').length
  const removed = lines.filter((l) => l.kind === 'del').length

  return (
    <figure className={cn('overflow-hidden rounded-2xl border bg-card text-card-foreground', className)}>
      <figcaption className="flex min-h-11 items-center gap-2 border-b bg-muted/50 px-4">
        <FileDiffIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-mono text-[0.8125rem]">{filename}</span>
        <span className="text-sm tabular-nums">
          <span className="text-success">+{added}</span> <span className="text-destructive">−{removed}</span>
          <span className="sr-only">
            : {added} lines added, {removed} removed
          </span>
        </span>
      </figcaption>
      <div className="max-h-[28rem] overflow-auto" tabIndex={0} role="region" aria-label={`Changes in ${filename}`}>
        <table className="w-full border-collapse font-mono text-[0.8125rem] leading-6">
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className={ROW[l.kind]}>
                {l.kind === 'hunk' ? (
                  <td colSpan={4} className="px-4 py-0.5 text-xs">
                    {l.text || '…'}
                  </td>
                ) : (
                  <>
                    <td className="w-0 pr-2 pl-3 text-right text-muted-foreground tabular-nums select-none">{l.oldNo ?? ''}</td>
                    <td className="w-0 pr-2 text-right text-muted-foreground tabular-nums select-none">{l.newNo ?? ''}</td>
                    <td
                      className={cn(
                        'w-0 pr-2 select-none',
                        l.kind === 'add' && 'text-success',
                        l.kind === 'del' && 'text-destructive',
                      )}
                    >
                      <span aria-hidden>{l.kind === 'add' ? '+' : l.kind === 'del' ? '−' : ' '}</span>
                      <span className="sr-only">{l.kind === 'add' ? 'added' : l.kind === 'del' ? 'removed' : ''}</span>
                    </td>
                    <td className="pr-4 whitespace-pre">{l.text}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
