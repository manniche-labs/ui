import { useState } from 'react'
import { Badge } from '@/registry/manniche/badge/badge'
import { GalleryCard } from '@/registry/manniche/gallery-card/gallery-card'

// Four cards: two with a poster, one without (the card draws its own) and one with a name too long for a line.
// The posters are small SVG drawings made here, so the demo fetches nothing. The items and "New" labels are examples.

const svg = (body: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600">${body}</svg>`)}`

const TILE_POSTER = svg(
  `<rect width="960" height="600" fill="#e9e7e1"/>
  <rect x="210" y="110" width="540" height="380" rx="34" fill="#fff"/>
  <rect x="250" y="150" width="150" height="16" rx="8" fill="#d8d6cf"/>
  <rect x="250" y="186" width="230" height="40" rx="12" fill="#2b2b28"/>
  ${[120, 170, 140, 210, 190, 250, 230]
    .map((h, i) => `<rect x="${262 + i * 66}" y="${452 - h}" width="40" height="${h}" rx="10" fill="${i === 5 ? '#3f5bd9' : '#cfd5f4'}"/>`)
    .join('')}`,
)

const FLUX_POSTER = svg(
  `<defs>
    <radialGradient id="a" cx="30%" cy="35%" r="60%"><stop offset="0" stop-color="#f08a5d"/><stop offset="1" stop-color="#f08a5d" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="72%" cy="60%" r="55%"><stop offset="0" stop-color="#6c5ce7"/><stop offset="1" stop-color="#6c5ce7" stop-opacity="0"/></radialGradient>
    <radialGradient id="c" cx="55%" cy="20%" r="40%"><stop offset="0" stop-color="#ffd3a5"/><stop offset="1" stop-color="#ffd3a5" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="960" height="600" fill="#15131c"/>
  <rect width="960" height="600" fill="url(#b)"/>
  <rect width="960" height="600" fill="url(#a)"/>
  <rect width="960" height="600" fill="url(#c)" opacity=".7"/>`,
)

export default function GalleryCardDemo() {
  const [opened, setOpened] = useState('')
  const open = (name: string) => () => setOpened(name)

  return (
    <div className="grid w-full gap-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4">
        <GalleryCard
          name="data-tile"
          href="#data-tile"
          description="A card for one figure, with a title, an optional action and a footer line."
          category="surfaces"
          poster={TILE_POSTER}
          onOpen={open('data-tile')}
        />
        <GalleryCard
          name="flux-image"
          href="#flux-image"
          description="An image that flows like liquid under the pointer, drawn with WebGL."
          tier="pro"
          category="image"
          isNew
          poster={FLUX_POSTER}
          onOpen={open('flux-image')}
        />
        <GalleryCard
          name="use-reduced-motion"
          href="#use-reduced-motion"
          description="True when the visitor has asked the system for less motion."
          category="hooks"
          onOpen={open('use-reduced-motion')}
        />
        <GalleryCard
          name="liquid-metal-hover-distortion-card"
          href="#liquid-metal-hover-distortion-card"
          description="A long name and a description that runs past two lines, to show where the card clamps it and keeps every card the same height in the grid."
          tier="pro"
          category="effects"
          isNew
          onOpen={open('liquid-metal-hover-distortion-card')}
        />
      </div>
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="demo">Demo data</Badge>
        <span role="status">{opened ? `Opened “${opened}” in place. Cmd/Ctrl click opens the link instead.` : 'Example items. Click a card to open it in place.'}</span>
      </p>
    </div>
  )
}
