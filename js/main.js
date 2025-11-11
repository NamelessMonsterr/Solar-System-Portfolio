// main.js — Complete integrated version with all fe
// // ES6 imports removed - using global THREE object and dynamic loading

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
let spaceshipVelocity = new THREE.Vector3();
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
let particleSystem = null;
let spaceshipTrail = null;
let isMoving = false;

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

// Animation tracking
let planetAnimationId = null;
let escapeHandlerAbortController = null;
let currentShaderBackground = null;

/* ========= Configuration ========= */
let CONFIG = {};

// Load configuration from config.js
async function loadConfig() {
  // Use default config since we can't import modules dynamically in this context
  CONFIG = getDefaultConfig();
  
  // Update global variables with config values
  spaceshipSpeed = CONFIG.SPACESHIP.SPEED;
  spaceshipRotationSpeed = CONFIG.SPACESHIP.ROTATION_SPEED;
  proximityThreshold = CONFIG.SPACESHIP.PROXIMITY_THRESHOLD;
  mouseLookSensitivity = CONFIG.SPACESHIP.MOUSE_SENSITIVITY;
  
  console.log('[main.js] Configuration loaded:', CONFIG);
}

/* ========= Planet Interaction Functions ========= */
function openPlanetPanel(planet) {
  if (!planet || !planet.mesh) return;
  
  const panel = document.getElementById('planet-panel');
  const title = document.getElementById('planet-title');
  const description = document.getElementById('planet-description');
  const image = document.getElementById('planet-image');
  
  if (!panel || !title || !description) return;
  
  title.textContent = planet.name;
  description.textContent = planet.description || 'No description available.';
  
  if (image && planet.image) {
    image.src = planet.image;
    image.alt = planet.name;
    image.style.display = 'block';
  } else if (image) {
    image.style.display = 'none';
  }
  
  panel.style.display = 'block';
  
  // Close panel when clicking outside
  setTimeout(() => {
    document.addEventListener('click', closePlanetPanelOnClickOutside);
  }, 100);
}

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

function flyToPlanet(planet) {
  if (!planet || !planet.mesh) return;
  
  const targetPosition = planet.worldPosition.clone();
  const distance = planet.radius * 3; // Fly to 3x planet radius
  
  // Position camera behind the planet
  const direction = targetPosition.clone().normalize();
  const cameraPosition = targetPosition.clone().sub(direction.multiplyScalar(distance));
  
  // Smooth camera transition
  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();
  
  let progress = 0;
  const duration = 2000; // 2 seconds
  const startTime = Date.now();
  
  function animateFlyTo() {
    const elapsed = Date.now() - startTime;
    progress = Math.min(elapsed / duration, 1);
    
    // Smooth easing
    const eased = 1 - Math.pow(1 - progress, 3);
    
    camera.position.lerpVectors(startPosition, cameraPosition, eased);
    controls.target.lerpVectors(startTarget, targetPosition, eased);
    
    if (progress < 1) {
      requestAnimationFrame(animateFlyTo);
    } else {
      // Arrived at planet
      nearbyPlanet = planet;
      updateNearbyPlanetIndicator();
    }
  }
  
  animateFlyTo();
}

function updateNearbyPlanetIndicator() {
  const indicator = document.getElementById('nearby-planet-indicator');
  if (!indicator) return;
  
  if (nearbyPlanet) {
    indicator.textContent = `Press SPACE to interact with ${nearbyPlanet.name}`;
    indicator.style.display = 'block';
  } else {
    indicator.style.display = 'none';
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
  
  console.error('Fatal error:', message);
  
  // Show error for 5 seconds then hide
  setTimeout(() => {
    if (overlay) overlay.style.display = 'none';
  }, 5000);
}

function setupUI() {
  // Setup planet panel close button
  const closeBtn = document.getElementById('planet-panel-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closePlanetPanel);
  }
  
  // Setup window resize handler
  window.addEventListener('resize', onWindowResize);
  
  // Setup loading overlay
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.display = 'block';
  }
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
  return name.replace(/[_\-]+/g, ' ').trim()
    .split(' ')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function enhanceMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach(mat => {
      if (mat) {
        mat.needsUpdate = true;
        if (mat.map) mat.map.needsUpdate = true;
      }
    });
  } else {
    material.needsUpdate = true;
    if (material.map) material.map.needsUpdate = true;
  }
}

