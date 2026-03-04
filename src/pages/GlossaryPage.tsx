import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Shell from "../ui/Shell";
import { loadUser } from "../lib/userStore";
import { loadWordbank, type WordBankItem } from "../lib/wordbank";
import { loadProgress, masteryFor } from "../lib/progressStore";
import { sfxClick } from "../lib/sfx";

export default function GlossaryPage() {
  const nav = useNavigate();
  const user = loadUser();
  if (!user) return <Navigate to="/" replace />;

  const [items, setItems] = useState<WordBankItem[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    loadWordbank().then(setItems).catch(() => setItems([]));
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter(
      (x) =>
        x.word.toLowerCase().includes(t) ||
        x.definition.toLowerCase().includes(t) ||
        (x.tone ?? "").toLowerCase().includes(t)
    );
  }, [items, q]);

  const progress = loadProgress();

  return (
    <Shell>
      <h1 className="title">Glossary</h1>
      <p className="subtitle">Search your word bank.</p>

      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search word, definition, tone…" />

      <div style={{ marginTop: 12, maxHeight: 460, overflow: "auto", paddingRight: 6 }}>
        {filtered.map((x) => {
          const m = masteryFor(x.word, progress);
          const pct = Math.round(m * 100);
          return (
            <div key={x.word} className="dialog">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <span className="badge">{x.word}</span> {x.tone ? <span className="badge">tone: {x.tone}</span> : null}
                </div>
                <span className="badge">mastery {pct}%</span>
              </div>
              <div style={{ marginTop: 10, opacity: 0.95 }}>{x.definition}</div>
              <div style={{ marginTop: 8, opacity: 0.9 }}>
                <i>{x.context.sentence}</i>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="tiny">No matches.</p>}
      </div>

      <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>
        Back to menu
      </button>
    </Shell>
  );
}
