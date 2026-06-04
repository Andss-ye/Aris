/* =====================================================================
   Aris — house cluster topology detection
   Classifies a connected group of 'house' cells into the silhouette the
   assembler should build: linear (1xN), square (2x2), composite (L/T/+ shape),
   or solo. Only the cluster's anchor cell renders the merged mesh.
   ===================================================================== */

import { GRID } from '../../config/constants.js';
import { world } from '../../world/state.js';
import { bfsHouseCluster } from '../../world/adjacency.js';

// Walk ± along x and z from (x,z) over contiguous houses. Tries linear first,
// then square, then composite (L/T-shapes), then falls back to solo. Returns:
//   { kind: 'linear',    isAnchor, length, orientation, anchorX, anchorZ }
//   { kind: 'square',    isAnchor, anchorX, anchorZ }
//   { kind: 'composite', isAnchor, anchorX, anchorZ, topology }
//   { kind: 'solo',      isAnchor: true, anchorX, anchorZ }
export function findHouseCluster(x, z) {
  let xMin = x, xMax = x;
  while (xMin > 0          && world[xMin - 1][z].kind === 'house') xMin--;
  while (xMax < GRID - 1   && world[xMax + 1][z].kind === 'house') xMax++;
  let zMin = z, zMax = z;
  while (zMin > 0          && world[x][zMin - 1].kind === 'house') zMin--;
  while (zMax < GRID - 1   && world[x][zMax + 1].kind === 'house') zMax++;
  const xLen = xMax - xMin + 1, zLen = zMax - zMin + 1;

  if (xLen > 1 && zLen === 1) {
    let pure = true;
    for (let i = xMin; i <= xMax && pure; i++) {
      if ((z > 0        && world[i][z - 1].kind === 'house') ||
          (z < GRID - 1 && world[i][z + 1].kind === 'house')) pure = false;
    }
    if (pure) return { kind: 'linear', isAnchor: x === xMin, length: xLen, orientation: 'x', anchorX: xMin, anchorZ: z };
  }
  if (zLen > 1 && xLen === 1) {
    let pure = true;
    for (let j = zMin; j <= zMax && pure; j++) {
      if ((x > 0        && world[x - 1][j].kind === 'house') ||
          (x < GRID - 1 && world[x + 1][j].kind === 'house')) pure = false;
    }
    if (pure) return { kind: 'linear', isAnchor: z === zMin, length: zLen, orientation: 'z', anchorX: x, anchorZ: zMin };
  }

  // Linear failed → try square (2x2) first, then L/T composite.
  const cluster = bfsHouseCluster(x, z);

  const square = trySquare(cluster);
  if (square) {
    return {
      kind: 'square',
      isAnchor: x === square.anchorX && z === square.anchorZ,
      anchorX: square.anchorX,
      anchorZ: square.anchorZ,
    };
  }

  const composite = tryComposite(cluster);
  if (composite) {
    return {
      kind: 'composite',
      isAnchor: x === composite.anchorX && z === composite.anchorZ,
      anchorX: composite.anchorX,
      anchorZ: composite.anchorZ,
      topology: composite,
    };
  }

  return { kind: 'solo', isAnchor: true, anchorX: x, anchorZ: z };
}

// Detect a 2x2 solid square cluster — 4 cells forming a perfect 2x2 block,
// anchored at the (xMin, zMin) corner. Returns null otherwise.
export function trySquare(cluster) {
  if (cluster.length !== 4) return null;
  const xs = cluster.map(c => c.x), zs = cluster.map(c => c.z);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const zMin = Math.min(...zs), zMax = Math.max(...zs);
  if (xMax - xMin !== 1 || zMax - zMin !== 1) return null;
  const cells = new Set(cluster.map(c => c.x + ',' + c.z));
  for (let i = xMin; i <= xMax; i++) {
    for (let j = zMin; j <= zMax; j++) {
      if (!cells.has(i + ',' + j)) return null;
    }
  }
  return { anchorX: xMin, anchorZ: zMin };
}

// Detect a "composite" topology — a long main wing plus 1+ single-cell
// perpendicular branches (L-shape, T-shape, +-shape). Returns null if the
// cluster doesn't fit this shape (e.g. solid 2x2 square, multi-cell branches).
export function tryComposite(cluster) {
  if (cluster.length < 2) return null;
  const xs = cluster.map(c => c.x), zs = cluster.map(c => c.z);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const zMin = Math.min(...zs), zMax = Math.max(...zs);

  const rowCounts = {}, colCounts = {};
  for (const c of cluster) {
    rowCounts[c.z] = (rowCounts[c.z] || 0) + 1;
    colCounts[c.x] = (colCounts[c.x] || 0) + 1;
  }
  const maxRowCount = Math.max(...Object.values(rowCounts));
  const maxColCount = Math.max(...Object.values(colCounts));

  let mainOrientation, mainAxisCoord, mainCells;
  if (maxColCount >= maxRowCount && maxColCount >= 2) {
    mainOrientation = 'z';
    let bestX = null;
    for (const x of Object.keys(colCounts).map(Number).sort((a, b) => a - b)) {
      if (colCounts[x] === maxColCount) { bestX = x; break; }
    }
    mainAxisCoord = bestX;
    mainCells = cluster.filter(c => c.x === bestX).sort((a, b) => a.z - b.z);
  } else if (maxRowCount >= 2) {
    mainOrientation = 'x';
    let bestZ = null;
    for (const z of Object.keys(rowCounts).map(Number).sort((a, b) => a - b)) {
      if (rowCounts[z] === maxRowCount) { bestZ = z; break; }
    }
    mainAxisCoord = bestZ;
    mainCells = cluster.filter(c => c.z === bestZ).sort((a, b) => a.x - b.x);
  } else {
    return null;
  }

  // Main wing must be a contiguous run.
  for (let i = 1; i < mainCells.length; i++) {
    const prev = mainCells[i - 1], cur = mainCells[i];
    if (mainOrientation === 'z' && cur.z !== prev.z + 1) return null;
    if (mainOrientation === 'x' && cur.x !== prev.x + 1) return null;
  }

  // Side cells = everything not in the main run. Each must be a single-cell
  // branch attached to a main cell with no neighbouring side cell (no L-tail
  // or 2-cell branches in this version).
  const sideCells = cluster.filter(c =>
    mainOrientation === 'z' ? c.x !== mainAxisCoord : c.z !== mainAxisCoord
  );
  const branches = [];
  for (const sc of sideCells) {
    const adjacentMain = mainCells.find(mc =>
      Math.abs(mc.x - sc.x) + Math.abs(mc.z - sc.z) === 1
    );
    if (!adjacentMain) return null;
    const adjacentSide = sideCells.find(o =>
      o !== sc && Math.abs(o.x - sc.x) + Math.abs(o.z - sc.z) === 1
    );
    if (adjacentSide) return null;
    let axis;
    if      (sc.x === adjacentMain.x + 1) axis = '+x';
    else if (sc.x === adjacentMain.x - 1) axis = '-x';
    else if (sc.z === adjacentMain.z + 1) axis = '+z';
    else                                  axis = '-z';
    branches.push({ x: sc.x, z: sc.z, axis });
  }

  // Anchor: the cluster cell with smallest (x, then z). Used so only one
  // cell renders the composite mesh; others render nothing.
  const sorted = [...cluster].sort((a, b) => a.x - b.x || a.z - b.z);
  const anchorX = sorted[0].x, anchorZ = sorted[0].z;

  return {
    mainOrientation,
    mainCells,
    branches,
    bbox: { xMin, xMax, zMin, zMax },
    anchorX,
    anchorZ,
  };
}
