
class AudioService {
  private ctx: AudioContext | null = null;

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  playFootstep(isWet: boolean) {
    if (!this.ctx || this.ctx.state !== 'running') return;

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
    gain.connect(this.ctx.destination);

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
      noiseGain.connect(this.ctx.destination);
      noise.start();
    }
  }
}

export const audioService = new AudioService();
