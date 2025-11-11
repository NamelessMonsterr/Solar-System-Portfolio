// Spatial Audio System - 3D positional audio
import { CONFIG } from '../utils/config.js';

export class SpatialAudioSystem {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.sources = new Map();
    this.listener = audioContext.listener;
  }

  createSource(id, position = { x: 0, y: 0, z: 0 }) {
    const panner = this.audioContext.createPanner();
    
    // Configure spatial audio
    panner.panningModel = CONFIG.AUDIO.SPATIAL.panningModel;
    panner.distanceModel = CONFIG.AUDIO.SPATIAL.distanceModel;
    panner.refDistance = CONFIG.AUDIO.SPATIAL.refDistance;
    panner.maxDistance = CONFIG.AUDIO.SPATIAL.maxDistance;
    panner.rolloffFactor = CONFIG.AUDIO.SPATIAL.rolloffFactor;
    
    // Set initial position
    panner.setPosition(position.x, position.y, position.z);
    
    this.sources.set(id, { panner, position });
    
    return panner;
  }

  updateSourcePosition(id, position) {
    const source = this.sources.get(id);
    if (source) {
      source.panner.setPosition(position.x, position.y, position.z);
      source.position = position;
    }
  }

  updateListenerPosition(position, orientation) {
    if (!this.listener) return;

    const listener = this.listener;
    
    if (listener.positionX) {
      // Modern API
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

  removeSource(id) {
    this.sources.delete(id);
  }

  cleanup() {
    this.sources.clear();
  }
}
