// main.js — robust integrated loader + interaction
// Expects: resources/solar_system_real_scale_2k_textures.glb and resources/spaceship.glb
// Put both GLBs inside resources/ relative to index.html

/* ========= Config ========= */
const MODELS_PATH = "resources/";
const SOLAR_GLTF = "solar_system_real_scale_2k_textures.glb";
const SPACESHIP_MODELS = [
  "spaceships/cruiser.glb",
  "spaceships/fighter.glb",
  "spaceships/spaceship.glb",
  "spaceships/star_sparrow_modular_spaceship.glb",
];
const PLANET_DATA = [
  { name: "Sun", distance: 0, size: 2, color: 0xffff00, emissive: 0x444400 },
  { name: "Mercury", distance: 10, size: 0.5, color: 0x888888 },
  { name: "Venus", distance: 15, size: 0.7, color: 0xffff88 },
  { name: "Earth", distance: 20, size: 0.8, color: 0x4444ff },
  { name: "Mars", distance: 25, size: 0.6, color: 0xff4444 },
  { name: "Jupiter", distance: 40, size: 1.5, color: 0xffaa44 },
  { name: "Saturn", distance: 50, size: 1.3, color: 0xffdd88 },
];
let currentSpaceshipIndex = 0;
let flightSpeed = 0.1; // Increased for better tour pacing
let arriveThreshold = 0.1; // Balanced for reliable arrival

/* ========= Scene globals ========= */
let scene, camera, renderer, clock, controls;
let composer, bloomPass; // Post-processing
let raycaster, mouse;
let PLANETS = []; // entries: { name, mesh, bbox, worldPosition, info, _lodPlaceholder }
let spaceship = null;
let isFlying = false;
let flightTarget = null; // Will be initialized after THREE loads
let hasInitialized = false;

// Game-style controls
let spaceshipVelocity = null; // Will be initialized after THREE loads
let spaceshipSpeed = 0.6; // Increased for better flying feel
let spaceshipRotationSpeed = 0.08; // Increased for snappier responsiveness
let isManualControl = true; // Start in manual control mode for game-like experience
let cameraMode = 'THIRD_PERSON'; // 'THIRD_PERSON' or 'COCKPIT'
let keys = {};

// Tour Mode
let isTourActive = false;
let tourIndex = 0;
let nearbyPlanet = null;
let proximityThreshold = 25; // Increased - easier to interact with planets

// Movement smoothing for better flying feel
let currentVelocity = null; // Will be initialized after THREE loads
let targetVelocity = null; // Will be initialized after THREE loads

// Mouse look controls - simplified (no pointer lock needed)
let mouseLookSensitivity = 0.005; // Increased for more responsive camera
let pitch = 0; // Vertical rotation
let yaw = -Math.PI / 4 + Math.PI; // Match spaceship's initial rotation
let isMouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

// VFX (optimized for performance)
let particleSystem = null;
let starfield = null;
let spaceDust = null;
let spaceshipTrail = null;
let isMoving = false;

// Boost mechanics
let isBoostActive = false;
let baseFlightSpeed = 0.06;
let baseSpaceshipSpeed = 0.6;
let boostMultiplier = 3.0;
let baseFOV = 60;
let targetFOV = 60;

// Cinematic intro
let introCinematic = false; // Disabled by default for better performance
let introStep = 0;
let introTimer = 0;
let introDuration = 3000; // 3 seconds per planet
let introStartTime = 0;
let introMaxDuration = 30000; // Max 30 seconds total

function showFatal(message) {
  try {
    console.error(message);
    const overlay = document.getElementById("loading-overlay");
    const loadingText = document.getElementById("loading-text");
    const loadingFill = document.getElementById("loading-fill");
    if (overlay) overlay.style.display = "flex";
    if (loadingText) loadingText.textContent = String(message);
    if (loadingFill) loadingFill.style.width = "0%";
  } catch (e) {}
}

// Wait for DOM and Three.js to be ready
function waitForThreeJS() {
  return new Promise((resolve, reject) => {
    // Check if already ready
    if (
      window.THREE_READY &&
      typeof THREE !== "undefined" &&
      THREE.GLTFLoader
    ) {
      resolve();
      return;
    }

    // Listen for the ready event
    window.addEventListener(
      "threejs-ready",
      () => {
        if (typeof THREE !== "undefined" && THREE.GLTFLoader) {
          resolve();
        } else {
          reject(new Error("THREE.js modules not properly loaded."));
        }
      },
      { once: true }
    );

    // Fallback: poll for THREE.js (in case event doesn't fire)
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (
        typeof THREE !== "undefined" &&
        THREE.WebGLRenderer &&
        THREE.GLTFLoader
      ) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts > 100) {
        clearInterval(checkInterval);
        const missing = [];
        if (typeof THREE === "undefined") missing.push("THREE");
        else if (!THREE.WebGLRenderer) missing.push("THREE.WebGLRenderer");
        else if (!THREE.GLTFLoader) missing.push("THREE.GLTFLoader");
        reject(
          new Error(
            `THREE.js failed to load. Missing: ${missing.join(
              ", "
            )}. Check browser console for script errors.`
          )
        );
      }
    }, 100);
  });
}

// Initialize after everything is ready
console.log("[main.js] Waiting for Three.js to load...");
waitForThreeJS()
  .then(() => {
    console.log("[main.js] Three.js ready, initializing...");
    init();
    animate();
  })
  .catch((err) => {
    console.error("[main.js] Initialization failed:", err);
    showFatal(err.message);

    // Additional debugging info
    if (window.THREE_LOAD_ERROR) {
      console.error(
        "[main.js] Three.js load error details:",
        window.THREE_LOAD_ERROR
      );
    }
    console.log("[main.js] THREE available:", typeof THREE !== "undefined");
    if (typeof THREE !== "undefined") {
      console.log("[main.js] THREE.WebGLRenderer:", !!THREE.WebGLRenderer);
      console.log("[main.js] THREE.GLTFLoader:", !!THREE.GLTFLoader);
    }
  });

function createProceduralSolarSystem() {
  const system = new THREE.Group();

  PLANET_DATA.forEach(data => {
    const geom = new THREE.SphereGeometry(data.size, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: 0.7,
      metalness: 0.1,
      emissive: data.emissive || 0x000000,
    });
    const mesh = new THREE.Mesh(geom, mat);
    if (data.distance > 0) {
      mesh.position.x = data.distance;
    }
    mesh.name = data.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    system.add(mesh);
  });

  scene.add(system);

  // Traverse and add to PLANETS
  system.traverse((child) => {
    if (child.isMesh) {
      const bbox = new THREE.Box3().setFromObject(child);
      if (bbox.isEmpty()) return;
      const name = child.name;
      const worldPos = new THREE.Vector3();
      child.getWorldPosition(worldPos);

      const entry = {
        name,
        mesh: child,
        worldPosition: worldPos.clone(),
        bbox,
        info: {
          title: prettify(name),
          description: `Project section for ${prettify(name)}.`,
        },
      };
      PLANETS.push(entry);
    }
  });

  // Adjust camera
  const box = new THREE.Box3().setFromObject(system);
  const center = box.getCenter(new THREE.Vector3());
  system.position.sub(center);

  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0 && !spaceship) {
    const distance = maxDim * 1.2;
    camera.position.set(0, distance * 0.4, distance);
    camera.lookAt(0, 0, 0);
    if (controls && controls.update) controls.update();
  }
}

