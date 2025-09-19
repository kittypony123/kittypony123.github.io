// Air Traffic Routes — Flight Control themed config
// Reuses existing engine semantics; airports are "stations",
// planes are "trains", routes are "lines", permits are "tunnels".

export const AIRSPACE_CONFIG = {
  // Scale factor for world coordinates to expand gameplay area
  worldScale: 1.5,
  stationCount: 50,
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

  // Progressive expansion zones (concentric circles from origin)
  expansionZones: [
    { radius: 200, unlockDay: 1, name: 'Core Zone' },      // Inner circle - immediate area
    { radius: 350, unlockDay: 1, name: 'Metro Zone' },     // Metropolitan area - unlock immediately
    { radius: 500, unlockDay: 4, name: 'Regional Zone' },  // Regional connections
    { radius: 650, unlockDay: 8, name: 'Extended Zone' }   // Extended network
  ],

  // Airports catalog organised by distance zones for progressive gameplay expansion
  londonStations: [
    // CORE ZONE (0-200 units from origin) - Day 1+ - Essential starting airports
    { name: 'Metro City', x: -120, y: -90, shape: 'diamond', zone: 1, priority: 'high' },
    { name: 'Old Town Strip', x: -150, y: 120, shape: 'square', zone: 1, priority: 'high' },
    { name: 'Downtown Air', x: 60, y: -15, shape: 'triangle', zone: 1, priority: 'high' },
    { name: 'Capitol Field', x: 150, y: 45, shape: 'circle', zone: 1, priority: 'high' },
    { name: 'Silver Peak', x: -60, y: -180, shape: 'circle', zone: 1, priority: 'medium' },
    { name: 'Central Plaza', x: 30, y: 90, shape: 'diamond', zone: 1, priority: 'medium' },
    { name: 'Sky Bridge', x: -120, y: -60, shape: 'square', zone: 1, priority: 'medium' },

    // METRO ZONE (200-350 units) - Day 1+ - Metropolitan expansion
    { name: 'Lakeview', x: 60, y: -240, shape: 'circle', zone: 2, priority: 'high' },
    { name: 'Eastbank', x: 270, y: -180, shape: 'diamond', zone: 2, priority: 'high' },
    { name: 'Riverport', x: 240, y: 180, shape: 'square', zone: 2, priority: 'high', isFinal: true, isInterchange: true, mctMs: 9500, turnaroundMs: 700 },
    { name: 'Harbor South', x: 90, y: 285, shape: 'triangle', zone: 2, priority: 'high' },
    { name: 'Palm Coast', x: -60, y: 330, shape: 'circle', zone: 2, priority: 'medium', isFinal: true, mctMs: 11000 },
    { name: 'Greenpoint', x: -300, y: 270, shape: 'diamond', zone: 2, priority: 'medium' },
    { name: 'Bluffs Intl', x: -330, y: -150, shape: 'square', zone: 2, priority: 'medium', isInterchange: true, mctMs: 9500 },
    { name: 'Aurora', x: 120, y: -330, shape: 'diamond', zone: 2, priority: 'medium' },
    { name: 'Valley', x: -210, y: 210, shape: 'circle', zone: 2, priority: 'low' },
    { name: 'Crosswind', x: -330, y: 30, shape: 'triangle', zone: 2, priority: 'low' },
    { name: 'Ridgeview', x: -90, y: -330, shape: 'triangle', zone: 2, priority: 'low' },
    { name: 'Harbor Air', x: -330, y: 180, shape: 'square', zone: 2, priority: 'low' },

    // REGIONAL ZONE (350-500 units) - Day 6+ - Regional network
    { name: 'Bayview', x: 450, y: 60, shape: 'square', zone: 3, priority: 'high', isFinal: true, isInterchange: true, mctMs: 9000, turnaroundMs: 700 },
    { name: 'Northfield Intl', x: -420, y: -270, shape: 'circle', zone: 3, priority: 'high', isFinal: true, isInterchange: true, mctMs: 10000, turnaroundMs: 700 },
    { name: 'Seaside', x: 330, y: 330, shape: 'circle', zone: 3, priority: 'high', isFinal: true, isInterchange: true, mctMs: 11000 },
    { name: 'Highland', x: 390, y: -60, shape: 'triangle', zone: 3, priority: 'medium' },
    { name: 'Cedar Ridge', x: 450, y: -270, shape: 'square', zone: 3, priority: 'medium' },
    { name: 'Sunset Strip', x: -450, y: 120, shape: 'diamond', zone: 3, priority: 'medium' },
    { name: 'Sky Harbor', x: 300, y: -330, shape: 'triangle', zone: 3, priority: 'medium', isFinal: true, isInterchange: true, mctMs: 10000 },
    { name: 'Westport', x: -480, y: -60, shape: 'triangle', zone: 3, priority: 'low' },
    { name: 'Pine Valley', x: -450, y: -390, shape: 'square', zone: 3, priority: 'low' },
    { name: 'Mountain View', x: 180, y: -420, shape: 'circle', zone: 3, priority: 'low' },
    { name: 'Cascade', x: 480, y: -360, shape: 'diamond', zone: 3, priority: 'low' },
    { name: 'Falcon Crest', x: -390, y: 390, shape: 'square', zone: 3, priority: 'low' },
    { name: 'Moonlight', x: 480, y: 150, shape: 'triangle', zone: 3, priority: 'low' },
    { name: 'Phoenix Field', x: -90, y: 390, shape: 'circle', zone: 3, priority: 'low' },
    { name: 'Crystal Lake', x: 360, y: 420, shape: 'circle', zone: 3, priority: 'low' },
    { name: 'Storm Ridge', x: -180, y: -450, shape: 'triangle', zone: 3, priority: 'low' },

    // EXTENDED ZONE (500+ units) - Day 10+ - Long-range destinations
    { name: 'Golden Gate', x: -570, y: 240, shape: 'triangle', zone: 4, priority: 'high', isFinal: true, isInterchange: true, mctMs: 9500 },
    { name: 'Arctic Air', x: -360, y: -480, shape: 'diamond', zone: 4, priority: 'high', isFinal: true, isInterchange: true, mctMs: 11500 },
    { name: 'Starport', x: -150, y: 450, shape: 'circle', zone: 4, priority: 'high', isFinal: true, isInterchange: true, mctMs: 10500 },
    { name: 'East Gate', x: 660, y: 120, shape: 'circle', zone: 4, priority: 'medium' },
    { name: 'Thunder Bay', x: 600, y: -180, shape: 'square', zone: 4, priority: 'medium' },
    { name: 'Eagle Point', x: 570, y: 270, shape: 'diamond', zone: 4, priority: 'medium' },
    { name: 'Gull Point', x: 540, y: -90, shape: 'diamond', zone: 4, priority: 'medium' },
    { name: 'Vista Heights', x: -600, y: -150, shape: 'triangle', zone: 4, priority: 'low' },
    { name: 'Twin Peaks', x: -540, y: -330, shape: 'diamond', zone: 4, priority: 'low' },
    { name: 'Coastal View', x: -720, y: 30, shape: 'circle', zone: 4, priority: 'low' },
    { name: 'North Ridge', x: 0, y: -480, shape: 'diamond', zone: 4, priority: 'low' },
    { name: 'South Bay', x: 150, y: 480, shape: 'square', zone: 4, priority: 'low' },
    { name: 'West Point', x: -660, y: -60, shape: 'triangle', zone: 4, priority: 'low' },
    { name: 'Desert Wind', x: 420, y: -480, shape: 'square', zone: 4, priority: 'low' },
    { name: 'Ocean Breeze', x: -480, y: 450, shape: 'triangle', zone: 4, priority: 'low' },
    { name: 'Cloud Nine', x: 330, y: -90, shape: 'triangle', zone: 4, priority: 'low' }
  ],

  // Restricted airspace corridor (keeps original keys for engine compatibility)
  thamesPath: 'M -840 -60 Q -400 -100 0 -80 Q 400 -30 840 0',
  thamesPolygon: [
    // Top boundary following the curve more accurately (with buffer for stroke width)
    { x: -840, y: -120 }, // Start higher to account for stroke width
    { x: -400, y: -130 }, // Curve peak with buffer
    { x: 0, y: -110 },    // Center curve with buffer
    { x: 400, y: -60 },   // Curve towards end with buffer
    { x: 840, y: -30 },   // End point with buffer
    // Bottom boundary with reasonable corridor width
    { x: 840, y: 30 },    // End bottom
    { x: 400, y: 0 },     // Curve towards center bottom
    { x: 0, y: -50 },     // Center bottom
    { x: -400, y: -70 },  // Curve towards start bottom
    { x: -840, y: -30 }   // Start bottom
  ],

  // Strategic route color palette - WCAG AA compliant (4.5:1+ contrast) on dark backgrounds
  // Colors automatically assigned based on route strategic importance:
  lineColors: [
    '#FFB347', // 0: Orange - EXPRESS routes to final destinations (highest priority, +40% speed)
    '#4A90E2', // 1: Blue - HUB-to-HUB connections (fast transfer routes, +20% speed)
    '#4CAF50'  // 2: Green - REGIONAL hub feeders (standard speed, good connectivity)
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
