// Hexagonal lattice routing (true 60°). Provides hex conversions and A* pathfinding.

// Defaults; size is usually supplied via config, but we keep a sane fallback.
const DEFAULT_HEX_SIZE = 44;

// Direction angles (for reference)
export const HEX_ANGLES = [0, 60, 120, 180, 240, 300].map(d => d * Math.PI / 180);

// Cube <-> pixel conversions for pointy-top hex grid
export function cubeToPixel(q, r, s, size = DEFAULT_HEX_SIZE) {
  const x = size * (1.5 * q);
  const y = size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
  return { x, y };
}

export function pixelToCube(x, y, size = DEFAULT_HEX_SIZE) {
  const q = (2 / 3) * (x / size);
  const r = (-1 / 3) * (x / size) + (Math.sqrt(3) / 3) * (y / size);
  const s = -q - r;
  return roundCube(q, r, s);
}

export function roundCube(q, r, s) {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qd = Math.abs(rq - q);
  const rd = Math.abs(rr - r);
  const sd = Math.abs(rs - s);

  if (qd > rd && qd > sd) rq = -rr - rs;
  else if (rd > sd) rr = -rq - rs;
  else rs = -rq - rr;

  return { q: rq, r: rr, s: rs };
}

// Snap a world coordinate to nearest hex vertex
export function snapToHexVertex(worldX, worldY, size = DEFAULT_HEX_SIZE) {
  const cube = pixelToCube(worldX, worldY, size);
  return cubeToPixel(cube.q, cube.r, cube.s, size);
}

// Neighbor coordinates in cube space
export function getHexNeighbors(cube) {
  const dirs = [
    { q: 1, r: -1, s: 0 },
    { q: 1, r: 0, s: -1 },
    { q: 0, r: 1, s: -1 },
    { q: -1, r: 1, s: 0 },
    { q: -1, r: 0, s: 1 },
    { q: 0, r: -1, s: 1 }
  ];
  return dirs.map(d => ({ q: cube.q + d.q, r: cube.r + d.r, s: cube.s + d.s }));
}

function hexDistance(a, b) {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
}

// Minimal A* search on infinite hex lattice. Stateless and game-agnostic for compatibility.
export function hexAStar(startWorld, endWorld, size = DEFAULT_HEX_SIZE) {
  const start = pixelToCube(startWorld.x, startWorld.y, size);
  const goal = pixelToCube(endWorld.x, endWorld.y, size);

  // If start and goal are the same or very close, return direct path
  if (hexDistance(start, goal) <= 1) {
    return [startWorld, endWorld];
  }

  const key = (c) => `${c.q},${c.r},${c.s}`;
  const open = [start];
  const came = new Map();
  const g = new Map();
  const f = new Map();
  g.set(key(start), 0);
  f.set(key(start), hexDistance(start, goal));
  const inOpen = new Set([key(start)]);

  // Limit iterations to prevent infinite loops
  let iterations = 0;
  const maxIterations = 200;

  while (open.length && iterations < maxIterations) {
    iterations++;

    // Node with lowest f-score
    let idx = 0;
    for (let i = 1; i < open.length; i++) {
      if ((f.get(key(open[i])) ?? Infinity) < (f.get(key(open[idx])) ?? Infinity)) idx = i;
    }
    const current = open.splice(idx, 1)[0];
    inOpen.delete(key(current));

    if (hexDistance(current, goal) <= 1) {
      // Reconstruct path in cube space
      const pathCubes = [];
      let cur = current;
      let curKey = key(cur);
      pathCubes.unshift(cur);
      while (came.has(curKey)) {
        cur = came.get(curKey);
        curKey = key(cur);
        pathCubes.unshift(cur);
      }
      return pathCubes.map(c => cubeToPixel(c.q, c.r, c.s, size));
    }

    for (const nb of getHexNeighbors(current)) {
      const nk = key(nb);

      // Enhanced cost calculation that prefers direct paths
      let edgeCost = 1;

      // Calculate direction from current to neighbor
      const dirToCurrent = came.has(key(current)) ?
        getDirection(came.get(key(current)), current) : null;
      const dirToNeighbor = getDirection(current, nb);

      // Penalize direction changes to encourage straighter paths
      if (dirToCurrent !== null && dirToCurrent !== dirToNeighbor) {
        edgeCost += 0.1; // Small penalty for turning
      }

      // Encourage movement toward the goal
      const dirToGoal = getGeneralDirection(current, goal);
      if (dirToNeighbor === dirToGoal) {
        edgeCost -= 0.2; // Bonus for moving toward goal
      }

      const tentativeG = (g.get(key(current)) ?? Infinity) + edgeCost;
      if (tentativeG < (g.get(nk) ?? Infinity)) {
        came.set(nk, current);
        g.set(nk, tentativeG);
        // Use Manhattan distance heuristic for hex grid
        f.set(nk, tentativeG + hexDistance(nb, goal));
        if (!inOpen.has(nk)) { open.push(nb); inOpen.add(nk); }
      }
    }
  }

  // Fallback to direct line if pathfinding fails
  return [startWorld, endWorld];
}

