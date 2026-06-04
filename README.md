# Aris

A browser-based isometric **tile/world builder** game, rendered with Three.js (r128).
Place terrain and objects on a grid, stack houses into floors, watch neighbouring
houses and fences merge into larger structures, orbit and zoom the little world.

Built as **native ES modules** (no bundler, no install step) so it stays easy to
iterate on incrementally.

## Quick start

ES modules require an HTTP origin — opening the file directly (`file://`) won't work.

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000/
```

Any static server works (`npx serve`, VS Code Live Server, etc.). Edits to any
file under `src/` or `styles/` take effect on reload — there is nothing to build.

## Controls

- **Click** a tile to place the active tool · **drag** to orbit · **scroll** to zoom
- Tools `1`–`9`, eraser `E` · `R` reset · `C` clear · `P` toggle perspective
- Click the **House** tool on an existing house to add a floor (up to 3)

## Project structure

```
index.html              entry point (loads THREE from CDN + src/main.js)
styles/main.css         all UI styling
src/
  main.js               boot + animation loop
  config/               tunable constants
  core/                 engine (renderer/scene/cameras) + animation system
  geometry/             reusable rounded primitives
  materials/            shared material palette
  world/                state (source of truth), adjacency, render orchestrator
  factories/            tile, nature, fence, and the house subsystem
  effects/              chimney smoke
  input/                tools palette + pointer/keyboard controls
  scenes/               starting layouts
main.html               legacy single-file snapshot (pre-modularization)
```

See **CLAUDE.md** for the architecture deep-dive (the data→mesh rebuild model,
house clustering, coordinate conventions, and the import dependency rules).

## Extending

- **New object/tool:** add to `TOOLS` (`src/input/tools.js`) → a factory in
  `src/factories/` → a branch in `renderCellObject` (`src/world/render.js`).
- **New house silhouette:** add a detector in `src/factories/house/cluster.js`
  plus a plan/assembler in `house/plans.js` / `house/builder.js`.
- **New starting map:** add a scene module under `src/scenes/`.

## Tech

- Three.js **r128** via CDN, used as a global `THREE` (classic script).
- No dependencies, no package.json — pure ES modules.
- Quick syntax check: `find src -name '*.js' | xargs -I{} node --check {}`
