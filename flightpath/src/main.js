import { createCamera, updateCamera, worldToScreen, screenToWorld } from './core/camera.js';
import { setDPRTransform, clearScreen } from './render/draw.js';
import { drawRestrictedAirspace } from './render/airspace.js';
import { drawStations as drawStationsFinal } from './render/stations_final.js';
import { drawPreview } from './render/preview.js';
import { buildOverlapMap, drawMultiStationLine } from './render/lines_final.js';
import { AIRSPACE_CONFIG } from './maps/airspace.js';
import { spawnPassenger, updatePassengersAndCheckOvercrowding, canTrainReachDestination } from './systems/passengers.js';
import * as Trains from './systems/trains.js';
import * as Lines from './systems/lines_final.js';
import { AchievementSystem } from './systems/achievements.js';
import { EventSystem, setWeatherReference } from './systems/events.js';
import { AutoRoutingSystem } from './systems/auto_routing.js';
import { validateNetworkHarmony } from './systems/hexgrid.js';
import { initHUD } from './ui/hud.js';
import { attachInput } from './ui/input_final.js';
import { createStationSpawnAnimation } from './utils/animations.js';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// Mobile performance optimizations
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
}

// Mobile-specific canvas optimization
if (isMobileDevice()) {
  // Disable hardware acceleration on older mobile devices to prevent crashes
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium'; // Balance between quality and performance

  // Store original DPR for performance-conscious rendering
  window.originalDevicePixelRatio = window.devicePixelRatio || 1;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Calculate performance-optimized DPR for canvas rendering
  window.getOptimizedDPR = function() {
    const maxDPR = isIOS ? 2 : 2.5;
    return Math.min(window.originalDevicePixelRatio, maxDPR);
  };
}

// Expand gameplay area by scaling world coordinates.
// The factor comes from config.worldScale (default 1.5).
function scalePathString(d, factor){
  if (!d || factor === 1) return d;
  // Scale all numeric tokens in an SVG path string
  return String(d).replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, (m) => {
    const v = parseFloat(m);
    if (!isFinite(v)) return m;
    const scaled = v * factor;
    // limit precision to avoid excessively long strings
    return (Math.round(scaled * 1000) / 1000).toString();
  });
}

function makeScaledConfig(cfgIn){
  const cfg = { ...(cfgIn||{}) };
  const S = cfg.worldScale && cfg.worldScale > 0 ? cfg.worldScale : 1.5;
  cfg.worldScale = S;

  // Scale map features that are in world units
  if (Array.isArray(cfg.londonStations)){
    cfg.londonStations = cfg.londonStations.map(s => ({
      ...s,
      x: (s.x||0) * S,
      y: (s.y||0) * S
    }));
  }
  if (cfg.thamesPath){
    cfg.thamesPath = scalePathString(cfg.thamesPath, S);
  }
  if (Array.isArray(cfg.thamesPolygon)){
    cfg.thamesPolygon = cfg.thamesPolygon.map(p => ({ x: (p.x||0)*S, y: (p.y||0)*S }));
  }

  // Preserve visual weights (pixel-space) by keeping widths unscaled.
  // Preserve travel time by scaling train speed with distance.
  if (typeof cfg.trainSpeed === 'number') cfg.trainSpeed = cfg.trainSpeed * S;

  return cfg;
}

// Game state (air traffic themed)
const game = {
  config: { ...makeScaledConfig(AIRSPACE_CONFIG), lineColors: AIRSPACE_CONFIG.lineColors },
  camera: null,
  stations: [],
  lines: [],
  trains: [], // planes
  passengers: [], // pax/cargo
  scorePopups: [],
  animations: [],

  // Route performance tracking
  routeMetrics: new Map(), // lineId -> metrics
  score: 0,
  totalPassengers: 0,
  linesAvailable: AIRSPACE_CONFIG.initialLines,
  trainsAvailable: AIRSPACE_CONFIG.initialTrains,
  tunnels: 2, // permits to cross restricted corridor
  carriages: 0, // increased plane capacity
  day: 1,
  gameTime: 0,
  prevGameTime: 0,
  weekProgress: 0,
  timeScale: 1,
  paused: false,
  gameOver: false,
  selectedLineColorIndex: null,
  recolorMode: false, colorKeyHeld: false, activeLineForColor: null,
  removalMode: false, hoveredStationIdx: -1,
  needsRedraw: true,
  achievements: null, // Will be initialized after game object creation
  events: null, // Will be initialized after game object creation
  autoRouting: null, // Will be initialized after game object creation
  undoStack: [],
  canUndo: false,
  debugPassengerFlow: false, // Toggle for passenger flow debugging
  
  // Route speed multipliers based on strategic importance
  routeSpeedMultipliers: {
    EXPRESS: 1.4,    // Gold routes to finals - fastest (long-haul speed)
    HUB: 1.2,        // Teal hub-to-hub - fast (medium-haul)
    REGIONAL: 1.0,    // Blue regional routes - standard
    RELIEF: 0.9      // Red overflow routes - slower (short-haul)
  },
  calculateLineLength(line){ return Lines.calculateLineLength(this, line); },
  createTrain(lineId){ return Trains.createTrain(this, lineId); },
  getTrainWorldPosition(tr){ return Trains.getTrainWorldPosition(this, tr); },
  optimizeTrainAllocation(){ return Trains.optimizeTrainAllocation(this); },
  
  // Get route type for speed calculation
  getRouteType(line) {
    if (!line || !line.stations || line.stations.length < 2) return 'REGIONAL';
    
    // Check if route connects to final destinations
    const connectsToFinal = line.stations.some(stationIdx => {
      const station = this.stations[stationIdx];
      return station && station.isFinal;
    });
    if (connectsToFinal) return 'EXPRESS';
    
    // Check if route connects hubs
    const hubStations = line.stations.filter(stationIdx => {
      const station = this.stations[stationIdx];
      return station && station.isInterchange;
    });
    
    if (hubStations.length >= 2) return 'HUB';        // Hub-to-hub
    if (hubStations.length >= 1) return 'REGIONAL';   // Hub feeder
    
    return 'RELIEF'; // Regional connection
  },
  
  // Apply route-specific speed to train
  applyRouteSpeed(train, line) {
    if (!train || !line) return;

    const routeType = this.getRouteType(line);
    const baseSpeed = this.config.trainSpeed;
    const multiplier = this.routeSpeedMultipliers[routeType] || 1.0;

    train.baseSpeed = baseSpeed;
    train.routeSpeedMultiplier = multiplier;
    train.speed = baseSpeed * multiplier;
    train.routeType = routeType;
  },

  // Track route performance metrics
  updateRouteMetrics(lineId, passengerDelivered = false, waitTime = 0) {
    if (!this.routeMetrics.has(lineId)) {
      this.routeMetrics.set(lineId, {
        passengersDelivered: 0,
        totalWaitTime: 0,
        avgWaitTime: 0,
        efficiency: 1.0,
        lastUpdated: this.gameTime,
        utilization: 0,
        bottleneckScore: 0
      });
    }

    const metrics = this.routeMetrics.get(lineId);

    if (passengerDelivered) {
      metrics.passengersDelivered++;
      metrics.totalWaitTime += waitTime;
      metrics.avgWaitTime = metrics.totalWaitTime / metrics.passengersDelivered;

      // Calculate efficiency: lower wait time = higher efficiency
      const targetWaitTime = 30000; // 30 seconds ideal
      metrics.efficiency = Math.max(0.1, Math.min(2.0, targetWaitTime / Math.max(metrics.avgWaitTime, targetWaitTime * 0.5)));
    }

    metrics.lastUpdated = this.gameTime;
  },

  // Get route performance rating
  getRoutePerformance(lineId) {
    const metrics = this.routeMetrics.get(lineId);
    if (!metrics || metrics.passengersDelivered < 3) return 'NEW';

    if (metrics.efficiency >= 1.5) return 'EXCELLENT';
    if (metrics.efficiency >= 1.2) return 'GOOD';
    if (metrics.efficiency >= 0.8) return 'AVERAGE';
    if (metrics.efficiency >= 0.5) return 'POOR';
    return 'FAILING';
  },
  endGame(reason){
    this.gameOver=true;
    const dialog = document.getElementById('gameOver');
    document.getElementById('goReason').textContent=reason;
    document.getElementById('finalStats').textContent = `Final Score: ${this.score} • Day ${this.day} • ${this.lines.length} routes`;
    dialog.style.display='flex';
    setTimeout(() => dialog.classList.add('show'), 10);
    hud.updateHUD();

    // Achievement tracking
    if (this.achievements) {
      this.achievements.onGameOver();
    }
  },

  showToast(message){
    const toast = document.getElementById('atcToast');
    if (toast){
      toast.textContent = message;
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        try {
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(-50%) translateY(-8px)';
        } catch(e) {}
      }, 2000);
    }
  },

  saveGameState(){
    // Save a snapshot for undo (limit to prevent memory issues)
    if (this.undoStack.length >= 5) {
      this.undoStack.shift();
    }

    // Create a simple snapshot of key game state
    const snapshot = {
      lines: JSON.parse(JSON.stringify(this.lines)),
      trains: JSON.parse(JSON.stringify(this.trains)),
      linesAvailable: this.linesAvailable,
      trainsAvailable: this.trainsAvailable,
      tunnels: this.tunnels,
      score: this.score
    };

    this.undoStack.push(snapshot);
    this.canUndo = this.undoStack.length > 0;
    this.updateUndoButton();
  },

  undo(){
    if (this.undoStack.length === 0) return false;

    const snapshot = this.undoStack.pop();

    // Restore game state
    this.lines = snapshot.lines;
    this.trains = snapshot.trains;
    this.linesAvailable = snapshot.linesAvailable;
    this.trainsAvailable = snapshot.trainsAvailable;
    this.tunnels = snapshot.tunnels;
    this.score = snapshot.score;

    // Rebuild station connections
    this.stations.forEach(station => station.connections = []);
    this.lines.forEach(line => {
      line.stations.forEach(stationIdx => {
        if (this.stations[stationIdx]) {
          this.stations[stationIdx].connections.push(line.id);
        }
      });
    });

    this.canUndo = this.undoStack.length > 0;
    this.updateUndoButton();
    this.updateHUD();
    this.showToast('Action undone');
    return true;
  },

  updateUndoButton(){
    const undoBtn = document.getElementById('btnUndo');
    if (undoBtn) {
      undoBtn.style.opacity = this.canUndo ? '1' : '0.4';
      undoBtn.style.cursor = this.canUndo ? 'pointer' : 'not-allowed';
    }
  }
};

// Weather cells (dynamic obstacles that slow planes)
const weather = {
  cells: [],
  enabled: true
};

