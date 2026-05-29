// ============================================================
// GridBots — Core Type Definitions
// Pure data shapes shared across logic, data, and rendering.
// No DOM or rendering imports allowed in this file.
// ============================================================

export type ProgramType = "attack" | "block" | "evade" | "special";

/** Attacks read physically as either a dash-in melee or a stand-and-fire ranged. */
export type AttackStyle = "melee" | "ranged";

/** Which arm casts the program. Maps to the equipped arm part. */
export type Arm = "L" | "R";

/** Block flavor: buff charges your next attack; debuff weakens the opponent's. */
export type BlockVariant = "buff" | "debuff";

/** Damage types. Attacks deal one of these; resistances modify incoming. */
export type DamageType = "thermal" | "shock" | "cryo" | "viral" | "kinetic";

export const DAMAGE_TYPES: DamageType[] = ["thermal", "shock", "cryo", "viral", "kinetic"];

/** A resistance profile: per-type modifier, where +X means take X% less of that type. */
export type Resistances = Record<DamageType, number>;

export function zeroResistances(): Resistances {
  return { thermal: 0, shock: 0, cryo: 0, viral: 0, kinetic: 0 };
}

export interface Program {
  id: string;
  name: string;
  type: ProgramType;
  /** Attack-only fields */
  style?: AttackStyle;
  arm?: Arm;
  dmg?: number;
  damageType?: DamageType;
  /** Block-only field */
  variant?: BlockVariant;
  /** RAM cost to slot this program into a loadout (Phase 3b). */
  ramCost?: number;
  /** Display color (hex). Also used for projectile/effect tint. */
  color: string;
  /** Short palette description shown in the program picker. */
  desc: string;
}

// ============================================================
// Equipment model — Chassis + Parts assemble into a GridBot.
// ============================================================

export type PartSlot = "head" | "leftArm" | "rightArm" | "legs";

/** Passive ability granted by a chassis or part. Effects keyed by id. */
export interface Ability {
  id: string;
  name: string;
  desc: string;
}

/** The permanent identity of the companion. Never replaced. */
export interface Chassis {
  id: string;
  name: string;
  baseDP: number;
  baseResistances: Resistances;
  innateAbility?: Ability;
}

/** A swappable component. Head additionally provides RAM. */
export interface Part {
  id: string;
  name: string;
  slot: PartSlot;
  dp: number;                 // DP contribution
  resistances: Resistances;   // can be +/-
  ability?: Ability;
  /** Head only: the RAM budget this part provides. */
  ram?: number;
  /** Program ids this part unlocks while equipped. */
  exclusivePrograms?: string[];
  color: string;
  desc: string;
}

/** A fully equipped companion. The four slots may be null while building. */
export interface Loadout {
  head: Part | null;
  leftArm: Part | null;
  rightArm: Part | null;
  legs: Part | null;
}

/** Rolled-up stats computed from chassis + equipped parts. */
export interface ComputedStats {
  maxDP: number;
  ram: number;
  resistances: Resistances;
  abilities: Ability[];
  /** Program ids available: universal pool + part-granted exclusives. */
  availableProgramIds: string[];
}

/** Transient per-bot status carried between slots within a round. */
export interface BotStatus {
  charged: boolean;   // next attack +50%
  weakened: boolean;  // next attack -50%
  disabled: boolean;  // next slot is skipped
}

export type BotSide = "p" | "e";

/** A combatant's persistent battle state. */
export interface Combatant {
  side: BotSide;
  dp: number;
  maxDp: number;
  combo: number; // consecutive landed attacks; N charges a super
  /** Computed resistances applied to incoming typed damage. */
  resistances: Resistances;
  /** Ability flags resolved from equipped parts/chassis at battle start. */
  abilities: {
    packetShield: boolean;   // first hit each battle reduced 50%
    hyperthreaded: boolean;  // super charges in 2 instead of 3
    ghostProtocol: boolean;  // (stub) better evade
  };
  /** Runtime: has the packet-shield first-hit reduction been used yet? */
  packetShieldUsed: boolean;
}

/** Tuning constants live in one place so balance is easy to find. */
export interface CombatConfig {
  startDP: number;
  evadeChance: number;      // 0..1 chance a Glitch Step dodge succeeds
  critChance: number;       // 0..1 chance an attack crits
  critMultiplier: number;   // damage multiplier on crit
  damageVariance: number;   // +/- fraction applied to every attack (0.1 = ±10%)
  chargeMultiplier: number; // Aegis charge / Overclock bonus
  weakenMultiplier: number; // Scrambler debuff
  superDamage: number;      // base super damage
  superCombo: number;       // landed attacks needed to charge a super
  slotsPerRound: number;
}
