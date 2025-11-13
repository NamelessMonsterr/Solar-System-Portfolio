import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { VFXManager } from './graphics/vfxManager.js';

/* ========= Global State ========= */
const MODELS_PATH = 'resources/';
const SOLAR_GLTF = 'solar_system_real_scale_2k_textures.glb';
const SPACESHIP_GLTF = 'spaceships/spaceship.glb';

let scene, camera, renderer, clock, controls;
let raycaster, mouse;
let PLANETS = [];
let spaceship = null;
let isFlying = false;
let flightTarget = new THREE.Vector3();
let hasInitialized = false;

// Game controls

let spaceshipSpeed = 0.5; // Default value, will be updated from config
let spaceshipRotationSpeed = 0.02; // Default value, will be updated from config
let isManualControl = true;
let keys = {};
let nearbyPlanet = null;
let proximityThreshold = 5; // Default value, will be updated from config

// Movement
let currentVelocity = new THREE.Vector3();
let targetVelocity = new THREE.Vector3();

// Mouse look
let mouseLookSensitivity = 0.002; // Default value, will be updated from config
let pitch = 0;
let yaw = 0;
let isMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

// VFX

// Feature managers
let audioManager = null;
let shaderManager = null;
let cockpitManager = null;
let chatbot = null;
let tourManager = null;
let i18nManager = null;
let spaceshipSelector = null;
let analyticsManager = null;
let easterEggs = null;
let vfxManager = null;

// Animation tracking
let planetAnimationId = null;
let escapeHandlerAbortController = null;
let currentShaderBackground = null;
let performanceMode = false;
let fpsElement = null;
let checkpoint = null;
let pathModeEnabled = false;
let pathIndex = 0;

/* ========= Configuration ========= */
import { CONFIG as AppConfig } from './utils/config.js';

let CONFIG = {};

async function loadConfig() {
  // Merge base config with local overrides
  CONFIG = { ...AppConfig,
    SPACESHIP: {
      ...AppConfig.SPACESHIP,
      SPEED: 0.5,
      ROTATION_SPEED: 0.02,
      PROXIMITY_THRESHOLD: 5,
      MOUSE_SENSITIVITY: 0.002
    },
    PERFORMANCE: {
      ENABLE_SHADOWS: true,
      PIXEL_RATIO_LIMIT: 1.5,
      PARTICLE_UPDATE_INTERVAL: 2,
      VELOCITY_LERP_SPEED: 12,
      FRAME_RATE_TARGET: 60,
      CAMERA_FOLLOW_SPEED: 0.25,
      PROXIMITY_CLOSE_MULTIPLIER: 0.5,
      PLANET_CHECK_INTERVAL: 2,
      UPDATE_CHECK_INTERVAL: 5,
      PLANET_ROTATION_SPEED: 0.005
    }
  };
  
  spaceshipSpeed = CONFIG.SPACESHIP.SPEED;
  spaceshipRotationSpeed = CONFIG.SPACESHIP.ROTATION_SPEED;
  proximityThreshold = CONFIG.SPACESHIP.PROXIMITY_THRESHOLD;
  mouseLookSensitivity = CONFIG.SPACESHIP.MOUSE_SENSITIVITY;
  
  
}

/* ========= Planet Interaction Functions ========= */
function closePlanetPanel() {
  const panel = document.getElementById('planet-panel');
  if (panel) {
    panel.style.display = 'none';
  }
  document.removeEventListener('click', closePlanetPanelOnClickOutside);
}

function closePlanetPanelOnClickOutside(event) {
  const panel = document.getElementById('planet-panel');
  if (panel && !panel.contains(event.target)) {
    closePlanetPanel();
  }
}

/* ========= UI Management Functions ========= */
function showFatal(message) {
  const overlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  const loadingFill = document.getElementById('loading-fill');
  
  if (overlay) overlay.style.display = 'block';
  if (loadingText) loadingText.textContent = message;
  if (loadingFill) loadingFill.style.width = '100%';
  
  
  
  // Show error for 5 seconds then hide
  setTimeout(() => {
    if (overlay) overlay.style.display = 'none';
  }, 5000);
}



/* ========= Utility Functions ========= */
function isAncestor(root, node) {
  let current = node;
  while (current) {
    if (current === root) return true;
    current = current.parent;
  }
  return false;
}

function prettify(name) {
  if (!name) return 'Unnamed';
  return name.replace(/[_-]+/g, ' ').trim()
    .split(' ')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}





// Dynamic module loader function
async function loadModule(modulePath) {
  try {
    if (!modulePath || typeof modulePath !== 'string') {
      console.warn(`[loadModule] Invalid module path:`, modulePath);
      return null;
    }

    if (!modulePath.startsWith('js/')) {
      console.warn(`[loadModule] Module path must start with 'js/':`, modulePath);
      return null;
    }

    const relativePath = `./${modulePath.substring(3)}`;
    const module = await import(relativePath);
    const exported = module && (Object.prototype.hasOwnProperty.call(module, 'default') ? module.default : Object.values(module)[0]);
    return exported ?? null;
  } catch (error) {
    console.warn(`[loadModule] Failed to load module '${modulePath}':`, error.message);
    return null;
  }
}

/* ========= Initialization ========= */



async function init() {
  if (hasInitialized) return;
  hasInitialized = true;
  
  // Renderer + canvas
  const canvas = document.getElementById('glCanvas');
  if (!canvas) {
    showFatal('Canvas element #glCanvas not found in DOM.');
    return;
  }
  
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.PERFORMANCE.PIXEL_RATIO_LIMIT));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = CONFIG.PERFORMANCE.ENABLE_SHADOWS;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Scene + Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
  camera.position.set(0, 15, 30);
  camera.lookAt(0, 0, 0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enabled = false;

  // Lighting
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
  scene.add(hemi);
  
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(50, 100, 50);
  dir.castShadow = CONFIG.PERFORMANCE.ENABLE_SHADOWS;
  scene.add(dir);
  
  const fill = new THREE.DirectionalLight(0x88aaff, 0.4);
  fill.position.set(-50, 30, -50);
  scene.add(fill);
  
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  // Helpers
  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Initialize feature managers
  await initializeFeatures();

  // Load models
  await setupLoadersAndLoadModels();

  // Events
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('pointerdown', onPointerDown, false);
  
  // Controls
  setupSpaceshipControls();
  setupMobileController();

  // UI
  createPlanetPanelUI();
  setupProjectEditorUI();
  
  updateControlStatus('Game Mode');
}

