// ============================================================
// GridBots — Chassis & Parts Database
// Hand-defined content for Phase 3a. Phase 4 loot will generate
// Parts procedurally with rolled stats; these prove the model.
// ============================================================

import type { Chassis, Part, Ability } from "../core/types";

// ---- Abilities (a couple are wired live in combat to prove the system) ----
export const ABILITIES: Record<string, Ability> = {
  packetShield: { id: "packetShield", name: "Packet Shield", desc: "Reduce the first hit taken each battle by 50%." },
  hyperthreaded: { id: "hyperthreaded", name: "Hyperthreaded", desc: "Supers charge in 2 landed attacks instead of 3." },
  ghostProtocol: { id: "ghostProtocol", name: "Ghost Protocol", desc: "(stub) Improved evade odds." },
  recursiveLoader: { id: "recursiveLoader", name: "Recursive Loader", desc: "(stub) Specials cost less RAM." },
};

// ---- Chassis (permanent identity) ----
export const CHASSIS: Record<string, Chassis> = {
  vanguard: {
    id: "vanguard",
    name: "Vanguard Core",
    baseDP: 60,
    baseResistances: { thermal: 0, shock: 0, cryo: 0, viral: 0, kinetic: 5 },
  },
  spectre: {
    id: "spectre",
    name: "Spectre Core",
    baseDP: 50,
    baseResistances: { thermal: 0, shock: 5, cryo: 0, viral: 5, kinetic: 0 },
    innateAbility: ABILITIES.ghostProtocol,
  },
};

// ---- Parts ----
// Head = RAM + DP + Resistances + Ability. Others = DP + Resistances + (Ability or exclusive program).
export const PARTS: Record<string, Part> = {
  // Heads
  cpuStandard: {
    id: "cpuStandard", name: "Standard CPU", slot: "head",
    dp: 10, ram: 6, resistances: { thermal: 0, shock: 0, cryo: 0, viral: 0, kinetic: 0 },
    color: "#9fe1cb", desc: "6 RAM · balanced",
  },
  cpuFortified: {
    id: "cpuFortified", name: "Fortified CPU", slot: "head",
    dp: 18, ram: 4, resistances: { thermal: 10, shock: 0, cryo: 5, viral: 0, kinetic: 5 },
    ability: ABILITIES.packetShield,
    color: "#85b7eb", desc: "4 RAM · +DP, Packet Shield",
  },
  cpuOverclocked: {
    id: "cpuOverclocked", name: "Overclocked CPU", slot: "head",
    dp: 6, ram: 9, resistances: { thermal: -5, shock: 0, cryo: 0, viral: 0, kinetic: 0 },
    color: "#ffd24d", desc: "9 RAM · glass cannon",
  },

  // Right arms (offense)
  armRailgun: {
    id: "armRailgun", name: "VX-9 Railgun Arm", slot: "rightArm",
    dp: 8, resistances: { thermal: 0, shock: 0, cryo: 0, viral: 0, kinetic: 10 },
    exclusivePrograms: ["rail"],
    color: "#ff5a2d", desc: "unlocks Railburst",
  },
  armBlaster: {
    id: "armBlaster", name: "Pulse Blaster Arm", slot: "rightArm",
    dp: 10, resistances: { thermal: 5, shock: 5, cryo: 0, viral: 0, kinetic: 0 },
    ability: ABILITIES.hyperthreaded,
    color: "#ff7a4d", desc: "Hyperthreaded",
  },

  // Left arms (utility)
  armShield: {
    id: "armShield", name: "Bulwark Arm", slot: "leftArm",
    dp: 16, resistances: { thermal: 8, shock: 8, cryo: 8, viral: 0, kinetic: 8 },
    color: "#4db8ff", desc: "high DP + broad resist",
  },
  armUtility: {
    id: "armUtility", name: "Utility Arm", slot: "leftArm",
    dp: 8, resistances: { thermal: 0, shock: 0, cryo: 10, viral: 10, kinetic: 0 },
    color: "#7cc0ff", desc: "cryo + viral resist",
  },

  // Legs (mobility)
  legsStandard: {
    id: "legsStandard", name: "Standard Legs", slot: "legs",
    dp: 12, resistances: { thermal: 0, shock: 0, cryo: 0, viral: 0, kinetic: 5 },
    color: "#c0dd97", desc: "balanced mobility",
  },
  legsReactive: {
    id: "legsReactive", name: "Reactive Legs", slot: "legs",
    dp: 8, resistances: { thermal: 0, shock: 10, cryo: 0, viral: 0, kinetic: 0 },
    ability: ABILITIES.ghostProtocol,
    color: "#97c459", desc: "Ghost Protocol",
  },
};

export const PARTS_BY_SLOT = {
  head: ["cpuStandard", "cpuFortified", "cpuOverclocked"],
  leftArm: ["armShield", "armUtility"],
  rightArm: ["armRailgun", "armBlaster"],
  legs: ["legsStandard", "legsReactive"],
};
