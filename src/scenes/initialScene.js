/* =====================================================================
   Aris — initial Mars colony scene
   16x16 board of Martian rock with dust patches, a couple of craters, the
   2x2 command Base centred on the grid, and scattered iron/crystal deposits
   for mines/reactors. doClear() resets to bare Martian rock.
   ===================================================================== */

import { GRID } from '../config/constants.js';
import { world, cellMeshes } from '../world/state.js';
import { worldGroup } from '../core/engine.js';
import { dropAnims } from '../core/animation.js';
import { disposeGroup } from '../geometry/shapes.js';
import { setCell, placeBase } from '../world/render.js';

// Deterministic layout so deposits never collide with the central base.
const DUST   = ['5,9', '6,9', '5,10', '6,10', '10,6', '11,6', '10,5', '9,11'];
const CRATER = ['2,5', '13,11', '4,13'];
const IRON   = ['3,3', '12,3', '3,12', '12,12'];
const CRYSTAL = ['8,2', '8,13', '2,8', '13,8'];

export function loadInitialScene() {
  // Wipe any existing meshes + animation state so a Reset re-plays the drop.
  for (const key in cellMeshes) {
    const e = cellMeshes[key];
    if (e.tile) { worldGroup.remove(e.tile); disposeGroup(e.tile); }
    if (e.object) { worldGroup.remove(e.object); disposeGroup(e.object); }
  }
  for (const k of Object.keys(cellMeshes)) delete cellMeshes[k];
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < GRID; z++)
      world[x][z] = { terrain: null, kind: null, level: 0, hp: 0, maxHp: 0, floors: 1 };
  dropAnims.length = 0;

  // Per-cell terrain only (structures placed after). rock_mars by default.
  const terrainAt = (x, z) => {
    const key = x + ',' + z;
    if (IRON.includes(key))    return 'iron_deposit';
    if (CRYSTAL.includes(key)) return 'crystal_deposit';
    if (CRATER.includes(key))  return 'crater';
    if (DUST.includes(key))    return 'dust';
    return 'rock_mars';
  };

  // Diagonal sweep — small (x+z) lands first, far corner lands last.
  const TILE_STAGGER = 0.03;
  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      setCell(x, z, {
        terrain: terrainAt(x, z),
        kind: null,
        tileDelay: (x + z) * TILE_STAGGER,
      });
    }
  }

  // Central 2x2 command base — anchor (7,7) centres it on the 16x16 grid.
  placeBase(7, 7, 0);
}

// Clear the board to bare Martian rock with a quick staggered tile re-drop.
export function clearScene() {
  const TILE_STAGGER = 0.02;
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < GRID; z++)
      setCell(x, z, {
        terrain: 'rock_mars',
        kind: null,
        tileDelay: (x + z) * TILE_STAGGER,
        forceTile: true,
      });
}
