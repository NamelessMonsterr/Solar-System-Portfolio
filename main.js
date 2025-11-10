// main.js — robust integrated loader + interaction
// Expects: resources/solar_system_real_scale_2k_textures.glb and resources/spaceship.glb
// Put both GLBs inside resources/ relative to index.html

/* ========= Config ========= */
const MODELS_PATH = 'resources/';
const SOLAR_GLTF = 'solar_system_real_scale_2k_textures.glb';
const SPACESHIP_GLTF = 'spaceship.glb';
let flightSpeed = 0.06;
let arriveThreshold = 0.6;

/* ========= Scene globals ========= */
let scene, camera, renderer, clock, controls;
let raycaster, mouse;
let PLANETS = []; // entries: { name, mesh, bbox, worldPosition, info, _lodPlaceholder }
let spaceship = null;
let isFlying = false;
let flightTarget = null; // Will be initialized after THREE loads
let hasInitialized = false;

// Game-style controls
let spaceshipVelocity = new THREE.Vector3();
let spaceshipSpeed = 0.3;
let spaceshipRotationSpeed = 0.02;
let isManualControl = false;
let keys = {};
let nearbyPlanet = null;
let proximityThreshold = 15; // Distance to consider "near" a planet

function showFatal(message){
  try {
    console.error(message);
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const loadingFill = document.getElementById('loading-fill');
    if (overlay) overlay.style.display = 'flex';
    if (loadingText) loadingText.textContent = String(message);
    if (loadingFill) loadingFill.style.width = '0%';
  } catch(e){}
}

// Wait for DOM and Three.js to be ready
function waitForThreeJS() {
  return new Promise((resolve, reject) => {
    // Check if already ready
    if (window.THREE_READY && typeof THREE !== 'undefined' && THREE.GLTFLoader) {
      resolve();
      return;
    }
    
    // Listen for the ready event
    window.addEventListener('threejs-ready', () => {
      if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
        resolve();
      } else {
        reject(new Error('THREE.js modules not properly loaded.'));
      }
    }, { once: true });
    
    // Fallback: poll for THREE.js (in case event doesn't fire)
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (typeof THREE !== 'undefined' && THREE.WebGLRenderer && THREE.GLTFLoader) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts > 100) {
        clearInterval(checkInterval);
        const missing = [];
        if (typeof THREE === 'undefined') missing.push('THREE');
        else if (!THREE.WebGLRenderer) missing.push('THREE.WebGLRenderer');
        else if (!THREE.GLTFLoader) missing.push('THREE.GLTFLoader');
        reject(new Error(`THREE.js failed to load. Missing: ${missing.join(', ')}. Check browser console for script errors.`));
      }
    }, 100);
  });
}

// Initialize after everything is ready
console.log('[main.js] Waiting for Three.js to load...');
waitForThreeJS().then(() => {
  console.log('[main.js] Three.js ready, initializing...');
  init();
  animate();
}).catch((err) => {
  console.error('[main.js] Initialization failed:', err);
  showFatal(err.message);
  
  // Additional debugging info
  if (window.THREE_LOAD_ERROR) {
    console.error('[main.js] Three.js load error details:', window.THREE_LOAD_ERROR);
  }
  console.log('[main.js] THREE available:', typeof THREE !== 'undefined');
  if (typeof THREE !== 'undefined') {
    console.log('[main.js] THREE.WebGLRenderer:', !!THREE.WebGLRenderer);
    console.log('[main.js] THREE.GLTFLoader:', !!THREE.GLTFLoader);
  }
});

