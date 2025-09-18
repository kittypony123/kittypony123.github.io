// Intelligent Aesthetic Auto-Routing System for Flight Control
// Creates beautiful, harmonious networks while managing complexity

export class AutoRoutingSystem {
  constructor(game) {
    this.game = game;
    this.enabled = false;
    this.userToggled = false; // Track if user manually toggled
    this.complexityThreshold = Infinity; // Never auto-enable - user must manually enable
    this.lastAutoAction = 0;
    this.actionCooldown = 12000; // 12 seconds between auto actions (more time to evaluate)
    this.suggestions = [];
    this.autoExtensionEnabled = true;
    this.routeOptimizationEnabled = true;

    // Aesthetic preferences
    this.aestheticWeight = 0.4; // How much to prioritize beauty over pure efficiency
    this.symmetryBonus = 2.0; // Bonus for creating symmetrical patterns
    this.harmonyBonus = 1.5; // Bonus for aligning with existing network angles
    this.goldenRatioBonus = 1.0; // Bonus for golden ratio proportions

    // Add debug flag
    this.debugEnabled = false;
  }

  // Calculate network complexity score
  calculateComplexity() {
    if (!this.game || this.game.lines.length === 0) return 0;

    let complexity = 0;

    // Base complexity from number of lines and stations
    complexity += this.game.lines.length * 2;
    complexity += this.game.stations.length * 0.5;

    // Complexity from passenger demand
    const totalWaiting = this.game.stations.reduce((sum, station) =>
      sum + (station.queue ? station.queue.length : 0), 0);
    complexity += totalWaiting * 0.8;

    // Complexity from overcrowding
    const overcrowdedStations = this.game.stations.filter(s =>
      s.queue && s.queue.length >= 4).length;
    complexity += overcrowdedStations * 3;

    // Complexity from disconnected stations
    const disconnectedStations = this.game.stations.filter(s =>
      !s.connections || s.connections.length === 0).length;
    complexity += disconnectedStations * 2;

    // Complexity from inefficient routing (passengers waiting too long)
    const longWaitPassengers = this.game.stations.reduce((sum, station) => {
      if (!station.queue) return sum;
      return sum + station.queue.filter(p =>
        this.game.gameTime - p.spawnTime > 45000).length; // 45+ seconds
    }, 0);
    complexity += longWaitPassengers * 1.5;

    return Math.round(complexity);
  }

  // Check if auto-routing should be enabled
  shouldEnableAutoRouting() {
    const complexity = this.calculateComplexity();
    return complexity >= this.complexityThreshold;
  }

  // Update the auto-routing system
  update() {
    const currentTime = this.game.gameTime;

    // Debug: Show complexity every 10 seconds
    if (this.game.debugLogs && currentTime % 10000 < 100) { // Every ~10 seconds
      const complexity = this.calculateComplexity();
      console.log(`Current complexity: ${complexity}/${this.complexityThreshold} (Auto-routing: ${this.enabled ? 'ON' : 'OFF'})`);
    }

    // Only auto-enable/disable if user hasn't manually toggled
    if (!this.userToggled) {
      const shouldEnable = this.shouldEnableAutoRouting();

      if (shouldEnable && !this.enabled) {
        this.enabled = true;
        const complexity = this.calculateComplexity();
        if (this.debugEnabled) console.log(`Auto-routing AUTO-ENABLED: Complexity ${complexity} >= ${this.complexityThreshold}, userToggled: ${this.userToggled}`);
        this.showAutoRoutingNotification(`Auto-routing enabled - Complexity: ${complexity}`);
      } else if (!shouldEnable && this.enabled && this.game.lines.length < 3) {
        this.enabled = false;
        const complexity = this.calculateComplexity();
        if (this.debugEnabled) console.log(`Auto-routing AUTO-DISABLED: Complexity ${complexity} < ${this.complexityThreshold}, userToggled: ${this.userToggled}`);
        this.showAutoRoutingNotification('Auto-routing disabled - Network simplified');
      }
    }

    // If auto-routing is enabled, perform actions
    if (this.enabled && currentTime - this.lastAutoAction > this.actionCooldown) {
      if (this.debugEnabled) console.log('Auto-routing performing actions - enabled:', this.enabled, 'userToggled:', this.userToggled);
      this.performAutoActions();
    }

    // Update suggestions regardless of auto-routing status
    this.updateSuggestions();
  }

