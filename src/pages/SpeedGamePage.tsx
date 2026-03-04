import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Shell from "../ui/Shell";
import { loadUser } from "../lib/userStore";
import { loadWordbank, shuffle, type WordBankItem } from "../lib/wordbank";
import { recordAttempt } from "../lib/progressStore";
import { applyCorrect, applyWrong, resetSessionLivesIfNeeded } from "../lib/gameMetaStore";
import { sfxClick, sfxCorrect, sfxWrong, sfxLevelClear, sfxLevelUp } from "../lib/sfx";

export default function SpeedGamePage() {
  const nav = useNavigate();
  const user = loadUser();
  if (!user) return <Navigate to="/" replace />;

  const [items, setItems] = useState<WordBankItem[]>([]);
  const [started, setStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [queue, setQueue] = useState<WordBankItem[]>([]);
  const [i, setI] = useState(0);

  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [didEndSound, setDidEndSound] = useState(false);

  useEffect(() => {
    loadWordbank()
      .then((data) => {
        setItems(data);
        setQueue(shuffle(data).map((x) => ({ ...x, context: { ...x.context, choices: shuffle(x.context.choices) } })));
      })
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (!started) return;
    if (secondsLeft <= 0) return;

    const t = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearInterval(t);
  }, [started, secondsLeft]);

  useEffect(() => {
    if (started && secondsLeft <= 0 && !didEndSound) {
      sfxLevelClear();
      setDidEndSound(true);
    }
  }, [started, secondsLeft, didEndSound]);

  const current = queue[i];
  const finished = started && secondsLeft <= 0;

  const start = () => {
    sfxClick();
    resetSessionLivesIfNeeded();
    setStarted(true);
    setSecondsLeft(60);
    setScore(0);
    setAttempts(0);
    setI(0);
    setDidEndSound(false);
    setQueue(shuffle(items).map((x) => ({ ...x, context: { ...x.context, choices: shuffle(x.context.choices) } })));
  };

  const answer = (choice: string) => {
    if (!current || finished) return;

    sfxClick();
    const correct = choice === current.context.answer;

    setAttempts((a) => a + 1);
    recordAttempt(current.word, correct);

    if (correct) {
      sfxCorrect();
      setScore((s) => s + 1);
      const r = applyCorrect(6);
      if (r.leveledUp) sfxLevelUp();
    } else {
      sfxWrong();
      applyWrong();
    }

    setI((idx) => (idx + 1) % queue.length);
  };

  const accuracy = attempts ? Math.round((score / attempts) * 100) : 0;

  const header = useMemo(() => {
    if (!started) return "Speed Round";
    if (finished) return "Time!";
    return `Speed Round • ${secondsLeft}s`;
  }, [started, finished, secondsLeft]);

  return (
    <Shell>
      <h1 className="title">{header}</h1>
      <p className="subtitle">
        Score <span className="badge">{score}</span> • Attempts <span className="badge">{attempts}</span> • Accuracy{" "}
        <span className="badge">{accuracy}%</span>
      </p>

      {!started ? (
        <div className="row">
          <button className="button" onClick={start} disabled={items.length === 0}>
            Start 60s round
          </button>
          <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>
            Back to menu
          </button>
        </div>
      ) : finished ? (
        <div className="row">
          <button className="button" onClick={start}>
            Play again
          </button>
          <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>
            Back to menu
          </button>
        </div>
      ) : !current ? (
        <p className="tiny">Loading questions…</p>
      ) : (
        <>
          <p className="subtitle" style={{ marginTop: 12 }}>{current.context.sentence}</p>

          <div className="row" style={{ marginTop: 10 }}>
            {current.context.choices.map((c) => (
              <button key={c} className="button ghost" onClick={() => answer(c)}>
                {c}
              </button>
            ))}
          </div>

          <button className="link" onClick={() => { sfxClick(); nav("/home"); }}>
            End round
          </button>
        </>
      )}
    </Shell>
  );
}
