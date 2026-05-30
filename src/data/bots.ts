// ============================================================
// GridBots — Bot Definitions + AI
// Build = visual silhouette (proportions the rig renders).
// In later phases a bot is assembled from equipped parts; for
// now we define two fixed builds for the sandbox.
// ============================================================

import type { Program, Combatant } from "../core/types";
import { PROGRAMS, PROGRAM_ORDER, UNIVERSAL_PROGRAM_IDS } from "./programs";
import { CHASSIS, PARTS } from "./parts";
import { computeStats, type AssembledBot } from "../core/assembly";

export type BuildKind = "agile" | "tank";

export interface BotDef {
  name: string;
  build: BuildKind;
  color: string;
}

export const PLAYER_BOT: BotDef = { name: "Your GridBot", build: "agile", color: "#3cff85" };
export const ENEMY_BOT: BotDef = { name: "Rogue Signal", build: "tank", color: "#ff7a4d" };

/** A fixed assembled enemy so the AI fights with real stats/abilities. */
export function enemyAssembledBot(): AssembledBot {
  return {
    name: "Rogue Signal",
    chassis: CHASSIS.spectre,
    loadout: {
      head: PARTS.knightHead,
      leftArm: PARTS.beetleUtility,
      rightArm: PARTS.knightBlaster,
      legs: PARTS.beetleLegs,
    },
    programLoadout: ["laser", "ping", "scram", "glitch", "over"],
    color: "#ff7a4d",
  };
}

/** Build a battle-ready Combatant from an assembled bot's computed stats. */
export function combatantFromBot(side: "p" | "e", bot: AssembledBot): Combatant {
  const stats = computeStats(bot, UNIVERSAL_PROGRAM_IDS);
  return {
    side,
    dp: stats.maxDP,
    maxDp: stats.maxDP,
    combo: 0,
    resistances: stats.resistances,
    abilities: {
      packetShield: stats.abilities.some(a => a.id === "packetShield"),
      hyperthreaded: stats.abilities.some(a => a.id === "hyperthreaded"),
      ghostProtocol: stats.abilities.some(a => a.id === "ghostProtocol"),
    },
    packetShieldUsed: false,
  };
}

// ------------------------------------------------------------
// AI strategies. Phase 1 ships "random"; the interface leaves
// room for "basic" and "smart" opponents later without touching
// the combat engine.
// ------------------------------------------------------------

export interface BotAI {
  buildQueue(slots: number): Program[];
}

/** Random AI that picks only from a given pool of program ids. */
export function randomAI(programPool: string[] = PROGRAM_ORDER): BotAI {
  const pool = programPool.length ? programPool : PROGRAM_ORDER;
  return {
    buildQueue(slots: number): Program[] {
      const q: Program[] = [];
      for (let i = 0; i < slots; i++) {
        const id = pool[Math.floor(Math.random() * pool.length)];
        q.push(PROGRAMS[id]);
      }
      return q;
    },
  };
}
