import { createHexPath } from '../systems/hexgrid.js';

export function buildOverlapMap(game){
  const map = {};
  for (const line of game.lines){
    for (let i=0;i<line.stations.length-1;i++){
      const a = line.stations[i], b = line.stations[i+1];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!map[key]) map[key] = [];
      map[key].push(line.id);
    }
  }
  for (const k in map) map[k].sort((x,y)=>x-y);
  return map;
}

export function drawMultiStationLine(ctx, cam, game, line, overlapMap){
  if (line.stations.length < 2) return;
  ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.translate(cam.x, cam.y); ctx.scale(cam.scale, cam.scale);
  let basePts;
  if (line.waypoints && line.waypoints.length>0){
    basePts = line.waypoints;
  } else {
    basePts = line.stations.map(idx => game.stations[idx]).filter(Boolean).map(s=>({x:s.x,y:s.y}));
  }
  // Only apply parallel offset math when the base points correspond 1:1 to station indices.
  const pts = (basePts.length === line.stations.length)
    ? basePts.map((p,i)=> getOffsetForPoint(i, basePts, line, overlapMap, game))
    : basePts;
  const radius = game.config.lineCornerRadius;
  // outline
  ctx.beginPath(); ctx.strokeStyle = '#f7f8fa'; ctx.lineWidth = game.config.lineOutlineWidth / cam.scale; ctx.globalAlpha = 0.9; drawRoundedPolyline(ctx, pts, radius, !!line.isLoop);
  ctx.stroke();
  // color
  ctx.beginPath(); ctx.strokeStyle = line.color; ctx.lineWidth = game.config.lineInnerWidth / cam.scale; ctx.globalAlpha = 1.0; drawRoundedPolyline(ctx, pts, radius, !!line.isLoop); ctx.stroke();
  // end caps
  if (!line.isLoop && pts.length >= 2){ drawEndCap(ctx, cam, pts[0], pts[1], line.color, game); drawEndCap(ctx, cam, pts[pts.length-1], pts[pts.length-2], line.color, game); }
  ctx.restore();
}

export function drawRoundedPolyline(ctx, points, radius, isLoop){
  if (!points || points.length < 2) return;
  const n = points.length;
  if (!isLoop){
    ctx.moveTo(points[0].x, points[0].y);
    for (let i=1;i<n-1;i++){
      const prev = points[i-1], curr = points[i], next = points[i+1];
      const aLen = Math.hypot(prev.x - curr.x, prev.y - curr.y);
      const bLen = Math.hypot(next.x - curr.x, next.y - curr.y);
      const rA = Math.min(radius, aLen*0.5); const rB = Math.min(radius, bLen*0.5);
      const from = moveTowards(curr, prev, rA); const to = moveTowards(curr, next, rB);
      ctx.lineTo(from.x, from.y); ctx.quadraticCurveTo(curr.x, curr.y, to.x, to.y);
    }
    ctx.lineTo(points[n-1].x, points[n-1].y);
  } else {
    if (n===2){ ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[1].x, points[1].y); }
    else {
      const pN = points[n-1], p0 = points[0], p1 = points[1];
      const rA0 = Math.min(radius, Math.hypot(pN.x - p0.x, pN.y - p0.y)*0.5);
      const rB0 = Math.min(radius, Math.hypot(p1.x - p0.x, p1.y - p0.y)*0.5);
      const start = moveTowards(p0, p1, rB0);
      ctx.moveTo(start.x, start.y);
      for (let i=0;i<n;i++){
        const prev = points[(i-1+n)%n], curr = points[i], next = points[(i+1)%n];
        const aLen = Math.hypot(prev.x - curr.x, prev.y - curr.y); const bLen = Math.hypot(next.x - curr.x, next.y - curr.y);
        const rA = Math.min(radius, aLen*0.5); const rB = Math.min(radius, bLen*0.5);
        const from = moveTowards(curr, prev, rA); const to = moveTowards(curr, next, rB);
        ctx.lineTo(from.x, from.y); ctx.quadraticCurveTo(curr.x, curr.y, to.x, to.y);
      }
      ctx.closePath();
    }
  }
}
function moveTowards(from, to, dist){ const dx = to.x-from.x, dy = to.y-from.y; const len = Math.hypot(dx,dy)||1; const t = dist/len; return { x: from.x + dx*t, y: from.y + dy*t }; }

function getOffsetForPoint(i, points, line, overlapMap, game){
  const n = points.length; const SPACING = game.config.parallelSpacing;
  function segmentIndex(aIdx,bIdx){ const key = aIdx < bIdx ? `${aIdx}-${bIdx}` : `${bIdx}-${aIdx}`; const group = overlapMap[key]; if (!group) return {offset:0,count:1}; const count=group.length; const pos = Math.max(0, group.indexOf(line.id)); const centered = pos - (count-1)/2; return {offset:centered,count}; }
  let offA={offset:0,count:1}, offB={offset:0,count:1}; if (i>0) offA = segmentIndex(line.stations[i-1], line.stations[i]); if (i<n-1) offB = segmentIndex(line.stations[i], line.stations[i+1]); const off = (offA.offset + offB.offset)/2;
  let dx=0, dy=0; if (i>0){ dx += points[i].x - points[i-1].x; dy += points[i].y - points[i-1].y; } if (i<n-1){ dx += points[i+1].x - points[i].x; dy += points[i+1].y - points[i].y; }
  const len = Math.hypot(dx,dy)||1; const nx = -dy/len, ny = dx/len; return { x: points[i].x + nx*SPACING*off, y: points[i].y + ny*SPACING*off };
}

function drawEndCap(ctx, cam, point, nextPoint, color, game){
  const dx = nextPoint.x - point.x, dy = nextPoint.y - point.y; const len = Math.hypot(dx,dy)||1; const ux=dx/len, uy=dy/len; const px=-uy, py=ux; const out = game.config.endCapOut, half = game.config.endCapHalf;
  ctx.strokeStyle = '#f7f8fa'; ctx.lineWidth = game.config.lineOutlineWidth / cam.scale; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(point.x + ux*out, point.y + uy*out); ctx.lineTo(point.x, point.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(point.x + px*half, point.y + py*half); ctx.lineTo(point.x - px*half, point.y - py*half); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = game.config.lineInnerWidth / cam.scale; ctx.beginPath(); ctx.moveTo(point.x + ux*(out-2), point.y + uy*(out-2)); ctx.lineTo(point.x + ux*2, point.y + uy*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(point.x + px*(half-2), point.y + py*(half-2)); ctx.lineTo(point.x - px*(half-2), point.y - py*(half-2)); ctx.stroke();
}