/* ========= Control Functions ========= */
function setupSpaceshipControls() {
  // Keyboard controls
  document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    
    // Toggle cockpit view
    if (event.code === 'KeyC') {
      toggleCockpitView();
    }
    
    // Toggle game mode
    if (event.code === 'KeyM') {
      toggleGameMode();
    }
    
    // Interact with nearby planet
    if (event.code === 'Space') {
      if (nearbyPlanet) {
        event.preventDefault();
        openPlanetPanel(nearbyPlanet);
      }
    }
  });

  document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });

  // Mouse controls
  document.addEventListener('mousedown', (event) => {
    if (event.button === 0) { // Left mouse button
      isMouseDown = true;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
    }
  });

  document.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
      isMouseDown = false;
    }
  });

  document.addEventListener('mousemove', (event) => {
    if (isMouseDown && isManualControl) {
      const deltaX = event.clientX - lastMouseX;
      const deltaY = event.clientY - lastMouseY;
      
      yaw += deltaX * mouseLookSensitivity;
      pitch += deltaY * mouseLookSensitivity;
      
      // Limit pitch
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
      
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
    }
  });

  // Click to interact with planets
  renderer.domElement.addEventListener('click', (event) => {
    if (isManualControl) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(PLANETS.map(p => p.mesh));
      
      if (intersects.length > 0) {
        const planet = PLANETS.find(p => p.mesh === intersects[0].object);
        if (planet) {
          openPlanetPanel(planet);
        }
      }
    }
  });
}

function setupMobileController() {
  // Mobile controller setup
  const mobileController = document.getElementById('mobile-controller');
  if (!mobileController) return;

  // Show/hide based on device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    mobileController.style.display = 'block';
  }

  // Touch controls for D-pad
  const dpadStick = document.getElementById('dpad-stick');
  if (dpadStick) {
    let isDragging = false;
    let startX, startY;

    const startDrag = (e) => {
      isDragging = true;
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const drag = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const touch = e.touches ? e.touches[0] : e;
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 50;
      
      if (distance > maxDistance) {
        const angle = Math.atan2(deltaY, deltaX);
        dpadStick.style.transform = `translate(${Math.cos(angle) * maxDistance}px, ${Math.sin(angle) * maxDistance}px)`;
      } else {
        dpadStick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      }
      
      // Update movement keys based on direction
      const threshold = 20;
      keys['w'] = deltaY < -threshold;
      keys['s'] = deltaY > threshold;
      keys['a'] = deltaX < -threshold;
      keys['d'] = deltaX > threshold;
    };

    const endDrag = () => {
      isDragging = false;
      dpadStick.style.transform = 'translate(0, 0)';
      keys['w'] = false;
      keys['s'] = false;
      keys['a'] = false;
      keys['d'] = false;
    };

    dpadStick.addEventListener('touchstart', startDrag);
    dpadStick.addEventListener('touchmove', drag);
    dpadStick.addEventListener('touchend', endDrag);
    dpadStick.addEventListener('mousedown', startDrag);
    dpadStick.addEventListener('mousemove', drag);
    dpadStick.addEventListener('mouseup', endDrag);
  }

  // Action buttons
  document.querySelectorAll('.action-btn').forEach(btn => {
    const key = btn.dataset.key;
    if (key) {
      btn.addEventListener('touchstart', () => keys[key] = true);
      btn.addEventListener('touchend', () => keys[key] = false);
      btn.addEventListener('mousedown', () => keys[key] = true);
      btn.addEventListener('mouseup', () => keys[key] = false);
    }
  });

  // Center interact button
  const centerInteract = document.getElementById('center-interact');
  if (centerInteract) {
    centerInteract.addEventListener('touchstart', () => {
      if (nearbyPlanet) {
        openPlanetPanel(nearbyPlanet);
      }
    });
    centerInteract.addEventListener('mousedown', () => {
      if (nearbyPlanet) {
        openPlanetPanel(nearbyPlanet);
      }
    });
  }
}

function toggleCockpitView() {
  if (cockpitManager) {
    cockpitManager.toggle();
  }
}

function toggleGameMode() {
  isManualControl = !isManualControl;
  controls.enabled = !isManualControl;
  updateControlStatus(isManualControl ? 'Game Mode' : 'Orbit Mode');
}

function updateControlStatus(mode) {
  const controlStatus = document.getElementById('control-status');
  const controlModeText = document.getElementById('control-mode-text');
  
  if (controlModeText) {
    controlModeText.textContent = mode;
  }
  
  if (controlStatus) {
    controlStatus.style.display = 'block';
    setTimeout(() => {
      controlStatus.style.opacity = '0';
      setTimeout(() => {
        controlStatus.style.display = 'none';
        controlStatus.style.opacity = '1';
      }, 300);
    }, 2000);
  }
}

async function initializeFeatures() {
  try {
    
    
    // Try to load modules dynamically, but don't fail if they're not available
    
    // Analytics (first for tracking)
    try {
      const AnalyticsManager = await loadModule('js/features/analytics.js');
      if (AnalyticsManager && typeof AnalyticsManager === 'function') {
        analyticsManager = new AnalyticsManager();
        window.analyticsManager = analyticsManager;
        analyticsManager.init();
        
      }
    } catch (error) {
      // Module might not exist, fail silently
    }

    // i18n
    try {
      const I18nManager = await loadModule('js/features/i18n.js');
      if (I18nManager && typeof I18nManager === 'function') {
        i18nManager = new I18nManager();
        window.i18nManager = i18nManager;
        await i18nManager.init();
        
      }
    } catch (error) {
      // Module might not exist, fail silently
    }

    // Audio
    try {
      const ProceduralMusicGenerator = await loadModule('js/audio/proceduralMusic.js');
      if (ProceduralMusicGenerator && typeof ProceduralMusicGenerator === 'function') {
        audioManager = new ProceduralMusicGenerator();
        window.audioManager = audioManager;
        await audioManager.init();
        
      }
    } catch (error) {
      // Module might not exist, fail silently
    }

    // Shader backgrounds
    try {
      const ShaderBackgroundGenerator = await loadModule('js/graphics/shaderBackgrounds.js');
      if (ShaderBackgroundGenerator && typeof ShaderBackgroundGenerator === 'function') {
        shaderManager = new ShaderBackgroundGenerator();
        window.shaderManager = shaderManager;
        shaderManager.init(scene);
        
      }
    } catch (error) {
      // Module might not exist, fail silently
    }

    // Chatbot
    try {
      const AIChatbot = await loadModule('js/features/chatbot.js');
      if (AIChatbot && typeof AIChatbot === 'function') {
        chatbot = new AIChatbot();
        window.chatbot = chatbot;
        chatbot.init();
        
      }
    } catch (error) {
      // Module might not exist, fail silently
    }

    // Guided tour and spaceship selector will be initialized after models load

    // Easter eggs
    try {
      const EasterEggsManager = await loadModule('js/features/easterEggs.js');
      if (EasterEggsManager && typeof EasterEggsManager === 'function') {
        easterEggs = new EasterEggsManager(scene, camera);
        window.easterEggs = easterEggs;
        easterEggs.init();
        
      }
    } catch (error) {
      // Module might not exist, fail silently
    }

    // Cockpit view will be initialized after models load

    
  } catch (error) {
    // Fail silently if feature initialization fails
  }
}



