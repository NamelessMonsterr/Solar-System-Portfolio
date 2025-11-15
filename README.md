# 🚀 Solar System Explorer Portfolio v2.0

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Three.js](https://img.shields.io/badge/Three.js-r155-orange.svg)
![Status](https://img.shields.io/badge/status-stable-success.svg)

**An immersive 3D game-based portfolio website with AI, spatial audio, and advanced features**

[Features](#-features) • [Quick Start](#-quick-start) • [Configuration](#-configuration) • [Fixes & Stability](#-fixes--stability)

</div>

---

## ✨ Features

### 🎵 **Procedural Spatial Audio System**
- Unique music for each planet generated in real-time
- 3D spatial audio with HRTF positioning
- Dynamic crossfading based on proximity
- No audio files needed - all procedurally generated!

### 🎨 **WebGL Shader Backgrounds**
- Real-time animated planet atmospheres
- Unique visual effects for each planet
- Lightweight and performant
- No video files required

### 🪐 **First-Person Cockpit View**
- Full HUD with speed, altitude, compass
- Toggle between third-person and cockpit views (Press C)
- Realistic instrument panels
- Immersive flight experience

### 🤖 **AI Chatbot Guide**
- Interactive Q&A about planets and projects
- Built-in knowledge base
- Quick question shortcuts
- Real-time responses

### 🎯 **Guided Tour System**
- Automated journey through all planets
- Voice narration with Web Speech API
- Pause, skip, and resume controls
- Educational planet facts

### 🌍 **Multi-language Support (i18n)**
- English, Spanish, French, Hindi
- Auto-detect browser language
- Easy language switching
- Translatable UI elements

### 🚀 **Multiple Spaceship Models**
- Choose from 3 different spaceships
- Hot-swappable during gameplay
- Unique characteristics for each ship
- Smooth model transitions

### 📊 **Analytics Dashboard**
- Track visitor interactions
- Planet visit statistics
- Session duration tracking
- Google Analytics integration

### 🎮 **Easter Eggs & Secrets**
- Hidden Planet X to discover
- Enter Konami code for hyperspeed
- Secret console commands
- Achievement system

---

## 🛠️ Fixes & Stability

This section details the recent critical fixes and code quality improvements implemented to ensure the project's stability and maintainability.

| Category | Description | Status |
| :--- | :--- | :--- |
| **Critical Bugs** | Missing Three.js import, premature global variable export, and logical errors in spaceship key handling have been resolved. | **Fixed** |
| **Code Quality** | Refactored the planet information panel to use external CSS classes instead of inline styles, and replaced silent error handling with console warnings. | **Improved** |
| **Performance** | Removed the hardcoded delta time cap in the animation loop for more consistent frame-rate independent performance. | **Improved** |

---

## 📁 Project Structure

```
Portfolio-Website/
├── index.html          # Main HTML entry point
├── js/
│ ├── main.js           # Core application (integrated)
│ ├── utils/
│ │ └── config.js       # Configuration settings
│ ├── audio/
│ ├── graphics/
│ └── features/
├── resources/
│ ├── solar_system_real_scale_2k_textures.glb
│ ├── spaceships/
│ └── locales/
├── project_map.json    # Content configuration (Crucial for your portfolio)
├── README.md           # This file
└── ...
```

---

## 🎮 Complete Controls

### Desktop
| Key | Action |
|-----|--------|
| **WASD** / **Arrow Keys** | Move spaceship |
| **Space** | Move up / Interact with planet |
| **Shift** | Move down |
| **Q / E** | Rotate left/right |
| **C** | **Toggle cockpit view** |
| **M** | Toggle Game Mode / Orbit Mode |
| **Mouse Drag** | Look around |
| **Left Click** | Select planet |
| **Escape** | Close overlays |

### Mobile
- **Virtual Joystick** (left): Analog movement
- **Action Buttons** (right): W/A/S/D movement
- **Center Button**: Up/Down toggle
- **Rotation Buttons**: Q/E rotation
- **Tap Planet**: View information

---

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/NamelessMonsterr/Solar-System-Portfolio.git
cd Solar-System-Portfolio
```

### 2. Install Dependencies
This project uses ES Modules and Three.js. Ensure you have a modern browser or a local server that supports ES Modules.

### 3. Add Required Assets
Place your 3D models in the `resources/` directory:
- `solar_system_real_scale_2k_textures.glb` (required)
- `spaceship.glb` (required)

### 4. Start Local Server
You need a local web server to run the project due to browser security restrictions on loading local files (CORS).

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .
```

### 5. Open in Browser
Open your browser and navigate to `http://localhost:8000`.

---

## ⚙️ Configuration (Action Required)

To make this a functional portfolio, you **must** update the following files:

### 1. Personalize Content (`project_map.json`)

This file maps content to the planets. You must replace all placeholder data.

```json
{
  "Earth": {
    "title": "About Me",
    "short": "Brief introduction",
    "long": "Detailed biography...",
    "projects": [
      {
        "name": "Project Name",
        "description": "What it does",
        "tech": "Technologies used",
        "link": "https://github.com/username/project"
      }
    ],
    "contact": {
      "email": "your@email.com",
      "phone": "+1234567890",
      "location": "Your City"
    },
    "links": [
      {"label": "GitHub", "url": "https://github.com/username"},
      {"label": "LinkedIn", "url": "https://linkedin.com/in/username"}
    ]
  }
  // ... and other planets
}
```

### 2. Configure Analytics (`js/utils/config.js`)

If you want to track visitors, update your Google Analytics ID.

```javascript
// js/utils/config.js

ANALYTICS: {
  ENABLED: true,
  GA_ID: 'G-XXXXXXXXXX' // <-- REPLACE with your Google Analytics ID
},
```

---

## 📞 Support

- 🐛 [Report Issues](https://github.com/NamelessMonsterr/Solar-System-Portfolio/issues)
- ⭐ Star the repo if helpful!

---

<div align="center">

**Built with ❤️ for space exploration and innovation**

**Version 2.0.0** | Stable | November 2025

🚀 **Happy Exploring!** 🌌

</div>
