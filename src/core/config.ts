// ============================================================
// GridBots — Combat Config + RNG
// All balance numbers live here. Tune the feel in one place.
// ============================================================

import type { CombatConfig } from "./types";

export const COMBAT_CONFIG: CombatConfig = {
  startDP: 100,
  evadeChance: 0.75,
  critChance: 0.12,
  critMultiplier: 1.6,
  damageVariance: 0.1,
  chargeMultiplier: 1.5,
  weakenMultiplier: 0.5,
  superDamage: 30,
  superCombo: 3,
  slotsPerRound: 5,
};

// ------------------------------------------------------------
// RNG — wrapped so it can be made deterministic/seedable later
// (useful for replays and server-authoritative PvP). For now it
// delegates to Math.random but everything routes through here.
// ------------------------------------------------------------

export interface RNG {
  /** float in [0, 1) */
  next(): number;
  /** float in [min, max) */
  range(min: number, max: number): number;
  /** true with probability p */
  chance(p: number): boolean;
}

export function createRNG(): RNG {
  return {
    next: () => Math.random(),
    range: (min, max) => min + Math.random() * (max - min),
    chance: (p) => Math.random() < p,
  };
}
