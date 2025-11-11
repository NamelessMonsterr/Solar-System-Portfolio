# ⚡ Quick Start Guide

## 🎯 For Impatient Developers

### 1. Install (30 seconds)
git clone https://github.com/NamelessMonsterr/Portfolio-Website.git
cd Portfolio-Website
chmod +x install.sh
./install.sh

text

### 2. Add Assets (2 minutes)
- Download GLB files and place in `resources/`
- Edit `resources/project_map.json` with your info

### 3. Run (5 seconds)
python -m http.server 8000

text

Open: `http://localhost:8000`

---

## 🎮 Controls Cheat Sheet

| Key | Action |
|-----|--------|
| WASD | Move |
| C | Cockpit View |
| M | Orbit Mode |
| Space | Interact |
| ESC | Close |

---

## 🎨 Quick Customization

**Change colors**: Edit CSS in `index.html`
**Change speeds**: Edit `js/utils/config.js`
**Change content**: Edit `resources/project_map.json`
**Change languages**: Add JSON to `resources/locales/`

---

## 🚀 Deploy Now

**Netlify**: Drag folder to netlify.com/drop
**Vercel**: `npx vercel`
**GitHub Pages**: Push and enable in Settings

---

## 🆘 Help

- Not loading? Check browser console (F12)
- No audio? Click anywhere first
- Low FPS? Reduce particles in config
- Mobile issues? Check touch support

**Full docs**: [README.md](README.md)
24. Final Integration Notes
INTEGRATION_NOTES.md

text
# 🔧 Integration Notes for v2.0

## File Organization

All new features are modular and can be enabled/disabled via `js/utils/config.js`.

### Import Order (Important!)

In `js/main.js`, imports must be in this order:

1. Config (first - required by all)
2. Audio system
3. Graphics (shaders, cockpit)
4. Features (chatbot, tour, i18n, etc.)

### Dependencies

config.js (no dependencies)
↓
proceduralMusic.js → config.js
shaderBackgrounds.js → (standalone)
cockpitView.js → (THREE.js only)
↓
chatbot.js → config.js
guidedTour.js → config.js
i18n.js → config.js
spaceshipSelector.js → config.js, THREE.js
analytics.js → config.js
easterEggs.js → config.js, THREE.js
↓
main.js → ALL OF THE ABOVE

text

### Global Variables Exposed

These are available on `window` object for cross-module access:

window.scene // THREE.Scene
window.camera // THREE.Camera
window.spaceship // Current spaceship mesh
window.PLANETS // Array of planet objects
window.PROJECT_MAP // Content configuration

// Managers
window.audioManager
window.shaderManager
window.cockpitManager
window.chatbot
window.tourManager
window.i18nManager
window.spaceshipSelector
window.analyticsManager
window.easterEggs

text

### Performance Considerations

**Frame Budget**: 16.6ms (60 FPS)
- Main render loop: ~10ms
- Audio updates: ~1ms
- Proximity checks: ~2ms
- VFX updates: ~2ms
- Headroom: ~1.6ms

**Memory Budget**: ~150MB
- Three.js scene: ~40MB
- GLB models: ~30MB
- Textures: ~20MB
- Audio contexts: ~10MB
- DOM elements: ~5MB
- JavaScript heap: ~45MB

### Browser Compatibility

**Minimum Requirements:**
- WebGL 1.0
- ES6 Modules
- Web Audio API
- CSS Grid/Flexbox

**Tested On:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Mobile Optimization

**Automatic Adjustments:**
- Particle count: 50 → 30 on mobile
- Update intervals: Increased by 50%
- Pixel ratio: Capped at 1.5
- Shader complexity: Reduced
- Audio voices: Limited to 2 oscillators per planet

### Feature Toggling

Disable features in `config.js`:

CHATBOT: { ENABLED: false },
GUIDED_TOUR: { ENABLED: false },
EASTER_EGGS: { ENABLED: false },
ANALYTICS: { ENABLED: false }

text

Disabled features won't initialize or consume resources.

### Debugging

**Enable verbose logging:**
// Add to top of main.js
window.DEBUG_MODE = true;

text

**Performance profiling:**
// In browser console
performance.mark('start');
// ... do something ...
performance.mark('end');
performance.measure('operation', 'start', 'end');
console.table(performance.getEntriesByType('measure'));

text

### Common Integration Issues

**Issue**: Modules not loading
**Fix**: Ensure local server is running (file:// protocol doesn't support modules)

**Issue**: THREE is undefined
**Fix**: Wait for 'threejs-ready' event before initialization

**Issue**: Audio not playing
**Fix**: Requires user interaction due to browser autoplay policies

**Issue**: Shaders not rendering
**Fix**: Check WebGL support with `Helpers.checkWebGLSupport()`

### Adding New Features

**Example: Add new spaceship**

1. Add GLB file to `resources/spaceships/`
2. Update `config.js`:
SPACESHIP: {
MODELS: [
{ id: 'newship', name: 'New Ship', file: 'spaceships/newship.glb', scale: 0.15 }
]
}

text
3. Reload page - auto-detected!

**Example: Add new planet audio**

Edit `config.js`:
AUDIO: {
PLANETS: {
CustomPlanet: {
waveform: 'sine',
frequencies: ,
volume: 0.5
}
}
}

text

---

## Testing Checklist

Before deployment:

- [ ] All GLB files load correctly
- [ ] Audio plays after user interaction
- [ ] All 9 planets have unique music
- [ ] Shader backgrounds animate smoothly
- [ ] Cockpit view toggles correctly (C key)
- [ ] Chatbot responds appropriately
- [ ] Guided tour completes successfully
- [ ] Language switching works
- [ ] Spaceship selector switches models
- [ ] Analytics tracks events
- [ ] Easter eggs discoverable
- [ ] Mobile controls responsive
- [ ] No console errors
- [ ] 60 FPS on desktop
- [ ] Passes accessibility audit

---

## Security Notes

- No external API keys in frontend code
- CSP headers configured for deployment
- XSS protection via HTML escaping
- No eval() or unsafe code execution
- LocalStorage only for non-sensitive data

---

## License

MIT - See LICENSE file for details