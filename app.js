// The tenfold page. Rules live in game.js, number reading in numbers.js.
import { exact, format, parse } from "./numbers.js";
import { dayNumber, describe, judge, MAX_GUESSES, outcome, questionFor, record, shareText, square } from "./game.js";

const $ = (id) => document.getElementById(id);
const STORE = "tenfold:v1";

const questions = await (await fetch("questions.json")).json();

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE)) || { games: {}, stats: {} };
  } catch {
    return { games: {}, stats: {} };
  }
}

function save(state) {
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
  } catch {
    // private mode: the game still works, it just won't remember
  }
}

const today = dayNumber();
const asked = Number(new URLSearchParams(location.search).get("day"));
const n = Number.isInteger(asked) && asked >= 1 && asked <= today ? asked : today;
const practice = n !== today;
const q = questionFor(questions, n);
let state = load();
let guesses = state.games[n] || [];

function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 1800);
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function drawLine(done) {
  const svg = $("line");
  const points = [...guesses];
  if (done) points.push(q.answer);
  if (!points.length) {
    svg.innerHTML = "";
    return;
  }
  const logs = points.map(Math.log10);
  let lo = Math.floor(Math.min(...logs)) - 0.5;
  let hi = Math.ceil(Math.max(...logs)) + 0.5;
  if (hi - lo < 3) {
    const mid = (hi + lo) / 2;
    lo = mid - 1.5;
    hi = mid + 1.5;
  }
  const x = (v) => 20 + ((Math.log10(v) - lo) / (hi - lo)) * 560;
  const parts = [`<line class="axis" x1="20" y1="34" x2="580" y2="34"/>`];
  const step = Math.max(1, Math.ceil((hi - lo) / 8));
  for (let e = Math.ceil(lo); e <= hi; e += step) {
    const px = x(10 ** e);
    parts.push(`<line x1="${px}" y1="30" x2="${px}" y2="38" stroke="currentColor" opacity="0.25"/>`);
    parts.push(`<text class="tick" x="${px}" y="56">${e >= 3 ? format(10 ** e).replace(" ", " ") : 10 ** e}</text>`);
  }
  const colors = { win: "var(--win)", close: "var(--close)", near: "var(--near)", far: "var(--far)" };
  guesses.forEach((g, i) => {
    const j = judge(g, q.answer);
    parts.push(`<circle cx="${x(g)}" cy="34" r="8" fill="${colors[j.tier]}"><title>${format(g)}</title></circle>`);
    parts.push(`<text x="${x(g)}" y="38" text-anchor="middle" font-size="10" font-weight="700" fill="white">${i + 1}</text>`);
  });
  if (done) {
    const ax = x(q.answer);
    parts.push(`<line class="answer-mark" x1="${ax}" y1="14" x2="${ax}" y2="44"/>`);
    parts.push(`<text class="answer-label" x="${ax}" y="10">answer</text>`);
  }
  svg.innerHTML = parts.join("");
}

function draw() {
  const { done, won, used } = outcome(guesses, q.answer);
  $("day").textContent = practice ? `Practice · day ${n}` : `Day ${n}`;
  $("question").textContent = q.q;
  $("unit").textContent = q.unit;
  const list = $("guesses");
  list.innerHTML = "";
  for (const g of guesses) {
    const j = judge(g, q.answer);
    const li = document.createElement("li");
    const arrow = j.tier === "win" ? "" : j.direction === "higher" ? "⬆️" : "⬇️";
    li.innerHTML = `<span class="badge">${square(j.tier)}</span><span class="value"></span><span class="hint"></span>`;
    li.querySelector(".value").textContent = `${format(g)} ${q.unit} ${arrow}`;
    li.querySelector(".hint").textContent = describe(j);
    list.appendChild(li);
  }
  drawLine(done);
  const remaining = MAX_GUESSES - guesses.length;
  $("left").textContent = done ? "" : `${remaining} guess${remaining === 1 ? "" : "es"} left`;
  $("guess").disabled = done;
  $("guess-btn").disabled = done;
  $("words").hidden = done;
  $("reading").hidden = done;
  $("result").hidden = !done;
  if (done) {
    $("verdict").textContent = won
      ? ["Bullseye!", "Brilliant!", "Great estimate!", "Nicely done!", "Got there!", "Phew!"][used - 1]
      : "Not this time.";
    $("answer").textContent = `${exact(q.answer)} ${q.unit}`;
    $("note").textContent = q.note;
    $("source").textContent = decodeURIComponent(q.source.replace("https://en.wikipedia.org/wiki/", "Wikipedia: ").replaceAll("_", " "));
    $("source").href = q.source;
    countdown();
  }
}

