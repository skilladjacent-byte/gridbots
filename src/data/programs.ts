// ============================================================
// GridBots — Program Database
// The starter set of combat programs. In later phases these are
// unlocked via loot and gated by RAM + equipped parts.
// ============================================================

import type { Program } from "../core/types";

export const PROGRAMS: Record<string, Program> = {
  ping:   { id: "ping",   name: "Ping Strike",   type: "attack",  style: "ranged", arm: "L", dmg: 12, damageType: "shock",   ramCost: 1, color: "#ff7a4d", desc: "12 shock · ranged" },
  laser:  { id: "laser",  name: "Laser Rifle",   type: "attack",  style: "ranged", arm: "R", dmg: 18, damageType: "thermal", ramCost: 2, color: "#ff5a2d", desc: "18 thermal · ranged" },
  rail:   { id: "rail",   name: "Railburst",     type: "attack",  style: "melee",  arm: "R", dmg: 26, damageType: "kinetic", ramCost: 3, color: "#ff3a1d", desc: "26 kinetic · melee (exclusive)" },
  aegis:  { id: "aegis",  name: "Aegis Block",   type: "block",   variant: "buff",   ramCost: 2, color: "#4db8ff", desc: "block + charge my next atk" },
  scram:  { id: "scram",  name: "Scrambler",     type: "block",   variant: "debuff", ramCost: 2, color: "#7cc0ff", desc: "block + weaken their next atk" },
  glitch: { id: "glitch", name: "Glitch Step",   type: "evade",   ramCost: 2, color: "#b97cff", desc: "~75% dodge + disable their slot" },
  over:   { id: "over",   name: "Overclock.EXE", type: "special", ramCost: 1, color: "#ffd24d", desc: "+50% next dmg" },
};

/** Universal programs — always available regardless of equipped parts. */
export const UNIVERSAL_PROGRAM_IDS = ["ping", "laser", "aegis", "scram", "glitch", "over"];

/** Display order in the program picker. */
export const PROGRAM_ORDER = ["ping", "laser", "rail", "aegis", "scram", "glitch", "over"];

/** Builds the unblockable super-move program for a given side. */
export function makeSuper(side: "p" | "e", superDamage: number): Program & { isSuper: true } {
  return {
    id: "super",
    name: side === "p" ? "SUPER Buster" : "SUPER Virus",
    type: "attack",
    style: "melee",
    arm: "R",
    dmg: superDamage,
    damageType: "kinetic",
    color: side === "p" ? "#3cff85" : "#ff5a2d",
    desc: "unblockable",
    isSuper: true,
  };
}

export function shortName(name: string): string {
  return name.replace(".SYS", "").replace(".EXE", "");
}
