import { CloudDrift } from '@/registry/manniche/cloud-drift/cloud-drift'

export default function CloudDriftDemo() {
  return (
    <CloudDrift cover={0.55} className="grid h-72 place-items-center rounded-3xl bg-linear-to-b from-sky-500 to-sky-300 dark:from-slate-900 dark:to-sky-900">
      <div className="px-6 text-center text-white">
        <p className="text-sm font-medium tracking-wide uppercase opacity-90">This weekend</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-balance">Free delivery on orders over €50</p>
      </div>
    </CloudDrift>
  )
}