/* ======= Initialization ======= */
function init() {
  if (hasInitialized) return;
  hasInitialized = true;

  // Initialize flightTarget and spaceshipVelocity now that THREE is available
  if (!flightTarget) flightTarget = new THREE.Vector3();
  if (!spaceshipVelocity) spaceshipVelocity = new THREE.Vector3();
  if (!currentVelocity) currentVelocity = new THREE.Vector3();
  if (!targetVelocity) targetVelocity = new THREE.Vector3();

  // Renderer + canvas
  const canvas = document.getElementById("glCanvas");
  if (!canvas) {
    showFatal("Canvas element #glCanvas not found in DOM.");
    return;
  }
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
    alpha: false,
    powerPreference: "high-performance",
  });
  // PERFORMANCE FIX: Cap pixel ratio to 1.5 to prevent lag on high-DPI screens (4K/Retina)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  
  // PERFORMANCE FIX: Disable shadows to prevent "GPU stall due to ReadPixels"
  // Shadows are expensive and often cause synchronization issues in WebGL
  renderer.shadowMap.enabled = false; 
  // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false; // Disable shadows for better performance
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Scene + Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  // Initial camera position - will be adjusted when solar system loads
  camera.position.set(0, 15, 30);
  camera.lookAt(0, 0, 0);

  // Controls (OrbitControls) — disabled by default for game-like experience
  if (typeof THREE.OrbitControls !== "undefined") {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
  } else {
    console.warn("OrbitControls not found. Camera will be fixed until flight.");
    controls = { enabled: false, update: () => {} };
  }
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enabled = false; // Start with manual control mode

  // Enhanced lighting for better visuals
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
  scene.add(hemi);

  // Main directional light (sun)
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(50, 100, 50);
  dir.castShadow = false;
  scene.add(dir);

  // Additional fill light
  const fill = new THREE.DirectionalLight(0x88aaff, 0.4);
  fill.position.set(-50, 30, -50);
  scene.add(fill);

  // Ambient light for overall illumination
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  // Helpers
  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Load models and project map (robust)
  setupLoadersAndLoadModels();

  // Events
  window.addEventListener("resize", onWindowResize);
  renderer.domElement.addEventListener("pointerdown", onPointerDown, false);

  // Game-style controls
  setupSpaceshipControls();

  // UI
  createPlanetPanelUI();
  setupProjectEditorUI();
  setupSpaceshipUI();

  // Initialize audio and VFX (optimized versions)
  setupAudio();
  
  // Setup Post-Processing (Bloom)
  setupPostProcessing();

  // Setup Environment (Stars & Dust)
  // PERFORMANCE FIX: Reduced particle counts
  createStarfield(1000); // Further reduced for performance
  createSpaceDust(200); // Further reduced for performance

  // Initialize control status (will be updated when spaceship loads)
  // Start in manual control mode for game experience
  updateControlStatus("Manual Control Mode");

  // Setup Tour UI events
  setupTourUI();
}

// Setup Tour and Cinematic Intro buttons
function setupTourUI() {
  const tourBtn = document.getElementById('start-tour-btn');
  if (tourBtn) {
    tourBtn.addEventListener('click', () => {
      console.log('[Tour] Starting tour mode');
      isTourActive = true;
      tourIndex = 0;
      if (PLANETS.length > 0) {
        flyToPlanet(PLANETS[0]);
      }
    });
  }
  
  const introBtn = document.getElementById('cinematic-intro-btn');
  if (introBtn) {
    introBtn.addEventListener('click', () => {
      console.log('[Intro] Starting cinematic intro');
      // Reset intro state
      introCinematic = true;
      introStep = 0;
      introTimer = 0;
      introStartTime = 0;
      
      // Show loading overlay for intro
      const overlay = document.getElementById('loading-overlay');
      const loadingText = document.getElementById('loading-text');
      if (overlay) overlay.style.display = 'flex';
      if (loadingText) loadingText.textContent = 'Starting cinematic tour...';
    });
  }
}

/* ======= Loaders + assets ======= */
function setupLoadersAndLoadModels() {
  const overlay = document.getElementById("loading-overlay");
  const loadingText = document.getElementById("loading-text");
  const loadingFill = document.getElementById("loading-fill");

  // Quick preflight to surface common localhost issues (404s/MIME)
  (async function preflight() {
    try {
      const [a, b] = await Promise.allSettled([
        fetch(MODELS_PATH + SOLAR_GLTF, { method: "HEAD" }),
        fetch(MODELS_PATH + SPACESHIP_MODELS[0], { method: "HEAD" }),
      ]);
      const solarOk = a.status === "fulfilled" && a.value.ok;
      const shipOk = b.status === "fulfilled" && b.value.ok;
      if (!solarOk || !shipOk) {
        const msg = `Asset not reachable: ${!solarOk ? SOLAR_GLTF : ""} ${
          !shipOk ? SPACESHIP_MODELS[0] : ""
        }. Ensure a local server and correct paths.`;
        console.error(msg, { solar: a, ship: b });
        if (loadingText) loadingText.textContent = msg;
      }
    } catch (e) {
      console.warn("Preflight failed (continuing):", e);
    }
  })();

  const manager = new THREE.LoadingManager();
  manager.onStart = (url, itemsLoaded, itemsTotal) => {
    if (overlay) overlay.style.display = "flex";
    if (loadingText) loadingText.textContent = `Starting ${url}`;
  };
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    if (loadingText)
      loadingText.textContent = `Loading ${itemsLoaded} / ${itemsTotal}`;
    if (loadingFill)
      loadingFill.style.width =
        Math.round((itemsLoaded / itemsTotal) * 100) + "%";
  };
  manager.onError = (url) => {
    console.warn("LoadingManager error for", url);
  };
  manager.onLoad = () => {
    if (loadingText) loadingText.textContent = "Ready! Click anywhere to start";
    if (loadingFill) loadingFill.style.width = "100%";
    
    // Hide loading overlay after a short delay
    setTimeout(() => {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) overlay.style.display = 'none';
    }, 800);
  };

  if (typeof THREE.GLTFLoader === "undefined") {
    showFatal(
      "THREE.GLTFLoader is not available. Check that all Three.js scripts loaded correctly."
    );
    return;
  }

  const loader = new THREE.GLTFLoader(manager);
  // Optional: Draco
  if (typeof THREE.DRACOLoader !== "undefined") {
    try {
      const draco = new THREE.DRACOLoader();
      // Use a stable CDN for Draco decoders to avoid local path issues
      draco.setDecoderPath(
        "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
      );
      loader.setDRACOLoader(draco);
    } catch (e) {
      console.warn("DRACOLoader setup failed, continuing without Draco:", e);
    }
  } else {
    console.warn("DRACOLoader not found; loading will proceed without Draco.");
  }

  // Create procedural solar system
  createProceduralSolarSystem();

  // Load spaceship GLB (Initial load)
  loadSpaceship(currentSpaceshipIndex);

  // Try to fetch external project_map.json but don't block rendering if missing
  (async function () {
    const url = MODELS_PATH + "project_map.json";
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn("project_map.json not loaded, status", resp.status);
        return;
      }
      const external = await resp.json();
      // merge
      window.PROJECT_MAP = window.PROJECT_MAP || {};
      for (const k of Object.keys(external))
        window.PROJECT_MAP[k] = external[k];
      console.log("Loaded external PROJECT_MAP from", url);
    } catch (e) {
      console.warn("Failed to fetch project_map.json (continuing):", e.message);
    }
  })();
}