// Get hex direction (0-5) from one cube to another
function getDirection(from, to) {
  const directions = [
    { q: 1, r: -1, s: 0 },  // 0: East
    { q: 1, r: 0, s: -1 },   // 1: Southeast
    { q: 0, r: 1, s: -1 },   // 2: Southwest
    { q: -1, r: 1, s: 0 },  // 3: West
    { q: -1, r: 0, s: 1 },  // 4: Northwest
    { q: 0, r: -1, s: 1 }   // 5: Northeast
  ];

  const diff = { q: to.q - from.q, r: to.r - from.r, s: to.s - from.s };

  for (let i = 0; i < directions.length; i++) {
    const dir = directions[i];
    if (dir.q === diff.q && dir.r === diff.r && dir.s === diff.s) {
      return i;
    }
  }
  return null;
}

// Get general direction toward goal (for heuristic)
function getGeneralDirection(from, to) {
  const diff = { q: to.q - from.q, r: to.r - from.r, s: to.s - from.s };

  // Find the dominant direction
  const abs_q = Math.abs(diff.q);
  const abs_r = Math.abs(diff.r);
  const abs_s = Math.abs(diff.s);

  if (abs_q >= abs_r && abs_q >= abs_s) {
    return diff.q > 0 ? 0 : 3; // East or West
  } else if (abs_r >= abs_s) {
    return diff.r > 0 ? 2 : 5; // Southwest or Northeast
  } else {
    return diff.s > 0 ? 4 : 1; // Northwest or Southeast
  }
}

// Aesthetic routing system that creates beautiful, harmonious networks
export function createHexPath(ax, ay, bx, by, size = DEFAULT_HEX_SIZE, game = null) {
  const start = {x: ax, y: ay};
  const end = {x: bx, y: by};

  const distance = Math.hypot(bx - ax, by - ay);

  // For short distances, use direct connection
  if (distance < size * 1.5) {
    return [start, end];
  }

  // Create aesthetically pleasing path with consideration for existing network
  return createAestheticPath(start, end, size, game);
}

// ============================================
// AESTHETIC ROUTING SYSTEM
// Creates beautiful, harmonious network patterns
// ============================================

function createAestheticPath(start, end, size, game) {
  // Analyze existing network for aesthetic patterns
  const networkAnalysis = analyzeNetworkAesthetics(start, end, game);

  // Create path based on aesthetic principles
  const basePath = createGeometricallyPleasingPath(start, end, size, networkAnalysis);

  // Apply aesthetic refinements
  return refinePathForHarmony(basePath, networkAnalysis, size);
}

