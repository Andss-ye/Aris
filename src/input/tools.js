/* =====================================================================
   Aris — tool palette + placement logic (Mars colony)
   Owns the available tools, the toolbar UI, the current selection, and
   applyTool() which maps a click on a cell to a world mutation.
   Structures: click to place (level 0), click again on the same kind to
   upgrade (level +1). Mine/Reactor require their deposit tile.
   ===================================================================== */

import { GRID } from '../config/constants.js';
import { world } from '../world/state.js';
import { setCell, placeBase } from '../world/render.js';
import { STRUCT } from '../config/structures.js';

export const TOOLS = [
  { id: 'base',    label: 'Base',    kind: 'base',    color: '#cdd3d8' },
  { id: 'tower',   label: 'Torre',   kind: 'tower',   color: '#46e0ff' },
  { id: 'wall',    label: 'Muro',    kind: 'wall',    color: '#7e8893' },
  { id: 'mine',    label: 'Mina',    kind: 'mine',    requiresTerrain: 'iron_deposit',    color: '#ffb020' },
  { id: 'reactor', label: 'Reactor', kind: 'reactor', requiresTerrain: 'crystal_deposit', color: '#36c8ff' },
  { id: 'hydro',   label: 'Hidro',   kind: 'hydroponics', color: '#4fe06a' },
  { id: 'fe',      label: 'Dep. Fe', terrain: 'iron_deposit',    color: '#9aa1a8' },
  { id: 'cy',      label: 'Dep. Cy', terrain: 'crystal_deposit', color: '#7d5fe6' },
  { id: 'rock',    label: 'Roca',    terrain: 'rock_mars',       color: '#b24a26' },
  { id: 'erase',   label: 'Borrar',  erase: true, color: 'transparent', eraser: true },
];

let selectedTool = TOOLS[1]; // start on Torre
const listeners = [];

export function getSelectedTool() { return selectedTool; }

// Register a callback fired whenever the selected tool changes (e.g. to update
// the hover indicator material).
export function onToolChange(fn) { listeners.push(fn); }

export function buildToolbar() {
  const bar = document.getElementById('toolbar');
  bar.innerHTML = '';
  TOOLS.forEach((t, i) => {
    const btn = document.createElement('button');
    btn.className = 'tool';
    btn.dataset.id = t.id;
    const swatch = document.createElement('div');
    swatch.className = 'swatch' + (t.eraser ? ' eraser' : '');
    if (!t.eraser) swatch.style.background = t.color;
    btn.appendChild(swatch);
    const lbl = document.createElement('span');
    lbl.textContent = t.label;
    btn.appendChild(lbl);
    const k = document.createElement('kbd');
    k.textContent = i < 9 ? String(i + 1) : 'E';
    btn.appendChild(k);
    btn.addEventListener('click', () => selectTool(t));
    if (t === selectedTool) btn.classList.add('active');
    bar.appendChild(btn);
  });
}

export function selectTool(t) {
  selectedTool = t;
  document.querySelectorAll('.tool').forEach(b => {
    b.classList.toggle('active', b.dataset.id === t.id);
  });
  for (const fn of listeners) fn(t);
}

// Crater is not buildable (per idea.md); everything else is.
function isBuildable(terrain) {
  return terrain !== 'crater';
}

// Clear a 2x2 base by resolving its anchor from any of the four cells.
function clearBase(x, z) {
  const ax = (x > 0 && world[x - 1][z].kind === 'base') ? x - 1 : x;
  const az = (z > 0 && world[x][z - 1].kind === 'base') ? z - 1 : z;
  for (let dx = 0; dx < 2; dx++) {
    for (let dz = 0; dz < 2; dz++) {
      const cx = ax + dx, cz = az + dz;
      if (cx < GRID && cz < GRID && world[cx][cz].kind === 'base') {
        setCell(cx, cz, { terrain: world[cx][cz].terrain, kind: null });
      }
    }
  }
}

// Map a click on cell (x,z) to a world mutation based on the active tool.
export function applyTool(x, z) {
  const cell = world[x][z];

  // -------- erase --------
  if (selectedTool.erase) {
    if (cell.kind === 'base') { clearBase(x, z); return; }
    if (cell.kind) { setCell(x, z, { terrain: cell.terrain, kind: null }); return; }
    if (cell.terrain !== 'rock_mars') setCell(x, z, { terrain: 'rock_mars', kind: null });
    return;
  }

  // -------- terrain brushes --------
  if (selectedTool.terrain) {
    if (cell.kind === 'base') return;          // don't repaint under the base
    setCell(x, z, { terrain: selectedTool.terrain, kind: cell.kind, level: cell.level });
    return;
  }

  // -------- base (2x2) --------
  if (selectedTool.kind === 'base') {
    const ax = Math.min(x, GRID - 2);
    const az = Math.min(z, GRID - 2);
    // every one of the four cells must be empty and buildable
    for (let dx = 0; dx < 2; dx++) {
      for (let dz = 0; dz < 2; dz++) {
        const c = world[ax + dx][az + dz];
        if (c.kind || !isBuildable(c.terrain)) return;
      }
    }
    placeBase(ax, az, 0);
    return;
  }

  // -------- single-cell structures --------
  if (selectedTool.kind) {
    // clicking the same kind upgrades it (level +1, capped at max)
    if (cell.kind === selectedTool.kind) {
      const def = STRUCT[cell.kind];
      const maxLevel = (def ? def.levels.length : 1) - 1;
      const next = Math.min((cell.level || 0) + 1, maxLevel);
      if (next === (cell.level || 0)) return;
      setCell(x, z, { terrain: cell.terrain, kind: cell.kind, level: next });
      return;
    }
    // no overbuilding: never place on a cell that already holds a structure
    if (cell.kind) return;
    if (!isBuildable(cell.terrain)) return;                  // crater not buildable
    // mine/reactor only work on their deposit tile
    if (selectedTool.requiresTerrain && cell.terrain !== selectedTool.requiresTerrain) return;
    setCell(x, z, { terrain: cell.terrain, kind: selectedTool.kind, level: 0 });
  }
}
