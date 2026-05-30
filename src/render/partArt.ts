// ============================================================
// GridBots — Part Art Registry (SWAPPABLE, 4-REGION)
// ------------------------------------------------------------
// Art Bible v3.0 color region system. Each part is drawn from
// FOUR recolorable channels + a fixed frame:
//   primary   60-70%  main armor masses        (recolorable)
//   secondary 15-25%  accents / trim / crests  (recolorable)
//   energy     small  glowing cores/vents      (recolorable)
//   eyes       small  expression channel       (recolorable)
//   frame    10-20%  joints/neck/elbows = GUNMETAL, NOT recolorable
//
// Art is keyed by FAMILY + SLOT (beetle head vs knight head are
// different silhouettes). Stats are independent of appearance.
//
// SWAPPING IN REAL ART LATER: change only this file. Replace a
// draw fn body with ctx.drawImage(sprite,...) at the same anchor,
// or repoint the registry. The rig/animation/combat never change.
// ============================================================

import type { PartSlot, Family, PartPalette } from "../core/types";

export const FRAME = "#2c333b";      // fixed gunmetal, never recolorable
const FRAME_DARK = "#1b2026";

/** Anchor + palette handed to a part's draw fn by the rig.
 *  Coords are LOCAL to the bot (rig already translated/posed). */
export interface PartDrawCtx {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  dir: number;              // +1 right, -1 left
  pal: PartPalette;         // the four recolorable channels
  hitFlash: number;         // 0..1 red damage tint
  scale: number;            // chassis size knob (1 = normal)
  ext?: number;             // arm extension 0..1 (animation)
  t: number;                // ms timestamp
}

export type PartDrawFn = (d: PartDrawCtx) => void;

// ---------- shared helpers ----------
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  return "#" + ((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, "0");
}
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace("#", ""), 16), pb = parseInt(b.replace("#", ""), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  return "#" + (((Math.round(ar + (br - ar) * t)) << 16) | ((Math.round(ag + (bg - ag) * t)) << 8) | (Math.round(ab + (bb - ab) * t))).toString(16).padStart(6, "0");
}
/** Bold flat region with a lit side + crisp outline. `armor` true uses
 *  hitFlash tint (it's recolorable armor); frame/energy pass false. */
function region(d: PartDrawCtx, path: () => void, color: string, litSide: number, armor = true) {
  const ctx = d.ctx;
  const base = (armor && d.hitFlash > 0) ? mix(color, "#ff2a2a", d.hitFlash) : color;
  ctx.fillStyle = base; path(); ctx.fill();
  ctx.save(); path(); ctx.clip();
  ctx.fillStyle = shade(base, 0.12);
  ctx.beginPath(); ctx.rect(litSide >= 0 ? -300 : 0, -300, 300, 600); ctx.fill();
  ctx.restore();
  ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = shade(base, -0.3);
  path(); ctx.stroke();
}
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.save(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
}
/** A short fixed-gunmetal frame stub (joint) between body parts. */
function joint(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = FRAME; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = FRAME_DARK; ctx.stroke();
}

// ============================================================
// HEADS
// ============================================================

// BEETLE head: rounded shell helmet (primary) + secondary horn crest,
// frame neck stub, energy brow, eyes. Shape language = beetle, not a bug.
const beetleHead: PartDrawFn = (d) => {
  const { ctx, x, y, dir, pal, scale } = d;
  const w = 40 * scale, h = 34 * scale;
  // frame neck stub (below head)
  joint(ctx, x, y + 2, 6 * scale);
  // primary rounded shell
  region(d, () => rr(ctx, x - w / 2, y - h, w, h, 12 * scale), pal.primary, dir);
  // secondary horn crest (accent only) sweeping up-forward
  ctx.save();
  region(d, () => {
    ctx.beginPath();
    ctx.moveTo(x - dir * 2, y - h + 3);
    ctx.lineTo(x + dir * 16 * scale, y - h - 12 * scale);
    ctx.lineTo(x + dir * 21 * scale, y - h - 8 * scale);
    ctx.lineTo(x + dir * 5 * scale, y - h + 7);
    ctx.closePath();
  }, pal.secondary, dir);
  ctx.restore();
  // energy brow vent (small)
  ctx.fillStyle = pal.energy;
  rr(ctx, x - w * 0.3, y - h * 0.78, w * 0.6, 3 * scale, 1.5 * scale); ctx.fill();
  // dark visor band (frame) + eyes
  ctx.fillStyle = FRAME_DARK; rr(ctx, x - w / 2 + 5, y - h * 0.62, w - 10, h * 0.34, 5); ctx.fill();
  glow(ctx, x - 8 * dir, y - h * 0.45, 3.4 * scale, pal.eyes);
  glow(ctx, x + 7 * dir, y - h * 0.45, 3.4 * scale, pal.eyes);
};

