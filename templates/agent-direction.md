# Prompt: one design direction

Fill in `<…>` and send it to a `general-purpose` agent with `run_in_background: true`. Start three agents, each with its own DIRECTION, in the same message.

```
You are designing a bold, genuinely beautiful landing page mockup (one self-contained HTML file) for "<PRODUCT>", <ONE LINE ABOUT THE PRODUCT>. <IF THERE WAS A PREVIOUS ROUND: The user found the previous mockups "<CRITIQUE>".> It must look like a top-tier, award-level product site while staying credible for <AUDIENCE/CONTEXT>: no generic SaaS look, no purple gradients, no invented numbers.

WORK DIR: <SCRATCH>/landing
READ FIRST:
- BRIEF.md (brand, data, required sections, copy rules). Follow it strictly.
- <PREVIOUS ROUND'S FILES AND SCREENSHOTS, if any>
- <DB>/resources/effects.html: UI-library effects (blur fade, text reveal, highlighter, number ticker, spotlight cards, marquee, dot pattern, shimmer button, toast, command palette, bottom sheet) in plain JS/CSS. Reuse its techniques.
- <IF CLONED> Magic UI source: <MAGICUI>/apps/www/registry/magicui/*.tsx (<RELEVANT COMPONENTS>). Port what you use to plain JS/CSS.
- <INSTALLED DESIGN SKILLS, e.g. frontend-design>: read and apply them.

DIRECTION "<NAME>" (file: <N>-<slug>.html):
- Theme: <THE METAPHOR IN ONE SENTENCE>. <Colour world.> Hero: <the carrying image or motion, and which effects drive it>.
- Following sections, one signature effect each: <section → effect, section → effect, …>.
- Full width, generous spacing, magazine-grade typography, real depth. Mobile must be great too.
- Respect prefers-reduced-motion (static end state), no horizontal scroll, no console errors. External scripts only from <ALLOWED CDNs>, fonts from <ALLOWED SOURCES>.
- Must be portable to <THE APP'S STACK> with plain JS (no React build step), so keep the JS plain and modest.

VERIFY: take full-page screenshots at 1440 and 390 px wide, for example with
  npx -y playwright screenshot --full-page --viewport-size "1440, 900" file://<WORK DIR>/<N>-<slug>.html <N>-<slug>-desk.png
  npx -y playwright screenshot --full-page --viewport-size "390, 844" file://<WORK DIR>/<N>-<slug>.html <N>-<slug>-mob.png
(run `npx -y playwright install chromium` once if the browser is missing). Look at the screenshots yourself and iterate until it is truly beautiful: at least two improvement passes. Test the interactions in a real browser. Give the file a unique <title>.

REPORT BACK (short): file names, which effects are where, and anything you are unsure about. Do not touch anything outside the work dir; delete your own scratch files.
```
