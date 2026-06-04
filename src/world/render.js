/* =====================================================================
   Aris — render orchestrator (Defensa de la Colonia Marciana). Dueño: JONATHAN.
   Puente world state → mallas Three.js. setCell() es el único punto de mutación.
   Kinds: base (2×2, solo el ancla renderiza) | tower | wall | mine | reactor |
   hydroponics. damageStructure(x,z,dmg) es el helper que Julian usa para muros.
   ===================================================================== */

import { GRID, TILE, TOP_H } from '../config/constants.js';
import { world, cellMeshes, tilePos } from './state.js';
import { worldGroup } from '../core/engine.js';
import { animateDrop, easeOutCubic, easeOutBack } from '../core/animation.js';
import { disposeGroup } from '../geometry/shapes.js';
import { makeTile } from '../factories/tile.js';
import { makeBase } from '../factories/base.js';
import { makeTower } from '../factories/tower.js';
import { makeWall } from '../factories/wall.js';
import { makeMine } from '../factories/mine.js';
import { makeReactor } from '../factories/reactor.js';
import { makeHydroponics } from '../factories/hydroponics.js';
import { maxHpFor } from '../config/structures.js';

// -------- tile renderer --------
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

// La Base ocupa 2×2; el ancla es la esquina (min x, min z) del bloque.
function isBase(x, z) {
  return x >= 0 && x < GRID && z >= 0 && z < GRID && world[x][z].kind === 'base';
}
function isBaseAnchor(x, z) {
  return isBase(x, z) && !isBase(x - 1, z) && !isBase(x, z - 1);
}

// -------- object renderer --------
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

  const cell = world[x][z];
  const kind = cell.kind;
  if (!kind) return;

  const level = cell.level || 0;
  let mesh = null;
  let posX = null, posZ = null;

  if (kind === 'base') {
    if (!isBaseAnchor(x, z)) return;        // solo el ancla dibuja el 2×2
    mesh = makeBase(level);
    const a = tilePos(x, z);
    posX = a.x + TILE / 2;                   // centro del bloque 2×2
    posZ = a.z + TILE / 2;
  } else if (kind === 'tower')       mesh = makeTower(level);
  else if (kind === 'wall')          mesh = makeWall(level);
  else if (kind === 'mine')          mesh = makeMine(level);
  else if (kind === 'reactor')       mesh = makeReactor(level);
  else if (kind === 'hydroponics')   mesh = makeHydroponics(level);
  else return;

  if (!mesh) return;
  if (posX === null) {
    const p = tilePos(x, z);
    posX = p.x; posZ = p.z;
  }
  mesh.position.set(posX, TOP_H, posZ);
  mesh.userData.gx = x;
  mesh.userData.gz = z;
  mesh.userData.baseY = TOP_H;
  worldGroup.add(mesh);
  entry.object = mesh;
  if (animate) animateDrop(mesh, 2.0, 0.5, delay, easeOutBack);
}

// -------- setCell: punto único de mutación --------
export function setCell(x, z, opts) {
  const prev = world[x][z] || { terrain: 'rock_mars', kind: null, level: 0, hp: 0, maxHp: 0 };
  const terrain = opts.terrain !== undefined ? opts.terrain : prev.terrain;
  const kind = opts.kind !== undefined ? (opts.kind || null) : prev.kind;
  const kindChanged = (prev.kind || null) !== (kind || null);
  const level = opts.level !== undefined ? opts.level
              : (kindChanged ? 0 : (prev.level || 0));

  // HP: al colocar o subir nivel, recalcular desde STRUCT (muros/base).
  let hp = prev.hp, maxHp = prev.maxHp;
  if (opts.kind !== undefined || opts.level !== undefined) {
    maxHp = maxHpFor(kind, level);
    hp = maxHp;
  }

  const terrainChanged = prev.terrain !== terrain;
  world[x][z] = { terrain, kind, level, hp, maxHp };

  if (terrainChanged || opts.forceTile) {
    renderCellTile(x, z, { animate: opts.animate !== false, delay: opts.tileDelay || 0 });
  }

  // Refrescar la celda + 4 vecinas (para resolver el ancla de la base).
  const cells = [[x, z], [x - 1, z], [x + 1, z], [x, z - 1], [x, z + 1]];
  for (const [cx, cz] of cells) {
    if (cx < 0 || cx >= GRID || cz < 0 || cz >= GRID) continue;
    const isPrimary = cx === x && cz === z;
    renderCellObject(cx, cz, {
      animate: opts.animate !== false && isPrimary,
      delay: isPrimary ? (opts.objectDelay || 0) : 0,
    });
  }
}

// -------- contrato 3.6: daño a estructuras (lo usa Julian para muros) --------
export function damageStructure(x, z, dmg) {
  const c = world[x][z];
  if (!c || !c.kind || c.kind === 'base') return; // la base se daña vía resources.damageBase
  c.hp -= dmg;
  if (c.hp <= 0) setCell(x, z, { terrain: c.terrain, kind: null });
}
