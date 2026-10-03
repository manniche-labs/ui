// Based on Watermelon UI's “Tags” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten as a controlled picker with labelled buttons.
import { X } from 'lucide-react'
import { LayoutGroup, MotionConfig, motion } from 'motion/react'
import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

export type TagOption = { id: string; label: string }

export type TagPickerProps = {
  options: TagOption[]
  /** Controlled ids of the picked tags, in the order they were picked. */
  value?: string[]
  defaultValue?: string[]
  onChange?: (ids: string[]) => void
  label?: string
  /** Shown in the empty box before anything is picked. */
  placeholder?: string
  className?: string
}

/** Pick tags from a pool; each one flies up into the box and back down when removed. */
export function TagPicker({ options, value, defaultValue = [], onChange, label = 'Tags', placeholder = 'Pick a few below', className }: TagPickerProps) {
  const [own, setOwn] = useState(defaultValue)
  const picked = value ?? own
  const group = useId()
  const heading = useId()

  const set = (ids: string[]) => {
    setOwn(ids)
    onChange?.(ids)
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
          <motion.ul layout aria-label="Picked" className="mt-2 flex min-h-14 flex-wrap items-center gap-1.5 rounded-2xl border bg-card p-1.5">
            {picked.length === 0 && <li className="px-2.5 text-sm text-muted-foreground">{placeholder}</li>}
            {picked.map((id) => {
              const tag = byId.get(id)
              if (!tag) return null
              return (
                <motion.li key={id} layoutId={id} style={{ borderRadius: 12 }} className="z-20 flex items-center gap-0.5 border bg-background py-0.5 pr-0.5 pl-3 text-sm font-medium">
                  <motion.span layout="position">{tag.label}</motion.span>
                  <button
                    type="button"
                    onClick={() => set(picked.filter((p) => p !== id))}
                    aria-label={`Remove ${tag.label}`}
                    className="grid size-9 place-items-center rounded-[10px] text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </motion.li>
              )
            })}
          </motion.ul>
          {pool.length > 0 && (
            <motion.ul layout aria-label="Available" className="mt-3 flex flex-wrap gap-2 rounded-2xl border bg-card p-2">
              {pool.map((tag) => (
                <motion.li key={tag.id} layoutId={tag.id} style={{ borderRadius: 12 }} className="z-10 bg-muted">
                  <button
                    type="button"
                    onClick={() => set([...picked, tag.id])}
                    className="min-h-10 px-4 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  >
                    <motion.span layout="position" className="inline-block">
                      {tag.label}
                    </motion.span>
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </div>
      </LayoutGroup>
    </MotionConfig>
  )
}
