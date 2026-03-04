import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Shell from "../ui/Shell";
import { loadUser } from "../lib/userStore";
import { loadWordbank, shuffle, type WordBankItem } from "../lib/wordbank";
import { loadProgress, masteryFor, recordAttempt } from "../lib/progressStore";
import { sfxCorrect, sfxWrong, sfxLevelClear, sfxClick, sfxLevelUp } from "../lib/sfx";
import { applyCorrect, applyWrong, resetSessionLivesIfNeeded } from "../lib/gameMetaStore";

function adaptiveShuffle(items: WordBankItem[]): WordBankItem[] {
  const progress = loadProgress();

  const weighted = items.map((it) => {
    const m = masteryFor(it.word, progress);
    const weight = 0.2 + (1 - m) * 0.8; // 0.2..1.0
    const key = Math.pow(Math.random(), 1 / weight);
    return { it, key };
  });

  weighted.sort((a, b) => b.key - a.key);
  return weighted.map((x) => x.it);
}

function prepQuestions(items: WordBankItem[]): WordBankItem[] {
  return items.map((x) => ({
    ...x,
    context: { ...x.context, choices: shuffle(x.context.choices) },
  }));
}

export default function ContextGamePage() {
  const nav = useNavigate();
  const user = loadUser();
  if (!user) return <Navigate to="/" replace />;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WordBankItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
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
        const ordered = adaptiveShuffle(prepQuestions(data));

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
    return () => {
      cancelled = true;
    };
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

  const choose = (choice: string) => {
    if (revealed) return;
    sfxClick();
    setSelected(choice);
  };

  const submit = () => {
    if (!current || revealed || !selected) return;

    const isCorrect = selected === current.context.answer;

    if (isCorrect) {
      sfxCorrect();
      const r = applyCorrect(10);
      if (r.leveledUp) sfxLevelUp();
    } else {
      sfxWrong();
      const r = applyWrong();
      // if out of lives, end session
      if (r.meta.settings.livesMode && r.meta.lives <= 0) {
        recordAttempt(current.word, false);
        setMissed((m) => [...m, current]);
        setRevealed(true);
        setIndex(total); // jump to results
        return;
      }
    }

    recordAttempt(current.word, isCorrect);
    setRevealed(true);

    if (isCorrect) setCorrectCount((c) => c + 1);
    else setMissed((m) => [...m, current]);
  };

  const next = () => {
    if (!revealed) return;

    const wasLast = index + 1 >= total;
    if (wasLast) sfxLevelClear();

    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  };

  const restartAdaptive = () => {
    sfxClick();
    const ordered = adaptiveShuffle(items);
    resetSessionLivesIfNeeded();
    setItems(prepQuestions(ordered));
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setMissed([]);
  };

  const retryMissed = () => {
    if (missed.length === 0) return;
    sfxClick();
    const ordered = adaptiveShuffle(missed);
    resetSessionLivesIfNeeded();
    setItems(prepQuestions(ordered));
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setMissed([]);
  };

  if (loading) {
    return (
      <Shell>
        <h1 className="title">Words in Context</h1>
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
        <h1 className="title">Words in Context</h1>
        <p className="subtitle" style={{ opacity: 0.95 }}>
          Couldn’t load <b>public/wordbank.json</b>.
        </p>
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
        <h1 className="title">Session Complete</h1>
        <p className="subtitle">
          Score: <b>{correctCount}</b> / <b>{total}</b> ({scorePct}%)
        </p>

        {missed.length > 0 ? (
          <>
            <p className="subtitle" style={{ marginTop: 14 }}>Missed words:</p>
            <ul style={{ marginTop: 0, lineHeight: 1.7 }}>
              {missed.map((m, i) => (
                <li key={`${m.word}-${i}`}>
                  <b>{m.word}</b>: {m.definition}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="subtitle" style={{ marginTop: 14 }}>Perfect run. ✨</p>
        )}

        <div className="row">
          {missed.length > 0 && (
            <button className="button" onClick={retryMissed}>
              Retry missed words
            </button>
          )}
          <button className="button ghost" onClick={restartAdaptive}>
            Play again (adaptive)
          </button>
          <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>
            Back to menu
          </button>
        </div>
      </Shell>
    );
  }

  if (!current) {
    return (
      <Shell>
        <h1 className="title">Words in Context</h1>
        <p className="subtitle">No valid questions found in wordbank.json.</p>
        <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>
          Back to menu
        </button>
      </Shell>
    );
  }

  const correctAnswer = current.context.answer;

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <h1 className="title" style={{ marginBottom: 0 }}>Words in Context</h1>
        <p className="tiny" style={{ margin: 0, opacity: 0.9 }}>{progressText}</p>
      </div>

      <p className="subtitle" style={{ marginTop: 12 }}>{current.context.sentence}</p>

      <div className="row" style={{ marginTop: 10 }}>
        {current.context.choices.map((c) => {
          const isSelected = selected === c;
          const isCorrect = c === correctAnswer;

          let extraStyle: React.CSSProperties = {};
          if (revealed) {
            if (isCorrect) extraStyle = { outline: "2px solid rgba(255,255,255,0.65)" };
            else if (isSelected && !isCorrect) extraStyle = { opacity: 0.65 };
          }

          return (
            <button
              key={c}
              className={`button ghost ${isSelected ? "selected" : ""}`}
              onClick={() => choose(c)}
              style={{ ...extraStyle }}
              disabled={revealed}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        {!revealed ? (
          <button className="button" onClick={submit} disabled={!selected}>
            Check answer
          </button>
        ) : (
          <button className="button" onClick={next}>
            Next
          </button>
        )}

        <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>
          Back to menu
        </button>
      </div>

      {revealed && (
        <div className="dialog">
          <p className="subtitle" style={{ marginBottom: 6 }}>
            Correct answer: <b>{correctAnswer}</b>
          </p>
          <p className="tiny" style={{ whiteSpace: "pre-wrap" }}>
            {current.context.explanation || "No explanation provided."}
          </p>

          <p className="tiny" style={{ marginTop: 10, opacity: 0.92 }}>
            Word: <b>{current.word}</b> • {current.definition}
            {current.tone ? ` • tone: ${current.tone}` : ""}
          </p>

          <p className="tiny" style={{ marginTop: 6, opacity: 0.92 }}>
            Session score: <b>{correctCount}</b> / <b>{index + 1}</b>
          </p>
        </div>
      )}
    </Shell>
  );
}
