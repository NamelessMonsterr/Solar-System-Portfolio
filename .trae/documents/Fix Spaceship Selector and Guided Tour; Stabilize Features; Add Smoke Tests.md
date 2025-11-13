## Overview
- Resolve the spaceship selection by fixing module imports, constructor use, and missing config data.
- Fix guided tour to use the configured sequence format and proper initialization timing.
- Standardize feature imports and initialization across modules.
- Add a lightweight smoke test runner to verify critical features and ensure clean console logs.

## Spaceship Selector Fixes
- Update imports in `js/features/spaceshipSelector.js` to use the import map modules:
  - Replace `import * as THREE from 'https://cdn.jsdelivr.net/...three.module.js'` with `import * as THREE from 'three'`.
  - Import loaders from add-ons: `import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';` (instead of `new THREE.GLTFLoader()`). File: `js/features/spaceshipSelector.js:1` and loader usage in `loadShipModel()`.
- Pass `scene` and callback when creating the selector:
  - In `js/main.js:554–563`, instantiate with `new SpaceshipSelector(scene, (ship) => { spaceship = ship; })` and call `init()` after models load.
- Ensure config contains models and a default:
  - Add `SPACESHIP.DEFAULT_MODEL` and populate `SPACESHIP.MODELS` with at least one entry referencing `resources/spaceships/spaceship.glb` and a sensible `scale`. File: `js/utils/config.js:6–10`.

## Guided Tour Fixes
- Correct constructor usage and timing:
  - Guided tour class expects `(camera, spaceship, planets)` (see `js/features/guidedTour.js:4–16`). Instantiate it after assets are loaded when `spaceship` and `PLANETS` exist.
  - Modify `js/main.js:541–549` to create `new GuidedTourManager(camera, spaceship, PLANETS)` and call `init()` only after `setupLoadersAndLoadModels()` completes.
- Match sequence data format:
  - `CONFIG.GUIDED_TOUR.SEQUENCE` currently is objects `{ planet, message }` (`js/utils/config.js:31–39`). Update guided tour logic to support objects:
    - When reading the next step, use `const step = this.tourSequence[this.currentStep]; const planetName = typeof step === 'string' ? step : step.planet;`
    - Use narration from `step.message` when present; fallback to chatbot knowledge. Files: `js/features/guidedTour.js:210–230`, `js/features/guidedTour.js:296–326`.
- Standardize THREE import:
  - Replace CDN import with `import * as THREE from 'three'` in `js/features/guidedTour.js:1`.

## Initialization Order
- Defer feature initialization that needs scene/spaceship/planets until after models load:
  - Move or re-invoke initialization for guided tour, spaceship selector, and cockpit view after `setupLoadersAndLoadModels()` finishes (`js/main.js:602–685`).
  - Keep analytics, i18n, audio, shader backgrounds early as they do not require models.

## Smoke Tests
- Add `window.runSmokeTests()` that:
  - Asserts `CONFIG` structure presence.
  - Exercises spaceship selector: programmatically select the default ship, verify `scene.children` update.
  - Starts guided tour, advances one step, verifies UI updates and camera/spaceship positions change.
  - Checks i18n switcher renders and switches languages.
  - Verifies no errors in `console.error` during these flows (wrap with proxies to count errors).
- Implement in `js/main.js` near helpers, guarded to avoid production side effects; callable from the dev console.

## Console Cleanliness & Performance
- Keep WebGL fallback/security and GPU stall messages informational; avoid introducing `readPixels`/CPU readbacks (confirmed none across `js/**`).
- Ensure audio init only occurs once and uses finite parameter guards (already added in `js/audio/proceduralMusic.js`).

## Verification
- Run locally, hard reload, and:
  - Confirm spaceship selector UI renders, selection swaps models, and no runtime errors.
  - Start guided tour; it steps through planets using the configured sequence and shows narrations.
  - Run `window.runSmokeTests()`; verify a green summary and zero console errors.
  - Confirm favicon 404 is gone and feature modules load without `[loadModule]` warnings.

## Changes Summary
- Edit `js/features/spaceshipSelector.js` (imports, loaders, robustness).
- Edit `js/main.js` (feature initialization order; proper constructor args; add smoke tests function).
- Edit `js/features/guidedTour.js` (imports; sequence handling).
- Edit `js/utils/config.js` (add `DEFAULT_MODEL` and model entries).

Confirm to proceed, and I’ll implement and verify end‑to‑end with zero console errors.