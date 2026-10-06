// The curves the cards of a CurveCarousel sit on. Each layout is a pure function from a card's distance to the
// focus (in slides, fractional while moving) to a pose, so a new curve is a few lines of maths.

/** Where one card sits. Lengths in px from the stage's centre, angles in degrees. */
export type CurvePose = {
  x?: number
  y?: number
  /** Towards the viewer. */
  z?: number
  rotateX?: number
  rotateY?: number
  rotateZ?: number
  scale?: number
  opacity?: number
  /** Blur in px. */
  blur?: number
  /** 0–1: how far the card fades into the page's background. */
  fog?: number
  /** Paint order. Defaults to depth (`z`). */
  order?: number
  /** -1 to 1: how far the card's picture slides inside its frame. The card sets `--curve-shift` to this
   *  times the layout's `shift` times its width; content opts in by translating by it. */
  shift?: number
}

export type CurveSize = {
  cardWidth: number
  cardHeight: number
  /** The stage's height. */
  height: number
  /** The CSS perspective of the stage, in px. */
  perspective: number
  /** A radius or other length the layout wants to keep for its poses. */
  radius?: number
  /** Where the viewer looks from, as CSS `perspective-origin`. */
  origin?: string
}

export type CurveContext = CurveSize & {
  /** The stage's width. */
  width: number
  /** How many slides there are. */
  count: number
  /** The carousel's speed, in slides per second. */
  velocity: number
}

export type CurveLayout = {
  /** The drag direction. */
  axis: 'x' | 'y'
  /** Wrap around by default. */
  loop: boolean
  /** Card width over height, unless the carousel sets one. */
  aspect: number
  /** Card size and stage size for a stage this wide. */
  size: (width: number, aspect: number, count: number) => CurveSize
  /** Pixels of drag per slide. Negative turns the drag round. */
  step: (c: CurveContext) => number
  /** Cards further than this from the focus are not drawn. */
  range: (c: CurveContext) => number
  /** The furthest a picture slides inside its card, as a share of the card's width (see `CurvePose.shift`). */
  shift?: number
  pose: (d: number, c: CurveContext) => CurvePose
}

const RAD = Math.PI / 180
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
// 0 at `a`, 1 at `b`, smooth in between.
const ramp = (v: number, a: number, b: number) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
// A ring with at least `min` places, so few cards still leave the back of it empty.
const places = (count: number, min: number) => Math.max(count, min)

/** A hand of cards held at a hinge just below them, the focused card lifted out of the hand. */
const fan: CurveLayout = {
  axis: 'x',
  loop: false,
  aspect: 0.7,
  size: (w, a) => {
    const cardWidth = clamp(w * 0.3, 120, 196)
    const cardHeight = cardWidth / a
    return { cardWidth, cardHeight, height: cardHeight * 1.52, perspective: 1600, radius: cardHeight * 1.1 }
  },
  step: (c) => c.cardWidth * 0.42,
  range: () => 4.6,
  pose: (d, c) => {
    const r = c.radius!
    // 7° a card, and 6° more either side of the focus, so the lifted card stands clear of the hand.
    const near = clamp(d, -1, 1)
    const deg = d * 7 + near * 6
    const a = deg * RAD
    const lift = (1 - Math.abs(near)) * c.cardHeight * 0.1
    return {
      x: r * Math.sin(a),
      y: r * (1 - Math.cos(a)) - lift - c.cardHeight * 0.1,
      rotateZ: deg,
      fog: Math.min(Math.abs(d), 4) * 0.05,
      opacity: ramp(4.6 - Math.abs(d), 0, 1),
      order: Math.round(-Math.abs(d) * 100),
    }
  },
}

/** Cards spaced along a wide circle, the focus at its top. */
const arc: CurveLayout = {
  axis: 'x',
  loop: true,
  aspect: 0.75,
  size: (w, a) => {
    const cardWidth = clamp(w * 0.3, 120, 196)
    const cardHeight = cardWidth / a
    const radius = Math.max(w * 1.15, cardWidth * 3.6)
    return { cardWidth, cardHeight, height: cardHeight * 1.5, perspective: 1600, radius }
  },
  step: (c) => c.cardWidth * 1.12,
  range: (c) => Math.ceil(c.width / 2 / (c.cardWidth * 1.12)) + 1.5,
  pose: (d, c) => {
    const r = c.radius!
    const a = (d * c.cardWidth * 1.12) / r
    const x = r * Math.sin(a)
    return {
      x,
      y: r * (1 - Math.cos(a)) - c.cardHeight * 0.12,
      rotateZ: a / RAD,
      opacity: ramp(c.width / 2 + c.cardWidth * 0.35 - Math.abs(x), 0, c.cardWidth * 0.7),
      order: Math.round(-Math.abs(d) * 100),
    }
  },
}

