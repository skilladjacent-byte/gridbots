// ============================================================
// GridBots — Battle Scene
// Orchestrates a battle: drives rounds, plays cast animations,
// runs the resolver, and feeds events to the renderer + UI.
// This is the seam between pure logic and presentation.
// ============================================================

import type { Program, Combatant, BotStatus } from "../core/types";
import { zeroResistances } from "../core/types";
import { COMBAT_CONFIG, createRNG, type RNG } from "../core/config";
import { resolveSlot, freshStatus, type BattleEvent, type SlotInput } from "../core/combat";
import { PROGRAMS, makeSuper, shortName } from "../data/programs";
import { PLAYER_BOT, ENEMY_BOT, randomAI, type BotAI } from "../data/bots";
import { BotRig } from "../render/botRig";
import { drawGridFloor } from "../render/gridFloor";

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export interface BattleCallbacks {
  onFlash(side: "p" | "e", label: string, type: string): void;
  onCallout(main: string, sub: string): void;
  onSlotTag(text: string): void;
  onRoundTag(text: string): void;
  onLog(html: string, color?: string): void;
  onBars(p: Combatant, e: Combatant): void;
  onStatus(side: "p" | "e", combo: number, st: BotStatus): void;
  onEnd(result: "win" | "lose" | "draw"): void;
  onReadyForInput(ready: boolean): void;
}

export class BattleScene {
  private ctx: CanvasRenderingContext2D;
  private rng: RNG = createRNG();
  private cfg = COMBAT_CONFIG;
  private ai: BotAI = randomAI();

  private pRig: BotRig;
  private eRig: BotRig;

  private p: Combatant;
  private e: Combatant;
  private round = 1;
  busy = false;
  over = false;

  private last = 0;

  constructor(private canvas: HTMLCanvasElement, private cb: BattleCallbacks) {
    this.ctx = canvas.getContext("2d")!;
    this.pRig = new BotRig(150, 1, PLAYER_BOT.color, PLAYER_BOT.build);
    this.eRig = new BotRig(530, -1, ENEMY_BOT.color, ENEMY_BOT.build);
    this.p = neutralCombatant("p", this.cfg.startDP);
    this.e = neutralCombatant("e", this.cfg.startDP);
    requestAnimationFrame(this.loop);
  }

  private loop = (t: number) => {
    const dt = Math.min(50, t - this.last);
    this.last = t;
    this.pRig.update(dt);
    this.eRig.update(dt);
    drawGridFloor(this.ctx, t, this.canvas.width, this.canvas.height);
    this.eRig.draw(this.ctx, t);
    this.pRig.draw(this.ctx, t);
    requestAnimationFrame(this.loop);
  };

  /** Begin a round given the player's locked-in 5 programs. */
  async runRound(playerQueue: Program[]) {
    if (this.busy || this.over) return;
    this.busy = true;
    this.cb.onReadyForInput(false);

    const pQ = playerQueue.slice();
    const eQ = this.ai.buildQueue(this.cfg.slotsPerRound);
    const pStatus: BotStatus = freshStatus();
    const eStatus: BotStatus = freshStatus();

    this.cb.onLog(`<b style="color:#9affc0">— Round ${this.round} —</b>`);
    this.cb.onStatus("p", this.p.combo, pStatus);
    this.cb.onStatus("e", this.e.combo, eStatus);

    for (let i = 0; i < this.cfg.slotsPerRound; i++) {
      if (this.over) break;
      this.cb.onSlotTag(`SLOT ${i + 1} / ${this.cfg.slotsPerRound}`);
      this.cb.onCallout("", "");
      await wait(560);

      let pProg = pQ[i];
      let eProg = eQ[i];

      const pDisabled = pStatus.disabled;
      const eDisabled = eStatus.disabled;
      pStatus.disabled = false;
      eStatus.disabled = false;

      // Super charge check (disabled slot can't super). Hyperthreaded lowers the threshold.
      const pThreshold = this.p.abilities.hyperthreaded ? this.cfg.superCombo - 1 : this.cfg.superCombo;
      const eThreshold = this.e.abilities.hyperthreaded ? this.cfg.superCombo - 1 : this.cfg.superCombo;
      let pSuper = false, eSuper = false;
      if (this.p.combo >= pThreshold && !pDisabled) { pSuper = true; this.p.combo = 0; pProg = makeSuper("p", this.cfg.superDamage); }
      if (this.e.combo >= eThreshold && !eDisabled) { eSuper = true; this.e.combo = 0; eProg = makeSuper("e", this.cfg.superDamage); }

      if (pDisabled) pProg = disabledProgram();
      if (eDisabled) eProg = disabledProgram();

      this.cb.onFlash("p", pSuper ? "SUPER" : shortName(pProg.name), pSuper ? "super" : pProg.type);
      this.cb.onFlash("e", eSuper ? "SUPER" : shortName(eProg.name), eSuper ? "super" : eProg.type);
      await wait(480);

      // Pre-roll evades so logic + animation agree.
      const pEvadeOK = pProg.type === "evade" && this.rng.chance(this.cfg.evadeChance);
      const eEvadeOK = eProg.type === "evade" && this.rng.chance(this.cfg.evadeChance);

      await Promise.all([
        this.playCast(this.pRig, pProg),
        this.playCast(this.eRig, eProg),
      ]);

      const pInput: SlotInput = { program: pProg, evadeOK: pEvadeOK };
      const eInput: SlotInput = { program: eProg, evadeOK: eEvadeOK };
      const { events } = resolveSlot(this.cfg, this.rng, pInput, eInput, pStatus, eStatus, this.p, this.e);

      for (const evt of events) {
        this.applyEventVisuals(evt);
        this.cb.onCallout(evt.main, evt.sub);
        this.cb.onLog(evt.log, evt.logColor);
        this.cb.onBars(this.p, this.e);
        this.cb.onStatus("p", this.p.combo, pStatus);
        this.cb.onStatus("e", this.e.combo, eStatus);
        await wait(evt.hold ?? 850);
      }

      this.pRig.anim = null;
      this.eRig.anim = null;

      if (this.p.dp <= 0 || this.e.dp <= 0) { this.endBattle(); return; }
    }

    this.round++;
    this.cb.onRoundTag(`ROUND ${this.round}`);
    this.cb.onSlotTag("");
    this.cb.onCallout("Build your next queue", "");
    await wait(650);
    this.cb.onCallout("", "");
    this.busy = false;
    this.cb.onReadyForInput(true);
  }