  // Perform automatic routing actions
  performAutoActions() {
    const actions = [
      () => this.autoBootstrapNetwork(),
      () => this.autoConnectIsolatedStations(),
      () => this.autoConnectRegularsToNearestHub(),
      () => this.autoConnectHubs(),
      () => this.autoExtendToReduceCrowding(),
      () => this.autoConnectToOvercrowdedFinals(), // NEW: Priority for final destinations
    ];

    // Try each action until one succeeds
    for (const action of actions) {
      if (action()) {
        this.lastAutoAction = this.game.gameTime;
        break;
      }
    }
  }

  // Bootstrap the very first routes if none exist yet
  autoBootstrapNetwork() {
    try {
      if (this.game.lines.length > 0) return false;
      if (this.game.linesAvailable <= 0) return false;

      const stations = this.game.stations.filter(Boolean);
      if (!stations || stations.length < 2) return false;

      const finals = stations.filter(s => s.isFinal);
      const hubs = stations.filter(s => s.isInterchange && !s.isFinal);
      const regulars = stations.filter(s => !s.isFinal && !s.isInterchange);

      const pairs = [];
      const consider = (a, b) => {
        if (!a || !b || a.id === b.id) return;
        const dist = this.calculateDistance(a, b);
        let score = 0;
        if (a.isFinal) score += 3; if (b.isFinal) score += 3;
        if (a.isInterchange) score += 1; if (b.isInterchange) score += 1;
        score -= dist * 0.01; // Prefer closer for a starter route
        pairs.push({ a, b, score });
      };

      // Prefer connecting a final to its nearest regular/hub
      finals.forEach(f => {
        const candidates = [...hubs, ...regulars]
          .map(s => ({ s, d: this.calculateDistance(f, s) }))
          .sort((x, y) => x.d - y.d)
          .slice(0, 5)
          .map(x => x.s);
        candidates.forEach(c => consider(f, c));
      });

      // If no finals or pairs yet, connect two strong hubs
      if (pairs.length === 0 && hubs.length >= 2) {
        hubs.forEach(h => {
          const nearest = hubs
            .filter(x => x.id !== h.id)
            .map(s => ({ s, d: this.calculateDistance(h, s) }))
            .sort((x, y) => x.d - y.d)
            .slice(0, 3)
            .map(x => x.s);
          nearest.forEach(n => consider(h, n));
        });
      }

      // Fallback: any two closest stations
      if (pairs.length === 0) {
        stations.forEach(a => {
          stations.forEach(b => { if (a.id < b.id) consider(a, b); });
        });
      }

      if (pairs.length === 0) return false;

      pairs.sort((x, y) => y.score - x.score);
      // Try to create up to 3 starter routes to stabilize Day 1
      let created = 0;
      const used = new Set();
      for (const p of pairs) {
        if (this.game.linesAvailable <= 0 || created >= 3) break;
        const key = `${p.a.id}-${p.b.id}`;
        const keyR = `${p.b.id}-${p.a.id}`;
        if (used.has(key) || used.has(keyR)) continue;
        if (this.createAutoLine([p.a.id, p.b.id], 'Bootstrapped initial route')) {
          created++;
          used.add(key); used.add(keyR);
        }
      }
      if (created > 0) return true;
    } catch (e) {
      console.warn('autoBootstrapNetwork failed', e);
    }
    return false;
  }

  // Automatically connect isolated stations
  autoConnectIsolatedStations() {
    if (this.game.linesAvailable <= 0) return false;

    const isolated = this.game.stations.filter(s =>
      !s.connections || s.connections.length === 0);

    if (isolated.length === 0) return false;

    // Find the best isolated station to connect (prioritize those with passengers)
    const bestIsolated = isolated.reduce((best, station) => {
      const waitingCount = station.queue ? station.queue.length : 0;
      const bestWaitingCount = best && best.queue ? best.queue.length : 0;
      return waitingCount > bestWaitingCount ? station : best;
    });

    if (!bestIsolated) return false;

    // Find the best existing station to connect to
    const connected = this.game.stations.filter(s =>
      s.connections && s.connections.length > 0);

    if (connected.length === 0) return false;

    // Choose connection target (prefer hubs and final destinations)
    const bestTarget = connected.reduce((best, station) => {
      let score = 0;
      if (station.isFinal) score += 10;
      if (station.isInterchange) score += 5;
      score += station.connections.length; // Prefer hubs
      score -= this.calculateDistance(bestIsolated, station) * 0.01; // Prefer closer

      const bestScore = best ? this.scoreStation(best, bestIsolated) : -1;
      return score > bestScore ? station : best;
    });

    if (bestTarget && this.game.linesAvailable > 0) {
      return this.createAutoLine([bestIsolated.id, bestTarget.id], 'Connected isolated airport');
    }

    return false;
  }

