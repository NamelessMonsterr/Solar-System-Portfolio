import { CONFIG } from '../utils/config.js';

export class GuidedTourManager {
  constructor(camera, spaceship, planets) {
    this.camera = camera;
    this.spaceship = spaceship;
    this.planets = planets;
    this.isActive = false;
    this.currentStep = 0;
    this.tourSequence = CONFIG.GUIDED_TOUR.SEQUENCE;
    this.speed = CONFIG.GUIDED_TOUR.SPEED;
    this.pauseDuration = CONFIG.GUIDED_TOUR.PAUSE_DURATION;
    this.isPaused = false;
    this.narrationCallback = null;
  }

  init() {
    this.createTourUI();
    this.setupControls();
    console.log('✓ Guided tour system initialized');
  }

  createTourUI() {
    const container = document.createElement('div');
    container.id = 'tour-ui';
    container.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(10px);
      padding: 20px 30px;
      border-radius: 12px;
      border: 2px solid #06b6d4;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      z-index: 1500;
      min-width: 400px;
    `;

    container.innerHTML = `
      <div style="text-align: center;">
        <div style="color: #06b6d4; font-size: 14px; font-weight: 600; margin-bottom: 10px;">
          GUIDED TOUR
        </div>
        <div id="tour-planet-name" style="color: #fff; font-size: 24px; font-weight: 700; margin-bottom: 5px;">
          Mercury
        </div>
        <div id="tour-step-counter" style="color: #888; font-size: 12px;">
          1 / 9
        </div>
      </div>

      <div id="tour-narration" style="
        color: #ddd;
        font-size: 14px;
        line-height: 1.6;
        text-align: center;
        max-width: 350px;
        min-height: 60px;
      ">
        Welcome to the guided tour! We'll explore all planets in the solar system.
      </div>

      <div style="display: flex; gap: 10px;">
        <button id="tour-pause" style="
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: #fff;
          cursor: pointer;
          font-size: 13px;
        ">⏸ Pause</button>
        <button id="tour-skip" style="
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: #fff;
          cursor: pointer;
          font-size: 13px;
        ">⏭ Skip</button>
        <button id="tour-stop" style="
          padding: 10px 20px;
          background: rgba(255, 0, 0, 0.2);
          border: 1px solid rgba(255, 0, 0, 0.4);
          border-radius: 6px;
          color: #ff4444;
          cursor: pointer;
          font-size: 13px;
        ">⏹ Stop Tour</button>
      </div>

      <div style="
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
      ">
        <div id="tour-progress" style="
          width: 0%;
          height: 100%;
          background: linear-gradient(90deg, #06b6d4, #0891b2);
          transition: width 0.3s;
        "></div>
      </div>
    `;

    document.body.appendChild(container);
    this.tourUI = container;

    // Create start button
    const startBtn = document.createElement('button');
    startBtn.id = 'tour-start-btn';
    startBtn.innerHTML = '🎯 Start Guided Tour';
    startBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #06b6d4, #0891b2);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(6, 182, 212, 0.4);
      z-index: 1500;
      font-size: 14px;
      transition: transform 0.2s;
    `;
    startBtn.onmouseover = () => startBtn.style.transform = 'scale(1.05)';
    startBtn.onmouseout = () => startBtn.style.transform = 'scale(1)';
    startBtn.onclick = () => this.start();
    document.body.appendChild(startBtn);
  }

  setupControls() {
    document.getElementById('tour-pause').onclick = () => this.togglePause();
    document.getElementById('tour-skip').onclick = () => this.skip();
    document.getElementById('tour-stop').onclick = () => this.stop();
  }

  start() {
    if (this.isActive) return;

    this.isActive = true;
    this.currentStep = 0;
    this.isPaused = false;

    if (this.tourUI) {
      this.tourUI.style.display = 'flex';
    }

    // Hide start button
    const startBtn = document.getElementById('tour-start-btn');
    if (startBtn) startBtn.style.display = 'none';

    console.log('✓ Guided tour started');
    this.goToNextPlanet();

    // Track analytics
    if (window.analyticsManager) {
      window.analyticsManager.trackEvent('tour_start');
    }
  }

  stop() {
    this.isActive = false;
    this.isPaused = false;
    this.currentStep = 0;

    if (this.tourUI) {
      this.tourUI.style.display = 'none';
    }

    // Show start button
    const startBtn = document.getElementById('tour-start-btn');
    if (startBtn) startBtn.style.display = 'block';

    console.log('✓ Guided tour stopped');

    // Track analytics
    if (window.analyticsManager) {
      const completed = this.currentStep >= this.tourSequence.length;
      window.analyticsManager.trackEvent(completed ? 'tour_complete' : 'tour_stop');
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const pauseBtn = document.getElementById('tour-pause');
    if (pauseBtn) {
      pauseBtn.innerHTML = this.isPaused ? '▶ Resume' : '⏸ Pause';
    }
  }

  skip() {
    if (!this.isActive) return;
    this.goToNextPlanet();
  }

  goToNextPlanet() {
    if (this.currentStep >= this.tourSequence.length) {
      this.stop();
      this.showCompletionMessage();
      return;
    }

    const planetName = this.tourSequence[this.currentStep];
    const planet = this.planets.find(p => p.name === planetName);

    if (!planet) {
      console.warn(`Planet not found: ${planetName}`);
      this.currentStep++;
      this.goToNextPlanet();
      return;
    }

    this.flyToPlanet(planet);
    this.updateUI(planet);
    this.currentStep++;
  }

  flyToPlanet(planet) {
    if (!this.spaceship || !planet) return;

    const targetPos = planet.worldPosition.clone();
    const size = planet.bbox.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.8;
    
    // Calculate approach position
    const direction = new THREE.Vector3()
      .subVectors(this.camera.position, targetPos)
      .normalize();
    
    const approachPos = targetPos.clone().add(direction.multiplyScalar(radius + 15));

    // Animate spaceship to position
    this.animateToPosition(approachPos, planet, () => {
      // Pause at planet
      setTimeout(() => {
        if (this.isActive && !this.isPaused) {
          this.goToNextPlanet();
        }
      }, this.pauseDuration);
    });
  }

  animateToPosition(targetPos, planet, onComplete) {
    const startPos = this.spaceship.position.clone();
    const startTime = Date.now();
    const duration = 3000; // 3 seconds

    const animate = () => {
      if (!this.isActive || this.isPaused) {
        setTimeout(animate, 100);
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing
      const eased = 1 - Math.pow(1 - progress, 3);

      // Update position
      this.spaceship.position.lerpVectors(startPos, targetPos, eased);

      // Update rotation to face planet
      const direction = new THREE.Vector3()
        .subVectors(planet.worldPosition, this.spaceship.position)
        .normalize();
      
      const targetQuaternion = new THREE.Quaternion();
      targetQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction);
      this.spaceship.quaternion.slerp(targetQuaternion, 0.1);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    animate();
  }

  updateUI(planet) {
    const nameEl = document.getElementById('tour-planet-name');
    const stepEl = document.getElementById('tour-step-counter');
    const narrationEl = document.getElementById('tour-narration');
    const progressEl = document.getElementById('tour-progress');

    if (nameEl) nameEl.textContent = planet.name;
    if (stepEl) stepEl.textContent = `${this.currentStep + 1} / ${this.tourSequence.length}`;
    
    // Get narration from chatbot knowledge
    const knowledge = CONFIG.CHATBOT.PLANET_KNOWLEDGE[planet.name] || 
                     `Exploring ${planet.name}...`;
    
    if (narrationEl) {
      narrationEl.textContent = knowledge;
      
      // Optional: Use Web Speech API for voice narration
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(knowledge);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.7;
        window.speechSynthesis.speak(utterance);
      }
    }

    if (progressEl) {
      const progress = ((this.currentStep + 1) / this.tourSequence.length) * 100;
      progressEl.style.width = `${progress}%`;
    }
  }

  showCompletionMessage() {
    const narrationEl = document.getElementById('tour-narration');
    if (narrationEl) {
      narrationEl.textContent = '🎉 Tour complete! You\'ve explored all planets in the solar system. Feel free to explore on your own now!';
    }

    setTimeout(() => {
      this.stop();
    }, 5000);
  }

  cleanup() {
    this.stop();
    if (this.tourUI) {
      this.tourUI.remove();
    }
    const startBtn = document.getElementById('tour-start-btn');
    if (startBtn) {
      startBtn.remove();
    }
  }
}
