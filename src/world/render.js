/* =====================================================================
   Aris — render orchestrator
   Bridges world state → Three.js meshes. setCell() is the single mutation
   entry point: it updates world[], computes the refresh set (the changed cell,
   its 4 neighbours, and every connected house), and rebuilds each affected
   cell's mesh. Adjacency-aware kinds re-render correctly as a result.
   ===================================================================== */

import { GRID, TILE, TOP_H } from '../config/constants.js';
import { world, cellMeshes, tilePos } from './state.js';
import { worldGroup } from '../core/engine.js';
import { animateDrop, easeOutCubic, easeOutBack } from '../core/animation.js';
import { disposeGroup } from '../geometry/shapes.js';
import { makeTile } from '../factories/tile.js';
import { makeTree, makeCrop, makeTuft } from '../factories/nature.js';
import { makeFence } from '../factories/fence.js';
import { makeHouse, makeStretchedHouse, buildCompositeHouse, buildSquareHouse } from '../factories/house/builder.js';
import { findHouseCluster } from '../factories/house/cluster.js';
import { getFenceNeighbors, bfsHouseCluster } from './adjacency.js';

// -------- low-level renderers (build the actual meshes from world state) --------
export function renderCellTile(x, z, opts) {
  const { animate = true, delay = 0 } = opts || {};
  const key = x + ',' + z;
  let entry = cellMeshes[key];
  if (!entry) entry = cellMeshes[key] = { tile: null, object: null };
  if (entry.tile) {
    worldGroup.remove(entry.tile);
    disposeGroup(entry.tile);
  }
  const tile = makeTile(world[x][z].terrain);
  const p = tilePos(x, z);
  tile.position.copy(p);
  tile.userData.gx = x;
  tile.userData.gz = z;
  worldGroup.add(tile);
  entry.tile = tile;
  if (animate) animateDrop(tile, 2.4, 0.42, delay, easeOutCubic);
}

export function renderCellObject(x, z, opts) {
  const { animate = false, delay = 0 } = opts || {};
  const key = x + ',' + z;
  let entry = cellMeshes[key];
  if (!entry) entry = cellMeshes[key] = { tile: null, object: null };
  if (entry.object) {
    worldGroup.remove(entry.object);
    disposeGroup(entry.object);
    entry.object = null;
  }

  const kind = world[x][z].kind;
  if (!kind) return;

  let mesh = null;
  let posX = null, posZ = null;
  let setGridUserData = true;

  if      (kind === 'tree')  mesh = makeTree();
  else if (kind === 'tuft')  mesh = makeTuft();
  else if (kind === 'crop')  mesh = makeCrop();
  else if (kind === 'fence') mesh = makeFence(getFenceNeighbors(x, z));
  else if (kind === 'house') {
    const cluster = findHouseCluster(x, z);
    if (!cluster.isAnchor) return;          // non-anchor cluster cells render nothing
    const floors = world[x][z].floors || 1;
    if (cluster.kind === 'solo') {
      mesh = makeHouse(floors);
    } else if (cluster.kind === 'linear') {
      mesh = makeStretchedHouse(cluster.length, cluster.orientation, floors);
      // Position at cluster CENTRE (not the anchor cell), so the visible house
      // spans the run cleanly. Skip gx/gz so pickTile falls through to whichever
      // tile is actually under the cursor.
      const a = tilePos(cluster.anchorX, cluster.anchorZ);
      posX = a.x; posZ = a.z;
      if (cluster.orientation === 'x') posX += (cluster.length - 1) * TILE / 2;
      else                              posZ += (cluster.length - 1) * TILE / 2;
      setGridUserData = false;
    } else if (cluster.kind === 'composite') {
      mesh = buildCompositeHouse(cluster.topology, floors);
      // Position at cluster bounding-box centre so wings fall in place.
      const t = cluster.topology;
      posX = (t.bbox.xMin + t.bbox.xMax) / 2 - GRID / 2 + 0.5;
      posZ = (t.bbox.zMin + t.bbox.zMax) / 2 - GRID / 2 + 0.5;
      setGridUserData = false;
    } else if (cluster.kind === 'square') {
      mesh = buildSquareHouse(floors);
      // Centre the 2x2 mesh between the four cells.
      posX = (cluster.anchorX + 0.5) - GRID / 2 + 0.5;
      posZ = (cluster.anchorZ + 0.5) - GRID / 2 + 0.5;
      setGridUserData = false;
    }
  } else return;

  if (!mesh) return;
  if (posX === null) {
    const p = tilePos(x, z);
    posX = p.x; posZ = p.z;
  }
  mesh.position.set(posX, TOP_H, posZ);
  if (setGridUserData) {
    mesh.userData.gx = x;
    mesh.userData.gz = z;
  }
  mesh.userData.baseY = TOP_H;
  worldGroup.add(mesh);
  entry.object = mesh;
  if (animate) animateDrop(mesh, 2.0, 0.5, delay, easeOutBack);
}

