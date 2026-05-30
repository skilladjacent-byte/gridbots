// ============================================================
// GridBots — Bot Rig Renderer
// Procedural skeletal rig drawn to a 2D canvas. Each bot is a
// set of parts (torso/head/arms/legs) posed by an animation
// state machine. Part-swapping in Phase 3 changes the shapes
// drawn at each mount point; the animation logic stays the same.
// ============================================================

import type { BuildKind } from "../data/bots";
import type { BotPaint, PartPaint, PartSlot, PartPalette, Family } from "../core/types";
import { drawPart, drawChassis } from "./partArt";

/** Which part ids + paint this rig should render (from the AssembledBot). */
export interface RigSkin {
  partIds: { head?: string; leftArm?: string; rightArm?: string; legs?: string };
  chassisFamily: Family;
  paint: BotPaint;
}

export type AnimName =
  | "idle"
  | "melee_L" | "melee_R"
  | "ranged_L" | "ranged_R"
  | "super"
  | "block"
  | "evade"
  | "buff"
  | "victory"
  | null;

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  color: string;
  big: boolean;
  life: number;
}

export const GROUND_Y = 150;

/** All mutable visual state for one bot. */
export class BotRig {
  x: number;
  baseX: number;
  dir: number;          // +1 faces right, -1 faces left
  color: string;
  build: BuildKind;

  anim: AnimName = null;
  animT = 0;
  animDur = 0;

  /** Optional skin: part ids + paint to render via the art registry.
   *  When absent, the rig falls back to its legacy single-color shapes. */
  skin?: RigSkin;

  shield = 0;
  shieldFlash = 0;
  vanish = 0;
  hitFlash = 0;
  shove = 0;
  vy = 0;
  armL = 0;
  armR = 0;
  projectiles: Projectile[] = [];

  constructor(baseX: number, dir: number, color: string, build: BuildKind, skin?: RigSkin) {
    this.x = baseX;
    this.baseX = baseX;
    this.dir = dir;
    this.color = color;
    this.build = build;
    this.skin = skin;
  }

  /** Compose a part's PartPalette from per-part primary/secondary + bot energy/eyes. */
  private paletteFor(slot: PartSlot | "chassis"): PartPalette {
    const paint = this.skin!.paint;
    const pp: PartPaint = paint.parts[slot];
    return { primary: pp.primary, secondary: pp.secondary, energy: paint.energy, eyes: paint.eyes };
  }

  setAnim(name: AnimName, dur: number) {
    this.anim = name;
    this.animT = 0;
    this.animDur = dur;
  }

  takeDamage() { this.hitFlash = 1; this.shove = 1; }
  blockSuccess() { this.shieldFlash = 1; this.shield = Math.max(this.shield, 1); }

  fireProjectile(color: string, big = false) {
    this.projectiles.push({ x: this.x + this.dir * 40, y: GROUND_Y - 30, vx: this.dir * 16, color, big, life: 1 });
  }

  reset() {
    this.x = this.baseX;
    this.anim = null;
    this.shield = this.shieldFlash = this.vanish = this.hitFlash = this.shove = this.vy = 0;
    this.armL = this.armR = 0;
    this.projectiles = [];
  }