/* ======= Spaceship Loading ======= */
function loadSpaceship(index) {
  if (index < 0 || index >= SPACESHIP_MODELS.length) return;

  const overlay = document.getElementById("loading-overlay");
  const loadingText = document.getElementById("loading-text");

  // Show small loading indicator if switching during gameplay
  if (hasInitialized && !overlay.style.display === "flex") {
    // Optional: could add a toast or small indicator here
    console.log(`Switching to spaceship ${index + 1}...`);
  }

// PERFORMANCE FIX: Use lightweight procedural spaceship instead of heavy GLTF model
const geometry = new THREE.ConeGeometry(0.5, 2, 8);
geometry.rotateX(Math.PI / 2); // Point forward
const material = new THREE.MeshStandardMaterial({
  color: 0x00ffff,
  emissive: 0x0044aa,
  roughness: 0.4,
  metalness: 0.8,
});
spaceship = new THREE.Mesh(geometry, material);

// Engine glow
const engineGeom = new THREE.ConeGeometry(0.2, 0.5, 8);
engineGeom.rotateX(-Math.PI / 2);
const engineMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
const engine = new THREE.Mesh(engineGeom, engineMat);
engine.position.z = 1;
spaceship.add(engine);

spaceship.position.set(0, 0, 50);
scene.add(spaceship);

// Add point light to spaceship
const shipLight = new THREE.PointLight(0x00ffff, 1, 20);
shipLight.position.set(0, 1, 0);
spaceship.add(shipLight);

// Update UI and status
updateSpaceshipUI(index);
currentSpaceshipIndex = index;
console.log(`Procedural spaceship created for index ${index}`);
if (!hasInitialized) {
        // Position camera behind spaceship
        const behind = new THREE.Vector3(0, 2, -8).applyQuaternion(
          spaceship.quaternion
        );
        const cameraPos = new THREE.Vector3()
          .copy(spaceship.position)
          .add(behind);
        camera.position.copy(cameraPos);
        camera.lookAt(spaceship.position);

        isManualControl = true;
        if (controls) controls.enabled = false;
        updateControlStatus("Manual Control Mode");

        setupVFX();
      }

      // Re-initialize VFX particles at new ship position if needed
      if (particleSystem) {
        const positions = particleSystem.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] = spaceship.position.x;
          positions[i + 1] = spaceship.position.y;
          positions[i + 2] = spaceship.position.z;
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
      }
}

/* ======= Helpers ======= */
function prettify(name) {
  if (!name) return "Unnamed";
  return name
    .replace(/[_\-]+/g, " ")
    .trim()
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

/* ======= Events ======= */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

/* ======= Raycast & Interaction ======= */
function onPointerDown(e) {
  // ignore if editing text etc.
  const el = document.activeElement;
  if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;

  // Don't handle planet clicks if mouse is being used for looking
  if (isMouseDown && isManualControl) {
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  // collect intersectables
  const intersectables = [];
  for (const p of PLANETS) {
    if (p.mesh) intersectables.push(p.mesh);
  }
  const hits = raycaster.intersectObjects(intersectables, true);
  if (hits.length) {
    // find planet entry for hit mesh (walk ancestors)
    let obj = hits[0].object;
    let match = null;
    for (const p of PLANETS) {
      if (p.mesh === obj || isAncestor(p.mesh, obj)) {
        match = p;
        break;
      }
    }
    if (!match) {
      // fallback: pick nearest planet by distance to hit point
      const pt = hits[0].point;
      let best = null,
        bestd = Infinity;
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
      // if user clicks panel travel will be separate; also allow direct travel on shift-click
      if (e.shiftKey) flyToPlanet(match);
    }
  }
}

function isAncestor(root, node) {
  let cur = node;
  while (cur) {
    if (cur === root) return true;
    cur = cur.parent;
  }
  return false;
}

/* ======= Spaceship Controls ======= */
function setupSpaceshipControls() {
  const canvas = renderer.domElement;

  // Simplified mouse look - just drag to look around (no pointer lock needed)
  canvas.addEventListener("mousedown", (e) => {
    if (isManualControl && e.button === 0) {
      // Left mouse button
      isMouseDown = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  });

  canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
      isMouseDown = false;
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    if (isMouseDown && isManualControl) {
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;

      yaw -= deltaX * mouseLookSensitivity;
      pitch -= deltaY * mouseLookSensitivity;

      // Limit pitch to avoid gimbal lock
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  });

  // Keyboard controls
  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    keys[e.key] = true;

    // Toggle manual control mode with M key (optional - can be removed if too complex)
    if (e.key.toLowerCase() === "m") {
      isManualControl = !isManualControl;
      if (isManualControl) {
        controls.enabled = false;
        isFlying = false;
        updateControlStatus("Game Mode");
      } else {
        controls.enabled = true;
        updateControlStatus("Orbit Mode");
      }
    }

    // Toggle Camera Mode (Cockpit / Third Person)
    if (e.key.toLowerCase() === "c") {
      cameraMode = cameraMode === 'THIRD_PERSON' ? 'COCKPIT' : 'THIRD_PERSON';
      showControlHint(cameraMode === 'COCKPIT' ? "Cockpit View" : "Third-Person View");
    }

    // Space to interact with nearby planet OR move up
    if (e.key === " ") {
      if (nearbyPlanet) {
        // If near a planet, interact with it
        e.preventDefault();
        openPlanetPanel(nearbyPlanet);
      }
      // Otherwise space is used for moving up (handled in animate loop)
    }

    // Spaceship switching
    if (["1", "2", "3", "4"].includes(e.key)) {
      const index = parseInt(e.key) - 1;
      if (index >= 0 && index < SPACESHIP_MODELS.length) {
        loadSpaceship(index);

        // Show feedback
        const hint = document.getElementById("control-hint");
        if (hint) {
          const msg = `Switched to spaceship ${index + 1}`;
          showControlHint(msg);
          setTimeout(
            () =>
              showControlHint(
                "Controls:\nWASD/Arrows to Move\nMouse to Look\nSPACE/SHIFT for Up/Down"
              ),
            2000
          );
        }
      }
    }

    // Pitch control (R = pitch up, F = pitch down)
    if (e.key.toLowerCase() === 'r') {
      keys['r'] = true;
    }
    if (e.key.toLowerCase() === 'f') {
      keys['f'] = true;
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.key] = false;
  });

  // Touch controls for mobile
  let touchStart = null;
  renderer.domElement.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      touchStart = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  });

  renderer.domElement.addEventListener("touchend", (e) => {
    if (touchStart && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;
      const dt = Date.now() - touchStart.time;

      // If it's a quick tap (not a drag) and near a planet
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300 && nearbyPlanet) {
        openPlanetPanel(nearbyPlanet);
      }
      touchStart = null;
    }
  });
}

function showControlHint(message) {
  const hint = document.getElementById("control-hint");
  if (hint) {
    // Update the message in the hint box
    const messageDiv = hint.querySelector("div:last-child");
    if (messageDiv) {
      messageDiv.innerHTML = message
        .split("\n")
        .map((line) => `<div>${line}</div>`)
        .join("");
    }
  }
}

function setupSpaceshipUI() {
  const buttons = document.querySelectorAll(".spaceship-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      if (!isNaN(index)) {
        loadSpaceship(index);
      }
    });
  });
}

