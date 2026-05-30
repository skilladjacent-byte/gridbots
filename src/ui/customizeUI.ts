// ============================================================
// GridBots — Customize UI
// The screen where the player assembles their GridBot: swap parts
// across 4 slots, watch stats recompute live, build a RAM-budgeted
// program loadout. Enforces: all slots filled, RAM not exceeded.
// ============================================================

import type { AssembledBot } from "../core/assembly";
import { computeStats, PART_SLOTS } from "../core/assembly";
import type { PartSlot, Part, DamageType } from "../core/types";
import { DAMAGE_TYPES } from "../core/types";
import { PARTS, PARTS_BY_SLOT } from "../data/parts";
import { PROGRAMS, UNIVERSAL_PROGRAM_IDS, shortName } from "../data/programs";
import { savePlayerBot } from "../data/playerState";

const SLOT_LABEL: Record<PartSlot, string> = {
  head: "Head (CPU)", leftArm: "Left Arm", rightArm: "Right Arm", legs: "Legs",
};
const TYPE_COLOR: Record<string, string> = {
  attack: "#ff6a3d", block: "#4db8ff", evade: "#b97cff", special: "#ffd24d",
};

export class CustomizeUI {
  constructor(private root: HTMLElement, private bot: AssembledBot, private onBattle: () => void) {
    this.render();
    this.refresh();
  }

  private $(sel: string) { return this.root.querySelector(sel) as HTMLElement; }

  /** Recompute everything and repaint the dynamic regions. */
  private refresh() {
    const stats = computeStats(this.bot, UNIVERSAL_PROGRAM_IDS);

    // Prune any loadout programs no longer available (e.g. unequipped an exclusive arm).
    this.bot.programLoadout = this.bot.programLoadout.filter(id => stats.availableProgramIds.includes(id));

    this.renderSlots();
    this.renderStats(stats);
    this.renderLoadout(stats);
    this.renderReadiness(stats);
    savePlayerBot(this.bot);
  }

  private renderSlots() {
    const wrap = this.$("#slots");
    wrap.innerHTML = "";
    for (const slot of PART_SLOTS) {
      const equipped = this.bot.loadout[slot];
      const card = document.createElement("div");
      card.className = "slot-card";
      const options = PARTS_BY_SLOT[slot]
        .map(id => {
          const p = PARTS[id];
          const sel = equipped?.id === id ? " selected" : "";
          return `<option value="${id}"${sel}>${p.name}</option>`;
        })
        .join("");
      card.innerHTML = `
        <div class="slot-label">${SLOT_LABEL[slot]}</div>
        <select data-slot="${slot}">${options}</select>
        <div class="slot-desc">${equipped ? equipped.desc : "—"}</div>
      `;
      const sel = card.querySelector("select")!;
      sel.addEventListener("change", (e) => {
        const id = (e.target as HTMLSelectElement).value;
        this.bot.loadout[slot] = PARTS[id] ?? null;
        this.refresh();
      });
      wrap.appendChild(card);
    }
  }

  private renderStats(stats: ReturnType<typeof computeStats>) {
    this.$("#statDP").textContent = String(stats.maxDP);
    this.$("#statRAM").textContent = String(stats.ram);

    const resWrap = this.$("#resList");
    resWrap.innerHTML = "";
    for (const t of DAMAGE_TYPES) {
      const v = stats.resistances[t];
      const row = document.createElement("div");
      row.className = "res-row";
      const sign = v > 0 ? "+" : "";
      const cls = v > 0 ? "pos" : v < 0 ? "neg" : "zero";
      row.innerHTML = `<span class="res-name">${cap(t)}</span><span class="res-val ${cls}">${sign}${v}%</span>`;
      resWrap.appendChild(row);
    }

    const abWrap = this.$("#abilityList");
    if (stats.abilities.length === 0) {
      abWrap.innerHTML = `<div class="ability none">No abilities</div>`;
    } else {
      abWrap.innerHTML = stats.abilities
        .map(a => `<div class="ability"><b>${a.name}</b><span>${a.desc}</span></div>`)
        .join("");
    }
  }

