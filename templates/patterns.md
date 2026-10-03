# Pattern catalogue

25 motions for the life cards in layer 3. The agent picks from here instead of inventing. The `pattern` field in a life card is the name of a pattern in the catalogue, written as its heading.

If no pattern fits the place, the answer is usually that the place should not be animated. That goes in the page's `dontAnimate`.

## How the catalogue is used

1. **The layer 3 agent** finds the moments where the page responds too little (item 7 in the checklist) and picks the pattern that fits the moment. `values` and `reduced` in the life card are taken from the pattern and adjusted to the element.
2. **Whoever assembles the report** writes the fix and its preview in three variants:
   - **Calm:** the pattern's lowest values, or only its reduced version.
   - **Medium:** the pattern as written.
   - **Clear:** the pattern's highest values, or the pattern together with one more in the same moment.

   The variants are tried with `node scripts/preview.mjs --out <folder> --id <F…>` before they are shown.
3. **Whoever builds the fix** builds the chosen variant with the page's own colours, spacing and class names. The CSS here shows the structure. It is not meant to be copied raw.

Every pattern has the same lines:

- **Where:** the places the pattern belongs.
- **Not:** the places it does harm.
- **Values:** property, from and to, duration and curve. These go in the life card's `values`.
- **Reduced:** what is left when the user has asked for less motion. It goes in the life card's `reduced`.
- **Support:** All, Newer or Not all.

## Browser support

Looked up on 1/10-2026 in `@mdn/browser-compat-data` 8.1.4 and `web-features` 3.40.1. The newest browsers were then Chrome 154, Firefox 157 and Safari 27.

| Level | Means | Use |
|---|---|---|
| **All** | Has worked in Chrome, Firefox and Safari for at least two and a half years (Baseline, widely available). | Freely. |
| **Newer** | Works in the newest versions of all three, but not in older ones (Baseline, newly available). | Only when the page also works without it. Under the pattern it says what happens without. |
| **Not all** | Missing in at least one of the three. | Only as an extra on top of something that works everywhere. |

The levels move. Look the support up again before building a pattern marked Newer or Not all.

## Common ground

All patterns use the same two curves and the same fade:

```css
:root {
  --out: cubic-bezier(0.23, 1, 0.32, 1);    /* something enters or responds */
  --in-out: cubic-bezier(0.65, 0, 0.35, 1); /* something moves from one place to another */
}
@keyframes fade-in { from { opacity: 0; } }
```

- **Individual properties.** `translate`, `scale` and `rotate` are used instead of `transform`. That way a press and a hover can act on the same element without overwriting each other.
- **Reduced is the starting point.** Everything that moves sits inside `@media (prefers-reduced-motion: no-preference)`. What sits outside is only fades and colour changes.
- **Hover belongs to the mouse.** Hover motion sits inside `@media (hover: hover) and (pointer: fine)`, so it does not get stuck on a touch screen.
- **Named properties.** `transition` always names the properties that change. Never `all`.
- **Responses and entrances.** A `transition` is a response and lasts at most 300 ms. An entrance of 400 to 800 ms is written as `@keyframes`.
- **Only the cheap.** `opacity`, `translate`, `scale`, `rotate` and colours. Never `width`, `height`, `top`, `left`, `margin` or `padding`.
- **The page's own colours.** `--btn-pressed`, `--btn-text`, `--surface-hover`, `--shadow-large`, `--track`, `--track-on`, `--knob`, `--skeleton`, `--fill`, `--highlight` and `--edge` are placeholders for the page's own tokens.
- **Own names.** Every pattern has its own class names and its own `@keyframes`, so several patterns can sit on the same page.
- **Only the motion.** The patterns give the motion, not the look. The page itself gives every element that can be pressed its response to mouse and press (a colour, a surface, a line). The rule for press comes after the rule for hover and is just as specific, so the press wins when both apply.

The measurement counts how many elements enter the same way. Two or three is a suspicion, four or more is a clear sign of an AI look. That is why the entrances in group E are for few places.

The catalogue is tested by the self-test (`npm test`): a real browser reads every line of CSS and runs every script, and a page that uses all the patterns at once (`test/pages/patterns.html`) must pass the skill's own measurement.

