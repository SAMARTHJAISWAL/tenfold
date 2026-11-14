import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { exact, format, parse } from "../src/numbers.js";
import { dayNumber, describe, judge, outcome, questionFor, record, shareText, MAX_GUESSES } from "../src/game.js";

const questions = JSON.parse(await readFile(new URL("../data/questions.json", import.meta.url), "utf8"));

test("parses numbers the way people type them", () => {
  const cases = {
    "384400": 384400,
    "384,400": 384400,
    "384 400": 384400,
    "3.8e5": 380000,
    "3.8E5": 380000,
    "3.8 × 10^5": 380000,
    "3.8x10^5": 380000,
    "10^120": 1e120,
    "1e120": 1e120,
    "2.5k": 2500,
    "40 million": 40e6,
    "8.1 billion": 8.1e9,
    "1.2bn": 1.2e9,
    "37 trillion": 37e12,
    "4.3 quintillion": 4.3e18,
    "a million": 1e6,
    "one": null,
    "3 lakh": 3e5,
    "2 crore": 2e7,
    "0.49": 0.49,
    ".5": 0.5,
    "googol": 1e100,
    "  12  ": 12,
    "": null,
    "abc": null,
    "-5": null,
    "0": null,
    "1,2": null,
    "5 bananas": null,
  };
  for (const [input, want] of Object.entries(cases)) {
    const got = parse(input);
    if (want === null) assert.equal(got, null, input);
    else assert.ok(Math.abs(got - want) / want < 1e-9, `${input} -> ${got}`);
  }
});

test("formats numbers the way people say them", () => {
  assert.equal(format(88), "88");
  assert.equal(format(0.49), "0.49");
  assert.equal(format(384399), "384,399");
  assert.equal(format(8.1e9), "8.1 billion");
  assert.equal(format(37.2e12), "37.2 trillion");
  assert.equal(format(4.3252e19), "43.3 quintillion");
  assert.equal(format(8.0658e67), "8.07 × 10^67");
  assert.equal(format(1e120), "10^120");
  assert.equal(exact(8848.86), "8,848.86");
  assert.equal(exact(146.6), "146.6");
  assert.equal(exact(37.2e12), "37.2 trillion");
  assert.equal(exact(0.49), "0.49");
  // what format writes, parse reads back
  for (const x of [88, 384399, 8.1e9, 37.2e12, 8.0658e67, 1e120]) {
    const back = parse(format(x));
    assert.ok(Math.abs(back - x) / x < 0.01, `${x} -> ${format(x)} -> ${back}`);
  }
});

test("judges guesses by how many times off they are", () => {
  assert.deepEqual(judge(100, 100), { ratio: 1, direction: "lower", tier: "win" });
  assert.equal(judge(109, 100).tier, "win");
  assert.equal(judge(91, 100).tier, "win");
  assert.equal(judge(90.5, 100).tier, "win"); // 9.5% low still wins
  assert.equal(judge(110, 100).tier, "win");
  assert.equal(judge(89, 100).tier, "close");
  assert.equal(judge(120, 100).tier, "close");
  assert.equal(judge(50, 100).tier, "close");
  assert.equal(judge(30, 100).tier, "near");
  assert.equal(judge(1000, 100).tier, "near");
  assert.equal(judge(1001, 100).tier, "far");
  assert.equal(judge(5, 100).direction, "higher");
  assert.equal(describe(judge(5, 100)), "Go higher: about 20× too low.");
  assert.equal(describe(judge(150, 100)), "Go lower: about 50% too high.");
  assert.equal(describe(judge(250000, 384399)), "Go higher: about 35% too low.");
  assert.equal(describe(judge(95, 100)), "Spot on: within 5%.");
  assert.equal(describe(judge(3e6, 1)), "Go lower: about 3 million× too high.");
  assert.equal(describe(judge(100, 100)), "Exactly right!");
  assert.equal(describe(judge(105, 100)), "Spot on: within 5%.");
});

test("a game ends on a win or after six guesses", () => {
  assert.deepEqual(outcome([10, 50, 99], 100), { done: true, won: true, used: 3 });
  assert.deepEqual(outcome([10, 50], 100), { done: false, won: false, used: 2 });
  assert.deepEqual(outcome([1, 2, 3, 4, 5, 6], 100), { done: true, won: false, used: 6 });
});

test("share text has no numbers from the answer", () => {
  const text = shareText(7, [10, 300, 105], 100, "https://example.com");
  assert.equal(text, "tenfold #7 3/6\n⬆️🟧 ⬇️🟧 🟩\nhttps://example.com");
  const lost = shareText(8, [1, 2, 3, 4, 5, 6], 100, "u");
  assert.equal(lost, `tenfold #8 X/${MAX_GUESSES}\n⬆️🟥 ⬆️🟥 ⬆️🟥 ⬆️🟥 ⬆️🟥 ⬆️🟥\nclosest: 17× off\nu`);
});

test("daily schedule", () => {
  assert.equal(dayNumber(new Date(2026, 10, 14, 0, 1)), 1);
  assert.equal(dayNumber(new Date(2026, 10, 14, 23, 59)), 1);
  assert.equal(dayNumber(new Date(2026, 10, 15, 0, 0)), 2);
  assert.equal(dayNumber(new Date(2027, 0, 1)), 49);
  // across a daylight-saving change the count still moves one per day
  assert.equal(dayNumber(new Date(2027, 2, 15)) - dayNumber(new Date(2027, 2, 14)), 1);
  assert.equal(questionFor(questions, 1).id, "everest");
  assert.equal(questionFor(questions, questions.length + 1).id, "everest");
});

test("streaks and stats", () => {
  let s = record({}, 1, true, 3);
  s = record(s, 2, true, 2);
  assert.equal(s.streak, 2);
  s = record(s, 2, true, 2); // the same day twice counts once
  assert.equal(s.played, 2);
  s = record(s, 4, true, 1); // skipped a day
  assert.equal(s.streak, 1);
  assert.equal(s.best, 2);
  s = record(s, 5, false, 6);
  assert.equal(s.streak, 0);
  assert.deepEqual(s.spread, [1, 1, 1, 0, 0, 0]);
  assert.equal(s.wins, 3);
});

test("every question is well formed", () => {
  const ids = new Set();
  for (const q of questions) {
    assert.ok(/^[a-z0-9-]+$/.test(q.id), q.id);
    assert.ok(!ids.has(q.id), `duplicate ${q.id}`);
    ids.add(q.id);
    assert.ok(q.q.endsWith("?") || q.q.endsWith(")"), `${q.id}: ${q.q}`);
    assert.ok(typeof q.answer === "number" && q.answer > 0, q.id);
    assert.ok(q.unit && q.note && q.evidence, q.id);
    assert.ok(q.source.startsWith("https://"), q.id);
    // the answer must be something the game can read back
    assert.ok(Math.abs(parse(format(q.answer)) - q.answer) / q.answer < 0.01, `${q.id}: ${format(q.answer)}`);
  }
  assert.ok(questions.length >= 60);
});
