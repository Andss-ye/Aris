/* =====================================================================
   Aris — paleta de herramientas + colocación. Dueño: ANDREW.
   5 estructuras marcianas + borrador. applyTool valida terreno (depósitos),
   ocupación y costo (resources.canAfford/spend) antes de setCell.
   ===================================================================== */

import { world } from '../world/state.js';
import { setCell } from '../world/render.js';
import { STRUCT } from '../config/structures.js';
import * as resources from './../game/resources.js';

export const TOOLS = [
  { id: 'tower',       label: 'Torre',       kind: 'tower',       color: '#4a90c2' },
  { id: 'wall',        label: 'Muro',        kind: 'wall',        color: '#5a606a' },
  { id: 'mine',        label: 'Mina',        kind: 'mine',        color: '#9c6b3a' },
  { id: 'reactor',     label: 'Reactor',     kind: 'reactor',     color: '#66ddff' },
  { id: 'hydroponics', label: 'Hidropónica', kind: 'hydroponics', color: '#4caf50' },
  { id: 'erase',       label: 'Borrar',      erase: true, color: 'transparent', eraser: true },
];

let selectedTool = TOOLS[0];
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

const DEPOSIT_LABEL = { iron_deposit: 'hierro', crystal_deposit: 'cristal' };

// Mapea un click en (x,z) a una mutación según la herramienta activa.
export function applyTool(x, z) {
  const cell = world[x][z];

  if (selectedTool.erase) {
    if (cell.kind && cell.kind !== 'base') setCell(x, z, { terrain: cell.terrain, kind: null });
    else if (cell.kind === 'base') resources.notify('No puedes borrar la Base', 'warn');
    return;
  }

  const kind = selectedTool.kind;
  if (!kind) return;

  // No construir sobre ocupado, sobre la base, ni sobre cráteres.
  if (cell.kind) { resources.notify('Casilla ocupada', 'warn'); return; }
  if (cell.terrain === 'crater') { resources.notify('No se puede construir en un cráter', 'warn'); return; }

  // Minas/reactores requieren el depósito correcto.
  const struct = STRUCT[kind];
  if (struct.tile && cell.terrain !== struct.tile) {
    resources.notify(`Requiere depósito de ${DEPOSIT_LABEL[struct.tile] || struct.tile}`, 'warn');
    return;
  }

  const cost = struct.levels[0].cost || {};
  if (!resources.canAfford(cost)) { resources.notify('Recursos insuficientes', 'warn'); return; }
  resources.spend(cost);

  setCell(x, z, { terrain: cell.terrain, kind, level: 0 });
}
