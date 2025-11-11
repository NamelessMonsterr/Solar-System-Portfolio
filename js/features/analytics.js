import { CONFIG } from '../utils/config.js';

export class AnalyticsManager {
  constructor() {
    this.enabled = CONFIG.ANALYTICS.ENABLED;
    this.events = [];
    this.sessionStartTime = Date.now();
    this.visitedPlanets = new Set();
  }

  init() {
    if (!this.enabled) return;

    // Initialize Google Analytics if ID is provided
    if (CONFIG.ANALYTICS.GA_ID) {
      this.initGoogleAnalytics();
    }

    // Track session
    this.trackEvent('session_start');

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('session_pause');
      } else {
        this.trackEvent('session_resume');
      }
    });

    // Track session end on unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent('session_end', {
        duration: Date.now() - this.sessionStartTime,
        planetsVisited: this.visitedPlanets.size
      });
    });

    console.log('✓ Analytics initialized');
  }

  initGoogleAnalytics() {
    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ANALYTICS.GA_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', CONFIG.ANALYTICS.GA_ID);

    window.gtag = gtag;
  }

  trackEvent(eventName, data = {}) {
    if (!this.enabled) return;
    if (!CONFIG.ANALYTICS.TRACK_EVENTS.includes(eventName)) return;

    const event = {
      name: eventName,
      timestamp: Date.now(),
      data: {
        ...data,
        sessionDuration: Date.now() - this.sessionStartTime
      }
    };

    this.events.push(event);

    // Send to Google Analytics if available
    if (window.gtag && CONFIG.ANALYTICS.GA_ID) {
      window.gtag('event', eventName, data);
    }

    // Log to console in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('📊 Analytics:', eventName, data);
    }

    // Store in localStorage for local analytics
    this.saveToLocalStorage();
  }

  trackPlanetVisit(planetName) {
    this.visitedPlanets.add(planetName);
    this.trackEvent('planet_visit', {
      planet: planetName,
      totalVisited: this.visitedPlanets.size
    });
  }

  saveToLocalStorage() {
    try {
      const analytics = {
        events: this.events.slice(-100), // Keep last 100 events
        visitedPlanets: Array.from(this.visitedPlanets),
        lastUpdate: Date.now()
      };
      localStorage.setItem('portfolio_analytics', JSON.stringify(analytics));
    } catch (error) {
      console.warn('Failed to save analytics to localStorage:', error);
    }
  }

  getStats() {
    return {
      sessionDuration: Date.now() - this.sessionStartTime,
      totalEvents: this.events.length,
      visitedPlanets: Array.from(this.visitedPlanets),
      eventTypes: this.events.reduce((acc, event) => {
        acc[event.name] = (acc[event.name] || 0) + 1;
        return acc;
      }, {})
    };
  }

  exportData() {
    return JSON.stringify({
      stats: this.getStats(),
      events: this.events
    }, null, 2);
  }
}
