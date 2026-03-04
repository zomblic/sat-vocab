export type GameSettings = {
  musicOn: boolean;
  livesMode: boolean;
};

export type GameMeta = {
  version: 1;
  xp: number;
  level: number;
  streak: number;
  lives: number;
  settings: GameSettings;
};

const LS_KEY = "satVocab:meta:v1";

function defaultMeta(): GameMeta {
  return {
    version: 1,
    xp: 0,
    level: 1,
    streak: 0,
    lives: 3,
    settings: { musicOn: false, livesMode: false },
  };
}

export function loadMeta(): GameMeta {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultMeta();
    const parsed = JSON.parse(raw) as GameMeta;
    if (!parsed || parsed.version !== 1) return defaultMeta();
    return { ...defaultMeta(), ...parsed, settings: { ...defaultMeta().settings, ...(parsed.settings ?? {}) } };
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(meta: GameMeta) {
  localStorage.setItem(LS_KEY, JSON.stringify(meta));
}

export function nextLevelXp(level: number) {
  return 100 + (level - 1) * 50;
}

export function streakMultiplier(streak: number) {
  if (streak >= 6) return 3;
  if (streak >= 3) return 2;
  return 1;
}

export function applyCorrect(baseXp = 10): { meta: GameMeta; gained: number; leveledUp: boolean } {
  const meta = loadMeta();
  const newStreak = meta.streak + 1;
  const mult = streakMultiplier(newStreak);
  const gained = baseXp * mult;

  let xp = meta.xp + gained;
  let level = meta.level;
  let leveledUp = false;

  while (xp >= nextLevelXp(level)) {
    xp -= nextLevelXp(level);
    level += 1;
    leveledUp = true;
  }

  const updated: GameMeta = { ...meta, xp, level, streak: newStreak };
  saveMeta(updated);
  return { meta: updated, gained, leveledUp };
}

export function applyWrong(): { meta: GameMeta; lostLife: boolean } {
  const meta = loadMeta();
  let lives = meta.lives;
  let lostLife = false;

  if (meta.settings.livesMode) {
    lives = Math.max(0, lives - 1);
    lostLife = true;
  }

  const updated: GameMeta = { ...meta, streak: 0, lives };
  saveMeta(updated);
  return { meta: updated, lostLife };
}

export function resetSessionLivesIfNeeded() {
  const meta = loadMeta();
  if (!meta.settings.livesMode) return meta;
  const updated: GameMeta = { ...meta, lives: 3, streak: 0 };
  saveMeta(updated);
  return updated;
}

export function setMusicOn(on: boolean) {
  const meta = loadMeta();
  const updated: GameMeta = { ...meta, settings: { ...meta.settings, musicOn: on } };
  saveMeta(updated);
  return updated;
}

export function setLivesMode(on: boolean) {
  const meta = loadMeta();
  const updated: GameMeta = { ...meta, settings: { ...meta.settings, livesMode: on }, lives: on ? 3 : meta.lives, streak: 0 };
  saveMeta(updated);
  return updated;
}