function updateSpaceshipUI(index) {
  const buttons = document.querySelectorAll(".spaceship-btn");
  buttons.forEach((btn) => {
    const btnIndex = parseInt(btn.dataset.index);
    if (btnIndex === index) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function updateControlStatus(mode) {
  const statusEl = document.getElementById("control-mode-text");
  if (statusEl) {
    statusEl.textContent = mode;
    statusEl.style.color =
      mode === "Manual Control Mode" ? "#00ff00" : "#06b6d4";
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

  // Update nearby planet indicator
  if (closestDistance < proximityThreshold) {
    nearbyPlanet = closestPlanet;
    updateProximityIndicator(closestPlanet, closestDistance);
  } else {
    nearbyPlanet = null;
    updateProximityIndicator(null, 0);
  }
}

function updateProximityIndicator(planet, distance) {
  const indicator = document.getElementById("proximity-indicator");
  if (!indicator) return;

  if (planet && distance < proximityThreshold) {
    const mapEntry =
      (window.PROJECT_MAP && window.PROJECT_MAP[planet.name]) || null;
    const planetName =
      mapEntry && mapEntry.title ? mapEntry.title : prettify(planet.name);
    const proximityPercent = Math.max(
      0,
      Math.min(100, (1 - distance / proximityThreshold) * 100)
    );
    indicator.innerHTML = `
      <div style="background:rgba(0,255,0,0.3);border:2px solid #00ff00;padding:12px;border-radius:8px;box-shadow:0 0 20px rgba(0,255,0,0.5);">
        <div style="font-weight:700;color:#00ff00;font-size:16px;margin-bottom:6px;">✨ ${planetName}</div>
        <div style="font-size:13px;color:#88ff88;margin-bottom:8px;">Press <strong>SPACE</strong> or <strong>CLICK</strong> to view info</div>
        <div style="background:rgba(0,0,0,0.3);height:6px;border-radius:3px;overflow:hidden;margin-top:8px;">
          <div style="background:linear-gradient(90deg,#00ff00,#88ff88);height:100%;width:${proximityPercent}%;transition:width 0.2s;"></div>
        </div>
      </div>
    `;
    indicator.style.display = "block";
  } else {
    indicator.style.display = "none";
  }
}

/* ======= Flight logic ======= */
function flyToPlanet(planetEntry) {
  if (!spaceship || !planetEntry) {
    openPlanetPanel(planetEntry);
    return;
  }
  const targetWorld = new THREE.Vector3();
  planetEntry.mesh.getWorldPosition(targetWorld);
  const size = new THREE.Vector3();
  planetEntry.bbox.getSize(size);
  // Clamp radius to avoid stopping too far from large objects (like solar system root)
  const rawRadius = Math.max(size.x, size.y, size.z) * 0.5;
  const radiusApprox = Math.min(rawRadius, 5.0);

  // direction from spaceship to planet (so we fly towards the planet)
  const dir = new THREE.Vector3()
    .subVectors(targetWorld, spaceship.position)
    .normalize();

  // Fly to a point just above the planet surface
  flightTarget.copy(targetWorld).add(dir.multiplyScalar(radiusApprox + 0.5));
  spaceship.userData.targetPlanet = planetEntry;

  isFlying = true;
  isManualControl = false;
  // disable orbit controls during flight
  controls.enabled = false;
}

/* ======= Animation loop ======= */
function animate() {
  requestAnimationFrame(animate);

  // Safety check - don't render if not initialized
  if (!renderer || !scene || !camera) {
    return;
  }

  try {
    const dt = clock.getDelta();

    // Manual spaceship control - improved flying feel
    if (isManualControl && spaceship && !introCinematic) {
      // Apply rotation from mouse look or keyboard
      spaceship.rotation.y = yaw;

      // Keyboard rotation - FIXED: reversed direction so it feels natural
      if (keys["q"]) {
        yaw += spaceshipRotationSpeed; // Rotate left (positive rotation)
        spaceship.rotation.y = yaw;
      }
      if (keys["e"]) {
        yaw -= spaceshipRotationSpeed; // Rotate right (negative rotation)
        spaceship.rotation.y = yaw;
      }

      // Pitch control (nose up/down) - NEW!
      if (keys["r"]) {
        pitch -= spaceshipRotationSpeed * 0.5; // Pitch up (nose up)
        pitch = Math.max(pitch, -Math.PI / 3); // Limit to 60 degrees up
      }
      if (keys["f"]) {
        pitch += spaceshipRotationSpeed * 0.5; // Pitch down (nose down)
        pitch = Math.min(pitch, Math.PI / 3); // Limit to 60 degrees down
      }
      spaceship.rotation.x = pitch;

      // Keyboard rotation - FIXED: reversed direction so it feels natural
      if (keys["q"]) {
        yaw += spaceshipRotationSpeed; // Rotate left (positive rotation)
        spaceship.rotation.y = yaw;
      }
      if (keys["e"]) {
        yaw -= spaceshipRotationSpeed; // Rotate right (negative rotation)
        spaceship.rotation.y = yaw;
      }

      // Calculate target velocity based on input
      targetVelocity.set(0, 0, 0);

      // Forward/backward movement (in spaceship's local Z direction)
      // Inverted keys: W moves Forward (-Z), S moves Backward (+Z)
      if (keys["w"] || keys["ArrowUp"]) {
        targetVelocity.z += 1; // Was -= 1
      }
      if (keys["s"] || keys["ArrowDown"]) {
        targetVelocity.z -= 1; // Was += 1
      }

      // Left/right movement (in spaceship's local X direction)
      // Inverted keys: A moves Left (-X), D moves Right (+X)
      if (keys["a"] || keys["ArrowLeft"]) {
        targetVelocity.x += 1; // Was -= 1
      }
      if (keys["d"] || keys["ArrowRight"]) {
        targetVelocity.x -= 1; // Was += 1
      }

      // Vertical movement
      if (keys[" "] && !nearbyPlanet) {
        targetVelocity.y += 1; // Up
      }
      if (keys["shift"] || keys["Shift"]) {
        targetVelocity.y -= 1; // Down
      }

      // Normalize and scale target velocity
      if (targetVelocity.length() > 0) {
        targetVelocity.normalize().multiplyScalar(spaceshipSpeed);
      }

      // Smooth velocity interpolation for better flying feel (momentum)
      const acceleration = 8.0; // How quickly velocity changes
      currentVelocity.lerp(targetVelocity, acceleration * dt);

      // Apply movement in spaceship's local space with smooth velocity
      if (currentVelocity.length() > 0.01) {
        const speed = currentVelocity.length() * dt * 60;

        // Move forward/backward (Z axis in local space)
        if (Math.abs(currentVelocity.z) > 0.01) {
          spaceship.translateZ(currentVelocity.z * dt * 60); // Fixed: Match new key logic
        }
        // Move left/right (X axis in local space)
        if (Math.abs(currentVelocity.x) > 0.01) {
          spaceship.translateX(currentVelocity.x * dt * 60);
        }
        // Move up/down (Y axis in world space)
        if (Math.abs(currentVelocity.y) > 0.01) {
          spaceship.position.y += currentVelocity.y * dt * 60;
        }

        // Banking disabled for performance - kept rotation level
        spaceship.rotation.z = 0;
      }

      // Simplified camera - always follows spaceship smoothly
      let desiredCam;
      let lookTarget;

      if (cameraMode === 'COCKPIT') {
        // Cockpit view: Position camera slightly in front/above center of ship
        // Adjust these offsets based on your specific ship models
        const cockpitOffset = new THREE.Vector3(0, 0.5, 1.5); // Forward and slightly up
        cockpitOffset.applyQuaternion(spaceship.quaternion);
        desiredCam = new THREE.Vector3().copy(spaceship.position).add(cockpitOffset);
        
        // Look forward from ship
        const forward = new THREE.Vector3(0, 0, 10).applyQuaternion(spaceship.quaternion);
        lookTarget = new THREE.Vector3().copy(spaceship.position).add(forward);
        
        // Snap to position for cockpit (no lerp) to prevent motion sickness/lag
        camera.position.copy(desiredCam);
        camera.lookAt(lookTarget);
        
        // Hide spaceship in cockpit view to avoid clipping (optional, depending on model)
        // spaceship.visible = false; 
      } else {
        // Third-person view
        // spaceship.visible = true;
        
        const cameraDistance = 10;
        const cameraHeight = 3;
        // Fixed: Use negative Z (-cameraDistance) to place camera behind spaceship
        // (Since model is backwards, +Z is forward, so -Z is behind in local space)
        const cameraOffset = new THREE.Vector3(0, cameraHeight, -cameraDistance);
  
        // Apply pitch to camera for looking up/down
        const pitchRotation = new THREE.Euler(pitch, 0, 0, "YXZ");
        cameraOffset.applyEuler(pitchRotation);
  
        // Rotate camera offset by spaceship's yaw
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  
        desiredCam = new THREE.Vector3()
          .copy(spaceship.position)
          .add(cameraOffset);
        camera.position.lerp(desiredCam, 0.35); // Faster, more responsive follow
  
        // Look at spaceship (simpler)
        lookTarget = new THREE.Vector3().copy(spaceship.position);
        lookTarget.y += Math.sin(pitch) * 2; // Apply pitch to look target
        camera.lookAt(lookTarget);
      }

      // Auto-approach disabled for performance

      // Update VFX
      updateVFX();
    }

    // spaceship flight movement (auto-pilot)
    if (isFlying && spaceship && !isManualControl) {
      spaceship.position.lerp(flightTarget, Math.min(1, flightSpeed));
      // orientation - make spaceship look at target planet
      const tp = spaceship.userData.targetPlanet;
      if (tp) {
        const ppos = new THREE.Vector3();
        tp.mesh.getWorldPosition(ppos);
        // Smooth rotation toward planet
        const direction = new THREE.Vector3()
          .subVectors(ppos, spaceship.position)
          .normalize();
        const targetQuaternion = new THREE.Quaternion();
        targetQuaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, -1),
          direction
        );
        spaceship.quaternion.slerp(targetQuaternion, 0.1); // Smooth rotation
      }
      // arrival
      const dist = spaceship.position.distanceTo(flightTarget);
      
      // Robust arrival: if close enough, or if very close and moving slowly
      if (dist < 0.5) { 
        isFlying = false;
        controls.enabled = true;
        const arrivedPlanet = spaceship.userData.targetPlanet;
        
        // Open planet overlay
        if (arrivedPlanet) {
          console.log("[FLIGHT] Opening panel for:", arrivedPlanet.name);
          openPlanetPanel(arrivedPlanet);
          // Auto-close overlay after a short delay and advance tour
          setTimeout(() => {
            const overlay = document.getElementById('planet-overlay');
            if (overlay) overlay.classList.remove('active');
            if (isTourActive && !isFlying) {
              nextTourStep();
            }
          }, 3000);
        }
      }
    }

    // camera follow smoothing while flying
    if (isFlying && spaceship) {
      // Tour mode gets a closer, more cinematic camera
      const cameraDistance = isTourActive ? 3 : 12; // Much closer for tour
      const cameraHeight = isTourActive ? 1.5 : 4;
      
      const behind = new THREE.Vector3(0, cameraHeight, cameraDistance).applyQuaternion(
        spaceship.quaternion
      );
      const desiredCam = new THREE.Vector3()
        .copy(spaceship.position)
        .add(behind);
      camera.position.lerp(desiredCam, 0.1); // Faster lerp for responsive following
      
      // look at target planet or spaceship
      const lookAtTarget = new THREE.Vector3();
      if (spaceship.userData.targetPlanet) {
        spaceship.userData.targetPlanet.mesh.getWorldPosition(lookAtTarget);
      } else {
        lookAtTarget.copy(spaceship.position);
      }
      camera.lookAt(lookAtTarget);
    } else if (!introCinematic) {
      // update orbit controls when not flying and not in cinematic
      controls.update();
    }

    // Cinematic intro - show each planet one by one
    if (introCinematic && PLANETS.length > 0) {
      // Safety timeout - skip intro if it takes too long
      if (!introStartTime) {
        introStartTime = clock.getElapsedTime() * 1000;
      }
      
      const elapsedTotal = (clock.getElapsedTime() * 1000) - introStartTime;
      if (elapsedTotal > introMaxDuration) {
        console.log('[Intro] Timeout - skipping intro');
        introCinematic = false;
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
      }
      
      introTimer += dt * 1000;
      
      if (introTimer >= introDuration) {
        introTimer = 0;
        introStep++;
        
        // After showing all planets, reveal spaceship
        if (introStep >= PLANETS.length) {
          introCinematic = false;
          console.log('[Intro] Cinematic complete - switching to game mode');
          
          // Hide loading overlay
          const overlay = document.getElementById('loading-overlay');
          if (overlay) overlay.style.display = 'none';
          
          // Position camera for gameplay
          if (spaceship) {
            const cameraDistance = 10;
            const cameraHeight = 3;
            const cameraOffset = new THREE.Vector3(0, cameraHeight, -cameraDistance);
            cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
            camera.position.copy(spaceship.position).add(cameraOffset);
          }
        }
      }
      
      if (introStep < PLANETS.length) {
        const currentPlanet = PLANETS[introStep];
        if (currentPlanet && currentPlanet.worldPosition) {
          // Smoothly move camera to look at current planet
          const targetPos = currentPlanet.worldPosition.clone();
          const distance = 30; // Distance from planet
          
          // Calculate camera position (orbit around planet)
          const angle = (introTimer / introDuration) * Math.PI * 2;
          const camX = targetPos.x + Math.cos(angle) * distance;
          const camZ = targetPos.z + Math.sin(angle) * distance;
          const camY = targetPos.y + 10;
          
          // Smoothly interpolate camera position
          camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.05);
          camera.lookAt(targetPos);
          
          // Show planet name
          const loadingText = document.getElementById('loading-text');
          if (loadingText && introTimer < 500) {
            loadingText.textContent = `Discovering ${currentPlanet.name}...`;
          }
        } else {
          // Planet not ready, skip to next or end intro
          console.warn('[Intro] Planet not ready, skipping:', introStep);
          introStep++;
          if (introStep >= PLANETS.length) {
            introCinematic = false;
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.style.display = 'none';
          }
        }
      }
    }

    // Check planet proximity (only in manual control mode, optimized)
    if (isManualControl && Math.floor(clock.getElapsedTime() * 10) % 2 === 0) {
      checkPlanetProximity();
    }

    // update PLANETS world positions and LOD toggles (optimized - only check every few frames)
    if (Math.floor(clock.getElapsedTime() * 10) % 3 === 0) {
      // Check every 3rd frame
      for (const p of PLANETS) {
        if (p.mesh) p.mesh.getWorldPosition(p.worldPosition);
        try {
          const dist = camera.position.distanceTo(
            p.worldPosition || new THREE.Vector3()
          );
          if (p._lodPlaceholder) {
            if (dist > 180) {
              p._lodPlaceholder.visible = true;
              if (p.mesh) p.mesh.visible = false;
            } else {
              p._lodPlaceholder.visible = false;
              if (p.mesh) p.mesh.visible = true;
            }
          }
        } catch (e) {}
      }
    }

    // Boost logic
    if (isManualControl && (keys["shift"] || keys["Shift"])) {
      isBoostActive = true;
      flightSpeed = baseFlightSpeed * boostMultiplier;
      spaceshipSpeed = baseSpaceshipSpeed * boostMultiplier;
      targetFOV = baseFOV + 15; // Widen FOV
      
      // Shake camera slightly for speed effect
      if (spaceship) {
        const shake = 0.05;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
      }
    } else {
      isBoostActive = false;
      flightSpeed = baseFlightSpeed;
      spaceshipSpeed = baseSpaceshipSpeed;
      targetFOV = baseFOV;
    }

    // Smooth FOV transition
    if (Math.abs(camera.fov - targetFOV) > 0.1) {
      camera.fov += (targetFOV - camera.fov) * 0.1;
      camera.updateProjectionMatrix();
    }

    // Update dust and stars
    updateEnvironment(dt);

    // Render with composer    // PERFORMANCE FIX: Disable Bloom/Post-processing to prevent Software WebGL fallback
    // composer.render();
    renderer.render(scene, camera);
  } catch (err) {
    console.error("[animate] Error in render loop:", err);
    // Stop animation on error to prevent infinite crash loop
    return;
  }
}

/* ======= Panel UI ======= */
function createPlanetPanelUI() {
  const panel = document.getElementById("planet-panel");
  panel.innerHTML = `
    <button id="planet-close" style="float:right;background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0;width:30px;height:30px;">✕</button>
    <h3 id="planet-title" style="margin-top:0">Planet</h3>
    <img id="planet-img" src="" style="width:100%;display:none;border-radius:6px;margin-top:8px" />
    
    <!-- Tab Navigation -->
    <div id="planet-tabs" style="display:flex;gap:4px;margin-top:12px;border-bottom:1px solid rgba(255,255,255,0.1);">
      <button class="planet-tab active" data-tab="info" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);border:none;color:#fff;cursor:pointer;border-radius:4px 4px 0 0;">User Info</button>
      <button class="planet-tab" data-tab="projects" style="flex:1;padding:8px;background:transparent;border:none;color:#aaa;cursor:pointer;">Projects</button>
      <button class="planet-tab" data-tab="contact" style="flex:1;padding:8px;background:transparent;border:none;color:#aaa;cursor:pointer;">Contact</button>
    </div>
    
    <!-- Tab Content -->
    <div id="planet-tab-content" style="margin-top:12px;min-height:200px;">
      <!-- User Info Tab -->
      <div id="tab-info" class="planet-tab-panel active">
        <div id="planet-desc" style="font-size:13px;color:#ddd;line-height:1.6"></div>
        <div id="planet-long" style="display:none;margin-top:12px;color:#cbd5e1;font-size:13px;line-height:1.6"></div>
      </div>
      
      <!-- Projects Tab -->
      <div id="tab-projects" class="planet-tab-panel" style="display:none;">
        <div id="planet-projects" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>
      
      <!-- Contact Tab -->
      <div id="tab-contact" class="planet-tab-panel" style="display:none;">
        <div id="planet-contact" style="display:flex;flex-direction:column;gap:8px;"></div>
        <div id="planet-links" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"></div>
      </div>
    </div>
    
    <div style="margin-top:16px;display:flex;gap:8px;">
      <button id="planet-back" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);border:none;color:#fff;border-radius:6px;cursor:pointer;">Close</button>
      <button id="planet-travel" style="flex:1;padding:8px;background:#06b6d4;border:none;color:#fff;border-radius:6px;cursor:pointer;">Travel Here</button>
    </div>
  `;

  // Tab switching
  const tabs = panel.querySelectorAll(".planet-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;
      // Update tab buttons
      tabs.forEach((t) => {
        t.classList.remove("active");
        t.style.background = "transparent";
        t.style.color = "#aaa";
      });
      tab.classList.add("active");
      tab.style.background = "rgba(255,255,255,0.1)";
      tab.style.color = "#fff";

      // Update tab panels
      panel.querySelectorAll(".planet-tab-panel").forEach((p) => {
        p.classList.remove("active");
        p.style.display = "none";
      });
      const panelEl = panel.querySelector(`#tab-${tabName}`);
      if (panelEl) {
        panelEl.classList.add("active");
        panelEl.style.display = "block";
      }
    });
  });

  document.getElementById("planet-close").onclick = () =>
    (panel.style.display = "none");
  document.getElementById("planet-back").onclick = () =>
    (panel.style.display = "none");
  document.getElementById("planet-travel").onclick = () => {
    const cur = panel._currentPlanet;
    if (cur) {
      isManualControl = false;
      flyToPlanet(cur);
      panel.style.display = "none";
    }
  };
}