## Overview

| Pattern | Used for | Page | Support |
|---|---|---|---|
| **A. Response to an action** | | | |
| Pressed state | Everything that can be pressed | both | All |
| Hover on a surface | Cards, rows and buttons that can be pressed | both | All |
| Underline that draws | Links in a menu | both | All |
| Button at work | A button that sends something that takes time | both | All |
| Icon that swaps | Copy to tick, menu to cross | both | All |
| Switch | Settings that take effect at once | both | All |
| **B. Something comes or goes** | | | |
| Fade in | Content that replaces something in the same place | both | All |
| Fade in with a lift | A receipt or an answer that must be seen | both | All |
| Grows from its origin | Menu, popover, select list, tooltip | both | Newer |
| Dialog with backdrop | A question that needs an answer | both | All |
| Drawer | Filters, basket, menu on mobile | both | Newer |
| Toast | Receipt for something that has happened | both | All |
| Fold out | Questions and answers, "show more" | both | All |
| **C. A state changes** | | | |
| Crossfade between two states | Tab, sorting, filter, light and dark | both | Newer |
| Skeleton for content | Content that takes a while to arrive | both | All |
| Progress bar | Steps in a flow, an upload | both | All |
| New row in a list | A row that has just been added | both | All |
| **D. Continuity** | | | |
| Page change with crossfade | Pages that belong together | both | Not all |
| Shared element between two pages | An image on both list and detail page | showcase | Not all |
| Sliding marker | Tabs and segmented choices | both | All |
| Header that gets an edge on scroll | A header that stays put | both | All |
| **E. Entrance on a showcase page** | | | |
| Staggered entrance of a group | Heading, subheading and button at the top | showcase | All |
| Entrance on scroll | Two or three places that must be seen | showcase | All |
| Heading, line by line | The page's one staged moment | showcase | All |
| Image that fades in | Images further down the page | both | All |

## A. Response to an action

What happens while the finger or the mouse is on the element. It must be felt and must never make the user wait.

### Pressed state

The element gives way while it is pressed down.

- **Where:** Buttons, cards and rows that are links, tabs. Everything that can be pressed.
- **Not:** Links in running text (they change colour) and fields.
- **Values:** `scale: 1 → 0.97` and a darker surface, 100 to 160 ms, `--out`. Large surfaces like cards and rows: 0.98 to 0.99.
- **Reduced:** Only the colour change.
- **Support:** All.

```css
.btn { transition: background-color 140ms var(--out); }
.btn:active { background-color: var(--btn-pressed); }
@media (prefers-reduced-motion: no-preference) {
  .btn { transition: background-color 140ms var(--out), scale 140ms var(--out); }
  .btn:active { scale: 0.97; }
}
```

### Hover on a surface

The surface shows that it can be pressed when the mouse is over it.

- **Where:** Cards and rows that are links. Buttons.
- **Not:** Surfaces that cannot be pressed. Hover promises that a press does something.
- **Values:** Colour change of 150 to 200 ms, `--out`. On a showcase page also `translate: 0 → 0 -2px` and a larger shadow that fades in as a layer (`opacity: 0 → 1`). The shadow itself is not animated; that is expensive.
- **Reduced:** The colour change and the shadow.
- **Support:** All.

The lift is at most 2 px. If the surface moves more, it starts to flicker when the pointer rests on its bottom edge.

```css
.card { position: relative; transition: background-color 160ms var(--out); }
.card::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: var(--shadow-large); opacity: 0; pointer-events: none; transition: opacity 160ms var(--out); }
@media (hover: hover) and (pointer: fine) {
  .card:hover { background-color: var(--surface-hover); }
  .card:hover::after { opacity: 1; }
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .card { transition: background-color 160ms var(--out), translate 160ms var(--out); }
  .card:hover { translate: 0 -2px; }
}
```

### Underline that draws

A line under the link draws from the left when the mouse or focus is on it.

