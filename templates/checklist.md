# Checklist: three layers per page

Every page gets three scores, one per layer. A page is only at the top when all three are high. No overall score is calculated.

| Layer | Question | Who answers | Based on |
|---|---|---|---|
| 1 | Does it work? | An agent | Screenshots, code and the measurement |
| 2 | Does it hold up? | The measurement (`scripts/measure.mjs`) | Numbers from a real browser |
| 3 | Is it delightful? | An agent | Screenshots, CSS and the measurement |

Next to the three layers stands the blind customer: an agent that tries to complete the page's task without knowing the page. It gives no score, only a result and the places where it stumbled.

The first five sections apply to every layer.

## A finding

A finding is a claim about one place on one page. It has four parts:

- **Where.** The element, as the measurement writes it (`button.btn "Send"`), or file and line.
- **Evidence.** At least one of three: a screenshot (file name, and where in the image), a field in `measurement.json` with its value, or a file with a line number.
- **Who it hits, and how.** One sentence.
- **The change.** So concrete that it can be built without asking: property, value and file.

A finding without evidence is left out. Sizes, colours and contrast are never guessed. They are in the measurement or in the CSS.

## Honesty

- Only score what you have seen. If a page or a state could not be seen, the score is `null`, and the note says why.
- If the item does not exist on the page (Forms on a page without fields), the score is also `null` with a note. It does not count in the average.
- Never write "accessible" based on axe alone. Write: "axe finds no errors; the page has not been tried with a screen reader."
- Speed is "measured at 1.2 s on one machine", never "the page is fast".
- No invented numbers, user studies or quotes. Do not write what "most users" do.
- An empty list is a valid answer. Do not invent findings to fill it.
- Also say what is good. What works should not be redone.

## Scores

| | Layer 1: does it work | Layer 3: is it delightful |
|---|---|---|
| 5 | Nothing to fix. | Could be on a page you show off. |
| 4 | Works. Only polish. | Well crafted. Only polish or a single upgrade. |
| 3 | Works with difficulty: at least one finding that causes friction. | Neat, but ordinary. |
| 2 | Several findings that cause friction, or one that can only just be worked around. | Looks unfinished in several places. |
| 1 | At least one finding that blocks. | Looks broken. |
| `null` | Not seen, or does not exist on the page. | Not seen, or does not exist on the page. |

A score of 3 or lower must have a note that says why, and the note must point to evidence. Give every item its own score, never only an average.

What layer 2 measures is written up as findings by whoever puts the report together. The agents in layers 1 and 3 do not write a new finding about it. The score may well drop because of it, and then the note refers to the number.

## Severity

| Severity | Means | Example |
|---|---|---|
| **Blocker** | The user, or a group of users (keyboard, screen reader, small screen), cannot complete the task. Or they lose something: data, money, access, trust. | The send button cannot be reached with the keyboard. The form comes back empty without a message. |
| **Friction** | The task can be completed, but it costs time, doubt, a detour or a mistake on the way. | The iPhone zooms into the field. The error text does not say what to fix. |
| **Polish** | Something is wrong, but the user does not feel it as trouble. | A heading is 3 px off. `transition: all`. |
| **Upgrade** | Nothing is wrong. The proposal makes the page better than "fine". Layer 3 only. | The receipt fades in instead of switching in one go. |

Ask in this order, and stop at the first yes:

1. Can someone not complete the task, or do they lose something? **Blocker.**
2. Does it cost time, doubt, a detour or a mistake on the way? **Friction.**
3. Is something wrong without the user feeling it as trouble? **Polish.**
4. Is nothing wrong? **Upgrade**, if it is layer 3. Otherwise it is not a finding.

Four rules keep the scale steady:

- If you are in doubt between two steps, choose the lower one.
- Severity follows the user, not the rule. A WCAG failure is not a "Blocker" by itself. Low contrast in a footnote is polish; low contrast on the text of the page's only button is friction.
- Place matters. The same fault weighs more on the way to the page's task than in the footer.
- Many small findings do not become one big one. Ten times polish is still polish.

## Do not report

