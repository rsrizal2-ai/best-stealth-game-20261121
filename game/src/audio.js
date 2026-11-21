// audio.js — every sound is synthesized with WebAudio: no audio files.
// Footsteps tell the player where a guard is (louder when closer), a coin
// pings where it lands, a rising sting marks a near miss, and short
// melodies mark pickups, wins and losses.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.lastGuardStepAt = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (err) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(freq, duration, type, volume, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    } catch (err) {
      // Audio is decoration; never let it break the game.
    }
  }

  // A short filtered noise burst: a footstep on marble.
  footstep(volume, low) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * 0.07);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = low ? 320 : 900;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
    } catch (err) {
      // Ignore audio failures.
    }
  }

  playerStep(sneaking) {
    this.footstep(sneaking ? 0.05 : 0.12, true);
  }

  guardStep(distanceToPlayer) {
    // Guard steps fade with distance: direction and distance by ear.
    const now = performance.now();
    if (now - this.lastGuardStepAt < 90) return;
    this.lastGuardStepAt = now;
    const volume = Math.max(0.02, 0.22 * (1 - distanceToPlayer / 520));
    this.footstep(volume, false);
  }

  coinPing() {
    this.tone(2093, 0.18, 'sine', 0.16);
    this.tone(2637, 0.3, 'sine', 0.12, 0.07);
  }

  lootPickup() {
    this.tone(880, 0.12, 'triangle', 0.14);
    this.tone(1318, 0.2, 'triangle', 0.12, 0.08);
  }

  sapphirePickup() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.14, i * 0.09));
  }

  // The near-miss sting: suspicion just crossed the danger line.
  spottedSting() {
    this.tone(220, 0.35, 'sawtooth', 0.1, 0, 440);
    this.tone(233, 0.35, 'sawtooth', 0.08, 0.02, 466);
  }

  alarm() {
    [660, 520, 660, 520].forEach((f, i) => this.tone(f, 0.16, 'square', 0.09, i * 0.17));
  }

  escaped() {
    this.tone(392, 0.2, 'triangle', 0.1, 0, 311);
  }

  winMelody() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.14, i * 0.11));
  }

  loseMelody() {
    [392, 370, 349, 311].forEach((f, i) => this.tone(f, 0.35, 'sawtooth', 0.08, i * 0.16));
  }
}