- **Where:** Links in a menu and single links on one line.
- **Not:** Links in running text. They break over several lines, and the line does not follow. There the underline changes colour (`text-decoration-color`).
- **Values:** `scale: 0 1 → 1 1` from the left, 200 ms, `--out`. The active link has the line all the time.
- **Reduced:** The line appears in one go.
- **Support:** All.

```css
.nav a { position: relative; text-decoration: none; }
.nav a::after { content: ""; position: absolute; inset: auto 0 -2px; height: 1px; background-color: currentColor; scale: 0 1; transform-origin: left; }
.nav a:focus-visible::after, .nav a[aria-current="page"]::after { scale: 1 1; }
@media (hover: hover) and (pointer: fine) { .nav a:hover::after { scale: 1 1; } }
@media (prefers-reduced-motion: no-preference) { .nav a::after { transition: scale 200ms var(--out); } }
```

### Button at work

A ring spins in the button while what it started is going on.

- **Where:** A button that sends something that takes more than a moment.
- **Not:** Actions that respond at once. A ring that only has time to flash once looks like a fault.
- **Values:** `rotate: 0 → 1turn` over 700 ms, `linear`, forever. The button keeps its width: the ring sits on top of the text.
- **Reduced:** The ring stands still and pulses (`opacity: 1 → 0.4 → 1` over 1200 ms).
- **Support:** All.

The button is blocked at once, so nothing is sent twice: with `disabled`, or with `aria-disabled="true"` and a script that rejects the press, if focus must stay on the button. `aria-busy` is only set when 200 ms have passed without an answer, and stays for at least 400 ms. Also say it in text for screen readers (a field with `role="status"` and e.g. "Sending …").

```css
.btn[aria-busy="true"] { position: relative; color: transparent; cursor: progress; }
.btn[aria-busy="true"]::before { content: ""; position: absolute; inset: 0; margin: auto; width: 1em; height: 1em; border: 2px solid var(--btn-text); border-right-color: transparent; border-radius: 50%; animation: btn-wait 1200ms ease-in-out infinite; }
@media (prefers-reduced-motion: no-preference) {
  .btn[aria-busy="true"]::before { animation: btn-spin 700ms linear infinite; }
}
@keyframes btn-spin { to { rotate: 1turn; } }
@keyframes btn-wait { 50% { opacity: 0.4; } }
```

### Icon that swaps

One icon fades out, and the other fades in in the same place.

- **Where:** Copy to tick, menu to cross, play to pause, show to hide.
- **Not:** Icons that do not mean two different things. An icon that just spins is decoration.
- **Values:** The old icon `opacity: 1 → 0` and `scale: 1 → 0.9`, the new one the other way, 160 ms, `--out`.
- **Reduced:** Only the fade.
- **Support:** All.

The two icons sit in the same cell, so the button does not change size.

```css
.toggle { display: inline-grid; }
.toggle .icon { grid-area: 1 / 1; transition: opacity 160ms var(--out); }
.toggle[aria-pressed="false"] .icon-on, .toggle[aria-pressed="true"] .icon-off { opacity: 0; }
@media (prefers-reduced-motion: no-preference) {
  .toggle .icon { transition: opacity 160ms var(--out), scale 160ms var(--out); }
  .toggle[aria-pressed="false"] .icon-on, .toggle[aria-pressed="true"] .icon-off { scale: 0.9; }
}
```

### Switch

The knob slides over to the other side, and the track changes colour.

- **Where:** Settings that take effect at once.
- **Not:** Choices in a form that are only saved with a button. Use a checkbox there.
- **Values:** The knob `translate: 0 → 100% 0` over 160 ms, `--out`. The track changes colour at the same time. A checkbox responds the same way: the tick fades in from `scale: 0.9` over 120 ms.
- **Reduced:** The knob jumps, and the colour fades.
- **Support:** All.

The field is an `<input type="checkbox" role="switch">` in a `<label class="switch">` with the track right after it. The whole label is the tap target. The track has `flex: none`, so it keeps its width when the text is long and wraps over several lines.