- **Demo and test content that is there on purpose:** banners, test data and placeholders that the plan or `PAGES.md` mentions.
- **What the plan has asked the measurement to ignore.** It stands under `ignored` for every page in `measurement.json`, with the reason.
- **Taste.** A choice carried through consistently is not a finding because you would have chosen something else.
- **Good practice in general.** Only what makes a difference on this particular page.
- **The same finding several times.** What recurs on every page (the page header, a shared button) is reported once with `"pages": "all"`.
- **A number alone.** `targetsUnder44`, `fontSizes`, `spacings` and `h1Count` are counts. They only become a finding when you can point to the element and say who it hits.
- **A single suspicion of AI look.** See the section on AI look.
- **Missing motion on a page used as a tool.**
- **Missing dark mode,** when the product does not promise one.
- **Content from others** (embedded maps, videos, consent banners) that the owner cannot change. If it blocks the task, it is reported once.
- **Speed under the limit.** 1.9 s is not a finding because 1.2 s would be nicer.
- **Code style, class names and choice of framework.** The review is about what the user meets.
- **Differences between the code and the deployed page.** Judge what the screenshot shows, and mention the difference once.
- **What you have not seen yourself:** a finding from another review, or a guess from the code without a screenshot or measurement.
- **New sections, new features and new copy that promise something the product cannot keep.** The review fixes what exists.

## Layer 1: Does it work (ten items)

Under each item it says where in `measurement.json` the evidence lies. The fields are under the individual page unless something else is stated.

You do not need to search the whole file. `node scripts/extract.mjs --out <folder> --page <name> --layer 1` prints the same fields with path and value, ordered by the items here. The same goes for `--layer 2` and `--layer 3`.

1. **One job.** Can you see in five seconds what the page is for and what to do? Is there one clear main action and not three equally important ones? Does the heading state the task in the user's words?
   Measurement: `structure.h1` (exactly one), `structure.title`.
2. **Order and weight.** Is the most important thing at the top and largest? Does the eye follow the path the task needs? Does something take up room without helping?
   See the screenshots, mobile first.
