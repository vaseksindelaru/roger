
class SoundManager {
  private audioCtx: AudioContext | null = null;
  private masterVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private musicVolume: number = 0.3;
  private isMuted: boolean = false;
  private bgMusicSource: AudioBufferSourceNode | null = null;
  private bgMusicGain: GainNode | null = null;

  constructor() {
    // AudioContext is initialized on first user interaction
  }

  private initContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setVolumes(master: number, sfx: number, music: number) {
    this.masterVolume = master;
    this.sfxVolume = sfx;
    this.musicVolume = music;
    if (this.bgMusicGain) {
      this.bgMusicGain.gain.value = this.musicVolume * this.masterVolume;
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  playSFX(type: 'click' | 'success' | 'error' | 'beep' | 'scan') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    switch (type) {
      case 'click':
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        break;
      case 'success':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        break;
      case 'error':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.2);
        break;
      case 'beep':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        break;
      case 'scan':
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(1000, now + 0.5);
        gain.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume, now + 0.25);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        break;
    }

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // For generated music from Gemini
  async playBackgroundMusic(base64Data: string) {
    if (this.isMuted) return;
    this.stopBackgroundMusic();
    this.initContext();
    if (!this.audioCtx) return;

    // Ensure context is running (browsers might suspend it)
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    try {
      const cleanBase64 = base64Data.replace(/\s/g, '');
      const binaryString = window.atob(cleanBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Gemini TTS returns raw 16-bit PCM at 24000Hz.
      // It does NOT return a WAV header, so decodeAudioData will fail.
      // We must manually convert PCM to AudioBuffer.
      
      // Ensure 16-bit alignment
      const alignedLen = Math.floor(bytes.length / 2) * 2;
      const int16Array = new Int16Array(bytes.buffer, 0, alignedLen / 2);
      
      const audioBuffer = this.audioCtx.createBuffer(1, int16Array.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16Array.length; i++) {
        // Convert Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
        channelData[i] = int16Array[i] / 32768.0;
      }

      const source = this.audioCtx.createBufferSource();
      const gain = this.audioCtx.createGain();
      
      source.buffer = audioBuffer;
      source.loop = true;
      gain.gain.value = this.musicVolume * this.masterVolume;
      
      source.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      source.start(0);
      this.bgMusicSource = source;
      this.bgMusicGain = gain;
      return source;
    } catch (e) {
      console.error('Error playing background music', e);
      throw e; // Re-throw to let caller know
    }
  }

  stopBackgroundMusic() {
    if (this.bgMusicSource) {
      try {
        this.bgMusicSource.stop();
      } catch (e) {}
      this.bgMusicSource = null;
      this.bgMusicGain = null;
    }
  }

  async playGeneratedAudio(base64Data: string) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    try {
      const cleanBase64 = base64Data.replace(/\s/g, '');
      const binaryString = window.atob(cleanBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Gemini TTS returns raw 16-bit PCM at 24000Hz
      const alignedLen = Math.floor(bytes.length / 2) * 2;
      const int16Array = new Int16Array(bytes.buffer, 0, alignedLen / 2);
      
      const audioBuffer = this.audioCtx.createBuffer(1, int16Array.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768.0;
      }

      const source = this.audioCtx.createBufferSource();
      const gain = this.audioCtx.createGain();
      
      source.buffer = audioBuffer;
      gain.gain.value = this.musicVolume * this.masterVolume;
      
      source.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      source.start(0);
      return source;
    } catch (e) {
      console.error('Error playing generated audio', e);
      throw e;
    }
  }
}

export const soundManager = new SoundManager();
