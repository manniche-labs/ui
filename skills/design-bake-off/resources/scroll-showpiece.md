# Film-style scroll for showcase pages (optional)

A recipe for pages where scrolling is the experience: GSAP + ScrollTrigger (+ SplitText) and Lenis for smooth scroll. It is opt-in. The default in a bake-off is still plain JS/CSS from `effects.html`.

## When

Only when the brief says showcase: portfolio, campaign front page, product film, case study. Scroll-scrubbed animation where the whole page is one sequence.

## When not

- Forms, quote flows, checkout and other conversion pages.
- Text-heavy pages (articles, terms, documentation).
- Pages with iframes, modals or nested scroll areas.
- Anywhere PageSpeed/INP and simplicity matter most.

If in doubt, leave it out.

## Budget

| Part | gzip |
|---|---|
| gsap (core) | about 28 KB |
| ScrollTrigger | about 18 KB |
| SplitText (optional) | about 4 KB |
| Lenis | about 4 KB |

Core + ScrollTrigger is about 46 KB. With Lenis and SplitText you are near 55 KB. Put that number in the brief, and the direction must justify it. Load scripts with `defer`, and start the animation only when they have loaded.

## Licence

GSAP is free including all plugins (licence "Standard no-charge", not MIT). Fine in your own and clients' sites, but not to repackage and redistribute as a product. Lenis is MIT.

## Pinned versions

- GSAP 3.15 (core, ScrollTrigger, SplitText)
- Lenis 1.3.21. Older 1.1.x does not respect reduced motion by default, so always pin the version.

Put the version in the URL, never `latest`.

## Setup

```js
gsap.registerPlugin(ScrollTrigger);

const mm = gsap.matchMedia();

mm.add('(prefers-reduced-motion: no-preference)', () => {
  const lenis = new Lenis({
    anchors: true,               // #anchor links scroll smoothly
    respectReducedMotion: true,  // Lenis' own switch
    // no syncTouch: touch stays native scroll
  });

  lenis.on('scroll', ScrollTrigger.update);
  const tick = (t) => lenis.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  // ...your ScrollTrigger animations here...

  return () => {                 // cleanup when reduced motion is switched on
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
});
```

Recommended CSS (from Lenis):

```css
html.lenis, html.lenis body { height: auto; }
.lenis.lenis-smooth { scroll-behavior: auto !important; }
.lenis.lenis-smooth [data-lenis-prevent] { overscroll-behavior: contain; }
.lenis.lenis-stopped { overflow: clip; }
```

## Reduced motion

Two layers, both required:
1. `gsap.matchMedia()` runs the animations only at `no-preference`. Otherwise the page shows its static end state: all content visible, no pinning, no extra scroll length.
2. Lenis' own `respectReducedMotion`.

Never hide content in CSS ("start invisible") unless the JS also sets the end state. That also keeps the page working without JS.

## Lenis traps

- **Anchor links** only work with `anchors: true`.
- **Touch**: leave touch to the browser. Do not use `syncTouch`.
- **Nested scroll** (menu, list, modal with its own scroll): put `data-lenis-prevent` on the element, or it cannot be scrolled.
- **CSS scroll-snap** does not work with Lenis. Do not use it on the page.
- **iframes** break the smoothing. No embeds in the middle of the sequence.
- **Safari** is locked to 60 fps.
- **Focus**: pinned sections can hide focused elements. See "How to check it".

## CSP and hosting

CDN scripts need the CDN in `script-src`. If the app's CSP is `'self'`-only (see the port template), self-host the pinned files and serve them from the app. Do not loosen the CSP. Mockups may use cdn.jsdelivr.net/npm or cdnjs.cloudflare.com with the exact version in the URL.

## GSAP traps

From the official skills ([greensock/gsap-skills](https://github.com/greensock/gsap-skills), MIT):
- `gsap.matchMedia()` for reduced motion and breakpoints, so everything is cleaned up when the condition changes.
- In React: `useGSAP()` or `gsap.context()` with cleanup, never a bare `useEffect` without reverting.
- ScrollTrigger: create triggers top to bottom (otherwise set `refreshPriority` so they refresh in page order). Do not animate the pinned element itself, animate its children. Call `ScrollTrigger.refresh()` when images or fonts change the layout. Wrap start/end in `clamp()` so an animation never starts above the top or ends below the bottom of the page.
- Animate `transform` and `opacity`, not `top`/`left`/`height`.
- SplitText: use `SplitText.create(...)` and `revert()` on cleanup, and split after `document.fonts.ready` (or use `autoSplit: true` with the animation inside `onSplit()`).

## Depth in the hero (ideas)

From scroll-craft's hero-depth notes (ideas only, not their engine, video scrubbing or paid image services):
- Plan the depth first: background, focal subject, foreground and any atmosphere. Name what moves independently.
- Layers must move at visibly different rates or scales. Several layers moving as one image is not depth.
- Overlap (the subject in front of the headline) adds more depth than motion alone, but the headline must stay readable.
- Give the scroll a clear payoff: what does the visitor see or understand that they did not before?
- Keep contact points anchored (a person stands on the rock, a product on its plinth).
- Art-direct mobile separately. Do not just shrink desktop.
- Essential copy and buttons are real HTML, not part of the animation.
- Motion is deliberate, not constant. Pause offscreen work.

## How to check it

Scroll the page in steps (for example half a screen at a time) at 1440 and 390 px and with reduced motion on. Take a screenshot at each step. Look for:
- **Dead scroll**: the reader scrolls but nothing changes over several steps.
- **Content that never appears**: text or images left at `opacity: 0` or outside the viewport in the end state.
- **Focus on invisible elements**: tab through the page. Focus must never land on something you cannot see.
- No horizontal scroll and no console errors. A static end state with reduced motion.