function initWeatherCells(){
  const count = 3;
  const S = game.config.worldScale || 1;
  for (let i=0;i<count;i++){
    weather.cells.push({
      x: (Math.random()*2-1) * 320 * S,
      y: (Math.random()*2-1) * 220 * S,
      r: (50 + Math.random()*30) * S,
      vx: (-0.03 + Math.random()*0.06),
      vy: (-0.03 + Math.random()*0.06),
      strength: 0.6
    });
  }
}

function updateWeather(dt){
  if (!weather.enabled) return;
  const speed = dt * 0.05;
  weather.cells.forEach(c => {
    c.x += c.vx * speed * 20;
    c.y += c.vy * speed * 20;
    // Wrap around a generous bounds box
    const B = 520 * (game.config.worldScale || 1);
    if (c.x < -B) c.x = B; else if (c.x > B) c.x = -B;
    if (c.y < -B) c.y = B; else if (c.y > B) c.y = -B;
  });
}

function drawWeatherCells(){
  if ((game.day||1) <= 3) return; // suppress weather visuals early to reduce cognitive load
  if (!weather.enabled || weather.cells.length===0) return;
  ctx.save();
  ctx.translate(game.camera.x, game.camera.y);
  ctx.scale(game.camera.scale, game.camera.scale);
  weather.cells.forEach(c => {
    const grd = ctx.createRadialGradient(c.x, c.y, Math.max(0, c.r*0.2), c.x, c.y, c.r);
    grd.addColorStop(0, 'rgba(59,130,246,0.18)');
    grd.addColorStop(1, 'rgba(59,130,246,0.03)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(147,197,253,0.35)';
    ctx.lineWidth = 2 / game.camera.scale;
    ctx.stroke();
  });
  ctx.restore();
}

function isInWeather(x, y){
  if (!weather.enabled) return false;
  for (const c of weather.cells){
    const d = Math.hypot(x - c.x, y - c.y);
    if (d <= c.r) return c;
  }
  return null;
}

function setupAirports(){
  // Organise airports by zones for progressive expansion
  const allAirports = [...game.config.londonStations];
  const zoneGroups = {
    1: [], // Core zone
    2: [], // Metro zone
    3: [], // Regional zone
    4: []  // Extended zone
  };

  // Group airports by zone
  allAirports.forEach(airport => {
    const zone = airport.zone || 1;
    if (zoneGroups[zone]) {
      zoneGroups[zone].push(airport);
    }
  });

  // Randomise order within each zone for varied gameplay
  Object.values(zoneGroups).forEach(group => {
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
  });

  // Start with 4 random airports from Core Zone only (leave more for spawning)
  const coreAirports = [...zoneGroups[1]];
  const startCount = Math.min(4, coreAirports.length);

  for (let i = 0; i < startCount; i++) {
    const airport = coreAirports[i];
    const station = {
      id: i,
      x: airport.x,
      y: airport.y,
      r: game.config.stationRadius,
      shape: airport.shape,
      name: airport.name,
      zone: airport.zone,
      priority: airport.priority,
      isFinal: !!airport.isFinal,
      isInterchange: !!airport.isInterchange,
      mctMs: airport.mctMs ?? (game.config.defaultMCT || 12000),
      turnaroundMs: airport.turnaroundMs ?? (game.config.defaultTurnaroundMs || 600),
      queue: [],
      connections: [],
      overflowTimer: 0,
      isOvercrowded: false,
      maxQueue: 6,
      opacity: 1,
      glowIntensity: 0
    };
    game.stations.push(station);
  }

  game.nextStationIndex = startCount;

  // Create progressive spawn pools
  game.expansionPools = {
    1: coreAirports.slice(startCount), // Remaining core airports
    2: zoneGroups[2],                  // Metro zone
    3: zoneGroups[3],                  // Regional zone
    4: zoneGroups[4]                   // Extended zone
  };

  // Set initial available catalog to remaining core airports + metro zone (both unlock Day 1)
  game.availableCatalog = [...game.expansionPools[1], ...game.expansionPools[2]];
  // Clear metro pool since we've added it to catalog
  game.expansionPools[2] = [];

  console.log(`Started with ${startCount} core airports. Available catalog: ${game.availableCatalog.length} airports. Zone pools:`,
    Object.entries(game.expansionPools).map(([z, p]) => `Zone ${z}: ${p.length}`).join(', '));
  console.log('Available airports:', game.availableCatalog.map(a => a.name).join(', '));
}

function addNewAirport(){
  console.log(`Attempting to add new airport. Available catalog: ${game.availableCatalog ? game.availableCatalog.length : 'undefined'}`);

  // Check for zone expansion first
  checkZoneExpansion();

  if (!game.availableCatalog || game.availableCatalog.length === 0) {
    console.log('No airports available for spawning');
    return;
  }

  // Select next airport with priority weighting for better gameplay flow
  let selectedAirport;
  const highPriority = game.availableCatalog.filter(a => a.priority === 'high');
  const mediumPriority = game.availableCatalog.filter(a => a.priority === 'medium');
  const lowPriority = game.availableCatalog.filter(a => a.priority === 'low');

  // Weighted selection: 60% chance high, 30% medium, 10% low
  const rand = Math.random();
  if (rand < 0.6 && highPriority.length > 0) {
    const idx = Math.floor(Math.random() * highPriority.length);
    selectedAirport = highPriority[idx];
  } else if (rand < 0.9 && mediumPriority.length > 0) {
    const idx = Math.floor(Math.random() * mediumPriority.length);
    selectedAirport = mediumPriority[idx];
  } else if (lowPriority.length > 0) {
    const idx = Math.floor(Math.random() * lowPriority.length);
    selectedAirport = lowPriority[idx];
  } else {
    // Fallback to any available airport
    const idx = Math.floor(Math.random() * game.availableCatalog.length);
    selectedAirport = game.availableCatalog[idx];
  }

  if (!selectedAirport) return;

  // Remove from catalog
  const catalogIndex = game.availableCatalog.indexOf(selectedAirport);
  if (catalogIndex > -1) {
    game.availableCatalog.splice(catalogIndex, 1);
  }

  const minDist = game.config.stationRadius * 2.5;
  let attempts = 0;
  let x, y;
  const jitter = 60 * (game.config.worldScale || 1);
  do {
    x = selectedAirport.x + (Math.random() - 0.5) * jitter;
    y = selectedAirport.y + (Math.random() - 0.5) * jitter;
    attempts++;
  } while (attempts < 20 && game.stations.some(t => Math.hypot(t.x - x, t.y - y) < minDist));

  const station = {
    id: game.stations.length,
    x, y,
    r: 0,
    shape: selectedAirport.shape,
    name: selectedAirport.name,
    zone: selectedAirport.zone,
    priority: selectedAirport.priority,
    isFinal: !!selectedAirport.isFinal,
    isInterchange: !!selectedAirport.isInterchange,
    mctMs: selectedAirport.mctMs ?? (game.config.defaultMCT || 12000),
    turnaroundMs: selectedAirport.turnaroundMs ?? (game.config.defaultTurnaroundMs || 600),
    queue: [],
    connections: [],
    overflowTimer: 0,
    isOvercrowded: false,
    maxQueue: 6,
    opacity: 0,
    glowIntensity: 0
  };

  game.stations.push(station);
  const animation = createStationSpawnAnimation(station, 600, game.config.stationRadius);
  game.animations.push(animation);
  game.needsRedraw = true;

  // Show zone expansion notification
  const currentZone = game.config.expansionZones?.find(z => z.unlockDay <= game.day);
  const zoneName = currentZone ? currentZone.name : `Zone ${selectedAirport.zone}`;
  game.showToast && game.showToast(`New airport: ${selectedAirport.name} (${zoneName})`);

  console.log(`Spawned ${selectedAirport.name} from Zone ${selectedAirport.zone} (${selectedAirport.priority} priority)`);

  // Only adjust camera if we're really far out of bounds to prevent jittering
  // adjustCameraToFitAllAirports(); // Disabled to prevent jittering
}

// Check if new zones should be unlocked based on game day
function checkZoneExpansion(){
  if (!game.config.expansionZones || !game.expansionPools) return;

  const currentDay = game.day || 1;

  for (const zoneConfig of game.config.expansionZones) {
    if (currentDay >= zoneConfig.unlockDay) {
      const zoneNumber = game.config.expansionZones.indexOf(zoneConfig) + 1;
      const zonePool = game.expansionPools[zoneNumber];

      if (zonePool && zonePool.length > 0) {
        // Add all airports from this zone to available catalog
        const poolSize = zonePool.length;
        game.availableCatalog.push(...zonePool);
        // Clear the pool so we don't add it again
        game.expansionPools[zoneNumber] = [];

        game.showToast && game.showToast(`${zoneConfig.name} unlocked! Day ${currentDay}`);
        console.log(`Zone expansion: ${zoneConfig.name} unlocked on Day ${currentDay} (${poolSize} new airports)`);
      }
    }
  }
}

// Automatic camera adjustment to keep all airports visible
function adjustCameraToFitAllAirports() {
  if (game.stations.length === 0) return;

  // Calculate bounds of all airports
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  game.stations.forEach(station => {
    if (!station) return;
    const margin = game.config.stationRadius * 2; // Add margin around stations
    minX = Math.min(minX, station.x - margin);
    maxX = Math.max(maxX, station.x + margin);
    minY = Math.min(minY, station.y - margin);
    maxY = Math.max(maxY, station.y + margin);
  });

  // Get canvas dimensions
  const canvas = document.getElementById('c');
  if (!canvas) return;

  const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
  const canvasHeight = canvas.height / (window.devicePixelRatio || 1);

  // Calculate available play area accounting for UI elements
  const topUIHeight = 80;    // Top HUD elements (help, settings, time, etc)
  const bottomUIHeight = 90; // Bottom panel (routes, inventory, etc)
  const leftUIWidth = 60;    // Left side margin
  const rightUIWidth = 60;   // Right side margin

  const availableWidth = canvasWidth - leftUIWidth - rightUIWidth;
  const availableHeight = canvasHeight - topUIHeight - bottomUIHeight;
  const centerX = leftUIWidth + availableWidth / 2;
  const centerY = topUIHeight + availableHeight / 2;

  // Calculate required dimensions to fit all airports
  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;

  // Use 90% of available space for some padding
  const paddingFactor = 0.9;
  const requiredScaleX = (availableWidth * paddingFactor) / worldWidth;
  const requiredScaleY = (availableHeight * paddingFactor) / worldHeight;

  // Use the smaller scale to ensure everything fits
  const requiredScale = Math.min(requiredScaleX, requiredScaleY);

  // Only zoom out if necessary (don't zoom in automatically)
  if (requiredScale < game.camera.targetScale) {
    game.camera.targetScale = Math.max(requiredScale, game.camera.minScale);

    // Center the camera on the middle of all airports within the available play area
    const worldCenterX = (minX + maxX) / 2;
    const worldCenterY = (minY + maxY) / 2;

    game.camera.targetX = centerX - worldCenterX * game.camera.targetScale;
    game.camera.targetY = centerY - worldCenterY * game.camera.targetScale;

    game.needsRedraw = true;
  }
}

// Periodic camera adjustment to handle viewport changes (FIXED JITTER)
function periodicCameraAdjustment() {
  // DISABLED: Completely remove automatic camera adjustment to stop jittering
  // Users can manually zoom/pan as needed
  return;
}

// Track manual zoom actions to prevent interfering with user control
function trackManualZoom() {
  periodicCameraAdjustment._lastManualZoom = performance.now();
}

// Make trackManualZoom globally available
window.trackManualZoom = trackManualZoom;

// ENHANCED Weekly rewards - strategic focus on final destination network
function showWeeklyRewards(){
  game.paused=true;
  const container=document.getElementById('rewardOptions');
  const dialog=document.getElementById('rewardDialog');
  container.innerHTML='';

  const choices=[
    { type:'line', icon:'🧭', title:'New Route', description:'Open an additional air corridor' },
    { type:'carriage', icon:'🧳', title:'Bigger Cabin', description:'+2 capacity to most loaded plane' },
    { type:'tunnel', icon:'🛂', title:'Permit', description:'Cross restricted airspace' },
    { type:'speed', icon:'⚡', title:'Speed Boost', description:'Increase plane speeds by 20%' },
    { type:'hub_upgrade', icon:'🏢', title:'Hub Upgrade', description:'Convert an airport to interchange status' },
    { type:'final_express', icon:'✈️', title:'Express Service', description:'Direct routes to finals get +50% speed' }
  ];

  // PERFORMANCE-BASED REWARD SELECTION
  let selected = [...choices];

  // Calculate network performance
  const routePerformances = game.lines.map(line => game.getRoutePerformance(line.id));
  const excellentRoutes = routePerformances.filter(p => p === 'EXCELLENT').length;
  const poorRoutes = routePerformances.filter(p => p === 'POOR' || p === 'FAILING').length;
  const avgWaitTime = game.stations.reduce((sum, s) => sum + (s.queue?.reduce((wait, p) => wait + (game.gameTime - p.spawnTime), 0) || 0), 0) / Math.max(game.totalPassengers, 1);

  // Performance-based rewards
  if (poorRoutes > excellentRoutes) {
    // Struggling network: offer capacity/speed improvements
    selected = selected.filter(c => c.type === 'carriage' || c.type === 'speed' || c.type === 'hub_upgrade');
  } else if (excellentRoutes >= 2) {
    // High-performing network: offer expansion rewards
    selected = selected.filter(c => c.type === 'line' || c.type === 'final_express' || c.type === 'tunnel');
  }

  // Always offer route expansion early game
  if (game.lines.length < 3) {
    selected = selected.filter(c => c.type === 'line' || c.type === 'speed' || c.type === 'carriage');
  }

  // Offer hub upgrades when network grows
  if (game.stations.length >= 8) {
    const nonHubs = game.stations.filter(s => s && !s.isInterchange && !s.isFinal);
    if (nonHubs.length > 0 && excellentRoutes >= 1) {
      selected.push(choices.find(c => c.type === 'hub_upgrade'));
    }
  }

  // Ensure we always have at least one option
  if (selected.length === 0) {
    selected = [choices.find(c => c.type === 'line') || choices[0]];
  }

  selected = selected.sort(()=>Math.random()-0.5).slice(0,3);
  selected.forEach((reward, index) => {
    const el = document.createElement('div');
    el.className = 'reward-option';
    el.style.animationDelay = `${index * 100}ms`;
    el.innerHTML = `<span class="icon">${reward.icon}</span><h3>${reward.title}</h3><div class="desc">${reward.description}</div>`;
    el.addEventListener('click', () => applyReward(reward.type));
    container.appendChild(el);
  });

  dialog.style.display = 'flex';
  setTimeout(() => dialog.classList.add('show'), 10);
}

function applyReward(type){
  const dialog = document.getElementById('rewardDialog');

  if (type==='line') game.linesAvailable++;
  else if (type==='carriage'){
    game.carriages++;
    // Smart allocation: prioritize most loaded routes
    const trainsByLoad = game.trains
      .filter(tr => tr && tr.passengers)
      .sort((a, b) => (b.passengers.length / b.capacity) - (a.passengers.length / a.capacity));

    if (trainsByLoad.length > 0) {
      const targetTrain = trainsByLoad[0]; // Most loaded train
      targetTrain.capacity += 2;

      // Show feedback to player
      const pos = game.getTrainWorldPosition(targetTrain);
      if (pos) {
        Trains.createScorePopup(game, pos.x, pos.y, '+2 CAPACITY', '#4ade80');
      }

      console.log(`Upgraded train on line ${targetTrain.lineId}: +2 capacity (now ${targetTrain.capacity})`);
    } else if (game.trains.length > 0) {
      // Fallback to random if no loaded trains
      const tr = game.trains[Math.floor(Math.random()*game.trains.length)];
      if (tr) tr.capacity += 2;
    }
  }
  else if (type==='tunnel') game.tunnels++;
  else if (type==='speed'){
    game.trains.forEach(tr => tr.speed *= 1.2);
  }
  else if (type==='hub_upgrade'){
    // Convert a regular airport to interchange status
    const eligible = game.stations.filter(s => s && !s.isInterchange && !s.isFinal);
    if (eligible.length > 0) {
      const target = eligible[Math.floor(Math.random() * eligible.length)];
      target.isInterchange = true;
      target.mctMs = Math.round((target.mctMs || 12000) * 0.8); // Better transfer times
      Trains.createScorePopup(game, target.x, target.y, 'HUB UPGRADE!', '#0ea5a3');
    }
  }
  else if (type==='final_express'){
    // Mark all lines that connect to final destinations for speed boost
    game.finalExpressActive = true;
    for (const line of game.lines) {
      if (line.stations.some(si => game.stations[si] && game.stations[si].isFinal)) {
        for (const trainId of line.trains) {
          const train = game.trains.find(t => t.id === trainId);
          if (train) train.speed *= 1.5;
        }
      }
    }
  }

  dialog.classList.remove('show');
  setTimeout(() => {
    game.paused = false;
    dialog.style.display = 'none';
  }, 300);

  hud.updateHUD();
}

// HUD
const hud = initHUD(game);

// Camera
game.camera = createCamera(0,0,1);
game.camera.minScale=game.config.minScale;
game.camera.maxScale=game.config.maxScale;

function resize(){
  setDPRTransform(ctx, canvas);
  const r = canvas.getBoundingClientRect();
  if (!resize._done){
    game.camera.x=game.camera.targetX=r.width/2;
    game.camera.y=game.camera.targetY=r.height/2;
    resize._done=true;
  }
}
window.addEventListener('resize', resize);

// Input (preview + edit)
let preview=null; attachInput(canvas, game, p=> preview=p);
document.addEventListener('keydown', (e)=>{ if (e.key==='c' || e.key==='C') game.colorKeyHeld = true; });
document.addEventListener('keyup', (e)=>{ if (e.key==='c' || e.key==='C') game.colorKeyHeld = false; });

// Extra controls: toggle weather with 'W'
document.addEventListener('keydown', (e)=>{
  if (e.key==='w' || e.key==='W'){
    weather.enabled = !weather.enabled;
    game.needsRedraw = true;
    // Enhanced feedback for weather toggle
    const status = weather.enabled ? 'ACTIVE' : 'DISABLED';
    const color = weather.enabled ? '#3b82f6' : '#64748b';
    game.showToast && game.showToast(`Weather systems ${status}`);

    // Update weather pulse immediately
    const weatherPulse = document.getElementById('weatherPulse');
    if (weatherPulse) {
      weatherPulse.style.opacity = weather.enabled ? '1' : '0';
    }
  }
});

// Removal API used by input
game.removeLine = function(lineId){
  const idx=this.lines.findIndex(l=>l && l.id===lineId);
  if (idx===-1) return false;

  // Save state for undo
  if (this.saveGameState) this.saveGameState();
  const line=this.lines[idx];
  const trainIds=[...line.trains];
  trainIds.forEach(tid=>{
    const ti=this.trains.findIndex(t=>t && t.id===tid);
    if (ti!==-1){
      const tr=this.trains[ti];
      if (tr.passengers.length>0){
        tr.passengers.forEach(p=>{ const s=this.stations[Math.floor(Math.random()*this.stations.length)]; if (s) s.queue.push(p); });
      }
      this.trains.splice(ti,1);
    }
  });
  line.stations.forEach(si=>{ const st=this.stations[si]; if (st){ const c=st.connections.indexOf(lineId); if (c!==-1) st.connections.splice(c,1); } });
  this.lines.splice(idx,1);
  this.linesAvailable++;
  this.trainsAvailable += trainIds.length;
  hud.updateHUD();

  // Trigger train reallocation when line is removed
  if (this.optimizeTrainAllocation) {
    this.optimizeTrainAllocation();
  }

  return true;
};

// Game loop with mobile performance optimization
let last = performance.now();
const isMobile = isMobileDevice();
let frameSkipCounter = 0;

function loop(ts){
  try {
    const rawDt = Math.min(50, ts - last); last = ts; const dt = rawDt * (game.timeScale||1);
    let hasUpdates = false;

    // Mobile performance: skip visual updates on alternate frames when under load
    const shouldSkipFrame = isMobile && (frameSkipCounter++ % 2 === 0) &&
                           (game.stations.length > 20 || game.trains.length > 15);
    if (shouldSkipFrame && !game.needsRedraw) {
      requestAnimationFrame(loop);
      return;
    }

    if (!game.paused && !game.gameOver){
      game.prevGameTime = game.gameTime; game.gameTime += dt; game.weekProgress = (game.gameTime % game.config.weekLength) / game.config.weekLength;
      const prevWeek = Math.floor((game.prevGameTime||0) / game.config.weekLength); const nowWeek = Math.floor(game.gameTime / game.config.weekLength);

      if (nowWeek > prevWeek){
        game.day++;
        game.trainsAvailable++;
        showWeeklyRewards();
        hasUpdates = true;
      }

      // spawn demand with LIVE difficulty scaling + congestion-aware throttling
      if (!loop._nextSpawn || game.gameTime >= loop._nextSpawn){
        spawnPassenger(game);
        const base = game.config.spawnInterval;
        // Even gentler scaling: 0.04/day, floor at 55%
        const diff = Math.max(0.55, 1 - (game.day-1)*0.04);
        const jitter = (Math.random()*700 - 350); // Smaller jitter range
        // Congestion-aware: slow spawning more aggressively when many are waiting
        const waitingTotal = game.stations.reduce((s, st) => s + ((st && st.queue) ? st.queue.length : 0), 0);
        const congestion = Math.min(1, waitingTotal / 36); // ramp sooner
        const congestionFactor = 1 + 2.2 * congestion; // up to ~3.2x interval under heavy load
        // Use LIVE config values, not cached
        const intervalMult = game.config.spawnIntervalMultiplier || 1;
        loop._nextSpawn = game.gameTime + Math.max(1200, (base*diff + jitter) * congestionFactor * intervalMult);
        hasUpdates = true;
      }

      // timed airport spawns
      checkAirportSpawning();

      // Weather motion
      updateWeather(dt);

      // planes (apply temporary slowdowns inside weather cells while preserving route speeds)
      // Smooth slowdown: 1.0 at edge -> dynamic min at center of cell
      const modified=[];
      for (const tr of game.trains){
        const pos = game.getTrainWorldPosition(tr);
        if (!pos) continue;
        const cell = isInWeather(pos.x, pos.y);
        if (cell){
          // Capture route speed if not already stored
          if (tr._routeBaseSpeed == null) {
            tr._routeBaseSpeed = tr.speed;
          }
          const dx = pos.x - cell.x, dy = pos.y - cell.y;
          const dist = Math.hypot(dx, dy);
          const t = Math.max(0, 1 - dist / cell.r); // 0 at edge, 1 at center
          const minFactor = (game.day <= 2) ? 0.9 : (game.day === 3 ? 0.8 : 0.5); // gentler early-game
          const slowFactor = 1 - t * (1 - minFactor);
          tr.speed = tr._routeBaseSpeed * slowFactor;
          modified.push(tr);
        }
      }
      Trains.updateTrains(game, dt);
      // restore speeds to route-specific values
      for (const tr of modified){ if (tr._routeBaseSpeed!=null){ tr.speed = tr._routeBaseSpeed; } }
      Trains.updateScorePopups(game, dt);

      // Optimize train allocation every 2 seconds
      if (!loop._lastOptimization || game.gameTime - loop._lastOptimization >= 2000) {
        game.optimizeTrainAllocation();
        loop._lastOptimization = game.gameTime;
      }

      // Update events system (defer in early days)
      if (game.events) {
        if ((game.day||1) >= 4) game.events.update(game.gameTime);
      }

      // Update auto-routing system
      if (game.autoRouting) {
        game.autoRouting.update();
        // Keep UI in sync with actual state
        if (game.frameCount % 60 === 0) { // Update UI every 60 frames (~1 second)
          updateAutoRoutingToggle();
        }
      }

      // Update queues/overcrowding AFTER trains/allocation/autorouting had a chance to act
      updatePassengersAndCheckOvercrowding(game, dt);

      // Periodic camera adjustment to keep airports visible (reduced frequency to prevent jittering)
      if (!periodicCameraAdjustment._lastCheck || game.gameTime - periodicCameraAdjustment._lastCheck >= 15000) {
        periodicCameraAdjustment();
        periodicCameraAdjustment._lastCheck = game.gameTime;
      }

      hasUpdates = true;
    }

    // Update animations
    if (game.animations.length > 0) {
      game.animations = game.animations.filter(anim => {
        const progress = anim.update(ts);
        anim.apply(progress);
        return !anim.isComplete;
      });
      if (game.animations.length > 0) hasUpdates = true;
    }

    // Camera
    const cameraChanged = updateCamera(game.camera);
    if (cameraChanged) hasUpdates = true;

    // Render if needed
    if (game.needsRedraw || hasUpdates) {
      game.needsRedraw = false;
      clearScreen(ctx, canvas);

      // Mobile performance: reduce visual effects on mobile devices
      const showEffects = !isMobile || game.camera.scale > 0.8;

      // Draw restricted airspace corridor
      drawRestrictedAirspace(ctx, game.camera, game.config.thamesPath);

      // Weather cells below routes (conditional on mobile)
      if (showEffects) {
        drawWeatherCells();
      }

      const overlap = buildOverlapMap(game);

      // ROUTE EFFICIENCY VISUALIZATION - highlight high-value connections (mobile conditional)
      if (showEffects) {
        drawRouteEfficiencyIndicators(ctx, game);
      }

      for (const line of game.lines) drawMultiStationLine(ctx, game.camera, game, line, overlap);

      // PASSENGER FLOW VISUALIZATION - draw trails to final destinations (mobile conditional)
      if (showEffects && game.debugPassengerFlow) {
        drawPassengerFlowTrails(ctx, game);
      }

      drawStationsFinal(ctx, game.camera, game);

      // planes
      ctx.save();
      ctx.translate(game.camera.x, game.camera.y);
      ctx.scale(game.camera.scale, game.camera.scale);
      const positions = [];
      for (const tr of game.trains) {
        const pos = game.getTrainWorldPosition(tr);
        const line = game.lines[tr.lineId];
        if (!pos || (pos.x === 0 && pos.y === 0)) continue;
        positions.push({ x: pos.x, y: pos.y });
        const color = line ? line.color : '#38bdf8';
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.angle + (tr.direction < 0 ? Math.PI : 0));
        const w = 20 / game.camera.scale;  // Reduced from 30
        const h = 8 / game.camera.scale;   // Reduced from 12
        const scale = tr.scale || 1;
        const opacity = tr.opacity || 1;
        if (opacity <= 0 || scale <= 0) { ctx.restore(); continue; }
        ctx.globalAlpha = opacity;
        ctx.scale(scale, scale);
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / game.camera.scale;

        // Draw plane shape
        // Fuselage (main body)
        ctx.beginPath();
        ctx.ellipse(0, 0, w/2, h/4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Wings (explicit swept polygons so they are clearly visible)
        // Upper wing
        ctx.beginPath();
        ctx.moveTo(-w*0.05, 0);
        ctx.lineTo(-w*0.42, -h*0.95);
        ctx.lineTo(w*0.10, -h*0.20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Lower wing (mirror)
        ctx.beginPath();
        ctx.moveTo(-w*0.05, 0);
        ctx.lineTo(-w*0.42, h*0.95);
        ctx.lineTo(w*0.10, h*0.20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Tailplane (horizontal stabilizers)
        ctx.beginPath();
        ctx.moveTo(-w*0.40, 0);
        ctx.lineTo(-w*0.55, -h*0.45);
        ctx.lineTo(-w*0.25, -h*0.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w*0.40, 0);
        ctx.lineTo(-w*0.55, h*0.45);
        ctx.lineTo(-w*0.25, h*0.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Vertical tail (fin)
        ctx.beginPath();
        ctx.moveTo(-w/2, 0);
        ctx.lineTo(-w/2 + w*0.10, -h*0.50);
        ctx.lineTo(-w/2 + w*0.18, -h*0.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // preview
      drawPreview(ctx, game.camera, preview);
      hud.updateHUD();

      // Update WX count
      try { const wxEl=document.getElementById('wxCount'); if (wxEl) wxEl.textContent = weather.enabled ? weather.cells.length : 0; } catch(e){}

      // Traffic proximity alert
      let alert=false; const thresh=40 * (game.config.worldScale || 1); // world units, scaled with map size
      for (let i=0;i<positions.length;i++){
        for (let j=i+1;j<positions.length;j++){
          const a=positions[i], b=positions[j];
          if (Math.hypot(a.x-b.x,a.y-b.y) < thresh) { alert=true; break; }
        }
        if (alert) break;
      }
      const wrap = document.getElementById('canvasWrap');
      const toast = document.getElementById('atcToast');
      if (wrap && toast){
        if (alert){
          wrap.classList.add('traffic-alert');
          clearTimeout(loop._alertTimer);
          loop._alertTimer = setTimeout(()=>{ try{ wrap.classList.remove('traffic-alert'); }catch(e){} }, 900);
        }
      }
    }
  } catch (error) {
    console.error('Air game loop error:', error);
    game.needsRedraw = true;
  }
  requestAnimationFrame(loop);
}

function roundRect(ctx, x,y,w,h,r){ const rr=Math.min(r, Math.min(w,h)/2); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); }

// Init
resize(); setupAirports(); initWeatherCells();

// Initial camera adjustment to fit starting airports
setTimeout(() => {
  adjustCameraToFitAllAirports();
}, 500);
try { const mw=document.getElementById('moduleWarning'); if (mw) mw.style.display='none'; } catch(e){}

// Initialize achievement system
game.achievements = new AchievementSystem(game);

// Initialize events system
game.events = new EventSystem(game);
setWeatherReference(weather);

// Initialize auto-routing system
game.autoRouting = new AutoRoutingSystem(game);

// Fix any existing lines with out-of-bounds color indices
const total = game.config.lineColors.length;
game.lines.forEach(line => {
  if (line.colorIndex >= total) {
    line.colorIndex = line.colorIndex % total;
  }
});

requestAnimationFrame(loop);

// Initialize enhanced UI systems
initializeHelpSystem();
enhanceWeatherVisuals();
initializeSettingsPanel();

// Initialize auto-routing toggle state
setTimeout(() => {
  updateAutoRoutingToggle();
}, 100);

// Enhanced UI and help system
function initializeHelpSystem() {
  const helpOverlay = document.getElementById('helpOverlay');
  const btnHelp = document.getElementById('btnHelp');
  const closeHelp = document.getElementById('closeHelp');

  function showHelp() {
    helpOverlay.style.display = 'flex';
    game.paused = true;
  }

  function hideHelp() {
    helpOverlay.style.display = 'none';
    game.paused = false;
  }

  btnHelp.addEventListener('click', showHelp);
  closeHelp.addEventListener('click', hideHelp);

  // F1 key for help
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
      e.preventDefault();
      if (helpOverlay.style.display === 'flex') {
        hideHelp();
      } else {
        showHelp();
      }
    }
    if (e.key === 'Escape' && helpOverlay.style.display === 'flex') {
      hideHelp();
    }
  });

  // Show help automatically on first visit
  if (!localStorage.getItem('flight-control-help-seen')) {
    setTimeout(() => {
      showHelp();
      localStorage.setItem('flight-control-help-seen', 'true');
    }, 2000);
  }
}

function enhanceWeatherVisuals() {
  const wxCount = document.getElementById('wxCount');
  const weatherPulse = document.getElementById('weatherPulse');

  // Update weather visual feedback
  const updateWeatherUI = () => {
    const activeWeather = weather.enabled ? weather.cells.length : 0;
    wxCount.textContent = activeWeather;

    if (weatherPulse) {
      weatherPulse.style.opacity = activeWeather > 0 ? '1' : '0';
    }
  };

  // Update every second
  setInterval(updateWeatherUI, 1000);
  updateWeatherUI();
}

function initializeSettingsPanel() {
  const settingsOverlay = document.getElementById('settingsOverlay');
  const btnSettings = document.getElementById('btnSettings');
  const closeSettings = document.getElementById('closeSettings');
  const applySettings = document.getElementById('applySettings');

  // Get all controls
  const controls = {
    spawnRate: document.getElementById('spawnRate'),
    maxWaitTime: document.getElementById('maxWaitTime'),
    mctMultiplier: document.getElementById('mctMultiplier'),
    hubAndSpoke: document.getElementById('hubAndSpoke'),
    hubBias: document.getElementById('hubBias'),
    stationInterval: document.getElementById('stationInterval')
  };

  // Value display elements
  const valueDisplays = {
    spawnRate: document.getElementById('spawnRateValue'),
    maxWait: document.getElementById('maxWaitValue'),
    mct: document.getElementById('mctValue'),
    hubBias: document.getElementById('hubBiasValue'),
    stationInterval: document.getElementById('stationIntervalValue')
  };

  // Hub-and-spoke toggle elements
  const hubSpokeSlider = document.getElementById('hubSpokeSlider');

  // Initialize values from current game config
  function loadCurrentSettings() {
    controls.spawnRate.value = game.config.spawnIntervalMultiplier || 0.85;
    controls.maxWaitTime.value = game.config.maxWaitSeconds || 200;
    controls.mctMultiplier.value = game.config.mctMultiplier || 0.5;
    controls.hubAndSpoke.checked = game.config.hubAndSpokeMode !== false;
    controls.hubBias.value = game.config.hubSpokeBias || 1.6;
    controls.stationInterval.value = (game.config.stationSpawnIntervalMs || 53333) / 1000;

    updateValueDisplays();
    updateHubSpokeToggle();
  }

  // Update value displays
  function updateValueDisplays() {
    valueDisplays.spawnRate.textContent = parseFloat(controls.spawnRate.value).toFixed(2);
    valueDisplays.maxWait.textContent = controls.maxWaitTime.value;
    valueDisplays.mct.textContent = parseFloat(controls.mctMultiplier.value).toFixed(1);
    valueDisplays.hubBias.textContent = parseFloat(controls.hubBias.value).toFixed(1);
    valueDisplays.stationInterval.textContent = controls.stationInterval.value;
  }

  // Update hub-and-spoke visual toggle
  function updateHubSpokeToggle() {
    const isChecked = controls.hubAndSpoke.checked;
    hubSpokeSlider.style.transform = isChecked ? 'translateX(22px)' : 'translateX(0px)';
    hubSpokeSlider.style.background = isChecked ? '#8b5cf6' : '#6b7280';
    hubSpokeSlider.parentElement.style.background = isChecked ? '#8b5cf6' : '#374151';
  }

  // Apply optimized difficulty presets from config
  function applyPreset(preset) {
    const presets = game.config.difficultyPresets;
    const config = presets[preset.toUpperCase()];
    if (config) {
      // Update controls with preset values
      controls.spawnRate.value = config.spawnIntervalMultiplier;
      controls.maxWaitTime.value = config.maxWaitSeconds;
      controls.mctMultiplier.value = config.mctMultiplier;
      controls.hubAndSpoke.checked = config.hubSpokeBias > 1.5;
      controls.hubBias.value = config.hubSpokeBias;
      controls.stationInterval.value = config.stationSpawnIntervalMs / 1000;

      updateValueDisplays();
      updateHubSpokeToggle();
      
      // Apply immediately to game state
      applySettingsToGame();
    }
  }

  // Show/hide settings
  function showSettings() {
    loadCurrentSettings();
    settingsOverlay.style.display = 'flex';
    game.paused = true;
  }

  function hideSettings() {
    settingsOverlay.style.display = 'none';
    game.paused = false;
  }

  // Apply settings to game config and update live systems
  function applySettingsToGame() {
    // Update config
    game.config.spawnIntervalMultiplier = parseFloat(controls.spawnRate.value);
    game.config.maxWaitSeconds = parseInt(controls.maxWaitTime.value);
    game.config.mctMultiplier = parseFloat(controls.mctMultiplier.value);
    game.config.hubAndSpokeMode = controls.hubAndSpoke.checked;
    game.config.hubSpokeBias = parseFloat(controls.hubBias.value);
    game.config.stationSpawnIntervalMs = parseInt(controls.stationInterval.value) * 1000;

    // Reset spawn timers to apply new intervals immediately
    loop._nextSpawn = null;
    checkAirportSpawning._next = null;
    
    // Update train speeds if in config preset with immediate effect
    const activePreset = findActivePreset();
    if (activePreset) {
      // Update base config speed
      game.config.trainSpeed = activePreset.trainSpeed;
      
      // Reapply route-specific speeds to all trains
      game.trains.forEach(train => {
        const line = game.lines[train.lineId];
        if (line) {
          game.applyRouteSpeed(train, line);
        }
      });
    }

    // Show confirmation toast
    const difficultyLevel =
      game.config.spawnIntervalMultiplier >= 1.2 ? 'RELAXED' :
      game.config.spawnIntervalMultiplier >= 0.8 ? 'BALANCED' :
      game.config.spawnIntervalMultiplier >= 0.5 ? 'INTENSE' : 'EXPERT';

    game.showToast && game.showToast(`${difficultyLevel} difficulty applied`);
    hideSettings();
  }
  
  // Find which preset matches current settings
  function findActivePreset() {
    const presets = game.config.difficultyPresets;
    for (const [name, preset] of Object.entries(presets)) {
      if (Math.abs(preset.spawnIntervalMultiplier - game.config.spawnIntervalMultiplier) < 0.1) {
        return preset;
      }
    }
    return null;
  }

  // Event listeners
  btnSettings.addEventListener('click', showSettings);
  closeSettings.addEventListener('click', hideSettings);
  applySettings.addEventListener('click', applySettingsToGame);

  // Real-time value updates
  Object.keys(controls).forEach(key => {
    if (controls[key] && controls[key].addEventListener) {
      controls[key].addEventListener('input', updateValueDisplays);
    }
  });

  // Hub-and-spoke toggle
  controls.hubAndSpoke.addEventListener('change', updateHubSpokeToggle);

  // Preset buttons with enhanced feedback
  document.getElementById('presetEasy').addEventListener('click', () => {
    applyPreset('easy');
    game.showToast && game.showToast('✈️ EASY: Intense Airways activated');
  });
  document.getElementById('presetMedium').addEventListener('click', () => {
    applyPreset('medium');
    game.showToast && game.showToast('🛩️ MEDIUM: Extreme Pressure activated');
  });
  document.getElementById('presetHard').addEventListener('click', () => {
    applyPreset('hard');
    game.showToast && game.showToast('🚁 HARD: Nightmare Mode activated');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      if (settingsOverlay.style.display === 'flex') {
        hideSettings();
      } else {
        showSettings();
      }
    }
    if (e.key === 'Escape' && settingsOverlay.style.display === 'flex') {
      hideSettings();
    }
  });
}

// Buttons
document.getElementById('goRestart').addEventListener('click', ()=>{ location.reload(); });
document.getElementById('goClose').addEventListener('click', ()=>{ document.getElementById('gameOver').style.display='none'; game.gameOver=true; });
document.getElementById('btnBack').addEventListener('click', ()=>{ try{ history.back(); }catch(e){} });
document.getElementById('btnOpen').addEventListener('click', ()=>{ try{ window.open(location.href, '_blank'); }catch(e){} });

// Undo button and keyboard shortcut
document.getElementById('btnUndo').addEventListener('click', ()=> { game.undo(); });

// Auto-routing toggle button and keyboard shortcut
function updateAutoRoutingToggle() {
  const toggle = document.getElementById('btnAutoRoute');
  if (toggle && game.autoRouting) {
    const isActive = game.autoRouting.enabled;
    toggle.classList.toggle('active', isActive);
    toggle.title = `Auto-Routing ${isActive ? 'ON' : 'OFF'} (A) - ${isActive ? 'AI assists with route planning' : 'Manual route planning only'}`;

    // Debug logging for UI state
    if (game.autoRouting.debugEnabled) {
      console.log('Toggle UI updated - enabled:', isActive, 'userToggled:', game.autoRouting.userToggled);
    }
  }
}

document.getElementById('btnAutoRoute').addEventListener('click', ()=> {
  if (game.autoRouting) {
    game.autoRouting.toggleAutoRouting();
    updateAutoRoutingToggle();
    const status = game.autoRouting.enabled ? 'ENABLED' : 'DISABLED';
    game.showToast && game.showToast(`Auto-routing ${status}`);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    game.undo();
  }
  if (e.key === 'a' || e.key === 'A') {
    e.preventDefault();
    if (game.autoRouting) {
      game.autoRouting.toggleAutoRouting();
      updateAutoRoutingToggle();
      const status = game.autoRouting.enabled ? 'ENABLED' : 'DISABLED';
      game.showToast && game.showToast(`Auto-routing ${status}`);
    }
  }
  if (e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    game.debugPassengerFlow = !game.debugPassengerFlow;
    game.showToast(`Passenger flow debugging: ${game.debugPassengerFlow ? 'ON' : 'OFF'}`);
  }
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    rebuildAllLines();
  }
  if (e.key === 'h' || e.key === 'H') {
    e.preventDefault();
    const harmony = validateNetworkHarmony(game);
    console.log('Current network harmony:', harmony);

    let message = `Harmony Score: ${Math.round(harmony.score * 100)}%`;
    if (harmony.issues.length > 0) {
      message += ` - Issues: ${harmony.issues.length}`;
    }
    game.showToast && game.showToast(message);

    // Log detailed feedback
    if (harmony.recommendations.length > 0) {
      console.log('Recommendations:', harmony.recommendations);
    }
  }
  if (e.key === 'c' || e.key === 'C') {
    e.preventDefault();
    // Update line colors to match strategic types
    window.MM.updateLineColors();
  }
  if (e.key === 'v' || e.key === 'V') {
    e.preventDefault();
    // Debug route types and colors
    console.log('=== ROUTE TYPES DEBUG ===');
    game.lines.forEach((line, i) => {
      if (line && line.stations) {
        const routeType = game.getRouteType(line);
        const strategicColor = game.getStrategicColor(line.stations[0], line.stations[line.stations.length - 1]);
        const connectsToFinal = line.stations.some(si => game.stations[si] && game.stations[si].isFinal);
        const connectsToHub = line.stations.some(si => game.stations[si] && game.stations[si].isInterchange);
        console.log(`Route ${i}: ${routeType} | Color: ${strategicColor} (${line.color}) | Finals: ${connectsToFinal} | Hubs: ${connectsToHub}`);
        console.log(`  Stations: ${line.stations.map(si => game.stations[si]?.name || 'Unknown').join(' -> ')}`);
      }
    });
  }
  if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    // Route Performance Analysis
    console.log('=== ROUTE PERFORMANCE ANALYSIS ===');
    game.lines.forEach((line, i) => {
      const performance = game.getRoutePerformance(line.id);
      const metrics = game.routeMetrics.get(line.id);
      const routeType = game.getRouteType(line);

      console.log(`Route ${i} (${routeType}): ${performance}`);
      if (metrics) {
        console.log(`  Passengers: ${metrics.passengersDelivered} | Avg Wait: ${(metrics.avgWaitTime/1000).toFixed(1)}s | Efficiency: ${metrics.efficiency.toFixed(2)}`);
      } else {
        console.log(`  No performance data yet`);
      }
      console.log(`  Trains: ${line.trains.length} | Stations: ${line.stations.map(si => game.stations[si]?.name || 'Unknown').join(' -> ')}`);
    });

    // Network summary
    const routePerformances = game.lines.map(line => game.getRoutePerformance(line.id));
    const summary = {
      excellent: routePerformances.filter(p => p === 'EXCELLENT').length,
      good: routePerformances.filter(p => p === 'GOOD').length,
      average: routePerformances.filter(p => p === 'AVERAGE').length,
      poor: routePerformances.filter(p => p === 'POOR').length,
      failing: routePerformances.filter(p => p === 'FAILING').length,
      new: routePerformances.filter(p => p === 'NEW').length
    };
    console.log('Network Summary:', summary);

    const performanceMsg = `Routes: ${summary.excellent}★ ${summary.good}✓ ${summary.average}○ ${summary.poor}! ${summary.failing}✗`;
    game.showToast && game.showToast(performanceMsg);
  }
  if (e.key === 't' || e.key === 'T') {
    e.preventDefault();
    // Debug train positions
    console.log('=== TRAIN DEBUG ===');
    game.lines.forEach((line, i) => {
      console.log(`Line ${i}: ${line.trains.length} trains`);
      line.trains.forEach((train, j) => {
        const pos = game.getTrainWorldPosition(train);
        console.log(`  Train ${j}: pos=${pos.x.toFixed(1)},${pos.y.toFixed(1)}, progress=${train.progress.toFixed(3)}, dir=${train.direction}`);
      });
    });
  }
});

