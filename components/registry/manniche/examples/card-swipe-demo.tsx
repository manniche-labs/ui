import { Coffee, Leaf, Shirt, Sparkles } from 'lucide-react'
import { CardSwipe } from '@/registry/manniche/card-swipe/card-swipe'

const picks = [
  { icon: Shirt, title: 'Linen basics', text: 'Light shirts and trousers for warm days.' },
  { icon: Leaf, title: 'Plant care', text: 'Pots, soil and a watering can that pours right.' },
  { icon: Coffee, title: 'Slow mornings', text: 'A hand grinder, a dripper and good beans.' },
  { icon: Sparkles, title: 'Gift ideas', text: 'Small things people actually keep.' },
]

export default function CardSwipeDemo() {
  return (
    <CardSwipe
      label="Collections"
      cards={picks.map(({ icon: Icon, title, text }) => (
        <div key={title} className="flex h-80 flex-col items-start rounded-[32px] border bg-card p-7">
          <span className="mb-8 grid size-16 place-items-center rounded-2xl border bg-card shadow-md">
            <Icon className="size-8" strokeWidth={1.5} aria-hidden />
          </span>
          <h3 className="text-2xl font-semibold">{title}</h3>
          <p className="mt-2 mb-auto text-muted-foreground">{text}</p>
          <a href="#shop" className="rounded-full bg-foreground px-5 py-2.5 text-sm text-background">
            Shop the edit
          </a>
        </div>
      ))}
    />
  )
}
