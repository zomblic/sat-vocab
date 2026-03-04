import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Shell from "../ui/Shell";
import { loadUser } from "../lib/userStore";
import { loadWordbank, shuffle, type WordBankItem } from "../lib/wordbank";
import { loadProgress, masteryFor, recordAttempt } from "../lib/progressStore";
import { applyCorrect, applyWrong, resetSessionLivesIfNeeded } from "../lib/gameMetaStore";
import { sfxClick, sfxCorrect, sfxWrong, sfxLevelClear, sfxLevelUp } from "../lib/sfx";

type Tone = "positive" | "negative" | "neutral";

function adaptiveShuffle(items: WordBankItem[]): WordBankItem[] {
  const progress = loadProgress();
  const weighted = items.map((it) => {
    const m = masteryFor(it.word, progress);
    const weight = 0.2 + (1 - m) * 0.8;
    const key = Math.pow(Math.random(), 1 / weight);
    return { it, key };
  });
  weighted.sort((a, b) => b.key - a.key);
  return weighted.map((x) => x.it);
}

function toneLabel(t: Tone) {
  if (t === "positive") return "Positive";
  if (t === "negative") return "Negative";
  return "Neutral";
}

export default function ToneGamePage() {
  const nav = useNavigate();
  const user = loadUser();
  if (!user) return <Navigate to="/" replace />;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WordBankItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Tone | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [missed, setMissed] = useState<WordBankItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await loadWordbank();

        const toned = data.filter((x) => x.tone === "positive" || x.tone === "negative" || x.tone === "neutral");
        const ordered = adaptiveShuffle(shuffle(toned));

        if (!cancelled) {
          resetSessionLivesIfNeeded();
          setItems(ordered);
          setIndex(0);
          setSelected(null);
          setRevealed(false);
          setCorrectCount(0);
          setMissed([]);
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

  const total = items.length;
  const current = items[index];
  const isFinished = !loading && !error && total > 0 && index >= total;

  const progressText = useMemo(() => {
    if (loading) return "Loading…";
    if (error) return "Error";
    if (isFinished) return "Finished";
    return `Question ${index + 1} of ${total}`;
  }, [loading, error, isFinished, index, total]);

  const choose = (t: Tone) => {
    if (revealed) return;
    sfxClick();
    setSelected(t);
  };

  const submit = () => {
    if (!current || revealed || !selected) return;

    const correctTone = (current.tone ?? "neutral") as Tone;
    const isCorrect = selected === correctTone;

    if (isCorrect) {
      sfxCorrect();
      const r = applyCorrect(8);
      if (r.leveledUp) sfxLevelUp();
      setCorrectCount((c) => c + 1);
    } else {
      sfxWrong();
      const r = applyWrong();
      setMissed((m) => [...m, current]);
      if (r.meta.settings.livesMode && r.meta.lives <= 0) {
        recordAttempt(current.word, false);
        setRevealed(true);
        setIndex(total);
        return;
      }
    }

    recordAttempt(current.word, isCorrect);
    setRevealed(true);
  };

  const next = () => {
    if (!revealed) return;
    const wasLast = index + 1 >= total;
    if (wasLast) sfxLevelClear();
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  };

  const retryMissed = () => {
    if (missed.length === 0) return;
    sfxClick();
    resetSessionLivesIfNeeded();
    setItems(adaptiveShuffle(shuffle(missed)));
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setMissed([]);
  };

  const restart = () => {
    sfxClick();
    resetSessionLivesIfNeeded();
    setItems(adaptiveShuffle(shuffle(items)));
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setMissed([]);
  };

  if (loading) {
    return (
      <Shell>
        <h1 className="title">Tone Quest</h1>
        <p className="subtitle">Loading your word bank…</p>
        <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>
          Back to menu
        </button>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <h1 className="title">Tone Quest</h1>
        <p className="subtitle">Couldn’t load <b>public/wordbank.json</b>.</p>
        <p className="tiny" style={{ whiteSpace: "pre-wrap" }}>{error}</p>
        <div className="row">
          <button className="button" onClick={() => window.location.reload()}>Retry</button>
          <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>Back to menu</button>
        </div>
      </Shell>
    );
  }

  if (isFinished) {
    const scorePct = total ? Math.round((correctCount / total) * 100) : 0;
    return (
      <Shell>
        <h1 className="title">Tone Quest Complete</h1>
        <p className="subtitle">Score: <b>{correctCount}</b> / <b>{total}</b> ({scorePct}%)</p>

        {missed.length > 0 ? (
          <>
            <p className="subtitle" style={{ marginTop: 14 }}>Missed:</p>
            <ul style={{ marginTop: 0, lineHeight: 1.7 }}>
              {missed.map((m, i) => (
                <li key={`${m.word}-${i}`}>
                  <b>{m.word}</b> • {m.definition} • <span className="badge">{toneLabel((m.tone ?? "neutral") as Tone)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="subtitle" style={{ marginTop: 14 }}>Perfect tone reading. ✨</p>
        )}

        <div className="row">
          {missed.length > 0 && <button className="button" onClick={retryMissed}>Retry missed</button>}
          <button className="button ghost" onClick={restart}>Play again</button>
          <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>Back to menu</button>
        </div>
      </Shell>
    );
  }

  if (!current) {
    return (
      <Shell>
        <h1 className="title">Tone Quest</h1>
        <p className="subtitle">No toned words found in wordbank.json.</p>
        <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>Back to menu</button>
      </Shell>
    );
  }

  const correctTone = (current.tone ?? "neutral") as Tone;

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <h1 className="title" style={{ marginBottom: 0 }}>Tone Quest</h1>
        <p className="tiny" style={{ margin: 0, opacity: 0.9 }}>{progressText}</p>
      </div>

      <div className="dialog" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span className="badge">{current.word}</span>
          <span className="badge">Choose the tone</span>
        </div>
        <p className="subtitle" style={{ marginTop: 12 }}>
          {current.context?.sentence ?? `How does the word "${current.word}" feel in meaning?`}
        </p>
        <p className="tiny" style={{ opacity: 0.9 }}>
          Definition: {current.definition}
        </p>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        {(["positive","negative","neutral"] as Tone[]).map((t) => {
          const isSel = selected === t;
          const extra = revealed
            ? (t === correctTone ? { outline: "2px solid rgba(255,255,255,0.65)" } : (isSel ? { opacity: 0.65 } : {}))
            : (isSel ? { outline: "2px solid rgba(255,255,255,0.45)" } : {});
          return (
            <button
              key={t}
              className={`button ghost ${isSel ? "selected" : ""}`}
              onClick={() => choose(t)}
              disabled={revealed}
              style={extra}
            >
              {toneLabel(t)}
            </button>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        {!revealed ? (
          <button className="button" onClick={submit} disabled={!selected}>Check</button>
        ) : (
          <button className="button" onClick={next}>Next</button>
        )}

        <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>
          Back to menu
        </button>
      </div>

      {revealed && (
        <div className="dialog">
          <p className="subtitle" style={{ marginBottom: 6 }}>
            Correct tone: <b>{toneLabel(correctTone)}</b>
          </p>
          <p className="tiny" style={{ opacity: 0.92 }}>
            Tip: Positive words usually praise or improve; negative words criticize or harm; neutral words describe facts or actions.
          </p>
        </div>
      )}
    </Shell>
  );
}