// KNIGHT head: structured helm (primary) + secondary heraldic crest fin
// running front-to-back, a frame visor brow, narrow eye slit.
const knightHead: PartDrawFn = (d) => {
  const { ctx, x, y, dir, pal, scale } = d;
  const w = 36 * scale, h = 36 * scale;
  joint(ctx, x, y + 2, 5.5 * scale);
  // primary helm (more angular/tall)
  region(d, () => rr(ctx, x - w / 2, y - h, w, h, 6 * scale), pal.primary, dir);
  // secondary mohawk crest (accent), front-to-back fin on top
  region(d, () => {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.10, y - h);
    ctx.lineTo(x + w * 0.10, y - h);
    ctx.lineTo(x + w * 0.06, y - h - 11 * scale);
    ctx.lineTo(x - w * 0.06, y - h - 11 * scale);
    ctx.closePath();
  }, pal.secondary, dir);
  // frame brow ridge
  ctx.fillStyle = FRAME; rr(ctx, x - w / 2, y - h * 0.7, w, h * 0.16, 3); ctx.fill();
  // dark visor slit + eyes
  ctx.fillStyle = FRAME_DARK; rr(ctx, x - w / 2 + 4, y - h * 0.5, w - 8, h * 0.2, 3); ctx.fill();
  glow(ctx, x - 8 * dir, y - h * 0.4, 3 * scale, pal.eyes);
  glow(ctx, x + 8 * dir, y - h * 0.4, 3 * scale, pal.eyes);
  // energy chin core
  glow(ctx, x, y - h * 0.12, 2.6 * scale, pal.energy);
};

// ============================================================
// ARMS  (frame shoulder joint + primary armor + secondary/energy accents)
// ============================================================

function shoulderJoint(d: PartDrawCtx) { joint(d.ctx, d.x, d.y, 6 * d.scale); }

// BEETLE right arm = RAILGUN: thick rounded shell barrel, energy muzzle.
const beetleRailgun: PartDrawFn = (d) => {
  const { ctx, x, y, dir, pal, scale, ext = 0 } = d;
  shoulderJoint(d);
  const reach = 16 + ext * 30;
  const ex = x + dir * reach, ey = y - ext * 14;
  region(d, () => rr(ctx, Math.min(x, ex) - 2, ey - 9 * scale, Math.abs(ex - x) + 24 * scale, 18 * scale, 8 * scale), pal.primary, dir);
  // secondary fin on top of barrel
  region(d, () => rr(ctx, Math.min(x, ex) + 4, ey - 12 * scale, Math.abs(ex - x) + 6 * scale, 4 * scale, 2), pal.secondary, dir);
  // energy muzzle
  glow(ctx, ex + dir * 20 * scale, ey, 6 * scale, pal.energy);
};

// KNIGHT right arm = LANCE: straight primary lance + secondary tip + energy.
const knightBlaster: PartDrawFn = (d) => {
  const { ctx, x, y, dir, pal, scale, ext = 0 } = d;
  shoulderJoint(d);
  const reach = 15 + ext * 30;
  const ex = x + dir * reach, ey = y - ext * 14;
  region(d, () => rr(ctx, Math.min(x, ex), ey - 6 * scale, Math.abs(ex - x) + 14 * scale, 12 * scale, 5 * scale), pal.primary, dir);
  // secondary lance tip (accent)
  region(d, () => {
    ctx.beginPath();
    ctx.moveTo(ex + dir * 14 * scale, ey - 6 * scale);
    ctx.lineTo(ex + dir * 26 * scale, ey);
    ctx.lineTo(ex + dir * 14 * scale, ey + 6 * scale);
    ctx.closePath();
  }, pal.secondary, dir);
  glow(ctx, ex + dir * 12 * scale, ey, 3.6 * scale, pal.energy);
};

// KNIGHT left arm = BULWARK: big primary shield plate + secondary trim.
const knightShield: PartDrawFn = (d) => {
  const { ctx, x, y, dir, pal, scale } = d;
  shoulderJoint(d);
  // forearm (frame) stub
  ctx.lineCap = "round"; ctx.lineWidth = 8 * scale; ctx.strokeStyle = FRAME;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dir * 14, y + 6); ctx.stroke();
  // primary shield plate
  region(d, () => rr(ctx, x + dir * 6 - 12 * scale, y - 14 * scale, 24 * scale, 30 * scale, 6 * scale), pal.primary, dir);
  // secondary trim border (thin accent inside edge)
  ctx.lineWidth = 3; ctx.strokeStyle = pal.secondary;
  rr(ctx, x + dir * 6 - 8 * scale, y - 10 * scale, 16 * scale, 22 * scale, 4); ctx.stroke();
  // energy boss center
  glow(ctx, x + dir * 6, y + 1, 3.4 * scale, pal.energy);
};

