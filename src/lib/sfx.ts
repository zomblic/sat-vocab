let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

type BeepOpts = {
  freq: number;
  durationMs: number;
  type?: OscillatorType;
  gain?: number;
  rampMs?: number;
};

function beep({ freq, durationMs, type = "square", gain = 0.04, rampMs = 15 }: BeepOpts) {
  const audio = getCtx();
  if (audio.state === "suspended") void audio.resume();

  const o = audio.createOscillator();
  const g = audio.createGain();

  o.type = type;
  o.frequency.value = freq;

  const now = audio.currentTime;
  const dur = durationMs / 1000;
  const ramp = rampMs / 1000;

  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + ramp);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  o.connect(g);
  g.connect(audio.destination);

  o.start(now);
  o.stop(now + dur);
}

export function sfxClick() {
  beep({ freq: 640, durationMs: 35, type: "square", gain: 0.03 });
}

export function sfxCorrect() {
  beep({ freq: 880, durationMs: 60, type: "triangle", gain: 0.05 });
  setTimeout(() => beep({ freq: 1175, durationMs: 80, type: "triangle", gain: 0.05 }), 70);
}

export function sfxWrong() {
  beep({ freq: 220, durationMs: 120, type: "sawtooth", gain: 0.05 });
  setTimeout(() => beep({ freq: 180, durationMs: 140, type: "sawtooth", gain: 0.05 }), 90);
}

export function sfxLevelClear() {
  beep({ freq: 660, durationMs: 80, type: "square", gain: 0.04 });
  setTimeout(() => beep({ freq: 880, durationMs: 90, type: "square", gain: 0.045 }), 90);
  setTimeout(() => beep({ freq: 990, durationMs: 120, type: "square", gain: 0.05 }), 190);
}

export function sfxLevelUp() {
  beep({ freq: 740, durationMs: 70, type: "square", gain: 0.05 });
  setTimeout(() => beep({ freq: 988, durationMs: 90, type: "square", gain: 0.055 }), 80);
  setTimeout(() => beep({ freq: 1175, durationMs: 120, type: "square", gain: 0.06 }), 180);
}