  // Auto-extend lines to reduce crowding
  autoExtendToReduceCrowding() {
    const thr = (this.game.day && this.game.day <= 2) ? 3 : 4;
    const crowdedStations = this.game.stations.filter(s =>
      s.queue && s.queue.length >= thr); // Lower threshold early for faster response

    if (crowdedStations.length === 0) return false;

    for (const station of crowdedStations) {
      const stationIdx = this.game.stations.indexOf(station);

      // Check if this station is an endpoint of any line
      const endpointLines = this.game.lines.filter(line =>
        line.stations[0] === stationIdx ||
        line.stations[line.stations.length - 1] === stationIdx);

      if (endpointLines.length === 0) continue;

      // Find a good extension target
      const destinations = this.analyzePassengerDestinations(station);
      const bestDestination = this.findBestExtensionTarget(station, destinations);

      if (bestDestination && this.game.trainsAvailable > 0) {
        const line = endpointLines[0];
        return this.autoExtendLine(line, bestDestination, 'Extended route to reduce crowding');
      }
    }

    return false;
  }

  // Auto-connect to overcrowded final destinations (HIGH PRIORITY)
  autoConnectToOvercrowdedFinals() {
    if (this.game.linesAvailable <= 0) return false;

    // Find overcrowded final destinations
    const overcrowdedFinals = this.game.stations.filter(s =>
      s.isFinal && s.queue && s.queue.length >= 6);

    if (overcrowdedFinals.length === 0) return false;

    for (const finalStation of overcrowdedFinals) {
      // Find stations with passengers wanting to go to this final destination
      const sourceStations = this.game.stations.filter(station => {
        if (!station.queue || station === finalStation) return false;
        return station.queue.some(p => p.destStation === finalStation.id);
      });

      if (sourceStations.length === 0) continue;

      // Prioritize stations with the most passengers going to this final
      const bestSource = sourceStations.reduce((best, station) => {
        const passengerCount = station.queue.filter(p => p.destStation === finalStation.id).length;
        const bestCount = best ? best.queue.filter(p => p.destStation === finalStation.id).length : 0;
        return passengerCount > bestCount ? station : best;
      });

      if (bestSource && !this.canReachDestination(bestSource.id, finalStation.id)) {
        // Create direct connection to final destination
        if (this.createAutoLine([bestSource.id, finalStation.id], `Direct route to overcrowded ${finalStation.name}`)) {
          return true;
        }
      }
    }

    return false;
  }

  // Create feeder lines to major hubs
  autoCreateFeederLines() {
    if (this.game.linesAvailable <= 0) return false;

    const finals = this.game.stations.filter(s => s.isFinal);
    const hubs = this.game.stations.filter(s => s && (s.isInterchange || s.isFinal));
    const unconnectedToFinals = this.game.stations.filter(station => {
      if (station.isFinal) return false;
      // Check if this station can reach any final destination
      const toFinal = finals.some(final => this.canReachDestination(station.id, final.id));
      if (toFinal) return false;
      // In hub-and-spoke mode, also treat as candidate if it cannot reach any hub
      if (this.game.config && this.game.config.hubAndSpokeMode) {
        const toHub = hubs.some(h => this.canReachDestination(station.id, h.id));
        return !toHub;
      }
      return true;
    });

    if (unconnectedToFinals.length === 0) return false;

    // Find the best feeder opportunity
    const bestFeeder = unconnectedToFinals.find(station =>
      station.queue && station.queue.length >= 3);

    if (bestFeeder) {
      // Prefer nearest hub (interchange or final) in hub-and-spoke mode
      if (this.game.config && this.game.config.hubAndSpokeMode && hubs.length > 0) {
        let bestHub = null; let bestDist = Infinity;
        for (const h of hubs) {
          const d = this.calculateDistance(bestFeeder, h);
          if (d < bestDist) { bestDist = d; bestHub = h; }
        }
        if (bestHub) {
          return this.createAutoLine([bestFeeder.id, bestHub.id], 'Created feeder route to hub');
        }
      }
      const nearestFinal = this.findNearestFinalDestination(bestFeeder);
      if (nearestFinal) {
        return this.createAutoLine([bestFeeder.id, nearestFinal.id],
          'Created feeder route to final destination');
      }
    }

    return false;
  }

