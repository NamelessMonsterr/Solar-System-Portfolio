import { CONFIG } from '../utils/config.js';

export class SpaceshipSelector {
  constructor(scene, onShipChanged) {
    this.scene = scene;
    this.onShipChanged = onShipChanged;
    this.currentShip = null;
    this.currentShipId = CONFIG.SPACESHIP.DEFAULT_MODEL;
    this.loadedModels = new Map();
    this.isLoading = false;
  }

  init() {
    this.createSelectorUI();
    console.log('✓ Spaceship selector initialized');
  }

  createSelectorUI() {
    const container = document.createElement('div');
    container.id = 'ship-selector';
    container.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(10px);
      padding: 15px;
      border-radius: 10px;
      border: 2px solid #06b6d4;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      z-index: 1500;
      min-width: 250px;
    `;

    container.innerHTML = `
      <div style="
        color: #06b6d4;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span>🚀</span>
        <span data-i18n="shipSelector.title">Select Spaceship</span>
      </div>

      <div id="ship-options" style="
        display: flex;
        flex-direction: column;
        gap: 10px;
      "></div>

      <div id="ship-loading" style="
        display: none;
        text-align: center;
        padding: 10px;
        color: #06b6d4;
        font-size: 12px;
      ">
        <div style="margin-bottom: 5px;">⏳</div>
        <div>Loading spaceship...</div>
      </div>
    `;

    // Create ship option buttons
    const optionsContainer = container.querySelector('#ship-options');
    CONFIG.SPACESHIP.MODELS.forEach(model => {
      const btn = document.createElement('button');
      btn.className = 'ship-option';
      btn.dataset.shipId = model.id;
      btn.style.cssText = `
        padding: 12px 15px;
        background: ${model.id === this.currentShipId ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
        border: 2px solid ${model.id === this.currentShipId ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'};
        border-radius: 8px;
        color: #fff;
        cursor: pointer;
        font-size: 13px;
        text-align: left;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: space-between;
      `;

      btn.innerHTML = `
        <div>
          <div style="font-weight: 600; margin-bottom: 3px;">${model.name}</div>
          <div style="font-size: 11px; opacity: 0.7;">Scale: ${model.scale}</div>
        </div>
        ${model.id === this.currentShipId ? '<div style="color: #06b6d4;">✓</div>' : ''}
      `;

      btn.onmouseover = () => {
        if (model.id !== this.currentShipId) {
          btn.style.background = 'rgba(6, 182, 212, 0.15)';
          btn.style.borderColor = 'rgba(6, 182, 212, 0.5)';
        }
      };

      btn.onmouseout = () => {
        if (model.id !== this.currentShipId) {
          btn.style.background = 'rgba(255, 255, 255, 0.05)';
          btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
      };

      btn.onclick = () => this.selectShip(model.id);

      optionsContainer.appendChild(btn);
    });

    document.body.appendChild(container);
  }

  async selectShip(shipId) {
    if (this.isLoading || shipId === this.currentShipId) return;

    const model = CONFIG.SPACESHIP.MODELS.find(m => m.id === shipId);
    if (!model) return;

    this.isLoading = true;
    this.showLoading(true);

    try {
      // Load ship if not already loaded
      if (!this.loadedModels.has(shipId)) {
        await this.loadShipModel(model);
      }

      // Get loaded ship
      const newShip = this.loadedModels.get(shipId);
      
      if (newShip) {
        // Transfer position and rotation from current ship
        if (this.currentShip) {
          newShip.position.copy(this.currentShip.position);
          newShip.rotation.copy(this.currentShip.rotation);
          newShip.quaternion.copy(this.currentShip.quaternion);
          
          // Remove old ship
          this.scene.remove(this.currentShip);
        }

        // Add new ship to scene
        this.scene.add(newShip);
        this.currentShip = newShip;
        this.currentShipId = shipId;

        // Update UI
        this.updateButtonStates();

        // Callback
        if (this.onShipChanged) {
          this.onShipChanged(newShip);
        }

        console.log(`✓ Switched to spaceship: ${model.name}`);

        // Track analytics
        if (window.analyticsManager) {
          window.analyticsManager.trackEvent('ship_change', { shipId, shipName: model.name });
        }
      }
    } catch (error) {
      console.error(`Failed to load spaceship ${shipId}:`, error);
      alert(`Failed to load ${model.name}. Please try again.`);
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  async loadShipModel(model) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.GLTFLoader();
      
      // Use DRACO loader if available
      if (typeof THREE.DRACOLoader !== 'undefined') {
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        loader.setDRACOLoader(dracoLoader);
      }

      const path = model.file.startsWith('spaceships/') 
        ? `resources/${model.file}` 
        : `resources/spaceships/${model.file}`;

      loader.load(
        path,
        (gltf) => {
          const ship = gltf.scene || gltf.scenes[0];
          
          if (!ship) {
            reject(new Error('No scene in GLB file'));
            return;
          }

          // Set scale
          ship.scale.setScalar(model.scale);

          // Enhance materials
          ship.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.needsUpdate = true;
                    if (mat.map) mat.map.needsUpdate = true;
                  });
                } else {
                  child.material.needsUpdate = true;
                  if (child.material.map) child.material.map.needsUpdate = true;
                }
              }
            }
          });

          this.loadedModels.set(model.id, ship);
          console.log(`✓ Loaded spaceship model: ${model.name}`);
          resolve(ship);
        },
        undefined,
        (error) => {
          console.error(`Error loading ${model.name}:`, error);
          reject(error);
        }
      );
    });
  }

  updateButtonStates() {
    const buttons = document.querySelectorAll('.ship-option');
    buttons.forEach(btn => {
      const shipId = btn.dataset.shipId;
      const isActive = shipId === this.currentShipId;
      
      btn.style.background = isActive ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.05)';
      btn.style.borderColor = isActive ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)';
      
      // Update checkmark
      const checkmark = btn.querySelector('div:last-child');
      if (checkmark) {
        checkmark.innerHTML = isActive ? '✓' : '';
        checkmark.style.color = '#06b6d4';
      } else if (isActive) {
        const check = document.createElement('div');
        check.style.color = '#06b6d4';
        check.textContent = '✓';
        btn.appendChild(check);
      }
    });
  }

  showLoading(show) {
    const loadingEl = document.getElementById('ship-loading');
    const optionsEl = document.getElementById('ship-options');
    
    if (loadingEl && optionsEl) {
      loadingEl.style.display = show ? 'block' : 'none';
      optionsEl.style.opacity = show ? '0.5' : '1';
      optionsEl.style.pointerEvents = show ? 'none' : 'auto';
    }
  }

  getCurrentShip() {
    return this.currentShip;
  }

  cleanup() {
    const selector = document.getElementById('ship-selector');
    if (selector) {
      selector.remove();
    }
  }
}