// Central mutation entry point. Updates world state, then re-renders every cell
// whose mesh might change as a result of this edit.
export function setCell(x, z, opts) {
  const { terrain, kind = null, floors, tileDelay = 0, objectDelay = 0, animate = true, forceTile = false } = opts;
  const prev = world[x][z] || { terrain: null, kind: null, floors: 1 };
  const terrainChanged = prev.terrain !== terrain;
  const kindChanged    = (prev.kind || null) !== (kind || null);
  // floors default: when placing a fresh kind, start at 1; when preserving the
  // same kind without specifying, keep the previous value.
  const newFloors = (floors !== undefined) ? floors
                  : (kindChanged ? 1 : (prev.floors || 1));
  const floorsChanged = (prev.floors || 1) !== newFloors;
  world[x][z] = { terrain, kind: kind || null, floors: newFloors };

  // For house clusters, every cell shares the floors count. Propagate to all.
  if (kind === 'house' && floorsChanged) {
    for (const c of bfsHouseCluster(x, z)) {
      if (c.x !== x || c.z !== z) world[c.x][c.z].floors = newFloors;
    }
  }

  if (terrainChanged || forceTile) {
    renderCellTile(x, z, { animate, delay: tileDelay });
  }
  if (!kindChanged && !floorsChanged) return;

  // The "primary" cell is whichever cell's mesh visually represents the change.
  // For house placements that join/extend a cluster, that's the cluster anchor —
  // not the click cell, since the click cell may render nothing.
  let primaryX = x, primaryZ = z;
  if (kind === 'house') {
    const c = findHouseCluster(x, z);
    primaryX = c.anchorX; primaryZ = c.anchorZ;
  }

  // Collect every cell whose rendered mesh might need to change: this cell,
  // its 4 neighbours, AND every house connected to those (so a cluster split
  // across multiple cells refreshes correctly).
  const toRefresh = new Map();
  toRefresh.set(x + ',' + z, { x, z });
  if (world[x][z].kind === 'house') {
    for (const c of bfsHouseCluster(x, z)) toRefresh.set(c.x + ',' + c.z, c);
  }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, nz = z + dz;
    if (nx < 0 || nx >= GRID || nz < 0 || nz >= GRID) continue;
    const nk = world[nx][nz].kind;
    if (nk === 'fence') {
      toRefresh.set(nx + ',' + nz, { x: nx, z: nz });
    } else if (nk === 'house') {
      for (const c of bfsHouseCluster(nx, nz)) toRefresh.set(c.x + ',' + c.z, c);
    }
  }

  for (const c of toRefresh.values()) {
    const isPrimary = c.x === primaryX && c.z === primaryZ;
    renderCellObject(c.x, c.z, {
      animate: animate && isPrimary,
      delay:   isPrimary ? objectDelay : 0,
    });
  }
}