```css
.switch { position: relative; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; }
.switch input { position: absolute; opacity: 0; }
.switch .track { flex: none; width: 44px; height: 24px; border-radius: 12px; background-color: var(--track); transition: background-color 160ms var(--out); }
.switch .track::before { content: ""; display: block; width: 20px; height: 20px; margin: 2px; border-radius: 50%; background-color: var(--knob); }
.switch input:checked + .track { background-color: var(--track-on); }
.switch input:checked + .track::before { translate: 100% 0; }
.switch input:focus-visible + .track { outline: 2px solid currentColor; outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) { .switch .track::before { transition: translate 160ms var(--out); } }
```

## B. Something comes or goes

Something new shows up on the page, or something disappears. The motion shows where it came from, and that it is new.

### Fade in

The new content fades in.

- **Where:** Content that replaces something in the same place: an answer, an error message by a field, a result, the content of a tab.
- **Not:** Content that is there when the page opens. On a tool page nothing fades in from the start.
- **Values:** `opacity: 0 → 1`, 150 to 200 ms, `--out`.
- **Reduced:** The same. A fade moves nothing.
- **Support:** All.

```css
.fades-in { animation: fade-in 180ms var(--out); }
```

### Fade in with a lift

The content fades in and lifts a short way into place.

- **Where:** A message that must be seen: a receipt, an answer that arrived while the user waited.
- **Not:** Several places on the screen at once. Several parts that arrive together are a staggered entrance.
- **Values:** `opacity: 0 → 1` and `translate: 0 6px → 0`, `--out`. 200 ms on a tool page. 400 to 600 ms and 8 to 12 px on a showcase page.
- **Reduced:** Only the fade.
- **Support:** All.

```css
.rises-in { animation: fade-in 200ms var(--out); }
@media (prefers-reduced-motion: no-preference) { .rises-in { animation-name: rise-in; } }
@keyframes rise-in { from { opacity: 0; translate: 0 6px; } }
```

### Grows from its origin

The surface grows slightly and fades in from the corner that faces the button it came from.

- **Where:** Menus, popovers, select lists and tooltips. Everything that opens from a button.
- **Not:** Dialogs. They do not come from a place on the page and grow from the middle.
- **Values:** `opacity: 0 → 1` and `scale: 0.96 → 1` with `transform-origin` in the corner towards the trigger. 180 ms in, 120 ms out, `--out`. A tooltip waits 300 ms before it comes; the next one right after comes without waiting.
- **Reduced:** Only the fade.
- **Support:** Newer. Without `@starting-style` and `transition-behavior` (before August 2024) it opens and closes in one go. `overlay` only exists in Chrome: in Firefox and Safari the surface leaves the top layer as soon as it closes, and can be covered by other things while it fades out.

The surface has the `popover` attribute. The page itself places it by the trigger.

```css
.menu { opacity: 0; transition: opacity 120ms var(--out), display 120ms allow-discrete, overlay 120ms allow-discrete; }
.menu:popover-open { opacity: 1; transition-duration: 180ms; }
@starting-style { .menu:popover-open { opacity: 0; } }
@media (prefers-reduced-motion: no-preference) {
  .menu { scale: 0.96; transform-origin: top left; transition: opacity 120ms var(--out), scale 120ms var(--out), display 120ms allow-discrete, overlay 120ms allow-discrete; }
  .menu:popover-open { scale: 1; }
  @starting-style { .menu:popover-open { scale: 0.96; } }
}
```

### Dialog with backdrop

The dialog fades in from the middle while the page behind is dimmed.

- **Where:** A question that needs an answer before the user can go on. A `<dialog>` opened with `showModal()`.
- **Not:** Messages that need no answer (see Toast), and content that belongs to the page behind (see Drawer).
- **Values:** `opacity: 0 → 1` and `scale: 0.96 → 1` from the middle, 200 ms, `--out`. The backdrop fades in at the same time. The dialog closes in one go: whoever answered wants to move on.
- **Reduced:** Only the fade.
- **Support:** All.

```css
dialog.box[open] { animation: fade-in 200ms var(--out); }
dialog.box[open]::backdrop { animation: fade-in 200ms var(--out); }
@media (prefers-reduced-motion: no-preference) { dialog.box[open] { animation-name: dialog-in; } }
@keyframes dialog-in { from { opacity: 0; scale: 0.96; } }
```

