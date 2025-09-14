// Air Traffic Routes — Flight Control themed config
// Reuses existing engine semantics; airports are "stations",
// planes are "trains", routes are "lines", permits are "tunnels".

export const AIRSPACE_CONFIG = {
  stationCount: 26,
  stationRadius: 20,
  // Gentler baseline demand; slower ramp handled elsewhere
  spawnInterval: 3600,
  // Multiplier applied to computed spawn interval (lower = more spawns)
  spawnIntervalMultiplier: 1.0,
  // Prefer hub-and-spoke topology when routing/auto-building
  hubAndSpokeMode: true,
  // Boost parameters for hub-and-spoke behavior
  hubSpokeBias: 1.6,              // >1 favors hubs more in demand/auto-routing
  hubSpokeBoardingWaitMs: 8000,   // passengers board toward hubs after this wait when no path exists
  hubLinePriorityBonus: 300,      // extra allocation priority for hub-connected lines
  hubDesiredTrainBonus: 1,        // extra desired trains on hub-connected lines
  // More tolerant connection windows to avoid premature failures
  maxWaitSeconds: 200, // +50s over previous 150s
  // Multiplier for when a "missed connection" triggers a fail, as a factor of maxWaitSeconds
  missedConnectionMultiplier: 3.0, // doubled from prior 1.5x -> 3.0x
  // Fewer new airports early; allow growth later
  minStationSpawnGapMs: 12000,
  snapExtraRadius: 28,
  linePickTolerancePx: 12,
  lineCornerRadius: 28,
  lineOutlineWidth: 18,
  lineInnerWidth: 12,
  parallelSpacing: 14,
  endCapOut: 18,
  endCapHalf: 9,
  initialLines: 6, // Slightly more routes to stabilize Day 1–2
  maxLines: 12,
  initialTrains: 9, // More initial planes to handle demand
  trainSpeed: 0.085, // Faster for better throughput
  defaultMCT: 10000,
  // Multiplier to scale all Minimum Connection Times globally (0.5 halves MCT)
  mctMultiplier: 0.5,
  defaultTurnaroundMs: 500,
  shapes: ['circle','triangle','square','diamond'],
  passengerColors: { circle: '#38bdf8', triangle: '#f97316', square:'#22c55e', diamond:'#a78bfa' },
  minScale: 0.35,
  maxScale: 2.8,
  weekLength: 45000,
  hexGrid: { size: 44, snapRadius: 60, angleSnap: Math.PI/4, enabled: true, showGrid: false },
  
  // Steady station spawning (airports)
  stationSpawnInitialDelayMs: 20000,
  // Increase interval by 33.3% => ~25% fewer spawns over time
  stationSpawnIntervalMs: 53333,
  stationSpawnJitterMs: 5000,

  // Airports catalog (positions in world units)
  // Note: named as `londonStations` to match the existing main setup
  londonStations: [
    { name: 'Northfield Intl', x: -280, y: -180, shape: 'circle', zone: 'north', isFinal: true, isInterchange: true, mctMs: 10000, turnaroundMs: 700 },
    { name: 'Westport', x: -320, y: -40, shape: 'triangle', zone: 'west' },
    { name: 'Harbor Air', x: -220, y: 120, shape: 'square', zone: 'west' },
    { name: 'Metro City', x: -80, y: -60, shape: 'diamond', zone: 'central' },
    { name: 'Ridgeview', x: -60, y: -220, shape: 'triangle', zone: 'north' },
    { name: 'Lakeview', x: 40, y: -160, shape: 'circle', zone: 'north' },
    { name: 'Old Town Strip', x: -100, y: 80, shape: 'square', zone: 'central' },
    { name: 'Eastbank', x: 180, y: -120, shape: 'diamond', zone: 'northeast' },
    { name: 'Downtown Air', x: 40, y: -10, shape: 'triangle', zone: 'central' },
    { name: 'Capitol Field', x: 100, y: 30, shape: 'circle', zone: 'central' },
    { name: 'Riverport', x: 160, y: 120, shape: 'square', zone: 'southeast' },
    { name: 'Harbor South', x: 60, y: 190, shape: 'triangle', zone: 'south' },
    { name: 'Palm Coast', x: -40, y: 220, shape: 'circle', zone: 'south' },
    { name: 'Greenpoint', x: -200, y: 180, shape: 'diamond', zone: 'southwest' },
    { name: 'Bayview', x: 300, y: 40, shape: 'square', zone: 'east', isFinal: true, isInterchange: true, mctMs: 9000, turnaroundMs: 700 },
    { name: 'Highland', x: 260, y: -40, shape: 'triangle', zone: 'east' },
    { name: 'Cedar Ridge', x: 300, y: -180, shape: 'square', zone: 'northeast' },
    { name: 'Silver Peak', x: -40, y: -120, shape: 'circle', zone: 'north' },
    { name: 'Bluffs Intl', x: -220, y: -100, shape: 'square', zone: 'northwest' },
    { name: 'Sunset Strip', x: -300, y: 80, shape: 'diamond', zone: 'west' },
    { name: 'Seaside', x: 220, y: 220, shape: 'circle', zone: 'southeast', isFinal: true, isInterchange: true, mctMs: 11000 },
    { name: 'Crosswind', x: -220, y: 20, shape: 'triangle', zone: 'west' },
    { name: 'Aurora', x: 80, y: -220, shape: 'diamond', zone: 'north' },
    { name: 'Valley', x: -140, y: 140, shape: 'circle', zone: 'central' },
    { name: 'Sky Harbor', x: 200, y: -220, shape: 'triangle', zone: 'northeast', isFinal: true, isInterchange: true, mctMs: 10000 },
    { name: 'Gull Point', x: 360, y: -60, shape: 'diamond', zone: 'east' }
  ],

  // Restricted airspace corridor (keeps original keys for engine compatibility)
  thamesPath: 'M -640 -40 Q -300 -80 0 -60 Q 300 -20 640 0',
  thamesPolygon: [
    { x: -640, y: -80 }, { x: 640, y: -20 }, { x: 640, y: 40 }, { x: -640, y: -20 }
  ],

  // Route color palette
  lineColors: [ '#0EA5A3', '#2563EB', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#F472B6' ]
};