/** The focused card faces you; the rest turn away and stack to either side. */
const coverflow: CurveLayout = {
  axis: 'x',
  loop: false,
  aspect: 0.8,
  size: (w, a) => {
    const cardWidth = clamp(w * 0.4, 150, 248)
    const cardHeight = cardWidth / a
    return { cardWidth, cardHeight, height: cardHeight * 1.24, perspective: 1100 }
  },
  step: (c) => c.cardWidth * 0.55,
  range: (c) => Math.min(6, Math.ceil((c.width / 2 - c.cardWidth * 0.6) / (c.cardWidth * 0.22)) + 2),
  pose: (d, c) => {
    const a = clamp(d, -1, 1)
    const rest = d - a
    const w = c.cardWidth
    const out = Math.abs(rest)
    return {
      x: a * w * 0.62 + rest * w * 0.22,
      z: -Math.abs(a) * w * 0.55 - out * w * 0.08,
      rotateY: -a * 58,
      fog: Math.abs(a) * 0.12 + Math.min(out, 3) * 0.08,
      opacity: ramp(c.width / 2 + w * 0.1 - Math.abs(a * w * 0.62 + rest * w * 0.22), 0, w * 0.4),
      order: Math.round(-Math.abs(d) * 100),
    }
  },
}

/** A drum seen from outside: the cards ride round it and pass behind. */
const cylinder: CurveLayout = {
  axis: 'x',
  loop: true,
  aspect: 0.72,
  size: (w, a, count) => {
    const cardWidth = clamp(w * 0.26, 108, 172)
    const cardHeight = cardWidth / a
    const step = (2 * Math.PI) / places(count, 9)
    const radius = (cardWidth * 0.56) / Math.tan(step / 2)
    return { cardWidth, cardHeight, height: cardHeight * 1.3, perspective: radius * 2.2, radius }
  },
  step: (c) => (c.radius! * 2 * Math.PI) / places(c.count, 9),
  range: (c) => places(c.count, 9) / 2,
  pose: (d, c) => {
    const a = (d * 2 * Math.PI) / places(c.count, 9)
    const cos = Math.cos(a)
    return {
      x: c.radius! * Math.sin(a),
      z: c.radius! * (cos - 1),
      rotateY: a / RAD,
      opacity: ramp(cos, -0.1, 0.4),
      fog: (1 - cos) * 0.4,
    }
  },
}

/** A curved wall that wraps round the viewer, like standing inside a panorama: the nearer cards loom larger. */
const curl: CurveLayout = {
  axis: 'x',
  loop: true,
  aspect: 0.78,
  size: (w, a) => {
    const cardWidth = clamp(w * 0.24, 100, 168)
    const cardHeight = cardWidth / a
    const radius = Math.max(w * 0.5, cardWidth * 2.2)
    return { cardWidth, cardHeight, height: cardHeight * 1.7, perspective: radius * 1.12, radius }
  },
  step: (c) => c.cardWidth * 1.06,
  range: (c) => Math.ceil((64 * RAD * c.radius!) / (c.cardWidth * 1.06)) + 0.5,
  pose: (d, c) => {
    const r = c.radius!
    const a = (d * c.cardWidth * 1.06) / r
    return {
      x: r * Math.sin(a),
      z: r * (1 - Math.cos(a)),
      rotateY: -a / RAD,
      opacity: ramp(66 - Math.abs(a / RAD), 0, 14),
      order: Math.round(-Math.abs(d) * 100),
    }
  },
}

/** A spiral staircase of cards: turning it walks them round the back and up or down past the front. */
const helix: CurveLayout = {
  axis: 'x',
  loop: false,
  aspect: 1.3,
  size: (w, a) => {
    const cardWidth = clamp(w * 0.22, 100, 150)
    const cardHeight = cardWidth / a
    return { cardWidth, cardHeight, height: cardHeight * (1 + 2 * 5 * 0.24), perspective: 1100, radius: cardWidth * 1.5, origin: '50% 30%' }
  },
  step: (c) => c.cardWidth * 0.6,
  range: () => 5.6,
  pose: (d, c) => {
    const a = d * 30 * RAD
    const cos = Math.cos(a)
    return {
      x: c.radius! * Math.sin(a),
      y: d * c.cardHeight * 0.24,
      z: c.radius! * (cos - 1),
      rotateY: a / RAD,
      fog: (1 - cos) * 0.3,
      blur: (1 - cos) * 0.7,
      opacity: ramp(5.6 - Math.abs(d), 0, 1),
    }
  },
}

/**
 * Two strands twisting round a horizontal axis. Each step turns the twist by a little less than half a round, so
 * neighbouring cards sit on opposite strands and each strand winds slowly along. The cards face you and the back
 * strand blurs with depth.
 */
