import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Shell from "../ui/Shell";
import { loadUser } from "../lib/userStore";
import { loadWordbank, shuffle, type WordBankItem } from "../lib/wordbank";
import { recordAttempt } from "../lib/progressStore";
import { applyCorrect, applyWrong, resetSessionLivesIfNeeded } from "../lib/gameMetaStore";
import { sfxClick, sfxCorrect, sfxWrong, sfxLevelClear, sfxLevelUp } from "../lib/sfx";

type Card = { id: string; kind: "word" | "def"; text: string; wordKey: string };

function buildRound(items: WordBankItem[], roundSize: number): Card[] {
  const picked = shuffle(items).slice(0, roundSize);
  const cards: Card[] = [];
  for (const x of picked) {
    cards.push({ id: `w:${x.word}`, kind: "word", text: x.word, wordKey: x.word });
    cards.push({ id: `d:${x.word}`, kind: "def", text: x.definition, wordKey: x.word });
  }
  return shuffle(cards);
}

export default function MatchGamePage() {
  const nav = useNavigate();
  const user = loadUser();
  if (!user) return <Navigate to="/" replace />;

  const [items, setItems] = useState<WordBankItem[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<Card | null>(null);
  const [matchedKeys, setMatchedKeys] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadWordbank()
      .then((data) => {
        resetSessionLivesIfNeeded();
        setItems(data);
        setCards(buildRound(data, 6));
      })
      .catch(() => setItems([]));
  }, []);

  const remaining = useMemo(() => {
    const totalPairs = Math.floor(cards.length / 2);
    return totalPairs - matchedKeys.size;
  }, [cards.length, matchedKeys]);

  const resetRound = () => {
    if (items.length === 0) return;
    sfxClick();
    resetSessionLivesIfNeeded();
    setCards(buildRound(items, 6));
    setSelected(null);
    setMatchedKeys(new Set());
    setMoves(0);
    setMessage(null);
  };

  const onPick = (c: Card) => {
    if (matchedKeys.has(c.wordKey)) return;
    sfxClick();
    setMessage(null);

    if (!selected) {
      setSelected(c);
      return;
    }

    if (selected.id === c.id) return;

    setMoves((m) => m + 1);

    const isMatch = selected.wordKey === c.wordKey && selected.kind !== c.kind;

    if (isMatch) {
      const next = new Set(matchedKeys);
      next.add(c.wordKey);
      setMatchedKeys(next);

      recordAttempt(c.wordKey, true);
      sfxCorrect();

      const r = applyCorrect(8);
      if (r.leveledUp) sfxLevelUp();

      setSelected(null);
      setMessage("Match!");

      if (next.size === cards.length / 2) sfxLevelClear();
    } else {
      // record both as attempts
      recordAttempt(selected.wordKey, false);
      recordAttempt(c.wordKey, false);

      sfxWrong();
      applyWrong();
      setMessage("Nope. Try again.");
      setSelected(null);
    }
  };

  const isDone = cards.length > 0 && matchedKeys.size === cards.length / 2;

  return (
    <Shell>
      <h1 className="title">Matching</h1>
      <p className="subtitle">
        Match words to definitions. Remaining: <span className="badge">{remaining}</span> • Moves: <span className="badge">{moves}</span>
      </p>

      {message && <p className="tiny">{message}</p>}

      <div className="grid2" style={{ marginTop: 12 }}>
        {cards.map((c) => {
          const matched = matchedKeys.has(c.wordKey);
          const isSel = selected?.id === c.id;
          return (
            <button
              key={c.id}
              className={`button ghost ${isSel ? "selected" : ""}`}
              onClick={() => onPick(c)}
              disabled={matched}
              style={{ opacity: matched ? 0.55 : 1, minHeight: 56 }}
            >
              <span className="badge" style={{ marginRight: 10 }}>{c.kind === "word" ? "WORD" : "DEF"}</span>
              {c.text}
            </button>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 14 }}>
        <button className="button" onClick={resetRound}>
          {isDone ? "New round" : "Reset round"}
        </button>
        <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>
          Back to menu
        </button>
      </div>
    </Shell>
  );
}
