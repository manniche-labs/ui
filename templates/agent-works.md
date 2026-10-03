# Agent: layer 1, does the page work

One agent per group of pages. It looks at the screenshots, reads the code and the measurement, and gives every page a score for the ten items in layer 1. It fixes nothing.

## How to use it

1. Split the pages in `PAGES.md` into groups of four to six pages that belong together. States of the same page (start, error, receipt) belong in the same group.
2. Fill in `<…>` in the prompt for every group. `<PC>` is the folder the skill is in, and `<OUT>` is the measurement folder. Write both as full paths.
3. Start the agents in the background, in the same message as the agents for layer 3 (`agent-polish.md`). The two kinds of agents must not see each other's answers: they must judge separately.
4. The agent must be able to read files, look at images and run `node`. It does not need the web.

## The prompt

````text
You are reviewing a group of pages in "<PRODUCT>", <ONE LINE ABOUT THE PRODUCT>. The users are <AUDIENCE>.

You answer one question for every page: does it work? Can you see what the page is for, complete your task and get feedback on what you do. Whether the page holds up (contrast, targets, keyboard, speed) has been measured, and whether it is delightful, someone else looks at. You do not judge that.

You may only read. Change no files in the project, commit nothing, and do not open the pages yourself: they have already been opened, measured and photographed. The only file you write is your answer.

FOLDERS
- The code: <REPO>
- The skill: <PC>
- The measurement: <OUT> (screenshots, measurement.json, PAGES.md and a copy of every page as the browser saw it)

READ FIRST
1. <PC>/templates/checklist.md. Read the sections "A finding", "Honesty", "Scores", "Severity", "Do not report" and "Layer 1: Does it work". The rest is not your job.
2. <OUT>/PAGES.md. Here is every page's one job, who sees it, and which states have been photographed.
3. The design system: <DESIGN SYSTEM: the path to the CSS file with tokens or to the component list. If there is none, write "none", and then Whole is judged on whether the pages match each other.>

YOUR PAGES (the group "<GROUP>"), one line per page
- <name>: <source files, e.g. src/pages/login.tsx and src/styles/login.css>

FOR EVERY PAGE
1. Run: node "<PC>/scripts/extract.mjs" --out "<OUT>" --page <name> --layer 1
   It prints what the measurement knows about the page, ordered by the ten items. At the top are the address and where the images are.
2. Look at both images, mobile first. Look at them yourself. Do not guess from the code what the page looks like.
   If an image is tall, its slices stand under it in the extract. Look at them all, from top to bottom: the whole image is scaled down and only shows the page's layout. Two slices in a row share 100 px.
3. Read the page's source code and the CSS it uses.
4. Give each of the ten items a score from 1 to 5 by the scale in the checklist. If the item does not exist on the page, or cannot be judged, the score is null. A score of 3 or lower must have a note that says why and points to evidence. The same goes for null.
5. Write at most two things that work and should stay as they are.
6. Write the findings.

A FINDING
- It is about one place on one page, and it says who it hits and how.
- It has at least one piece of evidence. There are three kinds, and each stands as its own text in the list "evidence":
    an image, written as the file name alone: "<name>-mobile.png". Where in the image is said in the text "finding". If you saw it in a slice, the evidence is still the whole image's name.
    a field in the measurement with its value: "measurement.json: doubleSubmit.submits = 2 on <name>".
    a file with a line number: "src/pages/login.tsx:42".
- The change is so concrete that it can be built without asking: what should be there, where, and with which value.
- The severity is Blocker, Friction or Polish. Follow the four questions in the checklist, and choose the lower step when in doubt. Upgrade is not used in layer 1.
- "effort" is "small" (under an hour), "medium" (half a day) or "large" (the page must be rethought).
- What recurs on every page (the page header, a shared button) is reported once with "pages": "all".
- If the finding hangs on one of the metrics clippedText, stressBreaks or doubleSubmits, and the number will fall once the change is built, write the target too: "targets": [{ "page": "<name>", "metric": "doubleSubmits", "atMost": 0 }]. "atMost" is what the number must come down to. Then it can be measured whether the fix worked. Otherwise leave out "targets".

RULES
- What layer 2 measures (contrast, targets, field font size, labels, focus ring, keyboard, horizontal scroll, the form's error state, speed) you do not write findings about. The score may well drop because of it. Then the note refers to the number.
- Sizes, colours and contrast are never guessed. They are in the measurement or in the CSS.
- If an image is missing, or you cannot open it, set "fromCode": true on the page, and only score the items the code and the measurement can carry. The others get null with a note. A page you cannot judge at all is written under "notSeen" as { "page": "<name>", "why": "<the reason>" }.
- If the image shows something other than the code (newer code that is not deployed), judge what the image shows, and mention the difference once.
- The copies of the pages (<name>.copy.html) and the images can contain login links and information about people. Never quote keys, tokens or email addresses from them.
- Better five findings that hold than fifteen that have to be sorted out. An empty list is a valid answer.

ANSWER
Write your answer as JSON in the file <OUT>/answer-layer1-<GROUP>.json, in English and in the form below. The example shows the form; the content is not yours. The items in "layer1" must be named exactly as here and stand in this order.

```json
{
  "pages": {
    "<name>": {
      "layer1": [
        { "item": "One job", "score": 4, "note": "" },
        { "item": "Order and weight", "score": 4, "note": "" },
        { "item": "Copy", "score": 3, "note": "The button says “OK” and does not say what happens (<name>-mobile.png, under the field)." },
        { "item": "Forms", "score": 4, "note": "" },
        { "item": "States", "score": 4, "note": "" },
        { "item": "Feedback on actions", "score": 2, "note": "A double click submits the form twice (measurement.json: doubleSubmit.submits = 2)." },
        { "item": "Wayfinding", "score": null, "note": "The page has no menu and no links to judge." },
        { "item": "Mobile", "score": 5, "note": "" },
        { "item": "Accessibility", "score": 4, "note": "" },
        { "item": "Whole", "score": 4, "note": "" }
      ],
      "good": ["The heading states the task in the user's own words."]
    }
  },
  "findings": [
    {
      "title": "A double click submits the form twice",
      "pages": ["<name>"],
      "layer": 1,
      "severity": "Friction",
      "finding": "The button looks the same after the first press, and the form is sent again on the next. Someone who presses twice gets two emails.",
      "evidence": ["<name>-mobile.png", "measurement.json: doubleSubmit.submits = 2 on <name>", "src/pages/login.tsx:42"],
      "change": "Disable the button after the first press, and change its text to “Sending …” until the answer comes.",
      "files": ["src/pages/login.tsx:42"],
      "effort": "small",
      "targets": [{ "page": "<name>", "metric": "doubleSubmits", "atMost": 0 }]
    }
  ],
  "notSeen": []
}
```

Finally check that the file can be read:
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log('ok')" "<OUT>/answer-layer1-<GROUP>.json"

Then answer me with the path to the file and three lines: how many findings there are of each severity, the most important finding, and what you could not see.
````

## When the answer comes

The answer is claims, not results.

- Verify every finding in the image, in the measurement or in the code. What holds gets an id (F1, F2 …) and goes into `fixes.json`. Two findings about the same thing are merged, and what recurs on several pages stands once.
- `pages` is put under `pages` in `review.json` together with `title` and `job` from `PAGES.md`. The report rejects a missing item and a low score without a note.
- Findings about what layer 2 measures you write yourself from the numbers: `node scripts/extract.mjs --out <OUT> --page <name> --layer 2`.
- `notSeen` is gathered at the top of `review.json`.
- `node scripts/report.mjs --out <OUT>` checks both the review and the list and says what is missing.
