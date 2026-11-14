// Fetch every question's source and confirm the evidence figure appears on
// the page. Run with: node scripts/check-sources.mjs  (needs network)
import { readFile } from "node:fs/promises";

const questions = JSON.parse(await readFile(new URL("../data/questions.json", import.meta.url), "utf8"));

// Wikipedia writes numbers with non-breaking or thin spaces and HTML tags
// (10<sup>120</sup>), so compare plain text with all spacing removed.
const plain = (html) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#160;|&#8201;|&thinsp;/g, " ")
    .replace(/[   \s]+/g, "")
    .toLowerCase();

const pages = new Map();
async function page(url) {
  if (!pages.has(url)) {
    pages.set(
      url,
      fetch(url, { headers: { "User-Agent": "tenfold-source-check/0.1 (https://github.com/SAMARTHJAISWAL/tenfold)" } }).then(async (r) => ({
        status: r.status,
        text: r.ok ? plain(await r.text()) : "",
      })),
    );
  }
  return pages.get(url);
}

let failures = 0;
for (const q of questions) {
  const { status, text } = await page(q.source);
  const ok = status === 200 && text.includes(plain(q.evidence));
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${q.id.padEnd(22)} ${status} ${ok ? "" : `missing "${q.evidence}"`}`);
}
console.log(`\n${questions.length - failures}/${questions.length} sources confirmed`);
process.exit(failures ? 1 : 0);
