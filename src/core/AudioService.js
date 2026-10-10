import { AUDIO_CONFIG } from '../config/constants.js';

export class AudioService {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.clickBuffers = null;
    this.clickBufferIdx = 0;
  }

  getAudioContext() {
    if (!this.soundEnabled) return null;
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this._ensureClickBuffers(this.audioCtx);
      } catch (e) {
        console.warn('AudioContext not supported or blocked:', e);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    if (this.soundEnabled) {
      this.getAudioContext();
    }
    return this.soundEnabled;
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = Boolean(enabled);
    if (this.soundEnabled) {
      this.getAudioContext();
    }
    return this.soundEnabled;
  }

  mute() {
    return this.setSoundEnabled(false);
  }

  unmute() {
    return this.setSoundEnabled(true);
  }

  isSoundEnabled() {
    return this.soundEnabled;
  }

  playFlip() {
    this.playClick();
  }

  suspend() {
    if (this.audioCtx && this.audioCtx.state === 'running') {
      try {
        this.audioCtx.suspend();
      } catch (e) {
        console.warn('Failed to suspend AudioContext:', e);
      }
    }
  }

  resume() {
    if (this.soundEnabled && this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        this.audioCtx.resume();
      } catch (e) {
        console.warn('Failed to resume AudioContext:', e);
      }
    }
  }

  _ensureClickBuffers(ctx) {
    if (this.clickBuffers || !ctx) return;
    this.clickBuffers = [];
    const numSamples = Math.floor(ctx.sampleRate * AUDIO_CONFIG.SAMPLE_RATE_RATIO);
    for (let b = 0; b < 5; b++) {
      const buffer = ctx.createBuffer(1, numSamples, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      const decayFactor = 2.8 + Math.random() * 0.5;
      for (let i = 0; i < numSamples; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / numSamples, decayFactor);
      }
      this.clickBuffers.push(buffer);
    }
  }

  _playClickAtTime(ctx, scheduledTime) {
    this._ensureClickBuffers(ctx);
    if (!this.clickBuffers || !this.clickBuffers.length) return;

    const buffer = this.clickBuffers[this.clickBufferIdx % this.clickBuffers.length];
    this.clickBufferIdx++;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = AUDIO_CONFIG.CLICK_BASE_FREQ + (Math.random() * AUDIO_CONFIG.CLICK_RANDOM_FREQ);
    filter.Q.value = AUDIO_CONFIG.CLICK_Q;

    const gain = ctx.createGain();
    gain.gain.value = AUDIO_CONFIG.CLICK_GAIN;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(scheduledTime);
  }

  playClick() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this._playClickAtTime(ctx, ctx.currentTime);
      }).catch(() => {
        this._playClickAtTime(ctx, ctx.currentTime);
      });
    } else {
      this._playClickAtTime(ctx, ctx.currentTime);
    }
  }

  /**
   * Schedules a crisp, rhythmic split-flap departure roll on WebAudio's native clock.
   * Consumes virtually 0 main-thread CPU and avoids audio-thread stutter during animations.
   */
  playCascadeSequence(count = 5, intervalMs = 55) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const schedule = () => {
      // Small safety headroom ensures Android mixer never receives timestamps in the past
      const startTime = ctx.currentTime + 0.025;
      for (let i = 0; i < count; i++) {
        const t = startTime + (i * intervalMs) / 1000;
        this._playClickAtTime(ctx, t);
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(schedule).catch(() => schedule());
    } else {
      schedule();
    }
  }

  playTone(freq, delayMs = 0) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const play = () => {
      const t = ctx.currentTime + Math.max(0.01, delayMs / 1000);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.38);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(play).catch(() => play());
    } else {
      play();
    }
  }

  playCorrectNote(delayMs = 0) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const play = () => {
      const t = ctx.currentTime + Math.max(0.01, delayMs / 1000);

      // Bright dual-harmonic chime: upward melodic lift from A5 (880Hz) to C6 (1046.5Hz) with E6 (1318.5Hz) shimmer
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(AUDIO_CONFIG.CORRECT_NOTE_START || 880, t);
      osc1.frequency.exponentialRampToValueAtTime(AUDIO_CONFIG.CORRECT_NOTE_END || 1046.5, t + 0.06);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(AUDIO_CONFIG.CORRECT_NOTE_HARMONIC || 1318.5, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.3);
      osc2.stop(t + 0.3);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(play).catch(() => play());
    } else {
      play();
    }
  }

  playIncorrectNote(delayMs = 0) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const play = () => {
      const t = ctx.currentTime + Math.max(0.01, delayMs / 1000);

      // Subtle, muted low mechanical thud / downward tap from 220Hz to 160Hz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(AUDIO_CONFIG.INCORRECT_NOTE_START || 220, t);
      osc.frequency.exponentialRampToValueAtTime(AUDIO_CONFIG.INCORRECT_NOTE_END || 160, t + 0.1);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.08, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.16);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(play).catch(() => play());
    } else {
      play();
    }
  }

  playVictoryFanfare() {
    AUDIO_CONFIG.VICTORY_DELAYS.forEach((delay, idx) => {
      this.playTone(AUDIO_CONFIG.VICTORY_NOTES[idx], delay);
    });
  }
}
