import { CtaBand } from '@/registry/manniche/cta-band/cta-band'

export default function CtaBandDemo() {
  return (
    <CtaBand
      headline="Bring the next product to Halden Studio."
      description="Tell us what you are building. We reply with a plan, a team and a start date, in Munich or Aalborg."
      primary={{ label: 'Start a project', href: 'https://example.com/start' }}
      secondary={{ label: 'See our work', href: 'https://example.com/work' }}
      fact="No brief needed. A first call costs nothing."
    />
  )
}