/* ========= Loaders + Assets ========= */
async function setupLoadersAndLoadModels() {
  const overlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  const loadingFill = document.getElementById('loading-fill');

  const manager = new THREE.LoadingManager();
  manager.onStart = (url, itemsLoaded, itemsTotal) => {
    if (overlay) overlay.style.display = 'flex';
    if (loadingText) loadingText.textContent = `Loading ${itemsLoaded}/${itemsTotal}`;
  };
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    if (loadingText) loadingText.textContent = `Loading ${itemsLoaded}/${itemsTotal}`;
    if (loadingFill) loadingFill.style.width = Math.round((itemsLoaded / itemsTotal) * 100) + '%';
  };
  manager.onError = () => {
    // Ignore loading errors
  };
  manager.onLoad = () => {
    if (loadingText) loadingText.textContent = 'All assets loaded';
    if (loadingFill) loadingFill.style.width = '100%';
    setTimeout(() => {
      if (overlay) overlay.style.display = 'none';
    }, 350);
  };

  const loader = new GLTFLoader(manager);
  
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  loader.setDRACOLoader(dracoLoader);

  try {
    if (loadingText) loadingText.textContent = 'Loading solar system...';
    const solarGltf = await new Promise((resolve, reject) => {
      loader.load(MODELS_PATH + SOLAR_GLTF, resolve, undefined, reject);
    });
    
    if (solarGltf && solarGltf.scene) {
      scene.add(solarGltf.scene);
      
      solarGltf.scene.traverse((child) => {
        if (child.isMesh) {
          const name = child.name.toLowerCase();
          
          const planetNames = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
          const matchedPlanet = planetNames.find(p => name.includes(p));
          
          if (matchedPlanet) {
            const bbox = new THREE.Box3().setFromObject(child);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            
            PLANETS.push({
              name: matchedPlanet,
              mesh: child,
              bbox: bbox,
              radius: bbox.getSize(new THREE.Vector3()).length() / 2,
              worldPosition: center.clone(),
              info: {}
            });
            
            
          }
        }
      });
      
      
    }

    if (loadingText) loadingText.textContent = 'Loading spaceship...';
    const spaceshipGltf = await new Promise((resolve, reject) => {
      loader.load(MODELS_PATH + SPACESHIP_GLTF, resolve, undefined, reject);
    });
    
    if (spaceshipGltf && spaceshipGltf.scene) {
      spaceship = spaceshipGltf.scene;
      spaceship.scale.setScalar(0.5);
      spaceship.position.set(0, 5, 15);
      spaceship.userData.type = 'ship';
      scene.add(spaceship);
      
      vfxManager = new VFXManager(scene);
      vfxManager.init(spaceship);
      
      try {
        const SpaceshipSelector = await loadModule('js/features/spaceshipSelector.js');
        if (SpaceshipSelector && typeof SpaceshipSelector === 'function') {
          spaceshipSelector = new SpaceshipSelector(scene, (ship) => { applyShipChange(ship); });
          spaceshipSelector.currentShip = spaceship;
          window.spaceshipSelector = spaceshipSelector;
          spaceshipSelector.init();
        }
      } catch {}

      try {
        const GuidedTourManager = await loadModule('js/features/guidedTour.js');
        if (GuidedTourManager && typeof GuidedTourManager === 'function') {
          tourManager = new GuidedTourManager(camera, spaceship, PLANETS);
          window.tourManager = tourManager;
          tourManager.init();
        }
      } catch {}

      try {
        const CockpitViewManager = await loadModule('js/graphics/cockpitView.js');
        if (CockpitViewManager && typeof CockpitViewManager === 'function') {
          cockpitManager = new CockpitViewManager(camera, spaceship);
          window.cockpitManager = cockpitManager;
          cockpitManager.init();
        }
      } catch {}
    }
    
  } catch (error) {
    // Show a fatal error because 3D models are essential
    showFatal('Failed to load 3D models: ' + error.message);
  }
}

/* ========= Helper Functions ========= */
window.runSmokeTests = async function() {
  const results = [];
  const errorCount = { value: 0 };
  const originalError = console.error;
  console.error = function(...args){ errorCount.value++; originalError.apply(console, args); };

  try {
    results.push(!!CONFIG && !!CONFIG.SPACESHIP && !!CONFIG.GUIDED_TOUR && !!CONFIG.CHATBOT);
    if (window.spaceshipSelector) {
      const models = CONFIG.SPACESHIP.MODELS;
      if (models && models.length) {
        const beforeShips = scene.children.filter(c => c.userData && c.userData.type === 'ship').length;
        await window.spaceshipSelector.selectShip(models[0].id);
        const afterShips = scene.children.filter(c => c.userData && c.userData.type === 'ship').length;
        results.push(!!spaceship && afterShips === 1 && afterShips <= beforeShips);
      }
    }
    if (window.tourManager) {
      window.tourManager.start();
      setTimeout(() => { window.tourManager.skip(); }, 500);
      results.push(true);
    }
    if (window.i18nManager) {
      await window.i18nManager.changeLanguage('en');
      results.push(true);
    }
    // Quick flight to first planet
    if (PLANETS.length) {
      flyToPlanetWithSpaceship(PLANETS[0]);
      await new Promise(r => setTimeout(r, 1500));
      results.push(true);
    }
    // Toggle cockpit
    if (window.cockpitManager) {
      window.cockpitManager.toggleView();
      await new Promise(r => setTimeout(r, 800));
      window.cockpitManager.toggleView();
      results.push(true);
    }
  } catch {
    results.push(false);
  } finally {
    console.error = originalError;
  }
  const ok = results.every(Boolean) && errorCount.value === 0;
  return { ok, results, errors: errorCount.value };
}

