import { Archive, CircleDashed, CircleDot, CircleCheck, Copy, Tag } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/registry/manniche/confirm-dialog/confirm-dialog'
import { SelectionBar, type SelectionBarConfirmRequest } from '@/registry/manniche/selection-bar/selection-bar'

type Status = 'todo' | 'doing' | 'done'
type Task = { id: string; title: string; status: Status; archived?: boolean }

const STATUS: Record<Status, { label: string; icon: ReactNode }> = {
  todo: { label: 'To do', icon: <CircleDashed /> },
  doing: { label: 'In progress', icon: <CircleDot /> },
  done: { label: 'Done', icon: <CircleCheck /> },
}

const START: Task[] = [
  'Sample task one',
  'Sample task two',
  'Sample task three',
  'Sample task four',
  'Sample task five',
  'Sample task six',
  'Sample task seven',
  'Sample task eight',
].map((title, i) => ({ id: `t${i + 1}`, title, status: (['todo', 'doing', 'todo', 'done'] as const)[i % 4] }))

const MAX_INSTANT = 3

export default function SelectionBarDemo() {
  const [tasks, setTasks] = useState(START)
  const [picked, setPicked] = useState<string[]>([])
  const [confirm, setConfirm] = useState<SelectionBarConfirmRequest | null>(null)
  const shown = tasks.filter((t) => !t.archived)
  const clear = useCallback(() => setPicked([]), [])
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const picks = shown.filter((t) => picked.includes(t.id))
  const sameStatus = picks.length > 0 && picks.every((t) => t.status === picks[0].status) ? picks[0].status : null
  const noun = (n: number) => (n === 1 ? '1 task' : `${n} tasks`)

  // Every change hands back a function that puts the rows as they were.
  const change = (patch: (t: Task) => Task, message: string) => {
    const before = tasks
    const ids = new Set(picked)
    setTasks((all) => all.map((t) => (ids.has(t.id) ? patch(t) : t)))
    return { message, undo: () => setTasks(before) }
  }

  return (
    <div className="grid gap-3">
      <p className="m-0 text-sm text-muted-foreground">
        Tick rows to see the bar. Up to {MAX_INSTANT} change in one click with Undo; more asks first.
      </p>
      <div className="relative max-h-[26rem] overflow-y-auto rounded-2xl border bg-card">
        <ul aria-label="Demo tasks" className="m-0 list-none divide-y p-0">
          {shown.map((t) => (
            <li key={t.id}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 hover:bg-muted/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring">
                <input type="checkbox" checked={picked.includes(t.id)} onChange={() => toggle(t.id)} className="size-4 shrink-0 accent-primary outline-none" />
                <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">
                  {STATUS[t.status].icon}
                  {STATUS[t.status].label}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <SelectionBar
          count={picks.length}
          onClear={clear}
          maxInstant={MAX_INSTANT}
          onNeedsConfirm={setConfirm}
          onSelectAll={() => setPicked(shown.map((t) => t.id))}
          selectAllCount={shown.length}
          actions={[
            {
              id: 'status',
              label: 'Status',
              icon: <Tag />,
              menuLabel: 'Move {count} to',
              options: (Object.keys(STATUS) as Status[]).map((s) => ({ id: s, label: STATUS[s].label, icon: STATUS[s].icon, current: s === sameStatus })),
              onSelect: (s) => change((t) => ({ ...t, status: s as Status }), `Moved ${noun(picks.length)} to ${STATUS[s as Status].label}`),
            },
            {
              id: 'copy',
              label: 'Copy names',
              icon: <Copy />,
              readOnly: true,
              onSelect: () => {
                void navigator.clipboard?.writeText(picks.map((t) => t.title).join('\n')).catch(() => {})
                return { message: `Copied ${noun(picks.length)}` }
              },
            },
          ]}
          more={[
            {
              id: 'archive',
              label: 'Archive',
              icon: <Archive />,
              onSelect: () => {
                const r = change((t) => ({ ...t, archived: true }), `Archived ${noun(picks.length)}`)
                setPicked([])
                return r
              },
            },
          ]}
        />
      </div>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? `Change ${noun(confirm.count)} at once?` : ''}
        description={confirm ? `${picks.map((t) => t.title).join(', ')}. One click changes up to ${MAX_INSTANT}; this is more, so it asks first.` : undefined}
        confirmLabel={confirm ? `Change ${noun(confirm.count)}` : 'Change'}
        cancelLabel="Keep as they are"
        onConfirm={() => void confirm?.proceed()}
      />
    </div>
  )
}
