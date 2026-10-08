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
    this._playClickAtTime(ctx, ctx.currentTime);
  }

  /**
   * Schedules a crisp, rhythmic split-flap departure roll on WebAudio's native clock.
   * Consumes virtually 0 main-thread CPU and avoids audio-thread stutter during animations.
   */
  playCascadeSequence(count = 7, intervalMs = 45) {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const startTime = ctx.currentTime;
    for (let i = 0; i < count; i++) {
      const t = startTime + (i * intervalMs) / 1000;
      this._playClickAtTime(ctx, t);
    }
  }

  playTone(freq, delayMs = 0) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime + delayMs / 1000;
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
  }

  playVictoryFanfare() {
    AUDIO_CONFIG.VICTORY_DELAYS.forEach((delay, idx) => {
      this.playTone(AUDIO_CONFIG.VICTORY_NOTES[idx], delay);
    });
  }
}
