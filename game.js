// The rules of tenfold: one question a day, six guesses, and feedback in
// how many times too high or too low each guess is.

import { format } from "./numbers.js";

export const MAX_GUESSES = 6;
/** A guess within this fraction of the answer wins (10%). */
export const WIN_ERROR = 0.1;

/** Day 1 of tenfold. Each local calendar day after it is the next puzzle. */
export const LAUNCH = { year: 2026, month: 11, day: 14 };

const DAY_MS = 86_400_000;

/** The puzzle number for a date (1 on launch day), using the local calendar. */
export function dayNumber(date = new Date()) {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const launch = Date.UTC(LAUNCH.year, LAUNCH.month - 1, LAUNCH.day);
  return Math.floor((today - launch) / DAY_MS) + 1;
}

/** The question for a puzzle number. Questions repeat after the list runs out. */
export function questionFor(questions, n) {
  const i = (((n - 1) % questions.length) + questions.length) % questions.length;
  return questions[i];
}

/**
 * How far a guess is from the answer.
 *   ratio     how many times bigger or smaller (always >= 1)
 *   direction "higher" if the answer is bigger, "lower" if smaller
 *   tier      "win" (within 10% of the answer), "close" (within 2x),
 *             "near" (within 10x), "far"
 */
export function judge(guess, answer) {
  const ratio = guess >= answer ? guess / answer : answer / guess;
  const direction = guess < answer ? "higher" : "lower";
  let tier;
  if (Math.abs(guess - answer) <= WIN_ERROR * answer) tier = "win";
  else if (ratio <= 2) tier = "close";
  else if (ratio <= 10) tier = "near";
  else tier = "far";
  return { ratio, direction, tier };
}

const SQUARES = { win: "🟩", close: "🟨", near: "🟧", far: "🟥" };

export function square(tier) {
  return SQUARES[tier];
}

/** Words for one guess's feedback: "Go higher: about 12× too low." */
export function describe({ ratio, direction, tier }) {
  if (tier === "win") {
    if (ratio <= 1.0001) return "Exactly right!";
    const off = direction === "higher" ? (1 - 1 / ratio) * 100 : (ratio - 1) * 100;
    return `Spot on: within ${Math.max(1, Math.round(off))}%.`;
  }
  const how = direction === "higher" ? "too low" : "too high";
  const go = direction === "higher" ? "Go higher" : "Go lower";
  // percentages are of the answer: 250 for 384 is 35% too low, 520 is 35% too high
  const pct = direction === "higher" ? (1 - 1 / ratio) * 100 : (ratio - 1) * 100;
  if (ratio < 1.95) return `${go}: about ${Math.round(pct)}% ${how}.`;
  const times = ratio >= 1000 ? format(ratio) : ratio < 10 ? ratio.toFixed(1).replace(/\.0$/, "") : Math.round(ratio).toString();
  return `${go}: about ${times}× ${how}.`;
}

/** Whether a finished list of guesses won, and in how many. */
export function outcome(guesses, answer) {
  const i = guesses.findIndex((g) => judge(g, answer).tier === "win");
  if (i >= 0) return { done: true, won: true, used: i + 1 };
  return { done: guesses.length >= MAX_GUESSES, won: false, used: guesses.length };
}

/** The spoiler-free text people paste: no numbers, just how close each guess was. */
export function shareText(n, guesses, answer, url) {
  const { won, used } = outcome(guesses, answer);
  const rows = guesses.slice(0, used).map((g) => {
    const j = judge(g, answer);
    return j.tier === "win" ? "🟩" : `${j.direction === "higher" ? "⬆️" : "⬇️"}${square(j.tier)}`;
  });
  const best = Math.min(...guesses.map((g) => judge(g, answer).ratio));
  const closest = won ? "" : `\nclosest: ${best < 10 ? best.toFixed(1).replace(/\.0$/, "") : Math.round(best)}× off`;
  return `tenfold #${n} ${won ? used : "X"}/${MAX_GUESSES}\n${rows.join(" ")}${closest}\n${url}`;
}

/** Update stats after a finished daily puzzle. */
export function record(stats, n, won, used) {
  const s = {
    played: 0, wins: 0, streak: 0, best: 0, last: 0,
    spread: [0, 0, 0, 0, 0, 0], ...stats,
  };
  if (s.last === n) return s; // already counted
  s.played += 1;
  if (won) {
    s.wins += 1;
    s.streak = s.last === n - 1 ? s.streak + 1 : 1;
    s.best = Math.max(s.best, s.streak);
    s.spread = s.spread.map((c, i) => (i === used - 1 ? c + 1 : c));
  } else {
    s.streak = 0;
  }
  s.last = n;
  return s;
}