function openPlanetPanel(planetEntry) {
  if (!planetEntry) return;

  const mapEntry =
    (window.PROJECT_MAP && window.PROJECT_MAP[planetEntry.name]) || null;
  const title =
    mapEntry && mapEntry.title ? mapEntry.title : prettify(planetEntry.name);
  const short =
    mapEntry && mapEntry.short
      ? mapEntry.short
      : (planetEntry.info && planetEntry.info.description) || "";
  const long = mapEntry && mapEntry.long ? mapEntry.long : "";
  const image = mapEntry && mapEntry.image ? mapEntry.image : "";

  // Use full-screen overlay instead of small panel
  const overlay = document.getElementById("planet-overlay");
  const overlayBg = document.getElementById("planet-overlay-bg");
  const overlayContent = document.getElementById("planet-overlay-content");

  if (!overlay || !overlayContent) return;

  // Set background - use planet image or create 3D planet view
  if (overlayBg) {
    if (image) {
      overlayBg.style.backgroundImage = `url(${image})`;
      overlayBg.style.display = "block";
    } else {
      // Create a 3D rendered background of the planet
      createPlanet3DBackground(planetEntry, overlayBg);
    }
  }

  // Add entrance animation (optimized)
  overlay.style.opacity = "0";
  overlay.classList.add("active");
  setTimeout(() => {
    overlay.style.transition = "opacity 0.4s ease-in";
    overlay.style.opacity = "1";
  }, 10);

  // Build content HTML and prepare Next Planet button reference
  let nextBtn = null;

  // Build content HTML
  let contentHTML = `
    <h1 style="font-size:48px;font-weight:700;margin-bottom:20px;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,0.5);">${title}</h1>
    
    <!-- User Info Section -->
    <div style="background:rgba(255,255,255,0.05);backdrop-filter:blur(10px);border-radius:12px;padding:30px;margin-bottom:24px;border:1px solid rgba(255,255,255,0.1);">
      <h2 style="font-size:24px;font-weight:600;margin-bottom:16px;color:#06b6d4;">User Info</h2>
      <div style="font-size:16px;color:#ddd;line-height:1.8;margin-bottom:16px;">${
        short || "Welcome to " + title
      }</div>
      ${
        long
          ? `<div style="font-size:15px;color:#cbd5e1;line-height:1.8;margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);">${long}</div>`
          : ""
      }
    </div>
  `;

  // Projects Section
  if (
    mapEntry &&
    mapEntry.projects &&
    Array.isArray(mapEntry.projects) &&
    mapEntry.projects.length > 0
  ) {
    contentHTML += `
      <div style="background:rgba(255,255,255,0.05);backdrop-filter:blur(10px);border-radius:12px;padding:30px;margin-bottom:24px;border:1px solid rgba(255,255,255,0.1);">
        <h2 style="font-size:24px;font-weight:600;margin-bottom:20px;color:#06b6d4;">Projects</h2>
        <div style="display:flex;flex-direction:column;gap:16px;">
    `;
    mapEntry.projects.forEach((project) => {
      contentHTML += `
        <div style="padding:20px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:4px solid #06b6d4;">
          <div style="font-weight:600;color:#fff;margin-bottom:8px;font-size:18px;">${
            project.name || "Project"
          }</div>
          <div style="font-size:14px;color:#aaa;margin-bottom:12px;line-height:1.6;">${
            project.description || ""
          }</div>
          ${
            project.tech
              ? `<div style="font-size:13px;color:#888;margin-bottom:8px;">Tech: ${project.tech}</div>`
              : ""
          }
          ${
            project.link
              ? `<a href="${project.link}" target="_blank" style="color:#06b6d4;font-size:14px;text-decoration:none;display:inline-block;margin-top:8px;">View Project →</a>`
              : ""
          }
        </div>
      `;
    });
    contentHTML += `</div></div>`;
  }

  // Contact Section
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
    contentHTML += `
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px;">
    `;
    for (const l of mapEntry.links) {
      contentHTML += `<a href="${
        l.url || "#"
      }" target="_blank" rel="noopener noreferrer" style="padding:12px 20px;background:rgba(6,182,212,0.2);color:#06b6d4;border-radius:8px;font-size:14px;text-decoration:none;display:inline-block;border:1px solid rgba(6,182,212,0.3);">${
        l.label || l.url
      }</a>`;
    }
    contentHTML += `</div>`;
  }

  // Add "Next Planet" button for Tour Mode
  contentHTML += `<button id="planet-next-btn">Next Planet ➔</button>`;

  overlayContent.innerHTML = contentHTML;
  overlay.classList.add("active");
  overlay._currentPlanet = planetEntry;

  // Set up Next Planet button click handler for Tour Mode
  nextBtn = document.getElementById("planet-next-btn");
  if (isTourActive && nextBtn) {
    nextBtn.style.display = "block";
    nextBtn.onclick = () => {
      nextTourStep();
    };
  }

  // Close button handler with animation
  const closeBtn = document.getElementById("planet-overlay-close");
  if (closeBtn) {
    closeBtn.onclick = () => {
      overlay.style.transition = "opacity 0.3s ease-out";
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.classList.remove("active");
      }, 300);
    };
  }

  // Close on Escape key with animation
  const escapeHandler = (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) {
      overlay.style.transition = "opacity 0.3s ease-out";
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.classList.remove("active");
        window.removeEventListener("keydown", escapeHandler);
      }, 300);
    }
  };
  window.addEventListener("keydown", escapeHandler);

  // Planet rotation animation disabled for performance

  // Also update the small panel for backward compatibility
  const panel = document.getElementById("planet-panel");
  if (panel) {
    panel._currentPlanet = planetEntry;
  }
}

