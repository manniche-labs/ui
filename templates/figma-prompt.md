# Template: a prompt Figma can build a page from

Fill in `<…>` from the report. The prompt must stand on its own, because whoever reads it has not seen the app. Write it in English, unless the copy in the design must be in another language: then the content stands word for word in that language.

```
Design the "<PAGE NAME>" page for <PRODUCT>, <ONE LINE ABOUT THE PRODUCT>.

WHO AND WHY
- User: <who, and in what situation they come to the page>
- The page has one job: <the page's one job>
- Primary action: <the main button's text, word for word>. Secondary: <if any>

CONTENT (use this text exactly, do not invent copy or numbers)
<heading, body text, labels, help texts, buttons, error messages: word for word>

STATES TO DESIGN (one frame each)
- <empty> · <filled in> · <error at a field> · <receipt> · <no access>
- Desktop 1440 and mobile 390 for each.

DESIGN SYSTEM (follow it, do not introduce new styles)
- Colours: <tokens with hex>
- Type: <typefaces, sizes, weights>
- Spacing and radius: <scale>
- Existing components to reuse: <button, field, card, status pill … with names from the design file>

PROBLEMS TO SOLVE (from the review)
1. <finding → what the new page should do instead>
2. <…>

KEEP (this already works)
- <what the report found good>

CONSTRAINTS
- <technology: e.g. "server-rendered HTML, works without JavaScript, no client framework">
- Accessible: contrast at least 4.5:1, visible focus, labels on every field, touch targets at least 44 px.
- No generic AI look: no purple gradients, no decorative icon rows, no filler text.
```
