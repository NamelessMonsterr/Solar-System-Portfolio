# 🧪 Testing Guide - Solar System Portfolio v2.0

## Quick Test Checklist

### ✅ Initial Load Tests
- [ ] Page loads without errors in browser console
- [ ] Loading overlay appears and shows progress
- [ ] Solar system model loads successfully
- [ ] Spaceship appears and is visible
- [ ] Loading overlay disappears after assets load
- [ ] No red error messages in console

### ✅ Navigation Tests
- [ ] WASD keys move spaceship in correct directions
- [ ] Mouse drag rotates camera view
- [ ] Q/E keys rotate spaceship left/right
- [ ] Space bar moves spaceship up
- [ ] Shift key moves spaceship down
- [ ] M key toggles between Game and Orbit modes
- [ ] C key toggles cockpit view

### ✅ Planet Interaction Tests
- [ ] Proximity indicator appears when near planets
- [ ] Clicking a planet opens the information overlay
- [ ] Planet overlay displays correct information
- [ ] Close button (X) closes the overlay
- [ ] ESC key closes the overlay
- [ ] Multiple planets can be visited in sequence

### ✅ Audio Tests
- [ ] Background ambient music plays after user interaction
- [ ] Each planet has unique music when approached
- [ ] Audio crossfades smoothly between planets
- [ ] Volume adjusts based on distance to planets
- [ ] No audio distortion or clipping

### ✅ Visual Effects Tests
- [ ] Particle trail follows spaceship during movement
- [ ] Engine glow visible at spaceship rear
- [ ] Spaceship banks when turning
- [ ] Planet shader backgrounds animate smoothly
- [ ] No visual glitches or z-fighting

### ✅ Feature Tests

#### Cockpit View
- [ ] HUD displays when in cockpit mode
- [ ] Speed indicator updates correctly
- [ ] Altitude shows current Y position
- [ ] Compass displays heading accurately
- [ ] System status shows engine/shields/nav

#### AI Chatbot
- [ ] Chatbot toggle button visible
- [ ] Chat window opens/closes correctly
- [ ] Bot responds to planet questions
- [ ] Quick question buttons work
- [ ] Chat history persists during session

#### Guided Tour
- [ ] Tour start button visible
- [ ] Tour visits planets in sequence
- [ ] Planet information displays during tour
- [ ] Pause/resume buttons function
- [ ] Skip button advances to next planet
- [ ] Tour can be stopped mid-way
- [ ] Voice narration plays (if supported)

#### Language Support (i18n)
- [ ] Language selector displays
- [ ] Switching language updates UI text
- [ ] All 4 languages (en/es/fr/hi) work
- [ ] Browser language auto-detected

#### Spaceship Selector
- [ ] Spaceship selector UI displays
- [ ] All available ships shown
- [ ] Clicking ship loads new model
- [ ] Ship switches smoothly
- [ ] Controls work with new ship

#### Analytics
- [ ] Events tracked to console (dev mode)
- [ ] Planet visits recorded
- [ ] Session duration calculated
- [ ] No console errors from analytics

#### Easter Eggs
- [ ] Konami code activates hyperspeed
- [ ] Hidden Planet X findable at coordinates
- [ ] Secret commands work in console
- [ ] Notifications display for discoveries

### ✅ Mobile Tests
- [ ] Touch controls appear on mobile devices
- [ ] Virtual joystick responds to touch
- [ ] Action buttons (WASD) work
- [ ] Rotation buttons (Q/E) function
- [ ] Center button toggles up/down
- [ ] Tap on planet opens overlay
- [ ] Performance acceptable (30+ FPS)

### ✅ Performance Tests
- [ ] Desktop: 60 FPS at 1080p
- [ ] Mobile: 30+ FPS
- [ ] No memory leaks after 5 minutes
- [ ] CPU usage reasonable (<50%)
- [ ] GPU usage optimal
- [ ] Network requests complete quickly

### ✅ Browser Compatibility
- [ ] Chrome/Edge 90+ works
- [ ] Firefox 88+ works
- [ ] Safari 14+ works
- [ ] Safari iOS 9+ works (with polyfill)
- [ ] Mobile browsers work

### ✅ Accessibility Tests
- [ ] Keyboard navigation works
- [ ] Tab order logical
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Screen reader compatible
- [ ] High contrast mode available
- [ ] Colorblind mode available
- [ ] Reduced motion option works

---

## Automated Testing Commands

### Browser Console Tests

// Quick System Check
(async function() {
console.log('🧪 Running System Tests...');
const tests = {
'Three.js Loaded': !!window.THREE,
'Scene Created': !!window.scene,
'Camera Created': !!window.camera,
'Spaceship Loaded': !!window.spaceship,
'Planets Mapped': window.PLANETS?.length > 0,
'Audio Manager': !!window.audioManager,
'Chatbot': !!window.chatbot,
'Tour Manager': !!window.tourManager,
'i18n Manager': !!window.i18nManager,
'Analytics': !!window.analyticsManager,
'Easter Eggs': !!window.easterEggs
};

console.table(tests);

const passed = Object.values(tests).filter(v => v).length;
const total = Object.keys(tests).length;
console.log(✅ ${passed}/${total} tests passed);

if (passed === total) {
console.log('🎉 All systems operational!');
} else {
console.warn('⚠️ Some systems not initialized');
}
})();

text

### Performance Test

// FPS Counter
(function() {
let lastTime = performance.now();
let frames = 0;

function checkFPS() {
frames++;
const currentTime = performance.now();

text
if (currentTime >= lastTime + 1000) {
  const fps = Math.round((frames * 1000) / (currentTime - lastTime));
  console.log(`FPS: ${fps}`);
  frames = 0;
  lastTime = currentTime;
}

requestAnimationFrame(checkFPS);
}

checkFPS();
})();

text

### Memory Leak Test

// Monitor memory usage (Chrome only)
if (performance.memory) {
setInterval(() => {
const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
const total = Math.round(performance.memory.totalJSHeapSize / 1048576);
console.log(Memory: ${used}MB / ${total}MB);
}, 5000);
}

text

---

## Bug Reporting Template

When reporting bugs, include:

1. **Browser & Version**: Chrome 120 / Firefox 115 / Safari 17
2. **OS**: Windows 11 / macOS 14 / iOS 17
3. **Steps to Reproduce**: 
   - Step 1
   - Step 2
   - Step 3
4. **Expected Behavior**: What should happen
5. **Actual Behavior**: What actually happens
6. **Console Errors**: Copy any red errors from console
7. **Screenshots**: If visual bug

---

## Known Issues & Workarounds

### Issue: Audio doesn't play on page load
**Workaround**: Click anywhere on page to resume audio context (browser autoplay policy)

### Issue: Low FPS on older devices
**Workaround**: Reduce particle count in config.js or disable shadows

### Issue: Import maps not working on old Safari
**Workaround**: ES Module Shims polyfill is included automatically

### Issue: Touch controls not appearing on tablet
**Workaround**: Check if device passes mobile detection in config

---

## Regression Testing

After any code changes, verify:
1. All basic controls still work
2. No new console errors
3. Performance hasn't degraded
4. All features still functional
5. Mobile compatibility maintained

---

## Test Coverage Goals

- ✅ 100% of critical features tested
- ✅ 90%+ browser compatibility
- ✅ 60 FPS on desktop
- ✅ 30+ FPS on mobile
- ✅ Zero memory leaks
- ✅ Accessible to screen readers

---

**Last Updated**: November 11, 2025
**Version**: 2.0.0