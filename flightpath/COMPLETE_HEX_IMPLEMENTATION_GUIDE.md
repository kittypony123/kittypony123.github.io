# Complete Hexagonal Lattice Implementation Guide (Continued)
## Flight Control Game - Comprehensive Technical Specification
## Flight Control Game - Comprehensive Technical Specification

---

## CRITICAL: Implementation Philosophy
**THIS IS A VISUAL UPGRADE, NOT A GAMEPLAY CHANGE**
- Players still draw routes by clicking and dragging between airports
- The hex system only changes HOW the path is calculated and rendered
- All existing gameplay mechanics remain unchanged

---

## Table of Contents
1. [Pre-Implementation Checklist](#pre-implementation-checklist)
2. [File Backup Requirements](#file-backup-requirements)  
3. [Mathematical Foundation](#mathematical-foundation)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Error Handling & Guardrails](#error-handling--guardrails)
6. [Testing Protocol](#testing-protocol)
7. [Rollback Procedures](#rollback-procedures)
8. [Performance Benchmarks](#performance-benchmarks)

---

## Pre-Implementation Checklist

### Required Tools
- [ ] Node.js version 16+ installed
- [ ] Git for version control
- [ ] Browser DevTools familiarity for debugging
- [ ] Text editor with JavaScript syntax highlighting

### Current System Verification
Before starting, verify these files exist and match expected structure:
```bash
# Run from C:\\Users\\frmar\
ewhex\\
dir src\\systems\\hexgrid.js
dir src\\systems\\lines_final.js
dir src\\ui\\input_final.js
dir src\\render\\lines_final.js
dir src\\maps\\airspace.js
```

### Create Safety Backup
```bash
# Create backup directory
mkdir backup_original
# Copy critical files
copy src\\systems\\hexgrid.js backup_original\\
copy src\\systems\\lines_final.js backup_original\\
copy src\\ui\\input_final.js backup_original\\
copy src\\render\\lines_final.js backup_original\\
```

---

## File Backup Requirements

### MANDATORY: Create These Backups First
```javascript
// backup_original/hexgrid_original.js
// backup_original/lines_final_original.js
// backup_original/input_final_original.js
// backup_original/render_lines_original.js
```

### Version Control Commands
```bash
git init  # If not already a git repo
git add .
git commit -m \"Pre-hexagonal implementation backup\"
git tag v1.0-octilinear  # Tag current version
```

---

## Mathematical Foundation

### Hexagonal Coordinate System Explained
The hexagonal grid uses \"cube coordinates\" (q, r, s) where q + r + s = 0.
This constraint ensures consistent hexagonal geometry.

```
    Hex Directions (60° apart):
         0° →
    300° ↗   ↘ 60°
         ← 180°
    240° ↙   ↖ 120°
```

### Critical Constants
```javascript
const HEX_SIZE = 44;  // MUST match config.hexGrid.size
const SQRT_3 = 1.732050807568877;  // Pre-calculated for performance
```

---

## Step-by-Step Implementation

### PHASE 1: Core Hexagonal Mathematics
**File:** `src/systems/hexgrid.js`

#### Step 1.1: Complete File Replacement
**IMPORTANT:** Save the original file first!

```javascript
// src/systems/hexgrid.js - COMPLETE REPLACEMENT
// Hexagonal lattice routing system with A* pathfinding

// ============================================
// SECTION 1: Constants and Configuration
// ============================================
const HEX_SIZE = 44;  // Grid size - MUST match config
const SQRT_3 = Math.sqrt(3);
const HEX_ANGLES = [0, 60, 120, 180, 240, 300].map(deg => deg * Math.PI / 180);

// Cube coordinate directions for hex neighbors
const HEX_DIRECTIONS = [
  {q: 1, r: -1, s: 0},   // 0° (East)
  {q: 1, r: 0, s: -1},    // 60° (Southeast)
  {q: 0, r: 1, s: -1},    // 120° (Southwest)
  {q: -1, r: 1, s: 0},   // 180° (West)
  {q: -1, r: 0, s: 1},   // 240° (Northwest)
  {q: 0, r: -1, s: 1}    // 300° (Northeast)
];

// ============================================
// SECTION 2: Coordinate Conversion Functions
// ============================================

/**
 * Convert cube coordinates to world pixel coordinates
 * @param {number} q - Cube Q coordinate
 * @param {number} r - Cube R coordinate
 * @param {number} s - Cube S coordinate (optional, can be derived)
 * @returns {{x: number, y: number}} World coordinates
 */
export function cubeToPixel(q, r, s = null) {
  // Validate cube coordinate constraint
  if (s !== null && Math.abs(q + r + s) > 0.0001) {
    console.warn('Invalid cube coordinates:', q, r, s);
  }
  
  const x = HEX_SIZE * (3/2 * q);
  const y = HEX_SIZE * (SQRT_3/2 * q + SQRT_3 * r);
  return {x, y};
}

/**
 * Convert world pixel coordinates to cube coordinates
 * @param {number} x - World X coordinate
 * @param {number} y - World Y coordinate
 * @returns {{q: number, r: number, s: number}} Cube coordinates
 */
export function pixelToCube(x, y) {
  const q = (2/3 * x) / HEX_SIZE;
  const r = (-1/3 * x + SQRT_3/3 * y) / HEX_SIZE;
  const s = -q - r;
  return roundCube(q, r, s);
}

/**
 * Round fractional cube coordinates to nearest hex
 * @param {number} q - Fractional Q coordinate
 * @param {number} r - Fractional R coordinate
 * @param {number} s - Fractional S coordinate
 * @returns {{q: number, r: number, s: number}} Integer cube coordinates
 */
export function roundCube(q, r, s) {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  
  const q_diff = Math.abs(rq - q);
  const r_diff = Math.abs(rr - r);
  const s_diff = Math.abs(rs - s);
  
  // Fix the coordinate with largest rounding error
  if (q_diff > r_diff && q_diff > s_diff) {
    rq = -rr - rs;
  } else if (r_diff > s_diff) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }
  
  return {q: rq, r: rr, s: rs};
}

/**
 * Snap world coordinates to nearest hex vertex
 * @param {number} worldX - World X coordinate
 * @param {number} worldY - World Y coordinate
 * @returns {{x: number, y: number}} Snapped world coordinates
 */
export function snapToHexVertex(worldX, worldY) {
  const cube = pixelToCube(worldX, worldY);
  return cubeToPixel(cube.q, cube.r, cube.s);
}

/**
 * Get all six neighboring hexes
 * @param {{q: number, r: number, s: number}} cube - Center hex
 * @returns {Array<{q: number, r: number, s: number}>} Six neighbors
 */
export function getHexNeighbors(cube) {
  return HEX_DIRECTIONS.map(dir => ({
    q: cube.q + dir.q,
    r: cube.r + dir.r,
    s: cube.s + dir.s
  }));
}

/**
 * Calculate hex distance between two cube coordinates
 * @param {{q: number, r: number, s: number}} a - First hex
 * @param {{q: number, r: number, s: number}} b - Second hex
 * @returns {number} Distance in hex steps
 */
export function hexDistance(a, b) {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
}

/**
 * Hash cube coordinates for Map/Set usage
 * @param {{q: number, r: number, s: number}} cube
 * @returns {string} Unique hash string
 */
export function hashCube(cube) {
  return `${cube.q},${cube.r},${cube.s}`;
}

// ============================================
// SECTION 3: A* Pathfinding Implementation
// ============================================

/**
 * Find optimal hex path using A* algorithm
 * @param {{x: number, y: number}} startWorld - Start position
 * @param {{x: number, y: number}} endWorld - End position
 * @param {Object} game - Game state for edge usage calculation
 * @returns {Array<{x: number, y: number}>} Path waypoints
 */
export function hexAStar(startWorld, endWorld, game) {
  // Convert to cube coordinates
  const startCube = pixelToCube(startWorld.x, startWorld.y);
  const endCube = pixelToCube(endWorld.x, endWorld.y);
  
  // Check if start and end are the same
  if (hexDistance(startCube, endCube) < 1) {
    return [startWorld, endWorld];
  }
  
  // Initialize A* data structures
  const openSet = [startCube];
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();
  
  // Calculate edge usage for bundling incentive
  const edgeUsage = calculateEdgeUsage(game);
  
  // Initialize scores
  const startHash = hashCube(startCube);
  gScore.set(startHash, 0);
  fScore.set(startHash, hexDistance(startCube, endCube));
  
  // A* main loop
  let iterations = 0;
  const MAX_ITERATIONS = 1000;  // Prevent infinite loops
  
  while (openSet.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    
    // Find node with lowest fScore
    let currentIdx = 0;
    let currentFScore = Infinity;
    
    for (let i = 0; i < openSet.length; i++) {
      const score = fScore.get(hashCube(openSet[i])) || Infinity;
      if (score < currentFScore) {
        currentFScore = score;
        currentIdx = i;
      }
    }
    
    const current = openSet[currentIdx];
    const currentHash = hashCube(current);
    
    // Check if we've reached the goal
    if (hexDistance(current, endCube) < 1) {
      return reconstructPath(cameFrom, current, startWorld, endWorld);
    }
    
    // Remove current from openSet
    openSet.splice(currentIdx, 1);
    
    // Examine neighbors
    for (const neighbor of getHexNeighbors(current)) {
      const neighborHash = hashCube(neighbor);
      
      // Calculate edge cost with bundling incentive
      const edgeKey = `${currentHash}-${neighborHash}`;
      const reverseKey = `${neighborHash}-${currentHash}`;
      const usage = (edgeUsage.get(edgeKey) || 0) + (edgeUsage.get(reverseKey) || 0);
      
      // Lower cost for already-used edges (bundling)
      const bundlingBonus = Math.max(0.5, 1 - 0.3 * Math.min(usage, 3));
      const baseCost = 1.0;
      const edgeCost = baseCost * bundlingBonus;
      
      // Calculate tentative gScore
      const tentativeG = (gScore.get(currentHash) || Infinity) + edgeCost;
      
      // Check if this path is better
      if (tentativeG < (gScore.get(neighborHash) || Infinity)) {
        // Record path
        cameFrom.set(neighborHash, current);
        gScore.set(neighborHash, tentativeG);
        fScore.set(neighborHash, tentativeG + hexDistance(neighbor, endCube));
        
        // Add to openSet if not already there
        if (!openSet.some(n => hashCube(n) === neighborHash)) {
          openSet.push(neighbor);
        }
      }
    }
  }
  
  // No path found - return direct line
  console.warn('No hex path found, using direct connection');
  return [startWorld, endWorld];
}

/**
 * Reconstruct path from A* came-from map
 * @private
 */
function reconstructPath(cameFrom, current, startWorld, endWorld) {
  const path = [current];
  let currentHash = hashCube(current);
  
  while (cameFrom.has(currentHash)) {
    current = cameFrom.get(currentHash);
    path.unshift(current);
    currentHash = hashCube(current);
  }
  
  // Convert cube path to world coordinates
  const worldPath = path.map(cube => cubeToPixel(cube.q, cube.r, cube.s));
  
  // Ensure exact start and end points are included
  if (worldPath.length > 0) {
    const firstHex = worldPath[0];
    const lastHex = worldPath[worldPath.length - 1];
    
    // Add connector from actual start to first hex if needed
    const startDist = Math.hypot(startWorld.x - firstHex.x, startWorld.y - firstHex.y);
    if (startDist > 5) {
      worldPath.unshift(startWorld);
    }
    
    // Add connector from last hex to actual end if needed
    const endDist = Math.hypot(endWorld.x - lastHex.x, endWorld.y - lastHex.y);
    if (endDist > 5) {
      worldPath.push(endWorld);
    }
  }
  
  return worldPath;
}

// ============================================
// SECTION 4: Corridor Bundling System
// ============================================

/**
 * Calculate edge usage across all existing lines
 * @param {Object} game - Game state
 * @returns {Map<string, number>} Edge usage counts
 */
export function calculateEdgeUsage(game) {
  const usage = new Map();
  
  if (!game || !game.lines) return usage;
  
  for (const line of game.lines) {
    if (!line || !line.waypoints || line.waypoints.length < 2) continue;
    
    for (let i = 0; i < line.waypoints.length - 1; i++) {
      const a = pixelToCube(line.waypoints[i].x, line.waypoints[i].y);
      const b = pixelToCube(line.waypoints[i + 1].x, line.waypoints[i + 1].y);
      
      // Skip if points are too close (not actual hex edges)
      if (hexDistance(a, b) > 1.5) continue;
      
      const edgeKey = `${hashCube(a)}-${hashCube(b)}`;
      usage.set(edgeKey, (usage.get(edgeKey) || 0) + 1);
    }
  }
  
  return usage;
}

/**
 * Apply corridor bundling to path
 * @param {Array<{x: number, y: number}>} path - Original path
 * @param {Array} existingLines - Existing lines for parallel detection
 * @param {number} lineId - ID of current line
 * @returns {Array<{x: number, y: number}>} Bundled path
 */
export function applyCorridorBundling(path, existingLines, lineId) {
  if (!path || path.length < 2) return path;
  
  const BUNDLE_DISTANCE = 15;  // Pixel offset between parallel routes
  const bundledPath = [];
  
  for (let i = 0; i < path.length; i++) {
    const point = path[i];
    let offset = {x: 0, y: 0};
    
    // Check segments before and after this point
    if (i > 0 && i < path.length - 1) {
      const prev = path[i - 1];
      const next = path[i + 1];
      
      // Find parallel segments in existing lines
      let parallelCount = 0;
      
      for (const line of existingLines) {
        if (!line || line.id === lineId || !line.waypoints) continue;
        
        // Check if this line has a parallel segment
        for (let j = 0; j < line.waypoints.length - 1; j++) {
          const lineSegStart = line.waypoints[j];
          const lineSegEnd = line.waypoints[j + 1];
          
          if (areSegmentsParallel(prev, next, lineSegStart, lineSegEnd)) {
            parallelCount++;
          }
        }
      }
      
      // Apply offset if parallel routes exist
      if (parallelCount > 0) {
        const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
        const perpAngle = angle + Math.PI / 2;
        
        // Stack parallel routes with consistent spacing
        const offsetDistance = BUNDLE_DISTANCE * (parallelCount % 3 - 1);
        
        offset.x = Math.cos(perpAngle) * offsetDistance;
        offset.y = Math.sin(perpAngle) * offsetDistance;
      }
    }
    
    bundledPath.push({
      x: point.x + offset.x,
      y: point.y + offset.y
    });
  }
  
  return bundledPath;
}

/**
 * Check if two segments are parallel
 * @private
 */
function areSegmentsParallel(a1, a2, b1, b2, tolerance = 0.1) {
  const angle1 = Math.atan2(a2.y - a1.y, a2.x - a1.x);
  const angle2 = Math.atan2(b2.y - b1.y, b2.x - b1.x);
  
  let diff = Math.abs(angle1 - angle2);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  
  return diff < tolerance || Math.abs(diff - Math.PI) < tolerance;
}

// ============================================
// SECTION 5: Terminal Bubble Pattern
// ============================================

/**
 * Create terminal bubble approach pattern for hub
 * @param {Object} hubStation - Hub station object
 * @param {Array<Object>} approachingLines - Lines approaching hub
 * @param {Object} game - Game state
 * @returns {Object} Terminal bubble configuration
 */
export function createTerminalBubble(hubStation, approachingLines, game) {
  if (!hubStation || !approachingLines) return null;
  
  const BUBBLE_RADIUS = HEX_SIZE * 2;
  const APPROACH_ANGLES = 12;  // 30-degree increments
  const angleStep = (2 * Math.PI) / APPROACH_ANGLES;
  
  const bubble = {
    center: {x: hubStation.x, y: hubStation.y},
    radius: BUBBLE_RADIUS,
    approaches: []
  };
  
  // Assign approach angles to minimize crossings
  const usedAngles = new Set();
  
  for (const line of approachingLines) {
    if (!line || !line.stations) continue;
    
    // Find the station before the hub in this line
    const hubIdx = line.stations.indexOf(hubStation.id);
    if (hubIdx <= 0) continue;
    
    const prevStationId = line.stations[hubIdx - 1];
    const prevStation = game.stations[prevStationId];
    if (!prevStation) continue;
    
    // Calculate ideal approach angle
    const idealAngle = Math.atan2(
      hubStation.y - prevStation.y,
      hubStation.x - prevStation.x
    );
    
    // Snap to nearest 30-degree increment
    const snappedIdx = Math.round(idealAngle / angleStep) % APPROACH_ANGLES;
    const snappedAngle = snappedIdx * angleStep;
    
    // Find available angle slot
    let finalAngle = snappedAngle;
    let attempts = 0;
    
    while (usedAngles.has(finalAngle) && attempts < APPROACH_ANGLES) {
      attempts++;
      finalAngle = ((snappedIdx + attempts) % APPROACH_ANGLES) * angleStep;
    }
    
    usedAngles.add(finalAngle);
    
    // Create approach point
    bubble.approaches.push({
      lineId: line.id,
      angle: finalAngle,
      entry: {
        x: hubStation.x + Math.cos(finalAngle) * BUBBLE_RADIUS,
        y: hubStation.y + Math.sin(finalAngle) * BUBBLE_RADIUS
      }
    });
  }
  
  return bubble;
}

// ============================================
// SECTION 6: Compatibility Layer
// ============================================

/**
 * Legacy function wrapper for backward compatibility
 * @deprecated Use hexAStar instead
 */
export function createHexPath(ax, ay, bx, by, size) {
  console.warn('createHexPath is deprecated, use hexAStar');
  return hexAStar({x: ax, y: ay}, {x: bx, y: by}, null);
}

/**
 * Legacy angle snapping for compatibility
 * @deprecated Hex angles are automatic
 */
export function snapAngle45(rad) {
  // Map to nearest 60-degree angle instead
  const step = Math.PI / 3;  // 60 degrees
  return Math.round(rad / step) * step;
}

/**
 * Legacy grid snapping
 * @deprecated Use snapToHexVertex
 */
export function snapToGrid(x, y, size) {
  return snapToHexVertex(x, y);
}

// ============================================
// SECTION 7: Performance Cache
// ============================================

const pathCache = new Map();
const CACHE_SIZE = 500;

/**
 * Get cached hex path or calculate new one
 * @param {Object} start - Start position
 * @param {Object} end - End position
 * @param {Object} game - Game state
 * @returns {Array} Path waypoints
 */
export function getCachedHexPath(start, end, game) {
  const cacheKey = `${Math.round(start.x)},${Math.round(start.y)}-${Math.round(end.x)},${Math.round(end.y)}`;
  
  if (pathCache.has(cacheKey)) {
    return [...pathCache.get(cacheKey)];  // Return copy
  }
  
  const path = hexAStar(start, end, game);
  
  // Manage cache size
  if (pathCache.size >= CACHE_SIZE) {
    const firstKey = pathCache.keys().next().value;
    pathCache.delete(firstKey);
  }
  
  pathCache.set(cacheKey, path);
  return path;
}

/**
 * Clear path cache when lines change
 */
export function clearPathCache() {
  pathCache.clear();
}

// ============================================
// SECTION 8: Debug Helpers
// ============================================

/**
 * Get debug info for current hex grid state
 */
export function getHexDebugInfo(game) {
  return {
    cacheSize: pathCache.size,
    edgeUsage: calculateEdgeUsage(game),
    hexSize: HEX_SIZE,
    gridEnabled: true
  };
}
```

#### Step 1.2: Verification Test
After replacing hexgrid.js, test it immediately:

```javascript
// In browser console (F12):
// Test coordinate conversion
const testPoint = {x: 100, y: 100};
const cube = pixelToCube(testPoint.x, testPoint.y);
console.log('Cube coords:', cube);  // Should show {q, r, s} with q+r+s=0

const back = cubeToPixel(cube.q, cube.r, cube.s);
console.log('Back to pixel:', back);  // Should be close to original
```

### PHASE 2: Update Line Creation System

**File:** `src/systems/lines_final.js`

#### Step 2.1: Import New Hex Functions
Find the import section at the top and update:

```javascript
// OLD:
import { createHexPath } from './hexgrid.js';

// NEW:
import { 
  hexAStar, 
  applyCorridorBundling, 
  snapToHexVertex,
  clearPathCache 
} from './hexgrid.js';
```

#### Step 2.2: Replace rebuildWaypointsForLine Function
Find and completely replace this function:

```javascript
export function rebuildWaypointsForLine(game, line) {
  if (!line || !line.stations || line.stations.length < 2) {
    line.waypoints = null;
    return;
  }
  
  const waypoints = [];
  
  for (let i = 0; i < line.stations.length - 1; i++) {
    const stationA = game.stations[line.stations[i]];
    const stationB = game.stations[line.stations[i + 1]];
    
    if (!stationA || !stationB) continue;
    
    // Get hex path between stations
    const hexPath = hexAStar(
      {x: stationA.x, y: stationA.y},
      {x: stationB.x, y: stationB.y},
      game
    );
    
    // Apply bundling if multiple routes exist
    const bundledPath = game.lines.length > 1 
      ? applyCorridorBundling(hexPath, game.lines, line.id)
      : hexPath;
    
    // Add to waypoints (skip first point if not first segment to avoid duplicates)
    if (i === 0) {
      waypoints.push(...bundledPath);
    } else {
      waypoints.push(...bundledPath.slice(1));
    }
  }
  
  // Clear cache when lines change
  clearPathCache();
  
  line.waypoints = waypoints;
}
```

### PHASE 3: Update Rendering System

**File:** `src/render/lines_final.js`

#### Step 3.1: Add Rounded Corner Function
Add this new function before drawMultiStationLine:

```javascript
/**
 * Draw line with rounded corners at waypoints
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} waypoints - Path waypoints
 * @param {number} radius - Corner radius
 */
function drawRoundedPath(ctx, waypoints, radius = 20) {
  if (!waypoints || waypoints.length < 2) return;
  
  ctx.beginPath();
  ctx.moveTo(waypoints[0].x, waypoints[0].y);
  
  for (let i = 1; i < waypoints.length - 1; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const next = waypoints[i + 1];
    
    // Calculate direction vectors
    const v1 = {
      x: curr.x - prev.x,
      y: curr.y - prev.y
    };
    const v2 = {
      x: next.x - curr.x,
      y: next.y - curr.y
    };
    
    // Calculate lengths
    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);
    
    if (len1 < 0.001 || len2 < 0.001) {
      // Points too close, just draw straight
      ctx.lineTo(curr.x, curr.y);
      continue;
    }
    
    // Normalize vectors
    v1.x /= len1;
    v1.y /= len1;
    v2.x /= len2;
    v2.y /= len2;
    
    // Calculate angle between vectors
    const dot = v1.x * v2.x + v1.y * v2.y;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    
    // Only round corners with significant angle change
    if (angle > 0.3 && angle < Math.PI - 0.3) {
      // Calculate safe corner radius
      const maxRadius = Math.min(radius, len1 * 0.4, len2 * 0.4);
      
      // Calculate corner points
      const cornerStart = {
        x: curr.x - v1.x * maxRadius,
        y: curr.y - v1.y * maxRadius
      };
      
      const cornerEnd = {
        x: curr.x + v2.x * maxRadius,
        y: curr.y + v2.y * maxRadius
      };
      
      // Draw to corner start
      ctx.lineTo(cornerStart.x, cornerStart.y);
      
      // Draw rounded corner
      ctx.quadraticCurveTo(curr.x, curr.y, cornerEnd.x, cornerEnd.y);
    } else {
      // Nearly straight or very sharp - no rounding
      ctx.lineTo(curr.x, curr.y);
    }
  }
  
  // Draw to last point
  const last = waypoints[waypoints.length - 1];
  ctx.lineTo(last.x, last.y);
  
  ctx.stroke();
}
```

#### Step 3.2: Update drawMultiStationLine
Find the section where the line path is drawn and update:

```javascript
// Find this section in drawMultiStationLine:
// OLD:
ctx.beginPath();
// ... existing line drawing code ...
ctx.stroke();

// REPLACE WITH:
if (line.waypoints && line.waypoints.length >= 2) {
  // Use rounded path drawing
  drawRoundedPath(ctx, line.waypoints, game.config.lineCornerRadius || 20);
} else {
  // Fallback to simple line if no waypoints
  ctx.beginPath();
  for (let i = 0; i < line.stations.length; i++) {
    const station = game.stations[line.stations[i]];
    if (!station) continue;
    
    if (i === 0) {
      ctx.moveTo(station.x, station.y);
    } else {
      ctx.lineTo(station.x, station.y);
    }
  }
  ctx.stroke();
}
```

### PHASE 4: Update Input System

#### Step 4.1: Import Hex Functions
Update imports at the top:

```javascript
// ADD to existing imports:
import { hexAStar, snapToHexVertex } from '../systems/hexgrid.js';
```

#### Step 4.2: Update Mouse Move Preview
Find the `pointermove` event handler and update the preview path calculation:

```javascript
canvas.addEventListener('pointermove', (ev) => {
  // ... existing code for getting world coordinates ...
  
  if (dragStartStation != null) {
    const start = game.stations[dragStartStation];
    const endIdx = game.hoveredStationIdx;
    const end = (endIdx !== -1 ? game.stations[endIdx] : world);
    
    // NEW: Use hex pathfinding for preview
    const hexPath = hexAStar(
      {x: start.x, y: start.y},
      {x: end.x, y: end.y},
      game
    );
    
    onPreview({
      points: hexPath,
      valid: true,
      snapStation: endIdx,
      isHexSnapped: true  // NEW: Flag for hex-snapped preview
    });
    
    if (DEBUG) console.log('hex preview from', dragStartStation, 'to', endIdx);
  } 
  else if (selectedLine && isDown) {
    // ... existing line insertion preview code ...
    // UPDATE this section similarly to use hexAStar
    const endIdx = game.hoveredStationIdx;
    const end = (endIdx !== -1 ? game.stations[endIdx] : world);
    const start = lineInsertAnchor || world;
    
    // NEW: Use hex pathfinding
    const hexPath = hexAStar(
      {x: start.x, y: start.y},
      {x: end.x, y: end.y},
      game
    );
    
    // Validate as before
    let valid = true;
    if (endIdx !== -1) {
      const v = canInsertStationAt(game, selectedLine, endIdx, insertPosition);
      valid = v.valid;
    }
    
    onPreview({ 
      points: hexPath, 
      valid, 
      snapStation: endIdx,
      isHexSnapped: true 
    });
  }
});
```

### PHASE 5: Add Grid Visualization

**File:** `src/render/draw.js`

#### Step 5.1: Add Hex Grid Drawing Functions
Add these functions to draw.js:

```javascript
import { pixelToCube, cubeToPixel } from '../systems/hexgrid.js';

/**
 * Draw hexagonal grid overlay
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} camera - Camera object
 * @param {Object} config - Game configuration
 */
export function drawHexGrid(ctx, camera, config) {
  // Only draw if enabled in config
  if (!config.hexGrid || !config.hexGrid.showGrid) return;
  
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);
  
  const hexSize = config.hexGrid.size || 44;
  const bounds = getViewportHexBounds(camera, hexSize);
  
  // Set grid style
  ctx.strokeStyle = config.hexGrid.gridColor || 'rgba(59, 130, 246, 0.06)';
  ctx.lineWidth = 1 / camera.scale;
  
  // Draw each visible hex
  for (let q = bounds.minQ; q <= bounds.maxQ; q++) {
    for (let r = bounds.minR; r <= bounds.maxR; r++) {
      const s = -q - r;
      const center = cubeToPixel(q, r, s);
      drawHexagon(ctx, center.x, center.y, hexSize);
    }
  }
  
  ctx.restore();
}

/**
 * Draw a single hexagon
 * @private
 */
function drawHexagon(ctx, centerX, centerY, size) {
  ctx.beginPath();
  
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;  // 60 degrees per side
    const x = centerX + size * Math.cos(angle);
    const y = centerY + size * Math.sin(angle);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.closePath();
  ctx.stroke();
}

/**
 * Calculate visible hex bounds based on viewport
 * @private
 */
function getViewportHexBounds(camera, hexSize) {
  const canvas = camera.canvas || document.getElementById('c');
  const viewWidth = canvas.width / camera.scale;
  const viewHeight = canvas.height / camera.scale;
  
  // Calculate viewport corners in world space
  const topLeft = {
    x: -camera.x / camera.scale - viewWidth / 2,
    y: -camera.y / camera.scale - viewHeight / 2
  };
  
  const bottomRight = {
    x: topLeft.x + viewWidth,
    y: topLeft.y + viewHeight
  };
  
  // Convert to cube coordinates with padding
  const tlCube = pixelToCube(topLeft.x, topLeft.y);
  const brCube = pixelToCube(bottomRight.x, bottomRight.y);
  
  // Add padding to ensure smooth scrolling
  const padding = 3;
  
  return {
    minQ: Math.floor(tlCube.q) - padding,
    maxQ: Math.ceil(brCube.q) + padding,
    minR: Math.floor(tlCube.r) - padding,
    maxR: Math.ceil(brCube.r) + padding
  };
}
```

#### Step 5.2: Integrate Grid Drawing into Main Loop
In `src/main.js`, find the render section and add grid drawing:

```javascript
// Find the render section in the game loop
// After clearScreen and before drawing routes, add:

// Draw hex grid (if enabled)
if (game.config.hexGrid && game.config.hexGrid.showGrid) {
  drawHexGrid(ctx, game.camera, game.config);
}
```

### PHASE 6: Configuration Updates

**File:** `src/maps/airspace.js`

#### Step 6.1: Update Configuration
Add/update the hexGrid configuration:

```javascript
export const AIRSPACE_CONFIG = {
  // ... existing config ...
  
  // UPDATED/NEW: Hexagonal grid configuration
  hexGrid: {
    size: 44,              // Hex edge length in pixels
    snapRadius: 60,        // Snap distance for stations
    angleSnap: Math.PI/3,  // 60-degree angle snapping
    enabled: true,         // Enable hex routing
    showGrid: false,       // Show grid overlay (set true for debugging)
    
    // Corridor bundling parameters
    bundleThreshold: 30,      // Distance to consider routes parallel
    corridorSpacing: 15,      // Pixel offset between parallel routes
    maxBundleCount: 3,        // Maximum routes in a bundle
    
    // Terminal patterns
    terminalBubbleRadius: 88, // 2x hex size for hub approaches
    hubApproachAngles: 12,    // Number of approach slots (30° each)
    
    // Pathfinding parameters
    bundlingBonus: 0.4,       // Cost reduction for using existing corridors
    straightPenalty: 1.2,     // Penalty for straight lines (encourage hex)
    
    // Rendering parameters
    cornerRadius: 20,         // Radius for rounded corners
    gridOpacity: 0.06,        // Grid line opacity
    gridColor: '#3b82f6',     // Grid color (radar blue)
    
    // Performance
    enableCache: true,        // Cache pathfinding results
    cacheSize: 500           // Maximum cached paths
  },
  
  // Ensure line corner radius matches hex config
  lineCornerRadius: 20,  // Should match hexGrid.cornerRadius
  
  // ... rest of existing config ...
};
```

### PHASE 7: Debug System

**File:** Create new `src/utils/hex_debug.js`

```javascript
// src/utils/hex_debug.js - Debug utilities for hex system

import { 
  pixelToCube, 
  cubeToPixel, 
  calculateEdgeUsage,
  getHexDebugInfo 
} from '../systems/hexgrid.js';

/**
 * Draw hex debug overlay
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} camera
 * @param {Object} game
 */
export function drawHexDebugOverlay(ctx, camera, game) {
  if (!game.debugHexGrid) return;
  
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);
  
  // Draw hex vertices as dots
  const hexSize = game.config.hexGrid.size;
  const viewBounds = getDebugViewBounds(camera, hexSize);
  
  // Draw vertex points
  ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
  for (let q = viewBounds.minQ; q <= viewBounds.maxQ; q++) {
    for (let r = viewBounds.minR; r <= viewBounds.maxR; r++) {
      const pos = cubeToPixel(q, r, -q - r);
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3 / camera.scale, 0, Math.PI * 2);
      ctx.fill();
      
      // Show coordinates when zoomed in
      if (camera.scale > 1.2) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `${10 / camera.scale}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${q},${r}`, pos.x, pos.y - 8 / camera.scale);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
      }
    }
  }
  
  // Draw edge usage heat map
  const edgeUsage = calculateEdgeUsage(game);
  
  for (const [edgeKey, usage] of edgeUsage) {
    if (usage <= 0) continue;
    
    // Parse edge key
    const [fromStr, toStr] = edgeKey.split('-');
    if (!fromStr || !toStr) continue;
    
    const [fq, fr, fs] = fromStr.split(',').map(Number);
    const [tq, tr, ts] = toStr.split(',').map(Number);
    
    const from = cubeToPixel(fq, fr, fs);
    const to = cubeToPixel(tq, tr, ts);
    
    // Color based on usage
    const intensity = Math.min(usage / 3, 1);
    ctx.strokeStyle = `rgba(255, ${255 - intensity * 100}, 0, ${0.3 + intensity * 0.5})`;
    ctx.lineWidth = (2 + usage) / camera.scale;
    
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    
    // Show usage count
    if (camera.scale > 1.5) {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = `bold ${12 / camera.scale}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(usage.toString(), midX, midY);
    }
  }
  
  // Draw debug info panel
  drawDebugPanel(ctx, camera, game);
  
  ctx.restore();
}

/**
 * Draw debug information panel
 * @private
 */
function drawDebugPanel(ctx, camera, game) {
  const info = getHexDebugInfo(game);
  
  // Position in screen space
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  
  // Draw panel background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(10, 100, 200, 150);
  
  // Draw info text
  ctx.fillStyle = '#00ff00';
  ctx.font = '12px monospace';
  
  const lines = [
    `Hex Debug Mode`,
    `----------------`,
    `Cache Size: ${info.cacheSize}`,
    `Grid Size: ${info.hexSize}px`,
    `Total Edges: ${info.edgeUsage.size}`,
    `Bundled Routes: ${countBundledRoutes(info.edgeUsage)}`,
    `Grid: ${info.gridEnabled ? 'ENABLED' : 'DISABLED'}`,
    ``,
    `Press H to toggle grid`,
    `Press G to toggle debug`
  ];
  
  lines.forEach((line, i) => {
    ctx.fillText(line, 15, 120 + i * 14);
  });
  
  ctx.restore();
}

/**
 * Get viewport bounds for debug drawing
 * @private
 */
function getDebugViewBounds(camera, hexSize) {
  const canvas = document.getElementById('c');
  const width = canvas.width / camera.scale;
  const height = canvas.height / camera.scale;
  
  const margin = hexSize * 3;
  
  const topLeft = pixelToCube(
    -camera.x / camera.scale - width / 2 - margin,
    -camera.y / camera.scale - height / 2 - margin
  );
  
  const bottomRight = pixelToCube(
    -camera.x / camera.scale + width / 2 + margin,
    -camera.y / camera.scale + height / 2 + margin
  );
  
  return {
    minQ: Math.floor(topLeft.q) - 1,
    maxQ: Math.ceil(bottomRight.q) + 1,
    minR: Math.floor(topLeft.r) - 1,
    maxR: Math.ceil(bottomRight.r) + 1
  };
}

/**
 * Count bundled routes from edge usage
 * @private
 */
function countBundledRoutes(edgeUsage) {
  let bundled = 0;
  for (const usage of edgeUsage.values()) {
    if (usage > 1) bundled++;
  }
  return bundled;
}

/**
 * Initialize debug keyboard shortcuts
 */
export function initHexDebugControls(game) {
  document.addEventListener('keydown', (e) => {
    // H key - toggle hex grid
    if (e.key === 'h' || e.key === 'H') {
      if (game.config.hexGrid) {
        game.config.hexGrid.showGrid = !game.config.hexGrid.showGrid;
        game.needsRedraw = true;
        console.log('Hex grid:', game.config.hexGrid.showGrid ? 'ON' : 'OFF');
      }
    }
    
    // G key - toggle debug overlay
    if (e.key === 'g' || e.key === 'G') {
      game.debugHexGrid = !game.debugHexGrid;
      game.needsRedraw = true;
      console.log('Hex debug:', game.debugHexGrid ? 'ON' : 'OFF');
    }
  });
}
```

#### Step 7.1: Integrate Debug System
In `src/main.js`, add debug initialization and rendering:

```javascript
// At the top, add import
import { drawHexDebugOverlay, initHexDebugControls } from './utils/hex_debug.js';

// After game initialization, add:
initHexDebugControls(game);

// In the render loop, after drawing routes but before UI:
if (game.debugHexGrid) {
  drawHexDebugOverlay(ctx, game.camera, game);
}
```

---

## Error Handling & Guardrails

### Critical Error Prevention

#### 1. Null Safety Checks
Every function MUST check for null/undefined:

```javascript
// ALWAYS check inputs
export function hexAStar(startWorld, endWorld, game) {
  // Guardrail 1: Validate inputs
  if (!startWorld || !endWorld) {
    console.error('hexAStar: Invalid start or end position');
    return [];
  }
  
  if (!game || !game.lines) {
    console.warn('hexAStar: No game state, using direct path');
    return [startWorld, endWorld];
  }
  
  // ... rest of function
}
```

#### 2. Infinite Loop Prevention
All pathfinding MUST have iteration limits:

```javascript
const MAX_ITERATIONS = 1000;
let iterations = 0;

while (openSet.length > 0 && iterations < MAX_ITERATIONS) {
  iterations++;
  // ... pathfinding logic
}

if (iterations >= MAX_ITERATIONS) {
  console.error('Pathfinding exceeded iteration limit');
  return [startWorld, endWorld];  // Fallback to direct line
}
```

#### 3. Coordinate Validation
Always validate cube coordinate constraint:

```javascript
function validateCube(q, r, s) {
  const sum = q + r + s;
  if (Math.abs(sum) > 0.001) {
    console.error(`Invalid cube coordinates: ${q},${r},${s} (sum=${sum})`);
    return false;
  }
  return true;
}
```

### Performance Guardrails

#### 1. Cache Size Limits
```javascript
const CACHE_SIZE = 500;  // NEVER exceed this

if (pathCache.size >= CACHE_SIZE) {
  // Remove oldest entry
  const firstKey = pathCache.keys().next().value;
  pathCache.delete(firstKey);
}
```

#### 2. Viewport Culling
Only process visible hexes:

```javascript
// Don't process hexes outside viewport
if (!isInViewport(hex, camera)) continue;
```

#### 3. Frame Rate Protection
```javascript
// Limit expensive operations per frame
let operationsThisFrame = 0;
const MAX_OPS_PER_FRAME = 10;

if (operationsThisFrame++ > MAX_OPS_PER_FRAME) {
  // Defer to next frame
  requestAnimationFrame(() => continueProcessing());
  return;
}
```

---

## Testing Protocol

### Phase 1: Unit Tests (Console)
Run these in browser console after each phase:

```javascript
// Test 1: Coordinate conversion
console.group('Hex Coordinate Tests');
const test1 = pixelToCube(0, 0);
console.assert(test1.q === 0 && test1.r === 0 && test1.s === 0, 'Origin test failed');

const test2 = cubeToPixel(1, -1, 0);
const back2 = pixelToCube(test2.x, test2.y);
console.assert(back2.q === 1 && back2.r === -1, 'Round-trip test failed');
console.groupEnd();

// Test 2: Pathfinding
console.group('Pathfinding Tests');
const path = hexAStar({x: 0, y: 0}, {x: 100, y: 100}, game);
console.assert(path && path.length >= 2, 'Path generation failed');
console.log('Path length:', path.length);
console.groupEnd();

// Test 3: Performance
console.group('Performance Tests');
const t0 = performance.now();
for (let i = 0; i < 100; i++) {
  hexAStar({x: 0, y: 0}, {x: 200, y: 200}, game);
}
const t1 = performance.now();
console.log(`100 paths in ${t1 - t0}ms (avg: ${(t1 - t0) / 100}ms)`);
console.assert((t1 - t0) < 1000, 'Performance issue detected');
console.groupEnd();
```

### Phase 2: Visual Tests
1. Press 'H' to toggle hex grid - verify grid appears
2. Press 'G' to toggle debug mode - verify debug overlay
3. Draw a route - verify it follows hex angles
4. Draw parallel routes - verify bundling occurs

### Phase 3: Gameplay Tests
- [ ] Can still draw routes normally
- [ ] Routes snap to hex grid
- [ ] Extension still works
- [ ] Removal still works
- [ ] Auto-routing still functions
- [ ] No performance degradation

---

## Rollback Procedures

### Quick Rollback (< 5 minutes)
```bash
# From C:\\Users\\frmar\
ewhex\\
copy backup_original\\hexgrid_original.js src\\systems\\hexgrid.js
copy backup_original\\lines_final_original.js src\\systems\\lines_final.js
copy backup_original\\input_final_original.js src\\ui\\input_final.js
copy backup_original\\render_lines_original.js src\\render\\lines_final.js
```

### Git Rollback
```bash
git reset --hard v1.0-octilinear
```

### Config Disable
In `src/maps/airspace.js`, set:
```javascript
hexGrid: {
  enabled: false,  // Disables hex routing
  // ... rest of config
}
```

---

## Performance Benchmarks

### Target Metrics
- Pathfinding: < 10ms per route
- Rendering: 60 FPS with 20+ routes
- Memory: < 50MB for cache
- Input lag: < 16ms

### Monitoring Code
```javascript
// Add to main.js for performance monitoring
let frameCount = 0;
let lastFPSUpdate = 0;

function updateFPS(timestamp) {
  frameCount++;
  
  if (timestamp - lastFPSUpdate >= 1000) {
    console.log(`FPS: ${frameCount}`);
    frameCount = 0;
    lastFPSUpdate = timestamp;
  }
}

// In game loop:
updateFPS(ts);
```

---

## Final Verification Checklist

### Before Deployment
- [ ] All original files backed up
- [ ] Git commit created with tag
- [ ] All phases implemented in order
- [ ] Unit tests pass
- [ ] Visual tests pass
- [ ] Gameplay tests pass
- [ ] Performance benchmarks met
- [ ] Debug controls working (H and G keys)
- [ ] Rollback tested and verified

### Known Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Routes not appearing | Blank lines after drawing | Check rebuildWaypointsForLine is called |
| Jagged paths | No hex snapping visible | Verify hexGrid.enabled = true |
| Performance lag | FPS drops below 30 | Reduce CACHE_SIZE, disable debug |
| Routes cross randomly | No bundling | Check calculateEdgeUsage is working |
| Can't draw routes | Input not responding | Check hexAStar returns valid path |

---

## Support & Troubleshooting

### Console Commands for Debugging
```javascript
// Check hex system status
MM.gameState.config.hexGrid

// Test pathfinding
hexAStar({x:0,y:0}, {x:100,y:100}, MM.gameState)

// Clear cache if issues
clearPathCache()

// Toggle debug mode
MM.gameState.debugHexGrid = true

// Check FPS
MM.gameState.needsRedraw = true
```

### Emergency Fixes
If the game becomes unplayable:
1. Open console (F12)
2. Run: `MM.gameState.config.hexGrid.enabled = false`
3. Refresh page
4. Routes will use old system temporarily

---

## End of Implementation Guide

This completes the comprehensive hexagonal lattice implementation guide. Follow each phase in order, test thoroughly after each step, and maintain backups throughout the process.

**Remember:** This is a visual upgrade that preserves the core \"draw routes\" gameplay. Players should notice cleaner, more organized routes but the fundamental interaction remains unchanged.
`
}
R