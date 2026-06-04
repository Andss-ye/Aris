# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Aris** — a browser-based isometric **tower-defense game set on Mars**, built on Three.js (r128, loaded from CDN). The player builds a colony on a 16×16 grid, extracts minerals, and defends against waves of Martian enemies. Codebase is split into ES modules under `src/`, with `index.html` as the entry point. No build system, bundler, or test suite — modules load natively via `<script type="module">`.

> `main.html` is the **legacy single-file snapshot** the world-builder was modularized from. It still runs standalone but is not the source of truth — edit the `src/` modules instead. `index.html` + `src/` is canonical.

## Running & developing

- **Run:** `uv run python -m http.server 8000` then open `http://localhost:8000/`. **A server is required** — ES modules are blocked over `file://` by CORS.
- **No build step.** Edits to any `src/*.js` are live on next page reload.
- **Dependency:** Three.js r128 via `cdnjs` `<script>` tag, exposed as the **global `THREE`**. Modules reference `THREE` directly — do not `import` it. The code uses r128-era APIs (`outputEncoding`, `sRGBEncoding`, `MeshLambertMaterial`); do not assume newer Three.js APIs apply.
- **Syntax check before reload:** `find src -name '*.js' | xargs -I{} node --check {}`

## Game design (from `idea.md`)

### Loop
`Build phase (45 s) → Invasion wave → Reward → next wave × 5`

Survive 5 waves to win. A Martian reaching the center of the Base Principal = game over.

### Resources
| Resource | Source | Used for |
|----------|--------|----------|
| ⚙ Hierro | Iron Mine / iron deposits | Basic structures, walls |
| ⚡ Energía | Reactor / crystal deposits | Towers, upgrades |
| 💎 Cristales | Crystal Extractor | Advanced upgrades only |

### Structures (each has 2 upgrades)
| Structure | Footprint | Notes |
|-----------|-----------|-------|
| **Base Principal** | 2×2 | Objective. Generates +2 hierro/seg. Upgrade → blindaje → torreta integrada |
| **Mina de Hierro** | 1×1 | Must be placed on iron deposit tile |
| **Reactor** | 1×1 | Must be placed on crystal deposit tile |
| **Torre de Plasma** | 1×1 | Auto-shoots nearest enemy in range |
| **Muro de Titanio** | 1×1 | Absorbs hits; Upgrade 2 = electrificado (deals return damage) |
| **Hidropónica** | 1×1 | Optional — regenerates Base HP |

### Enemies (3 types, spawn at grid edges)
| Type | Mesh | Behavior |
|------|------|----------|
| **Scout** | Small green sphere + antennae | Fast (1.5 cells/s), 30 HP |
| **Tanque** | Large gray-green cube | Slow (0.5 cells/s), 150 HP, destroys walls in path |
| **Kamikaze** | Pulsing red sphere | Fast (2 cells/s), 20 HP, AOE explosion on arrival |

## Module layout

```
index.html              entry: loads fonts, styles/main.css, THREE (CDN), src/main.js
styles/main.css         all UI chrome
src/
  main.js               boot + per-frame loop (animations, resources, enemies, combat, smoke)
  config/constants.js   GRID=16, TILE, heights, MAX_FLOORS, H{}, resource costs
  core/
    engine.js           renderer, scene, worldGroup, both cameras, lights, orbit/zoom/pan/resize
    animation.js        drop-in landing system (dropAnims, animateDrop, tickDropAnims)
  geometry/shapes.js    roundedSlab, roundedBox, castReceive, disposeGroup
  materials/materials.js shared palette M{} — MeshLambertMaterial, deliberately non-PBR
  world/
    state.js            world[x][z] + cellMeshes, tilePos — source of truth
    adjacency.js        getFenceNeighbors, bfsHouseCluster
    render.js           renderCellTile/Object + setCell (central mutation entry point)
  factories/
    tile.js             makeTile(terrain) — now includes Martian terrain types
    nature.js           makeTree, makeCrop, makeTuft
    fence.js            makeFence(neighbors) — adjacency-aware
    tower.js            makeTower() — plasma tower mesh (cylinder + rotating cannon)
    wall.js             makeWall(level) — titanium wall slab, glow on level 2
    mine.js             makeMine(level) — iron mine mesh
    reactor.js          makeReactor(level) — energy reactor mesh
    hydroponics.js      makeHydroponics(level) — hydroponics mesh
    house/              parts.js, plans.js, builder.js, cluster.js (Base Principal uses buildSquareHouse)
  game/
    resources.js        resource counters, per-tick production, HUD update
    waves.js            build-phase timer, enemy spawn schedule, win/lose state
    enemies.js          enemy pool, mesh per type, per-frame movement, HP, structure attacks
    projectiles.js      projectile pool, lerp animation, impact/AOE damage
    combat.js           tower range detection, fire logic, collision checks
    upgrades.js         click-on-structure → upgrade panel, cost deduction, mesh swap
  effects/smoke.js      chimney smoke particles (kept from world builder phase)
  input/
    tools.js            TOOLS palette, toolbar UI, applyTool — includes 5 new Mars tools
    controls.js         pointer/keyboard/wheel + WASD/right-drag camera pan
  scenes/initialScene.js  starting Mars colony layout, deposit placement
```

