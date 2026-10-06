# Changelog

## 2026-10-06

- New `shader-backdrop`: a moving WebGL background in seven families (mesh, swirl, halftone, metal, aurora, flame, cells) with 55 named looks, or your own colours through `colors`. One still frame under reduced motion; pauses off screen.
- New `gravity-grid`: dots or grid lines that bend towards the pointer like a gravity well, light up around it and settle when it leaves. Static under reduced motion.
- Fixed `liquid-metal` staying blank in React StrictMode and after remounts: each effect run now makes a fresh canvas, since a canvas whose WebGL context was lost cannot get a new one.
- The radio groups in the new demos take one tab stop, and the arrow keys move the choice.
- README: the two new components, the component count (68) and a note on the browser's limit of about 16 WebGL contexts per page.