function analyzeNetworkAesthetics(start, end, game) {
  const analysis = {
    symmetryAxes: [],
    dominantAngles: [],
    intersectionPoints: [],
    visualWeight: { center: {x: 0, y: 0}, balance: 0 },
    existingPatterns: [],
    colorHarmony: [],
    spacing: { min: Infinity, max: 0, average: 0 }
  };

  if (!game || !game.lines || game.lines.length === 0) {
    return analysis;
  }

  // Find dominant angles in existing network
  const angles = [];
  const intersections = [];
  const centers = [];

  for (const line of game.lines) {
    if (!line.waypoints || line.waypoints.length < 2) continue;

    // Calculate line segments and their angles
    for (let i = 0; i < line.waypoints.length - 1; i++) {
      const p1 = line.waypoints[i];
      const p2 = line.waypoints[i + 1];

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      angles.push(normalizeAngle(angle));

      // Store midpoint for pattern analysis
      centers.push({
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        length: Math.hypot(p2.x - p1.x, p2.y - p1.y)
      });
    }
  }

  // Group similar angles (within 15 degrees)
  const angleGroups = groupSimilarAngles(angles, Math.PI / 12);
  analysis.dominantAngles = angleGroups.map(group => ({
    angle: group.average,
    frequency: group.angles.length,
    strength: group.angles.length / angles.length
  })).sort((a, b) => b.strength - a.strength);

  // Calculate visual center of mass
  if (centers.length > 0) {
    const totalWeight = centers.reduce((sum, c) => sum + c.length, 0);
    analysis.visualWeight.center.x = centers.reduce((sum, c) => sum + c.x * c.length, 0) / totalWeight;
    analysis.visualWeight.center.y = centers.reduce((sum, c) => sum + c.y * c.length, 0) / totalWeight;
  }

  // Find potential symmetry axes
  analysis.symmetryAxes = findSymmetryAxes(centers);

  // Analyze spacing patterns
  const spacings = calculateSpacingPatterns(game.lines);
  if (spacings.length > 0) {
    analysis.spacing.min = Math.min(...spacings);
    analysis.spacing.max = Math.max(...spacings);
    analysis.spacing.average = spacings.reduce((a, b) => a + b, 0) / spacings.length;
  }

  return analysis;
}

function createGeometricallyPleasingPath(start, end, size, analysis) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const baseAngle = Math.atan2(dy, dx);

  // Choose path style based on distance - favor simple paths
  if (distance < size * 4) {
    return createHarmonicDirectPath(start, end, analysis);
  } else if (distance < size * 8) {
    return createGracefulArcPath(start, end, size, analysis);
  } else {
    return createSymmetricalSPath(start, end, size, analysis);
  }
}

function createHarmonicDirectPath(start, end, analysis) {
  // Always create direct path to ensure routes reach their intended destinations
  // Angle snapping was causing routes to miss target stations
  return [start, end];
}

function createGracefulArcPath(start, end, size, analysis) {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  // Create gentle arc perpendicular to the direct line
  const baseAngle = Math.atan2(end.y - start.y, end.x - start.x);
  const perpAngle = baseAngle + Math.PI / 2;

  // Small, gentle curvature - prioritize reaching destination over angle harmony
  const curvature = size * 0.3; // Reduced curvature

  // Simple arc direction choice - use consistent deterministic method
  const arcDirection = (start.x + start.y + end.x + end.y) % 2 === 0 ? 1 : -1;

  const arcPoint = {
    x: midX + Math.cos(perpAngle) * curvature * arcDirection,
    y: midY + Math.sin(perpAngle) * curvature * arcDirection
  };

  return [start, arcPoint, end];
}

function createSymmetricalSPath(start, end, size, analysis) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const baseAngle = Math.atan2(end.y - start.y, end.x - start.x);

  // Create symmetrical S-curve with golden ratio proportions
  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
  const t1 = 1 / phi; // ~0.618
  const t2 = 1 - t1;   // ~0.382

  // Create waypoints along the direct path
  const wp1 = {
    x: start.x + Math.cos(baseAngle) * distance * t2,
    y: start.y + Math.sin(baseAngle) * distance * t2
  };

  const wp2 = {
    x: start.x + Math.cos(baseAngle) * distance * t1,
    y: start.y + Math.sin(baseAngle) * distance * t1
  };

  // Apply gentle offsetting for visual flow - use base angle, not harmonic
  const offsetAngle = baseAngle + Math.PI / 2;
  const offset = size * 0.3;

  wp1.x += Math.cos(offsetAngle) * offset;
  wp1.y += Math.sin(offsetAngle) * offset;

  wp2.x -= Math.cos(offsetAngle) * offset;
  wp2.y -= Math.sin(offsetAngle) * offset;

  return [start, wp1, wp2, end];
}

function refinePathForHarmony(path, analysis, size) {
  if (path.length <= 2) return path;

  // Apply golden ratio spacing if needed
  const refinedPath = applyGoldenRatioSpacing(path);

  // Ensure aesthetic spacing from existing routes
  return maintainAestheticSpacing(refinedPath, analysis, size);
}

// ============================================
// UTILITY FUNCTIONS FOR AESTHETIC ANALYSIS
// ============================================

