// AudioEngine.js
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.init();
  }
  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {}
  }
  resume() { if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  play(type) {
    if(this.muted || !this.ctx) return;
    this.resume();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    try {
      if(type === 'orb') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
      } else if(type === 'death') {
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
      } else if(type === 'powerup') {
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
      } else if(type === 'shieldBreak') {
        const bufLen = ctx.sampleRate * 0.3;
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for(let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i/bufLen);
        const src = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        src.buffer = buf;
        src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        filter.type = 'bandpass'; filter.frequency.setValueAtTime(2000, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        src.start(now);
      } else if(type === 'kill') {
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
    } catch(e) {}
  }
  startMusic() {
    if(this.musicPlaying || !this.ctx) return;
    this.resume();
    this.musicPlaying = true;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    this.musicGain.connect(this.ctx.destination);
    const freqs = [55, 82.4, 110, 73.4];
    this.musicOscs = freqs.map((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = i < 2 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(f + i * 0.3, this.ctx.currentTime);
      g.gain.setValueAtTime(0.3 - i * 0.05, this.ctx.currentTime);
      o.connect(g); g.connect(this.musicGain);
      o.start(); return o;
    });
    this._musicLFO();
  }
  _musicLFO() {
    if(!this.musicPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(0.055, now + 4);
    this.musicGain.gain.linearRampToValueAtTime(0.025, now + 8);
    this._musicLFOTimer = setTimeout(() => this._musicLFO(), 8000);
  }
  stopMusic() {
    this.musicPlaying = false;
    clearTimeout(this._musicLFOTimer);
    if(this.musicOscs) this.musicOscs.forEach(o => { try { o.stop(); } catch(e) {} });
    this.musicOscs = null;
    if(this.musicGain) { this.musicGain.disconnect(); this.musicGain = null; }
  }
  setMusicIntensity(level) {
    if(!this.musicGain || !this.ctx) return;
    const target = level > 0.5 ? 0.07 : 0.04;
    this.musicGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.5);
    if(this.musicOscs) {
      this.musicOscs.forEach((o, i) => {
        const base = [55,82.4,110,73.4][i];
        o.frequency.linearRampToValueAtTime(base * (1 + level * 0.15), this.ctx.currentTime + 0.5);
      });
    }
  }
  startBoost() {
    if(this.muted || !this.ctx || this.boostOsc) return;
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
    } catch(e) {}
  }
  stopBoost() {
    if(this.boostOsc) {
      try { this.boostGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1); this.boostOsc.stop(this.ctx.currentTime + 0.1); } catch(e) {}
      this.boostOsc = null; this.boostGain = null;
    }
  }
}