### Drawer

A surface slides in from the edge and out again the same way.

- **Where:** Filters, a basket, the menu on mobile, details about a row. Content that belongs to the page behind.
- **Not:** A question that needs an answer (see Dialog with backdrop).
- **Values:** `translate: 100% 0 → 0 0` from the edge the drawer belongs to. 300 ms in and 200 ms out, `--out`.
- **Reduced:** The drawer appears in one go. The backdrop fades.
- **Support:** Newer. Without `@starting-style` and `transition-behavior` (before August 2024) it opens and closes in one go. `overlay` only exists in Chrome: in Firefox and Safari the backdrop disappears as soon as the drawer closes.

```css
dialog.drawer { position: fixed; inset: 0 0 0 auto; margin: 0; height: 100dvh; max-height: none; }
dialog.drawer[open]::backdrop { animation: fade-in 200ms var(--out); }
@media (prefers-reduced-motion: no-preference) {
  dialog.drawer { translate: 100% 0; transition: translate 200ms var(--out), display 200ms allow-discrete, overlay 200ms allow-discrete; }
  dialog.drawer[open] { translate: 0 0; transition-duration: 300ms; }
  @starting-style { dialog.drawer[open] { translate: 100% 0; } }
}
```

### Toast

A short message comes up from the edge, stays a while and fades away.

- **Where:** A receipt for something that has already happened: saved, copied, sent.
- **Not:** Errors that need the user to do something. They sit by the field or button they are about, and stay.
- **Values:** In with `opacity: 0 → 1` and `translate: 0 16px → 0` over 200 to 250 ms, `--out`. Out with `opacity: 1 → 0` over 150 ms. The message stays for at least 5 seconds and stays while the mouse or focus is on it.
- **Reduced:** Only the fade.
- **Support:** All.

The container has `role="status"` and is on the page from the start, so a screen reader reads the message aloud. The toast does not take focus.

```css
.toast { animation: fade-in 200ms var(--out); transition: opacity 150ms var(--out); }
.toast.leaving { opacity: 0; }
@media (prefers-reduced-motion: no-preference) { .toast { animation-name: toast-in; } }
@keyframes toast-in { from { opacity: 0; translate: 0 16px; } }
```

### Fold out

The content fades in when the section opens, and the arrow turns.

- **Where:** Questions and answers, "show more", advanced settings. A `<details>` element.
- **Not:** Content everyone must see. What is folded away does not get read.
- **Values:** The content `opacity: 0 → 1` over 200 ms. The arrow `rotate: 0 → 90deg` over 200 ms, `--out`. The height jumps.
- **Reduced:** The fade. The arrow jumps.
- **Support:** All.

```css
.fold[open] > .fold-content { animation: fade-in 200ms var(--out); }
.fold[open] > summary .fold-arrow { rotate: 90deg; }
@media (prefers-reduced-motion: no-preference) { .fold > summary .fold-arrow { transition: rotate 200ms var(--out); } }
```

## C. A state changes

The same place on the page shows something other than before. The motion shows that it has happened.

### Crossfade between two states

The old content fades out while the new one fades in.

- **Where:** Part of the page changes content without the page changing: a tab, a sorting, a filter, light and dark.
- **Not:** While the user is typing or dragging. The page cannot be used while the change is going on.
- **Values:** The old `opacity: 1 → 0`, the new `opacity: 0 → 1`, 200 ms.
- **Reduced:** The same. There is only a fade.
- **Support:** Newer (Chrome 111, Safari 18, Firefox 144). Without it the content changes in one go.

```js
const swap = (update) => (document.startViewTransition ? document.startViewTransition(update) : update());
```

```css
::view-transition-old(root), ::view-transition-new(root) { animation-duration: 200ms; }
```

### Skeleton for content

Grey surfaces in the shape of the content stand and pulse faintly until the content arrives.

- **Where:** Content that takes more than about 300 ms to arrive and has a known shape: a list, a card, a table.
- **Not:** Short waits (the skeleton only has time to flash) and a whole page. If the shape is unknown, use a ring or a text.
- **Values:** `opacity: 1 → 0.5 → 1` over 1600 ms, `ease-in-out`, forever. The skeleton has the same size as the content that comes, so nothing moves when it is replaced. The content fades in over 200 ms (see Fade in).
- **Reduced:** The skeleton stands still.
- **Support:** All.

