import type { WordBankItem } from "./wordbank";

export type WordProgress = {
  attempts: number;
  correct: number;
  lastSeenAt?: number;
};

export type ProgressState = {
  version: 1;
  byWord: Record<string, WordProgress>;
};

const LS_PROGRESS_KEY = "satVocab:progress:v1";

export function emptyProgress(): ProgressState {
  return { version: 1, byWord: {} };
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(LS_PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as ProgressState) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(state: ProgressState) {
  localStorage.setItem(LS_PROGRESS_KEY, JSON.stringify(state));
}

export function clearProgress() {
  localStorage.removeItem(LS_PROGRESS_KEY);
}

export function recordAttempt(word: string, wasCorrect: boolean) {
  const state = loadProgress();
  const existing = state.byWord[word] ?? { attempts: 0, correct: 0 };

  state.byWord[word] = {
    attempts: existing.attempts + 1,
    correct: existing.correct + (wasCorrect ? 1 : 0),
    lastSeenAt: Date.now(),
  };

  saveProgress(state);
  return state;
}

export function masteryFor(word: string, state = loadProgress()): number {
  const p = state.byWord[word];
  if (!p || p.attempts === 0) return 0;
  return p.correct / p.attempts;
}

export function overallStats(items: WordBankItem[], state = loadProgress()) {
  const words = items.map((x) => x.word);
  let attempted = 0;
  let totalAttempts = 0;
  let totalCorrect = 0;

  for (const w of words) {
    const p = state.byWord[w];
    if (!p) continue;
    if (p.attempts > 0) attempted += 1;
    totalAttempts += p.attempts;
    totalCorrect += p.correct;
  }

  const accuracy = totalAttempts ? totalCorrect / totalAttempts : 0;

  let mastered = 0;
  for (const w of words) {
    const p = state.byWord[w];
    if (!p) continue;
    if (p.attempts >= 3 && p.correct / p.attempts >= 0.8) mastered += 1;
  }

  return { totalWords: words.length, attempted, mastered, totalAttempts, totalCorrect, accuracy };
}

/* Export/Import + magic link */
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin);
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(b64url: string): string {
  const padded = b64url.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((b64url.length + 3) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function exportProgressCode(state = loadProgress()): string {
  return toBase64Url(JSON.stringify(state));
}

export function importProgressCode(code: string): ProgressState {
  const json = fromBase64Url(code.trim());
  const parsed = JSON.parse(json) as ProgressState;
  if (!parsed || parsed.version !== 1 || typeof parsed.byWord !== "object") throw new Error("Invalid progress code.");
  saveProgress(parsed);
  return parsed;
}

export function makeMagicLink(code: string): string {
  const url = new URL(window.location.href);
  url.hash = `p=${code}`;
  return url.toString();
}

export function tryImportFromHash(): boolean {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#p=")) return false;
  const code = hash.slice(3);
  importProgressCode(code);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return true;
}