function normalizeAngle(angle) {
  while (angle < 0) angle += 2 * Math.PI;
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
  return angle;
}

function groupSimilarAngles(angles, tolerance) {
  const groups = [];
  const used = new Set();

  for (let i = 0; i < angles.length; i++) {
    if (used.has(i)) continue;

    const group = { angles: [angles[i]], indices: [i] };
    used.add(i);

    for (let j = i + 1; j < angles.length; j++) {
      if (used.has(j)) continue;

      const diff = Math.abs(normalizeAngle(angles[i] - angles[j]));
      const minDiff = Math.min(diff, 2 * Math.PI - diff);

      if (minDiff <= tolerance) {
        group.angles.push(angles[j]);
        group.indices.push(j);
        used.add(j);
      }
    }

    // Calculate average angle for the group
    const avgX = group.angles.reduce((sum, a) => sum + Math.cos(a), 0) / group.angles.length;
    const avgY = group.angles.reduce((sum, a) => sum + Math.sin(a), 0) / group.angles.length;
    group.average = Math.atan2(avgY, avgX);

    groups.push(group);
  }

  return groups;
}

function findSymmetryAxes(centers) {
  // Find potential lines of symmetry in the network
  const axes = [];

  if (centers.length < 2) return axes;

  // Check horizontal and vertical axes
  const avgX = centers.reduce((sum, c) => sum + c.x, 0) / centers.length;
  const avgY = centers.reduce((sum, c) => sum + c.y, 0) / centers.length;

  axes.push(
    { type: 'vertical', x: avgX, score: calculateSymmetryScore(centers, 'vertical', avgX) },
    { type: 'horizontal', y: avgY, score: calculateSymmetryScore(centers, 'horizontal', avgY) }
  );

  return axes.filter(axis => axis.score > 0.3); // Only include strong symmetries
}

function calculateSymmetryScore(centers, type, value) {
  // Calculate how symmetrical the network is around a given axis
  let score = 0;
  const tolerance = 20; // pixels

  for (const center of centers) {
    let hasSymmetricPair = false;

    for (const other of centers) {
      if (center === other) continue;

      if (type === 'vertical') {
        const expectedX = 2 * value - center.x;
        if (Math.abs(other.x - expectedX) < tolerance && Math.abs(other.y - center.y) < tolerance) {
          hasSymmetricPair = true;
          break;
        }
      } else if (type === 'horizontal') {
        const expectedY = 2 * value - center.y;
        if (Math.abs(other.y - expectedY) < tolerance && Math.abs(other.x - center.x) < tolerance) {
          hasSymmetricPair = true;
          break;
        }
      }
    }

    if (hasSymmetricPair) score += 1;
  }

  return score / centers.length;
}

function calculateSpacingPatterns(lines) {
  const spacings = [];

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const spacing = calculateLineSpacing(lines[i], lines[j]);
      if (spacing !== null) spacings.push(spacing);
    }
  }

  return spacings;
}

function calculateLineSpacing(line1, line2) {
  if (!line1.waypoints || !line2.waypoints ||
      line1.waypoints.length < 2 || line2.waypoints.length < 2) {
    return null;
  }

  // Calculate minimum distance between the two lines
  let minDist = Infinity;

  for (let i = 0; i < line1.waypoints.length - 1; i++) {
    for (let j = 0; j < line2.waypoints.length - 1; j++) {
      const dist = segmentToSegmentDistance(
        line1.waypoints[i], line1.waypoints[i + 1],
        line2.waypoints[j], line2.waypoints[j + 1]
      );
      minDist = Math.min(minDist, dist);
    }
  }

  return minDist === Infinity ? null : minDist;
}

function segmentToSegmentDistance(a1, a2, b1, b2) {
  // Simplified distance calculation between two line segments
  const distances = [
    distanceFromPointToLine(a1, b1, b2),
    distanceFromPointToLine(a2, b1, b2),
    distanceFromPointToLine(b1, a1, a2),
    distanceFromPointToLine(b2, a1, a2)
  ];

  return Math.min(...distances);
}

