// Reading and writing big numbers the way people type and say them.

const WORDS = new Map([
  ["k", 1e3], ["thousand", 1e3], ["thousands", 1e3],
  ["m", 1e6], ["mn", 1e6], ["mil", 1e6], ["million", 1e6], ["millions", 1e6],
  ["b", 1e9], ["bn", 1e9], ["billion", 1e9], ["billions", 1e9],
  ["t", 1e12], ["tn", 1e12], ["trillion", 1e12], ["trillions", 1e12],
  ["quadrillion", 1e15], ["quintillion", 1e18], ["sextillion", 1e21],
  ["septillion", 1e24], ["octillion", 1e27], ["nonillion", 1e30], ["decillion", 1e33],
  ["lakh", 1e5], ["lakhs", 1e5], ["crore", 1e7], ["crores", 1e7],
  ["hundred", 1e2],
  ["googol", 1e100],
]);

/**
 * Parse what a person typed as a positive number, or return null.
 *
 *   "384400", "384,400", "384 400", "3.8e5", "3.8 × 10^5", "10^120",
 *   "2.5k", "40 million", "8.1 billion", "1.2bn", "a million", "googol"
 */
export function parse(input) {
  let s = String(input).trim().toLowerCase();
  if (!s) return null;
  s = s
    .replace(/[   _]/g, " ")
    .replace(/\s*[×✕x*]\s*10\s*(\^|\*\*)\s*/g, "e") // 3.8 × 10^5  ->  3.8e5
    .replace(/^10\s*(\^|\*\*)\s*/, "1e") //           10^120     ->  1e120
    .replace(/^an?\s+/, "1 ") //                      "a million"
    .replace(/\s+/g, " ");

  // digits (with thousands separators), then multiplier words
  const m = /^(\d{1,3}(?:[, ]\d{3})+(?:\.\d+)?|\d*\.?\d+)(?:e([+-]?\d+))?\s*([a-z ]*)$/.exec(s);
  if (!m) return WORDS.has(s) ? WORDS.get(s) : null;
  let value = Number(m[1].replace(/[, ]/g, ""));
  if (m[2] !== undefined) value *= 10 ** Number(m[2]);
  const words = m[3].trim();
  if (words) {
    for (const w of words.split(" ")) {
      if (!WORDS.has(w)) return null;
      value *= WORDS.get(w);
    }
  }
  return Number.isFinite(value) && value > 0 ? value : null;
}

const NAMES = [
  [1e18, "quintillion"],
  [1e15, "quadrillion"],
  [1e12, "trillion"],
  [1e9, "billion"],
  [1e6, "million"],
];

function trim(x, digits) {
  // up to `digits` significant digits, no trailing zeros
  return Number(x.toPrecision(digits)).toString();
}

/** A number as people say it: "384,400", "8.1 billion", "4.3 × 10^19". */
export function format(x) {
  if (!Number.isFinite(x)) return String(x);
  if (x >= 1e21) {
    const e = Math.floor(Math.log10(x));
    const m = x / 10 ** e;
    const mant = trim(m, 3);
    return mant === "1" ? `10^${e}` : `${mant} × 10^${e}`;
  }
  for (const [size, name] of NAMES) {
    if (x >= size) return `${trim(x / size, 3)} ${name}`;
  }
  if (x >= 1000) return Math.round(x).toLocaleString("en-US");
  if (x >= 1) return trim(x, 4);
  return trim(x, 3);
}

/** An answer shown in full: "8,848.86", "384,399", but "37.2 trillion" for big ones. */
export function exact(x) {
  if (x >= 1e6 || x < 1) return format(x);
  return x.toLocaleString("en-US", { maximumFractionDigits: 3 });
}