function countdown() {
  if (practice) {
    $("next").innerHTML = `<a href="./">Play today's question</a>`;
    return;
  }
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((midnight - now) / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  $("next").textContent = `Next question in ${hh}:${mm}:${ss}`;
}
setInterval(() => {
  if (!$("result").hidden) countdown();
}, 1000);

// ---------------------------------------------------------------------------
// Playing
// ---------------------------------------------------------------------------

function reading() {
  const text = $("guess").value;
  const r = $("reading");
  if (!text.trim()) {
    r.textContent = "Type a number: 3500, 2.5 million, 4e9…";
    r.className = "reading";
    return null;
  }
  const v = parse(text);
  if (v === null) {
    r.textContent = "That doesn't look like a number. Try 3500, 2.5 million or 4e9.";
    r.className = "reading bad";
  } else {
    r.textContent = `= ${format(v)} ${q.unit}`;
    r.className = "reading ok";
  }
  return v;
}

$("guess").addEventListener("input", reading);

$("guess-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = reading();
  if (v === null) {
    toast("Enter a number first");
    return;
  }
  if (guesses.some((g) => Math.abs(g - v) / v < 1e-9)) {
    toast("You already guessed that");
    return;
  }
  guesses = [...guesses, v];
  state.games[n] = guesses;
  const result = outcome(guesses, q.answer);
  if (result.done && !practice) state.stats = record(state.stats, n, result.won, result.used);
  save(state);
  $("guess").value = "";
  reading();
  draw();
  if (result.done) {
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
    if (!practice) setTimeout(showStats, 1400);
  } else {
    $("guess").focus();
  }
});

for (const b of $("words").querySelectorAll("button")) {
  b.addEventListener("click", () => {
    const input = $("guess");
    const base = input.value.trim().replace(/\s*(thousand|million|billion|trillion)$/i, "");
    input.value = `${base || "1"} ${b.dataset.w}`;
    input.focus();
    reading();
  });
}

$("share").addEventListener("click", async () => {
  const url = `${location.origin}${location.pathname}`;
  const text = shareText(n, guesses, q.answer, url);
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ text });
      return;
    } catch {
      // cancelled: fall back to copying
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied. Paste it anywhere!");
  } catch {
    toast("Couldn't copy");
  }
});

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

function showStats() {
  const s = { played: 0, wins: 0, streak: 0, best: 0, spread: [0, 0, 0, 0, 0, 0], ...state.stats };
  const pct = s.played ? Math.round((100 * s.wins) / s.played) : 0;
  $("stat-numbers").innerHTML = [
    [s.played, "Played"],
    [pct, "Win %"],
    [s.streak, "Streak"],
    [s.best, "Best"],
  ]
    .map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`)
    .join("");
  const max = Math.max(1, ...s.spread);
  const mine = outcome(guesses, q.answer);
  $("spread").innerHTML = s.spread
    .map((c, i) => {
      const today = !practice && mine.won && mine.used === i + 1 ? " today" : "";
      return `<div>${i + 1}<i class="${today}" style="width:${8 + (c / max) * 82}%">${c}</i></div>`;
    })
    .join("");
  $("stats").showModal();
}

function showArchive() {
  const items = [];
  for (let d = today; d >= 1; d--) {
    const g = state.games[d];
    const qd = questionFor(questions, d);
    const r = g ? outcome(g, qd.answer) : null;
    const cls = r?.done ? (r.won ? "won" : "lost") : "";
    const mark = r?.done ? (r.won ? "🟩" : "🟥") : r ? "…" : "·";
    items.push(`<li><a class="${cls}" href="?day=${d}"><small>${mark}</small>${d}</a></li>`);
  }
  $("days").innerHTML = items.join("");
  $("archive").showModal();
}

$("help-btn").addEventListener("click", () => $("help").showModal());
$("stats-btn").addEventListener("click", showStats);
$("archive-btn").addEventListener("click", showArchive);
for (const d of document.querySelectorAll("dialog")) {
  d.querySelector(".close").addEventListener("click", () => d.close());
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close();
  });
}

draw();
if (!state.seenHelp) {
  state.seenHelp = true;
  save(state);
  $("help").showModal();
} else if (!outcome(guesses, q.answer).done) {
  $("guess").focus();
}