Only show as many rows as there is room for on the screen. The measurement reports an animation that runs off screen.

```css
.skeleton { border-radius: 4px; background-color: var(--skeleton); }
@media (prefers-reduced-motion: no-preference) { .skeleton { animation: skeleton-pulse 1600ms ease-in-out infinite; } }
@keyframes skeleton-pulse { 50% { opacity: 0.5; } }
```

### Progress bar

The bar fills from the left every time a step is taken.

- **Where:** Steps in a form, an upload, a long task where you know how far it has come.
- **Not:** When the share is unknown. A bar that crawls without knowing where to is lying. Use a ring there.
- **Values:** `scale: <share> 1` from the left, 240 ms per step, `--out`. The bar may start at 0, because it fills from an edge.
- **Reduced:** The bar jumps to the new share.
- **Support:** All.

The bar is a `<progress>` or has `role="progressbar"` with `aria-valuenow`. `--share` is a number between 0 and 1.

```css
.progress { overflow: clip; background-color: var(--track); }
.progress .fill { height: 4px; background-color: var(--fill); transform-origin: left; scale: var(--share, 0) 1; }
@media (prefers-reduced-motion: no-preference) { .progress .fill { transition: scale 240ms var(--out); } }
```

### New row in a list

The row fades in with a faint colour that fades away.

- **Where:** A row the user added, or that arrived while the page stood open.
- **Not:** Rows that are there from the start, and every row in a list that loads at once.
- **Values:** `opacity: 0 → 1` over 200 ms, and the background from `--highlight` to its own colour over 1200 ms. The height jumps.
- **Reduced:** The same. There is only a fade and a colour.
- **Support:** All.

```css
.row-new { animation: fade-in 200ms var(--out), row-highlight 1200ms ease-out; }
@keyframes row-highlight { from { background-color: var(--highlight); } }
```

## D. Continuity

Motion that shows that two things belong together: two pages, two tabs, the top and the rest of the page.

### Page change with crossfade

The old page fades over into the new one.

- **Where:** Pages that belong together and look alike: a list and its detail page, the steps of a flow.
- **Not:** When the new page is slow to answer. The old one stands still meanwhile, and the change feels slower than without.
- **Values:** The old page `opacity: 1 → 0`, the new `opacity: 0 → 1`, 200 ms. The duration is set as in Crossfade between two states.
- **Reduced:** The same. There is only a fade.
- **Support:** Not all. Chrome 126 and Safari 18.2. Firefox does not have it; there the page changes as always.

The rule must be on both pages.

```css
@view-transition { navigation: auto; }
```

### Shared element between two pages

An element moves from its place on one page to its place on the other.

- **Where:** An image or a heading that is on both the list and the detail page.
- **Not:** More than one or two elements per change, and elements that change shape entirely. The name must be unique on the page: two elements with the same name break the whole change. In a list, only the card that is pressed gets the name.
- **Values:** The element moves and changes size from the old place to the new, 280 ms, `--in-out`.
- **Reduced:** The element has no name and crossfades with the rest of the page.
- **Support:** Not all between two pages (needs Page change with crossfade). Newer within the same page with `document.startViewTransition`.

```css
@media (prefers-reduced-motion: no-preference) {
  .card-image { view-transition-name: card-image; }
  ::view-transition-group(card-image) { animation-duration: 280ms; animation-timing-function: var(--in-out); }
}
```

### Sliding marker

The line under the selected tab slides over under the new one.

- **Where:** Tabs, a segmented choice, a menu where one item is selected.
- **Not:** Items on several lines, and changes that also change page.
- **Values:** `translate` and `scale` from the old tab's place and width to the new one's, 240 ms, `--in-out`. The marker is on screen all the time and moves from one place to another. Hence that curve.
- **Reduced:** The marker jumps.
- **Support:** All.

