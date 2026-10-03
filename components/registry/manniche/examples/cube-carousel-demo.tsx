import { CubeCarousel } from '@/registry/manniche/cube-carousel/cube-carousel'

const SLIDES = [
  { name: 'Linen shirt', price: '€59', bg: 'from-amber-200 to-orange-300' },
  { name: 'Canvas tote', price: '€24', bg: 'from-lime-200 to-emerald-300' },
  { name: 'Wool scarf', price: '€45', bg: 'from-sky-200 to-indigo-300' },
  { name: 'Leather wallet', price: '€39', bg: 'from-rose-200 to-fuchsia-300' },
  { name: 'Cotton socks', price: '€12', bg: 'from-stone-200 to-stone-400' },
]

export default function CubeCarouselDemo() {
  return (
    <div className="flex justify-center py-4">
      <CubeCarousel
        label="New arrivals"
        slides={SLIDES.map((s) => (
          <div key={s.name} className={`flex size-full flex-col justify-end bg-linear-to-br p-5 text-neutral-900 ${s.bg}`}>
            <p className="text-sm font-medium opacity-70">New in</p>
            <p className="text-2xl font-semibold tracking-tight">{s.name}</p>
            <p className="font-mono">{s.price}</p>
          </div>
        ))}
      />
    </div>
  )
}
