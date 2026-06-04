/* =====================================================================
   Aris — world state (source of truth)
   world[x][z] stores intent: terrain + the kind of object on it (string or
   null) + floors. cellMeshes['x,z'] stores the rendered meshes (tile + object);
   the object mesh is rebuilt from world state + neighbor context, so
   adjacency-aware kinds (fences, houses) re-render when a neighbor changes.

   This module is dependency-light on purpose (constants + THREE only) so any
   layer can read state without creating import cycles.
   ===================================================================== */

import { GRID } from '../config/constants.js';

export const world = [];
export const cellMeshes = {}; // 'x,z' -> { tile, object }

// Cell shape (frozen contract, read by all verticals):
//   { terrain, kind, level, hp, maxHp }
// terrain: 'rock_mars'|'dust'|'crater'|'iron_deposit'|'crystal_deposit'
// kind:    null|'base'|'tower'|'wall'|'mine'|'reactor'|'hydroponics'
// `floors` is retained for legacy world-builder kinds (house/etc.).
export function fillWorld(make = () => ({ terrain: 'rock_mars', kind: null, level: 0, hp: 0, maxHp: 0, floors: 1 })) {
  for (let x = 0; x < GRID; x++) {
    world[x] = world[x] || [];
    for (let z = 0; z < GRID; z++) world[x][z] = make(x, z);
  }
}
fillWorld();

// World-space centre of a grid cell.
export function tilePos(x, z) {
  return new THREE.Vector3(x - GRID / 2 + 0.5, 0, z - GRID / 2 + 0.5);
}
