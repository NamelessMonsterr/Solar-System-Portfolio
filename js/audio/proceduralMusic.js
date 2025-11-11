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
            console.log('✓ Audio context resumed');
          });
        }
      };
      
      document.addEventListener('click', resumeAudio, { once: true });
      document.addEventListener('keydown', resumeAudio, { once: true });
      document.addEventListener('touchstart', resumeAudio, { once: true });
      
      this.createMainAmbient();
      this.createPlanetAudio();
      
      this.initialized = true;
      console.log('✓ Procedural music system initialized');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  createMainAmbient() {
    const config = CONFIG.AUDIO.MAIN_AMBIENT;
    const oscillators = [];
    const gains = [];

    // Create layered oscillators
    config.waveforms.forEach((waveform, index) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = waveform;
      osc.frequency.value = config.frequencies[index];
      gain.gain.value = config.volumes[index];
      
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      
      oscillators.push(osc);
      gains.push(gain);
    });

    // Add LFO for movement
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    
    lfo.type = 'sine';
    lfo.frequency.value = config.lfoFrequency;
    lfoGain.gain.value = config.lfoAmount;
    
    lfo.connect(lfoGain);
    lfoGain.connect(gains[1].gain); // Modulate middle layer
    
    // Start all
    oscillators.forEach(osc => osc.start());
    lfo.start();

    this.mainAmbient = {
      oscillators,
      gains,
      lfo,
      masterGain: gains[0] // Use first gain for global volume
    };

    console.log('✓ Main ambient music created');
  }

  createPlanetAudio() {
    Object.entries(CONFIG.AUDIO.PLANETS).forEach(([planetName, config]) => {
      const planetAudioData = this.createPlanetOscillators(planetName, config);
      this.planetAudio.set(planetName, planetAudioData);
    });

    console.log(`✓ Created audio for ${this.planetAudio.size} planets`);
  }

  createPlanetOscillators(planetName, config) {
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
    config.frequencies.forEach((freq, index) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = config.waveform;
      osc.frequency.value = freq;
      gain.gain.value = config.volume / config.frequencies.length;
      
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
    lfo.frequency.value = 0.3 + Math.random() * 0.4;
    lfoGain.gain.value = 2;
    
    lfo.connect(lfoGain);
    if (oscillators[0]) {
      lfoGain.connect(oscillators[0].osc.frequency);
    }

    // Connect to master gain
    masterGain.gain.value = 0; // Start silent
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
      config,
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
