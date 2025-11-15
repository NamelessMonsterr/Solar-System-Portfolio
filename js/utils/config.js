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
      // Melodic C major chord for pleasant ambient background
      waveforms: ['sine', 'sine', 'sine'],
      frequencies: [261.63, 329.63, 392.00], // C, E, G - C major chord
      volumes: [0.02, 0.015, 0.01] // Softer, balanced volumes
    },
    PLANETS: {
      // Musical frequencies based on planetary characteristics
      Mercury: { frequencies: [523.25, 659.25] }, // C5, E5 - bright and quick
      Venus: { frequencies: [392.00, 493.88] }, // G4, B4 - harmonious and beautiful
      Earth: { frequencies: [261.63, 329.63] }, // C4, E4 - grounded and stable
      Mars: { frequencies: [220.00, 277.18] }, // A3, C#4 - energetic and bold
      Jupiter: { frequencies: [174.61, 220.00] }, // F3, A3 - grand and majestic
      Saturn: { frequencies: [146.83, 185.00] }, // D3, F#3 - deep and contemplative
      Uranus: { frequencies: [123.47, 155.56] }, // B2, D#3 - mysterious and unique
      Neptune: { frequencies: [103.83, 130.81] } // G#2, C3 - dreamy and ethereal
    },
    SPATIAL: {
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      refDistance: 1,
      maxDistance: 1000,
      rolloffFactor: 0.3 // Gentler falloff for more pleasant spatial audio
    }
  }
};
