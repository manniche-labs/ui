import { CircleCheck, CircleDashed, CircleDot, Tag } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/registry/manniche/confirm-dialog/confirm-dialog'
import { GroupedList } from '@/registry/manniche/grouped-list/grouped-list'
import { SelectionBar, type SelectionBarConfirmRequest } from '@/registry/manniche/selection-bar/selection-bar'

type Status = 'todo' | 'doing' | 'done'
type Task = { id: string; title: string; due: Date | null; status: Status }

const STATUS: Record<Status, { label: string; icon: ReactNode }> = {
  todo: { label: 'To do', icon: <CircleDashed /> },
  doing: { label: 'In progress', icon: <CircleDot /> },
  done: { label: 'Done', icon: <CircleCheck /> },
}

// Due dates counted from today, so the groups always have something in them.
const OFFSETS = [-3, -1, 0, 0, 1, 2, 3, 9, 12, 15, 18, 21, 26, 30, 34, 40, null, null, null]

function makeTasks(): Task[] {
  const today = new Date()
  return OFFSETS.map((days, i) => {
    const due = days === null ? null : new Date(today.getFullYear(), today.getMonth(), today.getDate() + days)
    return { id: `g${i + 1}`, title: `Sample task ${i + 1}`, due, status: (['todo', 'doing', 'todo'] as const)[i % 3] }
  })
}

const PAGE_SIZE = 4
const MAX_INSTANT = 5

export default function GroupedListDemo() {
  const [tasks, setTasks] = useState(makeTasks)
  const [picked, setPicked] = useState<string[]>([])
  const [visible, setVisible] = useState<string[]>([])
  const [confirm, setConfirm] = useState<SelectionBarConfirmRequest | null>(null)
  const clear = useCallback(() => setPicked([]), [])
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const hiddenCount = useMemo(() => picked.filter((id) => !visible.includes(id)).length, [picked, visible])
  const noun = (n: number) => (n === 1 ? '1 task' : `${n} tasks`)
  const dueText = (d: Date | null) => (d ? d.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' }) : '')

  return (
    <div className="grid gap-3">
      <p className="m-0 text-sm text-muted-foreground">
        Fold a group with a row ticked inside it, then change the status: the bar asks first, since that row is out of sight.
      </p>
      <div className="relative max-h-[30rem] overflow-y-auto rounded-2xl border bg-card">
        <GroupedList
          variant="plain"
          label="Demo tasks by due date"
          items={tasks}
          getKey={(t) => t.id}
          getDate={(t) => t.due}
          pageSize={PAGE_SIZE}
          moreStep={PAGE_SIZE}
          onVisibleChange={setVisible}
          className="[--grouped-list-bg:var(--card)]"
          renderItem={(t) => (
            <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 hover:bg-muted/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring">
              <input type="checkbox" checked={picked.includes(t.id)} onChange={() => toggle(t.id)} className="size-4 shrink-0 accent-primary" />
              <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">
                {STATUS[t.status].icon}
                <span className="hidden min-[420px]:inline">{STATUS[t.status].label}</span>
              </span>
              {t.due && <span className="w-[5.5rem] shrink-0 text-right text-xs text-muted-foreground tabular-nums">{dueText(t.due)}</span>}
            </label>
          )}
        />
        <SelectionBar
          count={picked.length}
          hiddenCount={hiddenCount}
          maxInstant={MAX_INSTANT}
          onClear={clear}
          onNeedsConfirm={setConfirm}
          actions={[
            {
              id: 'status',
              label: 'Status',
              icon: <Tag />,
              menuLabel: 'Move {count} to',
              options: (Object.keys(STATUS) as Status[]).map((s) => ({ id: s, label: STATUS[s].label, icon: STATUS[s].icon })),
              onSelect: (s) => {
                const before = tasks
                const ids = new Set(picked)
                setTasks((all) => all.map((t) => (ids.has(t.id) ? { ...t, status: s as Status } : t)))
                return { message: `Moved ${noun(ids.size)} to ${STATUS[s as Status].label}`, undo: () => setTasks(before) }
              },
            },
          ]}
        />
      </div>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? `Change ${noun(confirm.count)}?` : ''}
        description={
          confirm?.reason === 'hidden'
            ? `${noun(confirm.hiddenCount)} of them ${confirm.hiddenCount === 1 ? 'is' : 'are'} in a folded group or past "Show more", so you cannot see ${confirm.hiddenCount === 1 ? 'it' : 'them'} now.`
            : `One click changes up to ${MAX_INSTANT}; this is more, so it asks first.`
        }
        confirmLabel={confirm ? `Change ${noun(confirm.count)}` : 'Change'}
        cancelLabel="Keep as they are"
        onConfirm={() => void confirm?.proceed()}
      />
    </div>
  )
}
