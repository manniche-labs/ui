// On a lab detail page the frame grows to fit the demo, so nothing scrolls inside it. When the demo is taller
// than the frame, this tells the page how tall it is. Opened on its own, the demo is the whole tab and nothing is sent.

// A size tied to the viewport: h-dvh, min-h-dvh, h-screen, max-h-[70vh], w-[min(86vw,60vh,640px)], sm:h-[62dvh].
const TIED = /^((?:[\w-]+:)*)((?:min-|max-)?(?:h|w|size))-(?:dvh|svh|lvh|screen|\[[^\]]*\d[dsl]?vh[^\]]*\])$/
const PROPERTIES: Record<string, ('height' | 'minHeight' | 'maxHeight' | 'width' | 'minWidth' | 'maxWidth')[]> = {
  h: ['height'],
  'min-h': ['minHeight'],
  'max-h': ['maxHeight'],
  w: ['width'],
  'min-w': ['minWidth'],
  'max-w': ['maxWidth'],
  size: ['width', 'height'],
}
const BREAKPOINT_REM: Record<string, number> = { sm: 40, md: 48, lg: 64, xl: 80, '2xl': 96 }

// A class behind a breakpoint only sizes the box when the frame is wide enough. Any other variant (hover:, dark:)
// may switch on later, so it is left alone.
function applies(variants: string): boolean {
  return variants
    .split(':')
    .filter(Boolean)
    .every((v) => {
      const m = /^(max-)?(sm|md|lg|xl|2xl)$/.exec(v)
      if (!m) return false
      const wide = innerWidth >= BREAKPOINT_REM[m[2]] * 16
      return m[1] ? !wide : wide
    })
}

// Every box in the flow of the page whose size follows the viewport, with the properties that follow it.
// An overlay (absolute or fixed) covers the frame whatever its height, so it may follow it. So may the preview's own
// page (data-fills-frame), which keeps a small demo in the middle of a taller frame.
function tiedBoxes(): [HTMLElement, (typeof PROPERTIES)[string]][] {
  const found: [HTMLElement, (typeof PROPERTIES)[string]][] = []
  for (const el of document.body.querySelectorAll<HTMLElement>('[class*="vh"], [class*="screen"]')) {
    if (el.hasAttribute('data-fills-frame')) continue
    const properties = new Set<(typeof PROPERTIES)[string][number]>()
    for (const c of el.classList) {
      const m = TIED.exec(c)
      if (m && applies(m[1])) for (const p of PROPERTIES[m[2]]) properties.add(p)
    }
    if (!properties.size) continue
    let inFlow = true
    for (let a: HTMLElement | null = el; a && a !== document.body; a = a.parentElement) {
      if (/^(absolute|fixed)$/.test(getComputedStyle(a).position)) {
        inFlow = false
        break
      }
    }
    if (inFlow) found.push([el, [...properties]])
  }
  return found
}

export function reportHeight(): () => void {
  if (parent === window) return () => {}
  const root = document.documentElement
  let width = innerWidth
  // The frame's height before it grew at this width. The page goes back to it when the width changes.
  let base = innerHeight
  let lastHeight = innerHeight
  let lastOver = 0
  let sent = 0
  // A box as tall as the screen, like a scene with more below it, would grow with every taller frame. Before the frame
  // grows, each one is held at the size it has now, so the frame can grow around the whole demo. The boxes get their own
  // inline sizes back when the width changes.
  const held = new Map<HTMLElement, [(typeof PROPERTIES)[string][number], string][]>()
  const hold = () => {
    const boxes = tiedBoxes().filter(([el]) => !held.has(el))
    // Read every size before writing any, so holding one box cannot change the next.
    const sizes = boxes.map(([el, properties]) => {
      const style = getComputedStyle(el)
      return properties.map((p) => [p, style[p]] as const)
    })
    boxes.forEach(([el], i) => {
      held.set(el, sizes[i].map(([p]) => [p, el.style[p]]))
      for (const [p, v] of sizes[i]) el.style[p] = v
    })
  }
  const release = () => {
    for (const [el, own] of held) for (const [p, v] of own) el.style[p] = v
    held.clear()
  }
  // A demo sized by the viewport in a way no class shows, like a canvas, grows with the frame too. When growing the
  // frame twice in a row barely shrank the overflow, stop asking. Once is not enough: a demo still laying itself out
  // can grow at that moment.
  let misses = 0
  let elastic = false
  let frame = 0

  const send = () => {
    frame = 0
    if (innerWidth !== width) {
      // A new width: the demo lays itself out again, and the page starts the frame from its normal height.
      width = innerWidth
      base = innerHeight
      lastOver = 0
      sent = 0
      misses = 0
      elastic = false
      release()
    }
    const need = root.scrollHeight
    const over = need - innerHeight
    if (over > 2 && innerHeight <= base + 2) hold()
    if (innerHeight > lastHeight && lastOver > 2) {
      misses = over > lastOver - (innerHeight - lastHeight) / 2 ? misses + 1 : 0
      if (misses >= 2) elastic = true
    }
    lastHeight = innerHeight
    lastOver = over
    if (elastic || over <= 2 || need === sent) return
    sent = need
    parent.postMessage({ type: 'manniche-height', width: innerWidth, height: need }, location.origin)
  }
  const queue = () => {
    if (!frame) frame = requestAnimationFrame(send)
  }

  const observer = new ResizeObserver(queue)
  observer.observe(root)
  observer.observe(document.body)
  // A demo that grows inside a fixed box, like an open menu, changes no box size, so changes to the page count too.
  const mutations = new MutationObserver(queue)
  mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'open', 'aria-expanded', 'data-state'] })
  addEventListener('resize', queue)
  queue()
  return () => {
    observer.disconnect()
    mutations.disconnect()
    removeEventListener('resize', queue)
    cancelAnimationFrame(frame)
    release()
  }
}
