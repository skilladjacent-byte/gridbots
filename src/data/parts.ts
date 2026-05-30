// ============================================================
// GridBots — Chassis & Parts Database
// Art Bible v3.0: parts are skinned by FAMILY (fixed appearance);
// stats are independent (rolled later, Diablo-style). Display
// name is `Family + Subtitle`, e.g. "Beetle Railgun".
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
// family fixes appearance; subtitle = slot-role. name = `Family Subtitle`.
// Stats/abilities/exclusives are UNCHANGED from the functional version so
// combat balance is identical; only appearance + naming are family-driven.
export const PARTS: Record<string, Part> = {
  // ---------- HEADS ----------
  beetleHead: {
    id: "beetleHead", name: "Beetle Sensor", slot: "head", family: "beetle", subtitle: "Sensor",
    dp: 10, ram: 6, resistances: { thermal: 0, shock: 0, cryo: 0, viral: 0, kinetic: 0 },
    color: "#9fe1cb", desc: "6 RAM · balanced",
  },
  knightHead: {
    id: "knightHead", name: "Knight Helm", slot: "head", family: "knight", subtitle: "Helm",
    dp: 18, ram: 4, resistances: { thermal: 10, shock: 0, cryo: 5, viral: 0, kinetic: 5 },
    ability: ABILITIES.packetShield,
    color: "#85b7eb", desc: "4 RAM · +DP, Packet Shield",
  },
  beetleHeadOC: {
    id: "beetleHeadOC", name: "Beetle Overclock", slot: "head", family: "beetle", subtitle: "Overclock",
    dp: 6, ram: 9, resistances: { thermal: -5, shock: 0, cryo: 0, viral: 0, kinetic: 0 },
    color: "#ffd24d", desc: "9 RAM · glass cannon",
  },

  // ---------- RIGHT ARMS (offense) ----------
  beetleRailgun: {
    id: "beetleRailgun", name: "Beetle Railgun", slot: "rightArm", family: "beetle", subtitle: "Railgun",
    dp: 8, resistances: { thermal: 0, shock: 0, cryo: 0, viral: 0, kinetic: 10 },
    exclusivePrograms: ["rail"],
    color: "#ff5a2d", desc: "unlocks Railburst",
  },
  knightBlaster: {
    id: "knightBlaster", name: "Knight Lance", slot: "rightArm", family: "knight", subtitle: "Lance",
    dp: 10, resistances: { thermal: 5, shock: 5, cryo: 0, viral: 0, kinetic: 0 },
    ability: ABILITIES.hyperthreaded,
    color: "#ff7a4d", desc: "Hyperthreaded",
  },

  // ---------- LEFT ARMS (utility) ----------
  knightShield: {
    id: "knightShield", name: "Knight Bulwark", slot: "leftArm", family: "knight", subtitle: "Bulwark",
    dp: 16, resistances: { thermal: 8, shock: 8, cryo: 8, viral: 0, kinetic: 8 },
    color: "#4db8ff", desc: "high DP + broad resist",
  },
  beetleUtility: {
    id: "beetleUtility", name: "Beetle Pincer", slot: "leftArm", family: "beetle", subtitle: "Pincer",
    dp: 8, resistances: { thermal: 0, shock: 0, cryo: 10, viral: 10, kinetic: 0 },
    color: "#7cc0ff", desc: "cryo + viral resist",
  },

  // ---------- LEGS (mobility) ----------
  knightLegs: {
    id: "knightLegs", name: "Knight Greaves", slot: "legs", family: "knight", subtitle: "Greaves",
    dp: 12, resistances: { thermal: 0, shock: 0, cryo: 0, viral: 0, kinetic: 5 },
    color: "#c0dd97", desc: "balanced mobility",
  },
  beetleLegs: {
    id: "beetleLegs", name: "Beetle Sprinters", slot: "legs", family: "beetle", subtitle: "Sprinters",
    dp: 8, resistances: { thermal: 0, shock: 10, cryo: 0, viral: 0, kinetic: 0 },
    ability: ABILITIES.ghostProtocol,
    color: "#97c459", desc: "Ghost Protocol",
  },
};

export const PARTS_BY_SLOT = {
  head: ["beetleHead", "knightHead", "beetleHeadOC"],
  leftArm: ["knightShield", "beetleUtility"],
  rightArm: ["beetleRailgun", "knightBlaster"],
  legs: ["knightLegs", "beetleLegs"],
};
