import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Shell from "../ui/Shell";
import { loadUser } from "../lib/userStore";
import { loadWordbank, type WordBankItem } from "../lib/wordbank";
import { clearAllOverrides, clearOverride, downloadJson, loadOverrides, readJsonFile, saveOverrides, setOverride } from "../lib/wordbankOverrides";
import { sfxClick } from "../lib/sfx";

type Tone = "positive" | "negative" | "neutral";

function norm(s: string) {
  return s.trim().toLowerCase();
}

export default function WordbankLabPage() {
  const nav = useNavigate();
  const user = loadUser();
  if (!user) return <Navigate to="/" replace />;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WordBankItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const selected = useMemo(() => items.find((x) => x.word === selectedWord) ?? null, [items, selectedWord]);

  const [definition, setDefinition] = useState("");
  const [tone, setTone] = useState<Tone>("neutral");
  const [sentence, setSentence] = useState("");
  const [explanation, setExplanation] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await loadWordbank(); // already merged with overrides
        if (!cancelled) {
          setItems(data);
          setSelectedWord(data[0]?.word ?? null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error loading word bank.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const overrides = loadOverrides();
    const o = overrides[norm(selected.word)];
    setDefinition(o?.definition ?? selected.definition ?? "");
    setTone((o?.tone ?? (selected.tone ?? "neutral")) as Tone);
    setSentence(o?.sentence ?? selected.context?.sentence ?? "");
    setExplanation(o?.explanation ?? selected.context?.explanation ?? "");
  }, [selectedWord]);

  const filtered = useMemo(() => {
    const qq = norm(q);
    return items.filter((x) => {
      if (onlyMissing) {
        const d = (x.definition ?? "").toLowerCase();
        if (!d.includes("todo")) return false;
      }
      if (!qq) return true;
      const hay = `${x.word} ${x.definition}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [items, q, onlyMissing]);

  const save = () => {
    if (!selected) return;
    sfxClick();
    setOverride({
      word: selected.word,
      definition: definition.trim() || undefined,
      tone: tone || undefined,
      sentence: sentence.trim() || undefined,
      explanation: explanation.trim() || undefined,
    });
    const overrides = loadOverrides();
    setItems((prev) =>
      prev.map((x) => {
        if (x.word !== selected.word) return x;
        const o = overrides[norm(x.word)];
        if (!o) return x;
        return {
          ...x,
          definition: o.definition ?? x.definition,
          tone: o.tone ?? x.tone,
          context: {
            ...x.context,
            sentence: o.sentence ?? x.context.sentence,
            explanation: o.explanation ?? x.context.explanation,
          },
        };
      })
    );
  };

  const clear = () => {
    if (!selected) return;
    sfxClick();
    clearOverride(selected.word);
    setSelectedWord(null);
    setTimeout(() => setSelectedWord(selected.word), 0);
  };

  const exportOverrides = () => {
    sfxClick();
    downloadJson("sat-wordbank-overrides.json", loadOverrides());
  };

  const exportMerged = () => {
    sfxClick();
    downloadJson("sat-wordbank-merged.json", items);
  };

  const importOverrides = async (file: File) => {
    try {
      const data = await readJsonFile(file);
      if (!data || typeof data !== "object") throw new Error("Invalid JSON");
      saveOverrides(data);
      const merged = await loadWordbank();
      setItems(merged);
      setSelectedWord(merged[0]?.word ?? null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not import JSON.");
    }
  };

  const wipeAll = async () => {
    if (!confirm("Clear ALL overrides? This cannot be undone.")) return;
    sfxClick();
    clearAllOverrides();
    const merged = await loadWordbank();
    setItems(merged);
    setSelectedWord(merged[0]?.word ?? null);
  };

  if (loading) {
    return (
      <Shell>
        <h1 className="title">Wordbank Workshop</h1>
        <p className="subtitle">Loading…</p>
        <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>
          Back to menu
        </button>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <h1 className="title">Wordbank Workshop</h1>
        <p className="subtitle">Couldn’t load <b>public/wordbank.json</b>.</p>
        <p className="tiny" style={{ whiteSpace: "pre-wrap" }}>{error}</p>
        <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>
          Back to menu
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <h1 className="title" style={{ marginBottom: 0 }}>Wordbank Workshop</h1>
        <p className="tiny" style={{ margin: 0, opacity: 0.9 }}>
          Edit definitions, tone, and your custom context.
        </p>
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <div className="dialog">
          <div className="row" style={{ marginTop: 0 }}>
            <label className="label">
              Search
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="type a word…" />
            </label>

            <button
              className="button ghost"
              onClick={() => { sfxClick(); setOnlyMissing((v) => !v); }}
              style={{ textAlign: "left" }}
            >
              FILTER: {onlyMissing ? "MISSING DEFINITIONS" : "ALL WORDS"}
            </button>

            <div className="dialog" style={{ padding: 10, maxHeight: 420, overflow: "auto" }}>
              {filtered.map((x) => (
                <button
                  key={x.word}
                  className={`button ghost ${selectedWord === x.word ? "selected" : ""}`}
                  onClick={() => { sfxClick(); setSelectedWord(x.word); }}
                  style={{ marginBottom: 10 }}
                >
                  <b>{x.word}</b>
                  <span style={{ opacity: 0.85 }}>  •  {x.definition}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="tiny">No matches.</p>}
            </div>

            <div className="row">
              <button className="button" onClick={exportOverrides}>Export overrides</button>
              <button className="button ghost" onClick={exportMerged}>Export merged wordbank</button>

              <label className="button ghost" style={{ cursor: "pointer" }}>
                Import overrides JSON
                <input
                  type="file"
                  accept="application/json"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importOverrides(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>

              <button className="button ghost" onClick={wipeAll}>Clear ALL overrides</button>
              <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>Back to menu</button>
            </div>
          </div>
        </div>

        <div className="dialog">
          {!selected ? (
            <p className="tiny">Select a word to edit.</p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span className="badge">{selected.word}</span>
                <span className="badge">Editor</span>
              </div>

              <label className="label">
                Definition
                <input className="input" value={definition} onChange={(e) => setDefinition(e.target.value)} placeholder="Write a SAT-friendly definition…" />
              </label>

              <label className="label">
                Tone
                <select className="input" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                  <option value="positive">positive</option>
                  <option value="neutral">neutral</option>
                  <option value="negative">negative</option>
                </select>
              </label>

              <label className="label">
                Context sentence
                <textarea className="input" value={sentence} onChange={(e) => setSentence(e.target.value)} rows={4} />
              </label>

              <label className="label">
                Explanation (optional)
                <textarea className="input" value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={4} />
              </label>

              <div className="row">
                <button className="button" onClick={save}>Save</button>
                <button className="button ghost" onClick={clear}>Clear overrides for this word</button>
              </div>

              <p className="tiny" style={{ opacity: 0.85 }}>
                Your edits are stored in your browser. Export overrides to back them up.
              </p>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
