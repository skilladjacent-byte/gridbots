// ============================================================
// GridBots — Phase 3a Logic Test Harness
// Run with: npx tsx src/test/phase3a.test.ts
// Validates: stat rollup, exclusive-program gating, resistance
// application, and the two proof-of-concept abilities — all
// WITHOUT any UI or rendering.
// ============================================================

import { computeStats, type AssembledBot, emptyLoadout } from "../core/assembly";
import { CHASSIS, PARTS, ABILITIES } from "../data/parts";
import { UNIVERSAL_PROGRAM_IDS, PROGRAMS } from "../data/programs";
import { COMBAT_CONFIG, createRNG } from "../core/config";
import { resolveSlot, freshStatus } from "../core/combat";
import type { Combatant } from "../core/types";

let passed = 0, failed = 0;
function check(label: string, cond: boolean, detail = "") {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label} ${detail ? "→ " + detail : ""}`); }
}

console.log("\n=== Phase 3a: Assembly & Stat Rollup ===\n");

// Build a bot: Vanguard chassis + fortified head + railgun arm + bulwark arm + standard legs
const bot: AssembledBot = {
  name: "Test Unit",
  chassis: CHASSIS.vanguard,
  loadout: {
    head: PARTS.cpuFortified,
    rightArm: PARTS.armRailgun,
    leftArm: PARTS.armShield,
    legs: PARTS.legsStandard,
  },
  programLoadout: [],
  color: "#3cff85",
};

const stats = computeStats(bot, UNIVERSAL_PROGRAM_IDS);
console.log("Computed stats:", JSON.stringify(stats, null, 0), "\n");

// DP = chassis 60 + head 18 + railgun 8 + bulwark 16 + legs 12 = 114
check("Total DP sums chassis + parts", stats.maxDP === 114, `got ${stats.maxDP}, expected 114`);
// RAM only from head (Fortified = 4)
check("RAM comes only from Head", stats.ram === 4, `got ${stats.ram}`);
// Kinetic resist: chassis 5 + fortified head 5 + railgun 10 + bulwark 8 + legs 5 = 33
check("Resistances sum across parts (kinetic=33)", stats.resistances.kinetic === 33, `got ${stats.resistances.kinetic}`);
// Thermal: fortified head 10 + bulwark 8 = 18
check("Thermal resist sums (=18)", stats.resistances.thermal === 18, `got ${stats.resistances.thermal}`);
// Packet Shield ability present (from fortified head)
check("Packet Shield ability granted by Head", stats.abilities.some(a => a.id === "packetShield"));
// Exclusive program: railgun unlocks 'rail'
check("Railgun arm unlocks Railburst (exclusive)", stats.availableProgramIds.includes("rail"));

console.log("\n=== Exclusive program gating ===\n");

// Swap railgun arm for blaster arm → lose 'rail', gain Hyperthreaded
const bot2: AssembledBot = { ...bot, loadout: { ...bot.loadout, rightArm: PARTS.armBlaster } };
const stats2 = computeStats(bot2, UNIVERSAL_PROGRAM_IDS);
check("Unequipping Railgun removes Railburst access", !stats2.availableProgramIds.includes("rail"));
check("Blaster arm grants Hyperthreaded", stats2.abilities.some(a => a.id === "hyperthreaded"));

console.log("\n=== Resistance + Packet Shield in combat ===\n");

// Set up a one-slot combat: attacker hits defender who has kinetic resist + packet shield.
const rng = createRNG();
const cfg = { ...COMBAT_CONFIG, critChance: 0, damageVariance: 0 }; // deterministic for the test

function makeCombatant(side: "p" | "e", stats: ReturnType<typeof computeStats>): Combatant {
  return {
    side, dp: stats.maxDP, maxDp: stats.maxDP, combo: 0,
    resistances: stats.resistances,
    abilities: {
      packetShield: stats.abilities.some(a => a.id === "packetShield"),
      hyperthreaded: stats.abilities.some(a => a.id === "hyperthreaded"),
      ghostProtocol: stats.abilities.some(a => a.id === "ghostProtocol"),
    },
    packetShieldUsed: false,
  };
}

// Defender: has packetShield + 28 kinetic resist. Attacker fires Railburst (26 kinetic).
const defender = makeCombatant("e", stats);
const attacker = makeCombatant("p", stats2); // no packet shield used on attacker
const dpBefore = defender.dp;

// Railburst: 26 kinetic. Resist 33% → 26*0.67 = 17.42. Packet Shield (first hit) → 8.71 → round 9.
resolveSlot(cfg, rng, { program: PROGRAMS.rail, evadeOK: false }, { program: PROGRAMS.over, evadeOK: false },
  freshStatus(), freshStatus(), attacker, defender);
const dmgTaken = dpBefore - defender.dp;
check("Resistance + Packet Shield reduce 26 kinetic to 9", dmgTaken === 9, `took ${dmgTaken}`);

// Second hit: packet shield already used, only 33% resistance applies. 26*0.67 = 17.42 → 17.
const dpBefore2 = defender.dp;
resolveSlot(cfg, rng, { program: PROGRAMS.rail, evadeOK: false }, { program: PROGRAMS.over, evadeOK: false },
  freshStatus(), freshStatus(), attacker, defender);
const dmgTaken2 = dpBefore2 - defender.dp;
check("Second hit: only resistance applies (17)", dmgTaken2 === 17, `took ${dmgTaken2}`);

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
