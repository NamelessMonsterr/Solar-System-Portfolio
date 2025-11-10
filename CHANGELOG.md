## Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

### [Unreleased]
- Planned improvements and upcoming changes will be tracked here.

### [1.0.0] - 2025-11-10
#### Added
- Initial public version of the Solar System Explorer Portfolio.
- `index.html` with:
  - Loading screen, controls overlay, progress tracker, mobile joystick.
  - Glassmorphic planet panels for: About (`mercuryPanel`), Projects (`venusPanel`), Skills (`earthPanel`), Resume (`marsPanel`), Contact (`jupiterPanel`), Achievements (`saturnPanel`).
  - Embedded styles, Tailwind via CDN, and library CDNs for Three.js, Anime.js, Matter.js, and PIXI.js.
- `main.js` implementing:
  - `SolarSystemPortfolio` class managing Three.js scene, camera, renderer, lighting.
  - Sun, planets with orbits, Saturn rings, starfield, and a simple spaceship.
  - Keyboard and mobile joystick controls, proximity detection, landing, discovery effects, and progress tracking.
  - Panel open/close behavior, skill bar animation, and basic UI event handlers.
- Documentation:
  - `README.md` (features, controls, stack, deployment, customization).
  - `PROJECT_STRUCTURE.md` (structure and customization guidance).
  - `design.md` (visual style guide).
  - `interaction.md` (interaction design and user journey).
  - `outline.md` (technical outline and assets list).
- Established this `CHANGELOG.md` and the convention to update it with every change.

#### Notes
- Current assets expected under `resources/` as documented.
- Site is designed for static hosting; no build step required.

<!-- Links -->
[Unreleased]: https://example.com/compare/v1.0.0...HEAD
[1.0.0]: https://example.com/releases/v1.0.0



