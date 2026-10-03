// Based on Watermelon UI's “Event reminders” (MIT, © 2026 Watermelon Platform Contributors,
// github.com/WatermelonCorp/watermelon-platform). Rewritten as a controlled list with labelled controls.
import { Bell, Mail, Minus, Plus, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useState } from "react";
import { RollingNumber } from "@/registry/manniche/rolling-number/rolling-number";
import { cn } from "@/lib/utils";

export type ReminderChannel = "notification" | "email";
export type ReminderUnit = "minutes" | "hours" | "days";
export type Reminder = {
  id: string;
  channel: ReminderChannel;
  amount: number;
  unit: ReminderUnit;
};

export type EventRemindersProps = {
  title: string;
  /** Already formatted, e.g. “Thursday 9 October, 14:00”. */
  when: string;
  /** Controlled list. Leave it out and the card keeps its own. */
  value?: Reminder[];
  defaultValue?: Reminder[];
  onChange?: (reminders: Reminder[]) => void;
  /** Most reminders one event can have. */
  max?: number;
  labels?: Partial<
    Record<
      | ReminderChannel
      | ReminderUnit
      | "before"
      | "add"
      | "remove"
      | "more"
      | "fewer",
      string
    >
  >;
  className?: string;
};

const UNITS: ReminderUnit[] = ["minutes", "hours", "days"];
const LIMIT: Record<ReminderUnit, number> = {
  minutes: 59,
  hours: 23,
  days: 30,
};
const EN = {
  notification: "Notification",
  email: "Email",
  minutes: "minutes",
  hours: "hours",
  days: "days",
  before: "before",
  add: "Add reminder",
  remove: "Remove reminder",
  more: "More",
  fewer: "Less",
};

/** A card where people set when and how they are reminded of an event. */
export function EventReminders({
  title,
  when,
  value,
  defaultValue = [],
  onChange,
  max = 5,
  labels = {},
  className,
}: EventRemindersProps) {
  const [own, setOwn] = useState(defaultValue);
  const list = value ?? own;
  const t = { ...EN, ...labels };

  const set = (next: Reminder[]) => {
    setOwn(next);
    onChange?.(next);
  };
  const patch = (id: string, p: Partial<Reminder>) =>
    set(list.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const pill =
    "inline-flex min-h-10 items-center gap-1.5 rounded-full bg-muted px-3 text-sm font-medium transition-colors duration-150 hover:bg-accent";
  const round =
    "grid size-8 place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-background hover:text-foreground disabled:opacity-30";

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", bounce: 0, duration: 0.45 }}
    >
      <motion.section
        layout
        className={cn(
          "w-full max-w-md rounded-3xl border bg-card p-5 text-card-foreground shadow-sm",
          className,
        )}
      >
        <header className="pb-4">
          <h2 className="text-lg font-semibold text-balance">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{when}</p>
        </header>

        <ul className="space-y-2 border-t border-dashed pt-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map((r) => {
              const Icon = r.channel === "email" ? Mail : Bell;
              return (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="flex items-start gap-1.5"
                >
                  {/* Amount, unit and “before” wrap as one piece, so a narrow card never strands a word. */}
                  <div className="flex flex-1 flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      className={pill}
                      onClick={() =>
                        patch(r.id, {
                          channel:
                            r.channel === "email" ? "notification" : "email",
                        })
                      }
                    >
                      <Icon className="size-4" aria-hidden />
                      {t[r.channel]}
                    </button>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-flex min-h-10 items-center rounded-full bg-muted px-1">
                        <button
                          type="button"
                          className={round}
                          aria-label={t.fewer}
                          disabled={r.amount <= 1}
                          onClick={() => patch(r.id, { amount: r.amount - 1 })}
                        >
                          <Minus className="size-3.5" aria-hidden />
                        </button>
                        <RollingNumber
                          value={r.amount}
                          className="min-w-6 justify-center text-sm font-semibold"
                        />
                        <button
                          type="button"
                          className={round}
                          aria-label={t.more}
                          disabled={r.amount >= LIMIT[r.unit]}
                          onClick={() => patch(r.id, { amount: r.amount + 1 })}
                        >
                          <Plus className="size-3.5" aria-hidden />
                        </button>
                      </span>
                      <button
                        type="button"
                        className={pill}
                        onClick={() => {
                          const unit =
                            UNITS[(UNITS.indexOf(r.unit) + 1) % UNITS.length];
                          patch(r.id, {
                            unit,
                            amount: Math.min(r.amount, LIMIT[unit]),
                          });
                        }}
                      >
                        {t[r.unit]}
                      </button>
                      <span className="px-1 text-sm text-muted-foreground">
                        {t.before}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className={cn(round, "size-10")}
                    aria-label={t.remove}
                    onClick={() => set(list.filter((x) => x.id !== r.id))}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {list.length < max && (
          <motion.button
            layout
            type="button"
            onClick={() =>
              set([
                ...list,
                {
                  id: crypto.randomUUID(),
                  channel: "notification",
                  amount: 10,
                  unit: "minutes",
                },
              ])
            }
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-4" aria-hidden />
            {t.add}
          </motion.button>
        )}
      </motion.section>
    </MotionConfig>
  );
}
