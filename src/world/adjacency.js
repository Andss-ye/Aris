/* =====================================================================
   Aris — adjacency helpers
   Neighbour queries over the world grid, used by adjacency-aware kinds
   (fences) and by the house clustering logic.
   ===================================================================== */

import { GRID } from '../config/constants.js';
import { world } from './state.js';

export function getFenceNeighbors(x, z) {
  return {
    n: z > 0          && world[x][z - 1].kind === 'fence',
    s: z < GRID - 1   && world[x][z + 1].kind === 'fence',
    e: x < GRID - 1   && world[x + 1][z].kind === 'fence',
    w: x > 0          && world[x - 1][z].kind === 'fence',
  };
}

// 4-neighbour flood fill over connected houses, used to find every cell
// potentially affected when a placement adds/removes a connection.
export function bfsHouseCluster(x, z) {
  const result = [];
  const seen = new Set();
  const queue = [{ x, z }];
  while (queue.length) {
    const c = queue.shift();
    const k = c.x + ',' + c.z;
    if (seen.has(k)) continue;
    seen.add(k);
    if (c.x < 0 || c.x >= GRID || c.z < 0 || c.z >= GRID) continue;
    if (world[c.x][c.z].kind !== 'house') continue;
    result.push(c);
    queue.push({ x: c.x + 1, z: c.z });
    queue.push({ x: c.x - 1, z: c.z });
    queue.push({ x: c.x, z: c.z + 1 });
    queue.push({ x: c.x, z: c.z - 1 });
  }
  return result;
}
