## Objectives
- Resolve lag and slow response across flight and camera.
- Improve cockpit visualization and rendering clarity.
- Ensure spaceship config updates actually change visuals.
- Debug and fix checkpoint return logic.
- Repair path navigation behavior and controls.
- Design and run a comprehensive guided tour test protocol.

## Performance Optimization
- Unify Three.js imports:
  - Update `js/graphics/cockpitView.js:1` to use `import * as THREE from 'three'` to avoid mixed module contexts that degrade performance.
- Renderer tuning in `js/main.js`:
  - Cap pixel ratio (`renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25))`) and expose a "Performance Mode" toggle to disable shadows and shader backgrounds when FPS dips.
  - Keep `powerPreference: 'high-performance'` and clamp `dt` to ≤0.05; preserve current velocity smoothing.
- Scene load and effects:
  - Throttle shader backgrounds and large post effects; skip or reduce their quality in Performance Mode.
  - Add LOD toggles for distant planets (already partially present at `js/main.js:1017–1035`); ensure correctness and enable by default.
- Monitoring:
  - Add a tiny FPS/CPU panel (JS-based) with thresholds; auto-enable Performance Mode under sustained low FPS.

## Cockpit View Clarity
- Standardize THREE import (`js/graphics/cockpitView.js:1`) and camera bindings.
- Camera tuning inside cockpit:
  - Reduce cockpit offset Z (`0.35 → 0.25`) to avoid lens distortion; re-check near clip.
  - Stabilize camera transitions; shorten transition duration to ~600ms for snappier feel.
- HUD clarity:
  - Increase contrast on text; reduce scanline opacity; ensure font rendering is crisp.

## Validate Spaceship Visual Updates
- Config propagation:
  - Ensure `applyShipChange` re-applies scale, visibility, and VFX/cockpit bindings.
  - Add at least one distinct GLB for a clear visual difference; update `CONFIG.SPACESHIP.MODELS` with unique files.
- Selector reliability:
  - Confirm `SpaceshipSelector` receives `scene` and `applyShipChange` callback; set initial `currentShip` to preloaded ship.

## Checkpoint Management Debug
- Robust return logic:
  - Guard `checkpoint` serialization and deserialization; validate positions before applying.
  - On return: disable autopilot, re-enable manual controls, snap camera behind ship, and call `controls.update()`.
- UI affordances:
  - Disable "Return" if no checkpoint; show a brief toast on success.

## Path Navigation Mode Repair
- Single source of truth path manager:
  - Maintain `pathModeEnabled`, `pathIndex`, and a safe arrival detector.
  - When Path Mode is on: disable manual control; Next button advances index and calls `flyToPlanetWithSpaceship`.
  - Handle timeouts (e.g., 15s) and error states gracefully.

## Guided Tour Testing Protocol
- Test harness: `window.runGuidedTourTests()`
  - Verify UI elements render: start, next, pause, stop.
  - Start tour, press Next; assert the ship moves and narration updates.
  - Pause/resume toggles state correctly; stop hides UI and restores control.
  - Count `console.error` and ensure zero during test.

## Implementation Steps
1. Update cockpit module import to `three`; adjust cockpit camera offsets, HUD contrast and transition duration.
2. Add Performance Mode toggle; cap pixel ratio to 1.25; auto-throttle heavy effects and shadows on FPS dips.
3. Ensure `applyShipChange` reapplies scale/visibility; add distinct GLBs to `CONFIG.SPACESHIP.MODELS` for visual differences.
4. Harden checkpoint serialization; fix return logic to snap camera and re-enable controls.
5. Refine Path Mode arrival detection and Next progression; guard against race conditions.
6. Build `window.runGuidedTourTests()` and run comprehensive guided tour tests.

## Acceptance Criteria
- Average FPS ≥ 45 on typical hardware with Performance Mode off; ≥ 55 with Performance Mode on.
- Cockpit view toggles instantly; HUD is legible with crisp text and stable camera.
- Switching ships clearly changes model appearance and scale; no duplicate ships.
- Checkpoint set/return works consistently; camera snaps to expected follow position.
- Path Mode advances planet-by-planet on Next, with manual controls disabled during movement.
- Guided tour passes the test harness with zero `console.error` entries.

Confirm to proceed; I will implement these changes and provide verification results (FPS panel readings, zero-error console, and test harness outputs).