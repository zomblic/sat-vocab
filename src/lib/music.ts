let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: number | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function ensureRunning() {
  const audio = getCtx();
  if (audio.state === "suspended") void audio.resume();
  if (!master) {
    master = audio.createGain();
    master.gain.value = 0.06; // gentle
    master.connect(audio.destination);
  }
}

function playNote(freq: number, ms: number, type: OscillatorType) {
  const audio = getCtx();
  if (!master) return;

  const o = audio.createOscillator();
  const g = audio.createGain();

  o.type = type;
  o.frequency.value = freq;

  const now = audio.currentTime;
  const dur = ms / 1000;

  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.9, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  o.connect(g);
  g.connect(master);

  o.start(now);
  o.stop(now + dur);
}

// Cozy little arpeggio loop
const SCALE = [261.63, 329.63, 392.0, 523.25]; // C E G C
let step = 0;

export function startMusic() {
  ensureRunning();
  if (timer) return;

  step = 0;
  timer = window.setInterval(() => {
    const base = SCALE[step % SCALE.length];
    playNote(base, 140, "triangle");
    if (step % 2 === 0) playNote(base * 2, 80, "square");
    step += 1;
  }, 180);
}

export function stopMusic() {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
}

export function setMusicVolume(v: number) {
  ensureRunning();
  if (master) master.gain.value = Math.max(0, Math.min(0.2, v));
}
