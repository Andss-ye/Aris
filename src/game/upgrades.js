/* =====================================================================
   Aris — Panel de mejoras por click en estructura. Dueño: ANDREW.
   Muestra los stats del siguiente nivel, valida costo (resources.canAfford),
   cobra y sube nivel vía setCell. Soporta la Base 2×2 (mejora en su ancla).
   ===================================================================== */

import { world } from '../world/state.js';
import { setCell } from '../world/render.js';
import { STRUCT } from '../config/structures.js';
import * as resources from './resources.js';

const COST_ICON = { iron: '⚙', energy: '⚡', crystal: '💎' };
const STAT_LABEL = {
  hp: 'Vida', ironPerSec: '⚙ / s', energyPerSec: '⚡ / s', baseHealPerSec: 'Cura base / s',
  range: 'Alcance', fireRate: 'Cadencia (s)', dmg: 'Daño', aoe: 'Área',
  crystalEvery: '💎 cada (s)', returnDmg: 'Daño de retorno', repairAdjacent: 'Repara vecinos',
};

let panel = null;

// Encuentra el ancla (min x,z) del bloque de la Base desde cualquiera de sus celdas.
function baseAnchor(x, z) {
  let ax = x, az = z;
  while (ax > 0 && world[ax - 1][z].kind === 'base') ax--;
  while (az > 0 && world[x][az - 1].kind === 'base') az--;
  return { x: ax, z: az };
}

export function open(x, z) {
  const cell = world[x][z];
  if (!cell || !cell.kind) { closePanel(); return; }

  let ax = x, az = z;
  if (cell.kind === 'base') { const a = baseAnchor(x, z); ax = a.x; az = a.z; }
  const target = world[ax][az];
  const struct = STRUCT[target.kind];
  if (!struct) { closePanel(); return; }

  const level = target.level || 0;
  const next = struct.levels[level + 1];

  buildPanel();
  panel.innerHTML = '';

  const close = document.createElement('button');
  close.className = 'up-close';
  close.textContent = '✕';
  close.onclick = closePanel;
  panel.appendChild(close);

  const title = document.createElement('div');
  title.className = 'up-title';
  title.textContent = target.kind;
  panel.appendChild(title);

  const lvlLine = document.createElement('div');
  lvlLine.className = 'up-lvl';
  lvlLine.textContent = next ? `Nivel ${level} → ${level + 1}` : `Nivel ${level} (máximo)`;
  panel.appendChild(lvlLine);

  if (!next) {
    const max = document.createElement('div');
    max.className = 'up-max';
    max.textContent = 'Nivel máximo alcanzado';
    panel.appendChild(max);
    panel.style.display = 'block';
    return;
  }

  // Stats que otorga el siguiente nivel.
  const stats = document.createElement('div');
  stats.className = 'up-stats';
  for (const [k, v] of Object.entries(next)) {
    if (k === 'cost') continue;
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span>${STAT_LABEL[k] || k}</span><span>${v}</span>`;
    stats.appendChild(row);
  }
  panel.appendChild(stats);

  const cost = next.cost || {};
  const costStr = Object.entries(cost)
    .map(([k, v]) => `${v} ${COST_ICON[k] || k}`).join(' · ') || 'gratis';
  const affordable = resources.canAfford(cost);

  const btn = document.createElement('button');
  btn.className = 'up-btn' + (affordable ? '' : ' afford-no');
  btn.textContent = `Mejorar (${costStr})`;
  btn.disabled = !affordable;
  btn.onclick = () => {
    if (!resources.spend(cost)) { resources.notify('Recursos insuficientes', 'warn'); return; }
    setCell(ax, az, { terrain: target.terrain, kind: target.kind, level: level + 1 });
    open(ax, az);   // reabrir con el nuevo nivel
  };
  panel.appendChild(btn);

  panel.style.display = 'block';
}

function buildPanel() {
  if (panel) return;
  panel = document.createElement('div');
  panel.id = 'upgradePanel';
  document.body.appendChild(panel);
}

function closePanel() { if (panel) panel.style.display = 'none'; }
