// Audio Manager - Central audio controller



export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.mainAmbient = null;
    this.planetAudio = new Map();
    this.initialized = false;
    this.masterVolume = 0.5;
  }

  async init() {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume on user interaction
      const resumeAudio = () => {
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume().then(() => {
            console.log('✓ Audio context resumed');
          });
        }
      };
      
      document.addEventListener('click', resumeAudio, { once: true });
      document.addEventListener('keydown', resumeAudio, { once: true });
      document.addEventListener('touchstart', resumeAudio, { once: true });
      
      this.initialized = true;
      console.log('✓ Audio Manager initialized');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  getMasterVolume() {
    return this.masterVolume;
  }

  getAudioContext() {
    return this.audioContext;
  }

  isInitialized() {
    return this.initialized;
  }

  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.initialized = false;
  }
}