import { CONFIG } from '../utils/config.js';

export class ProceduralMusicGenerator {
  constructor() {
    this.audioContext = null;
    this.mainAmbient = null;
    this.planetAudio = new Map();
    this.initialized = false;
    this.started = false;
    this.resumeAudioHandler = null;
  }

  async init() {
    if (this.initialized) {
      this.stopAllAudio();
      // Remove old event listeners
      if (this.resumeAudioHandler) {
        document.removeEventListener('pointerdown', this.resumeAudioHandler);
        document.removeEventListener('click', this.resumeAudioHandler);
        document.removeEventListener('keydown', this.resumeAudioHandler);
        document.removeEventListener('touchstart', this.resumeAudioHandler);
      }
    }

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      this.resumeAudioHandler = () => {
        this.resumeAudio();
      };
      document.addEventListener('pointerdown', this.resumeAudioHandler, { once: true });
      document.addEventListener('click', this.resumeAudioHandler, { once: true });
      document.addEventListener('keydown', this.resumeAudioHandler, { once: true });
      document.addEventListener('touchstart', this.resumeAudioHandler, { once: true });

      this.initialized = true;

    } catch (error) {
      this.initialized = false;
    }
  }

  start() {
    if (this.started) return;
    if (!this.audioContext) return;
    this.createMainAmbient();
    this.createPlanetAudio();
    this.started = true;
  }

  async resumeAudio() {
    if (!this.audioContext) return;
    const doStart = () => {
      if (this.audioContext.state === 'running') {
        this.start();
      }
    };
    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        doStart();
      } else {
        doStart();
      }
    } catch (e) { /* ignore */ }
  }

  stopAllAudio() {
    if (this.mainAmbient) {
      if (this.mainAmbient.oscillators) {
        this.mainAmbient.oscillators.forEach(osc => {
          try { osc.stop(); } catch (e) { /* ignore */ }
        });
      }
      if (this.mainAmbient.lfo) {
        try { this.mainAmbient.lfo.stop(); } catch (e) { /* ignore */ }
      }
      this.mainAmbient = null;
    }
    
    if (this.planetAudio) {
      this.planetAudio.forEach(audioData => {
        if (audioData.oscillators) {
          audioData.oscillators.forEach(({ osc }) => {
            try { osc.stop(); } catch (e) { /* ignore */ }
          });
        }
        if (audioData.lfo) {
          try { audioData.lfo.stop(); } catch (e) { /* ignore */ }
        }
      });
      this.planetAudio.clear();
    }
    this.started = false;
  }

  setAudioValue(param, value) {
    if (param && Number.isFinite(value)) {
      param.value = value;
    }
  }

  createMainAmbient() {
    // Create beautiful, melodic ambient music using music theory
    const oscillators = [];
    const gains = [];

    // Use C major scale frequencies for pleasant, melodic sound
    const cMajorScale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C4 to C5
    const chordTones = [0, 2, 4]; // C major chord (C, E, G)

    // Create a gentle C major chord with soft sine waves
    chordTones.forEach((scaleIndex, index) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine'; // Use pure sine waves for smooth, pleasant sound
      const freq = cMajorScale[scaleIndex];
      const vol = 0.015 * (1 - index * 0.2); // Softer volume, decreasing for higher notes

      this.setAudioValue(osc.frequency, freq);
      this.setAudioValue(gain.gain, 0); // Start silent

      // Gentle fade in to avoid harsh starts
      gain.gain.setTargetAtTime(vol, this.audioContext.currentTime, 2.0);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      oscillators.push(osc);
      gains.push(gain);
    });
    
    // Add subtle slow LFO for breathing effect (very gentle)
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    
    lfo.type = 'sine';
    this.setAudioValue(lfo.frequency, 0.1); // Very slow 0.1 Hz for gentle breathing
    this.setAudioValue(lfoGain.gain, 0.3); // Very gentle modulation
    
    lfo.connect(lfoGain);
    if (gains[1] && gains[1].gain) {
      lfoGain.connect(gains[1].gain); // Modulate the middle note slightly
    }
    
    // Start all with gentle timing
    oscillators.forEach((osc, i) => {
      osc.start(this.audioContext.currentTime + i * 0.5); // Stagger start times
    });
    lfo.start();

    this.mainAmbient = {
      oscillators,
      gains,
      lfo,
      masterGain: gains[0]
    };
  }

  createPlanetAudio() {
    Object.entries(CONFIG.AUDIO.PLANETS).forEach(([planetName, config]) => {
      const planetAudioData = this.createPlanetOscillators(planetName, config);
      this.planetAudio.set(planetName, planetAudioData);
    });

    
  }

  createPlanetOscillators(planetName, config) {
    // Create beautiful, melodic planet tones using musical harmony
    const oscillators = [];
    const panner = this.audioContext.createPanner();
    const masterGain = this.audioContext.createGain();
    const volume = Number.isFinite(config.volume) ? config.volume : 0.4;

    // Configure spatial panner for 3D positioning
    panner.panningModel = CONFIG.AUDIO.SPATIAL.panningModel;
    panner.distanceModel = CONFIG.AUDIO.SPATIAL.distanceModel;
    panner.refDistance = CONFIG.AUDIO.SPATIAL.refDistance;
    panner.maxDistance = CONFIG.AUDIO.SPATIAL.maxDistance;
    panner.rolloffFactor = CONFIG.AUDIO.SPATIAL.rolloffFactor;

    // Use pleasant musical intervals based on planet characteristics
    const baseFreqs = Array.isArray(config.frequencies) && config.frequencies.length > 0 ? config.frequencies : [261.63];
    
    // Create harmonic intervals (octave, fifth, third) for each planet
    baseFreqs.forEach((baseFreq) => {
      const harmonicIntervals = [1, 1.5, 2]; // Unison, perfect fifth, octave
      
      harmonicIntervals.forEach((interval, intervalIndex) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        // Use sine or triangle waves for smooth, pleasant sound
        osc.type = intervalIndex === 0 ? 'sine' : 'triangle';
        
        const freq = Number.isFinite(baseFreq) ? baseFreq * interval : 261.63 * interval;
        this.setAudioValue(osc.frequency, freq);
        
        // Softer volumes for harmonic overtones
        const harmonicVolume = volume / (intervalIndex + 1) * 0.3;
        this.setAudioValue(gain.gain, 0); // Start silent
        
        // Gentle fade in
        gain.gain.setTargetAtTime(harmonicVolume, this.audioContext.currentTime, 1.5);
        
        osc.connect(gain);
        gain.connect(panner);
        
        oscillators.push({ osc, gain, interval });
      });
    });

    // Add very gentle LFO for subtle movement (slow and smooth)
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    
    lfo.type = 'sine';
    this.setAudioValue(lfo.frequency, 0.2); // Very slow 0.2 Hz
    this.setAudioValue(lfoGain.gain, 0.5); // Very gentle modulation
    
    lfo.connect(lfoGain);
    if (oscillators[0]) {
      lfoGain.connect(oscillators[0].osc.frequency); // Gentle frequency modulation
    }

    // Connect to master gain with smooth transitions
    this.setAudioValue(masterGain.gain, 0);
    panner.connect(masterGain);
    masterGain.connect(this.audioContext.destination);

    // Start all oscillators with gentle timing
    oscillators.forEach(({ osc }, index) => {
      osc.start(this.audioContext.currentTime + index * 0.3); // Staggered starts
    });
    lfo.start();

    return {
      oscillators,
      panner,
      masterGain,
      lfo,
      config: { ...config, volume },
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
