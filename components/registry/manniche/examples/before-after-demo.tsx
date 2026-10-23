import { useState } from 'react'
import { BeforeAfter } from '@/registry/manniche/before-after/before-after'

// A garden before and after a new terrace. Both photos are small SVG drawings made here from the same viewpoint,
// so the demo fetches nothing and the wipe lines up. The Danish labels show how to replace the text.

const svg = (body: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720">${body}</svg>`)}`

const HOUSE = `<rect width="960" height="720" fill="#cfdbe6"/>
  <rect x="120" y="150" width="720" height="300" fill="#b5654a"/>
  <path d="M90 160 480 40 870 160z" fill="#4a4b50"/>
  <rect x="220" y="230" width="120" height="110" fill="#e8eef3" stroke="#fff" stroke-width="10"/>
  <rect x="620" y="230" width="120" height="110" fill="#e8eef3" stroke="#fff" stroke-width="10"/>
  <rect x="420" y="250" width="120" height="200" fill="#e8eef3" stroke="#fff" stroke-width="10"/>`

const BEFORE = svg(
  `${HOUSE}
  <rect y="450" width="960" height="270" fill="#8a8a62"/>
  ${Array.from({ length: 40 }, (_, i) => `<path d="M${(i * 97) % 960} ${470 + ((i * 53) % 240)}l10 -28 10 28" fill="none" stroke="#6b6b47" stroke-width="5"/>`).join('')}
  <rect x="300" y="520" width="160" height="70" rx="10" fill="#9a958c"/>
  <rect x="560" y="600" width="120" height="50" rx="8" fill="#a29d93"/>`,
)

const AFTER = svg(
  `${HOUSE}
  <rect y="450" width="960" height="270" fill="#6f9a52"/>
  <path d="M60 450h840l40 170H20z" fill="#9b6a41"/>
  ${Array.from({ length: 12 }, (_, i) => `<path d="M${55 - i * 3} ${464 + i * 14}h${850 + i * 6}" stroke="#7d5232" stroke-width="3"/>`).join('')}
  <rect x="20" y="620" width="920" height="26" fill="#5f3d23"/>
  <rect x="700" y="400" width="160" height="60" fill="#5f3d23"/>
  <circle cx="740" cy="390" r="30" fill="#5b8f3e"/><circle cx="800" cy="380" r="36" fill="#4f8236"/>`,
)

export default function BeforeAfterDemo() {
  const [pos, setPos] = useState(50)

  return (
    <div className="grid w-full max-w-2xl gap-6">
      <BeforeAfter
        before={{ src: BEFORE, alt: 'The garden before: worn grass and loose paving stones in front of the house.' }}
        after={{ src: AFTER, alt: 'The garden after: a wooden terrace with a step and a planter in front of the house.' }}
        onChange={setPos}
      />
      <p className="text-sm text-muted-foreground">Handle at {Math.round(pos)} %. Drag it, click the picture, or Tab to it and use the arrow keys.</p>

      <BeforeAfter
        before={{ src: BEFORE, alt: 'Haven før: slidt græs og løse fliser foran huset.' }}
        after={{ src: AFTER, alt: 'Haven efter: en træterrasse med trin og plantekasse foran huset.' }}
        initial={30}
        aspectRatio="16 / 9"
        labels={{ before: 'Før', after: 'Efter', slider: 'Sammenlign før og efter', value: '{n} % før' }}
      />
    </div>
  )
}
