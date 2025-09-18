import { screenToWorld } from '../core/camera.js';
import { stationAtPoint } from '../systems/stations.js';
import { createHexPath, applyCorridorBundling, applyTerminalBubbles } from '../systems/hexgrid.js';
import { createLine, addStationToLine, findLineNearPoint, rebuildWaypointsForLine } from '../systems/lines_final.js';
import { segmentCrossesPolygon } from '../utils/intersections.js';

export function attachInput(canvas, game, onPreview){
  let isDown=false; let dragStartStation=null; let selectedLine=null; let insertPosition=null; let isShiftHeld=false;
  let lineInsertAnchor=null; // world point on the selected segment used as preview start
  let isPanning=false; let panStartX=0; let panStartY=0; let panStartCamX=0; let panStartCamY=0;

  // Mobile gesture support
  let lastTouchDistance=0; let isGesturing=false; let touchStartTime=0;
  const TOUCH_TOLERANCE = 10; // px movement tolerance for tap vs drag

  // Detect if device primarily uses touch to avoid double event handling
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const DEBUG = false;
  function rect(){ return canvas.getBoundingClientRect(); }
  function worldOf(ev){ const r=rect(); return screenToWorld(game.camera, ev.clientX - r.left, ev.clientY - r.top); }

  // Cursor state management
  function updateCursor(newState) {
    canvas.className = `canvas-${newState}`;
    game.needsRedraw = true;
  }

  document.addEventListener('keydown', (e)=>{
    if (e.key==='Shift') isShiftHeld=true;
    if (e.key==='Escape'){ onPreview(null); }
    if (e.key==='Alt') game.removalMode=true;

    // ENHANCED: Number keys 1-7 select manual color override
    if (e.key >= '1' && e.key <= '7') {
      const colorIndex = parseInt(e.key) - 1;
      if (colorIndex < game.config.lineColors.length) {
        game.selectedLineColorIndex = colorIndex;
        game.manualColorOverride = true; // Flag for manual override
        const colorNames = ['Express', 'Hub', 'Regional', 'Relief', 'Specialty', 'Growth', 'Backup'];
        if (game.showToast) {
          game.showToast(`Manual ${colorNames[colorIndex]} color selected`);
        }
        game.updateHUD();
      }
    }

    // ENHANCED: Tab cycles through colors with override
    if (e.key === 'Tab') {
      e.preventDefault();
      const current = game.selectedLineColorIndex || 0;
      game.selectedLineColorIndex = (current + 1) % game.config.lineColors.length;
      game.manualColorOverride = true;
      game.updateHUD();
    }
  });

  document.addEventListener('keyup', (e)=>{
    if (e.key==='Shift') isShiftHeld=false;
    if (e.key==='Alt') game.removalMode=false;
    if (e.key==='c' || e.key==='C') game.colorKeyHeld = false;
  });


  // Only use pointer events on non-touch devices to avoid conflicts
  if (!isTouchDevice) {
    canvas.addEventListener('pointerdown', (ev)=>{
    isDown=true; canvas.setPointerCapture(ev.pointerId);
    const r = rect();
    const screenX = ev.clientX - r.left;
    const screenY = ev.clientY - r.top;
    const world = worldOf(ev);
    const hit = stationAtPoint(game.stations, world.x, world.y, 20);
    if (hit!==-1){ if (DEBUG) console.log('pointerdown: start station', hit); dragStartStation=hit; return; }
    // line hit for removal or extension
    const lineHit=findLineNearPoint(game, world.x, world.y, game.config.linePickTolerancePx);
    if (lineHit){
      if (game.removalMode){ if (DEBUG) console.log('remove line', lineHit.line.id); game.removeLine(lineHit.line.id); return; }
      selectedLine=lineHit.line; insertPosition=lineHit.segmentIndex+1;
      // Compute anchor as projection of pointer onto the segment for a smooth one-gesture insert
      const a = game.stations[selectedLine.stations[lineHit.segmentIndex]];
      const b = game.stations[selectedLine.stations[lineHit.segmentIndex+1]];
      lineInsertAnchor = projectPointToSegment(world.x, world.y, a.x, a.y, b.x, b.y);
      if (DEBUG) console.log('insert mode on segment', insertPosition, 'anchor', lineInsertAnchor);
      return;
    }
    // Start panning if no station or line hit
    isPanning = true;
    panStartX = screenX;
    panStartY = screenY;
    panStartCamX = game.camera.targetX;
    panStartCamY = game.camera.targetY;
  });

    canvas.addEventListener('pointermove', (ev)=>{
    const r = rect();
    const screenX = ev.clientX - r.left;
    const screenY = ev.clientY - r.top;
    const world=worldOf(ev);
    const prevHoveredIdx = game.hoveredStationIdx;
    const prevHoveredLine = game.hoveredLineId;

    // Handle panning
    if (isPanning && isDown) {
      const deltaX = screenX - panStartX;
      const deltaY = screenY - panStartY;
      game.camera.targetX = panStartCamX + deltaX;
      game.camera.targetY = panStartCamY + deltaY;

      // Track manual camera movement
      if (typeof window.trackManualZoom === 'function') {
        window.trackManualZoom();
      }

      game.needsRedraw = true;
      return;
    }

    game.hoveredStationIdx = stationAtPoint(game.stations, world.x, world.y, 20);

    // Update hovered line for visual feedback
    const lineHit = findLineNearPoint(game, world.x, world.y, game.config.linePickTolerancePx);
    game.hoveredLineId = lineHit ? lineHit.line.id : null;

    // Update cursor based on context
    if (!isDown) {
      if (game.removalMode) {
        updateCursor(lineHit ? 'removing' : 'drawing');
      } else if (game.recolorMode || game.colorKeyHeld) {
        updateCursor(lineHit ? 'recoloring' : 'drawing');
      } else if (game.hoveredStationIdx !== -1) {
        updateCursor('hovering-station');
      } else {
        updateCursor(lineHit ? 'hovering-line' : 'drawing');
      }
    }

    // Trigger redraw if hover state changed
    if (game.hoveredStationIdx !== prevHoveredIdx || game.hoveredLineId !== prevHoveredLine) {
      game.needsRedraw = true;
    }

    if (dragStartStation!=null){
      const start=game.stations[dragStartStation];
      const endIdx = game.hoveredStationIdx;
      const end = (endIdx!==-1? game.stations[endIdx] : world);
      let points = createHexPath(start.x, start.y, end.x, end.y, game.config.hexGrid.size, game);
      if (endIdx!==-1){
        points = applyTerminalBubbles(points, start, end, game);
      }
      // Apply bundling preview against existing lines
      points = applyCorridorBundling(points, game, null);
      onPreview({ points, valid: true, snapStation: endIdx, isHexSnapped: true });
      if (DEBUG) console.log('preview from', dragStartStation, 'to', endIdx);
    } else if (selectedLine && isDown){
      const endIdx = game.hoveredStationIdx; const end = (endIdx!==-1? game.stations[endIdx] : world);
      const start = lineInsertAnchor || world;
      let points = createHexPath(start.x, start.y, end.x, end.y, game.config.hexGrid.size, game);
      if (endIdx!==-1){
        // If inserting into a line towards a station, show arrival bubble preview
        const endStation = game.stations[endIdx];
        points = applyTerminalBubbles(points, null, endStation, game);
      }
      points = applyCorridorBundling(points, game, selectedLine);
      // Validate river crossing + duplicates before user releases
      let valid = true;
      if (endIdx !== -1) {
        const v = canInsertStationAt(game, selectedLine, endIdx, insertPosition);
        valid = v.valid;
      }
      onPreview({ points, valid, snapStation: endIdx, isHexSnapped: true });
    }
  });

  // Mouse wheel zoom handling (fixed passive event warning)
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const world = worldOf(ev);
    const zoomFactor = 0.1;
    const delta = ev.deltaY > 0 ? -zoomFactor : zoomFactor;

    const oldScale = game.camera.targetScale;
    game.camera.targetScale = Math.max(game.camera.minScale, Math.min(game.camera.maxScale, oldScale + delta));

    if (game.camera.targetScale !== oldScale) {
      // Zoom towards mouse cursor
      const scaleDiff = game.camera.targetScale - oldScale;
      game.camera.targetX -= world.x * scaleDiff;
      game.camera.targetY -= world.y * scaleDiff;

      // Track manual zoom to prevent auto-adjustment interference
      if (typeof window.trackManualZoom === 'function') {
        window.trackManualZoom();
      }

      game.needsRedraw = true;
    }
  }, { passive: false });

  canvas.addEventListener('pointerup', (ev)=>{
    isDown=false; isPanning=false; try{ canvas.releasePointerCapture(ev.pointerId);}catch(e){}
    const world=worldOf(ev); const hit = stationAtPoint(game.stations, world.x, world.y, 20);
    if (dragStartStation!=null){ if (hit!==-1 && hit!==dragStartStation){ if (DEBUG) console.log('pointerup connect', dragStartStation, '->', hit);
        // Allow extension from endpoints OR create new line if available
        const extendable = game.lines.filter(l=> (l.stations[0]===dragStartStation || l.stations[l.stations.length-1]===dragStartStation));

        // If no lines can be extended from this station, provide helpful feedback
        if (extendable.length === 0 && game.linesAvailable === 0) {
          const connectedLines = game.lines.filter(l => l.stations.includes(dragStartStation));
          if (connectedLines.length > 0) {
            console.log('Station is connected but not at endpoint - cannot extend existing routes');
            if (game.showToast) {
              game.showToast('Cannot extend from hub station - need endpoint station');
            }
          }
        }

        if (extendable.length>0 && !isShiftHeld){
          // Extend existing line from endpoint
          const line=extendable[0];
          if (DEBUG) console.log('extend line', line.id);

          // ENFORCE PERMIT RULE: Check if extension crosses restricted airspace
          const A = game.stations[dragStartStation];
          const B = game.stations[hit];
          const crosses = segmentCrossesPolygon({x:A.x,y:A.y},{x:B.x,y:B.y}, game.config.thamesPolygon);
          if (crosses && (game.tunnels||0) <= 0) {
            if (game.showToast) {
              game.showToast('Need permit to extend across restricted airspace');
            }
            dragStartStation=null;
            onPreview(null);
            return;
          }

          // Auto-update line color based on new strategic value
          const newStrategicColor = getStrategicColorIndex(game, dragStartStation, hit);
          const currentColorIndex = game.config.lineColors.indexOf(line.color);

          // Only change color if new connection is higher priority (lower index)
          if (newStrategicColor < currentColorIndex) {
            line.color = game.config.lineColors[newStrategicColor];
            const colorNames = ['Express', 'Hub', 'Regional', 'Relief'];
            if (game.showToast) {
              game.showToast(`Route upgraded to ${colorNames[newStrategicColor]} priority`);
            }
          }

          if (line.stations[0]===dragStartStation) line.stations.unshift(hit);
          else line.stations.push(hit);
          rebuildWaypointsForLine(game, line);
          line.totalLength = game.calculateLineLength(line);
          if (line.trains.length===0 && game.trainsAvailable>0){
            game.createTrain(line.id);
            game.trainsAvailable--;
          }
          // Add connection to the new station
          if (!game.stations[hit].connections.includes(line.id)) {
            game.stations[hit].connections.push(line.id);
          }
          // Use permit if crossing
          if (crosses) {
            game.tunnels = Math.max(0, (game.tunnels||0)-1);
            if (DEBUG) console.log('used permit for extension, remain', game.tunnels);
          }
          // Trigger train reallocation for extended line
          if (game.optimizeTrainAllocation) {
            game.optimizeTrainAllocation();
          }
        }
        else {
          // Try to create new line if available
          if (game.linesAvailable>0){
            const A=game.stations[dragStartStation], B=game.stations[hit];
            // River crossing requires tunnels
            const crosses = segmentCrossesPolygon({x:A.x,y:A.y},{x:B.x,y:B.y}, game.config.thamesPolygon);
            if (crosses && (game.tunnels||0) <= 0){ if (DEBUG) console.log('blocked: no tunnels'); onPreview(null); dragStartStation=null; return; }

            // Auto-apply strategic color (unless manual override)
            const strategicColorIndex = game.manualColorOverride ?
              (game.selectedLineColorIndex || 0) :
              getStrategicColorIndex(game, dragStartStation, hit);

            // ENFORCE PERMIT RULE: already checked above, use crosses variable
            if (crosses && (game.tunnels||0) <= 0) {
              if (DEBUG) console.log('blocked: no permits available');
              if (game.showToast) {
                game.showToast('Need permit to cross restricted airspace');
              }
              onPreview(null);
              dragStartStation=null;
              return;
            }

            const line = createLine(game, [dragStartStation, hit], strategicColorIndex);
            if (line){
              line.waypoints = createHexPath(A.x,A.y,B.x,B.y,game.config.hexGrid.size, game);
              game.calculateLineLength(line);
              const newTrain = game.createTrain(line.id);
              if (newTrain) {
                // Route speeds are applied automatically in createTrain via applyRouteSpeed
                if (game.trainsAvailable>0) game.trainsAvailable--;
              }
              game.linesAvailable--;
              if (DEBUG) console.log('created line', line.id, 'with strategic color', strategicColorIndex, 'route type:', newTrain?.routeType);
              if (crosses) { game.tunnels = Math.max(0, (game.tunnels||0)-1); if (DEBUG) console.log('used permit, remain', game.tunnels); }

              // Show enhanced color strategy feedback with speed info
              const colorNames = ['Express', 'Hub', 'Regional', 'Relief', 'Specialty', 'Growth', 'Backup'];
              const speedNames = ['fastest', 'fast', 'standard', 'slower'];
              const colorName = colorNames[strategicColorIndex] || 'Custom';
              const routeType = newTrain?.routeType || 'REGIONAL';
              const speedIndex = ['EXPRESS', 'HUB', 'REGIONAL', 'RELIEF'].indexOf(routeType);
              const speedName = speedNames[speedIndex] || 'standard';

              const feedbackText = game.manualColorOverride ?
                `Manual ${colorName} route (${speedName})` :
                `${colorName} route created (${speedName} speed)`;

              if (game.showToast) {
                game.showToast(feedbackText);
              }

              // Reset manual override after use
              game.manualColorOverride = false;
            }
          } else {
            // HELPFUL: Show user why connection failed
            console.log('Cannot create new route: No lines available. Try extending from an endpoint station or hold Shift to force new line.');
            // Visual feedback for the user
            if (game.showToast) {
              game.showToast('No routes available - extend from endpoint station');
            }
          }
        }
      }
      dragStartStation=null; onPreview(null); game.updateHUD(); return;
    }
    if (selectedLine){
      if (hit!==-1){
        const v = canInsertStationAt(game, selectedLine, hit, insertPosition);
        if (v.valid){
          addStationToLine(game, selectedLine.id, hit, insertPosition);
          game.updateHUD();
        } else {
          // Provide helpful feedback on why insertion failed
          let message = 'Cannot add station to route';
          if (v.reason === 'duplicate') {
            message = 'Station already on this route';
          } else if (v.reason === 'tunnels') {
            message = 'Need tunnel permit to cross restricted airspace';
          }
          console.log(message);
          if (game.showToast) {
            game.showToast(message);
          }
        }
      }
      selectedLine=null; insertPosition=null; lineInsertAnchor=null; onPreview(null); return;
    }
  });
  } // End non-touch device pointer events

  // Mobile pinch-to-zoom gesture support
  function getTouchDistance(touches) {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getTouchCenter(touches) {
    if (touches.length === 0) return { x: 0, y: 0 };
    let x = 0, y = 0;
    for (let i = 0; i < touches.length; i++) {
      x += touches[i].clientX;
      y += touches[i].clientY;
    }
    return { x: x / touches.length, y: y / touches.length };
  }

  // Enhanced touch event handling for mobile gestures
  canvas.addEventListener('touchstart', (ev) => {
    ev.preventDefault();
    touchStartTime = Date.now();

    if (ev.touches.length === 2) {
      // Two-finger gesture - prepare for pinch zoom
      isGesturing = true;
      lastTouchDistance = getTouchDistance(ev.touches);
      const center = getTouchCenter(ev.touches);
      const r = rect();
      panStartX = center.x - r.left;
      panStartY = center.y - r.top;
      panStartCamX = game.camera.targetX;
      panStartCamY = game.camera.targetY;
    } else if (ev.touches.length === 1) {
      // Single touch - convert to pointer event (with fallback for older browsers)
      const touch = ev.touches[0];
      let pointerEvent;
      try {
        pointerEvent = new PointerEvent('pointerdown', {
          pointerId: touch.identifier,
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true
        });
      } catch (e) {
        // Fallback for browsers without PointerEvent constructor
        pointerEvent = new MouseEvent('pointerdown', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true
        });
        pointerEvent.pointerId = touch.identifier;
      }
      canvas.dispatchEvent(pointerEvent);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (ev) => {
    ev.preventDefault();

    if (ev.touches.length === 2 && isGesturing) {
      // Pinch zoom gesture
      const currentDistance = getTouchDistance(ev.touches);
      const center = getTouchCenter(ev.touches);
      const r = rect();

      if (lastTouchDistance > 0) {
        const scaleFactor = currentDistance / lastTouchDistance;
        const newScale = game.camera.targetScale * scaleFactor;
        const clampedScale = Math.max(game.camera.minScale, Math.min(game.camera.maxScale, newScale));

        if (clampedScale !== game.camera.targetScale) {
          // Zoom towards touch center
          const worldCenter = screenToWorld(game.camera, center.x - r.left, center.y - r.top);
          const scaleChange = clampedScale - game.camera.targetScale;
          game.camera.targetScale = clampedScale;
          game.camera.targetX -= worldCenter.x * scaleChange;
          game.camera.targetY -= worldCenter.y * scaleChange;

          // Track manual zoom to prevent auto-adjustment
          if (typeof window.trackManualZoom === 'function') {
            window.trackManualZoom();
          }

          game.needsRedraw = true;
        }
      }

      lastTouchDistance = currentDistance;
    } else if (ev.touches.length === 1 && !isGesturing) {
      // Single touch move - convert to pointer event (with fallback)
      const touch = ev.touches[0];
      let pointerEvent;
      try {
        pointerEvent = new PointerEvent('pointermove', {
          pointerId: touch.identifier,
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true
        });
      } catch (e) {
        pointerEvent = new MouseEvent('pointermove', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true
        });
        pointerEvent.pointerId = touch.identifier;
      }
      canvas.dispatchEvent(pointerEvent);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (ev) => {
    ev.preventDefault();

    if (ev.touches.length === 0) {
      // All touches ended
      const touchDuration = Date.now() - touchStartTime;

      if (isGesturing) {
        // End of pinch gesture
        isGesturing = false;
        lastTouchDistance = 0;
      } else if (touchDuration < 200) {
        // Quick tap - convert to pointer events (with fallback)
        const touch = ev.changedTouches[0];
        let pointerDown, pointerUp;

        try {
          pointerDown = new PointerEvent('pointerdown', {
            pointerId: touch.identifier,
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
          });
          pointerUp = new PointerEvent('pointerup', {
            pointerId: touch.identifier,
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
          });
        } catch (e) {
          pointerDown = new MouseEvent('pointerdown', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
          });
          pointerDown.pointerId = touch.identifier;

          pointerUp = new MouseEvent('pointerup', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
          });
          pointerUp.pointerId = touch.identifier;
        }

        // Simulate quick tap
        canvas.dispatchEvent(pointerDown);
        setTimeout(() => canvas.dispatchEvent(pointerUp), 10);
      } else {
        // Long touch - just end normally
        const touch = ev.changedTouches[0];
        let pointerEvent;
        try {
          pointerEvent = new PointerEvent('pointerup', {
            pointerId: touch.identifier,
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
          });
        } catch (e) {
          pointerEvent = new MouseEvent('pointerup', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
          });
          pointerEvent.pointerId = touch.identifier;
        }
        canvas.dispatchEvent(pointerEvent);
      }
    } else if (ev.touches.length === 1 && isGesturing) {
      // From pinch back to single touch
      isGesturing = false;
      lastTouchDistance = 0;
    }
  }, { passive: false });

  // Touch-based pointerup equivalent is handled in touchend above
  // Wheel events are handled in the non-touch conditional above
}

