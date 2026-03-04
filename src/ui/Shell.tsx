import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { loadMeta, nextLevelXp, setLivesMode, setMusicOn } from "../lib/gameMetaStore";
import { startMusic, stopMusic } from "../lib/music";
import { sfxClick } from "../lib/sfx";

function xpPct(xp: number, level: number) {
  const need = nextLevelXp(level);
  return Math.max(0, Math.min(100, Math.round((xp / need) * 100)));
}

export default function Shell({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState(loadMeta());

  useEffect(() => {
    const t = window.setInterval(() => setMeta(loadMeta()), 350);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (meta.settings.musicOn) startMusic();
    else stopMusic();
  }, [meta.settings.musicOn]);

  const pct = xpPct(meta.xp, meta.level);

  return (
    <div className="page">
      <div className="card">
        <div className="marquee">
          <div className="marqueeLeft">
            <span className="badge">LV {meta.level}</span>
            <span className="badge">
              XP {meta.xp}/{nextLevelXp(meta.level)} ({pct}%)
            </span>
            <span className="badge">STREAK {meta.streak}</span>
            {meta.settings.livesMode && <span className="badge">♥ {meta.lives}</span>}
          </div>

          <div className="marqueeRight">
            <button
              className="badge"
              onClick={() => {
                sfxClick();
                setMeta(setMusicOn(!meta.settings.musicOn));
              }}
              title="Toggle music"
              style={{ cursor: "pointer" }}
            >
              MUSIC: {meta.settings.musicOn ? "ON" : "OFF"}
            </button>

            <button
              className="badge"
              onClick={() => {
                sfxClick();
                setMeta(setLivesMode(!meta.settings.livesMode));
              }}
              title="Toggle 3-heart challenge mode"
              style={{ cursor: "pointer" }}
            >
              CHALLENGE: {meta.settings.livesMode ? "ON" : "OFF"}
            </button>

            <span className="badge">SAT VOCAB QUEST</span>
          </div>
        </div>

        <div style={{ height: 10, background: "rgba(0,0,0,0.35)", marginBottom: 12, boxShadow: "0 0 0 4px #000 inset" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent3)" }} />
        </div>

        <div className="screen">{children}</div>
      </div>
    </div>
  );
}
