# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Aris** — a browser-based isometric tile/world builder game built on Three.js (r128, loaded from CDN). The codebase is split into ES modules under `src/`, with `index.html` as the entry point. There is no build system, package manager, bundler, or test suite — modules load natively via `<script type="module">`.

> `main.html` is the **legacy single-file snapshot** the project was modularized from. It still runs standalone but is not the source of truth — edit the `src/` modules instead. `index.html` + `src/` is canonical.

## Running & developing

- **Run:** serve the folder and open `index.html` — `python3 -m http.server 8000` then visit `http://localhost:8000/`. **A server is required**: native ES modules are blocked over `file://` by browser CORS.
- **No build, lint, or test commands exist.** Edits to any `src/*.js` are live on the next page reload.
- **Dependency:** Three.js r128 via `cdnjs` `<script>` tag, exposed as the **global `THREE`** (a classic script, not an ES import). Modules reference `THREE` directly. The code relies on r128-era APIs (e.g. `outputEncoding`, `sRGBEncoding`, `MeshLambertMaterial`); do not assume newer Three.js module/`THREE.*` changes apply.
- **Sanity-check before reload:** `find src -name '*.js' | xargs -I{} node --check {}` catches syntax errors fast.

## Module layout

```
index.html              entry: loads fonts, styles/main.css, THREE (CDN), src/main.js
styles/main.css         all UI chrome (brand, toolbar, buttons, help, grain)
src/
  main.js               boot sequence + per-frame animation loop
  config/constants.js   GRID, TILE, heights, MAX_FLOORS, house geometry H{}
  core/
    engine.js           renderer, scene, worldGroup, both cameras, lights, orbit/zoom/resize
    animation.js        drop-in landing system (dropAnims, animateDrop, tickDropAnims)
  geometry/shapes.js    roundedSlab, roundedBox, castReceive, disposeGroup
  materials/materials.js shared material palette M{}
  world/
    state.js            world[x][z] + cellMeshes (source of truth), tilePos
    adjacency.js        getFenceNeighbors, bfsHouseCluster
    render.js           renderCellTile/Object + setCell (the orchestrator)
  factories/
    tile.js, nature.js (tree/crop/tuft), fence.js
    house/ parts.js, plans.js, builder.js, cluster.js
  effects/smoke.js      chimney smoke particles
  input/
    tools.js            TOOLS palette, toolbar UI, applyTool
    controls.js         pointer/keyboard/wheel, hover indicator, buttons
  scenes/initialScene.js  starting layout + loadInitialScene/clearScene
```

**Import discipline (no cycles):** dependencies flow one way — `constants` → `state`/`geometry`/`materials` → `factories` → `world/render` → `scenes`/`input` → `main`. `engine.js` has no internal imports and is the shared scene root. Keep new modules pointing *down* this chain. `engine.js` exports `camera` as a **live binding** reassigned by `togglePerspective()`; importers (render loop, raycaster) see the swap automatically — don't cache it in a local.

## Architecture

The app separates **world intent** (data) from **rendered meshes**, and rebuilds meshes from data + neighbor context. Key layers:

1. **World state** (`src/world/state.js`) — `world[x][z] = { terrain, kind, floors }` over an 8×8 grid (`GRID`). `terrain` ∈ grass/path/dirt/water; `kind` ∈ null/tree/tuft/crop/fence/house; `floors` 1–3 for houses. This is the source of truth.
2. **Rendered meshes** — `cellMeshes['x,z'] = { tile, object }` holds the actual Three.js groups. Objects are **rebuilt** from world state, not mutated, so adjacency-aware kinds (fences, houses) re-render correctly when a neighbor changes.
3. **`setCell(x, z, opts)`** (`src/world/render.js`) is the central mutation entry point. It updates `world`, then computes a **refresh set** — the changed cell, its 4 neighbors, and every house connected via BFS — and re-renders each. This is why placing one house can re-shape an adjacent cluster.

