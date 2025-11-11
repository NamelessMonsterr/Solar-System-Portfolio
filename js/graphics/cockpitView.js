export class CockpitViewManager {
  constructor(camera, spaceship) {
    this.camera = camera;
    this.spaceship = spaceship;
    this.isInsideCockpit = false;
    this.cockpitOffset = new THREE.Vector3(0, 1.2, 0.5); // Inside cockpit position
    this.thirdPersonOffset = new THREE.Vector3(0, 2, 8);
    this.hudElements = null;
    this.transitionDuration = 1000; // ms
    this.isTransitioning = false;
  }

  init() {
    this.createHUD();
    this.setupControls();
    console.log('✓ Cockpit view system initialized');
  }

  createHUD() {
    // Create HUD overlay
    const hudContainer = document.createElement('div');
    hudContainer.id = 'cockpit-hud';
    hudContainer.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      display: none;
      z-index: 1000;
    `;

    hudContainer.innerHTML = `
      <!-- Cockpit Frame -->
      <div id="cockpit-frame" style="
        position: absolute;
        inset: 0;
        border: 20px solid rgba(20, 20, 30, 0.9);
        border-radius: 20px;
        box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.8);
      "></div>

      <!-- Speed Indicator -->
      <div id="speed-indicator" style="
        position: absolute;
        bottom: 40px;
        left: 40px;
        background: rgba(0, 0, 0, 0.7);
        padding: 15px 25px;
        border-radius: 10px;
        border: 2px solid #06b6d4;
        font-family: 'Courier New', monospace;
        color: #00ff00;
      ">
        <div style="font-size: 12px; opacity: 0.7; margin-bottom: 5px;">SPEED</div>
        <div id="speed-value" style="font-size: 28px; font-weight: bold;">0.0</div>
        <div style="font-size: 10px; opacity: 0.7; margin-top: 5px;">m/s</div>
      </div>

      <!-- Altitude Indicator -->
      <div id="altitude-indicator" style="
        position: absolute;
        bottom: 40px;
        right: 40px;
        background: rgba(0, 0, 0, 0.7);
        padding: 15px 25px;
        border-radius: 10px;
        border: 2px solid #06b6d4;
        font-family: 'Courier New', monospace;
        color: #00ff00;
      ">
        <div style="font-size: 12px; opacity: 0.7; margin-bottom: 5px;">ALTITUDE</div>
        <div id="altitude-value" style="font-size: 28px; font-weight: bold;">0.0</div>
        <div style="font-size: 10px; opacity: 0.7; margin-top: 5px;">units</div>
      </div>

      <!-- Compass -->
      <div id="compass-indicator" style="
        position: absolute;
        top: 40px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        padding: 15px 30px;
        border-radius: 10px;
        border: 2px solid #06b6d4;
        font-family: 'Courier New', monospace;
        color: #00ff00;
      ">
        <div style="font-size: 12px; opacity: 0.7; margin-bottom: 5px;">HEADING</div>
        <div id="compass-value" style="font-size: 28px; font-weight: bold;">N 0°</div>
      </div>

      <!-- Target Lock -->
      <div id="target-lock" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        border: 3px solid #00ff00;
        border-radius: 50%;
        display: none;
        animation: pulse 1s infinite;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 10px;
          height: 10px;
          background: #00ff00;
          border-radius: 50%;
        "></div>
      </div>

      <!-- System Status -->
      <div id="system-status" style="
        position: absolute;
        top: 40px;
        right: 40px;
        background: rgba(0, 0, 0, 0.7);
        padding: 15px;
        border-radius: 10px;
        border: 2px solid #06b6d4;
        font-family: 'Courier New', monospace;
        color: #00ff00;
        font-size: 12px;
      ">
        <div style="margin-bottom: 8px;">
          <span style="opacity: 0.7;">ENGINE:</span>
          <span id="engine-status" style="margin-left: 10px; color: #00ff00;">ONLINE</span>
        </div>
        <div style="margin-bottom: 8px;">
          <span style="opacity: 0.7;">SHIELDS:</span>
          <span id="shield-status" style="margin-left: 10px; color: #00ff00;">100%</span>
        </div>
        <div>
          <span style="opacity: 0.7;">NAV:</span>
          <span id="nav-status" style="margin-left: 10px; color: #00ff00;">ACTIVE</span>
        </div>
      </div>

      <!-- Scanlines effect -->
      <div style="
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          0deg,
          rgba(0, 255, 0, 0.03) 0px,
          transparent 2px,
          transparent 4px,
          rgba(0, 255, 0, 0.03) 4px
        );
        pointer-events: none;
        opacity: 0.3;
      "></div>
    `;

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.5; transform: translate(-50%, -50%) scale(1.1); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(hudContainer);
    this.hudElements = {
      container: hudContainer,
      speed: document.getElementById('speed-value'),
      altitude: document.getElementById('altitude-value'),
      compass: document.getElementById('compass-value'),
      targetLock: document.getElementById('target-lock')
    };
  }

  setupControls() {
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'c' && !this.isTransitioning) {
        this.toggleView();
      }
    });
  }

  toggleView() {
    if (this.isInsideCockpit) {
      this.switchToThirdPerson();
    } else {
      this.switchToCockpit();
    }
  }

  switchToCockpit() {
    if (!this.spaceship || this.isTransitioning) return;

    this.isTransitioning = true;
    this.isInsideCockpit = true;

    // Show HUD
    if (this.hudElements && this.hudElements.container) {
      this.hudElements.container.style.display = 'block';
      this.hudElements.container.style.opacity = '0';
      
      setTimeout(() => {
        this.hudElements.container.style.transition = 'opacity 0.5s';
        this.hudElements.container.style.opacity = '1';
      }, 100);
    }

    // Animate camera transition
    this.animateCameraTransition(this.cockpitOffset, () => {
      this.isTransitioning = false;
      console.log('✓ Switched to cockpit view');
    });

    // Add cockpit sounds
    this.playCockpitSound('enter');
  }

  switchToThirdPerson() {
    if (!this.spaceship || this.isTransitioning) return;

    this.isTransitioning = true;
    this.isInsideCockpit = false;

    // Hide HUD
    if (this.hudElements && this.hudElements.container) {
      this.hudElements.container.style.transition = 'opacity 0.5s';
      this.hudElements.container.style.opacity = '0';
      
      setTimeout(() => {
        this.hudElements.container.style.display = 'none';
      }, 500);
    }

    // Animate camera transition
    this.animateCameraTransition(this.thirdPersonOffset, () => {
      this.isTransitioning = false;
      console.log('✓ Switched to third-person view');
    });

    // Add exit sound
    this.playCockpitSound('exit');
  }

  animateCameraTransition(targetOffset, onComplete) {
    const startTime = Date.now();
    const startPos = this.camera.position.clone();
    const startRot = this.camera.rotation.clone();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / this.transitionDuration, 1);
      
      // Easing function (ease-in-out)
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    animate();
  }

  update(velocity, nearbyPlanet) {
    if (!this.isInsideCockpit || !this.spaceship || !this.hudElements) return;

    // Update camera position (inside cockpit)
    const cockpitWorldPos = this.cockpitOffset.clone().applyQuaternion(this.spaceship.quaternion);
    this.camera.position.copy(this.spaceship.position).add(cockpitWorldPos);
    this.camera.rotation.copy(this.spaceship.rotation);

    // Update HUD values
    const speed = velocity.length();
    this.hudElements.speed.textContent = speed.toFixed(1);

    const altitude = this.spaceship.position.y;
    this.hudElements.altitude.textContent = altitude.toFixed(1);

    // Update compass
    const heading = ((this.spaceship.rotation.y * 180 / Math.PI) + 360) % 360;
    const direction = this.getCompassDirection(heading);
    this.hudElements.compass.textContent = `${direction} ${Math.round(heading)}°`;

    // Update target lock
    if (nearbyPlanet) {
      this.hudElements.targetLock.style.display = 'block';
    } else {
      this.hudElements.targetLock.style.display = 'none';
    }

    // Update engine status based on movement
    const engineStatus = document.getElementById('engine-status');
    if (engineStatus) {
      if (speed > 0.5) {
        engineStatus.textContent = 'THRUST';
        engineStatus.style.color = '#ffaa00';
      } else {
        engineStatus.textContent = 'ONLINE';
        engineStatus.style.color = '#00ff00';
      }
    }
  }

  getCompassDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  playCockpitSound(type) {
    // Placeholder for sound effects
    // Can be integrated with audio system
    if (window.audioManager) {
      if (type === 'enter') {
        // Play cockpit enter sound
      } else if (type === 'exit') {
        // Play cockpit exit sound
      }
    }
  }

  cleanup() {
    if (this.hudElements && this.hudElements.container) {
      this.hudElements.container.remove();
    }
  }
}
