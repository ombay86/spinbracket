// Web Audio API Synthesizer - 100% offline, zero external audio asset dependency

class SoundEffectsManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Click/tick sound for spinwheel rotation
  playTick() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400 + Math.random() * 80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio might be blocked before user gesture
    }
  }

  // Wheel landed sound (cheerful chime)
  playWheelWin() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    } catch {}
  }

  // Match winner selected gimmick chime & cheer
  playMatchWinner() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      // Bright brass-like triumphant chord
      const chords = [
        { freq: 440, delay: 0 },
        { freq: 554.37, delay: 0.05 },
        { freq: 659.25, delay: 0.1 },
        { freq: 880, delay: 0.15 },
        { freq: 1108.73, delay: 0.2 },
      ];

      chords.forEach(({ freq, delay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + delay;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 1.0);
      });
    } catch {}
  }

  // Grand Champion finale fanfare (Epic Brass + Fanfare Chords)
  playGrandFanfare() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const fanfareSequence = [
        { freq: 523.25, start: 0.0, dur: 0.18 }, // C5
        { freq: 523.25, start: 0.2, dur: 0.18 }, // C5
        { freq: 523.25, start: 0.4, dur: 0.18 }, // C5
        { freq: 659.25, start: 0.65, dur: 0.5 }, // E5
        { freq: 783.99, start: 1.2, dur: 0.4 },  // G5
        { freq: 1046.5, start: 1.65, dur: 1.4 }, // C6 (Grand sustain)
      ];

      fanfareSequence.forEach((item) => {
        const osc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + item.start;

        osc.type = 'sawtooth';
        subOsc.type = 'sine';
        osc.frequency.setValueAtTime(item.freq, t);
        subOsc.frequency.setValueAtTime(item.freq / 2, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + item.dur);

        osc.connect(gain);
        subOsc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        subOsc.start(t);
        osc.stop(t + item.dur + 0.05);
        subOsc.stop(t + item.dur + 0.05);
      });
    } catch {}
  }
}

export const sounds = new SoundEffectsManager();
