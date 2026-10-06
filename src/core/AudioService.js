import { AUDIO_CONFIG } from '../config/constants.js';

export class AudioService {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
  }

  getAudioContext() {
    if (!this.soundEnabled) return null;
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

  isSoundEnabled() {
    return this.soundEnabled;
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

  playClick() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const numSamples = Math.floor(ctx.sampleRate * AUDIO_CONFIG.SAMPLE_RATE_RATIO);
    const buffer = ctx.createBuffer(1, numSamples, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < numSamples; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / numSamples, 3);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = AUDIO_CONFIG.CLICK_BASE_FREQ + Math.random() * AUDIO_CONFIG.CLICK_RANDOM_FREQ;
    filter.Q.value = AUDIO_CONFIG.CLICK_Q;

    const gain = ctx.createGain();
    gain.gain.value = AUDIO_CONFIG.CLICK_GAIN;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
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