  /** Advance simulation by dt ms. */
  update(dt: number) {
    if (this.anim) this.animT += dt;
    let targetX = this.baseX, sh = 0, vanish = 0, armL = 0, armR = 0, vy = 0;
    const T = this.anim ? Math.min(1, this.animT / this.animDur) : 0;
    const a = this.anim;

    if (a && a.startsWith("melee")) {
      const arm = a.endsWith("L") ? "L" : "R";
      if (T < 0.35) {
        targetX = this.baseX + this.dir * easeOut(T / 0.35) * 180;
      } else if (T < 0.55) {
        targetX = this.baseX + this.dir * 180;
        const k = (T - 0.35) / 0.2;
        if (arm === "R") armR = easeOut(k); else armL = easeOut(k);
      } else {
        const k = (T - 0.55) / 0.45;
        targetX = this.baseX + this.dir * 180 * (1 - easeIn(k));
        if (arm === "R") armR = 1 - k; else armL = 1 - k;
      }
    } else if (a && a.startsWith("ranged")) {
      const arm = a.endsWith("L") ? "L" : "R";
      const ext = Math.sin(Math.min(1, T * 1.4) * Math.PI);
      if (arm === "R") armR = ext; else armL = ext;
    } else if (a === "super") {
      if (T < 0.4) { vy = -easeOut(T / 0.4) * 14; armR = easeOut(T / 0.4); }
      else { targetX = this.baseX + this.dir * easeOut((T - 0.4) / 0.6) * 120; armR = 1; }
    } else if (a === "block") {
      sh = Math.sin(Math.min(1, T * 1.2) * Math.PI);
    } else if (a === "evade") {
      vanish = Math.sin(T * Math.PI);
      if (T > 0.5) targetX = this.baseX + this.dir * -30;
    } else if (a === "buff") {
      vy = -Math.sin(T * Math.PI) * 8;
    } else if (a === "victory") {
      vy = -Math.abs(Math.sin(this.animT * 0.006)) * 16;
      armR = Math.abs(Math.sin(this.animT * 0.006));
    }

    const shoveX = this.shove > 0 ? -this.dir * this.shove * 14 : 0;
    this.x += (targetX + shoveX - this.x) * Math.min(1, dt * 0.02);
    this.shield += (sh - this.shield) * Math.min(1, dt * 0.02);
    this.vanish += (vanish - this.vanish) * Math.min(1, dt * 0.03);
    this.armL += (armL - this.armL) * Math.min(1, dt * 0.03);
    this.armR += (armR - this.armR) * Math.min(1, dt * 0.03);
    this.vy += (vy - this.vy) * Math.min(1, dt * 0.02);

    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 0.004);
    if (this.shove > 0) this.shove = Math.max(0, this.shove - dt * 0.006);
    if (this.shieldFlash > 0) this.shieldFlash = Math.max(0, this.shieldFlash - dt * 0.0035);
    if (this.anim && this.animT >= this.animDur && this.anim !== "victory") this.anim = null;