// Visual Harmony Validation System
export function validateNetworkHarmony(game) {
  if (!game || !game.lines || game.lines.length === 0) {
    return { score: 1.0, issues: [], recommendations: [] };
  }

  const validation = {
    score: 0,
    issues: [],
    recommendations: [],
    metrics: {}
  };

  // Analyze current network state
  const analysis = analyzeNetworkAesthetics(game);

  // Calculate harmony metrics
  validation.metrics.symmetry = calculateNetworkSymmetry(game, analysis);
  validation.metrics.balance = calculateVisualBalance(game, analysis);
  validation.metrics.rhythm = calculateSpacingRhythm(game, analysis);
  validation.metrics.proportion = calculateProportionalHarmony(game, analysis);
  validation.metrics.unity = calculateNetworkUnity(game, analysis);

  // Overall harmony score (0-1)
  validation.score = (
    validation.metrics.symmetry * 0.2 +
    validation.metrics.balance * 0.25 +
    validation.metrics.rhythm * 0.2 +
    validation.metrics.proportion * 0.2 +
    validation.metrics.unity * 0.15
  );

  // Generate issues and recommendations
  generateHarmonyFeedback(validation);

  return validation;
}

function calculateNetworkSymmetry(game, analysis) {
  if (analysis.symmetryAxes.length === 0) return 0.3;

  const bestSymmetry = Math.max(...analysis.symmetryAxes.map(axis => axis.score));
  return Math.min(bestSymmetry * 1.2, 1.0);
}

function calculateVisualBalance(game, analysis) {
  const center = analysis.visualWeight.center;
  const stations = game.stations.filter(s => s && !s.isHidden);

  if (stations.length === 0) return 1.0;

  // Calculate how well-centered the network is
  const bounds = calculateNetworkBounds(stations);
  const idealCenter = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2
  };

  const centerOffset = Math.hypot(
    center.x - idealCenter.x,
    center.y - idealCenter.y
  );

  const networkSize = Math.max(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY
  );

  const balanceScore = Math.max(0, 1 - (centerOffset / (networkSize * 0.3)));
  return Math.min(balanceScore, 1.0);
}

function calculateSpacingRhythm(game, analysis) {
  const spacings = analysis.spacingPatterns;
  if (spacings.length < 2) return 0.7;

  // Look for consistent spacing patterns
  const spacingGroups = groupSimilarValues(spacings, 15); // 15px tolerance
  const largestGroup = Math.max(...spacingGroups.map(g => g.length));

  const rhythmScore = largestGroup / spacings.length;
  return Math.min(rhythmScore * 1.3, 1.0);
}

function calculateProportionalHarmony(game, analysis) {
  const lines = game.lines.filter(l => l && l.waypoints && l.waypoints.length > 1);
  if (lines.length === 0) return 1.0;

  const lengths = lines.map(l => l.totalLength || 0);
  const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;

  // Check for golden ratio relationships
  let goldenRatioMatches = 0;
  const goldenRatio = 1.618;

  for (let i = 0; i < lengths.length; i++) {
    for (let j = i + 1; j < lengths.length; j++) {
      const ratio = lengths[i] / lengths[j];
      if (Math.abs(ratio - goldenRatio) < 0.2 || Math.abs(ratio - 1/goldenRatio) < 0.2) {
        goldenRatioMatches++;
      }
    }
  }

  const totalPairs = (lengths.length * (lengths.length - 1)) / 2;
  const proportionScore = totalPairs > 0 ? goldenRatioMatches / totalPairs : 0.5;

  return Math.min(proportionScore * 2.0 + 0.3, 1.0);
}

function calculateNetworkUnity(game, analysis) {
  // Measure how cohesive the network appears
  const lines = game.lines.filter(l => l && l.waypoints);
  if (lines.length === 0) return 1.0;

  // Check angle consistency
  let consistentAngles = 0;
  const totalAngles = analysis.dominantAngles.reduce((sum, a) => sum + a.count, 0);

  if (analysis.dominantAngles.length > 0) {
    consistentAngles = analysis.dominantAngles[0].count;
  }

  const angleUnity = totalAngles > 0 ? consistentAngles / totalAngles : 0.5;

  // Check color harmony
  const usedColors = new Set(lines.map(l => l.colorIndex));
  const colorHarmony = usedColors.size <= 4 ? 1.0 : Math.max(0.3, 1.0 - (usedColors.size - 4) * 0.1);

  return (angleUnity * 0.6 + colorHarmony * 0.4);
}

