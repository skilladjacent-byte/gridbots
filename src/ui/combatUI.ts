// ============================================================
// GridBots — Combat UI Controller
// Owns the DOM around the canvas: the script-queue builder,
// program palette, HUD bars/status, move-name flashes, log.
// Talks to BattleScene through callbacks.
// ============================================================

import type { Program, Combatant, BotStatus } from "../core/types";
import { PROGRAMS, shortName } from "../data/programs";
import { BattleScene, type BattleCallbacks, type BattleSetup } from "../scenes/battleScene";
import { COMBAT_CONFIG } from "../core/config";

const TYPE_COLOR: Record<string, string> = {
  attack: "#ff6a3d", block: "#4db8ff", evade: "#b97cff", special: "#ffd24d", super: "#3cff85", none: "#888",
};

function typeTag(p: Program): string {
  if (p.type === "block") return p.variant === "buff" ? "BLK+" : "BLK-";
  return ({ attack: "ATK", evade: "EVD", special: "SPC" } as Record<string, string>)[p.type] ?? "";
}

export class CombatUI {
  private queue: Program[] = [];
  private scene!: BattleScene;
  private ready = true;
  /** The program ids the player equipped in customization — the only ones playable. */
  private palettePrograms: string[];

  constructor(private root: HTMLElement, private setup: BattleSetup) {
    this.palettePrograms = setup.player.programLoadout.slice();
    this.render();
    const canvas = this.root.querySelector<HTMLCanvasElement>("#grid")!;
    this.scene = new BattleScene(canvas, this.makeCallbacks(), setup);
    this.bindControls();
    this.renderQueue();
    this.renderPalette();
    this.updateCount();
  }

  private $(sel: string) { return this.root.querySelector(sel) as HTMLElement; }

  private makeCallbacks(): BattleCallbacks {
    return {
      onFlash: (side, label, type) => this.flashMove(side, label, type),
      onCallout: (main, sub) => { this.$("#callout").textContent = main; this.$("#subcall").textContent = sub; },
      onSlotTag: (text) => { this.$("#slotTag").textContent = text; },
      onRoundTag: (text) => { this.$("#roundTag").textContent = text; },
      onLog: (html, color) => this.log(html, color),
      onBars: (p, e) => this.bars(p, e),
      onStatus: (side, combo, st) => this.statusLine(side, combo, st),
      onEnd: (result) => this.onEnd(result),
      onReadyForInput: (ready) => { this.ready = ready; this.updateCount(); },
    };
  }

  private bindControls() {
    this.$("#lockBtn").addEventListener("click", () => {
      if (this.queue.length !== COMBAT_CONFIG.slotsPerRound || !this.ready || this.scene.over) return;
      const q = this.queue.slice();
      this.queue = [];
      this.renderQueue();
      this.scene.runRound(q);
    });
    this.$("#clearBtn").addEventListener("click", () => {
      if (!this.ready) return;
      this.queue = [];
      this.renderQueue();
      this.updateCount();
    });
  }

  private flashMove(side: "p" | "e", label: string, type: string) {
    const el = this.$(side === "p" ? "#pFlash" : "#eFlash");
    el.textContent = label.toUpperCase();
    const c = TYPE_COLOR[type] ?? "#eaffef";
    el.style.color = c;
    el.style.textShadow = `0 0 10px ${c}cc, 0 0 22px ${c}66`;
    el.classList.remove("go");
    void el.offsetWidth;
    el.classList.add("go");
  }

  private renderQueue() {
    const q = this.$("#queue");
    q.innerHTML = "";
    for (let i = 0; i < COMBAT_CONFIG.slotsPerRound; i++) {
      const p = this.queue[i];
      const cell = document.createElement("div");
      cell.className = "slot" + (p ? " filled" : "");
      if (p) {
        cell.style.background = p.color + "22";
        cell.style.color = p.color;
        cell.innerHTML = `<span class="nm">${shortName(p.name)}</span><span class="tg">${typeTag(p)}</span>`;
        cell.addEventListener("click", () => {
          if (!this.ready) return;
          this.queue.splice(i, 1);
          this.renderQueue();
          this.updateCount();
        });
      } else {
        cell.textContent = "slot " + (i + 1);
      }
      q.appendChild(cell);
    }
  }

  private renderPalette() {
    const pal = this.$("#palette");
    pal.innerHTML = "";
    for (const key of this.palettePrograms) {
      const p = PROGRAMS[key];
      if (!p) continue;
      const b = document.createElement("button");
      b.className = "prog";
      b.style.borderColor = p.color + "55";
      b.innerHTML = `<span class="pn" style="color:${p.color}">${shortName(p.name)} <span class="pt">${typeTag(p)}</span></span><span class="pd">${p.desc}</span>`;
      b.addEventListener("click", () => {
        if (!this.ready || this.scene.over) return;
        if (this.queue.length >= COMBAT_CONFIG.slotsPerRound) return;
        this.queue.push(p);
        this.renderQueue();
        this.updateCount();
      });
      pal.appendChild(b);
    }
  }