function getDefaultConfig() {
  return {
    SPACESHIP: {
      SPEED: 0.5,
      ROTATION_SPEED: 0.02,
      PROXIMITY_THRESHOLD: 5,
      MOUSE_SENSITIVITY: 0.002
    },
    PERFORMANCE: {
      ENABLE_SHADOWS: true,
      PIXEL_RATIO_LIMIT: 2,
      PARTICLE_UPDATE_INTERVAL: 2
    }
  };
}

// Dynamic module loader function
async function loadModule(modulePath) {
  try {
    console.log(`[main.js] Loading module: ${modulePath}`);
    
    // Fetch the module file
    const response = await fetch(modulePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch module: ${modulePath}`);
    }
    
    const moduleText = await response.text();
    
    // Extract the default export or class/function definition
    // Look for class definitions first
    const classMatch = moduleText.match(/export\s+default\s+class\s+(\w+)/);
    if (classMatch) {
      // Create a function constructor from the class definition
      const className = classMatch[1];
      const classDefinition = moduleText.replace(/export\s+default\s+/, '');
      
      // Create a new function that returns the class
      const classConstructor = new Function('THREE', `
        ${classDefinition}
        return ${className};
      `);
      
      return classConstructor(window.THREE);
    }
    
    // Look for function exports
    const functionMatch = moduleText.match(/export\s+default\s+function\s+(\w+)/);
    if (functionMatch) {
      const functionName = functionMatch[1];
      const functionDefinition = moduleText.replace(/export\s+default\s+/, '');
      
      const functionConstructor = new Function('THREE', `
        ${functionDefinition}
        return ${functionName};
      `);
      
      return functionConstructor(window.THREE);
    }
    
    // Look for arrow function or object exports
    const exportMatch = moduleText.match(/export\s+default\s+(.+)/);
    if (exportMatch) {
      const exportValue = exportMatch[1];
      
      // Try to evaluate the export
      try {
        const result = new Function('THREE', `return ${exportValue}`)(window.THREE);
        return result;
      } catch (e) {
        console.warn(`[main.js] Could not evaluate export for ${modulePath}:`, e);
        return null;
      }
    }
    
    console.warn(`[main.js] No valid export found in ${modulePath}`);
    return null;
    
  } catch (error) {
    console.error(`[main.js] Failed to load module ${modulePath}:`, error);
    return null;
  }
}

/* ========= Initialization ========= */

function waitForThreeJS() {
  return new Promise((resolve, reject) => {
    if (window.THREE_READY && typeof THREE !== 'undefined' && THREE.GLTFLoader) {
      resolve();
      return;
    }
    
    window.addEventListener('threejs-ready', () => {
      if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
        resolve();
      } else {
        reject(new Error('THREE.js modules not properly loaded.'));
      }
    }, { once: true });
    
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (typeof THREE !== 'undefined' && THREE.WebGLRenderer && THREE.GLTFLoader) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts > 100) {
        clearInterval(checkInterval);
        reject(new Error('THREE.js failed to load'));
      }
    }, 100);
  });
}

console.log('[main.js] Waiting for Three.js to load...');
waitForThreeJS().then(async () => {
  console.log('[main.js] Three.js ready, loading configuration...');
  await loadConfig(); // Load configuration first
  console.log('[main.js] Configuration loaded, initializing...');
  init();
  animate();
}).catch((err) => {
  console.error('[main.js] Initialization failed:', err);
  showFatal(err.message);
});

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

  // Controls (OrbitControls)
  if (typeof THREE.OrbitControls !== 'undefined') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
  } else {
    controls = { enabled: false, update: () => {} };
  }
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
      keys['KeyW'] = deltaY < -threshold;
      keys['KeyS'] = deltaY > threshold;
      keys['KeyA'] = deltaX < -threshold;
      keys['KeyD'] = deltaX > threshold;
    };

    const endDrag = () => {
      isDragging = false;
      dpadStick.style.transform = 'translate(0, 0)';
      keys['KeyW'] = false;
      keys['KeyS'] = false;
      keys['KeyA'] = false;
      keys['KeyD'] = false;
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
    console.log('[main.js] Initializing feature managers...');
    
    // Try to load modules dynamically, but don't fail if they're not available
    
    // Analytics (first for tracking)
    try {
      const AnalyticsManager = await loadModule('js/features/analytics.js');
      if (AnalyticsManager && typeof AnalyticsManager === 'function') {
        analyticsManager = new AnalyticsManager();
        window.analyticsManager = analyticsManager;
        analyticsManager.init();
        console.log('[main.js] AnalyticsManager initialized');
      }
    } catch (error) {
      console.warn('[main.js] Failed to initialize AnalyticsManager:', error);
    }

    // i18n
    try {
      const I18nManager = await loadModule('js/features/i18n.js');
      if (I18nManager && typeof I18nManager === 'function') {
        i18nManager = new I18nManager();
        window.i18nManager = i18nManager;
        await i18nManager.init();
        console.log('[main.js] I18nManager initialized');
      }
    } catch (error) {
      console.warn('[main.js] Failed to initialize I18nManager:', error);
    }

    // Audio
    try {
      const ProceduralMusicGenerator = await loadModule('js/audio/proceduralMusic.js');
      if (ProceduralMusicGenerator && typeof ProceduralMusicGenerator === 'function') {
        audioManager = new ProceduralMusicGenerator();
        window.audioManager = audioManager;
        await audioManager.init();
        console.log('[main.js] ProceduralMusicGenerator initialized');
      }
    } catch (error) {
      console.warn('[main.js] Failed to initialize ProceduralMusicGenerator:', error);
    }

    // Shader backgrounds
    try {
      const ShaderBackgroundGenerator = await loadModule('js/graphics/shaderBackgrounds.js');
      if (ShaderBackgroundGenerator && typeof ShaderBackgroundGenerator === 'function') {
        shaderManager = new ShaderBackgroundGenerator();
        window.shaderManager = shaderManager;
        shaderManager.init(scene);
        console.log('[main.js] ShaderBackgroundGenerator initialized');
      }
    } catch (error) {
      console.warn('[main.js] Failed to initialize ShaderBackgroundGenerator:', error);
    }

    // Chatbot
    try {
      const AIChatbot = await loadModule('js/features/chatbot.js');
      if (AIChatbot && typeof AIChatbot === 'function') {
        chatbot = new AIChatbot();
        window.chatbot = chatbot;
        chatbot.init();
        console.log('[main.js] AIChatbot initialized');
      }
    } catch (error) {
      console.warn('[main.js] Failed to initialize AIChatbot:', error);
    }

    // Guided tour
    try {
      const GuidedTourManager = await loadModule('js/features/guidedTour.js');
      if (GuidedTourManager && typeof GuidedTourManager === 'function') {
        tourManager = new GuidedTourManager();
        window.tourManager = tourManager;
        tourManager.init(scene, camera);
        console.log('[main.js] GuidedTourManager initialized');
      }
    } catch (error) {
      console.warn('[main.js] Failed to initialize GuidedTourManager:', error);
    }

    // Spaceship selector
    try {
      const SpaceshipSelector = await loadModule('js/features/spaceshipSelector.js');
      if (SpaceshipSelector && typeof SpaceshipSelector === 'function') {
        spaceshipSelector = new SpaceshipSelector();
        window.spaceshipSelector = spaceshipSelector;
        spaceshipSelector.init();
        console.log('[main.js] SpaceshipSelector initialized');
      }
    } catch (error) {
      console.warn('[main.js] Failed to initialize SpaceshipSelector:', error);
    }

    // Easter eggs
    try {
      const EasterEggsManager = await loadModule('js/features/easterEggs.js');
      if (EasterEggsManager && typeof EasterEggsManager === 'function') {
        easterEggs = new EasterEggsManager(scene, camera);
        window.easterEggs = easterEggs;
        easterEggs.init();
        console.log('[main.js] EasterEggsManager initialized');
      }
    } catch (error) {
      console.warn('[main.js] Failed to initialize EasterEggsManager:', error);
    }

    // Cockpit view
    try {
      const CockpitViewManager = await loadModule('js/graphics/cockpitView.js');
      if (CockpitViewManager && typeof CockpitViewManager === 'function') {
        cockpitManager = new CockpitViewManager();
        window.cockpitManager = cockpitManager;
        cockpitManager.init(camera, renderer);
        console.log('[main.js] CockpitViewManager initialized');
      }
    } catch (error) {
      console.warn('[main.js] Failed to initialize CockpitViewManager:', error);
    }

    console.log('[main.js] Feature managers initialization complete');
  } catch (error) {
    console.error('[main.js] Failed to initialize features:', error);
  }
}

async function preload(loader, urls) {
  const promises = urls.map(url => new Promise((resolve, reject) => {
    loader.load(url, resolve, () => {}, reject);
  }));
  await Promise.all(promises);
}

/* ========= Loaders + Assets ========= */
async function setupLoadersAndLoadModels() {
  const overlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  const loadingFill = document.getElementById('loading-fill');

  const manager = new THREE.LoadingManager();
  manager.onStart = (url, itemsLoaded, itemsTotal) => {
    if (overlay) overlay.style.display = 'flex';
    if (loadingText) loadingText.textContent = `Starting ${url}`;
  };
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    if (loadingText) loadingText.textContent = `Loading ${itemsLoaded} / ${itemsTotal}`;
    if (loadingFill) loadingFill.style.width = Math.round((itemsLoaded / itemsTotal) * 100) + '%';
  };
  manager.onError = (url) => {
    console.warn('LoadingManager error for', url);
  };
  manager.onLoad = () => {
    if (loadingText) loadingText.textContent = 'All assets loaded';
    if (loadingFill) loadingFill.style.width = '100%';
    setTimeout(() => {
      if (overlay) overlay.style.display = 'none';
    }, 350);
  };

  if (typeof THREE.GLTFLoader === 'undefined') {
    showFatal('THREE.GLTFLoader is not available.');
    return;
  }

  const loader = new THREE.GLTFLoader(manager);
  
  if (typeof THREE.DRACOLoader !== 'undefined') {
    try {
      const draco = new THREE.DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);
      
      // Preload models
      await preload(loader, [
        MODELS_PATH + SOLAR_GLTF,
        MODELS_PATH + SPACESHIP_GLTF
      ]);
    } catch (e) {
      console.warn('DRACOLoader setup failed:', e);
    }
  }

}

/* ========= Helper Functions ========= */
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
      if (e.shiftKey) flyToPlanet(match);
      
      // Track analytics
      if (analyticsManager) {
        analyticsManager.trackPlanetVisit(match.name);
      }
    }
  }
}

/* ========= Spaceship Controls ========= */
/* ========= Mobile Controller ========= */
function setupMobileController() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   (window.matchMedia && window.matchMedia("(max-width: 1024px)").matches);
  
  if (!isMobile) {
    console.log('Desktop detected - mobile controller hidden');
    return;
  }

  console.log('Mobile device detected - initializing controller');

  const dpadContainer = document.querySelector('.dpad-container');
  const dpadStick = document.getElementById('dpad-stick');
  const actionButtons = document.querySelectorAll('.action-btn');
  const rotateButtons = document.querySelectorAll('.rotate-btn');
  const centerInteract = document.getElementById('center-interact');

  if (!dpadContainer || !dpadStick) {
    console.warn('Mobile controller elements not found');
    return;
  }

  // D-Pad state
  let dpadActive = false;
  let dpadCenter = { x: 0, y: 0 };
  let dpadTouchId = null;

  dpadContainer.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (dpadTouchId !== null) return;

    const touch = e.touches[0];
    dpadTouchId = touch.identifier;
    dpadActive = true;

    const rect = dpadContainer.getBoundingClientRect();
    dpadCenter.x = rect.left + rect.width / 2;
    dpadCenter.y = rect.top + rect.height / 2;

    updateDPad(touch.clientX, touch.clientY);
  }, { passive: false });

  dpadContainer.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!dpadActive) return;

    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === dpadTouchId) {
        updateDPad(e.touches[i].clientX, e.touches[i].clientY);
        break;
      }
    }
  }, { passive: false });

  const endDPad = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === dpadTouchId) {
        dpadActive = false;
        dpadTouchId = null;
        resetDPad();
        break;
      }
    }
  };

  dpadContainer.addEventListener('touchend', endDPad, { passive: false });
  dpadContainer.addEventListener('touchcancel', endDPad, { passive: false });

  function updateDPad(touchX, touchY) {
    const dx = touchX - dpadCenter.x;
    const dy = touchY - dpadCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 40;

    let clampedDx = dx;
    let clampedDy = dy;
    if (distance > maxDistance) {
      clampedDx = (dx / distance) * maxDistance;
      clampedDy = (dy / distance) * maxDistance;
    }

    dpadStick.style.transform = `translate(calc(-50% + ${clampedDx}px), calc(-50% + ${clampedDy}px))`;
    dpadStick.classList.add('active');

    const normalizedX = clampedDx / maxDistance;
    const normalizedY = clampedDy / maxDistance;
    const threshold = 0.3;
    
    keys['w'] = normalizedY < -threshold;
    keys['s'] = normalizedY > threshold;
    keys['a'] = normalizedX < -threshold;
    keys['d'] = normalizedX > threshold;
  }

  function resetDPad() {
    dpadStick.style.transform = 'translate(-50%, -50%)';
    dpadStick.classList.remove('active');
    keys['w'] = keys['s'] = keys['a'] = keys['d'] = false;
  }

  // Action buttons
  actionButtons.forEach(btn => {
    const action = btn.dataset.action;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      btn.classList.add('pressed');
      
      if (action === 'forward') keys['w'] = true;
      if (action === 'back') keys['s'] = true;
      if (action === 'left') keys['a'] = true;
      if (action === 'right') keys['d'] = true;
    }, { passive: false });

    const endAction = (e) => {
      e.preventDefault();
      btn.classList.remove('pressed');
      
      if (action === 'forward') keys['w'] = false;
      if (action === 'back') keys['s'] = false;
      if (action === 'left') keys['a'] = false;
      if (action === 'right') keys['d'] = false;
    };

    btn.addEventListener('touchend', endAction, { passive: false });
    btn.addEventListener('touchcancel', endAction, { passive: false });
  });

  // Center interact button
  if (centerInteract) {
    let isUpMode = true;

    centerInteract.addEventListener('touchstart', (e) => {
      e.preventDefault();
      
      if (nearbyPlanet) {
        openPlanetPanel(nearbyPlanet);
        return;
      }

      if (isUpMode) {
        keys[' '] = true;
        keys['shift'] = false;
      } else {
        keys['shift'] = true;
        keys[' '] = false;
      }
    }, { passive: false });

    centerInteract.addEventListener('touchend', (e) => {
      e.preventDefault();
      keys[' '] = false;
      keys['shift'] = false;
      isUpMode = !isUpMode;
    }, { passive: false });
  }

  // Rotation buttons
  rotateButtons.forEach(btn => {
    const action = btn.dataset.action;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (action === 'rotate-left') keys['q'] = true;
      if (action === 'rotate-right') keys['e'] = true;
    }, { passive: false });

    const endRotate = (e) => {
      e.preventDefault();
      if (action === 'rotate-left') keys['q'] = false;
      if (action === 'rotate-right') keys['e'] = false;
    };

    btn.addEventListener('touchend', endRotate, { passive: false });
    btn.addEventListener('touchcancel', endRotate, { passive: false });
  });

  console.log('✓ Mobile controller initialized');
}

function updateControlStatus(mode) {
  const statusEl = document.getElementById('control-mode-text');
  if (statusEl) {
    statusEl.textContent = mode;
    statusEl.style.color = mode === 'Game Mode' ? '#00ff00' : '#06b6d4';
  }
}

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
function flyToPlanet(planetEntry) {
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
    const dt = clock.getDelta();

    // Manual spaceship control
    if (isManualControl && spaceship) {
      spaceship.rotation.y = yaw;
      
      // Keyboard rotation
      if (keys['q']) {
        yaw += spaceshipRotationSpeed;
        spaceship.rotation.y = yaw;
      }
      if (keys['e']) {
        yaw -= spaceshipRotationSpeed;
        spaceship.rotation.y = yaw;
      }
      
      // Calculate target velocity
      targetVelocity.set(0, 0, 0);
      
      if (keys['w'] || keys['ArrowUp']) targetVelocity.z -= 1;
      if (keys['s'] || keys['ArrowDown']) targetVelocity.z += 1;
      if (keys['a'] || keys['ArrowLeft']) targetVelocity.x -= 1;
      if (keys['d'] || keys['ArrowRight']) targetVelocity.x += 1;
      if (keys[' '] && !nearbyPlanet) targetVelocity.y += 1;
      if (keys['shift'] || keys['Shift']) targetVelocity.y -= 1;
      
      if (targetVelocity.length() > 0) {
        targetVelocity.normalize().multiplyScalar(spaceshipSpeed);
      }
      
      // Smooth velocity
      currentVelocity.lerp(targetVelocity, CONFIG.PERFORMANCE.VELOCITY_LERP_SPEED * dt);
      
      // Apply movement
      if (currentVelocity.length() > 0.01) {
        if (Math.abs(currentVelocity.z) > 0.01) {
          spaceship.translateZ(-currentVelocity.z * dt * CONFIG.PERFORMANCE.FRAME_RATE_TARGET);
        }
        if (Math.abs(currentVelocity.x) > 0.01) {
          spaceship.translateX(currentVelocity.x * dt * CONFIG.PERFORMANCE.FRAME_RATE_TARGET);
        }
        if (Math.abs(currentVelocity.y) > 0.01) {
          spaceship.position.y += currentVelocity.y * dt * CONFIG.PERFORMANCE.FRAME_RATE_TARGET;
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
      
      updateVFX();
      
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
      camera.position.lerp(desiredCam, 0.06);
      
      const lookAtTarget = new THREE.Vector3();
      if (spaceship.userData.targetPlanet) {
        spaceship.userData.targetPlanet.mesh.getWorldPosition(lookAtTarget);
      } else {
        lookAtTarget.copy(spaceship.position);
      }
      camera.lookAt(lookAtTarget);
    } else {
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
          console.warn('LOD update error:', e);
        }
      }
    }

    renderer.render(scene, camera);
  } catch (err) {
    console.error('[animate] Error in render loop:', err);
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
      flyToPlanet(cur);
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
function setupVFX() {
  if (!scene || !THREE || !spaceship) return;
  
  try {
    const particleCount = 50;
    
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = spaceship.position.x;
      positions[i + 1] = spaceship.position.y;
      positions[i + 2] = spaceship.position.z;
      
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
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    
    particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
    
    // Engine glow
    const glowGeometry = new THREE.SphereGeometry(0.25, 6, 6);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    spaceshipTrail = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(spaceshipTrail);
    
    console.log('VFX initialized');
  } catch (e) {
    console.error('VFX setup failed:', e);
  }
}

function updateVFX() {
  if (!spaceship || !particleSystem || !spaceshipTrail) return;
  
  try {
    isMoving = currentVelocity.length() > 0.1;
    
    if (isMoving) {
      const elapsed = clock.getElapsedTime();
      if (Math.floor(elapsed * 30) % CONFIG.PERFORMANCE.PARTICLE_UPDATE_INTERVAL === 0) {
        const positions = particleSystem.geometry.attributes.position.array;
        const particleCount = positions.length / 3;
        
        for (let i = particleCount - 1; i > 0; i--) {
          const i3 = i * 3;
          const prevI3 = (i - 1) * 3;
          
          positions[i3] = positions[prevI3];
          positions[i3 + 1] = positions[prevI3 + 1];
          positions[i3 + 2] = positions[prevI3 + 2];
        }
        
        const shipPos = spaceship.position;
        positions[0] = shipPos.x;
        positions[1] = shipPos.y;
        positions[2] = shipPos.z;
        
        particleSystem.geometry.attributes.position.needsUpdate = true;
      }
      
      particleSystem.visible = true;
      
      spaceshipTrail.position.copy(spaceship.position);
      const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(spaceship.quaternion);
      spaceshipTrail.position.add(backward.multiplyScalar(-1.5));
      spaceshipTrail.visible = true;
    } else {
      particleSystem.visible = false;
      spaceshipTrail.visible = false;
    }
  } catch (e) {
    console.error('VFX update error:', e);
  }
}

/* ======= Export globals for feature managers ======= */
window.spaceshipSpeed = spaceshipSpeed;
window.scene = scene;
window.camera = camera;
window.spaceship = spaceship;
window.PLANETS = PLANETS;
