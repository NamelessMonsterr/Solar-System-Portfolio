## Goals
- Reduce flight lag and improve camera responsiveness.
- Add a checkpoint system to return the ship to last set position.
- Make guided tour take the ship planet-by-planet with a Next control.
- Add a “Path Mode” to follow a defined planet sequence rather than free flight.
- Ensure spaceship switching reliably replaces the active ship.

## Performance & Camera Tuning
- In `js/main.js` movement block, switch to frame-rate independent motion:
  - Replace uses of `dt * CONFIG.PERFORMANCE.FRAME_RATE_TARGET` with just `dt`.
  - Clamp `dt` to a reasonable max (e.g., `0.05`) to avoid spikes.
  - Increase camera follow speed from `0.1` to `0.25` (`js/main.js:918`).
  - Slightly increase autopilot slerp/lerp factors: position `0.12`, orientation `0.15` (`js/main.js:971–982`).
- Graphics options:
  - Set `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))` and allow toggling shadows (`CONFIG.PERFORMANCE.ENABLE_SHADOWS`).
  - Throttle or disable heavy shader backgrounds if performance dips (guard in `shaderBackgrounds`).

## Checkpoint System
- Add `setCheckpoint()` and `returnToCheckpoint()` in `js/main.js`:
  - Store `position`, `quaternion`, and `mode` in memory + `localStorage`.
  - UI: Add two small buttons (top-left or near control hint): “Set Checkpoint” and “Return to Checkpoint”.
  - When returning, stop autopilot, re-enable controls, snap camera behind the ship.

## Guided Tour Controls
- In `js/features/guidedTour.js`, add a Next button:
  - On Next, call `flyToPlanetWithSpaceship(stepPlanet)`, wait for arrival, then enable Next again.
  - Use configured narration (`step.message`) when available.
  - Ensure constructor uses `(camera, spaceship, planets)`; already fixed.

## Path Mode
- Add a simple “Path Mode” toggle in `js/main.js`:
  - When enabled, build an ordered list of planets and drive autopilot through them.
  - Disable manual control during path; allow user to press Next to advance.
  - Provide a small UI toggle button and show progress.

## Spaceship Switching Reliability
- Ensure selector uses the app’s ship instance on start and calls `applyShipChange(newShip)`:
  - Remove old ship from scene, set `spaceship = newShip`, re-init VFX and cockpit bindings.
  - Preserve transform (position/rotation/quaternion) across switches.
  - Confirm the selector receives `scene` and callback (already wired).

## Verification
- Extend `window.runSmokeTests()`:
  - Set checkpoint, move, return to checkpoint; assert positions match.
  - Trigger guided tour Next for one step and assert arrival.
  - Toggle Path Mode and advance two planets, then exit mode.
  - Switch spaceship and ensure only one ship in scene and camera follows quickly.
  - Confirm `console.error` count remains zero.

## Deliverables
- Edits to `js/main.js` (performance, camera, checkpoint, path mode, smoke tests).
- Edits to `js/features/guidedTour.js` (Next control integration).
- No new files added; all changes within existing modules.

Approve to implement and verify end-to-end with clean logs.