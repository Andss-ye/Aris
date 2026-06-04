/* =====================================================================
   Aris — escena inicial: colonia marciana. Dueño: JONATHAN.
   Terreno rock_mars por defecto, Base Principal 2×2 al centro, depósitos de
   hierro/cristal dispersos, algo de polvo y cráteres. clearScene → todo roca.
   ===================================================================== */

import { GRID } from '../config/constants.js';
import { world, cellMeshes } from '../world/state.js';
import { worldGroup } from '../core/engine.js';
import { dropAnims } from '../core/animation.js';
import { disposeGroup } from '../geometry/shapes.js';
import { setCell } from '../world/render.js';

// Ancla del bloque 2×2 de la Base (cubre 7,7 · 8,7 · 7,8 · 8,8 en grid 16).
const BASE_ANCHOR = { x: GRID / 2 - 1, z: GRID / 2 - 1 };

function isBaseCell(x, z) {
  return (x === BASE_ANCHOR.x || x === BASE_ANCHOR.x + 1) &&
         (z === BASE_ANCHOR.z || z === BASE_ANCHOR.z + 1);
}

export function loadInitialScene() {
  // Limpiar mallas + estado de animación para que un Reset re-anime.
  for (const key in cellMeshes) {
    const e = cellMeshes[key];
    if (e.tile) { worldGroup.remove(e.tile); disposeGroup(e.tile); }
    if (e.object) { worldGroup.remove(e.object); disposeGroup(e.object); }
  }
  for (const k of Object.keys(cellMeshes)) delete cellMeshes[k];
  // terrain:null (no 'rock_mars') para que el primer setCell siempre dispare el
  // render del tile (setCell solo redibuja si el terreno cambió).
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < GRID; z++)
      world[x][z] = { terrain: null, kind: null, level: 0, hp: 0, maxHp: 0 };
  dropAnims.length = 0;

  // Terreno: roca por defecto + depósitos/decoración dispersos (fijos para reproducibilidad).
  const layout = {};
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < GRID; z++)
      layout[x + ',' + z] = { terrain: 'rock_mars', kind: null };

  const iron = [[2, 3], [12, 4], [4, 12], [13, 11], [6, 1]];
  const crystal = [[3, 13], [11, 13], [1, 9], [14, 7]];
  const dust = [[5, 5], [5, 6], [6, 5], [9, 10], [10, 10], [10, 9], [2, 7], [13, 2]];
  const crater = [[0, 0], [15, 15], [0, 15], [8, 2], [7, 13]];

  for (const [x, z] of iron) if (!isBaseCell(x, z)) layout[x + ',' + z].terrain = 'iron_deposit';
  for (const [x, z] of crystal) if (!isBaseCell(x, z)) layout[x + ',' + z].terrain = 'crystal_deposit';
  for (const [x, z] of dust) if (!isBaseCell(x, z)) layout[x + ',' + z].terrain = 'dust';
  for (const [x, z] of crater) if (!isBaseCell(x, z)) layout[x + ',' + z].terrain = 'crater';

  // Base Principal 2×2 al centro.
  for (let dx = 0; dx < 2; dx++)
    for (let dz = 0; dz < 2; dz++)
      layout[(BASE_ANCHOR.x + dx) + ',' + (BASE_ANCHOR.z + dz)].kind = 'base';

  // Barrido diagonal: pequeñas (x+z) aterrizan primero.
  const TILE_STAGGER = 0.025;
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

// Limpia el tablero a roca marciana (mantiene la base).
export function clearScene() {
  const TILE_STAGGER = 0.02;
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < GRID; z++) {
      if (isBaseCell(x, z)) continue;
      setCell(x, z, {
        terrain: 'rock_mars',
        kind: null,
        tileDelay: (x + z) * TILE_STAGGER,
        forceTile: true,
      });
    }
}
