import { useState } from 'react'
import { FooterStatus, type ServiceStatus } from '@/registry/manniche/footer-status/footer-status'
import { Pills } from '@/registry/manniche/chart-kit/chart-kit'

export default function FooterStatusDemo() {
  const [status, setStatus] = useState<ServiceStatus>('operational')
  return (
    // The id that Back to top moves focus to.
    <div id="top" className="grid gap-8 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 sm:px-6">
        <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Status</span>
        <Pills
          label="Service status"
          value={status}
          onChange={(id) => setStatus(id as ServiceStatus)}
          options={[
            { id: 'operational', label: 'Up' },
            { id: 'degraded', label: 'Slow' },
            { id: 'outage', label: 'Down' },
          ]}
        />
      </div>
      <FooterStatus
        status={status}
        updated="14:20"
        statusHref="https://example.com/status"
        version={{ label: 'v2.4.1', href: 'https://example.com/changelog' }}
        links={[
          { label: 'Docs', href: 'https://example.com/docs' },
          { label: 'API', href: 'https://example.com/api', external: true },
          { label: 'Support', href: 'https://example.com/support' },
          { label: 'Privacy', href: 'https://example.com/privacy' },
        ]}
        focusTarget="top"
        legal={<span>© 2026 Halden Studio</span>}
      />
      {/* Narrowest form: no links, no version. */}
      <FooterStatus status="operational" updated="14:20" />
    </div>
  )
}