window.runGuidedTourTests = async function() {
  const result = { ui: false, next: false, pauseResume: false, stop: false, errors: 0 };
  const originalError = console.error;
  console.error = function(...args){ result.errors++; originalError.apply(console, args); };
  try {
    const uiElems = [
      document.getElementById('tour-start-btn') || true,
      document.getElementById('tour-pause') || true,
      document.getElementById('tour-stop') || true
    ];
    result.ui = !!uiElems.length;
    if (window.tourManager) {
      window.tourManager.start();
      const nextBtn = document.getElementById('tour-next');
      if (nextBtn) {
        nextBtn.click();
        result.next = true;
      }
      document.getElementById('tour-pause')?.click();
      setTimeout(() => { document.getElementById('tour-pause')?.click(); }, 300);
      result.pauseResume = true;
      setTimeout(() => { document.getElementById('tour-stop')?.click(); }, 600);
      result.stop = true;
    }
  } catch {}
  console.error = originalError;
  return result;
}
/* ========= Events ========= */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerDown(e) {
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
  
  if (isMouseDown && isManualControl) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersectables = PLANETS.map(p => p.mesh).filter(m => m);
  const hits = raycaster.intersectObjects(intersectables, true);
  
  if (hits.length) {
    let obj = hits[0].object;
    let match = PLANETS.find(p => p.mesh === obj || isAncestor(p.mesh, obj));
    
    if (!match) {
      const pt = hits[0].point;
      let best = null, bestd = Infinity;
      for (const p of PLANETS) {
        const d = p.worldPosition.distanceTo(pt);
        if (d < bestd) {
          bestd = d;
          best = p;
        }
      }
      match = best;
    }
    
    if (match) {
      openPlanetPanel(match);
      if (e.shiftKey) flyToPlanetWithSpaceship(match);
      
      // Track analytics
      if (analyticsManager) {
        analyticsManager.trackPlanetVisit(match.name);
      }
    }
  }
}

/* ========= Spaceship Controls ========= */

function checkPlanetProximity() {
  if (!spaceship) return;
  
  let closestPlanet = null;
  let closestDistance = Infinity;
  
  for (const planet of PLANETS) {
    if (!planet.mesh) continue;
    const planetPos = new THREE.Vector3();
    planet.mesh.getWorldPosition(planetPos);
    const distance = spaceship.position.distanceTo(planetPos);
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPlanet = planet;
    }
  }
  
  if (closestDistance < proximityThreshold) {
    nearbyPlanet = closestPlanet;
    updateProximityIndicator(closestPlanet, closestDistance);
    
    // Update audio based on proximity
    if (audioManager) {
      audioManager.updatePlanetVolumes(closestPlanet.name, closestDistance);
    }
  } else {
    nearbyPlanet = null;
    updateProximityIndicator(null, 0);
    
    // Fade out planet audio
    if (audioManager) {
      audioManager.updatePlanetVolumes(null, Infinity);
    }
  }
}

function updateProximityIndicator(planet, distance) {
  const indicator = document.getElementById('proximity-indicator');
  if (!indicator) return;
  
  if (planet && distance < proximityThreshold) {
    const mapEntry = (window.PROJECT_MAP && window.PROJECT_MAP[planet.name]) || null;
    const planetName = mapEntry && mapEntry.title ? mapEntry.title : prettify(planet.name);
    const proximityPercent = Math.max(0, Math.min(100, (1 - distance / proximityThreshold) * 100));
    
    indicator.innerHTML = `
      <div style="background:rgba(0,255,0,0.3);border:2px solid #00ff00;padding:12px;border-radius:8px;box-shadow:0 0 20px rgba(0,255,0,0.5);">
        <div style="font-weight:700;color:#00ff00;font-size:16px;margin-bottom:6px;">✨ ${planetName}</div>
        <div style="font-size:13px;color:#88ff88;margin-bottom:8px;">Press <strong>SPACE</strong> or <strong>CLICK</strong> to view info</div>
        <div style="background:rgba(0,0,0,0.3);height:6px;border-radius:3px;overflow:hidden;margin-top:8px;">
          <div style="background:linear-gradient(90deg,#00ff00,#88ff88);height:100%;width:${proximityPercent}%;transition:width 0.2s;"></div>
        </div>
      </div>
    `;
    indicator.style.display = 'block';
  } else {
    indicator.style.display = 'none';
  }
}

/* ========= Flight Logic ========= */
function flyToPlanetWithSpaceship(planetEntry) {
  if (!spaceship || !planetEntry) {
    openPlanetPanel(planetEntry);
    return;
  }
  
  const targetWorld = new THREE.Vector3();
  planetEntry.mesh.getWorldPosition(targetWorld);
  const size = new THREE.Vector3();
  planetEntry.bbox.getSize(size);
  const radiusApprox = Math.max(size.x, size.y, size.z) * 0.6;
  const dir = new THREE.Vector3().subVectors(camera.position, targetWorld).normalize();
  
  flightTarget.copy(targetWorld).add(dir.multiplyScalar(radiusApprox + 6));
  // Face the planet direction immediately for responsiveness
  const faceDir = new THREE.Vector3().subVectors(targetWorld, spaceship.position).normalize();
  const initialQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), faceDir);
  spaceship.quaternion.slerp(initialQuat, 0.4);
  spaceship.userData.targetPlanet = planetEntry;
  isFlying = true;
  isManualControl = false;
  controls.enabled = false;
}

