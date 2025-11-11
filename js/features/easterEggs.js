import { CONFIG } from '../utils/config.js';

export class EasterEggsManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.enabled = CONFIG.EASTER_EGGS.ENABLED;
    this.secretCode = CONFIG.EASTER_EGGS.SECRET_CODE;
    this.keySequence = [];
    this.discoveries = new Set();
  }

  init() {
    if (!this.enabled) return;

    this.setupKonamiCode();
    this.createHiddenPlanet();
    this.setupSecretMessages();
    
    console.log('✓ Easter eggs initialized (try the Konami code!)');
  }

  setupKonamiCode() {
    let timeout;

    window.addEventListener('keydown', (e) => {
      // Add key to sequence
      this.keySequence.push(e.key);

      // Keep only last N keys
      if (this.keySequence.length > this.secretCode.length) {
        this.keySequence.shift();
      }

      // Check if sequence matches
      if (this.keySequence.length === this.secretCode.length) {
        const matches = this.keySequence.every((key, index) => 
          key === this.secretCode[index]
        );

        if (matches) {
          this.unlockKonamiReward();
          this.keySequence = [];
        }
      }

      // Reset sequence after 2 seconds of inactivity
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.keySequence = [];
      }, 2000);
    });
  }

  unlockKonamiReward() {
    if (this.discoveries.has('konami')) return;

    this.discoveries.add('konami');
    
    // Show notification
    this.showNotification(
      '🎉 Konami Code Unlocked!',
      'You\'ve discovered the secret code! Enjoy hyperspeed mode for 10 seconds!',
      '#FFD700'
    );

    // Enable hyperspeed temporarily
    this.enableHyperspeed(10000);

    // Track analytics
    if (window.analyticsManager) {
      window.analyticsManager.trackEvent('easter_egg', { type: 'konami' });
    }

    console.log('🎮 Konami code activated!');
  }

  enableHyperspeed(duration) {
    const originalSpeed = window.spaceshipSpeed || 0.6;
    window.spaceshipSpeed = originalSpeed * 5;

    // Visual effect
    const speedLines = this.createSpeedLines();
    this.scene.add(speedLines);

    setTimeout(() => {
      window.spaceshipSpeed = originalSpeed;
      this.scene.remove(speedLines);
      this.showNotification('⏱️ Hyperspeed Ended', 'Back to normal speed', '#06b6d4');
    }, duration);
  }

  createSpeedLines() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;

      positions.push(x, y, z);
      colors.push(0, 1, 1); // Cyan
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
  }

  createHiddenPlanet() {
    // Create a secret planet far from the solar system
    const geometry = new THREE.SphereGeometry(3, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xFF00FF,
      emissive: 0xFF00FF,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });

    const hiddenPlanet = new THREE.Mesh(geometry, material);
    hiddenPlanet.position.set(
      CONFIG.EASTER_EGGS.HIDDEN_PLANET.position[0],
      CONFIG.EASTER_EGGS.HIDDEN_PLANET.position[1],
      CONFIG.EASTER_EGGS.HIDDEN_PLANET.position[2]
    );

    hiddenPlanet.name = 'Planet_X';
    hiddenPlanet.userData.isEasterEgg = true;

    this.scene.add(hiddenPlanet);

    // Add a subtle hint beacon
    const beaconGeometry = new THREE.RingGeometry(4, 5, 32);
    const beaconMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF00FF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });

    const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
    beacon.rotation.x = Math.PI / 2;
    hiddenPlanet.add(beacon);

    // Animate beacon
    const animateBeacon = () => {
      if (beacon.parent) {
        beacon.rotation.z += 0.01;
        beacon.material.opacity = 0.3 + Math.sin(Date.now() * 0.003) * 0.2;
        requestAnimationFrame(animateBeacon);
      }
    };
    animateBeacon();

    console.log('🔮 Hidden planet created at coordinates:', CONFIG.EASTER_EGGS.HIDDEN_PLANET.position);
  }

  setupSecretMessages() {
    // Add hidden messages in console
    const messages = [
      '%c🌟 Welcome, Space Explorer! %c\nYou found the developer console!',
      '%c💫 Try flying really far out... you might find something special.',
      '%c🚀 Hint: Up Up Down Down Left Right Left Right B A',
      '%c⭐ This portfolio was built with Three.js, Web Audio API, and lots of ☕'
    ];

    messages.forEach(msg => {
      console.log(
        msg,
        'color: #06b6d4; font-size: 16px; font-weight: bold;',
        'color: #888; font-size: 12px;'
      );
    });

    // Add secret command
    window.revealSecrets = () => {
      console.log('%c🎁 SECRET COORDINATES:', 'color: #FFD700; font-size: 20px; font-weight: bold;');
      console.log('Hidden Planet X:', CONFIG.EASTER_EGGS.HIDDEN_PLANET.position);
      console.log('Use these coordinates to find the secret planet!');
      this.showNotification('🗺️ Secrets Revealed', 'Check the console for coordinates!', '#FFD700');
    };

    console.log('%cType %crevealSecrets()%c to get hints!', 
      'color: #888;', 'color: #FFD700; font-weight: bold;', 'color: #888;');
  }

  showNotification(title, message, color = '#06b6d4') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.8);
      background: rgba(0, 0, 0, 0.95);
      backdrop-filter: blur(10px);
      padding: 30px 40px;
      border-radius: 15px;
      border: 3px solid ${color};
      box-shadow: 0 0 30px ${color}80;
      z-index: 3000;
      text-align: center;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;

    notification.innerHTML = `
      <div style="
        font-size: 32px;
        margin-bottom: 15px;
      ">${title.match(/[\u{1F300}-\u{1F9FF}]/u)?.[0] || '🎉'}</div>
      <div style="
        color: ${color};
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 10px;
      ">${title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}</div>
      <div style="
        color: #ddd;
        font-size: 14px;
        line-height: 1.6;
      ">${message}</div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translate(-50%, -50%) scale(0.8)';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  checkProximityToSecrets(position) {
    // Check if player is near hidden planet
    const hiddenPos = new THREE.Vector3(...CONFIG.EASTER_EGGS.HIDDEN_PLANET.position);
    const distance = position.distanceTo(hiddenPos);

    if (distance < 50 && !this.discoveries.has('hiddenPlanet')) {
      this.discoveries.add('hiddenPlanet');
      this.showNotification(
        '🔮 Secret Planet Discovered!',
        'You found Planet X! A mysterious world hidden from the solar system.',
        '#FF00FF'
      );

      if (window.analyticsManager) {
        window.analyticsManager.trackEvent('easter_egg', { type: 'hidden_planet' });
      }
    }
  }

  getDiscoveries() {
    return Array.from(this.discoveries);
  }

  cleanup() {
    this.keySequence = [];
    this.discoveries.clear();
  }
}
