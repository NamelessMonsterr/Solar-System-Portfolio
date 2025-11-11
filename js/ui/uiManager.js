// UI Manager - Central UI controller
export class UIManager {
  constructor() {
    this.elements = new Map();
    this.notifications = [];
  }

  init() {
    this.cacheElements();
    this.setupEventListeners();
    console.log('✓ UI Manager initialized');
  }

  cacheElements() {
    // Cache commonly accessed elements
    this.elements.set('loadingOverlay', document.getElementById('loading-overlay'));
    this.elements.set('loadingText', document.getElementById('loading-text'));
    this.elements.set('loadingFill', document.getElementById('loading-fill'));
    this.elements.set('planetPanel', document.getElementById('planet-panel'));
    this.elements.set('planetOverlay', document.getElementById('planet-overlay'));
    this.elements.set('controlHint', document.getElementById('control-hint'));
    this.elements.set('controlStatus', document.getElementById('control-status'));
    this.elements.set('proximityIndicator', document.getElementById('proximity-indicator'));
  }

  setupEventListeners() {
    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllOverlays();
      }
    });
  }

  showLoading(text = 'Loading...') {
    const overlay = this.elements.get('loadingOverlay');
    const textEl = this.elements.get('loadingText');
    
    if (overlay) overlay.style.display = 'flex';
    if (textEl) textEl.textContent = text;
  }

  hideLoading() {
    const overlay = this.elements.get('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  updateLoadingProgress(percent) {
    const fill = this.elements.get('loadingFill');
    if (fill) fill.style.width = `${percent}%`;
  }

  showNotification(message, type = 'info', duration = 3000) {
    const colors = {
      info: '#06b6d4',
      success: '#00ff00',
      warning: '#ffaa00',
      error: '#ff4444'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: ${colors[type] || colors.info};
      padding: 15px 20px;
      border-radius: 8px;
      border: 2px solid ${colors[type] || colors.info};
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      z-index: 9999;
      font-size: 14px;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, duration);

    this.notifications.push(notification);
  }

  updateControlStatus(mode) {
    const statusEl = this.elements.get('controlStatus');
    if (statusEl) {
      const modeText = statusEl.querySelector('#control-mode-text');
      if (modeText) {
        modeText.textContent = mode;
        modeText.style.color = mode === 'Game Mode' ? '#00ff00' : '#06b6d4';
      }
    }
  }

  showProximityIndicator(planetName, distance, maxDistance) {
    const indicator = this.elements.get('proximityIndicator');
    if (!indicator) return;
    
    const proximityPercent = Math.max(0, Math.min(100, (1 - distance / maxDistance) * 100));
    
    indicator.innerHTML = `
      <div style="background:rgba(0,255,0,0.3);border:2px solid #00ff00;padding:12px;border-radius:8px;box-shadow:0 0 20px rgba(0,255,0,0.5);">
        <div style="font-weight:700;color:#00ff00;font-size:16px;margin-bottom:6px;">✨ ${planetName}</div>
        <div style="font-size:13px;color:#88ff88;margin-bottom:8px;">Press <strong>SPACE</strong> or <strong>CLICK</strong> to view info</div>
        <div style="background:rgba(0,0,0,0.3);height:6px;border-radius:3px;overflow:hidden;margin-top:8px;">
          <div style="background:linear-gradient(90deg,#00ff00,#88ff88);height:100%;width:${proximityPercent}%;transition:width 0.2s;"></div>
        </div>
      </div>
    `;
    indicator.style.display = 'block';
  }

  hideProximityIndicator() {
    const indicator = this.elements.get('proximityIndicator');
    if (indicator) indicator.style.display = 'none';
  }

  closeAllOverlays() {
    const overlay = this.elements.get('planetOverlay');
    if (overlay && overlay.classList.contains('active')) {
      overlay.classList.remove('active');
    }
    
    // Close other overlays
    const chatbot = document.getElementById('chatbot-container');
    if (chatbot) chatbot.style.display = 'none';
    
    const editor = document.getElementById('project-editor');
    if (editor) editor.style.display = 'none';
  }

  toggleElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
  }

  cleanup() {
    this.notifications.forEach(n => n.remove());
    this.notifications = [];
  }
}
