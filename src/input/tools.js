/* =====================================================================
   Aris — tool palette + placement logic
   Owns the available tools, the toolbar UI, the current selection, and
   applyTool() which maps a click on a cell to a world mutation. Extend the
   game by adding entries to TOOLS (+ a matching factory/kind).
   ===================================================================== */

import { MAX_FLOORS } from '../config/constants.js';
import { world } from '../world/state.js';
import { setCell } from '../world/render.js';

export const TOOLS = [
  { id: 'grass',  label: 'Grass',  terrain: 'grass', color: '#9ec74b' },
  { id: 'path',   label: 'Path',   terrain: 'path',  color: '#e8d5a8' },
  { id: 'dirt',   label: 'Dirt',   terrain: 'dirt',  color: '#5a3b27' },
  { id: 'water',  label: 'Water',  terrain: 'water', color: '#4a90c2' },
  { id: 'house',  label: 'House',  kind: 'house', color: '#3a72c8' },
  { id: 'tree',   label: 'Tree',   kind: 'tree',  color: '#6fb442' },
  { id: 'fence',  label: 'Fence',  kind: 'fence', color: '#8a5a3b' },
  { id: 'crop',   label: 'Crop',   kind: 'crop',  terrainOverride: 'dirt', color: '#86c544' },
  { id: 'tuft',   label: 'Tuft',   kind: 'tuft',  color: '#86b53e' },
  { id: 'erase',  label: 'Erase',  erase: true, color: 'transparent', eraser: true },
];

let selectedTool = TOOLS[5]; // start on Tree — feels inviting
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

// Map a click on cell (x,z) to a world mutation based on the active tool.
export function applyTool(x, z) {
  const cell = world[x][z];
  if (selectedTool.erase) {
    if (cell.kind) setCell(x, z, { terrain: cell.terrain, kind: null });
    else if (cell.terrain !== 'grass') setCell(x, z, { terrain: 'grass', kind: null });
    return;
  }
  if (selectedTool.kind === 'house' && cell.kind === 'house') {
    // Stack: clicking the house tool on an existing house adds a floor.
    const newFloors = Math.min((cell.floors || 1) + 1, MAX_FLOORS);
    if (newFloors === (cell.floors || 1)) return;
    setCell(x, z, { terrain: cell.terrain, kind: 'house', floors: newFloors });
    return;
  }
  if (selectedTool.kind) {
    const newTerrain = selectedTool.terrainOverride || cell.terrain;
    setCell(x, z, { terrain: newTerrain, kind: selectedTool.kind });
    return;
  }
  if (selectedTool.terrain) {
    setCell(x, z, { terrain: selectedTool.terrain, kind: cell.kind, floors: cell.floors });
  }
}
