import { CONFIG } from '../utils/config.js';

export class ProceduralMusicGenerator {
  constructor() {
    this.audioContext = null;
    this.mainAmbient = null;
    this.planetAudio = new Map();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume on user interaction
      const resumeAudio = () => {
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume().then(() => {
            
          });
        }
      };
      
      document.addEventListener('click', resumeAudio, { once: true });
      document.addEventListener('keydown', resumeAudio, { once: true });
      document.addEventListener('touchstart', resumeAudio, { once: true });
      
      this.createMainAmbient();
      this.createPlanetAudio();
      
      this.initialized = true;
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize audio:', error);
      this.initialized = false;
    }
  }

  setAudioValue(param, value) {
    if (param && Number.isFinite(value)) {
      param.value = value;
    }
  }

  createMainAmbient() {
    const config = CONFIG.AUDIO.MAIN_AMBIENT;
    const lfoFreq = Number.isFinite(config.lfoFrequency) ? config.lfoFrequency : 0.2;
    const lfoAmt = Number.isFinite(config.lfoAmount) ? config.lfoAmount : 0.5;
    const oscillators = [];
    const gains = [];

    // Create layered oscillators
    config.waveforms.forEach((waveform, index) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = typeof waveform === 'string' ? waveform : 'sine';
      const freq = Number.isFinite(config.frequencies[index]) ? config.frequencies[index] : 220;
      const vol = Number.isFinite(config.volumes[index]) ? config.volumes[index] : 0.02;
      this.setAudioValue(osc.frequency, freq);
      this.setAudioValue(gain.gain, vol);
      
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      
      oscillators.push(osc);
      gains.push(gain);
    });

    // Add LFO for movement
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    
    lfo.type = 'sine';
    this.setAudioValue(lfo.frequency, lfoFreq);
    this.setAudioValue(lfoGain.gain, lfoAmt);
    
    lfo.connect(lfoGain);
    if (gains[1] && gains[1].gain) {
      lfoGain.connect(gains[1].gain);
    }
    
    // Start all
    oscillators.forEach(osc => osc.start());
    lfo.start();

    this.mainAmbient = {
      oscillators,
      gains,
      lfo,
      masterGain: gains[0] // Use first gain for global volume
    };

    
  }

  createPlanetAudio() {
    Object.entries(CONFIG.AUDIO.PLANETS).forEach(([planetName, config]) => {
      const planetAudioData = this.createPlanetOscillators(planetName, config);
      this.planetAudio.set(planetName, planetAudioData);
    });

    
  }

  createPlanetOscillators(planetName, config) {
    const waveform = typeof config.waveform === 'string' ? config.waveform : 'sine';
    const volume = Number.isFinite(config.volume) ? config.volume : 1;
    const oscillators = [];
    const panner = this.audioContext.createPanner();
    const masterGain = this.audioContext.createGain();

    // Configure spatial panner
    panner.panningModel = CONFIG.AUDIO.SPATIAL.panningModel;
    panner.distanceModel = CONFIG.AUDIO.SPATIAL.distanceModel;
    panner.refDistance = CONFIG.AUDIO.SPATIAL.refDistance;
    panner.maxDistance = CONFIG.AUDIO.SPATIAL.maxDistance;
    panner.rolloffFactor = CONFIG.AUDIO.SPATIAL.rolloffFactor;

    // Create multiple oscillators for richness
    const freqs = Array.isArray(config.frequencies) && config.frequencies.length > 0 ? config.frequencies : [220];
    freqs.forEach((freq) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = waveform;
      this.setAudioValue(osc.frequency, Number.isFinite(freq) ? freq : 0);
      const g = volume / freqs.length;
      this.setAudioValue(gain.gain, g);
      
      // Add slight detuning for chorus effect
      osc.detune.value = (Math.random() - 0.5) * 8;
      
      osc.connect(gain);
      gain.connect(panner);
      
      oscillators.push({ osc, gain });
    });

    // Add LFO for modulation
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    
    lfo.type = 'sine';
    this.setAudioValue(lfo.frequency, 0.3 + Math.random() * 0.4);
    this.setAudioValue(lfoGain.gain, 2);
    
    lfo.connect(lfoGain);
    if (oscillators[0]) {
      lfoGain.connect(oscillators[0].osc.frequency);
    }

    // Connect to master gain
    this.setAudioValue(masterGain.gain, 0);
    panner.connect(masterGain);
    masterGain.connect(this.audioContext.destination);

    // Start all
    oscillators.forEach(({ osc }) => osc.start());
    lfo.start();

    return {
      oscillators,
      panner,
      masterGain,
      lfo,
      config: { ...config, waveform, volume },
      isPlaying: true
    };
  }

  updateListenerPosition(position, orientation) {
    if (!this.audioContext || !this.initialized) return;

    const listener = this.audioContext.listener;
    
    if (listener.positionX) {
      listener.positionX.value = position.x;
      listener.positionY.value = position.y;
      listener.positionZ.value = position.z;
      
      listener.forwardX.value = orientation.forward.x;
      listener.forwardY.value = orientation.forward.y;
      listener.forwardZ.value = orientation.forward.z;
      
      listener.upX.value = orientation.up.x;
      listener.upY.value = orientation.up.y;
      listener.upZ.value = orientation.up.z;
    } else {
      // Fallback for older browsers
      listener.setPosition(position.x, position.y, position.z);
      listener.setOrientation(
        orientation.forward.x, orientation.forward.y, orientation.forward.z,
        orientation.up.x, orientation.up.y, orientation.up.z
      );
    }
  }

  updatePlanetPosition(planetName, position) {
    const audioData = this.planetAudio.get(planetName);
    if (!audioData) return;

    audioData.panner.setPosition(position.x, position.y, position.z);
  }

  updatePlanetVolumes(closestPlanet, distance) {
    if (!this.initialized) return;

    const fadeDistance = 50;
    const planetVolume = Math.max(0, Math.min(1, 1 - (distance / fadeDistance)));
    const backgroundVolume = 1 - (planetVolume * 0.7);

    // Update background music
    if (this.mainAmbient && this.mainAmbient.masterGain) {
      this.mainAmbient.masterGain.gain.linearRampToValueAtTime(
        backgroundVolume * 0.03,
        this.audioContext.currentTime + 0.5
      );
    }

    // Update planet volumes
    this.planetAudio.forEach((audioData, planetName) => {
      const isClosest = planetName === closestPlanet;
      const targetVolume = isClosest ? planetVolume * audioData.config.volume * 0.15 : 0;
      
      audioData.masterGain.gain.linearRampToValueAtTime(
        targetVolume,
        this.audioContext.currentTime + 0.5
      );
    });
  }

  setMainVolume(volume) {
    if (this.mainAmbient && this.mainAmbient.masterGain) {
      this.mainAmbient.masterGain.gain.linearRampToValueAtTime(
        volume * 0.03,
        this.audioContext.currentTime + 0.3
      );
    }
  }

  cleanup() {
    // Stop all oscillators
    if (this.mainAmbient) {
      this.mainAmbient.oscillators.forEach(osc => osc.stop());
      if (this.mainAmbient.lfo) this.mainAmbient.lfo.stop();
    }

    this.planetAudio.forEach(audioData => {
      audioData.oscillators.forEach(({ osc }) => osc.stop());
      if (audioData.lfo) audioData.lfo.stop();
    });

    if (this.audioContext) {
      this.audioContext.close();
    }

    this.initialized = false;
  }
}