function projectPointToSegment(px, py, x1, y1, x2, y2){
  const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1; const lenSq = C*C + D*D; if (lenSq === 0) return { x: x1, y: y1 };
  let t = (A*C + B*D) / lenSq; t = Math.max(0, Math.min(1, t)); return { x: x1 + t*C, y: y1 + t*D };
}

function canInsertStationAt(game, line, stationIdx, position){
  // Prevent duplicates: don't insert if station already in line at same position
  if (line.stations.includes(stationIdx)) return { valid:false, reason:'duplicate' };
  const newIdx = position == null ? line.stations.length : Math.max(0, Math.min(position, line.stations.length));
  const S = game.stations[stationIdx]; if (!S) return { valid:false };
  const poly = game.config.thamesPolygon;
  let crossingsNeeded = 0;
  const prevIdx = newIdx - 1; const nextIdx = newIdx;
  if (prevIdx >= 0 && line.stations[prevIdx] != null){
    const A = game.stations[line.stations[prevIdx]];
    if (needsRiverCrossing(A, S, poly)) crossingsNeeded++;
  }
  if (nextIdx < line.stations.length && line.stations[nextIdx] != null){
    const B = game.stations[line.stations[nextIdx]];
    if (needsRiverCrossing(S, B, poly)) crossingsNeeded++;
  }
  if (crossingsNeeded > 0 && (game.tunnels || 0) < crossingsNeeded) return { valid:false, reason:'tunnels' };
  return { valid:true };
}

