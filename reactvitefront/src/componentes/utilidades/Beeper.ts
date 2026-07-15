// src/utilidades/Beeper.ts

export type BeepType = 'exito' | 'error' | 'advertencia';

let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
};

export const reproducirBeep = (tipo: BeepType) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Los navegadores a veces suspenden el contexto hasta que hay interacción del usuario
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (tipo === 'exito') {
      // Beep agudo y limpio (tipo scanner real)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.15, now);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (tipo === 'error') {
      // Beep grave y tipo "buzzer"
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      gain.gain.setValueAtTime(0.15, now);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (tipo === 'advertencia') {
      // Beep medio, cuadrado
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.1, now);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (error) {
    console.error("Error al reproducir sonido:", error);
  }
};