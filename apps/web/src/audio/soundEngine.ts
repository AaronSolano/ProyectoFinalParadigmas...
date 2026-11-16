export const AUDIO_MUTED_STORAGE_KEY = 'profelink.audio.muted';

export interface ToneStep {
  frequency: number;
  durationMs: number;
  type?: OscillatorType;
  gain?: number;
  delayMs?: number;
}

let sharedAudioCtx: AudioContext | null = null;
let audioFactoryOverride: (() => AudioContext | null) | null = null;

export function setAudioContextFactoryForTests(factory: (() => AudioContext | null) | null): void {
  audioFactoryOverride = factory;
  sharedAudioCtx = null;
}

export function isSoundMuted(): boolean {
  try {
    return window.localStorage.getItem(AUDIO_MUTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): boolean {
  try {
    window.localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, muted ? 'true' : 'false');
  } catch {
    // Ignore storage errors in restricted environments
  }
  return muted;
}

export function toggleSoundMuted(): boolean {
  const next = !isSoundMuted();
  return setSoundMuted(next);
}

function getOrCreateAudioContext(): AudioContext | null {
  if (audioFactoryOverride) {
    if (!sharedAudioCtx) {
      sharedAudioCtx = audioFactoryOverride();
    }
    return sharedAudioCtx;
  }
  if (sharedAudioCtx) {
    return sharedAudioCtx;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  try {
    sharedAudioCtx = new Ctor();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function unlockAudioContext(): void {
  const ctx = getOrCreateAudioContext();
  if (!ctx) {
    return;
  }
  try {
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      void Promise.resolve(ctx.resume()).catch(() => undefined);
    }
  } catch {
    // Ignore autoplay errors
  }
}

export function playToneSequence(steps: ToneStep[]): boolean {
  if (isSoundMuted()) {
    return false;
  }
  const ctx = getOrCreateAudioContext();
  if (!ctx) {
    return false;
  }
  try {
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      void Promise.resolve(ctx.resume()).catch(() => undefined);
    }
    const baseNow = ctx.currentTime || 0;
    for (const step of steps) {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const startAt = baseNow + (step.delayMs ?? 0) / 1000;
      const stopAt = startAt + step.durationMs / 1000;
      osc.type = step.type ?? 'sine';
      osc.frequency.setValueAtTime(step.frequency, startAt);
      const peakGain = step.gain ?? 0.12;
      gainNode.gain.setValueAtTime(peakGain, startAt);
      if (typeof gainNode.gain.exponentialRampToValueAtTime === 'function') {
        gainNode.gain.exponentialRampToValueAtTime(0.001, stopAt);
      }
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(stopAt);
    }
    return true;
  } catch {
    return false;
  }
}

export function playLobbySound(): boolean {
  return playToneSequence([
    { frequency: 392.0, durationMs: 140, type: 'triangle', gain: 0.08, delayMs: 0 },
    { frequency: 493.88, durationMs: 180, type: 'triangle', gain: 0.08, delayMs: 120 },
  ]);
}

export function playQuestionOpenSound(): boolean {
  return playToneSequence([
    { frequency: 440, durationMs: 100, type: 'sine', gain: 0.1, delayMs: 0 },
    { frequency: 587.33, durationMs: 140, type: 'sine', gain: 0.12, delayMs: 90 },
  ]);
}

export function playCountdownTick(secondsLeft: number): boolean {
  if (secondsLeft <= 0) {
    return false;
  }
  if (secondsLeft <= 5) {
    // Pulso urgente más agudo y doble en los últimos 5 segundos
    return playToneSequence([
      { frequency: 880, durationMs: 70, type: 'square', gain: 0.09, delayMs: 0 },
      { frequency: 987.77, durationMs: 70, type: 'square', gain: 0.09, delayMs: 90 },
    ]);
  }
  return playToneSequence([
    { frequency: 523.25, durationMs: 55, type: 'sine', gain: 0.06, delayMs: 0 },
  ]);
}

export function playSubmitAnswerSound(): boolean {
  return playToneSequence([
    { frequency: 659.25, durationMs: 85, type: 'triangle', gain: 0.12, delayMs: 0 },
  ]);
}

export function playTimeUpSound(): boolean {
  return playToneSequence([
    { frequency: 311.13, durationMs: 220, type: 'sawtooth', gain: 0.11, delayMs: 0 },
    { frequency: 233.08, durationMs: 320, type: 'sawtooth', gain: 0.11, delayMs: 180 },
  ]);
}

export function computeStreakMultiplier(streak: number): number {
  const clamped = Math.min(5, Math.max(1, Math.floor(streak || 1)));
  return 1 + (clamped - 1) * 0.08;
}

export function playResultSound(correct: boolean, streak = 1): boolean {
  if (correct) {
    const mult = computeStreakMultiplier(streak);
    return playToneSequence([
      { frequency: Math.round(523.25 * mult), durationMs: 110, type: 'triangle', gain: 0.13, delayMs: 0 },
      { frequency: Math.round(659.25 * mult), durationMs: 110, type: 'triangle', gain: 0.13, delayMs: 100 },
      { frequency: Math.round(783.99 * mult), durationMs: 210, type: 'triangle', gain: 0.15, delayMs: 200 },
    ]);
  }
  return playToneSequence([
    { frequency: 349.23, durationMs: 150, type: 'sawtooth', gain: 0.1, delayMs: 0 },
    { frequency: 261.63, durationMs: 240, type: 'sawtooth', gain: 0.1, delayMs: 140 },
  ]);
}

export function playPodiumFanfare(): boolean {
  return playToneSequence([
    { frequency: 523.25, durationMs: 120, type: 'triangle', gain: 0.14, delayMs: 0 },
    { frequency: 659.25, durationMs: 120, type: 'triangle', gain: 0.14, delayMs: 120 },
    { frequency: 783.99, durationMs: 140, type: 'triangle', gain: 0.14, delayMs: 240 },
    { frequency: 1046.5, durationMs: 320, type: 'triangle', gain: 0.16, delayMs: 380 },
  ]);
}