/* ======= Initialization ======= */
function init(){
  if (hasInitialized) return;
  hasInitialized = true;
  
  // Initialize flightTarget now that THREE is available
  if (!flightTarget) flightTarget = new THREE.Vector3();
  
  // Renderer + canvas
  const canvas = document.getElementById('glCanvas');
  if (!canvas) { showFatal('Canvas element #glCanvas not found in DOM.'); return; }
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    canvas, 
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false; // Disable shadows for better performance
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Scene + Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 10000);
  // Initial camera position - will be adjusted when solar system loads
  camera.position.set(0, 15, 30);
  camera.lookAt(0, 0, 0);

  // Controls (OrbitControls) — enabled when not flying
  if (typeof THREE.OrbitControls !== 'undefined'){
    controls = new THREE.OrbitControls(camera, renderer.domElement);
  } else {
    console.warn('OrbitControls not found. Camera will be fixed until flight.');
    controls = { enabled: true, update: ()=>{} };
  }
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

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
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('pointerdown', onPointerDown, false);
  
  // Game-style controls
  setupSpaceshipControls();

  // UI
  createPlanetPanelUI();
  setupProjectEditorUI();
}

/* ======= Loaders + assets ======= */
function setupLoadersAndLoadModels(){
  const overlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  const loadingFill = document.getElementById('loading-fill');

  // Quick preflight to surface common localhost issues (404s/MIME)
  (async function preflight(){
    try {
      const [a,b] = await Promise.allSettled([
        fetch(MODELS_PATH + SOLAR_GLTF, { method: 'HEAD' }),
        fetch(MODELS_PATH + SPACESHIP_GLTF, { method: 'HEAD' })
      ]);
      const solarOk = a.status === 'fulfilled' && a.value.ok;
      const shipOk = b.status === 'fulfilled' && b.value.ok;
      if (!solarOk || !shipOk){
        const msg = `Asset not reachable: ${!solarOk ? SOLAR_GLTF : ''} ${!shipOk ? SPACESHIP_GLTF : ''}. Ensure a local server and correct paths.`;
        console.error(msg, { solar: a, ship: b });
        if (loadingText) loadingText.textContent = msg;
      }
    } catch(e){
      console.warn('Preflight failed (continuing):', e);
    }
  })();

  const manager = new THREE.LoadingManager();
  manager.onStart = (url, itemsLoaded, itemsTotal) => {
    if (overlay) overlay.style.display = 'flex';
    if (loadingText) loadingText.textContent = `Starting ${url}`;
  };
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    if (loadingText) loadingText.textContent = `Loading ${itemsLoaded} / ${itemsTotal}`;
    if (loadingFill) loadingFill.style.width = Math.round((itemsLoaded/itemsTotal)*100) + '%';
  };
  manager.onError = (url) => {
    console.warn('LoadingManager error for', url);
  };
  manager.onLoad = () => {
    if (loadingText) loadingText.textContent = 'All assets loaded';
    if (loadingFill) loadingFill.style.width = '100%';
    setTimeout(()=>{ if (overlay) overlay.style.display = 'none'; }, 350);
  };

  if (typeof THREE.GLTFLoader === 'undefined') {
    showFatal('THREE.GLTFLoader is not available. Check that all Three.js scripts loaded correctly.');
    return;
  }

  const loader = new THREE.GLTFLoader(manager);
  // Optional: Draco
  if (typeof THREE.DRACOLoader !== 'undefined') {
    try {
      const draco = new THREE.DRACOLoader();
      // Use a stable CDN for Draco decoders to avoid local path issues
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);
    } catch(e){
      console.warn('DRACOLoader setup failed, continuing without Draco:', e);
    }
  } else {
    console.warn('DRACOLoader not found; loading will proceed without Draco.');
  }

  // Load solar system GLB
  loader.load(MODELS_PATH + SOLAR_GLTF, (gltf) => {
    const system = gltf.scene || (gltf.scenes && gltf.scenes[0]);
    if (!system) { console.error('No scene in solar system glb'); return; }
    // scale down real-scale models - increased scale for visibility
    const scale = 0.05; // Increased to 5% for better visibility (real solar systems are HUGE)
    system.scale.setScalar(scale);
    scene.add(system);
    
    // Center the solar system at origin for better viewing
    const box = new THREE.Box3().setFromObject(system);
    const center = box.getCenter(new THREE.Vector3());
    system.position.sub(center);
    
    // Get bounding box size to help with camera positioning
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    console.log('Solar system loaded, scale:', scale, 'center offset:', center, 'max dimension:', maxDim);
    
    // Adjust camera to frame the solar system better
    // But wait for spaceship to load before final camera adjustment
    if (maxDim > 0 && !spaceship) {
      // Initial camera position - will be refined when spaceship loads
      const distance = maxDim * 1.2;
      camera.position.set(0, distance * 0.4, distance);
      camera.lookAt(0, 0, 0);
      if (controls && controls.update) controls.update();
    }

    // Map nodes as planets (heuristic: any mesh with a meaningful name)
    system.traverse((child) => {
      if (child.isMesh) {
        // skip tiny helpers
        const bbox = new THREE.Box3().setFromObject(child);
        if (bbox.isEmpty()) return;
        const name = child.name && child.name.trim() ? child.name : `Object_${PLANETS.length}`;
        const worldPos = new THREE.Vector3();
        child.getWorldPosition(worldPos);
        
        // Ensure mesh is visible and has proper material
        child.visible = true;
        if (!child.material) {
          child.material = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            roughness: 0.7,
            metalness: 0.1
          });
        } else if (child.material) {
          // Enhance existing materials
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if (mat) {
                mat.needsUpdate = true;
                if (mat.map) mat.map.needsUpdate = true;
              }
            });
          } else {
            child.material.needsUpdate = true;
            if (child.material.map) child.material.map.needsUpdate = true;
          }
        }
        
        // Enable shadows for planets
        child.castShadow = true;
        child.receiveShadow = true;

        const entry = {
          name,
          mesh: child,
          worldPosition: worldPos.clone(),
          bbox,
          info: { title: prettify(name), description: `Project section for ${prettify(name)}.` }
        };
        PLANETS.push(entry);

        // Create LOD placeholder (small sphere)
        try {
          const size = bbox.getSize(new THREE.Vector3());
          const radius = Math.max(0.5, Math.max(size.x,size.y,size.z)*0.18);
          const geom = new THREE.SphereGeometry(radius, 10, 10);
          const mat = new THREE.MeshBasicMaterial({ color: 0x888888 });
          const placeholder = new THREE.Mesh(geom, mat);
          placeholder.position.copy(entry.worldPosition);
          placeholder.visible = false;
          scene.add(placeholder);
          entry._lodPlaceholder = placeholder;
        } catch(e){ /* ignore */ }
      }
    });

    console.log('Mapped PLANETS:', PLANETS.map(p=>p.name));
    console.log('Scene children count:', scene.children.length);
    console.log('Solar system mesh count:', system.children.length);
    
    // Log first few planet positions for debugging
    if (PLANETS.length > 0) {
      const positions = PLANETS.slice(0, 5).map(p => ({
        name: p.name,
        pos: {x: p.worldPosition.x.toFixed(2), y: p.worldPosition.y.toFixed(2), z: p.worldPosition.z.toFixed(2)},
        distance: p.worldPosition.length().toFixed(2)
      }));
      console.log('First 5 planet positions:', positions);
      console.log('Camera position after auto-adjust:', {x: camera.position.x.toFixed(2), y: camera.position.y.toFixed(2), z: camera.position.z.toFixed(2)});
    }
    // build default PROJECT_MAP from nodes (can be overridden by external JSON)
    window.PROJECT_MAP = window.PROJECT_MAP || {};
    for (const p of PLANETS) {
      if (!window.PROJECT_MAP[p.name]) {
        window.PROJECT_MAP[p.name] = { title: p.info.title, short: p.info.description, long: p.info.description };
      }
    }
  }, undefined, (err)=> {
    console.error('Error loading solar system glb:', err);
    showFatal('Failed to load solar system model. Check devtools for details.');
  });

  // Load spaceship GLB
  loader.load(MODELS_PATH + SPACESHIP_GLTF, (gltf) => {
    spaceship = gltf.scene || (gltf.scenes && gltf.scenes[0]);
    if (!spaceship) { console.error('No scene in spaceship glb'); return; }
    
    // Scale spaceship appropriately relative to solar system
    spaceship.scale.setScalar(0.8);
    
    // Position spaceship near the solar system but visible
    // Place it slightly to the side and above for better composition
    spaceship.position.set(15, 8, 20);
    spaceship.rotation.y = -Math.PI / 4; // Angle it toward the solar system
    
    // Enhance spaceship materials
    spaceship.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if (mat) {
                mat.needsUpdate = true;
                if (mat.map) mat.map.needsUpdate = true;
              }
            });
          } else {
            child.material.needsUpdate = true;
            if (child.material.map) child.material.map.needsUpdate = true;
          }
        }
      }
    });
    
    scene.add(spaceship);
    console.log('Spaceship added at position:', spaceship.position);
    
    // Adjust camera to show both solar system and spaceship together
    if (PLANETS.length > 0) {
      // Calculate a good viewing position that includes both
      const solarCenter = new THREE.Vector3(0, 0, 0);
      const shipPos = spaceship.position.clone();
      const midPoint = new THREE.Vector3().addVectors(solarCenter, shipPos).multiplyScalar(0.5);
      const distance = Math.max(60, shipPos.length() * 1.5);
      
      camera.position.set(midPoint.x, distance * 0.4, distance);
      camera.lookAt(midPoint);
      if (controls && controls.update) controls.update();
      console.log('Camera adjusted to show both solar system and spaceship');
    }
  }, undefined, (err) => {
    console.error('Error loading spaceship:', err);
    // do not fatal; allow scene to load without ship
  });

  // Try to fetch external project_map.json but don't block rendering if missing
  (async function(){
    const url = MODELS_PATH + 'project_map.json';
    try {
      const resp = await fetch(url);
      if (!resp.ok) { console.warn('project_map.json not loaded, status', resp.status); return; }
      const external = await resp.json();
      // merge
      window.PROJECT_MAP = window.PROJECT_MAP || {};
      for (const k of Object.keys(external)) window.PROJECT_MAP[k] = external[k];
      console.log('Loaded external PROJECT_MAP from', url);
    } catch(e){
      console.warn('Failed to fetch project_map.json (continuing):', e.message);
    }
  })();
}