/* ======= Project Map Editor UI ======= */
function setupProjectEditorUI() {
  const openBtn = document.getElementById("project-open-editor");
  const overlay = document.getElementById("project-editor");
  const textarea = document.getElementById("project-json");
  const preview = document.getElementById("project-preview");
  const closeBtn = document.getElementById("project-close-editor");
  const applyBtn = document.getElementById("project-apply");
  const downloadBtn = document.getElementById("project-download");
  const uploadBtn = document.getElementById("project-upload-btn");
  const uploadInput = document.getElementById("project-upload");

  function renderPreview() {
    try {
      const obj = JSON.parse(textarea.value || "{}");
      preview.innerHTML = ''; // Clear previous content
      
      if (Object.keys(obj).length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.color = '#94a3b8';
        emptyDiv.textContent = 'No entries';
        preview.appendChild(emptyDiv);
        return;
      }
      
      for (const k of Object.keys(obj)) {
        const e = obj[k];
        
        // Create container div
        const containerDiv = document.createElement('div');
        containerDiv.style.cssText = 'padding:8px;border-bottom:1px solid rgba(255,255,255,0.03)';
        
        // Create title div with safe textContent
        const titleDiv = document.createElement('div');
        titleDiv.style.fontWeight = '700';
        titleDiv.textContent = e.title || k; // Safe - prevents XSS
        
        // Create short description div with safe textContent
        const shortDiv = document.createElement('div');
        shortDiv.style.cssText = 'font-size:12px;color:#9ca3af;margin-top:4px';
        shortDiv.textContent = e.short || ''; // Safe - prevents XSS
        
        // Append children
        containerDiv.appendChild(titleDiv);
        containerDiv.appendChild(shortDiv);
        preview.appendChild(containerDiv);
      }
    } catch (e) {
      preview.innerHTML = ''; // Clear
      const errorDiv = document.createElement('div');
      errorDiv.style.color = '#fca5a5';
      errorDiv.textContent = 'Invalid JSON';
      preview.appendChild(errorDiv);
    }
  }

  openBtn.addEventListener("click", () => {
    overlay.style.display = "flex";
    textarea.value = JSON.stringify(window.PROJECT_MAP || {}, null, 2);
    renderPreview();
  });

  closeBtn.addEventListener("click", () => {
    overlay.style.display = "none";
  });
  textarea.addEventListener("input", renderPreview);

  applyBtn.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(textarea.value || "{}");
      window.PROJECT_MAP = parsed;
      // refresh current panel if open
      const panel = document.getElementById("planet-panel");
      if (panel && panel._currentPlanet) openPlanetPanel(panel._currentPlanet);
      alert("PROJECT_MAP applied in-memory. Click Download to save a file.");
    } catch (e) {
      alert("Invalid JSON: " + e.message);
    }
  });

  downloadBtn.addEventListener("click", () => {
    const blob = new Blob([textarea.value], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "project_map.json";
    a.click();
    a.remove();
  });

  uploadBtn.addEventListener("click", () => uploadInput.click());
  uploadInput.addEventListener("change", (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (e) => {
      textarea.value = e.target.result;
      renderPreview();
      alert("Loaded JSON in editor. Click Apply to use it on page.");
    };
    r.readAsText(f);
  });
}

