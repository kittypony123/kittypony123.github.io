Flight Control — Global Routes (Standalone)

Overview
- Self-contained variant focusing on connecting flights and final destinations.
- Draw routes between airports; passengers travel via multi-leg BFS routing to reach marked final airports.
- Adds radar styling, weather cells that slow planes, and proximity alerts.

How to run
- Quick: open flight-control/index.html in a browser.
- If blank, serve locally: python -m http.server 8000 then visit http://localhost:8000/flight-control/

Testing (Headless Sim)
- Open the game in a browser, then open DevTools Console.
- Run: `await MM.simulateWeeks(20, { log: true })`
  - Prints weekly snapshots and returns a final summary object: `{ day, score, waiting, overcrowded, trains, lines, finals, avgFinalMs, gameOver }`.
  - Auto-routing is enabled during the sim to keep the network feasible.
  - Balance: Early-game is intentionally gentle; difficulty ramps slowly. The 20‑day sim should complete without a fail-state.
  - Passenger volume: Set `AIRSPACE_CONFIG.spawnIntervalMultiplier` (default `1.0`) to scale demand. Lower values increase spawns; higher values reduce them.

Controls
- Draw routes by connecting airports. Crossing the red restricted corridor consumes a Permit.
- R: recolor; 1–7: pick color; Alt: remove; Esc: clear; W: toggle weather; HUD for pause/play/2x.

Notes
- All modules live under flight-control/src and are independent of the base game.

Changelog
- Visual: Plane wings are now clearly rendered (swept wing + tailplane) for better readability at all zoom levels.
- Spawn: New airports now animate in correctly (radius grows to default size instead of staying at 0).
- Stability: Fixed missing reference for HUB upgrade popup (createScorePopup), preventing a runtime error when selecting that weekly reward.
- Boarding: Passenger-specific boarding logic (long-wait fallbacks), reducing stalls at hubs and improving throughput.
- Weather: Smooth, distance-based slowdowns inside weather cells (edge = normal speed, center ≈ 50%).
- Auto-routing: Bootstraps up to 3 starter routes and seeds trains to avoid early stalls.
- Balance sweep:
  - Demand: Higher base spawn interval with stronger congestion throttling; gentler day-by-day ramp.
  - Stations: Larger early capacities with longer overcrowding grace; sustained mild bonus later.
  - Planes: Base capacity increased to 10; base speed bumped; faster transfers on Days 1–3.
  - Connections: Global MCT multiplier `mctMultiplier = 0.5` halves transfer times to reduce missed connections.
  - Airports: Early spawns slowed and gated by day; growth accelerates after Day 4.
  - Events: Rush Hour gated to Day 6, reduced impact; equipment failures start Day 6.
  - Connections: Acceptable connection wait time +50s (`AIRSPACE_CONFIG.maxWaitSeconds = 200`) and missed-connection trigger doubled (`missedConnectionMultiplier = 3.0`).
  - Result: The 20‑day headless simulation completes without failing, while challenge ramps proportionately.

Hub-and-Spoke Boost
- Toggle: `AIRSPACE_CONFIG.hubAndSpokeMode = true` (enabled).
- Tuning knobs:
  - `hubSpokeBias` (default 1.6): increases demand/auto-routing preference for hubs (interchanges/finals).
  - `hubSpokeBoardingWaitMs` (default 8000): when no path exists, passengers will board toward a hub after this personal wait (scaled down further by `hubSpokeBias`).
  - `hubLinePriorityBonus` (default 300): extra allocation priority for hub-connected lines.
  - `hubDesiredTrainBonus` (default 1): extra desired trains for hub-connected lines.
- Behavior:
  - Demand favors interchanges for non-final trips; boarding falls back to hub-bound trains earlier.
  - Auto-routing connects regular stations to nearest hubs and creates hub-to-hub spines.
  - Allocation prioritizes and scales capacity on hub-connected routes.

Steady Station Spawns
- New knobs in `AIRSPACE_CONFIG`:
  - `stationSpawnInitialDelayMs` (default 20000): delay before the first new airport appears.
  - `stationSpawnIntervalMs` (default 53333): steady interval between airport spawns (≈25% rate reduction vs 40000ms).
  - `stationSpawnJitterMs` (default 5000): small randomness to avoid rigid timing.
- The spawner respects `minStationSpawnGapMs`, so intervals never violate the minimum gap.

Dev Console Helpers
- Use these from DevTools for quick tuning without editing files:
  - `MM.setSpawnMultiplier(1.0)` — scale passenger spawn interval.
  - `MM.setStationSpawnInterval(53333)` — set steady airport spawn interval.
  - `MM.setHubAndSpoke(true|false)` — toggle hub-and-spoke mode.
  - `MM.setMCTMultiplier(0.5)` — scale transfer (MCT) times.
  - `MM.setMaxWaitSeconds(200)` — adjust acceptable connection wait.
  - `MM.setMissedConnectionMultiplier(3.0)` — adjust missed-connection grace.
  - `MM.setDebugLogs(true|false)` — toggle debug console logs.
