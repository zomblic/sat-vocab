import fs from "node:fs";

const WORDS_RAW = `
PASTE YOUR DSAT LIST HERE (the giant list)
`;

// normalize words: lowercase, strip punctuation, keep letters/hyphen only
function normalizeToken(t) {
  return t
    .trim()
    .toLowerCase()
    .replace(/[“”"()!.,;:]/g, "")
    .replace(/[^a-z-]/g, ""); // keep a-z and hyphen
}

// Parse: your list is mostly one word per line, but also has notes like "correlation (vs. causation!)"
const tokens = WORDS_RAW.split(/\s+/).map(normalizeToken).filter(Boolean);

// Deduplicate + sort
const words = Array.from(new Set(tokens)).sort();

// Load existing wordbank.json (in /public)
const path = "public/wordbank.json";
const existing = JSON.parse(fs.readFileSync(path, "utf8"));

// Track existing words (case-insensitive)
const seen = new Set(existing.map((x) => String(x.word).toLowerCase()));

function sampleDistinct(pool, n) {
  const copy = [...pool];
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeChoices(word) {
  const distractors = sampleDistinct(words.filter((w) => w !== word), 3);
  return shuffle([...distractors, word]);
}

// Add missing words
const additions = [];

for (const w of words) {
  if (seen.has(w)) continue;

  additions.push({
    word: w,
    definition: "TODO: add definition",
    tone: "neutral",
    context: {
      sentence: `Choose the best word to complete the blank: ______.`,
      choices: makeChoices(w),
      answer: w,
      explanation: `The blank should be filled with "${w}". (Update with a real explanation later.)`,
    },
  });

  seen.add(w);
}

// Merge + sort alphabetically
const merged = [...existing, ...additions].sort((a, b) =>
  String(a.word).localeCompare(String(b.word))
);

fs.writeFileSync(path, JSON.stringify(merged, null, 2));
console.log(`✅ Added ${additions.length} DSAT words. Total now: ${merged.length}`);