function generateHarmonyFeedback(validation) {
  const metrics = validation.metrics;

  // Symmetry feedback
  if (metrics.symmetry < 0.4) {
    validation.issues.push("Network lacks visual symmetry");
    validation.recommendations.push("Try creating mirror-image routes or balanced hub patterns");
  }

  // Balance feedback
  if (metrics.balance < 0.4) {
    validation.issues.push("Network appears visually unbalanced");
    validation.recommendations.push("Add routes to balance the visual weight distribution");
  }

  // Rhythm feedback
  if (metrics.rhythm < 0.4) {
    validation.issues.push("Inconsistent spacing creates visual chaos");
    validation.recommendations.push("Maintain consistent spacing between parallel routes");
  }

  // Proportion feedback
  if (metrics.proportion < 0.4) {
    validation.issues.push("Route lengths lack harmonious proportions");
    validation.recommendations.push("Consider golden ratio relationships between route lengths");
  }

  // Unity feedback
  if (metrics.unity < 0.4) {
    validation.issues.push("Network lacks visual cohesion");
    validation.recommendations.push("Use consistent angles and limit color palette");
  }

  // Overall score feedback
  if (validation.score < 0.6) {
    validation.recommendations.unshift("Consider using auto-routing with aesthetic mode enabled");
  } else if (validation.score > 0.85) {
    validation.recommendations.unshift("Excellent aesthetic harmony achieved!");
  }
}

function groupSimilarValues(values, tolerance) {
  const groups = [];
  const used = new Set();

  for (let i = 0; i < values.length; i++) {
    if (used.has(i)) continue;

    const group = [values[i]];
    used.add(i);

    for (let j = i + 1; j < values.length; j++) {
      if (used.has(j)) continue;

      if (Math.abs(values[i] - values[j]) <= tolerance) {
        group.push(values[j]);
        used.add(j);
      }
    }

    groups.push(group);
  }

  return groups;
}

function calculateNetworkBounds(stations) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const station of stations) {
    if (station.x < minX) minX = station.x;
    if (station.x > maxX) maxX = station.x;
    if (station.y < minY) minY = station.y;
    if (station.y > maxY) maxY = station.y;
  }

  return { minX, maxX, minY, maxY };
}

function findHarmoniousAngle(baseAngle, dominantAngles) {
  if (!dominantAngles || dominantAngles.length === 0) {
    return snapToHexAngle(baseAngle);
  }

  // Find the dominant angle that creates the most pleasing harmony
  let bestAngle = baseAngle;
  let bestScore = 0;

  for (const dominant of dominantAngles) {
    const angleDiff = Math.abs(normalizeAngle(baseAngle - dominant.angle));
    const harmony = Math.cos(angleDiff) * dominant.strength;

    if (harmony > bestScore) {
      bestScore = harmony;
      bestAngle = dominant.angle;
    }
  }

  return bestAngle;
}

function applyGoldenRatioSpacing(path) {
  if (path.length <= 2) return path;

  // Apply golden ratio proportions to waypoint spacing
  const phi = (1 + Math.sqrt(5)) / 2;
  const newPath = [path[0]];

  for (let i = 1; i < path.length - 1; i++) {
    const prev = newPath[newPath.length - 1];
    const current = path[i];
    const next = path[i + 1];

    // Adjust position using golden ratio
    const totalDist = Math.hypot(next.x - prev.x, next.y - prev.y);
    const idealDist = totalDist / phi;
    const currentDist = Math.hypot(current.x - prev.x, current.y - prev.y);

    if (Math.abs(currentDist - idealDist) > 10) {
      const ratio = idealDist / totalDist;
      const adjustedPoint = {
        x: prev.x + (next.x - prev.x) * ratio,
        y: prev.y + (next.y - prev.y) * ratio
      };
      newPath.push(adjustedPoint);
    } else {
      newPath.push(current);
    }
  }

  newPath.push(path[path.length - 1]);
  return newPath;
}

function maintainAestheticSpacing(path, analysis, size) {
  // Ensure the path maintains pleasing spacing from existing routes
  if (!analysis.spacing.average || analysis.spacing.average === 0) {
    return path;
  }

  const idealSpacing = Math.max(analysis.spacing.average * 0.8, size * 0.5);
  // Implementation would adjust path points to maintain this spacing
  // For now, return the original path
  return path;
}

