// Assemble the static site in _site/: the page, the game modules and the
// questions. No bundler: the browser loads the ES modules directly.
import { cp, mkdir, rm } from "node:fs/promises";

const out = new URL("../_site/", import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const f of ["index.html", "style.css", "app.js", "vercel.json", "og.png"]) {
  await cp(new URL(`../web/${f}`, import.meta.url), new URL(f, out)).catch((e) => {
    if (f !== "og.png") throw e;
  });
}
for (const f of ["numbers.js", "game.js"]) await cp(new URL(`../src/${f}`, import.meta.url), new URL(f, out));
await cp(new URL("../data/questions.json", import.meta.url), new URL("questions.json", out));
console.log("built _site/");