/* ======= Audio Setup ======= */
function setupAudio() {
  // Background music (using Web Audio API for ambient space music)
  try {
    // Create a simple ambient sound using Web Audio API
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    // Create a simple ambient tone (space-like) - optimized
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 80; // Low frequency for ambient feel
    gainNode.gain.value = 0.03; // Very quiet background (reduced for performance)

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start playing (will loop)
    oscillator.start();

    // Store reference
    backgroundMusic = { oscillator, gainNode, audioContext };

    console.log("Background music initialized");
    
    // Fix for "The AudioContext was not allowed to start"
    const resumeAudio = () => {
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log("AudioContext resumed successfully");
        });
      }
      document.removeEventListener('click', resumeAudio);
      document.removeEventListener('keydown', resumeAudio);
    };
    
    document.addEventListener('click', resumeAudio);
    document.addEventListener('keydown', resumeAudio);
    
  } catch (e) {
    console.warn("Audio not available:", e);
  }
}

/* ======= VFX Setup ======= */
function setupVFX() {
  if (!scene || !THREE) return;

  // Optimized particle system - reduced count for better performance
  const particleCount = 25; // Reduced from 50 for smoother performance

  const particles = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = 0;
    positions[i + 1] = 0;
    positions[i + 2] = 0;

    // Blue/cyan colors for space trail
    colors[i] = 0.2; // R
    colors[i + 1] = 0.8; // G
    colors[i + 2] = 1.0; // B
  }

  particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.4, // Slightly smaller for performance
    vertexColors: true,
    transparent: true,
    opacity: 0.5, // Slightly more transparent
    blending: THREE.AdditiveBlending,
  });

  particleSystem = new THREE.Points(particles, particleMaterial);
  scene.add(particleSystem);

  // Create engine glow effect (simplified)
  const glowGeometry = new THREE.SphereGeometry(0.25, 6, 6); // Lower detail
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });

  spaceshipTrail = new THREE.Mesh(glowGeometry, glowMaterial);
  scene.add(spaceshipTrail);

  console.log("VFX initialized (optimized)");
}

/* ======= Post-Processing ======= */
function setupPostProcessing() {
  if (!scene || !camera || !renderer || !window.THREE.EffectComposer) return;

  try {
    composer = new THREE.EffectComposer(renderer);
    
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Resolution, strength, radius, threshold
    bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, 
      0.4, 
      0.85
    );
    bloomPass.strength = 0.8; // Intensity
    bloomPass.radius = 0.5;   // Spread
    bloomPass.threshold = 0.2; // Brightness threshold
    
    composer.addPass(bloomPass);
    
    console.log("Post-processing (Bloom) initialized");
  } catch (e) {
    console.warn("Post-processing failed to initialize:", e);
    composer = null;
  }
}

