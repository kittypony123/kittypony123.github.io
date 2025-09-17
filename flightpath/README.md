Flight Control — Global Routes (Aesthetic Edition)

## 🎨 Enhanced with Aesthetic Routing System

### Overview
- **Air-traffic flavored network builder** with final-destination focus and **beautiful visual design**
- Draw routes between airports; passengers take multi-leg paths to reach marked finals
- **NEW**: **Aesthetic-aware routing** creates visually harmonious networks with golden ratio proportions
- **NEW**: **Real-time harmony validation** analyzes network beauty and provides improvement suggestions
- Visuals: radar styling, weather cells that slow planes, proximity alerts, **clean geometric route patterns**

### ✨ Latest Features (Aesthetic Enhancement)
- **🎯 Aesthetic Auto-Routing**: AI creates beautiful, symmetrical networks (disabled by default)
- **🔍 Visual Harmony Analysis**: Real-time evaluation of network aesthetics
- **⚖️ Golden Ratio Proportions**: Mathematical harmony in route spacing and lengths
- **🔄 Pattern Recognition**: Maintains consistent angles and symmetrical layouts
- **🎨 Clean Route Styling**: Elegant curves instead of complex zigzag patterns
- **📊 Harmony Scoring**: 0-100% aesthetic quality rating with detailed feedback

### Previous Updates (Play Area + Clarity)
- Larger map area via `worldScale: 1.5` for more breathing room
- Slimmer stations (`stationRadius: 15`, ~25% smaller) to reduce clutter
- Wider multi-route separation (`parallelSpacing: 20`) to distinguish overlaps
- Passenger spawn pacing now uses `spawnIntervalMultiplier: 0.85` for a steady but manageable flow

## How to run
- **Quick**: open `index.html` in a browser
- **Local Server**: If blank, serve locally: `python -m http.server 8000` then visit `http://localhost:8000/`

Quick start tutorial (docs)
- Connect two nearby airports to create your first route; a plane will spawn.
- Deliver passengers to their destination shape; finals (marked hubs) pay extra.
- Crossing the red restricted corridor consumes a Permit (tunnel).
- Each week, pick a reward: extra route, speed, capacity, permit, etc.
- Watch weather cells; they slow planes more near the center.

## Controls & hotkeys
- **Build**: click and drag from one airport to another
- **Modify**: insert a station by dragging onto an existing route segment
- **Removal**: hold Alt and click a route
- **Colors**: number keys 1–7 select a route color; Tab cycles
- **HUD**: Pause ⏸, Play ▶, 2x ⏩; Auto‑Routing toggle 🤖 (A); Undo ↶ (Ctrl+Z); Weather (W)

### 🎨 New Aesthetic Controls
- **H**: Check network harmony score and get aesthetic feedback
- **R**: Rebuild all routes with clean aesthetic styling
- **Auto-Routing**: Toggle in HUD (🤖) - **starts disabled by default**

Difficulty & customization
- Two ways to customize without changing core mechanics:
  - Edit config: `src/maps/airspace.js` (see parameters below).
  - Live tune in DevTools: use `window.MM.*` helpers (no reload needed).

Key parameters (config)
- `worldScale` (1.5): expands map coordinate space (visual clarity).
- `stationRadius` (15): station size; smaller reduces overlap.
- `parallelSpacing` (20): visual spacing between overlapping routes.
- `spawnInterval` (3600): base ms between passenger spawns.
- `spawnIntervalMultiplier` (0.85): multiplies spawn interval (lower = more frequent spawns).
- `maxWaitSeconds` (200): acceptable connection wait before risk of fail.
- `missedConnectionMultiplier` (3.0): extra grace beyond `maxWaitSeconds`.
- `defaultMCT` (10000) + `mctMultiplier` (0.5): transfer times and global scale.
- `trainSpeed` (0.085): base plane speed (auto‑scaled with `worldScale`).
- `stationSpawnInitialDelayMs`/`stationSpawnIntervalMs`/`stationSpawnJitterMs`: cadence for adding new airports.
- `hubAndSpokeMode`, `hubSpokeBias`, `hubSpokeBoardingWaitMs`: encourage hub‑centric networks.

## Live tuning (DevTools)
Open DevTools Console and use:

### 🎮 Gameplay Tuning
- `MM.setSpawnMultiplier(0.85)` — passenger spawn interval scale
- `MM.setStationSpawnInterval(53333)` — steady airport spawn ms
- `MM.setHubAndSpoke(true|false)` — enable/disable hub focus
- `MM.setMCTMultiplier(0.5)` — transfer time global scale
- `MM.setMaxWaitSeconds(200)` — connection wait tolerance (seconds)
- `MM.setMissedConnectionMultiplier(3.0)` — missed‑connection grace factor
- `MM.setDebugLogs(true|false)` — toggle extra console logs

### 🎨 NEW: Aesthetic System Commands
- `MM.validateHarmony()` — check current network aesthetic harmony score
- `MM.getAestheticRecommendations()` — get suggestions for visual improvements
- `MM.rebuildAllLines()` — rebuild all routes with clean aesthetic styling

## Testing & Simulation

### 🧪 Headless Simulation
```javascript
// In DevTools Console:
await MM.simulateWeeks(20, { log: true })
// Returns: { day, score, waiting, overcrowded, trains, lines, finals, avgFinalMs, gameOver }
// Auto-routing is enabled during sim to keep networks viable
```

### 🎨 Aesthetic System Testing
Test the visual harmony system:
```javascript
MM.validateHarmony()                    // Check network harmony score (0-100%)
MM.getAestheticRecommendations()        // Get specific visual improvement suggestions
MM.rebuildAllLines()                    // Rebuild all routes with clean aesthetic styling
```

**Keyboard Testing**:
- Press **H** to check harmony score in-game
- Press **R** to rebuild routes with aesthetic enhancements

## 📁 Project Structure
- Modules live under `src/` and are self-contained
- **Aesthetic routing system** implemented in `src/systems/hexgrid.js`
- **Auto-routing with aesthetic awareness** in `src/systems/auto_routing.js`
- This enhancement adds comprehensive visual design features while preserving core mechanics

## 🎨 Aesthetic Features Summary
- **Visual Harmony Analysis**: Real-time network beauty evaluation
- **Golden Ratio Proportions**: Mathematical harmony in spacing and lengths
- **Symmetry Detection**: Identifies and enhances symmetrical patterns
- **Clean Geometric Routing**: Elegant curves instead of complex zigzag patterns
- **Pattern Recognition**: Maintains consistent angles and layouts
- **Auto-Routing Enhancement**: Creates beautiful networks (disabled by default)
- **Live Feedback**: Harmony scoring with actionable recommendations
