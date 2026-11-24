import type { Ball, EngineEvents, Popup } from "@/types/game";
import {
  DANGER_Y, DROP_COOLDOWN, GAME_OVER_SECONDS, GRAVITY, LEVELS, RESTITUTION,
  SPAWN_Y, WALL_FRICTION, WORLD_H, WORLD_W,
} from "./constants";

/** Pure game simulation — no React. Coordinates are in fixed world units. */
export class Engine {
  balls: Ball[] = [];
  popups: Popup[] = [];
  current = 0;
  next = 0;
  aimX = WORLD_W / 2;
  cooldown = 0;
  danger = 0;
  score = 0;
  drops = 0;
  over = false;
  private id = 0;
  private bounceCd = 0;

  // No randomness here so server and browser render the same first frame; reset() runs on PLAY.
  constructor(private ev: EngineEvents) {}

  reset() {
    this.balls = [];
    this.popups = [];
    this.score = 0;
    this.drops = 0;
    this.danger = 0;
    this.cooldown = 0;
    this.over = false;
    this.aimX = WORLD_W / 2;
    this.current = 0;
    this.next = this.pickNext();
    this.ev.onScore(0);
    this.ev.onNext(this.next);
  }

  /** Weighted randomization: early game almost only small balls. */
  pickNext(): number {
    const maxOnBoard = this.balls.reduce((m, b) => Math.max(m, b.level), 0);
    let cap = 1;
    if (this.drops >= 6) cap = 2;
    if (this.drops >= 15 && maxOnBoard >= 3) cap = 3;
    if (this.drops >= 30 && maxOnBoard >= 4) cap = 4;
    const weights = [10, 7, 4, 2, 1].slice(0, cap + 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      if ((r -= weights[i]!) < 0) return i;
    }
    return 0;
  }

  /** Clamp so the full ball is always inside the walls. */
  clampX(x: number, r: number) {
    return Math.min(WORLD_W - r, Math.max(r, x));
  }

  setAim(x: number) {
    this.aimX = this.clampX(x, LEVELS[this.current]!.r);
  }

  canDrop() {
    return !this.over && this.cooldown <= 0;
  }

  drop() {
    if (!this.canDrop()) return false;
    const r = LEVELS[this.current]!.r;
    this.balls.push({
      id: ++this.id, x: this.clampX(this.aimX, r), y: SPAWN_Y, vx: 0, vy: 60,
      r, level: this.current, age: 0,
    });
    this.drops++;
    this.cooldown = DROP_COOLDOWN;
    this.current = this.next;
    this.next = this.pickNext();
    this.aimX = this.clampX(this.aimX, LEVELS[this.current]!.r);
    this.ev.onNext(this.next);
    this.ev.onSound("drop");
    return true;
  }

  update(dt: number) {
    if (this.over) return;
    dt = Math.min(dt, 1 / 30);
    this.cooldown -= dt;
    this.bounceCd -= dt;
    const steps = 6;
    const h = dt / steps;
    for (let s = 0; s < steps; s++) this.step(h);
    this.merge();

    for (const p of this.popups) { p.life -= dt; p.y -= 40 * dt; }
    this.popups = this.popups.filter((p) => p.life > 0);

    // Danger zone: a settled ball whose top stays above the line.
    const inDanger = this.balls.some(
      (b) => b.age > 1 && b.y - b.r < DANGER_Y && Math.abs(b.vy) < 60,
    );
    this.danger = inDanger ? this.danger + dt : Math.max(0, this.danger - dt * 2);
    if (this.danger >= GAME_OVER_SECONDS) {
      this.over = true;
      this.ev.onSound("gameover");
      this.ev.onGameOver();
    }
  }

  private step(h: number) {
    const bs = this.balls;
    for (const b of bs) {
      b.age += h;
      b.vy += GRAVITY * h;
      b.vx *= 0.999;
      b.x += b.vx * h;
      b.y += b.vy * h;
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) * RESTITUTION; b.vy *= WALL_FRICTION; }
      if (b.x + b.r > WORLD_W) { b.x = WORLD_W - b.r; b.vx = -Math.abs(b.vx) * RESTITUTION; b.vy *= WALL_FRICTION; }
      if (b.y + b.r > WORLD_H) {
        if (b.vy > 250 && this.bounceCd <= 0) { this.ev.onSound("bounce"); this.bounceCd = 0.12; }
        b.y = WORLD_H - b.r;
        b.vy = -Math.abs(b.vy) * RESTITUTION;
        if (Math.abs(b.vy) < 20) b.vy = 0;
        b.vx *= 0.96;
      }
    }
    // Circle collisions with positional correction + impulse.
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i]!, c = bs[j]!;
        const dx = c.x - a.x, dy = c.y - a.y;
        const rr = a.r + c.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 0.01;
        const nx = d2 ? dx / d : 1, ny = d2 ? dy / d : 0;
        const overlap = rr - d;
        const ma = a.r * a.r, mc = c.r * c.r, tot = ma + mc;
        a.x -= nx * overlap * (mc / tot);
        a.y -= ny * overlap * (mc / tot);
        c.x += nx * overlap * (ma / tot);
        c.y += ny * overlap * (ma / tot);
        const rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
        if (rv < 0) {
          const jimp = (-(1 + RESTITUTION) * rv) / (1 / ma + 1 / mc);
          a.vx -= (jimp / ma) * nx; a.vy -= (jimp / ma) * ny;
          c.vx += (jimp / mc) * nx; c.vy += (jimp / mc) * ny;
          // tangential friction
          const tx = -ny, ty = nx;
          const tv = (c.vx - a.vx) * tx + (c.vy - a.vy) * ty;
          const f = tv * 0.05;
          a.vx += f * tx * (mc / tot); a.vy += f * ty * (mc / tot);
          c.vx -= f * tx * (ma / tot); c.vy -= f * ty * (ma / tot);
        }
      }
    }
    // Re-clamp after collision pushes so nothing leaves the board.
    for (const b of bs) {
      b.x = this.clampX(b.x, b.r);
      if (b.y + b.r > WORLD_H) b.y = WORLD_H - b.r;
    }
  }

  private merge() {
    const bs = this.balls;
    const born: Ball[] = [];
    for (let i = 0; i < bs.length; i++) {
      const a = bs[i]!;
      if (a.dead) continue;
      for (let j = i + 1; j < bs.length; j++) {
        const c = bs[j]!;
        if (c.dead || c.level !== a.level) continue;
        const dx = c.x - a.x, dy = c.y - a.y, rr = a.r + c.r + 1.5;
        if (dx * dx + dy * dy > rr * rr) continue;
        a.dead = c.dead = true;
        const x = (a.x + c.x) / 2, y = (a.y + c.y) / 2;
        const pts = LEVELS[a.level]!.points;
        this.score += pts;
        this.popups.push({ x, y, text: `+${pts}`, life: 0.9 });
        if (a.level < LEVELS.length - 1) {
          const nl = a.level + 1, r = LEVELS[nl]!.r;
          born.push({
            id: ++this.id, x: this.clampX(x, r), y: Math.min(y, WORLD_H - r),
            vx: (a.vx + c.vx) / 2, vy: Math.min(0, (a.vy + c.vy) / 2) - 80,
            r, level: nl, age: 1,
          });
        }
        break;
      }
    }
    if (born.length || bs.some((b) => b.dead)) {
      this.balls = bs.filter((b) => !b.dead).concat(born);
      this.ev.onScore(this.score);
      this.ev.onSound("merge");
    }
  }
}
