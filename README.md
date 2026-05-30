# GridBots

Combat sandbox — the vertical-slice foundation for the Ambient Companion RPG.

## Run it

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

Build for production with `npm run build`, preview with `npm run preview`.

## What this is

Phase 1 + 2 of the prototype: the tactical Script-Queue combat loop with
animated GridBot rigs on the Tron-green grid. Build a 5-slot queue, lock in
against a (currently random) AI, and watch it resolve slot-by-slot.

## Architecture

The codebase is deliberately split so game logic stays portable and testable,
separate from rendering and from the host "shell." This is what lets the same
core later run inside a browser extension or a phone app.

```
src/
  core/        Pure game logic — NO dom/render imports
    types.ts     shared data shapes (Program, Combatant, etc.)
    config.ts    all balance numbers + the RNG wrapper
    combat.ts    the slot resolver — emits typed BattleEvents
  data/        Content database (typed data, not logic)
    programs.ts  the program list + super-move builder
    bots.ts      bot builds + the AI interface (random for now)
  render/      Canvas drawing — NO game logic
    botRig.ts    the skeletal rig + animation state machine
    gridFloor.ts the Tron grid background
  scenes/
    battleScene.ts  orchestrator: drives rounds, plays cast
                    animations, runs the resolver, feeds events out
  ui/
    combatUI.ts  the DOM around the canvas (queue, palette, HUD, log)
  main.ts      entry point / future scene router
  style.css    Tron-green theme
```

### Key boundaries
- **`core/` never imports from `render/` or `ui/`.** The resolver produces
  `BattleEvent`s; the renderer interprets them. You could swap the entire
  visual layer without touching combat.
- **All balance lives in `core/config.ts`** (`COMBAT_CONFIG`). Tune DP, evade
  chance, crit, super threshold, etc. in one place.
- **The RNG is wrapped** (`createRNG`) so it can be made seedable later for
  replays and server-authoritative PvP.
- **Bots are defined by a `build`** (silhouette) today; in Phase 3 a bot will
  be assembled from equipped parts, and the rig will draw the part shapes at
  its existing mount points.

## Combat rules (current tuning)

- 100 DP each. Attacks: Ping 12 / Laser 18 / Railburst 26.
- **Aegis Block** negates an attack + charges your next attack (+50%).
- **Scrambler Block** negates an attack + weakens their next attack (−50%).
- **Glitch Step** ~75% dodge; on success also disables the opponent's next slot.
- **Whiffed defense** (blocking/evading with nothing incoming) wastes the slot.
- 3 landed attacks in a row charges a **super** — unblockable, unevadable.
- Light RNG only in: evade success, crit (~12%), damage variance (±10%).

## Next (not yet built)
- Phase 3c: make the rig visually change per equipped part (right now the
  silhouette is derived from the chassis; parts change stats but not yet looks)
- Phase 1.5: smarter AI (the interface in `data/bots.ts` is ready for it)
- Phase 4: loot with randomized stat rolls feeding the part inventory
```
