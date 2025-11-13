## Overview
- Fix spaceship switching so the new ship replaces the initial one, updates references, and reinitializes dependent systems.
- Improve orientation and autopilot behavior to face planets smoothly and fly to each planet sequentially.
- Verify cockpit view toggling works after ship switches.
- Extend smoke tests to exercise these flows and ensure zero console errors.

## Spaceship Switching
- Initialize selector with the preloaded ship: set its `currentShip` to the app’s initial `spaceship`.
- On selection:
  - Remove the old ship (`this.currentShip || global spaceship`) from the scene.
  - Add the new ship and call a central `applyShipChange(newShip)`:
    - Update global `spaceship` reference.
    - Re-init or update `vfxManager.init(spaceship)` so trails attach correctly.
    - Rebind cockpit manager if needed (ensure HUD targets the new ship).
    - Preserve position/rotation from the previous ship.

## Orientation & Flight
- When starting `flyToPlanetWithSpaceship`, immediately slerp the ship to face the planet target direction before movement for a snappier feel.
- Manual mode:
  - Keep current logic to gradually align yaw when near a planet; bump the interpolation a bit for responsiveness.
- Add “fly all planets” helper:
  - Iterate `PLANETS` and call `flyToPlanetWithSpaceship` with a delay between arrivals.
  - Provide a dev-only keyboard shortcut (e.g., `Shift+G`) to trigger the sequence.

## Guided Tour Integration
- Ensure guided tour uses the app ship instance (already passed) and does not fight the main loop:
  - Option A: Guided tour triggers `flyToPlanetWithSpaceship` for each step rather than moving the ship itself.
  - Option B: Temporarily disable manual control and coordinate timing with our arrival check.
- Use configured narration messages when available.

## Cockpit View
- After ship change, verify `cockpitManager` HUD updates and toggle still works (`C`).
- If needed, reinitialize cockpit with the new ship/camera binding.

## Tests & Verification
- Extend `window.runSmokeTests()` to:
  - Switch ship and assert only one ship is present in the scene and the global `spaceship` updates.
  - Trigger flight to the nearest planet and verify arrival.
  - Toggle cockpit and verify state changes.
  - Run a short guided tour step using the app ship.
  - Check console error count remains zero.

## Changes Summary
- Update `js/features/spaceshipSelector.js` to track and replace the current ship, and call `applyShipChange`.
- Update `js/main.js` to add `applyShipChange(newShip)`, enhance `flyToPlanetWithSpaceship` orientation, and add a “fly all planets” helper and shortcut.
- Extend smoke tests in `js/main.js` for selection, flight, cockpit, and guided tour.

On approval, I’ll implement these changes and verify end-to-end with clean logs.