import { CONFIG } from '../utils/config.js';

export class AccessibilityManager {
  constructor() {
    this.settings = {
      highContrast: CONFIG.ACCESSIBILITY.HIGH_CONTRAST,
      colorblindMode: CONFIG.ACCESSIBILITY.COLORBLIND_MODE,
      reducedMotion: CONFIG.ACCESSIBILITY.REDUCED_MOTION,
      screenReader: CONFIG.ACCESSIBILITY.SCREEN_READER
    };
  }

  init() {
    this.createAccessibilityMenu();
    this.applySettings();
    this.setupKeyboardNavigation();
    this.addAriaLabels();
    
    console.log('✓ Accessibility features initialized');
  }

  createAccessibilityMenu() {
    const menu = document.createElement('div');
    menu.id = 'accessibility-menu';
    menu.style.cssText = `
      position: fixed;
      top: 80px;
      left: 20px;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(10px);
      padding: 15px;
      border-radius: 10px;
      border: 2px solid #06b6d4;
      z-index: 1500;
      display: none;
      min-width: 250px;
    `;

    menu.innerHTML = `
      <div style="
        color: #06b6d4;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span>♿</span>
        <span>Accessibility</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <label style="display: flex; align-items: center; justify-content: space-between; color: #ddd; font-size: 13px; cursor: pointer;">
          <span>High Contrast</span>
          <input type="checkbox" id="a11y-high-contrast" style="width: 18px; height: 18px; cursor: pointer;">
        </label>

        <label style="display: flex; align-items: center; justify-content: space-between; color: #ddd; font-size: 13px; cursor: pointer;">
          <span>Colorblind Mode</span>
          <input type="checkbox" id="a11y-colorblind" style="width: 18px; height: 18px; cursor: pointer;">
        </label>

        <label style="display: flex; align-items: center; justify-content: space-between; color: #ddd; font-size: 13px; cursor: pointer;">
          <span>Reduce Motion</span>
          <input type="checkbox" id="a11y-reduced-motion" style="width: 18px; height: 18px; cursor: pointer;">
        </label>

        <label style="display: flex; align-items: center; justify-content: space-between; color: #ddd; font-size: 13px; cursor: pointer;">
          <span>Screen Reader</span>
          <input type="checkbox" id="a11y-screen-reader" checked style="width: 18px; height: 18px; cursor: pointer;">
        </label>
      </div>

      <div style="
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 11px;
        color: #888;
      ">
        Keyboard: Tab to navigate, Enter to select
      </div>
    `;

    document.body.appendChild(menu);

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'accessibility-toggle';
    toggleBtn.innerHTML = '♿';
    toggleBtn.setAttribute('aria-label', 'Accessibility Menu');
    toggleBtn.style.cssText = `
      position: fixed;
      top: 140px;
      left: 20px;
      width: 40px;
      height: 40px;
      background: rgba(6, 182, 212, 0.8);
      border: 2px solid #06b6d4;
      border-radius: 50%;
      font-size: 20px;
      cursor: pointer;
      z-index: 1500;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    `;
    
    toggleBtn.onclick = () => {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    };
    
    document.body.appendChild(toggleBtn);

    // Event listeners for checkboxes
    document.getElementById('a11y-high-contrast').onchange = (e) => {
      this.settings.highContrast = e.target.checked;
      this.applySettings();
    };

    document.getElementById('a11y-colorblind').onchange = (e) => {
      this.settings.colorblindMode = e.target.checked;
      this.applySettings();
    };

    document.getElementById('a11y-reduced-motion').onchange = (e) => {
      this.settings.reducedMotion = e.target.checked;
      this.applySettings();
    };

    document.getElementById('a11y-screen-reader').onchange = (e) => {
      this.settings.screenReader = e.target.checked;
      this.applySettings();
    };
  }

  applySettings() {
    const body = document.body;

    // High contrast
    if (this.settings.highContrast) {
      body.classList.add('high-contrast');
      this.applyHighContrast();
    } else {
      body.classList.remove('high-contrast');
      this.removeHighContrast();
    }

    // Colorblind mode
    if (this.settings.colorblindMode) {
      body.classList.add('colorblind-mode');
      this.applyColorblindMode();
    } else {
      body.classList.remove('colorblind-mode');
      this.removeColorblindMode();
    }

    // Reduced motion
    if (this.settings.reducedMotion) {
      body.classList.add('reduced-motion');
      this.applyReducedMotion();
    } else {
      body.classList.remove('reduced-motion');
      this.removeReducedMotion();
    }

    // Save preferences
    localStorage.setItem('accessibility_settings', JSON.stringify(this.settings));
  }

