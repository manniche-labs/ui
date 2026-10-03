import { BlurFade } from '@/registry/manniche/blur-fade/blur-fade'

export default function BlurFadeDemo() {
  return (
    <ul className="space-y-2">
      {['Packed', 'Shipped', 'Delivered'].map((s, i) => (
        <BlurFade as="li" key={s} delay={i * 70} className="rounded-xl border bg-card px-4 py-3">
          {s}
        </BlurFade>
      ))}
    </ul>
  )
}