function needsRiverCrossing(P, Q, poly){
  if (!poly || poly.length < 3) return false;
  // Quick side check using polygon min/max Y band to reduce false positives near the bank
  let minY = Infinity, maxY = -Infinity;
  for (const v of poly){ if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y; }
  const tol = 6; // tolerance near banks
  const ay = P.y, by = Q.y;
  if ((ay < minY - tol && by < minY - tol) || (ay > maxY + tol && by > maxY + tol)) return false;
  // Otherwise do precise polygon-edge intersection test
  return segmentCrossesPolygon({x:P.x,y:P.y},{x:Q.x,y:Q.y}, poly);
}

// Strategic color selection based on station types
function getStrategicColorIndex(game, fromStationIdx, toStationIdx) {
  const fromStation = game.stations[fromStationIdx];
  const toStation = game.stations[toStationIdx];
  
  if (!fromStation || !toStation) return 0; // Default gold
  
  const isFinalRoute = toStation.isFinal || fromStation.isFinal;
  const isHubRoute = (toStation.isInterchange && fromStation.isInterchange);
  const isHubConnector = toStation.isInterchange || fromStation.isInterchange;
  
  // Strategic color priority:
  // 0: Gold - Express routes to final destinations (highest priority)
  // 1: Teal - Hub-to-hub connectors
  // 2: Blue - Regional feeder routes (to/from hubs)
  // 3: Red - Overflow relief routes (regional connections)
  
  if (isFinalRoute) return 0; // Gold for express to finals
  if (isHubRoute) return 1;   // Teal for hub-to-hub
  if (isHubConnector) return 2; // Blue for hub feeders
  return 3; // Red for regional connections
}
