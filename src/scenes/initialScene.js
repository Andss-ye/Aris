/* =====================================================================
   Aris — initial / demo scene
   Defines the starting layout and the staggered "drop-in" load animation.
   This is the place to author new starting maps; gameplay logic stays in the
   world/render layer. doClear() resets the board to bare grass.
   ===================================================================== */

import { GRID } from '../config/constants.js';
import { world, cellMeshes } from '../world/state.js';
import { worldGroup } from '../core/engine.js';
import { dropAnims } from '../core/animation.js';
import { disposeGroup } from '../geometry/shapes.js';
import { setCell } from '../world/render.js';

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
      world[x][z] = { terrain: null, kind: null, floors: 1 };
  dropAnims.length = 0;

  // Build the layout in one shot so each cell only animates once.
  const layout = {};
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < GRID; z++)
      layout[x + ',' + z] = { terrain: 'grass', kind: null };

  layout['2,3'] = { terrain: 'grass', kind: 'house' };
  for (let z = 4; z < GRID; z++) layout['2,' + z] = { terrain: 'path', kind: null };
  layout['0,5'] = { terrain: 'grass', kind: 'tree' };
  layout['5,1'] = { terrain: 'grass', kind: 'tree' };
  for (let cx = 5; cx <= 6; cx++)
    for (let cz = 4; cz <= 5; cz++)
      layout[cx + ',' + cz] = { terrain: 'dirt', kind: 'crop' };
  layout['4,4'] = { terrain: 'grass', kind: 'fence' };
  layout['4,5'] = { terrain: 'grass', kind: 'fence' };
  layout['5,3'] = { terrain: 'grass', kind: 'fence' };
  layout['6,3'] = { terrain: 'grass', kind: 'fence' };
  layout['1,6'] = { terrain: 'grass', kind: 'tuft' };
  layout['4,6'] = { terrain: 'grass', kind: 'tuft' };
  layout['0,2'] = { terrain: 'grass', kind: 'tuft' };
  layout['6,7'] = { terrain: 'grass', kind: 'tuft' };

  // Diagonal sweep — small (x+z) lands first, far corner lands last.
  // Objects land slightly after their tile so it feels like layers stacking.
  const TILE_STAGGER = 0.035;
  const OBJECT_OFFSET = 0.22;
  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      const cell = layout[x + ',' + z];
      const baseDelay = (x + z) * TILE_STAGGER;
      setCell(x, z, {
        terrain: cell.terrain,
        kind: cell.kind,
        tileDelay: baseDelay,
        objectDelay: baseDelay + OBJECT_OFFSET,
      });
    }
  }
}

// Clear the board to bare grass with a quick staggered tile re-drop.
export function clearScene() {
  const TILE_STAGGER = 0.022;
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < GRID; z++)
      setCell(x, z, {
        terrain: 'grass',
        kind: null,
        tileDelay: (x + z) * TILE_STAGGER,
        forceTile: true,
      });
}
