export type Tone = "positive" | "negative" | "neutral";

export type WordbankOverride = {
  word: string;
  definition?: string;
  tone?: Tone;
  sentence?: string;
  explanation?: string;
};

const KEY = "sat_wordbank_overrides_v1";

export function loadOverrides(): Record<string, WordbankOverride> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, WordbankOverride>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveOverrides(map: Record<string, WordbankOverride>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function setOverride(ovr: WordbankOverride) {
  const map = loadOverrides();
  const k = ovr.word.toLowerCase();
  map[k] = { ...map[k], ...ovr, word: ovr.word };
  saveOverrides(map);
  return map;
}

export function clearOverride(word: string) {
  const map = loadOverrides();
  delete map[word.toLowerCase()];
  saveOverrides(map);
  return map;
}

export function clearAllOverrides() {
  localStorage.removeItem(KEY);
}

export function downloadJson(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function readJsonFile(file: File): Promise<any> {
  const text = await file.text();
  return JSON.parse(text);
}
