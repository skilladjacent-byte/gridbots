// ============================================================
// GridBots — Combat Resolver (pure logic)
// Resolves one slot of simultaneous play and emits BattleEvents.
// No rendering here: the renderer interprets the events.
// ============================================================

import type { Program, BotStatus, Combatant, CombatConfig, BotSide } from "./types";
import type { RNG } from "./config";
import { applyResistance } from "./assembly";

/** A single thing that happened, for the renderer + log to present. */
export interface BattleEvent {
  kind:
    | "special"     // a special program ran (e.g. Overclock)
    | "evade-ok"    // successful dodge + disable
    | "evade-fail"  // dodge attempt failed
    | "evade-waste" // evaded with nothing incoming
    | "block-ok"    // successful block (buff/debuff applied)
    | "block-waste" // blocked with nothing incoming
    | "hit"         // an attack landed
    | "blocked"     // an attack was negated by a block
    | "dodged"      // an attack was negated by an evade
    | "trade"       // both attacks landed this slot
    | "fizzle";     // nothing meaningful happened
  source?: BotSide;   // who caused it
  target?: BotSide;   // who it affected
  main: string;       // headline callout
  sub: string;        // one-line explanation
  log: string;        // combat-log line
  logColor: string;
  damage?: number;
  crit?: boolean;
  isSuper?: boolean;
  hold?: number;      // ms the renderer should dwell on this event
}

export interface SlotInput {
  program: Program;
  /** Pre-rolled evade success so logic + render agree on the outcome. */
  evadeOK: boolean;
}

export interface SlotResult {
  events: BattleEvent[];
}

function freshStatus(): BotStatus {
  return { charged: false, weakened: false, disabled: false };
}

/** Resolves a single slot. Mutates combatants' DP/combo and the status objects. */
export function resolveSlot(
  cfg: CombatConfig,
  rng: RNG,
  pInput: SlotInput,
  eInput: SlotInput,
  pStatus: BotStatus,
  eStatus: BotStatus,
  p: Combatant,
  e: Combatant
): SlotResult {
  const events: BattleEvent[] = [];
  const pP = pInput.program;
  const eP = eInput.program;
  const pAtk = pP.type === "attack";
  const eAtk = eP.type === "attack";

  // --- Specials ---
  if (pP.type === "special") {
    pStatus.charged = true;
    events.push(ev("special", "You run Overclock", "next attack +50%", "You run Overclock.EXE", "#ffd24d", { source: "p" }));
  }
  if (eP.type === "special") {
    eStatus.charged = true;
    events.push(ev("special", "Enemy runs Overclock", "their next attack +50%", "Enemy runs Overclock.EXE", "#ffd24d", { source: "e" }));
  }

  // --- Evades (disable the opponent's next slot on success) ---
  if (pP.type === "evade") resolveEvade(events, "p", pInput.evadeOK, eAtk, eStatus);
  if (eP.type === "evade") resolveEvade(events, "e", eInput.evadeOK, pAtk, pStatus);

  // --- Blocks (negate + buff self or debuff foe) ---
  if (pP.type === "block") resolveBlock(events, "p", pP, eAtk, pStatus, eStatus);
  if (eP.type === "block") resolveBlock(events, "e", eP, pAtk, eStatus, pStatus);

  // --- Attacks ---
  const pHit = computeAttack(cfg, rng, "p", pP, pStatus, eP, eInput.evadeOK, e);
  const eHit = computeAttack(cfg, rng, "e", eP, eStatus, pP, pInput.evadeOK, p);

  if (pHit && pHit.landed) {
    e.dp -= pHit.damage;
    p.combo++;
    events.push(hitEvent("p", "e", pP, pHit));
  } else if (pAtk && pHit && !pHit.landed) {
    p.combo = 0;
  }

  if (eHit && eHit.landed) {
    p.dp -= eHit.damage;
    e.combo++;
    events.push(hitEvent("e", "p", eP, eHit));
  } else if (eAtk && eHit && !eHit.landed) {
    e.combo = 0;
  }

  if (pAtk && eAtk && pHit?.landed && eHit?.landed) {
    events.push(ev("trade", "TRADE", "both attacks land", "Both bots trade blows", "#cccccc", { hold: 750 }));
  }

  if (events.length === 0) {
    events.push(ev("fizzle", "", "nothing happens", "Both slots fizzle", "#888888", { hold: 600 }));
  }

  return { events };
}