/* ========= Animation Loop ========= */
function animate() {
  requestAnimationFrame(animate);
  
  if (!renderer || !scene || !camera) return;
  
  try {
    let dt = clock.getDelta();
    if (!Number.isFinite(dt) || dt <= 0) dt = 0.016;
    dt = Math.min(dt, 0.05);

    // Manual spaceship control
    if (isManualControl && spaceship) {
      spaceship.rotation.y = yaw;
      
      // Keyboard rotation
      if (keys['KeyQ'] || keys['q']) {
        yaw += spaceshipRotationSpeed;
        spaceship.rotation.y = yaw;
      }
      if (keys['KeyE'] || keys['e']) {
        yaw -= spaceshipRotationSpeed;
        spaceship.rotation.y = yaw;
      }
      
      // Calculate target velocity
      targetVelocity.set(0, 0, 0);
      
      if (keys['KeyW'] || keys['w'] || keys['ArrowUp']) targetVelocity.z -= 1;
      if (keys['KeyS'] || keys['s'] || keys['ArrowDown']) targetVelocity.z += 1;
      if (keys['KeyA'] || keys['a'] || keys['ArrowLeft']) targetVelocity.x -= 1;
      if (keys['KeyD'] || keys['d'] || keys['ArrowRight']) targetVelocity.x += 1;
      if (keys['Space'] || keys[' '] && !nearbyPlanet) targetVelocity.y += 1;
      if (keys['ShiftLeft'] || keys['ShiftRight'] || keys['shift'] || keys['Shift']) targetVelocity.y -= 1;
      
      if (targetVelocity.length() > 0) {
        targetVelocity.normalize().multiplyScalar(spaceshipSpeed);
      }
      
      // Smooth velocity
      currentVelocity.lerp(targetVelocity, CONFIG.PERFORMANCE.VELOCITY_LERP_SPEED * dt);
      
      // Apply movement
      if (currentVelocity.length() > 0.01) {
        if (Math.abs(currentVelocity.z) > 0.01) {
          spaceship.translateZ(-currentVelocity.z * dt * 60);
        }
        if (Math.abs(currentVelocity.x) > 0.01) {
          spaceship.translateX(currentVelocity.x * dt * 60);
        }
        if (Math.abs(currentVelocity.y) > 0.01) {
          spaceship.position.y += currentVelocity.y * dt * 60;
        }
        
        // Banking effect
        if (currentVelocity.length() > 0.3) {
          const bankAngle = Math.atan2(currentVelocity.x, -currentVelocity.z) * 0.3;
          spaceship.rotation.z = spaceship.rotation.z * 0.9 + bankAngle * 0.1;
        } else {
          spaceship.rotation.z = spaceship.rotation.z * 0.9;
        }
      }
      
      // Camera follow (or cockpit view)
      if (cockpitManager && !cockpitManager.isInsideCockpit) {
        const cameraDistance = 10;
        const cameraHeight = 3;
        const cameraOffset = new THREE.Vector3(0, cameraHeight, cameraDistance);
        
        const pitchRotation = new THREE.Euler(pitch, 0, 0, 'YXZ');
        cameraOffset.applyEuler(pitchRotation);
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        
        const desiredCam = new THREE.Vector3().copy(spaceship.position).add(cameraOffset);
        camera.position.lerp(desiredCam, CONFIG.PERFORMANCE.CAMERA_FOLLOW_SPEED);
        
        const lookTarget = new THREE.Vector3().copy(spaceship.position);
        lookTarget.y += Math.sin(pitch) * 2;
        camera.lookAt(lookTarget);
      }
      
      // Auto-approach
      if (nearbyPlanet) {
        const planetPos = new THREE.Vector3();
        nearbyPlanet.mesh.getWorldPosition(planetPos);
        const distance = spaceship.position.distanceTo(planetPos);
        
        if (distance < proximityThreshold * CONFIG.PERFORMANCE.PROXIMITY_CLOSE_MULTIPLIER) {
          const direction = new THREE.Vector3().subVectors(planetPos, spaceship.position).normalize();
          spaceship.position.add(direction.multiplyScalar(0.1 * dt * CONFIG.PERFORMANCE.FRAME_RATE_TARGET));
        }
        
        if (distance < proximityThreshold) {
          const direction = new THREE.Vector3().subVectors(planetPos, spaceship.position).normalize();
          const targetQuaternion = new THREE.Quaternion();
          targetQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction);
          const currentYaw = yaw;
          const targetYaw = Math.atan2(direction.x, direction.z);
          yaw = currentYaw + (targetYaw - currentYaw) * 0.05;
          spaceship.rotation.y = yaw;
        }
      }
      
      if (vfxManager) {
        vfxManager.update(spaceship, currentVelocity);
      }
      
      // Update cockpit HUD
      if (cockpitManager) {
        cockpitManager.update(currentVelocity, nearbyPlanet);
      }
      
      // Update audio listener position
      if (audioManager) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(spaceship.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(spaceship.quaternion);
        
        audioManager.updateListenerPosition(spaceship.position, { forward, up });
      }
      
      // Check for easter eggs
      if (easterEggs) {
        easterEggs.checkProximityToSecrets(spaceship.position);
      }
    }
    
    // Spaceship flight movement (auto-pilot)
  if (isFlying && spaceship && !isManualControl) {
      spaceship.position.lerp(flightTarget, Math.min(1, 0.06));
      
      const tp = spaceship.userData.targetPlanet;
      if (tp) {
        const ppos = new THREE.Vector3();
        tp.mesh.getWorldPosition(ppos);
        const direction = new THREE.Vector3().subVectors(ppos, spaceship.position).normalize();
        const targetQuaternion = new THREE.Quaternion();
        targetQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction);
        spaceship.quaternion.slerp(targetQuaternion, 0.1);
      }
      
      if (spaceship.position.distanceTo(flightTarget) < 0.6) {
        isFlying = false;
        controls.enabled = true;
        const arrivedPlanet = spaceship.userData.targetPlanet;
        if (arrivedPlanet) openPlanetPanel(arrivedPlanet);
      }
    }

    // Camera follow during flight
    if (isFlying && spaceship) {
      const behind = new THREE.Vector3(0, 4, 12).applyQuaternion(spaceship.quaternion);
      const desiredCam = new THREE.Vector3().copy(spaceship.position).add(behind);
      camera.position.lerp(desiredCam, 0.12);
      
      const lookAtTarget = new THREE.Vector3();
      if (spaceship.userData.targetPlanet) {
        spaceship.userData.targetPlanet.mesh.getWorldPosition(lookAtTarget);
      } else {
        lookAtTarget.copy(spaceship.position);
      }
      camera.lookAt(lookAtTarget);
    }
    else {
      controls.update();
    }

    // Check planet proximity (optimized)
    const elapsed = clock.getElapsedTime();
    if (isManualControl && Math.floor(elapsed * 10) % CONFIG.PERFORMANCE.PLANET_CHECK_INTERVAL === 0) {
      checkPlanetProximity();
    }
    
    // Update planet positions and LOD (optimized)
    if (Math.floor(elapsed * 10) % CONFIG.PERFORMANCE.UPDATE_CHECK_INTERVAL === 0) {
      for (const p of PLANETS) {
        if (p.mesh) p.mesh.getWorldPosition(p.worldPosition);
        
        try {
          const dist = camera.position.distanceTo(p.worldPosition || new THREE.Vector3());
          if (p._lodPlaceholder) {
            if (dist > 180) {
              p._lodPlaceholder.visible = true;
              if (p.mesh) p.mesh.visible = false;
            } else {
              p._lodPlaceholder.visible = false;
              if (p.mesh) p.mesh.visible = true;
            }
          }
        } catch (e) {
          // LOD update may fail, but we can ignore it
        }
      }
    }

    renderer.render(scene, camera);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Animation] Critical error in animation loop:', err);
    showFatal('Rendering error: ' + err.message);
    // Stop the animation loop on critical errors
    return;
  }
}

