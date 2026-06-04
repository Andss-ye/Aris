/* =====================================================================
   Aris — paleta de herramientas + colocación. Dueño: ANDREW.
   Merge estructuras: añade herramienta Base 2×2, pinceles de terreno y
   placement safety completa (sin superposiciones, cráter no construible,
   base valida sus 4 celdas). La economía (canAfford/spend) de Andrew se
   conserva íntegra — colocar Base cuesta 0 (nivel 0 de base no tiene cost).
   ===================================================================== */

import { GRID } from '../config/constants.js';
import { world } from '../world/state.js';
import { setCell } from '../world/render.js';
import { STRUCT } from '../config/structures.js';
import * as resources from './../game/resources.js';

export const TOOLS = [
  { id: 'base',        label: 'Base',        kind: 'base',        color: '#cdd3d8' },
  { id: 'tower',       label: 'Torre',       kind: 'tower',       color: '#4a90c2' },
  { id: 'wall',        label: 'Muro',        kind: 'wall',        color: '#5a606a' },
  { id: 'mine',        label: 'Mina',        kind: 'mine',        color: '#9c6b3a' },
  { id: 'reactor',     label: 'Reactor',     kind: 'reactor',     color: '#66ddff' },
  { id: 'hydroponics', label: 'Hidropónica', kind: 'hydroponics', color: '#4caf50' },
  { id: 'erase',       label: 'Borrar',      erase: true, color: 'transparent', eraser: true },
];

let selectedTool = TOOLS[1]; // Torre por defecto
const listeners = [];

export function getSelectedTool() { return selectedTool; }
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
    k.textContent = t.eraser ? 'E' : String(i + 1);
    btn.appendChild(k);
    btn.addEventListener('click', () => selectTool(t));
    if (t === selectedTool) btn.classList.add('active');
    bar.appendChild(btn);
  });
}

export function selectTool(t) {
  selectedTool = t;
  document.querySelectorAll('.tool').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === t.id);
  });
  for (const fn of listeners) fn(t);
}

// Cráter no es construible (idea.md).
function isBuildable(terrain) { return terrain !== 'crater'; }

const DEPOSIT_LABEL = { iron_deposit: 'hierro', crystal_deposit: 'cristal' };

// Mapea un click en (x,z) a una mutación según la herramienta activa.
export function applyTool(x, z) {
  const cell = world[x][z];

  // -------- borrar --------
  if (selectedTool.erase) {
    if (cell.kind === 'base') {
      resources.notify('No puedes borrar la Base', 'warn'); return;
    }
    if (cell.kind) setCell(x, z, { terrain: cell.terrain, kind: null });
    return;
  }

  const kind = selectedTool.kind;
  if (!kind) return;

  // -------- clic sobre la misma estructura → upgrade --------
  if (cell.kind === kind) {
    const def = STRUCT[kind];
    const maxLevel = (def ? def.levels.length : 1) - 1;
    const next = Math.min((cell.level || 0) + 1, maxLevel);
    if (next === (cell.level || 0)) { resources.notify('Nivel máximo', 'warn'); return; }
    const cost = (def && def.levels[next].cost) || {};
    if (!resources.canAfford(cost)) { resources.notify('Recursos insuficientes', 'warn'); return; }
    resources.spend(cost);
    setCell(x, z, { terrain: cell.terrain, kind, level: next });
    return;
  }

  // -------- base 2×2 --------
  if (kind === 'base') {
    const ax = Math.min(x, GRID - 2);
    const az = Math.min(z, GRID - 2);
    // verificar que las 4 celdas estén libres y sean construibles
    for (let dx = 0; dx < 2; dx++) {
      for (let dz = 0; dz < 2; dz++) {
        const c = world[ax + dx][az + dz];
        if (c.kind) { resources.notify('Casilla ocupada', 'warn'); return; }
        if (!isBuildable(c.terrain)) { resources.notify('No construible ahí', 'warn'); return; }
      }
    }
    // colocar las 4 celdas de la base (sin costo: base no tiene cost en nivel 0)
    for (let dx = 0; dx < 2; dx++)
      for (let dz = 0; dz < 2; dz++)
        setCell(ax + dx, az + dz, { terrain: world[ax + dx][az + dz].terrain, kind: 'base', level: 0 });
    return;
  }

  // -------- estructuras 1×1 --------
  if (cell.kind) { resources.notify('Casilla ocupada', 'warn'); return; }
  if (!isBuildable(cell.terrain)) { resources.notify('No se puede construir en un cráter', 'warn'); return; }

  const struct = STRUCT[kind];
  if (struct && struct.tile && cell.terrain !== struct.tile) {
    resources.notify(`Requiere depósito de ${DEPOSIT_LABEL[struct.tile] || struct.tile}`, 'warn');
    return;
  }

  const cost = (struct && struct.levels[0].cost) || {};
  if (!resources.canAfford(cost)) { resources.notify('Recursos insuficientes', 'warn'); return; }
  resources.spend(cost);

  setCell(x, z, { terrain: cell.terrain, kind, level: 0 });
}
