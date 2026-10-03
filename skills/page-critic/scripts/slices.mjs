#!/usr/bin/env node
// Cuts the tall screenshots in a measurement folder into slices that can be seen in one piece.
// A screenshot of a whole front page is easily 8000 px tall. Shown at once, it is scaled down so far that the text cannot be read,
// and then whoever looks at it judges from the code instead of what is on the screen.
//
//   node scripts/slices.mjs --out <folder>
//
// The slices go in <folder>/slices/<image>-<nr>.png, from top to bottom. The measurement runs this itself at the end,
// and extract.mjs shows the slices under the image they belong to. Old slices in the folder are removed first.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { command } from "./common.mjs";
import { imageSize, readPng, writePng, slicePlan } from "./png.mjs";

const { options } = command();
const stop = (text) => { console.error(text); process.exit(2); };
if (!options.out || options.out === true) stop("Usage: node scripts/slices.mjs --out <folder>");
const OUT = resolve(options.out);
if (!existsSync(OUT)) stop(`The folder does not exist: ${OUT}`);

const folder = join(OUT, "slices");
rmSync(folder, { recursive: true, force: true });
const short = (e) => String(e?.message || e).split("\n")[0];
let tall = 0, errors = 0;
for (const file of readdirSync(OUT).filter((f) => /\.png$/i.test(f)).sort()) {
  try {
    const size = imageSize(join(OUT, file)), plan = size ? slicePlan(size.width, size.height) : [];
    if (!plan.length) continue;
    const png = readPng(readFileSync(join(OUT, file)));
    mkdirSync(folder, { recursive: true });
    plan.forEach(([from, to], i) => writeFileSync(join(folder, `${file.replace(/\.png$/i, "")}-${i + 1}.png`), writePng(png, from, to)));
    tall++;
    console.log(`${file}: ${size.width} × ${size.height} px, cut into ${plan.length} slices of ${plan[0][1] - plan[0][0]} px`);
  } catch (e) {
    errors++;
    console.log(`${file}: could not be cut (${short(e)})`);
  }
}
if (tall) console.log(`The slices are in ${folder}`);
else if (!errors) console.log("No images are too tall to see in one piece.");
// End without process.exit(). Right after heavy work Node can lock up in process.exit(): a background thread waits for
// the main thread to clean up memory, while the main thread waits for the background thread to finish. Then the measurement stood still forever.
process.exitCode = errors ? 1 : 0;