const doubleHelix: CurveLayout = {
  axis: 'x',
  loop: false,
  aspect: 1.3,
  size: (w, a) => {
    const cardWidth = clamp(w * 0.19, 84, 124)
    const cardHeight = cardWidth / a
    const radius = cardHeight * 0.72
    return { cardWidth, cardHeight, height: cardHeight * 1.25 + radius * 2, perspective: 800, radius }
  },
  step: (c) => c.cardWidth * 0.62,
  range: (c) => Math.ceil(c.width / 2 / (c.cardWidth * 0.62)) + 1,
  pose: (d, c) => {
    const a = d * 165 * RAD
    const cos = Math.cos(a)
    const x = d * c.cardWidth * 0.62
    return {
      x,
      y: -c.radius! * Math.sin(a),
      z: c.radius! * (cos - 1),
      fog: (1 - cos) * 0.24,
      blur: (1 - cos) * 1.6,
      opacity: ramp(c.width / 2 + c.cardWidth * 0.2 - Math.abs(x), 0, c.cardWidth * 0.5),
    }
  },
}

/**
 * A card file: the cards still to come stand behind the front one, each leaning back a little more and showing
 * its top; the ones already read tip forward and drop away. Pull down for the next card.
 */
const rolodex: CurveLayout = {
  axis: 'y',
  loop: false,
  aspect: 1.62,
  size: (w, a) => {
    const cardWidth = clamp(w * 0.56, 220, 320)
    const cardHeight = cardWidth / a
    return { cardWidth, cardHeight, height: cardHeight * 1.9, perspective: 1100, origin: '50% 10%' }
  },
  step: (c) => -c.cardHeight * 0.7,
  range: () => 5.5,
  pose: (d, c) => {
    const h = c.cardHeight
    if (d < 0) {
      // Tips forward on its bottom edge, towards you and down, and fades.
      const t = Math.min(-d, 1)
      return {
        y: h * 0.3 + t * h * 0.42,
        z: t * h * 0.5,
        rotateX: -t * 70,
        opacity: ramp(1 - t, 0, 0.7),
        order: Math.round(-d * 100) + 1000,
      }
    }
    const back = d
    return {
      y: h * 0.3 - back * h * 0.15,
      z: -back * h * 0.2,
      rotateX: Math.min(back, 1) * 10 + back * 3,
      fog: Math.min(back, 5) * 0.11,
      opacity: ramp(5.5 - back, 0, 1),
      order: Math.round(-back * 100),
    }
  },
}

/**
 * Overlapping cards like roof tiles: the card in focus lies on top, whole; the others tuck under it, each showing
 * a slice. Pictures that use `--curve-shift` slide inside their cards as they move, so each slice is a crop.
 */
const shingle: CurveLayout = {
  axis: 'x',
  loop: false,
  aspect: 0.78,
  shift: 0.14,
  size: (w, a) => {
    const cardWidth = clamp(w * 0.44, 160, 260)
    const cardHeight = cardWidth / a
    return { cardWidth, cardHeight, height: cardHeight * 1.08, perspective: 1600 }
  },
  step: (c) => c.cardWidth * 0.5,
  range: (c) => Math.min(6, Math.ceil((c.width / 2 - c.cardWidth * 0.55) / (c.cardWidth * 0.2)) + 2),
  pose: (d, c) => {
    const a = clamp(d, -1, 1)
    const rest = d - a
    const out = Math.abs(rest)
    const x = a * c.cardWidth * 0.56 + rest * c.cardWidth * 0.2
    return {
      x,
      scale: 1 - Math.abs(a) * 0.14 - Math.min(out, 4) * 0.05,
      fog: Math.abs(a) * 0.22 + Math.min(out, 3) * 0.1,
      shift: -a,
      opacity: ramp(c.width / 2 + c.cardWidth * 0.2 - Math.abs(x), 0, c.cardWidth * 0.4),
      order: Math.round(-Math.abs(d) * 100),
    }
  },
}

/**
 * A flat row that bulges towards you while it moves fast: the middle swells forward and the ends bend away, more
 * the faster it goes, and the row flattens again as it slows down.
 */
const bulge: CurveLayout = {
  axis: 'x',
  loop: false,
  aspect: 0.75,
  size: (w, a) => {
    const cardWidth = clamp(w * 0.3, 124, 220)
    const cardHeight = cardWidth / a
    return { cardWidth, cardHeight, height: cardHeight * 1.3, perspective: 1100 }
  },
  step: (c) => c.cardWidth * 1.08,
  range: (c) => Math.ceil(c.width / 2 / (c.cardWidth * 1.08)) + 1,
  pose: (d, c) => {
    const x = d * c.cardWidth * 1.08
    const r = c.width / 2 + c.cardWidth * 0.5
    // 0 at rest, 1 from about nine slides a second.
    const b = ramp(Math.abs(c.velocity), 1.2, 9) * c.cardWidth * 0.7
    const u = x / r
    return {
      x,
      z: b * (1 - u * u),
      rotateY: Math.atan((2 * b * x) / (r * r)) / RAD,
      opacity: ramp(c.width / 2 + c.cardWidth * 0.55 - Math.abs(x), 0, c.cardWidth * 0.3),
    }
  },
}

export const curveLayouts = { fan, arc, coverflow, cylinder, curl, helix, 'double-helix': doubleHelix, rolodex, shingle, bulge } satisfies Record<
  string,
  CurveLayout
>

export type CurveLayoutName = keyof typeof curveLayouts