/* ======= Helpers ======= */
function prettify(name){
  if(!name) return 'Unnamed';
  return name.replace(/[_\-]+/g, ' ').trim().split(' ').map(s=> s.charAt(0).toUpperCase()+s.slice(1)).join(' ');
}

/* ======= Events ======= */
function onWindowResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/* ======= Raycast & Interaction ======= */
function onPointerDown(e){
  // ignore if editing text etc.
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left)/rect.width)*2 -1;
  mouse.y = -((e.clientY - rect.top)/rect.height)*2 +1;
  raycaster.setFromCamera(mouse, camera);

  // collect intersectables
  const intersectables = [];
  for(const p of PLANETS) {
    if (p.mesh) intersectables.push(p.mesh);
  }
  const hits = raycaster.intersectObjects(intersectables, true);
  if (hits.length){
    // find planet entry for hit mesh (walk ancestors)
    let obj = hits[0].object;
    let match = null;
    for(const p of PLANETS){
      if (p.mesh === obj || isAncestor(p.mesh, obj)) { match = p; break; }
    }
    if (!match){
      // fallback: pick nearest planet by distance to hit point
      const pt = hits[0].point;
      let best = null, bestd=Infinity;
      for(const p of PLANETS){
        const d = p.worldPosition.distanceTo(pt);
        if (d < bestd) { bestd = d; best = p; }
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

function isAncestor(root, node){
  let cur = node;
  while(cur){
    if (cur === root) return true;
    cur = cur.parent;
  }
  return false;
}

/* ======= Spaceship Controls ======= */
function setupSpaceshipControls(){
  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    keys[e.key] = true;
    
    // Toggle manual control mode with M key
    if (e.key.toLowerCase() === 'm') {
      isManualControl = !isManualControl;
      if (isManualControl) {
        controls.enabled = false;
        isFlying = false;
        showControlHint('Manual Control Mode: WASD/Arrows to move, Q/E to rotate, M to exit');
      } else {
        controls.enabled = true;
        showControlHint('Orbit Mode: Drag to rotate, Scroll to zoom, M for manual control');
      }
    }
    
    // Space to interact with nearby planet
    if (e.key === ' ' && nearbyPlanet) {
      e.preventDefault();
      openPlanetPanel(nearbyPlanet);
    }
  });
  
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.key] = false;
  });
  
  // Touch controls for mobile
  let touchStart = null;
  renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    }
  });
  
  renderer.domElement.addEventListener('touchend', (e) => {
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
  const hint = document.getElementById('control-hint');
  if (hint) {
    hint.textContent = message;
    hint.style.opacity = '1';
    setTimeout(() => {
      hint.style.opacity = '0';
    }, 3000);
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
  const indicator = document.getElementById('proximity-indicator');
  if (!indicator) return;
  
  if (planet && distance < proximityThreshold) {
    const mapEntry = (window.PROJECT_MAP && window.PROJECT_MAP[planet.name]) || null;
    const planetName = mapEntry && mapEntry.title ? mapEntry.title : prettify(planet.name);
    indicator.innerHTML = `
      <div style="background:rgba(0,255,0,0.2);border:1px solid #00ff00;padding:8px;border-radius:6px;">
        <div style="font-weight:600;color:#00ff00;">Near: ${planetName}</div>
        <div style="font-size:12px;color:#88ff88;margin-top:4px;">Press SPACE or TAP to interact</div>
        <div style="font-size:11px;color:#aaa;margin-top:2px;">Distance: ${distance.toFixed(1)} units</div>
      </div>
    `;
    indicator.style.display = 'block';
  } else {
    indicator.style.display = 'none';
  }
}

/* ======= Flight logic ======= */
function flyToPlanet(planetEntry){
  if (!spaceship || !planetEntry) { openPlanetPanel(planetEntry); return; }
  const targetWorld = new THREE.Vector3();
  planetEntry.mesh.getWorldPosition(targetWorld);
  const size = new THREE.Vector3();
  planetEntry.bbox.getSize(size);
  const radiusApprox = Math.max(size.x,size.y,size.z)*0.6;
  // direction from planet to camera (so we stand away from planet)
  const dir = new THREE.Vector3().subVectors(camera.position, targetWorld).normalize();
  flightTarget.copy(targetWorld).add(dir.multiplyScalar(radiusApprox + 6));
  spaceship.userData.targetPlanet = planetEntry;
  isFlying = true;
  isManualControl = false;
  // disable orbit controls during flight
  controls.enabled = false;
}

/* ======= Animation loop ======= */
function animate(){
  requestAnimationFrame(animate);
  
  // Safety check - don't render if not initialized
  if (!renderer || !scene || !camera) {
    return;
  }
  
  try {
    const dt = clock.getDelta();

    // Manual spaceship control
    if (isManualControl && spaceship) {
      // Movement
      const moveVector = new THREE.Vector3();
      if (keys['w'] || keys['ArrowUp']) moveVector.z -= 1;
      if (keys['s'] || keys['ArrowDown']) moveVector.z += 1;
      if (keys['a'] || keys['ArrowLeft']) moveVector.x -= 1;
      if (keys['d'] || keys['ArrowRight']) moveVector.x += 1;
      if (keys[' '] || keys[' ']) moveVector.y += 1; // Space = up
      if (keys['shift'] || keys['Shift']) moveVector.y -= 1; // Shift = down
      
      // Apply movement in spaceship's local space
      if (moveVector.length() > 0) {
        moveVector.normalize();
        // Move forward/backward (Z axis in local space)
        if (moveVector.z !== 0) {
          spaceship.translateZ(-moveVector.z * spaceshipSpeed);
        }
        // Move left/right (X axis in local space)
        if (moveVector.x !== 0) {
          spaceship.translateX(moveVector.x * spaceshipSpeed);
        }
        // Move up/down (Y axis in world space)
        if (moveVector.y !== 0) {
          spaceship.position.y += moveVector.y * spaceshipSpeed;
        }
      }
      
      // Rotation
      if (keys['q']) spaceship.rotateY(spaceshipRotationSpeed);
      if (keys['e']) spaceship.rotateY(-spaceshipRotationSpeed);
      
      // Camera follows spaceship
      const behind = new THREE.Vector3(0, 3, 10).applyQuaternion(spaceship.quaternion);
      const desiredCam = new THREE.Vector3().copy(spaceship.position).add(behind);
      camera.position.lerp(desiredCam, 0.1);
      camera.lookAt(spaceship.position);
      
      // Check proximity to planets
      checkPlanetProximity();
    }
    
    // spaceship flight movement (auto-pilot)
    if (isFlying && spaceship && !isManualControl){
      spaceship.position.lerp(flightTarget, Math.min(1, flightSpeed));
      // orientation
      const tp = spaceship.userData.targetPlanet;
      if (tp) {
        const ppos = new THREE.Vector3(); tp.mesh.getWorldPosition(ppos);
        spaceship.lookAt(ppos);
      }
      // arrival
      if (spaceship.position.distanceTo(flightTarget) < arriveThreshold){
        isFlying = false;
        controls.enabled = true;
        const arrivedPlanet = spaceship.userData.targetPlanet;
        if (arrivedPlanet) openPlanetPanel(arrivedPlanet);
      }
    }

    // camera follow smoothing while flying
    if (isFlying && spaceship){
      const behind = new THREE.Vector3(0,4,12).applyQuaternion(spaceship.quaternion);
      const desiredCam = new THREE.Vector3().copy(spaceship.position).add(behind);
      camera.position.lerp(desiredCam, 0.06);
      // look at target planet or spaceship
      const lookAtTarget = new THREE.Vector3();
      if (spaceship.userData.targetPlanet) spaceship.userData.targetPlanet.mesh.getWorldPosition(lookAtTarget);
      else lookAtTarget.copy(spaceship.position);
      camera.lookAt(lookAtTarget);
    } else {
      // update orbit controls when not flying
      controls.update();
    }

    // Check planet proximity (only in manual control mode)
    if (isManualControl) {
      checkPlanetProximity();
    }
    
    // update PLANETS world positions and LOD toggles
    for(const p of PLANETS){
      if (p.mesh) p.mesh.getWorldPosition(p.worldPosition);
      try {
        const dist = camera.position.distanceTo(p.worldPosition || new THREE.Vector3());
        if (p._lodPlaceholder){
          if (dist > 180){ p._lodPlaceholder.visible = true; if (p.mesh) p.mesh.visible = false; }
          else { p._lodPlaceholder.visible = false; if (p.mesh) p.mesh.visible = true; }
        }
      } catch(e){}
    }

    renderer.render(scene, camera);
  } catch(err) {
    console.error('[animate] Error in render loop:', err);
    // Stop animation on error to prevent infinite crash loop
    return;
  }
}

/* ======= Panel UI ======= */
function createPlanetPanelUI(){
  const panel = document.getElementById('planet-panel');
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
  const tabs = panel.querySelectorAll('.planet-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      // Update tab buttons
      tabs.forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = '#aaa';
      });
      tab.classList.add('active');
      tab.style.background = 'rgba(255,255,255,0.1)';
      tab.style.color = '#fff';
      
      // Update tab panels
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
  
  document.getElementById('planet-close').onclick = ()=> panel.style.display = 'none';
  document.getElementById('planet-back').onclick = ()=> panel.style.display = 'none';
  document.getElementById('planet-travel').onclick = ()=>{
    const cur = panel._currentPlanet;
    if (cur) {
      isManualControl = false;
      flyToPlanet(cur);
      panel.style.display = 'none';
    }
  };
}

function openPlanetPanel(planetEntry){
  if (!planetEntry) return;
  const panel = document.getElementById('planet-panel');
  panel.style.display = 'block';
  panel._currentPlanet = planetEntry;
  
  const mapEntry = (window.PROJECT_MAP && window.PROJECT_MAP[planetEntry.name]) || null;
  const title = mapEntry && mapEntry.title ? mapEntry.title : prettify(planetEntry.name);
  const short = mapEntry && mapEntry.short ? mapEntry.short : (planetEntry.info && planetEntry.info.description) || '';
  const long = mapEntry && mapEntry.long ? mapEntry.long : '';
  const image = mapEntry && mapEntry.image ? mapEntry.image : '';
  
  // Update title and image
  const titleEl = panel.querySelector('#planet-title');
  const imgEl = panel.querySelector('#planet-img');
  titleEl.textContent = title;
  if (image){ imgEl.style.display='block'; imgEl.src = image; imgEl.alt = title; } else { imgEl.style.display='none'; imgEl.src=''; }
  
  // User Info Tab
  const descEl = panel.querySelector('#planet-desc');
  const longEl = panel.querySelector('#planet-long');
  descEl.textContent = short || 'Welcome to ' + title;
  if (long){ 
    longEl.style.display='block'; 
    longEl.textContent = long; 
  } else { 
    longEl.style.display='none'; 
  }
  
  // Projects Tab
  const projectsEl = panel.querySelector('#planet-projects');
  projectsEl.innerHTML = '';
  if (mapEntry && mapEntry.projects && Array.isArray(mapEntry.projects)) {
    mapEntry.projects.forEach(project => {
      const projectDiv = document.createElement('div');
      projectDiv.style.cssText = 'padding:12px;background:rgba(255,255,255,0.05);border-radius:6px;border-left:3px solid #06b6d4;';
      projectDiv.innerHTML = `
        <div style="font-weight:600;color:#fff;margin-bottom:4px;">${project.name || 'Project'}</div>
        <div style="font-size:12px;color:#aaa;margin-bottom:8px;">${project.description || ''}</div>
        ${project.tech ? `<div style="font-size:11px;color:#888;">Tech: ${project.tech}</div>` : ''}
        ${project.link ? `<a href="${project.link}" target="_blank" style="color:#06b6d4;font-size:12px;margin-top:4px;display:inline-block;">View Project →</a>` : ''}
      `;
      projectsEl.appendChild(projectDiv);
    });
  } else {
    projectsEl.innerHTML = '<div style="color:#888;font-size:13px;">No projects listed for this section.</div>';
  }
  
  // Contact Tab
  const contactEl = panel.querySelector('#planet-contact');
  const linksEl = panel.querySelector('#planet-links');
  contactEl.innerHTML = '';
  
  if (mapEntry && mapEntry.contact) {
    const contact = mapEntry.contact;
    if (contact.email) {
      const emailDiv = document.createElement('div');
      emailDiv.style.cssText = 'padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;';
      emailDiv.innerHTML = `<strong style="color:#fff;">Email:</strong> <a href="mailto:${contact.email}" style="color:#06b6d4;">${contact.email}</a>`;
      contactEl.appendChild(emailDiv);
    }
    if (contact.phone) {
      const phoneDiv = document.createElement('div');
      phoneDiv.style.cssText = 'padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;margin-top:8px;';
      phoneDiv.innerHTML = `<strong style="color:#fff;">Phone:</strong> <span style="color:#aaa;">${contact.phone}</span>`;
      contactEl.appendChild(phoneDiv);
    }
    if (contact.location) {
      const locDiv = document.createElement('div');
      locDiv.style.cssText = 'padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;margin-top:8px;';
      locDiv.innerHTML = `<strong style="color:#fff;">Location:</strong> <span style="color:#aaa;">${contact.location}</span>`;
      contactEl.appendChild(locDiv);
    }
  }
  
  // Links
  linksEl.innerHTML = '';
  if (mapEntry && Array.isArray(mapEntry.links)){
    for (const l of mapEntry.links){
      const a = document.createElement('a');
      a.href = l.url || '#';
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = l.label || l.url;
      a.style.cssText = 'padding:8px 12px;background:rgba(6,182,212,0.2);color:#06b6d4;border-radius:6px;font-size:13px;text-decoration:none;display:inline-block;';
      linksEl.appendChild(a);
    }
  }
  
  // Reset to first tab
  panel.querySelector('.planet-tab.active').click();
}

/* ======= Project Map Editor UI ======= */
function setupProjectEditorUI(){
  const openBtn = document.getElementById('project-open-editor');
  const overlay = document.getElementById('project-editor');
  const textarea = document.getElementById('project-json');
  const preview = document.getElementById('project-preview');
  const closeBtn = document.getElementById('project-close-editor');
  const applyBtn = document.getElementById('project-apply');
  const downloadBtn = document.getElementById('project-download');
  const uploadBtn = document.getElementById('project-upload-btn');
  const uploadInput = document.getElementById('project-upload');

  function renderPreview(){
    try {
      const obj = JSON.parse(textarea.value || '{}');
      let html = '';
      for (const k of Object.keys(obj)){
        const e = obj[k];
        html += `<div style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.03)"><div style="font-weight:700">${e.title||k}</div><div style="font-size:12px;color:#9ca3af;margin-top:4px">${e.short||''}</div></div>`;
      }
      preview.innerHTML = html || '<div style="color:#94a3b8">No entries</div>';
    } catch(e){ preview.innerHTML = '<div style="color:#fca5a5">Invalid JSON</div>'; }
  }

  openBtn.addEventListener('click', ()=>{
    overlay.style.display = 'flex';
    textarea.value = JSON.stringify(window.PROJECT_MAP || {}, null, 2);
    renderPreview();
  });

  closeBtn.addEventListener('click', ()=> { overlay.style.display = 'none'; });
  textarea.addEventListener('input', renderPreview);

  applyBtn.addEventListener('click', ()=>{
    try {
      const parsed = JSON.parse(textarea.value || '{}');
      window.PROJECT_MAP = parsed;
      // refresh current panel if open
      const panel = document.getElementById('planet-panel');
      if (panel && panel._currentPlanet) openPlanetPanel(panel._currentPlanet);
      alert('PROJECT_MAP applied in-memory. Click Download to save a file.');
    } catch(e){ alert('Invalid JSON: ' + e.message); }
  });

  downloadBtn.addEventListener('click', ()=>{
    const blob = new Blob([textarea.value], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'project_map.json'; a.click(); a.remove();
  });

  uploadBtn.addEventListener('click', ()=> uploadInput.click());
  uploadInput.addEventListener('change', (ev)=>{
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = (e)=> { textarea.value = e.target.result; renderPreview(); alert('Loaded JSON in editor. Click Apply to use it on page.') };
    r.readAsText(f);
  });
}

/* ======= Utility (optional debug) ======= */
function logResources(){
  console.log('PLANETS:', PLANETS.length, 'spaceship:', !!spaceship);
}

/* ======= End of main.js ======= */
