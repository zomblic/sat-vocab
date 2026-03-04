export type ContextQuestion = {
  sentence: string;
  choices: string[];
  answer: string;
  explanation?: string;
};

export type WordBankItem = {
  word: string;
  definition: string;
  tone?: "positive" | "negative" | "neutral";
  context: ContextQuestion;
};

export async function loadWordbank(): Promise<WordBankItem[]> {
  const res = await fetch("/wordbank.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load wordbank.json (HTTP ${res.status})`);
  const data = (await res.json()) as WordBankItem[];
  if (!Array.isArray(data) || data.length === 0) throw new Error("wordbank.json is empty or invalid.");
  return data.filter(
    (x) =>
      x?.word &&
      x?.definition &&
      x?.context?.sentence &&
      Array.isArray(x?.context?.choices) &&
      x?.context?.answer
  );
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