// Snap angle to nearest 60-degree hex direction
function snapToHexAngle(angle) {
  const step = Math.PI / 3; // 60 degrees
  return Math.round(angle / step) * step;
}

// Path simplification to remove redundant waypoints
function simplifyPath(path) {
  if (!path || path.length <= 2) return path;

  const simplified = [path[0]]; // Always keep first point

  for (let i = 1; i < path.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = path[i];
    const next = path[i + 1];

    // Check if current point is necessary by testing if we can go directly from prev to next
    const isNecessary = !isPathClear(prev, next, curr, path);

    if (isNecessary) {
      simplified.push(curr);
    }
  }

  simplified.push(path[path.length - 1]); // Always keep last point
  return simplified;
}

// Check if we can go directly from point A to point C without needing point B
function isPathClear(a, c, b, fullPath) {
  // If the direct path from A to C is similar to going A->B->C, then B is redundant
  const directDist = Math.hypot(c.x - a.x, c.y - a.y);
  const viaBDist = Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y);

  // If going via B is much longer than direct, keep B (it's avoiding something)
  if (viaBDist > directDist * 1.3) return false;

  // Check if B is roughly on the line from A to C
  const distFromLine = distanceFromPointToLine(b, a, c);
  return distFromLine < 15; // If B is close to the direct line, it's redundant
}

// Calculate distance from point to line segment
function distanceFromPointToLine(point, lineStart, lineEnd) {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) return Math.hypot(A, B);

  const param = dot / lenSq;
  let xx, yy;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  return Math.hypot(point.x - xx, point.y - yy);
}

// ---------------- Performance Cache (Phase 10) ----------------

const hexCache = new Map();
const CACHE_SIZE = 1000;

export function getCachedHexPath(start, end, size = DEFAULT_HEX_SIZE) {
  const key = `${start.x},${start.y}-${end.x},${end.y}-${size}`;
  if (hexCache.has(key)) return hexCache.get(key);
  const path = hexAStar(start, end, size);
  if (hexCache.size >= CACHE_SIZE) {
    const first = hexCache.keys().next().value;
    hexCache.delete(first);
  }
  hexCache.set(key, path);
  return path;
}

export function clearHexCache() {
  hexCache.clear();
}

// ---------------- Corridor Bundling (Phase 2) ----------------

const DEFAULT_BUNDLE_THRESHOLD = 30; // px
const DEFAULT_CORRIDOR_SPACING = 15; // px

function vec(ax, ay, bx, by){ return { x: bx-ax, y: by-ay }; }
function vlen(v){ return Math.hypot(v.x, v.y) || 1; }
function vnorm(v){ const l=vlen(v); return { x:v.x/l, y:v.y/l }; }
function dot(a,b){ return a.x*b.x + a.y*b.y; }

function segmentMid(A,B){ return { x:(A.x+B.x)/2, y:(A.y+B.y)/2 }; }

function perpendicular(u){ return { x:-u.y, y:u.x }; }

// Identify segments from existing lines that run parallel and nearby to a given segment
function findParallelSegments(segment, existingLines, bundleThreshold, angleCosThr){
  const { start, end } = segment;
  const u = vnorm(vec(start.x, start.y, end.x, end.y));
  const n = perpendicular(u);
  const mid = segmentMid(start, end);
  const results = [];

  for (const line of existingLines){
    const pts = (line.waypoints && line.waypoints.length>=2) ? line.waypoints : null;
    if (!pts) continue;
    for (let i=0;i<pts.length-1;i++){
      const A = pts[i], B = pts[i+1];
      const v = vnorm(vec(A.x,A.y,B.x,B.y));
      const cosang = Math.abs(dot(u, v));
      if (cosang < angleCosThr) continue; // not parallel enough
      const mid2 = segmentMid(A,B);
      // Perpendicular distance from our mid to other segment line
      const d = Math.abs(dot({x: mid2.x - mid.x, y: mid2.y - mid.y}, n));
      if (d <= bundleThreshold){
        const side = Math.sign(dot({x: mid2.x - mid.x, y: mid2.y - mid.y}, n)) || 1;
        results.push({ lineId: line.id, index: i, side });
      }
    }
  }
  return results;
}

