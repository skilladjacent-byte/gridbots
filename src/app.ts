// ============================================================
// GridBots — App Shell / Router
// Top-level tabs: Customize and Battle. Owns the player's
// assembled bot and hands fresh BattleSetups to the combat view.
// ============================================================

import { CustomizeUI } from "./ui/customizeUI";
import { CombatUI } from "./ui/combatUI";
import { loadPlayerBot } from "./data/playerState";
import { enemyAssembledBot } from "./data/bots";
import type { AssembledBot } from "./core/assembly";

type Tab = "customize" | "battle";

export class App {
  private bot: AssembledBot;
  private tab: Tab = "customize";
  private viewEl!: HTMLElement;

  constructor(private root: HTMLElement) {
    this.bot = loadPlayerBot();
    this.render();
    this.show("customize");
  }

  private render() {
    this.root.innerHTML = `
      <div class="app">
        <header class="topbar">
          <div class="brand">GRIDBOTS</div>
          <nav class="tabs">
            <button data-tab="customize" class="tab active">Customize</button>
            <button data-tab="battle" class="tab">Battle</button>
          </nav>
        </header>
        <main id="view" class="view"></main>
      </div>
    `;
    this.viewEl = this.root.querySelector("#view") as HTMLElement;
    this.root.querySelectorAll<HTMLButtonElement>(".tab").forEach(btn => {
      btn.addEventListener("click", () => this.show(btn.dataset.tab as Tab));
    });
  }

  private setActiveTab(tab: Tab) {
    this.root.querySelectorAll<HTMLButtonElement>(".tab").forEach(b => {
      b.classList.toggle("active", b.dataset.tab === tab);
    });
  }

  private show(tab: Tab) {
    this.tab = tab;
    this.setActiveTab(tab);
    this.viewEl.innerHTML = "";

    if (tab === "customize") {
      new CustomizeUI(this.viewEl, this.bot, () => this.show("battle"));
    } else {
      // Each battle is a fresh setup: the player's current build vs a fresh enemy.
      new CombatUI(this.viewEl, { player: this.bot, enemy: enemyAssembledBot() });
    }
  }
}