A marker with round corners cannot be scaled without the corners being stretched. It has a fixed width and moves with `translate` alone, or it crossfades. Call `move` again when the window changes width and when the font has loaded.

```css
.tabs { position: relative; }
.tabs .marker { position: absolute; left: 0; bottom: 0; width: 1px; height: 2px; background-color: currentColor; transform-origin: left; translate: var(--x, 0) 0; scale: var(--w, 1) 1; }
@media (prefers-reduced-motion: no-preference) {
  .tabs .marker { transition: translate 240ms var(--in-out), scale 240ms var(--in-out); }
}
```

```js
const tabs = document.querySelector(".tabs");
const move = (tab) => {
  tabs.style.setProperty("--x", `${tab.offsetLeft}px`);
  tabs.style.setProperty("--w", tab.offsetWidth);
};
move(tabs.querySelector('[aria-selected="true"]'));
tabs.addEventListener("click", (e) => {
  const tab = e.target.closest('[role="tab"]');
  if (tab) move(tab);
});
```

### Header that gets an edge on scroll

The header gets a line under it when the page has scrolled away from the top.

- **Where:** A header that stays put while the page scrolls.
- **Not:** A header that hides and comes back, or changes height on scroll. That moves everything below it.
- **Values:** `border-color: transparent → --edge` over 200 ms, `--out`. A shadow can do the same, but fades in as a layer (see Hover on a surface).
- **Reduced:** The same. There is only colour.
- **Support:** All.

`.top-sentinel` is an empty 1 px element at the very top of the page. When it has scrolled out of sight, the header gets its edge.

The header lies above what scrolls under it (`z-index`), and the page gives it a background that covers. Set `scroll-padding-top` on `html` to the header's height, so what gets focus, or what a link jumps to, does not end up behind the header.

```css
.top { position: sticky; top: 0; z-index: 1; border-bottom: 1px solid transparent; transition: border-color 200ms var(--out); }
.top.scrolled { border-bottom-color: var(--edge); }
```

```js
const header = document.querySelector(".top");
const sentinel = document.querySelector(".top-sentinel");
new IntersectionObserver(([entry]) => header.classList.toggle("scrolled", !entry.isIntersecting)).observe(sentinel);
```

## E. Entrance on a showcase page

What happens when the page opens, or when something scrolls into view. Belongs only on a showcase page, and only in few places: at most one staged moment per page.

### Staggered entrance of a group

The parts enter one after another with a short gap.

- **Where:** The first thing you see on a showcase page: heading, subheading and button.
- **Not:** On a tool page. More than once per page. More than three parts: four or more with the same entrance is reported by the measurement as AI look. A larger group enters as one surface.
- **Values:** `opacity: 0 → 1` and `translate: 0 12px → 0`, 500 ms per part, 70 ms between parts, `--out`. The whole group is in after 640 ms. The page's largest element comes first and without delay.
- **Reduced:** Everything is there from the start.
- **Support:** All.

```css
@media (prefers-reduced-motion: no-preference) {
  .group > * { animation: group-in 500ms var(--out) both; }
  .group > *:nth-child(2) { animation-delay: 70ms; }
  .group > *:nth-child(3) { animation-delay: 140ms; }
}
@keyframes group-in { from { opacity: 0; translate: 0 12px; } }
```

### Entrance on scroll

An element fades in and lifts into place the first time it scrolls onto the screen.

- **Where:** The two or three places on a showcase page that deserve a moment's attention: a quote, a number with a source, an image.
- **Not:** Every section. When everything comes rolling in, nothing stands out. Not on a tool page, and not on what is on screen when the page opens.
- **Values:** `opacity: 0 → 1` and `translate: 0 16px → 0`, 600 ms, `--out`. Once: the element does not disappear again when the user scrolls back.
- **Reduced:** Everything is there from the start.
- **Support:** All.

The content is never hidden by CSS alone. The script sets `scroll-ready`, so the page looks as it should if the script does not run. Set the class from a script in `<head>`, so the page does not flicker.

Do not use the pattern on a low element at the very bottom of the page. The element is only seen once it has come 15 % up the screen, and the last thing on a page may never get that high. Then it stays invisible.