  private applyEventVisuals(evt: BattleEvent) {
    if (evt.kind === "hit" && evt.target) {
      (evt.target === "p" ? this.pRig : this.eRig).takeDamage();
    }
    if (evt.kind === "block-ok" && evt.source) {
      (evt.source === "p" ? this.pRig : this.eRig).blockSuccess();
    }
  }

  private async playCast(rig: BotRig, prog: Program) {
    const isSuper = !!(prog as any).isSuper;
    if (prog.type === "attack" && !isSuper) {
      if (prog.style === "melee") {
        rig.setAnim(prog.arm === "L" ? "melee_L" : "melee_R", 760);
        await wait(760);
      } else {
        rig.setAnim(prog.arm === "L" ? "ranged_L" : "ranged_R", 640);
        await wait(300);
        rig.fireProjectile(prog.color);
        await wait(340);
      }
    } else if (isSuper) {
      rig.setAnim("super", 1000);
      await wait(420);
      rig.fireProjectile("#3cff85", true);
      await wait(580);
    } else if (prog.type === "block") {
      rig.setAnim("block", 900);
      rig.shield = 1;
      await wait(700);
    } else if (prog.type === "evade") {
      rig.setAnim("evade", 800);
      await wait(800);
    } else if (prog.type === "special") {
      rig.setAnim("buff", 700);
      await wait(700);
    } else {
      await wait(300);
    }
  }

  private endBattle() {
    this.over = true;
    this.busy = true;
    this.cb.onBars(this.p, this.e);
    const win = this.e.dp <= 0 && this.p.dp > 0;
    const draw = this.e.dp <= 0 && this.p.dp <= 0;
    this.cb.onSlotTag("");
    if (draw) this.cb.onCallout("DOUBLE CRASH", "");
    else if (win) { this.cb.onCallout("VICTORY", "enemy GridBot crashed"); this.pRig.setAnim("victory", 9999); }
    else { this.cb.onCallout("SYSTEM CRASH", "your GridBot crashed"); this.eRig.setAnim("victory", 9999); }
    this.cb.onEnd(draw ? "draw" : win ? "win" : "lose");
  }

  reset() {
    this.p = neutralCombatant("p", this.cfg.startDP);
    this.e = neutralCombatant("e", this.cfg.startDP);
    this.round = 1;
    this.over = false;
    this.busy = false;
    this.pRig.reset();
    this.eRig.reset();
    this.cb.onRoundTag("ROUND 1");
    this.cb.onBars(this.p, this.e);
    this.cb.onStatus("p", 0, freshStatus());
    this.cb.onStatus("e", 0, freshStatus());
    this.cb.onReadyForInput(true);
  }

  getCombatants() { return { p: this.p, e: this.e }; }
}

/**
 * Builds a combatant with no resistances/abilities — the current sandbox
 * default. Phase 3b will replace this with combatants derived from the
 * player's assembled bot (via computeStats) and a chosen enemy build.
 */
function neutralCombatant(side: "p" | "e", dp: number): Combatant {
  return {
    side, dp, maxDp: dp, combo: 0,
    resistances: zeroResistances(),
    abilities: { packetShield: false, hyperthreaded: false, ghostProtocol: false },
    packetShieldUsed: false,
  };
}

function disabledProgram(): Program {
  return { id: "disabled", name: "DISABLED", type: "special", color: "#888888", desc: "slot disabled" };
}

export { PROGRAMS };
