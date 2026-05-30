// ============================================================
// GridBots — Player State
// Owns the player's persistent assembled GridBot and its program
// loadout, with localStorage persistence. This is the seed of the
// "one lifelong companion" — for now a single saved build.
// ============================================================

import type { AssembledBot } from "../core/assembly";
import { CHASSIS, PARTS } from "../data/parts";

const SAVE_KEY = "gridbots.player.v1";

/** A serializable snapshot of the player's bot (ids only). */
interface SavedBot {
  name: string;
  chassisId: string;
  parts: { head: string | null; leftArm: string | null; rightArm: string | null; legs: string | null };
  programLoadout: string[];
  color: string;
}

/** The default starter loadout a new player begins with. */
function defaultBot(): AssembledBot {
  return {
    name: "GR1D",
    chassis: CHASSIS.vanguard,
    loadout: {
      head: PARTS.beetleHead,
      leftArm: PARTS.knightShield,
      rightArm: PARTS.beetleRailgun,
      legs: PARTS.knightLegs,
    },
    programLoadout: ["rail", "laser", "aegis", "glitch", "over"],
    color: "#3cff85",
  };
}

export function loadPlayerBot(): AssembledBot {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultBot();
    const s = JSON.parse(raw) as SavedBot;
    return {
      name: s.name,
      chassis: CHASSIS[s.chassisId] ?? CHASSIS.vanguard,
      loadout: {
        head: s.parts.head ? PARTS[s.parts.head] ?? null : null,
        leftArm: s.parts.leftArm ? PARTS[s.parts.leftArm] ?? null : null,
        rightArm: s.parts.rightArm ? PARTS[s.parts.rightArm] ?? null : null,
        legs: s.parts.legs ? PARTS[s.parts.legs] ?? null : null,
      },
      programLoadout: s.programLoadout ?? [],
      color: s.color ?? "#3cff85",
    };
  } catch {
    return defaultBot();
  }
}

export function savePlayerBot(bot: AssembledBot): void {
  const s: SavedBot = {
    name: bot.name,
    chassisId: bot.chassis.id,
    parts: {
      head: bot.loadout.head?.id ?? null,
      leftArm: bot.loadout.leftArm?.id ?? null,
      rightArm: bot.loadout.rightArm?.id ?? null,
      legs: bot.loadout.legs?.id ?? null,
    },
    programLoadout: bot.programLoadout,
    color: bot.color,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    // localStorage unavailable (private mode etc.) — fail silent for now.
  }
}

export { defaultBot };