export function applyCorridorBundling(path, game, currentLine){
  if (!path || path.length < 2) return path;

  // Very conservative bundling - only apply to very simple, truly parallel routes
  const cfg = (game && game.config && game.config.hexGrid) || {};
  const spacing = Math.min(cfg.corridorSpacing ?? 8, 8); // Reduce spacing

  // Only bundle if this is a simple 2-point path (start -> end)
  if (path.length > 2) return path;

  const existing = (game && game.lines ? game.lines : []).filter(l =>
    l && l.id !== (currentLine && currentLine.id) &&
    l.waypoints && l.waypoints.length === 2
  );

  if (existing.length === 0) return path;

  const start = path[0];
  const end = path[path.length - 1];
  const currentAngle = Math.atan2(end.y - start.y, end.x - start.x);
  const currentLength = Math.hypot(end.x - start.x, end.y - start.y);

  // Find truly parallel routes (within 5 degrees and similar length)
  let bundleOffset = 0;

  for (const line of existing) {
    const lineStart = line.waypoints[0];
    const lineEnd = line.waypoints[line.waypoints.length - 1];
    const lineAngle = Math.atan2(lineEnd.y - lineStart.y, lineEnd.x - lineStart.x);
    const lineLength = Math.hypot(lineEnd.x - lineStart.x, lineEnd.y - lineStart.y);

    // Check if routes are truly parallel and similar length
    const angleDiff = Math.abs(currentAngle - lineAngle);
    const normalizedAngleDiff = Math.min(angleDiff, Math.abs(angleDiff - Math.PI));
    const lengthRatio = Math.min(currentLength, lineLength) / Math.max(currentLength, lineLength);

    if (normalizedAngleDiff < Math.PI/36 && lengthRatio > 0.7) { // Within 5 degrees and similar length
      // Check if routes are close to each other
      const midCurrent = {x: (start.x + end.x)/2, y: (start.y + end.y)/2};
      const midLine = {x: (lineStart.x + lineEnd.x)/2, y: (lineStart.y + lineEnd.y)/2};
      const distance = Math.hypot(midCurrent.x - midLine.x, midCurrent.y - midLine.y);

      if (distance < 60) { // Only bundle if routes are reasonably close
        bundleOffset += spacing * (currentLine.id > line.id ? 1 : -1);
      }
    }
  }

  // Apply minimal offset if bundling is needed
  if (Math.abs(bundleOffset) > 1) {
    const perpAngle = currentAngle + Math.PI/2;
    const offsetX = Math.cos(perpAngle) * bundleOffset;
    const offsetY = Math.sin(perpAngle) * bundleOffset;

    return [
      {x: start.x + offsetX, y: start.y + offsetY},
      {x: end.x + offsetX, y: end.y + offsetY}
    ];
  }

  return path;
}

// ---------------- Terminal Bubble Approaches (Phase 3) ----------------

function snapAngleTo30(rad){
  const step = Math.PI / 6; // 30°
  return Math.round(rad / step) * step;
}

function pointOnCircle(cx, cy, r, ang){
  return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
}

// Very conservative terminal bubbles - only for major hubs with multiple connections
export function applyTerminalBubbles(path, startStation, endStation, game){
  if (!path || path.length < 2) return path;

  // Only apply bubbles to stations that are actually busy hubs (3+ connections)
  const out = [...path];
  const minConnections = 3;

  // Much smaller bubble radius for cleaner look
  const R = 25;

  // Departure bubble only for busy hubs
  if (startStation && startStation.isFinal &&
      startStation.connections && startStation.connections.length >= minConnections) {
    const s = { x: startStation.x, y: startStation.y };
    const next = out[1];
    const ang = Math.atan2(next.y - s.y, next.x - s.x);
    const p = pointOnCircle(s.x, s.y, R, ang); // Use original angle, not snapped
    out.splice(1, 0, p);
  }

  // Arrival bubble only for busy hubs
  if (endStation && endStation.isFinal &&
      endStation.connections && endStation.connections.length >= minConnections) {
    const e = { x: endStation.x, y: endStation.y };
    const prev = out[out.length-2];
    const ang = Math.atan2(e.y - prev.y, e.x - prev.x);
    const p = pointOnCircle(e.x, e.y, R, ang); // Use original angle, not snapped
    out.splice(out.length-1, 0, p);
  }

  return out;
}
