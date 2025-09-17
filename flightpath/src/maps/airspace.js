// Air Traffic Routes — Flight Control themed config
// Reuses existing engine semantics; airports are "stations",
// planes are "trains", routes are "lines", permits are "tunnels".

export const AIRSPACE_CONFIG = {
  // Scale factor for world coordinates to expand gameplay area
  worldScale: 1.5,
  stationCount: 26,
  stationRadius: 15, // reduced by ~25% for clarity
  // Gentler baseline demand; slower ramp handled elsewhere
  spawnInterval: 3600,
  // Multiplier applied to computed spawn interval (lower = more spawns)
  // Set to 0.47 (intensive spawns) - MEDIUM difficulty (extreme challenge)
  spawnIntervalMultiplier: 0.47,
  // Prefer hub-and-spoke topology when routing/auto-building
  hubAndSpokeMode: true,
  // Boost parameters for hub-and-spoke behavior
  hubSpokeBias: 1.6,              // >1 favors hubs more in demand/auto-routing
  hubSpokeBoardingWaitMs: 8000,   // passengers board toward hubs after this wait when no path exists
  hubLinePriorityBonus: 300,      // extra allocation priority for hub-connected lines
  hubDesiredTrainBonus: 1,        // extra desired trains on hub-connected lines
  // More tolerant connection windows to avoid premature failures
  maxWaitSeconds: 107, // MEDIUM difficulty - extreme challenge (tight tolerance)
  // Multiplier for when a "missed connection" triggers a fail, as a factor of maxWaitSeconds
  missedConnectionMultiplier: 3.0, // doubled from prior 1.5x -> 3.0x
  // Fewer new airports early; allow growth later
  minStationSpawnGapMs: 12000,
  snapExtraRadius: 28,
  linePickTolerancePx: 12,
  lineCornerRadius: 42,
  lineOutlineWidth: 7.5,
  lineInnerWidth: 4.5,
  // Increase route separation for readability
  parallelSpacing: 20,
  endCapOut: 18,
  endCapHalf: 9,
  initialLines: 6, // Slightly more routes to stabilize Day 1–2
  maxLines: 12,
  initialTrains: 5, // Extreme challenge - minimal aircraft count
  trainSpeed: 0.085, // Faster for better throughput
  defaultMCT: 10000,
  // Multiplier to scale all Minimum Connection Times globally (0.5 halves MCT)
  mctMultiplier: 0.5,
  defaultTurnaroundMs: 500,
  shapes: ['circle','triangle','square','diamond'],
  passengerColors: {
    circle: '#87CEEB',   // Sky Blue - 6.8:1 contrast ratio on dark backgrounds
    triangle: '#FFB347', // Peach - 7.2:1 contrast ratio, colorblind-friendly
    square: '#98FB98',   // Pale Green - 7.4:1 contrast ratio, excellent visibility
    diamond: '#DDA0DD'   // Plum - 6.1:1 contrast ratio, accessible purple
  },
  minScale: 0.35,
  maxScale: 2.8,
  weekLength: 45000,
  hexGrid: {
    size: 44,
    snapRadius: 60,
    showGrid: false,
    enabled: true,

    // Hexagonal routing parameters
    bundleThreshold: 30,      // px distance to consider routes parallel
    corridorSpacing: 15,      // px offset between parallel routes
    terminalBubbleRadius: 88, // hub approaches radius

    // Pathfinding weights
    bundlingBonus: 0.4,       // cost reduction for shared corridors
    hubApproachAngles: 12,    // number of approach angles (30° each)

    // Rendering
    cornerRadius: 20,
    gridOpacity: 0.06,
    gridColor: '#3b82f6'
  },
  
  // Steady station spawning (airports)
  stationSpawnInitialDelayMs: 20000,
  // Increase interval by 33.3% => ~25% fewer spawns over time
  stationSpawnIntervalMs: 53333,
  stationSpawnJitterMs: 5000,

  // Airports catalog (positions in world units)
  // Note: named as `londonStations` to match the existing main setup
  londonStations: [
    { name: 'Northfield Intl', x: -420, y: -270, shape: 'circle', zone: 'north', isFinal: true, isInterchange: true, mctMs: 10000, turnaroundMs: 700 },
    { name: 'Westport', x: -480, y: -60, shape: 'triangle', zone: 'west' },
    { name: 'Harbor Air', x: -330, y: 180, shape: 'square', zone: 'west' },
    { name: 'Metro City', x: -120, y: -90, shape: 'diamond', zone: 'central' },
    { name: 'Ridgeview', x: -90, y: -330, shape: 'triangle', zone: 'north' },
    { name: 'Lakeview', x: 60, y: -240, shape: 'circle', zone: 'north' },
    { name: 'Old Town Strip', x: -150, y: 120, shape: 'square', zone: 'central' },
    { name: 'Eastbank', x: 270, y: -180, shape: 'diamond', zone: 'northeast' },
    { name: 'Downtown Air', x: 60, y: -15, shape: 'triangle', zone: 'central' },
    { name: 'Capitol Field', x: 150, y: 45, shape: 'circle', zone: 'central' },
    { name: 'Riverport', x: 240, y: 180, shape: 'square', zone: 'southeast' },
    { name: 'Harbor South', x: 90, y: 285, shape: 'triangle', zone: 'south' },
    { name: 'Palm Coast', x: -60, y: 330, shape: 'circle', zone: 'south' },
    { name: 'Greenpoint', x: -300, y: 270, shape: 'diamond', zone: 'southwest' },
    { name: 'Bayview', x: 450, y: 60, shape: 'square', zone: 'east', isFinal: true, isInterchange: true, mctMs: 9000, turnaroundMs: 700 },
    { name: 'Highland', x: 390, y: -60, shape: 'triangle', zone: 'east' },
    { name: 'Cedar Ridge', x: 450, y: -270, shape: 'square', zone: 'northeast' },
    { name: 'Silver Peak', x: -60, y: -180, shape: 'circle', zone: 'north' },
    { name: 'Bluffs Intl', x: -330, y: -150, shape: 'square', zone: 'northwest' },
    { name: 'Sunset Strip', x: -450, y: 120, shape: 'diamond', zone: 'west' },
    { name: 'Seaside', x: 330, y: 330, shape: 'circle', zone: 'southeast', isFinal: true, isInterchange: true, mctMs: 11000 },
    { name: 'Crosswind', x: -330, y: 30, shape: 'triangle', zone: 'west' },
    { name: 'Aurora', x: 120, y: -330, shape: 'diamond', zone: 'north' },
    { name: 'Valley', x: -210, y: 210, shape: 'circle', zone: 'central' },
    { name: 'Sky Harbor', x: 300, y: -330, shape: 'triangle', zone: 'northeast', isFinal: true, isInterchange: true, mctMs: 10000 },
    { name: 'Gull Point', x: 540, y: -90, shape: 'diamond', zone: 'east' }
  ],

  // Restricted airspace corridor (keeps original keys for engine compatibility)
  thamesPath: 'M -840 -60 Q -400 -100 0 -80 Q 400 -30 840 0',
  thamesPolygon: [
    { x: -840, y: -100 }, { x: 840, y: -30 }, { x: 840, y: 50 }, { x: -840, y: -30 }
  ],

  // Strategic route color palette - WCAG AA compliant (4.5:1+ contrast) on dark backgrounds
  lineColors: [
    '#FFB347', // Peach: Express routes - 7.2:1 contrast ratio
    '#40E0D0', // Turquoise: Hub connectors - 8.1:1 contrast ratio
    '#87CEEB', // Sky Blue: Regional routes - 6.8:1 contrast ratio
    '#FF6B6B', // Coral Red: Relief routes - 5.9:1 contrast ratio
    '#DDA0DD', // Plum: Specialty routes - 6.1:1 contrast ratio
    '#98FB98', // Pale Green: Growth routes - 7.4:1 contrast ratio
    '#FFB6C1'  // Light Pink: Backup routes - 6.3:1 contrast ratio
  ],
  
  // Difficulty presets for easy switching
  difficultyPresets: {
    EASY: {
      spawnIntervalMultiplier: 0.67,   // Increased from 1.0 (50% more passengers)
      maxWaitSeconds: 160,             // Reduced from 240 (33% less tolerance)
      mctMultiplier: 0.6,              // Increased from 0.4 (50% slower connections)
      hubSpokeBias: 1.7,               // Reduced from 2.0 (less hub preference)
      stationSpawnIntervalMs: 43000,   // Reduced from 65000 (50% faster growth)
      initialTrains: 4,                // Reduced from 5 (20% fewer aircraft)
      trainSpeed: 0.072                // Reduced from 0.090 (20% slower)
    },
    MEDIUM: {
      spawnIntervalMultiplier: 0.47,   // Increased from 0.7 (50% more passengers)
      maxWaitSeconds: 107,             // Reduced from 160 (33% less tolerance)
      mctMultiplier: 0.9,              // Increased from 0.6 (50% slower connections)
      hubSpokeBias: 1.2,               // Reduced from 1.4 (less hub preference)
      stationSpawnIntervalMs: 30000,   // Reduced from 45000 (33% faster growth)
      initialTrains: 5,                // Reduced from 6 (17% fewer aircraft)
      trainSpeed: 0.064                // Reduced from 0.080 (20% slower)
    },
    HARD: {
      spawnIntervalMultiplier: 0.30,   // Increased from 0.45 (50% more passengers)
      maxWaitSeconds: 80,              // Reduced from 120 (33% less tolerance)
      mctMultiplier: 1.5,              // Increased from 1.0 (50% slower connections)
      hubSpokeBias: 0.8,               // Reduced from 1.0 (anti-hub bias)
      stationSpawnIntervalMs: 21000,   // Reduced from 32000 (34% faster growth)
      initialTrains: 3,                // Reduced from 4 (25% fewer aircraft)
      trainSpeed: 0.056                // Reduced from 0.070 (20% slower)
    }
  }
};