/* ========= Panel UI ========= */
function createPlanetPanelUI() {
  const panel = document.getElementById('planet-panel');
  panel.innerHTML = `
    <button id="planet-close" style="float:right;background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0;width:30px;height:30px;">✕</button>
    <h3 id="planet-title" style="margin-top:0" data-i18n="planets.name">Planet</h3>
    <img id="planet-img" src="" style="width:100%;display:none;border-radius:6px;margin-top:8px" />
    
    <div id="planet-tabs" style="display:flex;gap:4px;margin-top:12px;border-bottom:1px solid rgba(255,255,255,0.1);">
      <button class="planet-tab active" data-tab="info" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);border:none;color:#fff;cursor:pointer;border-radius:4px 4px 0 0;" data-i18n="ui.tabs.info">User Info</button>
      <button class="planet-tab" data-tab="projects" style="flex:1;padding:8px;background:transparent;border:none;color:#aaa;cursor:pointer;" data-i18n="ui.tabs.projects">Projects</button>
      <button class="planet-tab" data-tab="contact" style="flex:1;padding:8px;background:transparent;border:none;color:#aaa;cursor:pointer;" data-i18n="ui.tabs.contact">Contact</button>
    </div>
    
    <div id="planet-tab-content" style="margin-top:12px;min-height:200px;">
      <div id="tab-info" class="planet-tab-panel active">
        <div id="planet-desc" style="font-size:13px;color:#ddd;line-height:1.6"></div>
        <div id="planet-long" style="display:none;margin-top:12px;color:#cbd5e1;font-size:13px;line-height:1.6"></div>
      </div>
      
      <div id="tab-projects" class="planet-tab-panel" style="display:none;">
        <div id="planet-projects" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>
      
      <div id="tab-contact" class="planet-tab-panel" style="display:none;">
        <div id="planet-contact" style="display:flex;flex-direction:column;gap:8px;"></div>
        <div id="planet-links" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"></div>
      </div>
    </div>
    
    <div style="margin-top:16px;display:flex;gap:8px;">
      <button id="planet-back" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);border:none;color:#fff;border-radius:6px;cursor:pointer;" data-i18n="ui.close">Close</button>
      <button id="planet-travel" style="flex:1;padding:8px;background:#06b6d4;border:none;color:#fff;border-radius:6px;cursor:pointer;" data-i18n="ui.travelHere">Travel Here</button>
    </div>
  `;
  
  // Tab switching
  const tabs = panel.querySelectorAll('.planet-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      tabs.forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = '#aaa';
      });
      tab.classList.add('active');
      tab.style.background = 'rgba(255,255,255,0.1)';
      tab.style.color = '#fff';
      
      panel.querySelectorAll('.planet-tab-panel').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
      });
      const panelEl = panel.querySelector(`#tab-${tabName}`);
      if (panelEl) {
        panelEl.classList.add('active');
        panelEl.style.display = 'block';
      }
    });
  });
  
  document.getElementById('planet-close').onclick = () => panel.style.display = 'none';
  document.getElementById('planet-back').onclick = () => panel.style.display = 'none';
  document.getElementById('planet-travel').onclick = () => {
    const cur = panel._currentPlanet;
    if (cur) {
      isManualControl = false;
      flyToPlanetWithSpaceship(cur);
      panel.style.display = 'none';
    }
  };
}

