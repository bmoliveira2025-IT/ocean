export class AudioEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;
  private boostOsc: OscillatorNode | null = null;
  private boostGain: GainNode | null = null;

  constructor() {
    this.init();
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext not supported');
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(type: 'orb' | 'death' | 'powerup' | 'shieldBreak' | 'kill') {
    if (this.muted || !this.ctx) return;
    this.resume();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    try {
      if (type === 'orb') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
      } else if (type === 'death') {
        [220, 110].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, now);
          filter.frequency.exponentialRampToValueAtTime(200, now + 0.5);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.start(now + i * 0.02); osc.stop(now + 0.55);
        });
      } else if (type === 'powerup') {
        [523, 659, 784, 1047].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.3, now + i * 0.08 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12);
          osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.15);
        });
      } else if (type === 'shieldBreak') {
        const bufLen = ctx.sampleRate * 0.3;
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
        const src = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        src.buffer = buf;
        src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        filter.type = 'bandpass'; filter.frequency.setValueAtTime(2000, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        src.start(now);
      } else if (type === 'kill') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(165, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      }
    } catch (e) {}
  }

  startBoost() {
    if (this.muted || !this.ctx || this.boostOsc) return;
    this.resume();
    try {
      this.boostOsc = this.ctx.createOscillator();
      this.boostGain = this.ctx.createGain();
      this.boostOsc.connect(this.boostGain);
      this.boostGain.connect(this.ctx.destination);
      this.boostOsc.type = 'square';
      this.boostOsc.frequency.setValueAtTime(80, this.ctx.currentTime);
      this.boostGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      this.boostOsc.start();
    } catch (e) {}
  }

  stopBoost() {
    if (this.boostOsc && this.ctx && this.boostGain) {
      try {
        this.boostGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        this.boostOsc.stop(this.ctx.currentTime + 0.1);
      } catch (e) {}
      this.boostOsc = null;
      this.boostGain = null;
    }
  }
}
