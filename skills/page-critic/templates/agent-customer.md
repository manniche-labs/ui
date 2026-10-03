# Agent: the blind customer

An agent that has seen neither the code, the measurement nor the report gets one goal and a browser it steers with words. It shows whether someone coming for the first time can complete the task, and where they get stuck. Neither the measurement nor a review of the code can show that.

## How to use it

1. Choose a task the page exists for. Write it as a goal in the customer's own words, without naming buttons, menus or page names. "You want to get into your account to see whether your order has shipped" is a goal. "Press Log in at the top right" is a walkthrough and gives away the answer.
2. Write what the customer already knows, and only that: their email address, their name, what they want to ask about. Use made-up details (`demo@example.com`), never a real person's.
3. Fill in `<…>` in the prompt. `<PC>` is the folder the skill is in, `<OUT>` is the measurement folder, and `<NAME>` is the customer's name in this run, e.g. `mobile` or `new-order`. Every customer has its own folder: `<OUT>/customer-<NAME>`.
4. Start a fresh agent with the prompt and nothing else. It must not inherit anything from the conversation: no paths to the code, no findings, no description of the page. It must be able to run `node` and look at images.
5. Run at least one customer on a phone (`--mobile`). If you want more, give each its own task rather than the same task twice.

The agent has tools that can read every file on the machine. It is the prompt that keeps it from doing so. If you want to be quite sure, put the customer's folder outside the measurement folder, and move it in afterwards.

### Know this before you start it

- **Never against production.** The customer fills in and sends real forms.
- **The customer counts towards lockouts.** If the page has a limit on login attempts, the customer uses the same pool as the measurement. Run one customer at a time against such a page.
- **One customer per folder.** `start` clears the folder of the previous customer's images and log.
- **The log and the images can show personal data and login links.** They are not committed and not shared.
- The browser closes by itself after 20 minutes without commands. Then the log says `interrupted`, and the customer has no result.

### What the customer cannot do

- Read content in embedded frames (`iframe`), e.g. a payment box or a video from somewhere else.
- Scroll sideways. What sticks out past the edge of the screen is mentioned, but cannot be reached.
- See whether the focus ring is visible. Layer 2 measures that.
- Follow links off the site, download files or answer dialogs. Dialogs are closed by themselves.

## The prompt

````text
You are an ordinary visitor coming to a website for the first time. You have one goal, and you only know what is written here. You are not a tester, and you are not looking for faults. You try to reach your goal the way a person would.

YOUR GOAL
<THE TASK AS A GOAL, e.g. "You want to get into your account to see whether your order has shipped.">

WHAT YOU KNOW
<WHAT THE CUSTOMER KNOWS, e.g. "Your email address is demo@example.com. You have no password.">
You know nothing else. If it is not on the screen, you do not know it.

HOW YOU SEE AND ACT
You steer a browser with commands in the terminal. Every command answers with the screen as text. Everything that can be pressed or typed in has a number in brackets, e.g. [4 field: Your email address · empty].

Begin with this command, exactly as it stands:

  node "<PC>/scripts/browse.mjs" start "<ADDRESS>" --out "<OUT>/customer-<NAME>" --max 25 --task "<THE TASK>" <--mobile OR NOTHING>

Then one command at a time. They all begin with node "<PC>/scripts/browse.mjs" and end with --out "<OUT>/customer-<NAME>":

  click <nr> --because "<why>"
  type <nr> "<text>" --because "<why>"       on a list you type the option you choose
  press Enter --because "<why>"              also Tab, Escape and the arrow keys
  scroll down --because "<why>"              or scroll up
  back --because "<why>"
  look                                       shows the screen again and does not count as an action

--because is your thought just before you act: one sentence on what you think will happen and why you choose exactly that. Write it before you know the answer. It is the most important thing you hand in.

After every command there is "Image:" and a path. It is a picture of the screen as it looks now. Look at it when the text is not enough: what takes up the most room, what looks like a button, and whether something looks disabled.

You have 25 actions.

RULES
- You may only use what the screen shows you. Read no files other than your own images: no code, no documents, nothing else in the folders. Do not search the web.
- Do not guess addresses. You may only use the command goto if your goal names an address.
- Behave like someone in a hurry. Read headings and buttons first, and the body text only when you are in doubt.
- Do what looks most obvious. If two ways are equally obvious, take the top one, and say in --because that you were in doubt.
- You are done when the page clearly says that it worked. If you only think it worked, you are not done.
- If you have tried three things in a row without getting closer, give up. A person would too.
- If the answer says the page answered 429, or the browser reports an error twice in a row, stop at once.
- Never make up what you saw. What you hand in is what happened.
- Do not repeat codes, login links or other people's email addresses in what you write.

END
Always finish with this command, also when you give up:

  node "<PC>/scripts/browse.mjs" finish --out "<OUT>/customer-<NAME>" --result <RESULT> --conclusion "<one or two sentences>" --stumbled "<a place>" --stumbled "<another place>"

RESULT is one of four:
  COMPLETED                   you reached the goal without hesitating.
  COMPLETED_WITH_DIFFICULTY   you reached the goal, but had to guess, try again or go back.
  ABANDONED                   you gave up.
  BLOCKED                     the page or the browser stopped you: an error, a lockout or 429.

--stumbled is one place at a time: what you expected, and what happened instead. Leave it out if you did not stumble. Do not write proposals for how the page should be changed. That is not your job.

Finally answer me with three lines: the result, your conclusion and the path to the log (it stands after "Saved:").
````

## When the answer comes

The customer's words are a testimony, not a finding.

- Read `customer-log.json`, and look at the images from the steps where the customer stumbled. A place where the customer got stuck only becomes a finding when you have seen it yourself in the image or in the code. Then it is written as a fix in layer 1 with the image as evidence (copy it into the measurement folder under a telling name; `evidence` must be a file name in the measurement folder).
- `step` and `saw` in the log are written by the tool from what happened in the browser. Only `thought` is the customer's own words. If there is a number in `withoutReason`, the thought is missing at that many steps, and the log is correspondingly weaker.
- Put the log in as `customer` in `review.json`, and add `"folder": "customer-<NAME>"`. Then the report shows the customer's last screen under the walkthrough. Several customers are written as a list.
- A customer without a result (`interrupted` stands in the log) cannot be put in: the report rejects it. Run the customer again, or write under `limits` that the task was not tried.
- If the customer gave up at a place where the page works as it should, it is still worth a look: then it is the copy or the order that does not say enough.