## Architecture

### World state → mesh rebuild (immutable render)

World intent (data) is always separate from rendered meshes. Key layers:

1. **`world[x][z]`** (`src/world/state.js`) — `{ terrain, kind, floors, hp, level }` over a 16×16 grid. `terrain` ∈ `rock_mars / dust / crater / iron_deposit / crystal_deposit`; `kind` ∈ `null/tree/tuft/crop/fence/house/tower/wall/mine/reactor/hydroponics`. `hp` and `level` are added for game objects.
2. **`cellMeshes['x,z']`** — holds live Three.js groups. Objects are **rebuilt** from world state, not mutated in place, so adjacency-aware kinds rerender correctly when neighbors change.
3. **`setCell(x, z, opts)`** (`src/world/render.js`) is the central mutation entry point — updates `world`, computes a refresh set (cell + 4 neighbors + BFS-connected houses), and rerenders each.

### Game tick (added on top of render loop)

`src/main.js` runs one unified `requestAnimationFrame` loop. Each frame:
1. `tickDropAnims(dt)` — landing animations
2. Idle prop motion (tree sway, crop bob, tuft wiggle)
3. `resources.tick(dt)` — accumulate per-second production into counters, update HUD
4. `waves.tick(dt)` — count down build timer or advance wave
5. `enemies.tick(dt)` — move each enemy, detect structure collisions
6. `combat.tick(dt)` — fire towers at in-range enemies
7. `projectiles.tick(dt)` — move projectiles, detect impacts, apply AOE
8. `updateSmoke(dt)` — chimney particles
9. `renderer.render(scene, camera)`

### Camera panning

`engine.js` exposes `pan(dx, dz)` alongside existing `orbit` / `zoom`. Controls wire WASD keys and right-mouse-drag to `pan`. The world is 16×16 so the camera starts centered at (8, 8) and pans freely; `updateCamera` clamps the look-at target to grid bounds.

### Upgrade system

Clicking an existing structure opens a mini upgrade panel (DOM overlay, not Three.js). `upgrades.js` checks `world[x][z].level`, deducts resource costs, increments `level`, and calls `setCell` to rebuild the mesh at the new level. Factories accept a `level` param (0/1/2) and return geometry accordingly.

### Import discipline (no cycles)

Dependencies flow one way: `constants` → `state/geometry/materials` → `factories` → `world/render` → `game/*` → `scenes/input` → `main`. `engine.js` has no internal imports and is the shared scene root. `game/*` modules may import from `world/` and `factories/` but not from `input/` or `scenes/`. `engine.js` exports `camera` as a **live binding** reassigned by `togglePerspective()` — do not cache it locally.

## Conventions when editing

- **Rebuild, don't mutate, meshes.** Update `world[x][z]` then call `setCell` — never patch an existing mesh in place.
- **Adding a new placeable structure:** add to `TOOLS` in `src/input/tools.js` + a factory in `src/factories/` + a branch in `renderCellObject` in `src/world/render.js`. If it has idle motion or per-tick logic, handle it in `main.js`.
- **Adding a new enemy type:** add mesh builder in `src/game/enemies.js` and a spawn entry in `src/game/waves.js`. Enemy state lives in a plain JS array (not world state) since enemies are not grid-aligned.
- **Resource costs and upgrade stats** are constants — keep them in `src/config/constants.js`, not scattered in factory files.
- **Deposit tiles** (`iron_deposit`, `crystal_deposit`) are terrain types, not `kind`. A Mine/Reactor placed on them overlays the tile — `world[x][z].terrain` stays as-is; `kind` becomes `mine`/`reactor`.
- Dispose geometry on removal via `disposeGroup` to avoid leaks.
