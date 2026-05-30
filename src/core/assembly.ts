// ============================================================
// GridBots — Assembly & Stat Rollup
// Computes a GridBot's real stats from its chassis + equipped
// parts. This is the single source of truth for "what are this
// bot's stats" — combat reads the output, never raw parts.
// ============================================================

import type {
  Chassis, Part, Loadout, ComputedStats, Resistances, Ability, PartSlot, BotPaint, PartPaint,
} from "./types";
import { zeroResistances, DAMAGE_TYPES } from "./types";

export interface AssembledBot {
  name: string;
  chassis: Chassis;
  loadout: Loadout;
  /** Loadout of program ids the player has slotted for battle (Phase 3b). */
  programLoadout: string[];
  color: string;
  /** Per-part + per-bot paint (Art Bible v3.0). Optional for back-compat;
   *  defaultPaintFor() fills it in when absent. */
  paint?: BotPaint;
}

export const PART_SLOTS: PartSlot[] = ["head", "leftArm", "rightArm", "legs"];

/** Sum chassis + all equipped parts into final battle stats. */
export function computeStats(bot: AssembledBot, universalProgramIds: string[]): ComputedStats {
  const ch = bot.chassis;
  let maxDP = ch.baseDP;
  let ram = 0;
  const res: Resistances = { ...ch.baseResistances };
  const abilities: Ability[] = [];
  if (ch.innateAbility) abilities.push(ch.innateAbility);

  const exclusives: string[] = [];

  for (const slot of PART_SLOTS) {
    const part = bot.loadout[slot];
    if (!part) continue;
    maxDP += part.dp;
    if (part.ram) ram += part.ram; // only Head should set this
    for (const t of DAMAGE_TYPES) res[t] += part.resistances[t] ?? 0;
    if (part.ability) abilities.push(part.ability);
    if (part.exclusivePrograms) exclusives.push(...part.exclusivePrograms);
  }

  // Available programs = universal pool + exclusives from equipped parts.
  const availableProgramIds = dedupe([...universalProgramIds, ...exclusives]);

  return { maxDP, ram, resistances: res, abilities, availableProgramIds };
}

/** Total RAM cost of a program loadout, given a lookup of cost per id. */
export function loadoutRamCost(programIds: string[], costOf: (id: string) => number): number {
  return programIds.reduce((sum, id) => sum + costOf(id), 0);
}

/** True if the bot has an ability with the given id. */
export function hasAbility(stats: ComputedStats, abilityId: string): boolean {
  return stats.abilities.some(a => a.id === abilityId);
}

/** Apply a defender's resistance to incoming typed damage. +X% reduces by X%. */
export function applyResistance(dmg: number, type: string | undefined, res: Resistances): number {
  if (!type) return dmg;
  const r = (res as Record<string, number>)[type] ?? 0;
  const reduced = dmg * (1 - r / 100);
  return Math.max(0, reduced);
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function emptyLoadout(): Loadout {
  return { head: null, leftArm: null, rightArm: null, legs: null };
}

export { emptyLoadout, zeroResistances };

// ------------------------------------------------------------
// Paint defaults (Art Bible v3.0)
// ------------------------------------------------------------

function darken(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c - amt * 255)));
  return "#" + ((f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, "0");
}

function paintFromPart(part: Part | null, fallback: string): PartPaint {
  const primary = part?.color ?? fallback;
  return { primary, secondary: darken(primary, 0.22) };
}

/** Build a sensible default paint job from a bot's equipped parts.
 *  Per-part primary = the part's family color; secondary = a darker tone.
 *  Energy/eyes default to the bot's signature color family. */
export function defaultPaintFor(bot: AssembledBot): BotPaint {
  const sig = bot.color || "#5fe39b";
  return {
    parts: {
      head: paintFromPart(bot.loadout.head, sig),
      leftArm: paintFromPart(bot.loadout.leftArm, sig),
      rightArm: paintFromPart(bot.loadout.rightArm, sig),
      legs: paintFromPart(bot.loadout.legs, sig),
      chassis: { primary: sig, secondary: darken(sig, 0.22) },
    },
    energy: "#5fffc8",
    eyes: "#eafff2",
  };
}

/** Always-present paint: returns bot.paint or a freshly derived default. */
export function paintOf(bot: AssembledBot): BotPaint {
  return bot.paint ?? defaultPaintFor(bot);
}