// Force rebuild all lines with clean visual routing
function rebuildAllLines() {
  if (!game || !game.lines) return;
  console.log('Rebuilding all lines with clean visual routing and updated colors...');

  // Clear cache first
  try {
    if (typeof clearHexCache !== 'undefined') clearHexCache();
  } catch (e) {
    console.log('Cache clear not available');
  }

  // Force color refresh for all existing lines
  for (const line of game.lines) {
    if (line && line.stations && line.stations.length >= 2) {
      Lines.rebuildWaypointsForLine(game, line);
      // Force color property to re-evaluate by accessing it
      const currentColor = line.color;
      console.log(`Line ${line.stations[0]}->${line.stations[line.stations.length-1]}: colorIndex=${line.colorIndex}, color=${currentColor}`);
    }
  }

  // Validate network harmony after rebuilding
  const harmony = validateNetworkHarmony(game);
  console.log('Network harmony validation:', harmony);

  game.needsRedraw = true;
  console.log(`Rebuilt ${game.lines.length} lines with clean routing`);

  // Show harmony feedback to user
  if (harmony.score > 0.85) {
    game.showToast && game.showToast('Excellent aesthetic harmony achieved!');
  } else if (harmony.score < 0.6) {
    game.showToast && game.showToast(`Routes rebuilt - Harmony: ${Math.round(harmony.score * 100)}%`);
  } else {
    game.showToast && game.showToast('Routes rebuilt with clean visual style');
  }
}

