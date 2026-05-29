// ============================================================
// GridBots — Grid Floor Renderer
// The 80s Tron-style perspective grid in light green. Shared by
// the combat scene and (later) the Command Grid hub.
// ============================================================

const HORIZON = 110;

export function drawGridFloor(ctx: CanvasRenderingContext2D, t: number, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#04140a";
  ctx.fillRect(0, 0, w, h);

  // horizon line
  ctx.strokeStyle = "rgba(60,255,133,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, HORIZON); ctx.lineTo(w, HORIZON); ctx.stroke();

  // scrolling horizontal floor lines, perspective-spaced
  ctx.strokeStyle = "rgba(60,255,133,0.45)";
  const scroll = (t * 0.00018) % 1;
  for (let i = 0; i < 14; i++) {
    const f = (i + scroll) / 14;
    const y = HORIZON + Math.pow(f, 2) * (h - HORIZON);
    ctx.globalAlpha = 0.15 + f * 0.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // converging vertical lines
  ctx.globalAlpha = 0.35;
  const cx = w / 2;
  for (let i = -10; i <= 10; i++) {
    const x = cx + i * 70;
    ctx.beginPath(); ctx.moveTo(cx + i * 16, HORIZON); ctx.lineTo(x, h); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
