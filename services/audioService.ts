
class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.8;

  private getOutput(): AudioNode | null {
    if (!this.ctx) return null;
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    return this.masterGain;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    this.getOutput();
    if (this.ctx.state !== 'running') {
      this.ctx.resume().catch(() => {});
    }
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  getVolume() {
    return this.volume;
  }

  playFootstep(isWet: boolean) {
    this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;
    const output = this.getOutput();
    if (!output) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = isWet ? 'lowpass' : 'bandpass';
    filter.frequency.value = isWet ? 400 : 800;
    filter.Q.value = 1;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isWet ? 60 : 150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(isWet ? 0.3 : 0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(output);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);

    // Add high-frequency "crunch" for dry ground
    if (!isWet) {
      const noise = this.ctx.createBufferSource();
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
      
      noise.connect(noiseGain);
      noiseGain.connect(output);
      noise.start();
    }
  }

  playThunder(intensity: number = 1) {
    this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const output = this.getOutput();
    if (!output) return;
    const master = this.ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.22 * intensity, now + 0.05);
    master.gain.exponentialRampToValueAtTime(0.08 * intensity, now + 0.7);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);

    // Broadband noise body
    const noise = this.ctx.createBufferSource();
    const noiseDuration = 2.5;
    const noiseBufferSize = Math.floor(this.ctx.sampleRate * noiseDuration);
    const noiseBuffer = this.ctx.createBuffer(1, noiseBufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / noiseBufferSize);
    }
    noise.buffer = noiseBuffer;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(580, now);
    lowpass.frequency.exponentialRampToValueAtTime(180, now + 2.2);
    lowpass.Q.value = 0.7;

    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 85;
    band.Q.value = 0.9;

    // Low rumble oscillator
    const rumble = this.ctx.createOscillator();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(64, now);
    rumble.frequency.exponentialRampToValueAtTime(38, now + 2.2);
    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.0001, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.06 * intensity, now + 0.08);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);

    noise.connect(lowpass);
    lowpass.connect(band);
    band.connect(master);
    rumble.connect(rumbleGain);
    rumbleGain.connect(master);
    master.connect(output);

    noise.start(now);
    noise.stop(now + noiseDuration);
    rumble.start(now);
    rumble.stop(now + 2.2);
  }
}

export const audioService = new AudioService();