```css
@media (prefers-reduced-motion: no-preference) {
  .scroll-ready .scroll-in { opacity: 0; }
  .scroll-ready .scroll-in.seen { opacity: 1; animation: scroll-in 600ms var(--out); }
}
@keyframes scroll-in { from { opacity: 0; translate: 0 16px; } }
```

```js
const seen = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add("seen");
    seen.unobserve(entry.target);
  }
}, { rootMargin: "0px 0px -15% 0px" });
document.querySelectorAll(".scroll-in").forEach((el) => seen.observe(el));
document.documentElement.classList.add("scroll-ready");
```

### Heading, line by line

The heading's lines slide up behind an edge, one by one.

- **Where:** The one big heading on a showcase page. It is the page's staged moment.
- **Not:** More than one place on the page. Never on a tool page. Not letter by letter, and not on body text.
- **Values:** Each line `translate: 0 100% → 0` behind a mask, 600 ms, 80 ms between lines, `--out`. At most three lines, so everything is in after 760 ms.
- **Reduced:** The heading is there from the start.
- **Support:** All.

The lines are split by hand: each line is a `<span class="line">` with a `<span>` inside. The mask has a little room at the bottom, so g, j and y are not cut. The heading is often the page's largest element, so measure LCP before and after.

```css
@media (prefers-reduced-motion: no-preference) {
  .line { display: block; overflow: clip; padding-bottom: 0.12em; margin-bottom: -0.12em; }
  .line > span { display: block; animation: line-in 600ms var(--out) both; }
  .line:nth-child(2) > span { animation-delay: 80ms; }
  .line:nth-child(3) > span { animation-delay: 160ms; }
}
@keyframes line-in { from { translate: 0 100%; } }
```

### Image that fades in

The image fades in when it has loaded.

- **Where:** Images further down the page that only load when the user gets close to them (`loading="lazy"`).
- **Not:** The page's largest image at the top. It must be seen as early as possible, and a fade makes LCP worse. Not icons and logos.
- **Values:** `opacity: 0 → 1` over 300 ms, `--out`, when the image has loaded. The image has `width` and `height`, so the space is there in advance.
- **Reduced:** The same. There is only a fade.
- **Support:** All.

The script only touches images that have not loaded yet, and also shows the image if loading fails.

```css
img[loading="lazy"] { transition: opacity 300ms var(--out); }
img.waiting { opacity: 0; }
```

```js
for (const image of document.querySelectorAll('img[loading="lazy"]')) {
  if (image.complete) continue;
  image.classList.add("waiting");
  const show = () => image.classList.remove("waiting");
  image.addEventListener("load", show, { once: true });
  image.addEventListener("error", show, { once: true });
}
```

## Not in the catalogue

Left out on purpose. If an agent suggests any of it, there must be a reason that is about that very page.

| Left out | Why |
|---|---|
| Numbers that count up | The number is wrong while it counts, and the reader has to wait for it. |
| Parallax and backgrounds that move on scroll | Moves something the user did not ask for, and makes some people seasick. |
| Light or glow that follows the pointer | Decoration with no message. Does not exist on a touch screen. |
| Magnetic buttons | The button moves away from where the user aimed. |
| Running bands of logos or text | Cannot be read at your own pace and cannot be stopped. |
| Shapes and gradients floating in the background | Run all the time, pull the eye away from the content and use power. |
| Text typed letter by letter | Delays what must be read. |
| Shake on error | An error must be read, not felt. The error message fades in by the field. |
| Springs and curves that overshoot | Feel playful at the wrong moment. The measurement reports them. |
| A gradient sweeping across a skeleton | Looks like every other page. A calm pulse says the same. |
| Animated height (`height`, `grid-template-rows`, `interpolate-size`) | Everything below moves, and layout is recalculated in every frame. The measurement reports it. Let the height jump, and fade the content in. |
| Scroll-driven animations in CSS (`animation-timeline`) | Firefox does not have them yet. Entrance on scroll does the same everywhere. |
| Cards that tilt in 3D after the pointer | Decoration with no message. Makes the text on the card harder to read. |
| Confetti | Celebrates something the user rarely thinks is a party. |
