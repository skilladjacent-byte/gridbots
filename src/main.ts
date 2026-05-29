// ============================================================
// GridBots — Entry Point
// Boots the combat sandbox into the #app container.
// As later scenes (Command Grid hub, customization) are added,
// this becomes a simple scene router.
// ============================================================

import { CombatUI } from "./ui/combatUI";
import "./style.css";

const app = document.getElementById("app");
if (!app) throw new Error("#app container not found");

new CombatUI(app);
