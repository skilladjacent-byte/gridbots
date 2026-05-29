// ============================================================
// GridBots — Bot Definitions + AI
// Build = visual silhouette (proportions the rig renders).
// In later phases a bot is assembled from equipped parts; for
// now we define two fixed builds for the sandbox.
// ============================================================

import type { Program } from "../core/types";
import { PROGRAMS, PROGRAM_ORDER } from "./programs";

export type BuildKind = "agile" | "tank";

export interface BotDef {
  name: string;
  build: BuildKind;
  color: string;
}

export const PLAYER_BOT: BotDef = { name: "Your GridBot", build: "agile", color: "#3cff85" };
export const ENEMY_BOT: BotDef = { name: "Rogue Signal", build: "tank", color: "#ff7a4d" };

// ------------------------------------------------------------
// AI strategies. Phase 1 ships "random"; the interface leaves
// room for "basic" and "smart" opponents later without touching
// the combat engine.
// ------------------------------------------------------------

export interface BotAI {
  buildQueue(slots: number): Program[];
}

export function randomAI(): BotAI {
  return {
    buildQueue(slots: number): Program[] {
      const q: Program[] = [];
      for (let i = 0; i < slots; i++) {
        const key = PROGRAM_ORDER[Math.floor(Math.random() * PROGRAM_ORDER.length)];
        q.push(PROGRAMS[key]);
      }
      return q;
    },
  };
}
