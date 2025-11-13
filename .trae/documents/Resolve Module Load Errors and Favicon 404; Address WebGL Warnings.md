## Summary
- Fix dynamic module loading so named exports work, which resolves the runtime errors about `CONFIG` and class exports.
- Add a favicon to remove 404s.
- Keep WebGL warnings informational; ensure no pixel readbacks in hot paths.
- Verify by reloading and checking the console is clean.

## Fix Dynamic Loader
- Update `loadModule` to return a usable export:
  - `js/main.js:155–183` currently returns `module.default` which is undefined for modules that only have named exports.
  - Change it to return `module.default ?? Object.values(module)[0] ?? null` so it gracefully uses the first named export when no default exists.
- No changes needed in `initializeFeatures` call sites since they already expect a constructor function: `js/main.js:470–597`.

## Validate Config Export
- `js/utils/config.js:5` already provides `export const CONFIG = { ... }`.
- After the loader fix, feature modules like `js/features/i18n.js:1`, `js/features/chatbot.js:1`, `js/audio/proceduralMusic.js:1` should import it without runtime errors.
- If any browser cache issues persist, recommend a hard reload (Ctrl+F5).

## Favicon 404
- Add a favicon reference in `index.html` to prevent automatic `/favicon.ico` requests from 404ing:
  - Insert `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='14' fill='%2306b6d4'/></svg>'>` into `<head>` (no external file needed). File: `index.html`.

## WebGL Warnings
- Keep as informational:
  - Hardware acceleration: check Chrome settings and `chrome://gpu`.
  - Avoid CPU readbacks. Confirm we do not call `readPixels`/`readRenderTargetPixels` (no matches across `js/**`).
- No code changes unless we later identify a readback.

## Verification
- Restart the local server and hard-reload.
- Confirm console shows no `[loadModule]` failures and no `CONFIG` export errors.
- Confirm favicon 404 disappears.
- Sanity check features initialize (chatbot, i18n, guided tour) without warnings.

## Next Actions
- Apply the loader change in `js/main.js`.
- Insert favicon `<link>` in `index.html`.
- Reload and verify.