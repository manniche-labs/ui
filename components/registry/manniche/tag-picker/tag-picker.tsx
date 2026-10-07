// Based on Watermelon UI's “Tags” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten as a controlled picker with labelled buttons.
import { X } from 'lucide-react'
import { LayoutGroup, MotionConfig, motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type TagOption = {
  /** Stable key for the tag; this is what `value` and `onChange` carry. */
  id: string
  /** Text shown on the tag. */
  label: string
}

export type TagPickerProps = {
  /** Every tag that can be picked. */
  options: TagOption[]
  /** Controlled ids of the picked tags, in the order they were picked. */
  value?: string[]
  /** Ids picked at the start when the picker is not controlled. */
  defaultValue?: string[]
  /** Called with the new list of picked ids each time a tag is added or removed. */
  onChange?: (ids: string[]) => void
  /** Heading above the picker, also the name of the group. */
  label?: string
  /** Shown in the empty box before anything is picked. */
  placeholder?: string
  /** Visible text and screen reader text; defaults to English. `added` and `removed` follow the tag name in the live announcement. */
  labels?: Partial<Record<'picked' | 'available' | 'remove' | 'added' | 'removed', string>>
  /** Classes for the outer group. */
  className?: string
}

/** Pick tags from a pool; each one flies up into the box and back down when removed. Focus follows the tag, and a status line announces the change. */
export function TagPicker({ options, value, defaultValue = [], onChange, label = 'Tags', placeholder = 'Pick a few below', labels = {}, className }: TagPickerProps) {
  const { picked: pickedLabel = 'Picked', available: availableLabel = 'Available', remove = 'Remove', added = 'added', removed = 'removed' } = labels
  const [own, setOwn] = useState(defaultValue)
  const [message, setMessage] = useState('')
  const refs = useRef<{ target: 'remove' | 'add'; id: string } | null>(null)
  const removeBtns = useRef(new Map<string, HTMLButtonElement>())
  const addBtns = useRef(new Map<string, HTMLButtonElement>())
  const picked = value ?? own
  const group = useId()
  const heading = useId()

  const set = (ids: string[]) => {
    setOwn(ids)
    onChange?.(ids)
  }

  // The button that was pressed unmounts as the tag moves, so focus goes to the same tag in its new place.
  useEffect(() => {
    const next = refs.current
    if (!next) return
    refs.current = null
    const el = (next.target === 'remove' ? removeBtns : addBtns).current.get(next.id)
    el?.focus()
  }, [picked])

  const add = (tag: TagOption) => {
    refs.current = { target: 'remove', id: tag.id }
    setMessage(`${tag.label} ${added}`)
    set([...picked, tag.id])
  }
  const drop = (tag: TagOption) => {
    refs.current = { target: 'add', id: tag.id }
    setMessage(`${tag.label} ${removed}`)
    set(picked.filter((p) => p !== tag.id))
  }

  const byId = new Map(options.map((o) => [o.id, o]))
  const pool = options.filter((o) => !picked.includes(o.id))

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 300, damping: 35 }}>
      <LayoutGroup id={group}>
        <div className={cn('w-full', className)} role="group" aria-labelledby={heading}>
          <p id={heading} className="text-sm font-medium">
            {label}
          </p>
          <motion.ul layout aria-label={pickedLabel} className="mt-2 flex min-h-14 flex-wrap items-center gap-1.5 rounded-2xl border bg-card p-1.5">
            {picked.length === 0 && <li className="px-2.5 text-sm text-muted-foreground">{placeholder}</li>}
            {picked.map((id) => {
              const tag = byId.get(id)
              if (!tag) return null
              return (
                <motion.li key={id} layoutId={id} style={{ borderRadius: 12 }} className="z-20 flex items-center gap-0.5 border bg-background py-0.5 pr-0.5 pl-3 text-sm font-medium">
                  <motion.span layout="position">{tag.label}</motion.span>
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) removeBtns.current.set(id, el)
                      else removeBtns.current.delete(id)
                    }}
                    onClick={() => drop(tag)}
                    aria-label={`${remove} ${tag.label}`}
                    className="grid size-9 place-items-center rounded-[10px] text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground motion-reduce:transition-none"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </motion.li>
              )
            })}
          </motion.ul>
          {pool.length > 0 && (
            <motion.ul layout aria-label={availableLabel} className="mt-3 flex flex-wrap gap-2 rounded-2xl border bg-card p-2">
              {pool.map((tag) => (
                <motion.li key={tag.id} layoutId={tag.id} style={{ borderRadius: 12 }} className="z-10 bg-muted">
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) addBtns.current.set(tag.id, el)
                      else addBtns.current.delete(tag.id)
                    }}
                    onClick={() => add(tag)}
                    className="min-h-10 px-4 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
                  >
                    <motion.span layout="position" className="inline-block">
                      {tag.label}
                    </motion.span>
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          )}
          <span role="status" className="sr-only">
            {message}
          </span>
        </div>
      </LayoutGroup>
    </MotionConfig>
  )
}