// Expose test API and modules for auto-routing
window.Lines = Lines;
  window.MM = {
    canvas,
    worldToScreen: (x,y)=> worldToScreen(game.camera, x,y),
    screenToWorld: (x,y)=> screenToWorld(game.camera, x,y),
    get gameState(){ return game; },
  // For this variant, pass a station index as the destination
  canTrainReachDestination: (line, stationIdx)=> canTrainReachDestination(game, line, stationIdx),
  spawnPassenger: ()=> spawnPassenger(game),
  buildOverlapMap: ()=> buildOverlapMap(game),
  createLineAB: (aIdx, bIdx) => {
    try {
      if (aIdx == null || bIdx == null || aIdx === bIdx) return false;
      if (game.linesAvailable <= 0) return false;
      const A = game.stations[aIdx], B = game.stations[bIdx];
      if (!A || !B) return false;
      const crosses = (game.config.thamesPolygon && game.config.thamesPolygon.length >= 3) ?
        (function(){
          const poly = game.config.thamesPolygon;
          function segSeg(p,q,r,s){
            function orient(a,b,c){ const v=(b.y-a.y)*(c.x-b.x) - (b.x-a.x)*(c.y-b.y); if (Math.abs(v)<1e-9) return 0; return v>0?1:2; }
            function onSeg(a,b,c){ return Math.min(a.x,c.x)-1e-9<=b.x && b.x<=Math.max(a.x,c.x)+1e-9 && Math.min(a.y,c.y)-1e-9<=b.y && b.y<=Math.max(a.y,c.y)+1e-9; }
            const o1=orient(p,q,r), o2=orient(p,q,s), o3=orient(r,s,p), o4=orient(r,s,q);
            if (o1!==o2 && o3!==o4) return true; if (o1===0 && onSeg(p,r,q)) return true; if (o2===0 && onSeg(p,s,q)) return true; if (o3===0 && onSeg(r,p,s)) return true; if (o4===0 && onSeg(r,q,s)) return true; return false;
          }
          for (let i=0;i<poly.length;i++){ const C=poly[i], D=poly[(i+1)%poly.length]; if (segSeg(A,B,C,D)) return true; } return false;
        })() : false;
      if (crosses && (game.tunnels||0) <= 0) return false;
      const line = Lines.createLine(game, [aIdx, bIdx], game.selectedLineColorIndex);
      if (!line) return false;
      Lines.rebuildWaypointsForLine(game, line);
      game.calculateLineLength(line);
      game.createTrain(line.id);
      if (game.trainsAvailable>0) game.trainsAvailable--; game.linesAvailable--;
      if (crosses) game.tunnels = Math.max(0, (game.tunnels||0)-1);
      hud.updateHUD();
      return true;
    } catch (e) { console.error('createLineAB failed', e); return false; }
  },
  removeLine: (id) => game.removeLine(id),
  insertStation: (lineId, stationIdx, pos) => Lines.addStationToLine(game, lineId, stationIdx, pos),

  // Quick tuning helpers (DevTools):
  setSpawnMultiplier: (m=1) => { game.config.spawnIntervalMultiplier = Math.max(0.1, m); game.showToast && game.showToast(`Spawn interval x${m.toFixed(2)}`); },
  setStationSpawnInterval: (ms=40000) => { game.config.stationSpawnIntervalMs = Math.max(1000, ms); game.showToast && game.showToast(`Station spawn ${ms}ms`); },
  setHubAndSpoke: (on=true) => { game.config.hubAndSpokeMode = !!on; game.showToast && game.showToast(`Hub&Spoke ${on?'ON':'OFF'}`); },
  setMCTMultiplier: (m=1) => { game.config.mctMultiplier = Math.max(0.1, m); game.showToast && game.showToast(`MCT x${m.toFixed(2)}`); },
  setMaxWaitSeconds: (s=200) => { game.config.maxWaitSeconds = Math.max(10, s); game.showToast && game.showToast(`Max wait ${s}s`); },
  setMissedConnectionMultiplier: (m=1.5) => { game.config.missedConnectionMultiplier = Math.max(1, m); game.showToast && game.showToast(`MissedConn x${m.toFixed(2)}`); },
  setDebugLogs: (on=false) => { game.debugLogs = !!on; game.showToast && game.showToast(`Debug logs ${on?'ON':'OFF'}`); },

  // Force rebuild all lines with improved pathfinding
  rebuildAllLines: () => rebuildAllLines(),

  // Update all line colors to match their strategic types
  updateLineColors: () => {
    let updated = 0;
    for (const line of game.lines) {
      if (line && line.stations && line.stations.length >= 2) {
        const strategicColor = game.getStrategicColor(line.stations[0], line.stations[line.stations.length - 1]);
        if (line.colorIndex !== strategicColor) {
          line.colorIndex = strategicColor;
          updated++;
        }
      }
    }
    game.needsRedraw = true;
    console.log(`Updated ${updated} line colors to match strategic types`);
    game.showToast && game.showToast(`Updated ${updated} route colors`);
    return updated;
  },

  // Headless simulation helper: simulate N weeks without rendering
  // Usage in console: await MM.simulateWeeks(20, { log: true })
  simulateWeeks: async (weeks = 20, opts = {}) => {
    const log = opts.log ?? true;
    const dt = opts.dt ?? 50; // ms per step
    const maxMs = weeks * game.config.weekLength;
    let nextSpawn = null;
    let lastOpt = 0;
    let simPrevWeek = Math.floor((game.gameTime || 0) / game.config.weekLength);

    // Ensure auto-routing assists during simulation and acts immediately
    try {
      if (game.autoRouting) {
        game.autoRouting.enabled = true;
        game.autoRouting.lastAutoAction = -1e9; // trigger immediately
        game.autoRouting.actionCooldown = Math.min(game.autoRouting.actionCooldown || 8000, 1500);
        // Try an immediate auto action to bootstrap routes if none exist
        if (typeof game.autoRouting.performAutoActions === 'function' && game.lines.length === 0 && game.linesAvailable > 0) {
          game.autoRouting.performAutoActions();
        }
      }
    } catch(e){}

    const summarize = () => {
      const waiting = game.stations.reduce((s, st) => s + ((st && st.queue) ? st.queue.length : 0), 0);
      const overcrowded = game.stations.filter(s => s && s.isOvercrowded).length;
      const trains = game.trains.length;
      const lines = game.lines.length;
      const finals = (game.finalDeliveries || 0);
      const avgFinalMs = finals > 0 ? Math.round((game.totalFinalDeliveryTime || 0) / finals) : 0;
      return { day: game.day, score: game.score, waiting, overcrowded, trains, lines, finals, avgFinalMs };
    };
    let maxWaiting = 0;
    let maxOvercrowded = 0;
    let firstRouteAtMs = null;

    const applyRewardHeadless = (type) => {
      if (type === 'line') game.linesAvailable++;
      else if (type === 'carriage') {
        game.carriages = (game.carriages||0) + 1;
        const tr = game.trains[Math.floor(Math.random()*Math.max(1, game.trains.length))];
        if (tr) tr.capacity += 2;
      }
      else if (type === 'tunnel') game.tunnels = (game.tunnels||0) + 1;
      else if (type === 'speed') game.trains.forEach(tr => tr.speed *= 1.2);
      else if (type === 'hub_upgrade') {
        const eligible = game.stations.filter(s => s && !s.isInterchange && !s.isFinal);
        if (eligible.length > 0){ const t = eligible[Math.floor(Math.random()*eligible.length)]; t.isInterchange = true; t.mctMs = Math.round((t.mctMs||12000)*0.8); }
      }
      else if (type === 'final_express'){
        game.finalExpressActive = true;
        for (const line of game.lines) {
          if (line.stations.some(si => game.stations[si] && game.stations[si].isFinal)) {
            for (const trainId of line.trains) { const train = game.trains.find(t => t.id === trainId); if (train) train.speed *= 1.5; }
          }
        }
      }
      // Re-optimize right after reward
      try { game.optimizeTrainAllocation && game.optimizeTrainAllocation(); } catch(_){}
    };

    const pickReward = () => {
      const waiting = game.stations.reduce((s, st) => s + ((st && st.queue) ? st.queue.length : 0), 0);
      const day = game.day || 1;
      const linesCount = game.lines.length;
      // Prefer more route capacity in early game and under load
      if (day <= 3 || waiting > 35 || linesCount < 4) return 'line';
      if (waiting > 25) return 'carriage';
      if (game.trains.length < Math.max(2, linesCount)) return 'speed';
      const nonHubs = game.stations.filter(s => s && !s.isFinal && !s.isInterchange);
      if (nonHubs.length > 5) return 'hub_upgrade';
      return 'speed';
    };

    const startTime = game.gameTime;
    while (!game.gameOver && (game.gameTime - startTime) < maxMs) {
      // Time step
      game.prevGameTime = game.gameTime; game.gameTime += dt;

      // Week rollover handling
      const prevWeek = simPrevWeek;
      const nowWeek = Math.floor(game.gameTime / game.config.weekLength);
      if (nowWeek > prevWeek) {
        simPrevWeek = nowWeek;
        game.day++; game.trainsAvailable++;
        const reward = pickReward();
        applyRewardHeadless(reward);
        if (log) console.log('[Week]', nowWeek, summarize(), 'Reward:', reward);
      }

      // Spawn demand (mirrors main loop scheduling)
      if (nextSpawn == null || game.gameTime >= nextSpawn){
        spawnPassenger(game);
        const base = game.config.spawnInterval;
        const diff = Math.max(0.55, 1 - (game.day-1)*0.04);
        const jitter = (Math.random()*700 - 350);
        const waitingTotal = game.stations.reduce((s, st) => s + ((st && st.queue) ? st.queue.length : 0), 0);
        const congestion = Math.min(1, waitingTotal / 36);
        const congestionFactor = 1 + 2.2 * congestion;
        const intervalMult = game.config.spawnIntervalMultiplier || 1;
        nextSpawn = game.gameTime + Math.max(1200, (base*diff + jitter) * congestionFactor * intervalMult);
      }

      // Time-based airport spawning
      checkAirportSpawning();

      // Update queues/overcrowding
      updatePassengersAndCheckOvercrowding(game, dt);
      if (game.gameOver) break;

      // Metrics tracking
      const snap = summarize();
      maxWaiting = Math.max(maxWaiting, snap.waiting);
      maxOvercrowded = Math.max(maxOvercrowded, snap.overcrowded);
      if (firstRouteAtMs == null && snap.lines > 0) firstRouteAtMs = game.gameTime - startTime;

      // Weather motion
      updateWeather(dt);

      // Weather slowdowns while updating trains
      const modified=[];
      for (const tr of game.trains){
        const pos = game.getTrainWorldPosition(tr);
        if (!pos) continue;
        const cell = isInWeather(pos.x, pos.y);
        if (cell){
          tr._origSpeed = (tr._origSpeed == null) ? tr.speed : Math.max(tr._origSpeed, tr.speed);
          const dx = pos.x - cell.x, dy = pos.y - cell.y;
          const dist = Math.hypot(dx, dy);
          const t = Math.max(0, 1 - dist / cell.r);
          const minFactor = (game.day <= 2) ? 0.9 : (game.day === 3 ? 0.8 : 0.5);
          const slowFactor = 1 - t * (1 - minFactor);
          tr.speed = tr._origSpeed * slowFactor; modified.push(tr);
        }
      }
      Trains.updateTrains(game, dt);
      for (const tr of modified){ if (tr._origSpeed!=null){ tr.speed = tr._origSpeed; } }
      Trains.updateScorePopups(game, dt);

      // Periodic train allocation
      if (game.gameTime - lastOpt >= 3000) { game.optimizeTrainAllocation(); lastOpt = game.gameTime; }

      // Events and auto-routing (defer events early)
      if (game.events && ((game.day||1) >= 4)) game.events.update(game.gameTime);
      if (game.autoRouting) game.autoRouting.update();

      // Ensure every line has at least one train when available
      for (const line of game.lines) {
        if (!line) continue;
        if ((((line.trains && line.trains.length) || 0) === 0) && game.trainsAvailable > 0) {
          const t = game.createTrain(line.id);
          if (t) game.trainsAvailable--;
        }
      }

      // Update queues/overcrowding AFTER trains/allocation/autorouting had a chance to act
      updatePassengersAndCheckOvercrowding(game, dt);
      if (game.gameOver) break;

      // Yield occasionally for UI responsiveness
      if (opts.yieldEveryMs && ((game.gameTime - startTime) % opts.yieldEveryMs) < dt) await new Promise(r=> setTimeout(r, 0));
    }

    const summary = summarize();
    const weeksSimulated = Math.floor((game.gameTime - startTime) / game.config.weekLength);
    const linesBuilt = summary.lines;
    const feasible = !game.gameOver && linesBuilt > 0 && maxOvercrowded <= 6 && summary.waiting <= 60;
    const report = { ...summary, weeksSimulated, linesBuilt, maxWaiting, maxOvercrowded, firstRouteAtMs, feasible, gameOver: game.gameOver };
    if (log) console.log('[Simulation Complete]', report);
    return report;
  },

  // Visual harmony validation and analysis
  validateHarmony: () => {
    const harmony = validateNetworkHarmony(game);
    console.log('Network Harmony Analysis:', harmony);
    return harmony;
  },

  // Get aesthetic recommendations for the current network
  getAestheticRecommendations: () => {
    const harmony = validateNetworkHarmony(game);
    return harmony.recommendations;
  },

  // Force refresh config to apply new settings (like line widths)
  refreshConfig: () => {
    game.config = { ...makeScaledConfig(AIRSPACE_CONFIG), lineColors: AIRSPACE_CONFIG.lineColors };
    game.needsRedraw = true;
    console.log('Config refreshed - line widths:', game.config.lineOutlineWidth, game.config.lineInnerWidth);
    return game.config;
  },

  // Debug train positions and movements
  debugTrains: () => {
    console.log('=== TRAIN DEBUG ===');
    game.lines.forEach((line, i) => {
      console.log(`Line ${i}: ${line.trains.length} trains`);
      line.trains.forEach((train, j) => {
        const trainObj = game.trains[train];
        if (trainObj) {
          const pos = game.getTrainWorldPosition(trainObj);
          console.log(`  Train ${j}: pos=${pos.x.toFixed(1)},${pos.y.toFixed(1)}, progress=${trainObj.position.toFixed(3)}, dir=${trainObj.direction}`);
        }
      });
    });
  },
  
  // Apply difficulty preset from config with immediate effect
  setDifficulty: (level) => {
    const preset = game.config.difficultyPresets[level.toUpperCase()];
    if (!preset) {
      console.error('Invalid difficulty level. Use: EASY, MEDIUM, or HARD');
      return false;
    }
    
    // Apply all preset values to config
    Object.assign(game.config, preset);
    
    // FORCE reset spawn timers for immediate effect
    delete loop._nextSpawn;
    delete checkAirportSpawning._next;
    delete checkAirportSpawning._last;
    
    // Update train speeds
    const speedMultiplier = preset.trainSpeed / (game.config.trainSpeed || 0.085);
    game.trains.forEach(train => {
      const line = game.lines[train.lineId];
      if (line) {
        game.config.trainSpeed = preset.trainSpeed;
        game.applyRouteSpeed(train, line);
      }
    });
    
    const spawnRate = 60000 / (game.config.spawnInterval * game.config.spawnIntervalMultiplier);
    game.showToast && game.showToast(`${level.toUpperCase()}: ${spawnRate.toFixed(1)}/min`);
    console.log(`Applied ${level.toUpperCase()}:`, {
      spawnRate: spawnRate.toFixed(1) + '/min',
      maxWait: preset.maxWaitSeconds + 's', 
      aircraft: preset.initialTrains
    });
    return true;
  },
  
  // Strategic color guidance system
  getStrategicColor: (fromStationIdx, toStationIdx) => {
    const fromStation = game.stations[fromStationIdx];
    const toStation = game.stations[toStationIdx];
    
    if (!fromStation || !toStation) return 0; // Default gold
    
    const isFinalRoute = toStation.isFinal || fromStation.isFinal;
    const isHubRoute = (toStation.isInterchange && fromStation.isInterchange);
    const isHubConnector = toStation.isInterchange || fromStation.isInterchange;
    
    if (isFinalRoute) return 0; // Gold for express to finals
    if (isHubRoute) return 1;   // Teal for hub-to-hub
    if (isHubConnector) return 2; // Blue for hub feeders
    return 3; // Red for regional connections
  },
  
  // Enhanced debugging and validation tools
  debugAircraft: () => {
    console.log('=== AIRCRAFT DEBUG ===');
    console.log(`Available aircraft: ${game.trainsAvailable}`);
    console.log(`Total aircraft: ${game.trains.length}`);
    
    const routeAnalysis = {};
    game.lines.forEach((line, i) => {
      const routeType = game.getRouteType(line);
      const aircraftCount = line.trains.length;
      const multiplier = game.routeSpeedMultipliers[routeType];
      
      routeAnalysis[i] = {
        type: routeType,
        aircraft: aircraftCount,
        speedMultiplier: multiplier,
        color: line.color,
        stations: line.stations.length
      };
      
      console.log(`Route ${i}: ${routeType} (${aircraftCount} aircraft, ${multiplier}x speed)`);
    });
    
    return routeAnalysis;
  },
  
  // Validate difficulty settings are active
  validateDifficulty: () => {
    const current = {
      spawnInterval: game.config.spawnIntervalMultiplier,
      maxWait: game.config.maxWaitSeconds,
      mct: game.config.mctMultiplier,
      hubBias: game.config.hubSpokeBias,
      stationInterval: game.config.stationSpawnIntervalMs,
      trainSpeed: game.config.trainSpeed
    };
    
    console.log('Current difficulty settings:', current);
    
    const presets = game.config.difficultyPresets;
    Object.entries(presets).forEach(([name, preset]) => {
      const matches = Object.keys(current).every(key => {
        const diff = Math.abs(current[key] - preset[key]);
        return diff < 0.1 || diff / preset[key] < 0.05;
      });
      
      if (matches) {
        console.log(`Active preset: ${name}`);
      }
    });
    
    return current;
  },

  // Additional helper methods for testing
  getStations: () => game.stations,
  getLines: () => game.lines,
  getTrains: () => game.trains,
  getCamera: () => game.camera,
  getLinesAvailable: () => game.linesAvailable,
  getTrainsAvailable: () => game.trainsAvailable,
  getSelectedColorIndex: () => game.selectedLineColorIndex,
  hasActivePreview: () => !!game.previewPoints
};