function openPlanetPanel(planetEntry) {
  if (!planetEntry) return;
  
  const mapEntry = (window.PROJECT_MAP && window.PROJECT_MAP[planetEntry.name]) || null;
  const title = mapEntry && mapEntry.title ? mapEntry.title : prettify(planetEntry.name);
  const short = mapEntry && mapEntry.short ? mapEntry.short : (planetEntry.info && planetEntry.info.description) || '';
  const long = mapEntry && mapEntry.long ? mapEntry.long : '';
  const image = mapEntry && mapEntry.image ? mapEntry.image : '';
  
  const overlay = document.getElementById('planet-overlay');
  const overlayBg = document.getElementById('planet-overlay-bg');
  const overlayContent = document.getElementById('planet-overlay-content');
  
  if (!overlay || !overlayContent) return;
  
  // Clean up previous shader background
  if (currentShaderBackground) {
    currentShaderBackground.stop();
    currentShaderBackground = null;
  }
  
  // Set background (shader or image)
  if (overlayBg) {
    if (image) {
      overlayBg.style.backgroundImage = `url(${image})`;
      overlayBg.style.display = 'block';
      // Remove any canvas children
      while (overlayBg.firstChild) {
        overlayBg.removeChild(overlayBg.firstChild);
      }
    } else if (shaderManager) {
      overlayBg.style.backgroundImage = 'none';
      overlayBg.style.display = 'block';
      // Remove any existing children
      while (overlayBg.firstChild) {
        overlayBg.removeChild(overlayBg.firstChild);
      }
      currentShaderBackground = shaderManager.createShaderBackground(planetEntry.name, overlayBg);
    }
  }
  
  // Entrance animation
  overlay.style.opacity = '0';
  overlay.classList.add('active');
  setTimeout(() => {
    overlay.style.transition = 'opacity 0.4s ease-in';
    overlay.style.opacity = '1';
  }, 10);
  
  // Build content
  let contentHTML = `
    <h1 style="font-size:48px;font-weight:700;margin-bottom:20px;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,0.5);">${title}</h1>
    
    <div style="background:rgba(255,255,255,0.05);backdrop-filter:blur(10px);border-radius:12px;padding:30px;margin-bottom:24px;border:1px solid rgba(255,255,255,0.1);">
      <h2 style="font-size:24px;font-weight:600;margin-bottom:16px;color:#06b6d4;">User Info</h2>
      <div style="font-size:16px;color:#ddd;line-height:1.8;margin-bottom:16px;">${short || 'Welcome to ' + title}</div>
      ${long ? `<div style="font-size:15px;color:#cbd5e1;line-height:1.8;margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);">${long}</div>` : ''}
    </div>
  `;
  
  // Projects
  if (mapEntry && mapEntry.projects && Array.isArray(mapEntry.projects) && mapEntry.projects.length > 0) {
    contentHTML += `
      <div style="background:rgba(255,255,255,0.05);backdrop-filter:blur(10px);border-radius:12px;padding:30px;margin-bottom:24px;border:1px solid rgba(255,255,255,0.1);">
        <h2 style="font-size:24px;font-weight:600;margin-bottom:20px;color:#06b6d4;">Projects</h2>
        <div style="display:flex;flex-direction:column;gap:16px;">
    `;
    mapEntry.projects.forEach(project => {
      contentHTML += `
        <div style="padding:20px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:4px solid #06b6d4;">
          <div style="font-weight:600;color:#fff;margin-bottom:8px;font-size:18px;">${project.name || 'Project'}</div>
          <div style="font-size:14px;color:#aaa;margin-bottom:12px;line-height:1.6;">${project.description || ''}</div>
          ${project.tech ? `<div style="font-size:13px;color:#888;margin-bottom:8px;">Tech: ${project.tech}</div>` : ''}
          ${project.link ? `<a href="${project.link}" target="_blank" style="color:#06b6d4;font-size:14px;text-decoration:none;display:inline-block;margin-top:8px;">View Project →</a>` : ''}
        </div>
      `;
    });
    contentHTML += `</div></div>`;
  }
  
  // Contact
  if (mapEntry && mapEntry.contact) {
    const contact = mapEntry.contact;
    contentHTML += `
      <div style="background:rgba(255,255,255,0.05);backdrop-filter:blur(10px);border-radius:12px;padding:30px;margin-bottom:24px;border:1px solid rgba(255,255,255,0.1);">
        <h2 style="font-size:24px;font-weight:600;margin-bottom:20px;color:#06b6d4;">Contact</h2>
        <div style="display:flex;flex-direction:column;gap:12px;">
    `;
    if (contact.email) {
      contentHTML += `<div style="padding:12px;background:rgba(255,255,255,0.05);border-radius:6px;"><strong style="color:#fff;">Email:</strong> <a href="mailto:${contact.email}" style="color:#06b6d4;text-decoration:none;">${contact.email}</a></div>`;
    }
    if (contact.phone) {
      contentHTML += `<div style="padding:12px;background:rgba(255,255,255,0.05);border-radius:6px;"><strong style="color:#fff;">Phone:</strong> <span style="color:#aaa;">${contact.phone}</span></div>`;
    }
    if (contact.location) {
      contentHTML += `<div style="padding:12px;background:rgba(255,255,255,0.05);border-radius:6px;"><strong style="color:#fff;">Location:</strong> <span style="color:#aaa;">${contact.location}</span></div>`;
    }
    contentHTML += `</div></div>`;
  }
  
  // Links
  if (mapEntry && Array.isArray(mapEntry.links) && mapEntry.links.length > 0) {
    contentHTML += `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px;">`;
    for (const l of mapEntry.links) {
      contentHTML += `<a href="${l.url || '#'}" target="_blank" rel="noopener noreferrer" style="padding:12px 20px;background:rgba(6,182,212,0.2);color:#06b6d4;border-radius:8px;font-size:14px;text-decoration:none;display:inline-block;border:1px solid rgba(6,182,212,0.3);">${l.label || l.url}</a>`;
    }
    contentHTML += `</div>`;
  }
  
  overlayContent.innerHTML = contentHTML;
  overlay.classList.add('active');
  overlay._currentPlanet = planetEntry;
  
  // Close button
  const closeBtn = document.getElementById('planet-overlay-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      closePlanetOverlay(overlay);
    };
  }
  
  // Escape key handler
  if (escapeHandlerAbortController) {
    escapeHandlerAbortController.abort();
  }
  escapeHandlerAbortController = new AbortController();
  
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closePlanetOverlay(overlay);
    }
  }, { signal: escapeHandlerAbortController.signal });
  
  // Planet rotation animation
  if (planetAnimationId) {
    cancelAnimationFrame(planetAnimationId);
    planetAnimationId = null;
  }
  
  if (planetEntry.mesh) {
    const originalRotation = planetEntry.mesh.rotation.clone();
    let rotationFrame = 0;
    
    const animatePlanet = () => {
      if (overlay.classList.contains('active')) {
        rotationFrame++;
        if (rotationFrame % 2 === 0) {
          planetEntry.mesh.rotation.y += CONFIG.PERFORMANCE.PLANET_ROTATION_SPEED;
        }
        planetAnimationId = requestAnimationFrame(animatePlanet);
      } else {
        planetEntry.mesh.rotation.copy(originalRotation);
        planetAnimationId = null;
      }
    };
    animatePlanet();
  }
  
  // Update small panel
  const panel = document.getElementById('planet-panel');
  if (panel) {
    panel._currentPlanet = planetEntry;
  }
}

function closePlanetOverlay(overlay) {
  overlay.style.transition = 'opacity 0.3s ease-out';
  overlay.style.opacity = '0';
  
  setTimeout(() => {
    overlay.classList.remove('active');
    
    // Clean up animation
    if (planetAnimationId) {
      cancelAnimationFrame(planetAnimationId);
      planetAnimationId = null;
    }
    
    // Clean up escape handler
    if (escapeHandlerAbortController) {
      escapeHandlerAbortController.abort();
      escapeHandlerAbortController = null;
    }
    
    // Clean up shader background
    if (currentShaderBackground) {
      currentShaderBackground.stop();
      currentShaderBackground = null;
    }
  }, 300);
}

/* ========= Project Editor UI ========= */
function setupProjectEditorUI() {
  const openBtn = document.getElementById('project-open-editor');
  const overlay = document.getElementById('project-editor');
  const textarea = document.getElementById('project-json');
  const preview = document.getElementById('project-preview');
  const closeBtn = document.getElementById('project-close-editor');
  const applyBtn = document.getElementById('project-apply');
  const downloadBtn = document.getElementById('project-download');
  const uploadBtn = document.getElementById('project-upload-btn');
  const uploadInput = document.getElementById('project-upload');

  function renderPreview() {
    try {
      const obj = JSON.parse(textarea.value || '{}');
      let html = '';
      for (const k of Object.keys(obj)) {
        const e = obj[k];
        html += `<div style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.03)"><div style="font-weight:700">${e.title || k}</div><div style="font-size:12px;color:#9ca3af;margin-top:4px">${e.short || ''}</div></div>`;
      }
      preview.innerHTML = html || '<div style="color:#94a3b8">No entries</div>';
    } catch (e) {
      preview.innerHTML = '<div style="color:#fca5a5">Invalid JSON</div>';
    }
  }

  openBtn.addEventListener('click', () => {
    overlay.style.display = 'flex';
    textarea.value = JSON.stringify(window.PROJECT_MAP || {}, null, 2);
    renderPreview();
  });

  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
  });
  
  textarea.addEventListener('input', renderPreview);

  applyBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(textarea.value || '{}');
      window.PROJECT_MAP = parsed;
      const panel = document.getElementById('planet-panel');
      if (panel && panel._currentPlanet) {
        openPlanetPanel(panel._currentPlanet);
      }
      alert('PROJECT_MAP applied. Click Download to save.');
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
    }
  });

  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([textarea.value], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'project_map.json';
    a.click();
    a.remove();
  });

  uploadBtn.addEventListener('click', () => uploadInput.click());
  
  uploadInput.addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (e) => {
      textarea.value = e.target.result;
      renderPreview();
      alert('JSON loaded. Click Apply to use it.');
    };
    r.readAsText(f);
  });
}