  private renderLoadout(stats: ReturnType<typeof computeStats>) {
    const used = this.loadoutRam();
    const over = used > stats.ram;
    this.$("#ramUsed").textContent = `${used} / ${stats.ram} RAM`;
    this.$("#ramUsed").className = "ram-readout" + (over ? " over" : "");

    // Available programs as toggle chips
    const wrap = this.$("#programChips");
    wrap.innerHTML = "";
    for (const id of stats.availableProgramIds) {
      const p = PROGRAMS[id];
      if (!p) continue;
      const inLoadout = this.bot.programLoadout.includes(id);
      const cost = p.ramCost ?? 0;
      const chip = document.createElement("button");
      chip.className = "chip" + (inLoadout ? " on" : "");
      chip.style.borderColor = p.color + "66";
      const tcol = TYPE_COLOR[p.type] ?? "#ccc";
      chip.innerHTML = `<span style="color:${p.color}">${shortName(p.name)}</span>
        <span class="chip-meta"><span style="color:${tcol}">${p.type}</span> · ${cost} RAM</span>`;
      chip.addEventListener("click", () => this.toggleProgram(id, stats));
      wrap.appendChild(chip);
    }

    // Current loadout list
    const list = this.$("#loadoutList");
    if (this.bot.programLoadout.length === 0) {
      list.innerHTML = `<div class="lo-empty">No programs equipped</div>`;
    } else {
      list.innerHTML = this.bot.programLoadout
        .map(id => {
          const p = PROGRAMS[id];
          return `<span class="lo-pill" style="color:${p.color}">${shortName(p.name)} <span class="lo-x" data-id="${id}">✕</span></span>`;
        })
        .join("");
      list.querySelectorAll(".lo-x").forEach(x => {
        x.addEventListener("click", () => {
          const id = (x as HTMLElement).dataset.id!;
          this.bot.programLoadout = this.bot.programLoadout.filter(p => p !== id);
          this.refresh();
        });
      });
    }
  }

  private toggleProgram(id: string, stats: ReturnType<typeof computeStats>) {
    const has = this.bot.programLoadout.includes(id);
    if (has) {
      this.bot.programLoadout = this.bot.programLoadout.filter(p => p !== id);
    } else {
      const cost = PROGRAMS[id]?.ramCost ?? 0;
      if (this.loadoutRam() + cost > stats.ram) return; // can't overspend RAM
      this.bot.programLoadout.push(id);
    }
    this.refresh();
  }

  private loadoutRam(): number {
    return this.bot.programLoadout.reduce((s, id) => s + (PROGRAMS[id]?.ramCost ?? 0), 0);
  }

  private renderReadiness(stats: ReturnType<typeof computeStats>) {
    const slotsFilled = PART_SLOTS.every(s => this.bot.loadout[s] !== null);
    const ramOK = this.loadoutRam() <= stats.ram;
    const hasPrograms = this.bot.programLoadout.length > 0;
    const reasons: string[] = [];
    if (!slotsFilled) reasons.push("equip all 4 parts");
    if (!ramOK) reasons.push("over RAM budget");
    if (!hasPrograms) reasons.push("equip at least one program");

    const ready = reasons.length === 0;
    const btn = this.$("#toBattle") as HTMLButtonElement;
    btn.disabled = !ready;
    this.$("#readyNote").textContent = ready ? "Ready for battle" : "To battle: " + reasons.join(", ");
    this.$("#readyNote").className = "ready-note" + (ready ? " ok" : "");
  }

  private render() {
    this.root.innerHTML = `
      <div class="cz">
        <div class="cz-left">
          <div class="cz-head">${this.bot.name} · ${this.bot.chassis.name}</div>

          <div class="panel">
            <div class="panel-title">Equipment</div>
            <div id="slots" class="slots"></div>
          </div>

          <div class="panel">
            <div class="panel-title">Program loadout <span id="ramUsed" class="ram-readout">0 / 0 RAM</span></div>
            <div id="programChips" class="chips"></div>
            <div class="lo-label">Equipped:</div>
            <div id="loadoutList" class="loadout-list"></div>
          </div>
        </div>

        <div class="cz-right">
          <div class="panel">
            <div class="panel-title">Stats</div>
            <div class="stat-grid">
              <div class="stat-card"><div class="stat-k">DP</div><div id="statDP" class="stat-v">0</div></div>
              <div class="stat-card"><div class="stat-k">RAM</div><div id="statRAM" class="stat-v">0</div></div>
            </div>
            <div class="res-title">Resistances</div>
            <div id="resList" class="res-list"></div>
          </div>
          <div class="panel">
            <div class="panel-title">Abilities</div>
            <div id="abilityList" class="ability-list"></div>
          </div>
          <div id="readyNote" class="ready-note"></div>
          <button id="toBattle" class="primary big">To Battle →</button>
        </div>
      </div>
    `;
    this.$("#toBattle").addEventListener("click", () => {
      savePlayerBot(this.bot);
      this.onBattle();
    });
  }
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
