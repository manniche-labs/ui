import { Skeleton, SkeletonText } from '@/registry/manniche/skeleton/skeleton'

export default function SkeletonDemo() {
  return (
    <section aria-label="Skeleton" className="grid w-full gap-6">
      <div className="flex items-center gap-3">
        <Skeleton circle width={44} />
        <div className="grid flex-1 gap-2">
          <Skeleton width="45%" height={14} />
          <Skeleton width="30%" height={12} />
        </div>
      </div>
      <SkeletonText lines={3} />
      <Skeleton height={120} className="rounded-xl" />
      <p className="text-[13.5px] text-muted-foreground">
        Fixed sizes, the theme&apos;s muted colour, and a slow pulse that stands still under reduced motion.
      </p>
    </section>
  )
}