/* ======= Environment (Stars & Dust) ======= */
function createStarfield(count = 5000) {
  const starCount = count;
  const geom = new THREE.BufferGeometry();
  const pos = new Float32Array(starCount * 3);
  const cols = new Float32Array(starCount * 3);

  for(let i=0; i<starCount*3; i+=3) {
    // Random position in a large sphere
    const r = 800 + Math.random() * 800;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    pos[i] = r * Math.sin(phi) * Math.cos(theta);
    pos[i+1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i+2] = r * Math.cos(phi);
    
    // Star colors (white, slight blue, slight yellow)
    const type = Math.random();
    if (type > 0.9) { // Blue giant
      cols[i] = 0.8; cols[i+1] = 0.9; cols[i+2] = 1.0;
    } else if (type > 0.7) { // Yellow dwarf
      cols[i] = 1.0; cols[i+1] = 0.9; cols[i+2] = 0.6;
    } else { // White
      cols[i] = 0.8; cols[i+1] = 0.8; cols[i+2] = 0.8;
    }
  }

  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(cols, 3));

  const mat = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: false // Stars stay same size regardless of distance
  });

  starfield = new THREE.Points(geom, mat);
  scene.add(starfield);
}

function createSpaceDust(count = 1000) {
  const dustCount = count;
  const geom = new THREE.BufferGeometry();
  const pos = new Float32Array(dustCount * 3);
  
  for(let i=0; i<dustCount*3; i+=3) {
    pos[i] = (Math.random() - 0.5) * 400;
    pos[i+1] = (Math.random() - 0.5) * 400;
    pos[i+2] = (Math.random() - 0.5) * 400;
  }
  
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  
  const mat = new THREE.PointsMaterial({
    color: 0x88ccff,
    size: 0.5,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });
  
  spaceDust = new THREE.Points(geom, mat);
  scene.add(spaceDust);
}

function updateEnvironment(dt) {
  // Rotate starfield slowly
  if (starfield) {
    starfield.rotation.y += 0.0005;
  }
  
  // Move space dust to create speed effect
  if (spaceDust && spaceship) {
    // Dust moves opposite to spaceship velocity or just streams back
    // For simplicity, let's make it stream towards camera to simulate forward motion
    // or stream based on velocity.
    
    // Simple "Warp" effect: dust moves towards camera Z
    const positions = spaceDust.geometry.attributes.position.array;
    const speed = isBoostActive ? 400 : 20; // Much faster when boosting
    
    // We need to move dust relative to camera/spaceship
    // But since we move the spaceship, let's just keep dust around the spaceship
    
    // Better approach: Dust particles are static in world, but we wrap them around spaceship
    const shipPos = spaceship.position;
    const range = 200;
    
    for(let i=0; i<positions.length; i+=3) {
      // Check distance to ship
      const dx = positions[i] - shipPos.x;
      const dy = positions[i+1] - shipPos.y;
      const dz = positions[i+2] - shipPos.z;
      
      // If too far, wrap around to the other side
      if (Math.abs(dx) > range) positions[i] = shipPos.x - Math.sign(dx) * (range - 5);
      if (Math.abs(dy) > range) positions[i+1] = shipPos.y - Math.sign(dy) * (range - 5);
      if (Math.abs(dz) > range) positions[i+2] = shipPos.z - Math.sign(dz) * (range - 5);
    }
    spaceDust.geometry.attributes.position.needsUpdate = true;
  }
}

/* ======= 3D Planet Background ======= */
function createPlanet3DBackground(planetEntry, overlayBg) {
  // Create a canvas to render the planet
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");

  // Create gradient background based on planet
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 2
  );

  // Different colors for different planets
  const planetColors = {
    Mercury: ["#8C7853", "#4A4A4A"],
    Venus: ["#FFC649", "#8B6914"],
    Earth: ["#6B93D6", "#4A90A4"],
    Mars: ["#CD5C5C", "#8B3A3A"],
    Jupiter: ["#D8CA9D", "#FAD5A5"],
    Saturn: ["#FAD5A5", "#C9B29B"],
  };

  const planetName = prettify(planetEntry.name);
  const colors = planetColors[planetName] || ["#4A4A4A", "#1A1A1A"];

  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add some stars
  const starCount = 200;
  ctx.fillStyle = "#FFF";
  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 2;
    ctx.globalAlpha = Math.random();
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  overlayBg.style.backgroundImage = `url(${canvas.toDataURL()})`;
}

/* ======= Tour Mode Logic ======= */
function setupTourUI() {
  const startBtn = document.getElementById("start-tour-btn");
  if (startBtn) {
    startBtn.addEventListener("click", startTour);
  }
}

function startTour() {
  if (PLANETS.length === 0) {
    alert("No planets found to tour!");
    return;
  }
  
  isTourActive = true;
  tourIndex = 0;
  
  // Hide start button
  const startBtn = document.getElementById("start-tour-btn");
  if (startBtn) startBtn.style.display = "none";
  
  // Switch to third person for better view
  cameraMode = 'THIRD_PERSON';
  
  // Resume audio if needed (fix for autoplay policy)
  if (window.backgroundMusic && window.backgroundMusic.audioContext && window.backgroundMusic.audioContext.state === 'suspended') {
    window.backgroundMusic.audioContext.resume();
  }

  // Start journey
  flyToPlanet(PLANETS[0]);
  showControlHint("Tour Started! Flying to first planet...");
}

function nextTourStep() {
  if (!isTourActive) return;
  
  // Close current overlay
  const overlay = document.getElementById("planet-overlay");
  if (overlay) {
    overlay.classList.remove("active");
    setTimeout(() => {
      overlay.style.opacity = "0";
      overlay.style.display = "none";
    }, 300);
  }
  
  tourIndex++;
  
  if (tourIndex < PLANETS.length) {
    // Fly to next planet
    flyToPlanet(PLANETS[tourIndex]);
  } else {
    // End of tour
    endTour();
  }
}

function endTour() {
  isTourActive = false;
  tourIndex = 0;
  
  showControlHint("Tour Completed! Feel free to explore.");
  
  // Show start button again
  const startBtn = document.getElementById("start-tour-btn");
  if (startBtn) startBtn.style.display = "block";
  
  // Close overlay if open
  const overlay = document.getElementById("planet-overlay");
  if (overlay) overlay.classList.remove("active");
}


/* ======= Update VFX ======= */
function updateVFX() {
  if (!spaceship || !particleSystem || !spaceshipTrail) return;

  // Check if spaceship is moving (optimized check)
  const wasMoving = isMoving;
  isMoving = currentVelocity.length() > 0.1; // Use velocity instead of key checks

  if (isMoving) {
    // Update trail particles (only update every 4th frame for performance)
    if (Math.floor(clock.getElapsedTime() * 30) % 4 === 0) {
      const positions = particleSystem.geometry.attributes.position.array;
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
      const shipPos = spaceship.position;
      positions[0] = shipPos.x;
      positions[1] = shipPos.y;
      positions[2] = shipPos.z;

      particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    particleSystem.visible = true;

    // Update engine glow position
    spaceshipTrail.position.copy(spaceship.position);
    const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(
      spaceship.quaternion
    );
    spaceshipTrail.position.add(backward.multiplyScalar(-1.5));
    spaceshipTrail.visible = true;
  } else {
    // Fade out particles
    particleSystem.visible = false;
    spaceshipTrail.visible = false;
  }
}

/* ======= Utility (optional debug) ======= */
function logResources() {
  console.log("PLANETS:", PLANETS.length, "spaceship:", !!spaceship);
}

/* ======= End of main.js ======= */