    for (const pr of this.projectiles) { pr.x += pr.vx * dt * 0.06; pr.life -= dt * 0.001; }
    this.projectiles = this.projectiles.filter(pr => pr.life > 0 && pr.x > 0 && pr.x < 680);
  }

  draw(ctx: CanvasRenderingContext2D, t: number) {
    const dir = this.dir;
    const bob = Math.sin(t * 0.003 + (dir > 0 ? 0 : 1)) * 3 + this.vy;
    const tank = this.build === "tank";
    const torsoW = tank ? 64 : 46, torsoH = tank ? 58 : 54, headW = tank ? 46 : 38, headH = tank ? 32 : 34;
    const alpha = 1 - this.vanish * 0.92;
    const hf = this.hitFlash;

    ctx.save();
    ctx.translate(this.x, GROUND_Y + bob);

    // shadow
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(0, 46, torsoW * 0.55, 8, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = alpha;

    // vanish afterimages
    if (this.vanish > 0.05) {
      ctx.strokeStyle = this.color; ctx.globalAlpha = this.vanish * 0.4; ctx.lineWidth = 2;
      for (let k = 1; k <= 2; k++) {
        ctx.save(); ctx.translate(-dir * k * 12 * this.vanish, 0);
        rr(ctx, -torsoW / 2, -10, torsoW, torsoH, 8); ctx.stroke(); ctx.restore();
      }
      ctx.globalAlpha = alpha;
    }

    if (this.skin) {
      // ---- Registry path: family parts + composed 4-region palettes ----
      const scale = tank ? 1.15 : 1;
      const build: "agile" | "tank" = tank ? "tank" : "agile";
      // legs (behind), drawn at the bot's lower body
      drawPart("legs", this.skin.partIds.legs, {
        ctx, x: 0, y: 44, dir, pal: this.paletteFor("legs"), hitFlash: hf, scale, t,
      });
      // chassis/torso
      const tor = drawChassis({
        ctx, x: 0, y: 0, dir, pal: this.paletteFor("chassis"), hitFlash: hf, scale, t,
      }, build, this.skin.chassisFamily);
      // head above torso
      drawPart("head", this.skin.partIds.head, {
        ctx, x: 0, y: -10, dir, pal: this.paletteFor("head"), hitFlash: hf, scale, t,
      });
      // arms at torso sides, extension driven by animation state
      const ax = tor.w / 2;
      drawPart("leftArm", this.skin.partIds.leftArm, {
        ctx, x: -ax * dir, y: 8, dir: -dir, pal: this.paletteFor("leftArm"), hitFlash: hf, scale, ext: this.armL, t,
      });
      drawPart("rightArm", this.skin.partIds.rightArm, {
        ctx, x: ax * dir, y: 8, dir, pal: this.paletteFor("rightArm"), hitFlash: hf, scale, ext: this.armR, t,
      });
    } else {
      // ---- Legacy path: single-color procedural shapes ----
      const lineCol = hf > 0 ? "#ff2a2a" : this.color;
      ctx.strokeStyle = lineCol; ctx.lineWidth = tank ? 3 : 2.5;
      ctx.fillStyle = hf > 0 ? "rgba(255,40,40,0.30)" : this.color + "18";
      if (hf > 0) { ctx.shadowColor = "#ff2a2a"; ctx.shadowBlur = 20 * hf; }
      rr(ctx, -torsoW / 2, -10, torsoW, torsoH, 8); ctx.fill(); ctx.stroke();
      rr(ctx, -headW / 2, -10 - headH, headW, headH, 7); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      // eyes
      ctx.fillStyle = hf > 0 ? "#ff5a5a" : this.color;
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
      const eyeY = -10 - headH / 2;
      ctx.beginPath(); ctx.arc(-8 * dir, eyeY, 4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(7 * dir, eyeY, 4, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;

      // arms
      this.drawArm(ctx, "L", torsoW, tank, hf);
      this.drawArm(ctx, "R", torsoW, tank, hf);

      // legs
      ctx.strokeStyle = hf > 0 ? "#ff2a2a" : this.color; ctx.lineWidth = tank ? 9 : 7;
      ctx.beginPath(); ctx.moveTo(-12, 44); ctx.lineTo(-14, 62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, 44); ctx.lineTo(14, 62); ctx.stroke();
    }

    // shield
    if (this.shield > 0.03 || this.shieldFlash > 0.03) {
      const intensity = Math.max(this.shield, this.shieldFlash);
      ctx.globalAlpha = Math.min(1, intensity * 0.95);
      ctx.save(); ctx.translate(dir * (torsoW / 2 + 18), 20);
      drawHexShield(ctx, intensity, this.shieldFlash);
      ctx.restore();
      ctx.globalAlpha = alpha;
    }

    ctx.restore();

    // projectiles
    for (const pr of this.projectiles) {
      ctx.save(); ctx.globalAlpha = Math.max(0, pr.life);
      ctx.fillStyle = pr.color; ctx.shadowColor = pr.color; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.ellipse(pr.x, GROUND_Y - 30, pr.big ? 16 : 9, pr.big ? 7 : 4, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  }

  private drawArm(ctx: CanvasRenderingContext2D, side: "L" | "R", torsoW: number, tank: boolean, hf: number) {
    const dir = this.dir;
    const ax = (side === "R" ? dir : -dir) * (torsoW / 2);
    const ext = side === "R" ? this.armR : this.armL;
    ctx.strokeStyle = hf > 0 ? "#ff2a2a" : this.color;
    ctx.lineWidth = tank ? 7 : 6; ctx.lineCap = "round";
    const ex = ax + dir * (14 + ext * 30);
    const ey = 2 + 18 - ext * 16;
    ctx.beginPath(); ctx.moveTo(ax, 2); ctx.lineTo(ex, ey); ctx.stroke();
    if (ext > 0.5) {
      ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 10 * ext;
      ctx.beginPath(); ctx.arc(ex, ey, 5, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    }
  }
}

function drawHexShield(ctx: CanvasRenderingContext2D, s: number, flash: number) {
  const bright = flash > 0.03;
  ctx.strokeStyle = bright ? "#bfe9ff" : "#5fd0ff";
  ctx.fillStyle = bright ? "rgba(120,200,255," + (0.1 + flash * 0.35) + ")" : "rgba(77,184,255,0.10)";
  ctx.lineWidth = bright ? 2.5 : 1.5;
  ctx.shadowColor = "#4db8ff"; ctx.shadowBlur = (bright ? 28 : 14) * Math.max(s, flash);
  const R = 30 + flash * 6;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = Math.PI / 6 + i * Math.PI / 3;
    const px = Math.cos(ang) * R, py = Math.sin(ang) * R * 1.3;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 0.75; ctx.globalAlpha *= 0.6;
  for (let i = 0; i < 6; i++) {
    const ang = Math.PI / 6 + i * Math.PI / 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * R, Math.sin(ang) * R * 1.3); ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeIn(t: number) { return t * t; }