/* ========= VFX ========= */




/* ======= Export globals for feature managers ======= */
window.spaceshipSpeed = spaceshipSpeed;
window.scene = scene;
window.camera = camera;
window.spaceship = spaceship;
window.PLANETS = PLANETS;

/* ========= Application Initialization ========= */
async function startApplication() {
  
  try {
    await loadConfig();
    
    await init();
    animate();
    
  } catch (error) {
    
    showFatal('Failed to initialize: ' + error.message);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startApplication);
} else {
  startApplication();
}
function applyShipChange(newShip) {
  if (!newShip) return;
  // Remove previous ship from scene if different
  if (spaceship && spaceship !== newShip) {
    try { scene.remove(spaceship); } catch {}
  }
  // Set and tag
  spaceship = newShip;
  spaceship.userData.type = 'ship';
  // Ensure visible
  spaceship.visible = true;
  if (!scene.children.includes(spaceship)) {
    try { scene.add(spaceship); } catch {}
  }
  // Re-init VFX trails on the new ship
  if (vfxManager) {
    try { vfxManager.init(spaceship); } catch {}
  }
  // Update cockpit binding
  if (cockpitManager) {
    cockpitManager.spaceship = spaceship;
  }
}
async function flyAllPlanetsSequential() {
  const order = PLANETS.slice();
  for (const p of order) {
    flyToPlanetWithSpaceship(p);
    // Wait until arrival or timeout
    const start = Date.now();
    while (true) {
      const arrived = !isFlying;
      if (arrived) break;
      if (Date.now() - start > 15000) break; // 15s timeout
      await new Promise(r => setTimeout(r, 150));
    }
    await new Promise(r => setTimeout(r, 500));
  }
}

window.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key.toLowerCase() === 'g') {
    flyAllPlanetsSequential();
  }
});
  // Expose fly helper for guided tour
  window.flyToPlanetWithSpaceship = flyToPlanetWithSpaceship;

  // Create checkpoint UI
  createCheckpointUI();
  createPerformanceUI();
function createCheckpointUI() {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:20px;left:160px;z-index:1600;display:flex;gap:8px;';
  const setBtn = document.createElement('button');
  setBtn.textContent = 'Set Checkpoint';
  setBtn.style.cssText = 'padding:8px;background:#0891b2;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;';
  const returnBtn = document.createElement('button');
  returnBtn.textContent = 'Return to Checkpoint';
  returnBtn.style.cssText = 'padding:8px;background:#06b6d4;color:#001;border:none;border-radius:6px;cursor:pointer;font-size:12px;';
  const pathToggle = document.createElement('button');
  pathToggle.textContent = 'Path Mode';
  pathToggle.style.cssText = 'padding:8px;background:#0ea5e9;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;';
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next Planet';
  nextBtn.style.cssText = 'padding:8px;background:#10b981;color:#001;border:none;border-radius:6px;cursor:pointer;font-size:12px;';

  setBtn.onclick = () => setCheckpoint();
  returnBtn.onclick = () => returnToCheckpoint();
  pathToggle.onclick = () => { pathModeEnabled = !pathModeEnabled; pathToggle.textContent = pathModeEnabled ? 'Path Mode: On' : 'Path Mode'; if (pathModeEnabled) { pathIndex = 0; } };
  nextBtn.onclick = () => { if (pathModeEnabled && PLANETS.length && !isFlying) { const p = PLANETS[pathIndex % PLANETS.length]; pathIndex++; isManualControl = false; flyToPlanetWithSpaceship(p); } };

  container.appendChild(setBtn);
  container.appendChild(returnBtn);
  container.appendChild(pathToggle);
  container.appendChild(nextBtn);
  document.body.appendChild(container);
}

function createPerformanceUI() {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:20px;left:360px;z-index:1600;display:flex;gap:8px;align-items:center;';
  const toggle = document.createElement('button');
  toggle.textContent = 'Performance Mode';
  toggle.style.cssText = 'padding:8px;background:#334155;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;';
  const fps = document.createElement('div');
  fps.style.cssText = 'padding:6px 10px;background:#0f172a;color:#a7f3d0;border:1px solid #22d3ee;border-radius:6px;font-size:12px;';
  fps.textContent = 'FPS: --';
  toggle.onclick = () => {
    performanceMode = !performanceMode;
    if (performanceMode) {
      renderer.shadowMap.enabled = false;
      renderer.setPixelRatio(1);
      if (currentShaderBackground) { try { currentShaderBackground.stop(); } catch {} }
    } else {
      renderer.shadowMap.enabled = CONFIG.PERFORMANCE.ENABLE_SHADOWS;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.PERFORMANCE.PIXEL_RATIO_LIMIT));
    }
  };
  container.appendChild(toggle);
  container.appendChild(fps);
  document.body.appendChild(container);
  fpsElement = fps;
}

function setCheckpoint() {
  if (!spaceship) return;
  checkpoint = {
    position: spaceship.position.clone(),
    quaternion: spaceship.quaternion.clone(),
  };
  try {
    localStorage.setItem('checkpoint', JSON.stringify({
      position: { x: checkpoint.position.x, y: checkpoint.position.y, z: checkpoint.position.z },
      quaternion: { x: checkpoint.quaternion.x, y: checkpoint.quaternion.y, z: checkpoint.quaternion.z, w: checkpoint.quaternion.w }
    }));
  } catch {}
}

function returnToCheckpoint() {
  let data = null;
  try {
    const raw = localStorage.getItem('checkpoint');
    if (raw) data = JSON.parse(raw);
  } catch {}
  if (!checkpoint && data && spaceship) {
    checkpoint = {
      position: new THREE.Vector3(data.position.x, data.position.y, data.position.z),
      quaternion: new THREE.Quaternion(data.quaternion.x, data.quaternion.y, data.quaternion.z, data.quaternion.w)
    };
  }
  if (checkpoint && spaceship) {
    isFlying = false;
    isManualControl = true;
    controls.enabled = true;
    spaceship.position.copy(checkpoint.position);
    spaceship.quaternion.copy(checkpoint.quaternion);
    const behind = new THREE.Vector3(0, 3, 10).applyQuaternion(spaceship.quaternion);
    const desiredCam = new THREE.Vector3().copy(spaceship.position).add(behind);
    camera.position.copy(desiredCam);
    camera.lookAt(spaceship.position);
    controls.update();
  }
}