  // Optimize underperforming lines
  autoOptimizeUnderperformingLines() {
    // This is handled by the existing train optimization system
    // We could add route restructuring here in the future
    return false;
  }

  // Helper functions
  calculateDistance(stationA, stationB) {
    return Math.hypot(stationB.x - stationA.x, stationB.y - stationA.y);
  }

  // ============================================
  // AESTHETIC SCORING SYSTEM
  // ============================================

  calculateAestheticScore(stationA, stationB) {
    if (!stationA || !stationB) return 0;

    let aestheticScore = 0;

    // 1. Harmony with existing network angles
    aestheticScore += this.calculateHarmonyScore(stationA, stationB);

    // 2. Visual balance improvement
    aestheticScore += this.calculateVisualBalanceScore(stationA, stationB);

    // 3. Pattern completion bonus
    aestheticScore += this.calculatePatternScore(stationA, stationB);

    // 4. Symmetry enhancement
    aestheticScore += this.calculateSymmetryScore(stationA, stationB);

    return aestheticScore * this.aestheticWeight;
  }

  calculateHarmonyScore(stationA, stationB) {
    if (this.game.lines.length === 0) return 0;

    const newAngle = Math.atan2(stationB.y - stationA.y, stationB.x - stationA.x);

    // Find dominant angles in existing network
    const existingAngles = [];
    for (const line of this.game.lines) {
      if (!line.waypoints || line.waypoints.length < 2) continue;

      for (let i = 0; i < line.waypoints.length - 1; i++) {
        const p1 = line.waypoints[i];
        const p2 = line.waypoints[i + 1];
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        existingAngles.push(this.normalizeAngle(angle));
      }
    }

    if (existingAngles.length === 0) return 0;

    // Find the closest existing angle
    const normalizedNewAngle = this.normalizeAngle(newAngle);
    let minAngleDiff = Infinity;

    for (const existingAngle of existingAngles) {
      const diff = Math.abs(normalizedNewAngle - existingAngle);
      const minDiff = Math.min(diff, 2 * Math.PI - diff);
      minAngleDiff = Math.min(minAngleDiff, minDiff);
    }

    // Bonus for angles that harmonize with existing network
    const harmonyThreshold = Math.PI / 6; // 30 degrees
    if (minAngleDiff < harmonyThreshold) {
      return (harmonyThreshold - minAngleDiff) / harmonyThreshold * this.harmonyBonus;
    }

    // Bonus for complementary angles (60°, 90°, 120°)
    const complementaryAngles = [Math.PI/3, Math.PI/2, 2*Math.PI/3];
    for (const compAngle of complementaryAngles) {
      if (Math.abs(minAngleDiff - compAngle) < Math.PI/12) {
        return this.harmonyBonus * 0.3;
      }
    }

    return 0;
  }

  calculateVisualBalanceScore(stationA, stationB) {
    // Bonus for connections that improve visual balance
    const networkCenter = this.calculateNetworkCenter();
    const connectionMidpoint = {
      x: (stationA.x + stationB.x) / 2,
      y: (stationA.y + stationB.y) / 2
    };

    // Distance from network center - closer connections can provide better balance
    const distanceToCenter = Math.hypot(
      connectionMidpoint.x - networkCenter.x,
      connectionMidpoint.y - networkCenter.y
    );

    // Bonus for connections that pass near the network center
    const centerBonus = Math.max(0, 100 - distanceToCenter * 0.5);

    // Bonus for connections between different quadrants (creates balance)
    const quadrantBonus = this.calculateQuadrantBalance(stationA, stationB, networkCenter);

    return (centerBonus + quadrantBonus) * 0.1;
  }

  calculatePatternScore(stationA, stationB) {
    let patternScore = 0;

    // Bonus for radial patterns from hubs
    if (stationA.isInterchange || stationA.isFinal) {
      patternScore += this.calculateRadialPatternBonus(stationA, stationB);
    }
    if (stationB.isInterchange || stationB.isFinal) {
      patternScore += this.calculateRadialPatternBonus(stationB, stationA);
    }

    // Bonus for grid-like patterns
    patternScore += this.calculateGridPatternBonus(stationA, stationB);

    return patternScore;
  }