function resolveEvade(
  events: BattleEvent[],
  side: BotSide,
  evadeOK: boolean,
  foeAttacked: boolean,
  foeStatus: BotStatus
) {
  const who = side === "p" ? "You" : "Enemy";
  if (foeAttacked && evadeOK) {
    foeStatus.disabled = true;
    events.push(ev("evade-ok", who + " DODGE!", "next slot disabled",
      who + " vanish, dodge, and disable the next slot", "#b97cff", { source: side }));
  } else if (foeAttacked && !evadeOK) {
    events.push(ev("evade-fail", "Dodge FAILED", "the hit connects", who + " evade failed", "#888888", { source: side }));
  } else {
    events.push(ev("evade-waste", who + " evade nothing", "slot wasted", who + " evaded nothing — wasted", "#888888", { source: side }));
  }
}

function resolveBlock(
  events: BattleEvent[],
  side: BotSide,
  prog: Program,
  foeAttacked: boolean,
  selfStatus: BotStatus,
  foeStatus: BotStatus
) {
  const who = side === "p" ? "You" : "Enemy";
  if (!foeAttacked) {
    events.push(ev("block-waste", who + " blocked nothing", "slot wasted", who + " blocked nothing — wasted", "#888888", { source: side }));
    return;
  }
  if (prog.variant === "buff") {
    selfStatus.charged = true;
    events.push(ev("block-ok", who + " AEGIS BLOCK!", "hit negated, next attack charged",
      who + " Aegis-blocks — next attack charged", "#4db8ff", { source: side }));
  } else {
    foeStatus.weakened = true;
    events.push(ev("block-ok", who + " SCRAMBLER BLOCK!", "hit negated, their next attack weakened",
      who + " Scrambler-blocks — enemy weakened", "#7cc0ff", { source: side }));
  }
}

interface AttackOutcome {
  landed: boolean;
  damage: number;
  crit: boolean;
  isSuper: boolean;
}

function computeAttack(
  cfg: CombatConfig,
  rng: RNG,
  _side: BotSide,
  atk: Program,
  atkStatus: BotStatus,
  def: Program,
  defEvadeOK: boolean,
  defender: Combatant
): AttackOutcome | null {
  if (atk.type !== "attack") return null;

  const isSuper = !!(atk as any).isSuper;
  const blocked = def.type === "block";
  const dodged = def.type === "evade" && defEvadeOK;

  if (isSuper) {
    // Supers ignore block and evade entirely, but resistances still apply.
    let dmg = (atk.dmg ?? cfg.superDamage) * rng.range(0.95, 1.05);
    dmg = applyResistance(dmg, atk.damageType, defender.resistances);
    dmg = applyPacketShield(dmg, defender);
    return { landed: true, damage: Math.round(dmg), crit: false, isSuper: true };
  }

  if (blocked || dodged) {
    return { landed: false, damage: 0, crit: false, isSuper: false };
  }

  let dmg = atk.dmg ?? 0;
  if (atkStatus.charged) { dmg *= cfg.chargeMultiplier; atkStatus.charged = false; }
  if (atkStatus.weakened) { dmg *= cfg.weakenMultiplier; atkStatus.weakened = false; }
  const crit = rng.chance(cfg.critChance);
  dmg = dmg * rng.range(1 - cfg.damageVariance, 1 + cfg.damageVariance) * (crit ? cfg.critMultiplier : 1);
  dmg = applyResistance(dmg, atk.damageType, defender.resistances);
  dmg = applyPacketShield(dmg, defender);

  return { landed: true, damage: Math.round(dmg), crit, isSuper: false };
}

/** Packet Shield: halve the first hit a bot takes each battle. */
function applyPacketShield(dmg: number, defender: Combatant): number {
  if (defender.abilities.packetShield && !defender.packetShieldUsed && dmg > 0) {
    defender.packetShieldUsed = true;
    return dmg * 0.5;
  }
  return dmg;
}

function hitEvent(source: BotSide, target: BotSide, prog: Program, o: AttackOutcome): BattleEvent {
  const who = source === "p" ? "You" : "Enemy";
  if (o.isSuper) {
    return ev("hit", "SUPER MOVE!", who + " deals " + o.damage + " unblockable",
      who + " SUPER lands for " + o.damage + "!", "#3cff85",
      { source, target, damage: o.damage, isSuper: true, hold: 1100 });
  }
  return ev("hit", o.crit ? "CRITICAL HIT" : who + " attacks",
    who + " deals " + o.damage + (o.crit ? " (crit!)" : ""),
    who + " hits for " + o.damage + (o.crit ? " CRIT!" : ""), prog.color,
    { source, target, damage: o.damage, crit: o.crit, hold: 880 });
}

function ev(
  kind: BattleEvent["kind"],
  main: string,
  sub: string,
  log: string,
  logColor: string,
  extra: Partial<BattleEvent> = {}
): BattleEvent {
  return { kind, main, sub, log, logColor, ...extra };
}

export { freshStatus };
