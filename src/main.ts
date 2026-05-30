// ============================================================
// GridBots — Entry Point
// Boots the App shell (Customize/Battle tabs) into #app.
// ============================================================

import { App } from "./app";
import "./style.css";

const root = document.getElementById("app");
if (!root) throw new Error("#app container not found");

new App(root);