// Time-based airport spawning
// FIXED PASSENGER FLOW VISUALIZATION - efficient and correct implementation
function drawPassengerFlowTrails(ctx, game) {
  if (!game.finalFlowParticles) game.finalFlowParticles = [];
  if (!game.demandFlowParticles) game.demandFlowParticles = [];
  if (!game.particleSpawnTimer) game.particleSpawnTimer = 0;

  // RATE LIMITING: Only spawn particles occasionally to prevent performance issues
  game.particleSpawnTimer += 16; // Assume ~60fps
  const shouldSpawn = game.particleSpawnTimer > 200; // Every 200ms
  if (shouldSpawn) game.particleSpawnTimer = 0;

  // PARTICLE LIMITS: Prevent memory leaks
  const MAX_ACTIVE_PARTICLES = 50;
  const MAX_DEMAND_PARTICLES = 30;

  ctx.save();
  ctx.translate(game.camera.x, game.camera.y);
  ctx.scale(game.camera.scale, game.camera.scale);

  // 1. SPAWN ACTIVE PASSENGER TRAILS (rate-limited)
  if (shouldSpawn && game.finalFlowParticles.length < MAX_ACTIVE_PARTICLES) {
    for (const train of game.trains) {
      if (train.passengers.length === 0) continue;

      // Only spawn one particle per train per cycle to avoid spam
      const randomPassenger = train.passengers[Math.floor(Math.random() * train.passengers.length)];
      const dest = game.stations[randomPassenger.destStation];

      if (dest) {
        const pos = game.getTrainWorldPosition(train);
        if (pos && pos.x !== 0 && pos.y !== 0) {
          const isFinal = dest.isFinal;
          game.finalFlowParticles.push({
            x: pos.x + (Math.random() - 0.5) * 10, // Small random offset
            y: pos.y + (Math.random() - 0.5) * 10,
            targetX: dest.x,
            targetY: dest.y,
            life: 1.0,
            color: isFinal ? '#f59e0b' : (dest.shape === 'circle' ? '#38bdf8' :
                   dest.shape === 'triangle' ? '#f97316' :
                   dest.shape === 'square' ? '#22c55e' : '#a78bfa'),
            speed: 0.008,
            size: isFinal ? 4 : 3,
            isFinal
          });
        }
      }
    }
  }

  // 2. SPAWN DEMAND INDICATORS (rate-limited)
  if (shouldSpawn && game.demandFlowParticles.length < MAX_DEMAND_PARTICLES) {
    for (const station of game.stations) {
      if (!station || !station.queue || station.queue.length === 0) continue;

      // Group passengers by destination
      const destCounts = {};
      station.queue.forEach(p => {
        const dest = game.stations[p.destStation];
        if (!dest) return;
        const key = dest.id;
        if (!destCounts[key]) {
          destCounts[key] = { dest, count: 0, isFinal: dest.isFinal };
        }
        destCounts[key].count++;
      });

      // Spawn one particle for the highest demand destination
      const destinations = Object.values(destCounts);
      if (destinations.length > 0) {
        const topDemand = destinations.reduce((max, curr) => curr.count > max.count ? curr : max);
        if (topDemand.count >= 2) { // Only show significant demand
          game.demandFlowParticles.push({
            x: station.x + (Math.random() - 0.5) * 15,
            y: station.y + (Math.random() - 0.5) * 15,
            targetX: topDemand.dest.x,
            targetY: topDemand.dest.y,
            life: 1.0,
            color: topDemand.isFinal ? '#fbbf24' :
                   (topDemand.dest.shape === 'circle' ? '#7dd3fc' :
                    topDemand.dest.shape === 'triangle' ? '#fb923c' :
                    topDemand.dest.shape === 'square' ? '#4ade80' : '#c4b5fd'),
            speed: 0.006,
            size: topDemand.isFinal ? 3 : 2,
            intensity: Math.min(topDemand.count / 4, 1),
            isFinal: topDemand.isFinal
          });
        }
      }
    }
  }

  // 3. UPDATE AND DRAW ACTIVE PARTICLES - FLOWING TOWARD DESTINATIONS
  game.finalFlowParticles = game.finalFlowParticles.filter(p => {
    p.life -= p.speed;

    if (p.life > 0) {
      // CORRECTED: Move directly toward destination airport
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 2) {
        const moveSpeed = 80 * p.speed; // Faster, more visible movement
        p.x += (dx / dist) * moveSpeed;
        p.y += (dy / dist) * moveSpeed;
      }

      // Draw particle with trail effect
      ctx.save();
      ctx.globalAlpha = p.life * (p.isFinal ? 0.9 : 0.6);
      ctx.fillStyle = p.color;

      if (p.isFinal) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      }

      // Main particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Add motion trail for better visibility
      ctx.globalAlpha = p.life * 0.3;
      ctx.beginPath();
      ctx.arc(p.x - (dx/dist) * 8, p.y - (dy/dist) * 8, p.size * 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      return true;
    }
    return false;
  });

  // 4. UPDATE AND DRAW DEMAND PARTICLES - FLOWING TOWARD DESTINATIONS
  game.demandFlowParticles = game.demandFlowParticles.filter(p => {
    p.life -= p.speed;

    if (p.life > 0) {
      // CORRECTED: Move directly toward destination airport
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 2) {
        const moveSpeed = 60 * p.speed; // Good visibility for demand flow
        p.x += (dx / dist) * moveSpeed;
        p.y += (dy / dist) * moveSpeed;
      }

      // Draw demand particle (clear direction indication)
      ctx.save();
      ctx.globalAlpha = p.life * p.intensity * (p.isFinal ? 0.7 : 0.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      return true;
    }
    return false;
  });

  ctx.restore();
}