// BEETLE left arm = PINCER: primary forearm + secondary claw + energy.
const beetleUtility: PartDrawFn = (d) => {
  const { ctx, x, y, dir, pal, scale } = d;
  shoulderJoint(d);
  const ex = x + dir * 22, ey = y + 4;
  region(d, () => rr(ctx, Math.min(x, ex), ey - 6 * scale, Math.abs(ex - x) + 8 * scale, 12 * scale, 5 * scale), pal.primary, dir);
  // secondary pincer claws (two small accents)
  region(d, () => {
    ctx.beginPath();
    ctx.moveTo(ex + dir * 6 * scale, ey - 6 * scale);
    ctx.lineTo(ex + dir * 16 * scale, ey - 9 * scale);
    ctx.lineTo(ex + dir * 10 * scale, ey - 2 * scale);
    ctx.closePath();
    ctx.moveTo(ex + dir * 6 * scale, ey + 6 * scale);
    ctx.lineTo(ex + dir * 16 * scale, ey + 9 * scale);
    ctx.lineTo(ex + dir * 10 * scale, ey + 2 * scale);
    ctx.closePath();
  }, pal.secondary, dir);
  glow(ctx, ex, ey, 2.8 * scale, pal.energy);
};

// ============================================================
// LEGS  (primary thigh armor + frame shin + secondary foot accent)
// ============================================================

const knightLegs: PartDrawFn = (d) => {
  const { ctx, x, y, pal, scale } = d;
  for (const sx of [-12, 12]) {
    // primary thigh armor plate
    region(d, () => rr(ctx, x + sx - 7 * scale, y - 2, 14 * scale, 13 * scale, 4 * scale), pal.primary, sx);
    // frame shin
    ctx.lineCap = "round"; ctx.lineWidth = 6 * scale; ctx.strokeStyle = FRAME;
    ctx.beginPath(); ctx.moveTo(x + sx, y + 10); ctx.lineTo(x + sx * 1.15, y + 20 * scale); ctx.stroke();
    // secondary foot accent
    ctx.fillStyle = pal.secondary;
    rr(ctx, x + sx * 1.15 - 5 * scale, y + 18 * scale, 10 * scale, 4 * scale, 2); ctx.fill();
  }
};

const beetleLegs: PartDrawFn = (d) => {
  const { ctx, x, y, pal, scale } = d;
  for (const sx of [-12, 12]) {
    // primary rounded thigh
    region(d, () => rr(ctx, x + sx - 8 * scale, y - 2, 16 * scale, 12 * scale, 6 * scale), pal.primary, sx);
    // frame digitigrade shin (angled)
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 5.5 * scale; ctx.strokeStyle = FRAME;
    ctx.beginPath();
    ctx.moveTo(x + sx, y + 9);
    ctx.lineTo(x + sx * 1.25, y + 15 * scale);
    ctx.lineTo(x + sx * 0.9, y + 21 * scale);
    ctx.stroke();
    // secondary energy-ish toe
    glow(ctx, x + sx * 0.9, y + 21 * scale, 2.4 * scale, pal.energy);
  }
};

// ============================================================
// TORSO / CHASSIS  (drawn via registry too; family-flavored)
// ============================================================

export function drawChassis(d: PartDrawCtx, build: "agile" | "tank", family: Family) {
  const { ctx, x, y, dir, pal, scale } = d;
  const w = (build === "tank" ? 64 : 48) * scale;
  const h = (build === "tank" ? 56 : 52) * scale;
  // primary chest armor
  region(d, () => rr(ctx, x - w / 2, y - 10, w, h, family === "knight" ? 7 * scale : 11 * scale), pal.primary, dir);
  // secondary collar/trim (accent strip across the top)
  region(d, () => rr(ctx, x - w / 2 + 4, y - 8, w - 8, 7 * scale, 3), pal.secondary, dir);
  // frame core housing
  ctx.fillStyle = FRAME; rr(ctx, x - 14 * scale, y + 6, 28 * scale, 22 * scale, 6); ctx.fill();
  // energy core
  glow(ctx, x, y + 17, 6 * scale, pal.energy);
  return { w, h };
}

// ============================================================
// REGISTRY  (keyed by part id; ids encode family already)
// ============================================================

export const PART_ART: Record<string, PartDrawFn> = {
  // heads
  beetleHead, beetleHeadOC: beetleHead, knightHead,
  // right arms
  beetleRailgun, knightBlaster,
  // left arms
  knightShield, beetleUtility,
  // legs
  knightLegs, beetleLegs,
};

const SLOT_FALLBACK: Record<PartSlot, PartDrawFn> = {
  head: beetleHead, leftArm: beetleUtility, rightArm: beetleRailgun, legs: beetleLegs,
};

/** Rig entry point. Looks up art by part id, falls back by slot. */
export function drawPart(slot: PartSlot, partId: string | undefined, d: PartDrawCtx) {
  const fn = (partId && PART_ART[partId]) || SLOT_FALLBACK[slot];
  fn(d);
}

/** Default palette (used when player hasn't recolored). */
export function defaultPalette(primary: string): PartPalette {
  return { primary, secondary: shade(primary, -0.25), energy: "#5fffc8", eyes: "#eafff2" };
}
