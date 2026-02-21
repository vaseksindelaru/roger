
class SoundManager {
  private audioCtx: AudioContext | null = null;
  private masterVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private musicVolume: number = 0.3;
  private isMuted: boolean = false;
  private bgMusicSource: AudioBufferSourceNode | null = null;
  private bgMusicGain: GainNode | null = null;
  private bgMusicEndedHandler: (() => void) | null = null;
  private bgMusicPlayToken: number = 0;
  private activeMusicSources: Set<AudioBufferSourceNode> = new Set();

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

  private clearBackgroundMusicSource() {
    // Stop and clear the primary background music source
    if (this.bgMusicSource) {
      try {
        this.bgMusicSource.onended = null;
        this.bgMusicSource.stop(0);
      } catch (e) {
        // Source may have already stopped or been garbage collected
      }
      this.bgMusicSource = null;
      this.bgMusicGain = null;
    }
    // Stop any additional active music sources
    if (this.activeMusicSources.size) {
      for (const source of Array.from(this.activeMusicSources)) {
        try {
          source.onended = null;
          source.stop(0);
        } catch (e) {
          // Source may have already stopped or been garbage collected
        }
      }
      this.activeMusicSources.clear();
    }
    this.bgMusicEndedHandler = null;
  }

  private decodeBase64ToBytes(base64Data: string): Uint8Array {
    const cleanBase64 = base64Data
      .replace(/^data:audio\/[^;]+;base64,/i, '')
      .replace(/\s/g, '');

    const binaryString = window.atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private decodePcm16MonoAudio(bytes: Uint8Array): AudioBuffer {
    if (!this.audioCtx) {
      throw new Error('AudioContext no inicializado.');
    }

    const alignedLen = Math.floor(bytes.byteLength / 2) * 2;
    const sampleCount = alignedLen / 2;
    const audioBuffer = this.audioCtx.createBuffer(1, sampleCount, 24000);
    const channelData = audioBuffer.getChannelData(0);
    const view = new DataView(bytes.buffer, bytes.byteOffset, alignedLen);

    for (let i = 0; i < sampleCount; i++) {
      channelData[i] = view.getInt16(i * 2, true) / 32768.0;
    }

    return audioBuffer;
  }

  private async decodeGeneratedAudio(base64Data: string): Promise<AudioBuffer> {
    if (!this.audioCtx) {
      throw new Error('AudioContext no inicializado.');
    }

    const bytes = this.decodeBase64ToBytes(base64Data);
    const encodedBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;

    try {
      // If provider returns WAV/MP3/OGG, let browser decode it directly.
      return await this.audioCtx.decodeAudioData(encodedBuffer.slice(0));
    } catch {
      // Fallback for raw PCM16 mono @24kHz.
      return this.decodePcm16MonoAudio(bytes);
    }
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
  async playBackgroundMusic(
    base64Data: string,
    options?: {
      loop?: boolean;
      onEnded?: () => void;
    }
  ) {
    if (this.isMuted) return;
    const playToken = ++this.bgMusicPlayToken;
    this.clearBackgroundMusicSource();
    this.initContext();
    if (!this.audioCtx) return;

    // Ensure context is running (browsers might suspend it)
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    try {
      const audioBuffer = await this.decodeGeneratedAudio(base64Data);
      if (playToken !== this.bgMusicPlayToken) {
        // A newer play request or an explicit stop happened while decoding.
        return;
      }

      const source = this.audioCtx.createBufferSource();
      const gain = this.audioCtx.createGain();
      
      source.buffer = audioBuffer;
      source.loop = options?.loop ?? true;
      gain.gain.value = this.musicVolume * this.masterVolume;
      
      source.connect(gain);
      gain.connect(this.audioCtx.destination);

      this.bgMusicEndedHandler = options?.onEnded || null;
      this.activeMusicSources.add(source);
      source.onended = () => {
        this.activeMusicSources.delete(source);
        if (this.bgMusicSource === source) {
          this.bgMusicSource = null;
          this.bgMusicGain = null;
        }
        if (this.bgMusicEndedHandler) {
          this.bgMusicEndedHandler();
        }
      };
      
      source.start(0);
      if (playToken !== this.bgMusicPlayToken) {
        try {
          source.onended = null;
          source.stop();
        } catch (e) {}
        return;
      }
      this.bgMusicSource = source;
      this.bgMusicGain = gain;
      return source;
    } catch (e) {
      console.error('Error playing background music', e);
      throw e; // Re-throw to let caller know
    }
  }

  stopBackgroundMusic() {
    this.bgMusicPlayToken += 1;
    this.clearBackgroundMusicSource();
  }

  stopAllAudio() {
    this.stopBackgroundMusic();

    if (typeof document !== 'undefined') {
      const mediaElements = document.querySelectorAll('audio,video');
      mediaElements.forEach((el) => {
        const media = el as HTMLMediaElement;
        try {
          media.pause();
          if (!Number.isNaN(media.duration)) {
            media.currentTime = 0;
          }
        } catch (e) {}
      });
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
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
      const audioBuffer = await this.decodeGeneratedAudio(base64Data);

      const source = this.audioCtx.createBufferSource();
      const gain = this.audioCtx.createGain();
      
      source.buffer = audioBuffer;
      gain.gain.value = this.musicVolume * this.masterVolume;
      
      source.connect(gain);
      gain.connect(this.audioCtx.destination);

      this.activeMusicSources.add(source);
      source.onended = () => {
        this.activeMusicSources.delete(source);
      };
      
      source.start(0);
      return source;
    } catch (e) {
      console.error('Error playing generated audio', e);
      throw e;
    }
  }
}

export const soundManager = new SoundManager();