  calculateSymmetryScore(stationA, stationB) {
    if (this.game.lines.length < 2) return 0;

    const networkCenter = this.calculateNetworkCenter();
    const midpoint = {
      x: (stationA.x + stationB.x) / 2,
      y: (stationA.y + stationB.y) / 2
    };

    // Bonus for connections that create or enhance symmetry
    let symmetryScore = 0;

    // Check for potential mirror symmetry
    const distanceFromCenter = Math.hypot(
      midpoint.x - networkCenter.x,
      midpoint.y - networkCenter.y
    );

    // Connections near the center can anchor symmetrical patterns
    if (distanceFromCenter < 50) {
      symmetryScore += this.symmetryBonus * 0.5;
    }

    // Check for radial symmetry from center
    const angle = Math.atan2(midpoint.y - networkCenter.y, midpoint.x - networkCenter.x);
    symmetryScore += this.calculateRadialSymmetryBonus(angle, networkCenter);

    return symmetryScore;
  }

  // ============================================
  // AESTHETIC HELPER FUNCTIONS
  // ============================================

  normalizeAngle(angle) {
    while (angle < 0) angle += 2 * Math.PI;
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
    return angle;
  }

  calculateNetworkCenter() {
    if (this.game.lines.length === 0) {
      // Use station center if no lines exist
      const stations = this.game.stations.filter(Boolean);
      if (stations.length === 0) return { x: 0, y: 0 };

      const avgX = stations.reduce((sum, s) => sum + s.x, 0) / stations.length;
      const avgY = stations.reduce((sum, s) => sum + s.y, 0) / stations.length;
      return { x: avgX, y: avgY };
    }

    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (const line of this.game.lines) {
      if (!line.waypoints || line.waypoints.length < 2) continue;

      for (let i = 0; i < line.waypoints.length - 1; i++) {
        const p1 = line.waypoints[i];
        const p2 = line.waypoints[i + 1];
        const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        weightedX += midX * length;
        weightedY += midY * length;
        totalWeight += length;
      }
    }

    if (totalWeight === 0) return { x: 0, y: 0 };
    return { x: weightedX / totalWeight, y: weightedY / totalWeight };
  }

  calculateQuadrantBalance(stationA, stationB, center) {
    // Bonus for connections that span different quadrants around the center
    const getQuadrant = (station) => {
      const dx = station.x - center.x;
      const dy = station.y - center.y;

      if (dx >= 0 && dy >= 0) return 0; // Top-right
      if (dx < 0 && dy >= 0) return 1;  // Top-left
      if (dx < 0 && dy < 0) return 2;   // Bottom-left
      return 3;                         // Bottom-right
    };

    const quadA = getQuadrant(stationA);
    const quadB = getQuadrant(stationB);

    // Bonus for cross-quadrant connections
    if (quadA !== quadB) {
      // Diagonal connections get higher bonus
      if (Math.abs(quadA - quadB) === 2) {
        return 2.0; // Diagonal
      } else {
        return 1.0; // Adjacent quadrants
      }
    }

    return 0;
  }

  calculateRadialPatternBonus(hub, spoke) {
    const existingConnections = this.getStationConnections(hub.id);
    if (existingConnections.length === 0) return 0;

    const newAngle = Math.atan2(spoke.y - hub.y, spoke.x - hub.x);
    const existingAngles = existingConnections.map(connId => {
      const station = this.game.stations[connId];
      return Math.atan2(station.y - hub.y, station.x - hub.x);
    });

    // Calculate ideal spacing for even radial distribution
    const totalConnections = existingAngles.length + 1;
    const idealSpacing = (2 * Math.PI) / totalConnections;

    // Find best spacing match
    let bestSpacing = 0;
    for (const existingAngle of existingAngles) {
      const spacing = Math.abs(this.normalizeAngle(newAngle - existingAngle));
      const normalizedSpacing = Math.min(spacing, 2 * Math.PI - spacing);

      if (Math.abs(normalizedSpacing - idealSpacing) < Math.PI / 8) {
        bestSpacing = 1.0;
        break;
      }
    }

    return bestSpacing * 0.5;
  }

