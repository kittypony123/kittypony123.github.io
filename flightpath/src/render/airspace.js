export function drawRestrictedAirspace(ctx, cam, pathD){
  if (!pathD) return;
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.scale(cam.scale, cam.scale);
  ctx.lineCap = 'round';
  ctx.globalAlpha = 1.0;
  const path = new Path2D(pathD);
  
  // WCAG compliant restricted airspace with proper visibility on dark backgrounds
  // Outer atmospheric haze - High contrast blue
  ctx.strokeStyle = 'rgba(64, 224, 208, 0.25)'; // Turquoise haze - better contrast
  ctx.lineWidth = 68 / cam.scale;
  ctx.stroke(path);

  // Middle warning zone - High visibility amber
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.45)'; // Peach warning zone - WCAG compliant
  ctx.lineWidth = 46 / cam.scale;
  ctx.stroke(path);

  // Core restricted corridor - Balanced visibility
  ctx.strokeStyle = 'rgba(255, 107, 107, 0.65)'; // Coral red core - accessible but not overwhelming
  ctx.lineWidth = 24 / cam.scale;
  ctx.setLineDash([16 / cam.scale, 8 / cam.scale]);
  ctx.lineDashOffset = Date.now() * 0.01; // animated dash
  ctx.stroke(path);
  
  // Reset dash for other drawing
  ctx.setLineDash([]);
  ctx.restore();
}

