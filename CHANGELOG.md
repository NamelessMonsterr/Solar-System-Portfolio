# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- Added CHANGELOG.md file to track code changes
- Cleaned up unwanted files and removed empty files/folders from project
- Removed path mode button and associated functionality including flyAllPlanetsSequential function and UI elements
- Implemented third-person game camera system using spherical coordinates that follows the spaceship
- Added separate mouse controls: left-click drag for spaceship steering, right-click drag for camera look-around
- Added mouse wheel zoom functionality with constraints for camera distance
- Implemented smooth interpolation for natural camera movement
- Created temporary UI hint overlay to guide users on new controls
- Maintained compatibility with existing cockpit and flight modes
- **Fixed OrbitControls event listener conflicts** - Implemented explicit event listener management to prevent interference between spaceship controls and OrbitControls
- **Fixed mode toggle key accessibility** - Made 'M' key work in both game mode and orbit mode by adding global key listener
- **Fixed mode state consistency** - Corrected inconsistent control states in checkpoint return and autopilot arrival functions
- **Fixed guided tour planet matching** - Corrected planet name capitalization to match tour sequence (Mercury, Venus, etc.)
- Ensured all changes pass ESLint validation