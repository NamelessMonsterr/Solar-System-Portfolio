import * as THREE from 'three';

// VFX Manager - Visual effects controller
export class VFXManager {
  constructor(scene) {
    this.scene = scene;
    this.particleSystem = null;
    this.engineGlow = null;
    this.trailPoints = [];
  }

  init(spaceship) {
    if (!this.scene || !spaceship) return;
    
    try {
      this.createParticleSystem(spaceship);
      this.createEngineGlow(spaceship);
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('VFX initialization failed:', error);
    }
  }

  createParticleSystem(spaceship) {
    const particleCount = 25;
    
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Initialize particle positions at spaceship
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = spaceship.position.x;
      positions[i + 1] = spaceship.position.y;
      positions[i + 2] = spaceship.position.z;
      
      // Cyan color for particles
      colors[i] = 0.2;
      colors[i + 1] = 0.8;
      colors[i + 2] = 1.0;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    this.particleSystem = new THREE.Points(particles, particleMaterial);
    this.scene.add(this.particleSystem);
  }

  createEngineGlow(spaceship) {
    const glowGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    
    this.engineGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    if (spaceship && spaceship.position) {
      this.engineGlow.position.copy(spaceship.position);
    }
    this.scene.add(this.engineGlow);
  }

  update(spaceship, velocity) {
    if (!spaceship || !this.particleSystem || !this.engineGlow) return;
    
    try {
      const isMoving = velocity.length() > 0.1;
      
      if (isMoving) {
        // Update particle trail
        const positions = this.particleSystem.geometry.attributes.position.array;
        const particleCount = positions.length / 3;
        
        // Shift particles back
        for (let i = particleCount - 1; i > 0; i--) {
          const i3 = i * 3;
          const prevI3 = (i - 1) * 3;
          
          positions[i3] = positions[prevI3];
          positions[i3 + 1] = positions[prevI3 + 1];
          positions[i3 + 2] = positions[prevI3 + 2];
        }
        
        // Add new particle at spaceship position
        positions[0] = spaceship.position.x;
        positions[1] = spaceship.position.y;
        positions[2] = spaceship.position.z;
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.particleSystem.visible = true;
        
        // Update engine glow position
        const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(spaceship.quaternion);
        this.engineGlow.position.copy(spaceship.position);
        this.engineGlow.position.add(backward.multiplyScalar(-1.5));
        this.engineGlow.visible = true;
        
        // Pulse engine glow
        const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.5;
        this.engineGlow.material.opacity = pulse;
      } else {
        this.particleSystem.visible = false;
        this.engineGlow.visible = false;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('VFX update failed:', error);
    }
  }

  cleanup() {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      this.particleSystem.material.dispose();
    }
    
    if (this.engineGlow) {
      this.scene.remove(this.engineGlow);
      this.engineGlow.geometry.dispose();
      this.engineGlow.material.dispose();
    }
  }
}