# Changelog

## 2026-10-06

### Added

- `shader-backdrop`: a moving WebGL background in seven families (mesh, swirl, halftone, metal, aurora, flame, cells) with 55 named looks, or your own colours through `colors`. One still frame under reduced motion; pauses off screen; CSS gradient until the first frame or without WebGL. The `cells` border distance is based on Inigo Quilez's MIT-licensed "Voronoi - distances", credited in the file and in THIRD_PARTY_NOTICES.md.
- `gravity-grid`: dots or grid lines that bend towards the pointer like a gravity well, light up around it and settle when it leaves. Static under reduced motion.
- Demos for both. Their radio groups take one tab stop, and the arrow keys move the choice.

### Changed

- `liquid-metal` stayed blank in React StrictMode and after a remount: the effect ran twice on the same canvas, and a canvas whose WebGL context was lost cannot get a new one. Each effect run now makes a fresh canvas. If the shader fails to link, the context is now released at once instead of waiting for garbage collection, since browsers only keep about 16 per page.
- README: the two new components, the component count (61 was out of date; now 68) and a note on the limit of about 16 WebGL contexts per page.

### Removed

- Nothing.
