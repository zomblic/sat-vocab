import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Shell from "../ui/Shell";
import { loadUser } from "../lib/userStore";
import { loadWordbank } from "../lib/wordbank";
import {
  clearProgress,
  exportProgressCode,
  importProgressCode,
  loadProgress,
  makeMagicLink,
  overallStats,
} from "../lib/progressStore";
import { sfxClick } from "../lib/sfx";

export default function ProgressPage() {
  const nav = useNavigate();
  const user = loadUser();
  if (!user) return <Navigate to="/" replace />;

  const [itemsCount, setItemsCount] = useState<number>(0);
  const [statsText, setStatsText] = useState<string>("Loading…");
  const [code, setCode] = useState("");
  const [magicLink, setMagicLink] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const items = await loadWordbank();
      setItemsCount(items.length);
      const stats = overallStats(items, loadProgress());
      const pct = Math.round(stats.accuracy * 100);
      setStatsText(
        `Attempted ${stats.attempted}/${stats.totalWords} • Mastered ${stats.mastered}/${stats.totalWords} • Accuracy ${pct}% (${stats.totalCorrect}/${stats.totalAttempts})`
      );
    })().catch(() => setStatsText("Could not load wordbank for stats."));
  }, []);

  const exported = useMemo(() => exportProgressCode(loadProgress()), []);

  return (
    <Shell>
      <h1 className="title">Progress</h1>
      <p className="subtitle">
        Words in bank: <span className="badge">{itemsCount || "?"}</span>
      </p>
      <p className="subtitle">{statsText}</p>

      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="button"
          onClick={() => {
            sfxClick();
            const fresh = exportProgressCode(loadProgress());
            setCode(fresh);
            setMagicLink(makeMagicLink(fresh));
            setMsg("Exported!");
          }}
        >
          Export progress
        </button>

        <button
          className="button ghost"
          onClick={() => {
            sfxClick();
            clearProgress();
            setMsg("Progress cleared on this device.");
          }}
        >
          Clear local progress
        </button>

        <button className="button ghost" onClick={() => { sfxClick(); nav("/home"); }}>
          Back to menu
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        <p className="tiny">Export/Import code (copy/paste):</p>
        <textarea
          value={code || exported}
          onChange={(e) => setCode(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            borderRadius: 0,
            padding: 12,
            background: "rgba(0,0,0,0.30)",
            color: "white",
            border: "0",
            boxShadow: "0 0 0 4px #000 inset",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        />
        <div className="row" style={{ marginTop: 10 }}>
          <button
            className="button"
            onClick={() => {
              sfxClick();
              try {
                importProgressCode(code || exported);
                setMsg("Imported progress. Refreshing…");
                window.location.reload();
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "Import failed.");
              }
            }}
          >
            Import code
          </button>

          <button
            className="button ghost"
            onClick={() => {
              sfxClick();
              const fresh = exportProgressCode(loadProgress());
              setMagicLink(makeMagicLink(fresh));
              setMsg("Magic link created.");
            }}
          >
            Create save link
          </button>
        </div>

        {magicLink && (
          <div style={{ marginTop: 10 }}>
            <p className="tiny">Save link (bookmark it or send it to yourself):</p>
            <input className="input" value={magicLink} readOnly />
          </div>
        )}

        {msg && (
          <p className="tiny" style={{ marginTop: 10, opacity: 0.95 }}>
            {msg}
          </p>
        )}
      </div>
    </Shell>
  );
}
