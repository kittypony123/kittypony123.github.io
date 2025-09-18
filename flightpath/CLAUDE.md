# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based air traffic control simulation game built with vanilla JavaScript and HTML5 Canvas. Players manage flight routes between airports, transport passengers, and optimize network efficiency.

## How to Run

- **Quick Start**: Open `index.html` in a browser
- **Local Server**: If blank, serve via local web server:
  ```bash
  python -m http.server 8000
  # Then visit http://localhost:8000/
  ```

## Architecture

### Core Game Systems

- **Entry Point**: `src/main.js` - Main game loop, initialization, and rendering
- **Configuration**: `src/maps/airspace.js` - Game parameters, airport locations, and world setup
- **Systems Directory**: `src/systems/` - Core game logic modules
  - `passengers.js` - Passenger spawning, routing, and queue management
  - `trains.js` - Aircraft movement and behavior (called "trains" internally)
  - `lines_final.js` - Route creation and management
  - `stations.js` - Airport management
  - `auto_routing.js` - AI assistant for route optimization
  - `achievements.js` - Achievement tracking
  - `events.js` - Weather and game events
  - `hexgrid.js` - Grid-based routing system (currently octilinear, not true hexagonal)

### Rendering System

- **Main Renderer**: `src/render/draw.js` - Canvas setup and utilities
- **Specialized Renderers**:
  - `lines_final.js` - Route rendering with overlap management
  - `stations_final.js` - Airport/station rendering
  - `preview.js` - Interactive preview during route creation
  - `airspace.js` - Restricted zone rendering

### UI and Input

- **Input Handling**: `src/ui/input_final.js` - Mouse/touch interaction for route creation
- **HUD System**: `src/ui/hud.js` - Game interface updates
- **Camera System**: `src/core/camera.js` - Viewport and zoom management

## Key Game Mechanics

### Route Creation
- Players drag between airports to create flight routes
- Routes automatically avoid obstacles and handle parallel spacing
- Each route requires available "lines" (route capacity) and spawns aircraft

### Passenger System
- Passengers spawn at airports with shape-based destinations
- Hub airports (marked as `isInterchange`) provide connection points
- Final destinations (`isFinal: true`) provide bonus scoring

### Resource Management
- **Lines Available**: Number of routes player can create
- **Trains Available**: Number of aircraft that can be deployed
- **Tunnels**: Permits to cross restricted airspace (red corridor)
- **Carriages**: Capacity upgrades for aircraft

### Auto-Routing System
Located in `src/systems/auto_routing.js`, provides intelligent AI assistance with **aesthetic awareness**:
- **Disabled by Default**: Must be manually enabled by user
- **Aesthetic Route Creation**: Creates visually harmonious networks using golden ratio proportions
- **Smart Route Selection**: Prioritizes connections to final destinations and hubs
- **Visual Balance**: Maintains symmetrical patterns and proper visual weight distribution
- **Pattern Recognition**: Identifies and enhances existing network symmetries
- **Harmony Scoring**: Evaluates routes based on visual appeal and network cohesion

## Development Commands

This is a vanilla JavaScript project with no build system. Development workflow:

1. **Testing**: Open `index.html` in browser or use local server
2. **Debugging**:
   - Use browser DevTools console
   - Game exposes `window.MM` object with utilities
   - Press 'D' key to toggle passenger flow visualization
   - Press 'H' key to check network harmony score
   - Press 'R' key to rebuild all routes with clean aesthetic styling
3. **Configuration**: Edit `src/maps/airspace.js` for gameplay parameters

## Live Tuning in DevTools

The game exposes `window.MM` with these utilities:
- `MM.setSpawnMultiplier(0.85)` - Adjust passenger spawn rate
- `MM.setStationSpawnInterval(53333)` - Control airport spawn timing
- `MM.setHubAndSpoke(true|false)` - Toggle hub-centric routing
- `MM.simulateWeeks(20, { log: true })` - Run headless simulation
- `MM.validateHarmony()` - Check current network aesthetic harmony score
- `MM.getAestheticRecommendations()` - Get suggestions for visual improvements
- `MM.rebuildAllLines()` - Rebuild all routes with clean aesthetic styling

## Important Implementation Notes

### Code Conventions
- Game objects use descriptive naming (stations=airports, trains=aircraft, lines=routes)
- All coordinates use world space, transformed via camera system
- Passenger destinations use shape-based routing (circle, triangle, square, diamond)
- Configuration in `AIRSPACE_CONFIG` controls all game parameters

### Performance Considerations
- Canvas rendering optimized with camera culling
- Particle systems rate-limited to prevent performance issues
- Train allocation optimized every 2 seconds
- Passenger flow visualization uses efficient pooling

### Aesthetic Routing System
The `src/systems/hexgrid.js` implements **aesthetic-aware routing** with comprehensive visual harmony features:
- **Clean Geometric Paths**: Simple, elegant curves instead of complex zigzag patterns
- **Visual Harmony Analysis**: Real-time evaluation of network aesthetics
- **Symmetry Detection**: Identifies and enhances symmetrical patterns
- **Golden Ratio Proportions**: Uses mathematical harmony in route spacing
- **Pattern Recognition**: Maintains consistent angles and spacing
- **Visual Balance**: Distributes network weight for pleasing composition

## Configuration Structure

Key settings in `src/maps/airspace.js`:
- `worldScale`: Expands map coordinate space (default 1.5)
- `spawnIntervalMultiplier`: Controls passenger spawn frequency
- `hubAndSpokeMode`: Enables hub-centric routing behavior
- `stationSpawnIntervalMs`: Time between new airport appearances
- `hexGrid`: Settings for aesthetic routing system
  - `size`: Base grid size for routing calculations (default 44)
  - `bundleThreshold`: Distance threshold for route bundling (default 30)

### Auto-Routing Configuration
Auto-routing system settings in `src/systems/auto_routing.js`:
- `enabled`: Starts disabled by default - user must manually enable
- `complexityThreshold`: Set to Infinity - never auto-enables
- `aestheticWeight`: How much to prioritize beauty over efficiency (default 0.4)
- `symmetryBonus`: Bonus multiplier for symmetrical patterns (default 2.0)
- `harmonyBonus`: Bonus for network angle consistency (default 1.5)

## Testing and Simulation

Use the built-in simulation system for testing:
```javascript
// In browser console
await MM.simulateWeeks(20, { log: true })

// Test aesthetic routing system
MM.validateHarmony()                    // Check network harmony score
MM.getAestheticRecommendations()        // Get visual improvement suggestions
MM.rebuildAllLines()                    // Rebuild all routes with clean styling
```

### Aesthetic System Testing
Test the visual harmony system with these commands:
- **Keyboard Shortcuts**: Press 'H' to check harmony, 'R' to rebuild routes
- **Harmony Validation**: Returns score (0-1) with detailed metrics
- **Visual Analysis**: Evaluates symmetry, balance, rhythm, proportion, and unity
- **Recommendations**: Provides specific suggestions for network improvements

This runs automated gameplay for testing balance and performance without user interaction.