  private updateCount() {
    this.$("#slotCount").textContent = `${this.queue.length} / ${COMBAT_CONFIG.slotsPerRound}`;
    const lock = this.$("#lockBtn") as HTMLButtonElement;
    lock.disabled = this.queue.length !== COMBAT_CONFIG.slotsPerRound || !this.ready || this.scene?.over;
  }

  private bars(p: Combatant, e: Combatant) {
    (this.$("#pdp") as HTMLElement).style.width = Math.max(0, p.dp / p.maxDp * 100) + "%";
    (this.$("#edp") as HTMLElement).style.width = Math.max(0, e.dp / e.maxDp * 100) + "%";
    this.$("#pdpLabel").textContent = `DP ${Math.max(0, Math.round(p.dp))} / ${p.maxDp}`;
    this.$("#edpLabel").textContent = `DP ${Math.max(0, Math.round(e.dp))} / ${e.maxDp}`;
  }

  private statusLine(side: "p" | "e", combo: number, st: BotStatus) {
    const bits = [`combo ${combo}/${COMBAT_CONFIG.superCombo}`];
    if (st.charged) bits.push("⚡charged");
    if (st.weakened) bits.push("▽weakened");
    if (st.disabled) bits.push("✕disabled");
    this.$(side === "p" ? "#pStatus" : "#eStatus").textContent = bits.join("  ");
  }

  private log(html: string, color?: string) {
    const d = document.createElement("div");
    d.innerHTML = html;
    if (color) d.style.color = color;
    this.$("#log").prepend(d);
  }

  private onEnd(result: "win" | "lose" | "draw") {
    this.log(
      result === "draw" ? "<b>Draw.</b>"
      : result === "win" ? '<b style="color:#3cff85">Enemy crashed. You win!</b>'
      : '<b style="color:#ff5a2d">You crashed. Defeat.</b>'
    );
    const lock = this.$("#lockBtn") as HTMLButtonElement;
    lock.textContent = "Run it back";
    lock.disabled = false;
    const newLock = lock.cloneNode(true) as HTMLButtonElement;
    lock.replaceWith(newLock);
    newLock.addEventListener("click", () => {
      this.scene.reset();
      this.$("#log").innerHTML = "";
      this.$("#callout").textContent = "";
      this.$("#subcall").textContent = "";
      newLock.textContent = "Lock in & reveal";
      // rebind normal controls
      this.queue = [];
      this.renderQueue();
      this.updateCount();
      this.bindLockAfterReset(newLock);
    });
  }

  private bindLockAfterReset(lock: HTMLButtonElement) {
    lock.addEventListener("click", () => {
      if (this.queue.length !== COMBAT_CONFIG.slotsPerRound || !this.ready || this.scene.over) return;
      const q = this.queue.slice();
      this.queue = [];
      this.renderQueue();
      this.scene.runRound(q);
    });
  }

  private render() {
    this.root.innerHTML = `
      <div class="arena">
        <canvas id="grid" width="680" height="250"></canvas>
        <div id="pFlash" class="moveflash" style="left:22%"></div>
        <div id="eFlash" class="moveflash" style="left:78%"></div>
        <div class="hud">
          <div class="hud-side">
            <div class="hud-name p">YOUR GRIDBOT</div>
            <div id="pdpLabel" class="hud-dp p">DP 100 / 100</div>
            <div class="bar p"><div id="pdp" class="fill"></div></div>
            <div id="pStatus" class="status p">combo 0/3</div>
          </div>
          <div class="hud-side right">
            <div class="hud-name e">ROGUE SIGNAL</div>
            <div id="edpLabel" class="hud-dp e">DP 100 / 100</div>
            <div class="bar e"><div id="edp" class="fill"></div></div>
            <div id="eStatus" class="status e">combo 0/3</div>
          </div>
        </div>
        <div id="roundTag" class="round-tag">ROUND 1</div>
        <div id="slotTag" class="slot-tag"></div>
        <div id="callout" class="callout"></div>
        <div id="subcall" class="subcall"></div>
      </div>
      <div class="builder">
        <div class="builder-head">
          <span>SCRIPT QUEUE — fill 5 slots</span>
          <span id="slotCount">0 / 5</span>
        </div>
        <div id="queue" class="queue"></div>
        <div class="palette-head">PROGRAMS — tap to add</div>
        <div id="palette" class="palette"></div>
        <div class="controls">
          <button id="clearBtn">Clear</button>
          <button id="lockBtn" class="primary">Lock in &amp; reveal</button>
        </div>
      </div>
      <div id="log" class="log"></div>
    `;
  }
}