// ROUTE EFFICIENCY VISUALIZATION - show which routes are high-value for strategic planning
function drawRouteEfficiencyIndicators(ctx, game) {
  if (!game.routeEfficiencyData) game.routeEfficiencyData = {};

  ctx.save();
  ctx.translate(game.camera.x, game.camera.y);
  ctx.scale(game.camera.scale, game.camera.scale);

  // Calculate potential high-value connections
  const finals = game.stations.filter(s => s && s.isFinal);
  const hubs = game.stations.filter(s => s && s.isInterchange);
  const regulars = game.stations.filter(s => s && !s.isFinal && !s.isInterchange);

  // Draw potential connection value indicators (when no route exists)
  for (const origin of game.stations) {
    if (!origin) continue;

    for (const dest of finals) {
      if (origin.id === dest.id) continue;

      // Check if there's already a direct connection
      const hasDirectConnection = game.lines.some(line =>
        line.stations.includes(origin.id) && line.stations.includes(dest.id)
      );

      if (!hasDirectConnection) {
        const distance = Math.hypot(dest.x - origin.x, dest.y - origin.y);
        const efficiency = Math.max(0, 1 - distance / 400); // Closer = more efficient

        if (efficiency > 0.3) { // Only show viable connections
          // Draw subtle connection suggestion line
          ctx.save();
          ctx.globalAlpha = efficiency * 0.15;
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 12]);
          ctx.lineDashOffset = performance.now() * 0.05;
          ctx.beginPath();
          ctx.moveTo(origin.x, origin.y);
          ctx.lineTo(dest.x, dest.y);
          ctx.stroke();
          ctx.restore();

          // Draw efficiency rating at midpoint
          const midX = (origin.x + dest.x) / 2;
          const midY = (origin.y + dest.y) / 2;

          ctx.save();
          ctx.globalAlpha = efficiency * 0.4;
          ctx.fillStyle = '#f59e0b';
          ctx.font = '12px Inter, Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`★${Math.round(efficiency * 5)}`, midX, midY);
          ctx.restore();
        }
      }
    }
  }

  // Highlight existing high-value routes with glow effects
  for (const line of game.lines) {
    const connectsToFinal = line.stations.some(si => {
      const station = game.stations[si];
      return station && station.isFinal;
    });

    if (connectsToFinal && game.finalExpressActive) {
      // Draw express route glow
      for (let i = 0; i < line.stations.length - 1; i++) {
        const stationA = game.stations[line.stations[i]];
        const stationB = game.stations[line.stations[i + 1]];
        if (!stationA || !stationB) continue;

        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 8;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(stationA.x, stationA.y);
        ctx.lineTo(stationB.x, stationB.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  ctx.restore();
}

function checkAirportSpawning(){
  // Steady, interval-based airport spawning with small jitter - using LIVE config values
  if (!checkAirportSpawning._last) checkAirportSpawning._last = -Infinity;
  const now = game.gameTime; 
  const gap = game.config.minStationSpawnGapMs;
  const initDelay = game.config.stationSpawnInitialDelayMs || 20000;
  const baseInterval = game.config.stationSpawnIntervalMs || 40000; // Use live config
  const jitterMs = (game.config.stationSpawnJitterMs == null) ? 5000 : game.config.stationSpawnJitterMs;

  if (!checkAirportSpawning._next){
    checkAirportSpawning._next = now + initDelay;
  }

  if (now >= checkAirportSpawning._next){
    // Respect minimum gap and available catalog
    if (now - checkAirportSpawning._last >= gap && game.availableCatalog && game.availableCatalog.length > 0){
      addNewAirport();
      checkAirportSpawning._last = now;
    }
    // Schedule next spawn time using current config
    const jitter = Math.max(-jitterMs, Math.min(jitterMs, (Math.random()*2 - 1) * jitterMs));
    // Ensure the next time also respects min gap
    const earliest = checkAirportSpawning._last + gap;
    const proposed = now + baseInterval + jitter;
    checkAirportSpawning._next = Math.max(earliest, proposed);
  }
}