  applyHighContrast() {
    const style = document.createElement('style');
    style.id = 'high-contrast-style';
    style.textContent = `
      .high-contrast {
        filter: contrast(1.5) brightness(1.2);
      }
      .high-contrast #planet-overlay-bg {
        filter: contrast(2) brightness(0.8) !important;
      }
      .high-contrast button,
      .high-contrast input {
        border-width: 3px !important;
      }
    `;
    document.head.appendChild(style);
  }

  removeHighContrast() {
    const style = document.getElementById('high-contrast-style');
    if (style) style.remove();
  }

  applyColorblindMode() {
    const style = document.createElement('style');
    style.id = 'colorblind-style';
    style.textContent = `
      .colorblind-mode {
        /* Adjust colors for colorblind users */
        --primary-color: #0891b2;
        --success-color: #0d9488;
        --warning-color: #f59e0b;
        --error-color: #dc2626;
      }
      .colorblind-mode #control-mode-text {
        color: #0891b2 !important;
      }
      .colorblind-mode .action-btn,
      .colorblind-mode .dpad-base,
      .colorblind-mode .dpad-stick {
        border-color: #0891b2 !important;
      }
    `;
    document.head.appendChild(style);
  }

  removeColorblindMode() {
    const style = document.getElementById('colorblind-style');
    if (style) style.remove();
  }

  applyReducedMotion() {
    const style = document.createElement('style');
    style.id = 'reduced-motion-style';
    style.textContent = `
      .reduced-motion,
      .reduced-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      .reduced-motion #planet-overlay-bg {
        animation: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  removeReducedMotion() {
    const style = document.getElementById('reduced-motion-style');
    if (style) style.remove();
  }

  setupKeyboardNavigation() {
    // Tab navigation for interactive elements
    const focusableElements = 'button, a, input, textarea, [tabindex]:not([tabindex="-1"])';
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const focusable = Array.from(document.querySelectorAll(focusableElements))
          .filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
          });

        if (focusable.length === 0) return;

        const currentIndex = focusable.indexOf(document.activeElement);
        
        if (e.shiftKey) {
          // Shift+Tab: go backwards
          const prevIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
          focusable[prevIndex].focus();
        } else {
          // Tab: go forwards
          const nextIndex = currentIndex >= focusable.length - 1 ? 0 : currentIndex + 1;
          focusable[nextIndex].focus();
        }
      }
    });

    // Focus indicator
    const focusStyle = document.createElement('style');
    focusStyle.textContent = `
      button:focus,
      a:focus,
      input:focus,
      textarea:focus {
        outline: 3px solid #06b6d4 !important;
        outline-offset: 2px !important;
      }
    `;
    document.head.appendChild(focusStyle);
  }

  addAriaLabels() {
    // Add aria-labels to key UI elements
    const elements = [
      { selector: '#glCanvas', label: '3D Solar System View' },
      { selector: '#chatbot-toggle', label: 'Open AI Chatbot' },
      { selector: '#tour-start-btn', label: 'Start Guided Tour' },
      { selector: '#project-open-editor', label: 'Open Project Editor' },
      { selector: '#planet-overlay-close', label: 'Close Planet Information' },
      { selector: '#mobile-controller', label: 'Mobile Controls' }
    ];

    elements.forEach(({ selector, label }) => {
      const el = document.querySelector(selector);
      if (el && !el.getAttribute('aria-label')) {
        el.setAttribute('aria-label', label);
      }
    });

    // Add role attributes
    const canvas = document.querySelector('#glCanvas');
    if (canvas) {
      canvas.setAttribute('role', 'application');
      canvas.setAttribute('aria-label', '3D Interactive Solar System Portfolio');
    }
  }

  announceToScreenReader(message) {
    if (!this.settings.screenReader) return;

    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => announcement.remove(), 1000);
  }

  cleanup() {
    const menu = document.getElementById('accessibility-menu');
    const toggle = document.getElementById('accessibility-toggle');
    if (menu) menu.remove();
    if (toggle) toggle.remove();
  }
}
