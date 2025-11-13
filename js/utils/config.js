/**
 * Application configuration
 */

export const CONFIG = {
  SPACESHIP: {
    SPEED: 0.6,
    ROTATION_SPEED: 0.05,
    DEFAULT_MODEL: 'scout',
    MODELS: [
      { id: 'scout', name: 'Scout', file: 'spaceships/spaceship.glb', scale: 0.5, tint: '#06b6d4' },
      { id: 'ranger', name: 'Ranger', file: 'spaceships/spaceship.glb', scale: 0.7, tint: '#10b981' },
      { id: 'carrier', name: 'Carrier', file: 'spaceships/spaceship.glb', scale: 1.0, tint: '#f59e0b' }
    ]
  },

  CHATBOT: {
    ENABLED: true,
    PLANET_KNOWLEDGE: {
      Mercury: "Mercury is the smallest planet and closest to the Sun. It has extreme temperature variations and no atmosphere.",
      Venus: "Venus is the hottest planet with a thick toxic atmosphere and rotates backwards.",
      Earth: "Earth is our home planet with liquid water and diverse life forms.",
      Mars: "Mars is the red planet with the largest volcano and deepest canyon in the solar system.",
      Jupiter: "Jupiter is the largest planet, a gas giant with a Great Red Spot storm.",
      Saturn: "Saturn is famous for its spectacular ring system made of ice and rock.",
      Uranus: "Uranus rotates on its side and has a unique blue-green color from methane.",
      Neptune: "Neptune is the windiest planet with supersonic winds and a deep blue color."
    }
  },

  GUIDED_TOUR: {
    ENABLED: true,
    SPEED: 0.3,
    PAUSE_DURATION: 5000,
    SEQUENCE: [
      { planet: 'Mercury', message: 'Welcome to Mercury, the smallest planet!' },
      { planet: 'Venus', message: 'Venus is the hottest planet in our solar system.' },
      { planet: 'Earth', message: 'This is Earth, our home planet.' },
      { planet: 'Mars', message: 'Mars, the red planet, could be our future home.' },
      { planet: 'Jupiter', message: 'Jupiter is the largest planet, a gas giant.' },
      { planet: 'Saturn', message: 'Saturn is famous for its beautiful rings.' },
      { planet: 'Uranus', message: 'Uranus rotates on its side!' },
      { planet: 'Neptune', message: 'Neptune is the farthest planet from the Sun.' }
    ]
  },

  I18N: {
    DEFAULT_LANGUAGE: 'en',
    AUTO_DETECT: true,
    SUPPORTED_LANGUAGES: ['en', 'es', 'fr', 'hi']
  },

  ANALYTICS: {
    ENABLED: true,
    GA_ID: 'G-XXXXXXXXXX'
  },

  EASTER_EGGS: {
    ENABLED: true,
    SECRET_CODE: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'],
    HIDDEN_PLANET: {
      position: [100, 50, -200]
    }
  },

  AUDIO: {
    MAIN_AMBIENT: {
      waveforms: ['sine', 'triangle', 'sawtooth'],
      frequencies: [220, 330, 440],
      volumes: [0.05, 0.03, 0.02]
    },
    PLANETS: {
      Mercury: { frequencies: [440, 550] },
      Venus: { frequencies: [330, 415] },
      Earth: { frequencies: [261, 329] },
      Mars: { frequencies: [220, 277] },
      Jupiter: { frequencies: [146, 184] },
      Saturn: { frequencies: [130, 164] },
      Uranus: { frequencies: [110, 138] },
      Neptune: { frequencies: [98, 123] }
    },
    SPATIAL: {
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      refDistance: 1,
      maxDistance: 1000,
      rolloffFactor: 1
    }
  }
};
