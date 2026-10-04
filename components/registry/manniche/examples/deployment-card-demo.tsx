import { useEffect, useState } from 'react'
import { DeploymentCard, type DeploymentStep } from '@/registry/manniche/deployment-card/deployment-card'

const plan = [
  { id: 'install', label: 'Install packages', seconds: 3 },
  { id: 'build', label: 'Build the shop', seconds: 5 },
  { id: 'checks', label: 'Run checks', seconds: 3 },
  { id: 'domains', label: 'Assign domains', seconds: 2 },
]

export default function DeploymentCardDemo() {
  const [tick, setTick] = useState(0)
  const total = plan.reduce((n, s) => n + s.seconds, 0) * 4

  useEffect(() => {
    if (tick >= total) return
    const t = setTimeout(() => setTick((n) => n + 1), 250)
    return () => clearTimeout(t)
  }, [tick, total])

  const steps: DeploymentStep[] = plan.map((p, i) => {
    const start = plan.slice(0, i).reduce((n, s) => n + s.seconds * 4, 0)
    const len = p.seconds * 4
    const done = Math.max(0, Math.min(len, tick - start))
    const status = done === len ? (p.id === 'checks' ? 'warning' : 'success') : done > 0 ? 'running' : 'pending'
    return {
      id: p.id,
      label: p.label,
      status,
      progress: done / len,
      duration: done > 0 ? `${(done / 4).toFixed(done === len ? 0 : 1)}s` : undefined,
      details:
        p.id === 'checks' && done === len ? (
          <ul className="space-y-1">
            <li>2 images are larger than 500 kB.</li>
            <li>1 page has no meta description.</li>
          </ul>
        ) : p.id === 'build' && done === len ? (
          '48 pages, 212 assets, 1.8 MB in all.'
        ) : undefined,
    }
  })

  return (
    <div className="flex justify-center">
      <DeploymentCard
        title="shop-storefront"
        environment="Production"
        branch="main"
        commit="8f3c2a1"
        message="Add the spring collection"
        state={tick >= total ? 'ready' : 'building'}
        steps={steps}
        actions={
          <button type="button" onClick={() => setTick(0)} className="min-h-11 rounded-xl border bg-card px-4 text-sm font-medium">
            Redeploy
          </button>
        }
      />
    </div>
  )
}