### House clustering (the most complex subsystem)

Houses are the reason the refresh/rebuild design exists. Adjacent `house` cells merge into a single structure whose shape is detected at render time:

- `findHouseCluster(x, z)` classifies a cell's cluster as **linear** (1×N run), **square** (solid 2×2), **composite** (a main run + single-cell perpendicular branches → L/T/+ shapes), or **solo**.
- Only the cluster's **anchor cell** renders the merged mesh (`isAnchor`); other cells in the cluster render nothing (`renderCellObject` early-returns).
- `buildHouse` is the shared assembler: it takes a "plan" (array of per-cell `{ face, chimneyOffset }`) plus orientation/floors/overhang options and emits geometry from the `Parts` primitives (`walls`, `gable`, `pitchedRoof`, `hippedRoof`, `door`, `window`, `chimney`, `step`, `externalStairs`, `upperDoor`). Square houses use `buildSquareHouse` (hipped roof); composites use `buildCompositeHouse` (main wing + wings).
- Clicking the **House tool on an existing house adds a floor** (up to `MAX_FLOORS`); floors propagate to all cells in the cluster.
- Geometry constants live in `H` (`WALL_W`, `WALL_H`, `PEAK_Y`, etc.). Roof/wing overhang and `suppressBackGable` opts exist specifically to avoid z-fighting where wings meet the main wing.

### Other factories

`makeTile`, `makeTree`, `makeFence` (neighbor-aware: drops shared corner posts and rails along merged sides via `getFenceNeighbors`), `makeCrop`, `makeTuft`. Geometry helpers `roundedSlab` / `roundedBox` produce the soft low-poly look. Materials are centralized in `M` and use `MeshLambertMaterial` deliberately (flat diffuse, not PBR) for the stylized aesthetic.

### Rendering & interaction

- **Two cameras** (`orthoCam` + `persCam`) share orbit state (`azimuth`, `polar`, `viewSize`); `togglePerspective` swaps `camera` and `updateCamera` recomputes position on an orbit sphere.
- **Input:** pointer drag = orbit (distinguished from click via `DRAG_THRESHOLD`), click = place/erase via `applyTool`, wheel = zoom (`viewSize`). `pickTile` raycasts into `worldGroup` and walks up parents to find the `gx/gz` userData. Keyboard `1`–`9`/`E` select tools; `R` reset, `C` clear, `P`/`I` perspective.
- **Animation loop** (`animate`): drives drop-in landing animations (`dropAnims` / `animateDrop` / `tickDropAnims`), tree sway / crop bob / tuft wiggle, and chimney smoke particles (`spawnSmoke`/`updateSmoke`, using each house's `userData.chimneyTops`). Objects mid-landing set `userData.landing` so idle animations yield.

## Conventions when editing

- **Rebuild, don't mutate, meshes.** To change what's on a cell, update `world` and call `setCell` / `renderCellObject` — never hand-edit an existing mesh in place. This keeps adjacency logic correct.
- **Coordinate frames matter.** Each `Parts.*` primitive documents its origin convention (ground-level vs. centre, which axis the outer face points along). Houses are built in a canonical `z`-orientation then rotated for `x`; chimney tops are transformed to match. Respect these when adding parts.
- **Adding a new tool/object** = add an entry to `TOOLS` (`src/input/tools.js`) + a factory in `src/factories/` + a branch in `renderCellObject` (`src/world/render.js`). If it needs idle motion, tag `userData.kind` and handle it in the loop in `main.js`.
- **New house shapes** = add a detector (like `trySquare`/`tryComposite` in `src/factories/house/cluster.js`) + a plan (`plans.js`) / assembler path (`builder.js`), then wire it in `findHouseCluster` → `renderCellObject`; the rest of the pipeline is shared.
- **New starting maps** live in `src/scenes/`; keep authoring data there, not in render/world.
- Dispose geometry on removal via `disposeGroup` to avoid leaks when re-rendering.
