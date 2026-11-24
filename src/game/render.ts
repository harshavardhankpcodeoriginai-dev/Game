import { DANGER_Y, GAME_OVER_SECONDS, LEVELS, SPAWN_Y, WORLD_H, WORLD_W } from "./constants";
import type { Engine } from "./engine";

export function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, level: number, highlight = false) {
  const L = LEVELS[level]!;
  ctx.save();
  ctx.shadowColor = "rgba(40,20,80,0.25)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  const g = ctx.createRadialGradient(x - L.r * 0.35, y - L.r * 0.4, L.r * 0.1, x, y, L.r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.25, L.color);
  g.addColorStop(1, L.stroke);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, L.r - 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = highlight ? "#ffffff" : L.stroke;
  ctx.beginPath();
  ctx.arc(x, y, L.r - 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `700 ${Math.max(12, L.r * 0.7)}px Fredoka, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(level + 1), x, y + 1);
}

export function render(ctx: CanvasRenderingContext2D, e: Engine, aiming: boolean, t: number) {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);

  // danger zone
  const pulse = e.danger > 0 ? 0.15 + 0.25 * (e.danger / GAME_OVER_SECONDS) * (0.6 + 0.4 * Math.sin(t * 12)) : 0.07;
  ctx.fillStyle = `rgba(255,80,110,${pulse})`;
  ctx.fillRect(0, 0, WORLD_W, DANGER_Y);
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "rgba(255,80,110,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, DANGER_Y);
  ctx.lineTo(WORLD_W, DANGER_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  // aim guide + current ball
  if (!e.over) {
    const r = LEVELS[e.current]!.r;
    const ready = e.canDrop();
    if (aiming && ready) {
      ctx.strokeStyle = "rgba(90,60,160,0.25)";
      ctx.setLineDash([4, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.aimX, SPAWN_Y + r);
      ctx.lineTo(e.aimX, WORLD_H);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = ready ? 1 : 0.4;
    drawBall(ctx, e.aimX, SPAWN_Y, e.current, true);
    ctx.globalAlpha = 1;
  }

  for (const b of e.balls) drawBall(ctx, b.x, b.y, b.level);

  ctx.font = "700 22px Fredoka, system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const p of e.popups) {
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.fillStyle = "#5b3cc4";
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}