3. **Copy.** Short sentences, plain words, no jargon without explanation. Buttons say what happens ("Send message", not "OK"). The same word for the same thing on every page.
   See the screenshots and `copy` (the page's HTML as it looked in the browser).
4. **Forms.** Visible labels, not only placeholders. Help text where it is hard. Correct field types, `autocomplete` and `inputmode`. As few fields as possible. You can paste into the fields. The error stands by the field and says what is wrong and how to fix it.
   Measurement: `fields[]` (`label`, `type`, `autocomplete`, `autocompleteMissing`, `inputmode`, `pasteBlocked`), `form.invalidFields`. Whether the error is announced, whether the field is marked, and whether what was typed is kept, is measured in layer 2.
5. **States.** Empty, loading, error, receipt, no access, lots of content, very long text. Does every state look as if someone has thought about it, and does it say what you can do now?
   Measurement: `stress` (longer text and a very long word), `clipped`, and `notFoundPage` at the top of the file (an address that does not exist). Text in a scroll area (a wide table in a container with `overflow: auto`) does not count as clipped: it can be scrolled into view.
6. **Feedback on actions.** Can you see that a click worked? A receipt after submitting, confirmation before something that cannot be undone, and a way back. A form cannot be submitted twice by a double click.
   Measurement: `doubleSubmit` (`submits`, `showsWork`, `buttonAfterFirstPress`), `performance.inpMs`.
7. **Wayfinding.** Do you know where you are and how to get back? Active menu item, telling page title, links that look like links, no dead ends.
   Measurement: `structure.title`, `structure.landmarks`, `notFoundPage.linkHome`.
8. **Mobile.** The most important thing without scrolling far. Tables that can be read. Nothing that only works with a mouse.
   See the mobile screenshot. Horizontal scroll, targets and field font size are measured in layer 2.
9. **Accessibility.** Correct heading levels, landmarks, a language on the page and text on images. Errors are announced to screen readers. Colour is never the only signal. Focus moves to where something new happens.
   Measurement: `structure.levelSkips`, `structure.landmarks`, `structure.lang`, `structure.imagesWithoutAlt`, `structure.live`, `form.liveRegions`, `form.focusOnError`, `keyboard.stops`, `keyboard.expectedWithArrowKeys`, `keyboard.sameTargetReached`, `keyboard.interrupted`, `keyboard.notTried`. Contrast, focus ring, labels and axe are measured in layer 2.
   `keyboard.expectedWithArrowKeys` are the members of a group (radio buttons with the same name, tabs, a menu, a toolbar) that Tab passes because the group was reached elsewhere. The measurement does not try the arrow keys. Look in the code to see whether they move between the members. If they do not, the member cannot be reached, and that is a finding.
   `keyboard.sameTargetReached` are the links Tab passes while Tab reaches another link with the same address (the copies in a ticker, the image next to a heading). Check that the two links do the same thing. If they do not, it is a finding.
   `keyboard.interrupted` says that the walk stopped after 600 stops. The rest of the page (`keyboard.notTried` elements) is neither passed nor failed, and it must be listed under `notSeen`.
10. **Whole.** Does the page follow the design system: colours, fonts, spacing, components? Matching buttons for matching actions. No unstyled elements.
    Measurement: `system` (`radii`, `textColours`, `surfaceColours`), `typography.fonts`.

## Layer 2: Does it hold up (measured)

The numbers are under every page's `metrics`. The score is 5 minus one point for every group that does not pass, but at least 1. It stands in `layer2.score`, and the groups that fail stand in `layer2.failed`.

| Group | Metrics | Passes at | Source |
|---|---|---|---|
| Errors | `consoleErrors`, `failedRequests`, `brokenImages` | 0 | Lighthouse, errors in the console |
| Narrow screen | `hScroll320`, `hScroll390` | 0 | WCAG 1.4.10 |
| Fingers | `targetFails`, `fieldsUnder16px` | 0. A target fails when it is under 24 px in height or width, or when it is a control (button, field, select, or a link that looks like a button) under 44 px. A checkbox and a radio button are measured on the surface that is easiest to hit: the field itself or its label. Safari on the iPhone zooms into a field with text under 16 px. | WCAG 2.5.8 (24 px); Apple HIG (44 pt) |
| Readability | `contrastErrors`, `axeErrors`, `fieldsWithoutLabel`, `zoomDisabled` | 0. Contrast at least 4.5:1 for text and 3:1 for large text. | WCAG 1.4.3, 1.4.4, 3.3.2; axe-core |
| Keyboard | `invisibleFocus`, `notReachedByKeyboard`, `focusObscured`, `focusOffscreen`, `focusJumpsBack`, `focusTrapped` | 0. Focus is obscured when none of the element can be seen behind what lies on top. It ends up off screen when the element stands or moves out of sight while it has focus (a ticker that does not stop). It jumps back when the next stop lies higher on the page without being a new column. It is trapped when Tab cannot get further. The elements stand in `keyboard.obscured`, `keyboard.offscreen`, `keyboard.jumpsBack` and `keyboard.trapped`. In a group with arrow keys (radio buttons with the same name, tabs, a menu, a toolbar) Tab only stops in one place. If the group is reached, the rest of it does not count as unreached; they stand in `keyboard.expectedWithArrowKeys`. A link Tab passes does not count either when Tab reaches another link with the same address; it stands in `keyboard.sameTargetReached`. | WCAG 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11 |
| Form | `formGaps` | 0 of 3: the error is announced, the field is marked, and what was typed is kept | WCAG 3.3.1, 4.1.3; keeping what was typed is the skill's own requirement |
| Speed | `lcpMs`, `cls`, `inpMs` | LCP at most 2500 ms, CLS at most 0.1, INP at most 200 ms | web.dev/articles/vitals |
| Calm | `motionDespiteReduced`, `imagesWithoutSize` | 0. Only what moves or scales something counts; a fade or a colour change may stay. An animation that is over in less than one frame (0.01 ms and one iteration) does not count either | WCAG 2.3.3 (level AAA); web.dev on CLS |

A group also passes when it is not measured. The report shows it as "not measured". That applies to Form on pages where the plan does not submit a form with errors, INP with `--quick`, and Speed when the plan says `"performance": false`.

The other metrics cannot fail a group. They are evidence for layers 1 and 3: `clippedText`, `targetsUnder44`, `textUnder12px`, `tightLineHeight`, `doubleSubmits`, `noHover`, `noPressed`, `hoverWithoutMedia`, `transitionAll`, `animatesLayout`, `over300ms`, `offscreenAnimations`, `misaligned`, `aiLook`, `stressBreaks` and `kB`. Three metrics are pure counts, where fewer is not better in itself: `h1Count`, `fontSizes` and `spacings`.

The report must say:

- The measurement is a lab measurement on one machine, as a phone with a slow processor and a slow network (`performance.conditions`). LCP, CLS and INP are a pointer, not the users' own numbers.
- axe finds only some of the accessibility errors. No axe errors does not mean the page is accessible.
- Contrast of text on top of images and gradients cannot be measured. The count stands in `contrast.notMeasured`.
- The measurement does not see drag and drop, embedded frames, a slow or broken network, or what a screen reader actually reads aloud. If the page has any of that, it is tried by hand.

## Layer 3: Is it delightful (eight items)

Every finding points to a specific element and a measured or read value. General advice ("more air", "make it more modern") does not count.

First decide what kind of page it is:

- **showcase:** home page, landing page, about page. Visited rarely and should be remembered.
- **tool:** login, forms, lists, settings. Visited often and should get out of the way.

That decides how much motion the page can carry.

1. **Typography.** A scale with few, clearly different steps; more than seven sizes is a finding. At most two typefaces plus a mono. Body text at 45 to 75 characters per line; over 80 is a finding. Line height of at least 1.3 in running text. No text under 12 px. Headings with `text-wrap: balance`. Real quotation marks (“ ” or ‘ ’), a real ellipsis (…) and tabular figures in columns of numbers.
   Measurement: `typography` (`fontSizes`, `fonts`, `weights`, `longestLineChars`, `tightLineHeight`, `textUnder12px`, `headingsWithoutBalance`, `straightQuotes`, `threeDots`, `numbersWithoutTabular`).
2. **Spacing and alignment.** Spacing follows one scale in steps of 4 px. Matching things have matching air. Edges align across sections. Cards in the same row are equally tall, and a field and a button next to each other are equally tall. A card that fills several rows of a grid on purpose is not a finding. Air is used to group, not only to fill.
   Measurement: `alignment.390` and `alignment.1440`, one for each width (`nearlyAligned`, `cardsUnevenHeight`, `fieldAndButtonUneven`), `system.spacings` (`offGrid4`, `shareOffGrid4`).
3. **Depth and surfaces.** Shadows in layers (one tight and one wide) instead of one grey blob. Border, shadow and fill are used on purpose, not all three on everything. Few different radii. A corner inside a corner: the inner radius is the outer radius minus the distance between them. That applies when the distance is smaller than the outer radius. If there is more room, the inner corner is free, as long as it is not rounder than the outer.
   Measurement: `system.shadows`, `system.radii`, `alignment.390.innerRadiusTooLarge` and `alignment.1440.innerRadiusTooLarge`.
4. **Colour.** One accent colour, used sparingly. Neutrals with a faint tint of the accent rather than pure grey. A colour means the same thing everywhere.
   Measurement: `system.textColours`, `system.surfaceColours`, `dark.exists`.
5. **States for every element.** Every button, every link and every card that can be pressed has rest, hover, focus, pressed and disabled. Pressing can be felt: a small push down (`scale(0.97)`) or a darker surface. Hover motion lives in `@media (hover: hover) and (pointer: fine)`, so it does not stick on a touch screen. Loading shows a skeleton or text, not an empty page.
   Measurement: `mouse` (`tried`, `noHover`, `noPressed`, `aimedAgain`, `notHit`), `motion.hoverRules`, `motion.hoverWithoutMedia`, `motion.activeRules`, `motion.focusVisibleRules`. `mouse.tried` is the number of elements the mouse has tried: what can be pressed, and at most 40. Three kinds are not tried, because they should not respond to mouse and press: fields, the selected item (the link to the page you are on; the selected tab) and what can only take focus (a scroll area, a tab panel). `mouse.aimedAgain` is what the page moved when the mouse came (a card in a fan that opens up): the mouse aimed once more and hit, and the element is judged like the others. `mouse.notHit` is what the mouse could not hit: it is covered, does not stand still (a ticker) or moves away every time. It is not judged and stands in neither `noHover` nor `noPressed`, so look at it yourself if it matters for the page.
6. **Motion that exists.** The rules are in the section below.
   Measurement: `motion` (`transitionAll`, `layoutProperties`, `keyframesWithLayout`, `overThreeHundred`, `linear`, `bouncyCurves`, `durations`, `curves`, `offscreen`, `reducedMotionRules`, `disabled`) and `reducedMotion` (`stillRunning`, `onlyFadeOrColour`). `disabled` are transitions that another rule has turned off on everything they match (`transition: none` further down the sheet). They move nothing and are not in the other lists.
7. **Motion that is missing.** Where would a transition explain something? A state that changes (form to receipt). Something that appears (error, toast, menu). A page change. A list that comes in. And where should there be none: actions you do a hundred times a day, everything started from the keyboard, and text you are reading. A tool page only gets what gives feedback or continuity. A showcase page with no motion at all is a chance not taken. The proposals are written as life cards, and the patterns for them are in `templates/patterns.md`.
   Measurement: `motion` (`transitions`, `keyframes`, `onLoad`, `onScroll`, `entrances`, `viewTransitions`, `scrollDriven`).
8. **Details.** Images in sharp resolution and with fixed dimensions. Icons in the same stroke width and optically centred. Nothing jumps when fonts or data come in. The empty state, the error state and the not-found page are as well crafted as the filled page. No AI look.
   Measurement: `aiLook`, `structure.imagesWithoutSize`, `performance.cls`, and `notFoundPage` at the top of the file (`styled`, `linkHome`).

### Rules for motion

- What moves or changes size does so with `transform`. What fades does so with `opacity`. Colours (`color`, `background-color`, `border-color`) may change softly.
- Properties that move the rest of the page are never animated: `width`, `height`, `top`, `left`, `margin`, `padding` and their relatives.
- No `transition: all`. Name the properties that should change.
- A response to something the user asked for (click, hover, open) takes at most 300 ms. An entrance on a showcase page may take 400 to 800 ms.
- `ease-out` when something comes in or responds. `ease-in-out` when something already on screen moves from one place to another (the marker under a row of tabs). `linear` only on what runs continuously, like a spinning ring. No curves that overshoot and bounce back.
- No surface grows from `scale(0)`. Start at 0.9 to 0.97 together with `opacity: 0`. A line or a progress bar drawn in one direction may start at 0.
- A group that comes in staggered has 30 to 80 ms between the parts. The whole group is in within half a second on a tool page and within 800 ms on a showcase page. The more parts, the shorter the gaps.
- Under "reduce motion", fades and colour changes may stay. What moves must go.
- Nothing runs off screen, and nothing delays the content or LCP.
- At most one staged moment per page. Everything else stays calm around it.

### Default values

Starting points, not rules. See them in the preview (`scripts/preview.mjs`) before they are built.

| What | Value |
|---|---|
| Curve when something comes in or responds | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Curve when something moves from one place to another | `cubic-bezier(0.65, 0, 0.35, 1)` |
| Pressing a button | `scale(0.97)` over 100 to 160 ms |
| Hover | 150 to 200 ms |
| Menu, tooltip, select | 150 to 250 ms |
| Dialog, drawer | 200 to 300 ms |
| Entrance on a showcase page | 400 to 800 ms |
| Stagger between parts of a group | 30 to 80 ms |
| A surface that grows in | from `scale(0.9)` to `scale(0.97)` with `opacity: 0`, never from `scale(0)` |

The code for every pattern is in `templates/patterns.md` and uses the same values.

### Life cards

A life card is one proposal for motion or an effect in a specific place:

| Field | Content |
|---|---|
| `element` | What moves: the selector and a name you can recognise. |
| `moment` | When: on load, on press, when the error comes, when the receipt is shown. |
| `pattern` | The name of a pattern in `templates/patterns.md`: Pressed state, Fade in, Staggered entrance of a group, Page change with crossfade. |
| `values` | Property, from and to, duration in ms and curve. |
| `reduced` | What happens under "reduce motion". |

At most six cards per page, and at most one of them is the staged moment. The page also gets the field `dontAnimate`: what should stand still, and why.

### AI look

The measurement looks for signs that the page is put together from stock parts and could belong to anyone. They stand in `aiLook`.

- **Clear signs** (`aiLook.clear`): text filled with a gradient, a purple gradient towards blue or pink, coloured glow, emoji used as an icon, frosted glass on three or more surfaces (blur behind a mask that fades out an edge does not count), cards inside cards, a box with a thick coloured left border, grey text on a coloured surface, a curve that bounces, the same entrance on four or more elements, and almost all text centred.
- **Suspicions** (`aiLook.suspect`): a single surface of frosted glass, one card in a card, small lines in capitals above the headings, sections numbered 01, 02, 03, a cream background with serif headings, a row of matching cards with an icon in a coloured square, a default font carrying almost all the text, and the same entrance on two or three elements.

A clear sign is a finding. A suspicion alone is not a finding; two or more on the same page are worth a look. The question the agent in layer 3 answers is: **Could a completely different product use the pages unchanged?**

## Sources

The limits in layer 2 are published: WCAG 2.2, Apple Human Interface Guidelines (targets of 44 pt), web.dev/articles/vitals (LCP, CLS and INP) and axe-core. The line length of 45 to 75 characters is classic typographic practice.

The rest are the skill's own choices, and you are welcome to disagree with them: at most seven font sizes, spacing in steps of 4 px, 30 to 80 ms stagger, at most one staged moment and six life cards per page, the default values for motion and the whole list of AI-look signs. The rules on motion and details are written with inspiration from Vercel's Web Interface Guidelines and Emil Kowalski's writing on animation. No text is copied. The patterns in `templates/patterns.md` are written for the skill, and the self-test (`npm test`) tries them in a real browser.