  calculateGridPatternBonus(stationA, stationB) {
    const distance = this.calculateDistance(stationA, stationB);
    const angle = Math.atan2(stationB.y - stationA.y, stationB.x - stationA.x);

    // Check alignment with cardinal and hex directions
    const cardinalAngles = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
    const hexAngles = [0, Math.PI/3, 2*Math.PI/3, Math.PI, 4*Math.PI/3, 5*Math.PI/3];

    for (const targetAngle of [...cardinalAngles, ...hexAngles]) {
      const angleDiff = Math.abs(this.normalizeAngle(angle - targetAngle));
      const minDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);

      if (minDiff < Math.PI / 12) { // Within 15 degrees
        return 0.3;
      }
    }

    return 0;
  }

  calculateRadialSymmetryBonus(angle, center) {
    const existingAngles = [];

    for (const line of this.game.lines) {
      if (!line.waypoints || line.waypoints.length < 2) continue;

      // Use the line's midpoint to calculate angle from center
      const midpoint = {
        x: (line.waypoints[0].x + line.waypoints[line.waypoints.length - 1].x) / 2,
        y: (line.waypoints[0].y + line.waypoints[line.waypoints.length - 1].y) / 2
      };

      const lineAngle = Math.atan2(midpoint.y - center.y, midpoint.x - center.x);
      existingAngles.push(this.normalizeAngle(lineAngle));
    }

    if (existingAngles.length === 0) return 0;

    // Check if this angle creates good radial distribution
    const totalAngles = existingAngles.length + 1;
    const idealSpacing = (2 * Math.PI) / totalAngles;

    for (const existingAngle of existingAngles) {
      const spacing = Math.abs(this.normalizeAngle(angle - existingAngle));
      const normalizedSpacing = Math.min(spacing, 2 * Math.PI - spacing);

      if (Math.abs(normalizedSpacing - idealSpacing) < Math.PI / 8) {
        return this.symmetryBonus * 0.3;
      }
    }

    return 0;
  }

  getStationConnections(stationId) {
    const connections = [];
    for (const line of this.game.lines) {
      if (!line.stations || !line.stations.includes(stationId)) continue;

      for (const otherId of line.stations) {
        if (otherId !== stationId && !connections.includes(otherId)) {
          connections.push(otherId);
        }
      }
    }
    return connections;
  }

  scoreStation(station, relativeTo) {
    let score = 0;

    // Base functional scoring
    const hubSpoke = this.game.config && this.game.config.hubAndSpokeMode;
    const bias = (this.game.config && this.game.config.hubSpokeBias) || 1;
    const finalBase = 10, hubBase = 5;
    if (station.isFinal) score += hubSpoke ? Math.round(finalBase * (1 + 0.6 * (bias - 1))) : finalBase;
    if (station.isInterchange) score += hubSpoke ? Math.round(hubBase * (1 + 0.8 * (bias - 1))) : hubBase;
    score += (station.connections || []).length;
    score -= this.calculateDistance(relativeTo, station) * 0.01;

    // Add aesthetic scoring
    const aestheticScore = this.calculateAestheticScore(relativeTo, station);
    score += aestheticScore;

    if (this.debugEnabled && aestheticScore > 0) {
      console.log(`Aesthetic bonus for ${relativeTo?.name || 'Unknown'} -> ${station?.name || 'Unknown'}: +${aestheticScore.toFixed(2)}`);
    }

    return score;
  }

  canReachDestination(fromStationIdx, toStationIdx) {
    // Simple BFS to check if path exists
    const visited = new Set();
    const queue = [fromStationIdx];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === toStationIdx) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const station = this.game.stations[current];
      if (station && station.connections) {
        for (const lineId of station.connections) {
          const line = this.game.lines[lineId];
          if (line) {
            for (const stationIdx of line.stations) {
              if (!visited.has(stationIdx)) {
                queue.push(stationIdx);
              }
            }
          }
        }
      }
    }
    return false;
  }

  findNearestFinalDestination(station) {
    const finals = this.game.stations.filter(s => s.isFinal);
    if (finals.length === 0) return null;

    return finals.reduce((nearest, final) => {
      const distance = this.calculateDistance(station, final);
      const nearestDistance = nearest ? this.calculateDistance(station, nearest) : Infinity;
      return distance < nearestDistance ? final : nearest;
    });
  }

  // Connect regular stations to the nearest hub (interchange or final)
  autoConnectRegularsToNearestHub() {
    if (!(this.game.config && this.game.config.hubAndSpokeMode)) return false;
    if (this.game.linesAvailable <= 0) return false;

    const hubs = this.game.stations.filter(s => s && (s.isInterchange || s.isFinal));
    if (hubs.length === 0) return false;

    // Consider regular stations with demand or without any hub path
    const candidates = this.game.stations.filter(s => s && !s.isFinal && !s.isInterchange);
    if (candidates.length === 0) return false;

    const needsHub = candidates.filter(station => {
      // If station has no connections, it clearly needs a hub
      if (!station.connections || station.connections.length === 0) return true;
      // Otherwise, check if any hub is reachable
      return !hubs.some(h => this.canReachDestination(station.id, h.id));
    });

    if (needsHub.length === 0) return false;

    // Prioritize by queue size (demand), then by isolation
    needsHub.sort((a, b) => ((b.queue?.length||0) - (a.queue?.length||0)));
    const src = needsHub[0];
    // Find nearest hub by distance
    let best = null; let bestDist = Infinity;
    for (const h of hubs) {
      const d = this.calculateDistance(src, h);
      if (d < bestDist) { bestDist = d; best = h; }
    }
    if (best) {
      return this.createAutoLine([src.id, best.id], 'Connected spoke to nearest hub');
    }
    return false;
  }

  // Create direct hub-to-hub spines to strengthen the trunk network
  autoConnectHubs() {
    if (!(this.game.config && this.game.config.hubAndSpokeMode)) return false;
    if (this.game.linesAvailable <= 0) return false;

    const hubs = this.game.stations.filter(s => s && (s.isInterchange || s.isFinal));
    if (hubs.length < 2) return false;

    // Pick the closest pair of hubs that aren't already directly connected by any line
    let best = null; let bestDist = Infinity;
    for (let i = 0; i < hubs.length; i++) {
      for (let j = i + 1; j < hubs.length; j++) {
        const a = hubs[i], b = hubs[j];
        // Skip if already on same line
        const already = this.game.lines.some(line => line && line.stations.includes(a.id) && line.stations.includes(b.id));
        if (already) continue;
        const d = this.calculateDistance(a, b);
        if (d < bestDist) { bestDist = d; best = [a, b]; }
      }
    }
    if (best) {
      return this.createAutoLine([best[0].id, best[1].id], 'Connected hubs to form a spine');
    }
    return false;
  }

  analyzePassengerDestinations(station) {
    if (!station.queue) return {};

    const destinations = {};
    station.queue.forEach(passenger => {
      const dest = passenger.destStation;
      destinations[dest] = (destinations[dest] || 0) + 1;
    });

    return destinations;
  }

  findBestExtensionTarget(station, destinations) {
    const sortedDests = Object.entries(destinations)
      .sort((a, b) => b[1] - a[1]) // Sort by passenger count
      .map(([stationId]) => parseInt(stationId));

    for (const destId of sortedDests) {
      const destStation = this.game.stations[destId];
      if (destStation && !this.canReachDestination(station.id, destId)) {
        return destStation;
      }
    }
    return null;
  }

  // Create an automatic line
  createAutoLine(stationIds, reason) {
    try {
      // Use the global Lines module
      const Lines = window.Lines;
      if (Lines && Lines.createLine && this.game.linesAvailable > 0) {
        const line = Lines.createLine(this.game, stationIds);
        if (line) {
          // Ensure waypoints use hex pathfinding
          if (Lines.rebuildWaypointsForLine) {
            Lines.rebuildWaypointsForLine(this.game, line);
          }
          this.game.linesAvailable--;
          // Immediately place a train on the new route if available to avoid early crowding
          if (this.game.trainsAvailable > 0 && typeof this.game.createTrain === 'function') {
            const t = this.game.createTrain(line.id);
            if (t) this.game.trainsAvailable--;
            // Early-game boost: add a second train for longer routes if stock allows
            const early = (this.game.day || 1) <= 3;
            const longRoute = (line.stations.length >= 3) || (line.totalLength || 0) > 500;
            if (early && longRoute && this.game.trainsAvailable > 0) {
              const t2 = this.game.createTrain(line.id);
              if (t2) this.game.trainsAvailable--;
            }
          }
          if (this.game.updateHUD) this.game.updateHUD();
          this.showAutoActionNotification(`🤖 ${reason}`, 'rgba(14,165,163,0.8)');
          return true;
        }
      }
    } catch (error) {
      console.warn('Auto-routing line creation failed:', error);
    }
    return false;
  }

  // Auto-extend a line
  autoExtendLine(line, targetStation, reason) {
    try {
      const targetIdx = this.game.stations.indexOf(targetStation);
      if (targetIdx === -1) return false;

      // Check which end to extend from
      const firstStation = line.stations[0];
      const lastStation = line.stations[line.stations.length - 1];

      const distToFirst = this.calculateDistance(this.game.stations[firstStation], targetStation);
      const distToLast = this.calculateDistance(this.game.stations[lastStation], targetStation);

      if (distToFirst < distToLast) {
        line.stations.unshift(targetIdx);
      } else {
        line.stations.push(targetIdx);
      }

      // Rebuild line waypoints and connections
      const Lines = window.Lines;
      if (Lines && Lines.rebuildWaypointsForLine) {
        Lines.rebuildWaypointsForLine(this.game, line);
        line.totalLength = this.game.calculateLineLength(line);
      }

      // Add connection
      if (!targetStation.connections.includes(line.id)) {
        targetStation.connections.push(line.id);
      }

      // Ensure there is at least one train servicing this route
      if ((((line.trains && line.trains.length) || 0) === 0) && this.game.trainsAvailable > 0 && typeof this.game.createTrain === 'function') {
        const t = this.game.createTrain(line.id);
        if (t) this.game.trainsAvailable--;
      }

      this.showAutoActionNotification(`✅ ${reason}`, 'rgba(14,165,163,0.8)');
      return true;
    } catch (error) {
      console.warn('Auto-routing line extension failed:', error);
    }
    return false;
  }

  // Update route optimization suggestions
  updateSuggestions() {
    this.suggestions = [];

    // Suggest connections for isolated stations
    const isolated = this.game.stations.filter(s =>
      !s.connections || s.connections.length === 0);

    if (isolated.length > 0) {
      this.suggestions.push({
        type: 'connect_isolated',
        priority: 'high',
        description: `${isolated.length} isolated airports need connections`,
        action: () => this.autoConnectIsolatedStations()
      });
    }

    // Suggest extensions for crowded stations
    const crowded = this.game.stations.filter(s =>
      s.queue && s.queue.length >= 4);

    if (crowded.length > 0) {
      this.suggestions.push({
        type: 'extend_crowded',
        priority: 'medium',
        description: `${crowded.length} airports are overcrowded`,
        action: () => this.autoExtendToReduceCrowding()
      });
    }
  }

  // Show auto-routing notification
  showAutoRoutingNotification(message) {
    if (this.game.showToast) {
      this.game.showToast(message);
    }
  }

  // Show auto-action notification
  showAutoActionNotification(message, color = 'rgba(14,165,163,0.8)') {
    const notification = document.createElement('div');
    notification.className = 'auto-action-notification';
    notification.style.cssText = `
      position: fixed; top: 80px; right: 20px; z-index: 998;
      background: ${color}; color: white; padding: 8px 12px;
      border-radius: 8px; font-size: 12px; font-weight: 600;
      transform: translateX(120%); opacity: 0;
      transition: all 0.3s ease; max-width: 250px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    }, 10);

    // Remove after delay
    setTimeout(() => {
      notification.style.transform = 'translateX(120%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Get current suggestions for UI
  getSuggestions() {
    return this.suggestions;
  }

  // Get complexity score for UI
  getComplexityInfo() {
    return {
      score: this.calculateComplexity(),
      threshold: this.complexityThreshold,
      enabled: this.enabled,
      level: this.getComplexityLevel()
    };
  }

  getComplexityLevel() {
    const score = this.calculateComplexity();
    if (score < 8) return 'low';
    if (score < 15) return 'medium';
    if (score < 25) return 'high';
    return 'extreme';
  }

  // Manual controls for players
  toggleAutoRouting() {
    this.enabled = !this.enabled;
    this.userToggled = true; // Mark that user has manually controlled this
    const status = this.enabled ? 'enabled' : 'disabled';
    const complexity = this.calculateComplexity();
    if (this.debugEnabled) console.log(`MANUAL TOGGLE: Auto-routing ${status} (Complexity: ${complexity}/${this.complexityThreshold}), userToggled: ${this.userToggled}`);
    this.showAutoRoutingNotification(`Auto-routing ${status} (Complexity: ${complexity})`);
  }

  executeSuggestion(suggestionIndex) {
    if (this.suggestions[suggestionIndex]) {
      this.suggestions[suggestionIndex].action();
    }
  }
}
