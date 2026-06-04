/* =====================================================================
   Aris — Upgrades por click en estructura. Dueño: ANDREW.
   PLACEHOLDER de Fase 0: panel DOM mínimo. Sube nivel con setCell (compra
   gratis vía resources placeholder). Andrew refina costos y stats por nivel.
   ===================================================================== */

import { world } from '../world/state.js';
import { setCell } from '../world/render.js';
import { STRUCT } from '../config/structures.js';
import * as resources from './resources.js';

let panel = null;

export function open(x, z) {
  const cell = world[x][z];
  if (!cell || !cell.kind || cell.kind === 'base') { closePanel(); return; }
  const struct = STRUCT[cell.kind];
  if (!struct) { closePanel(); return; }

  buildPanel();
  const level = cell.level || 0;
  const next = struct.levels[level + 1];

  panel.innerHTML = '';
  const title = document.createElement('div');
  title.textContent = `${cell.kind} · nivel ${level}`;
  title.style.cssText = 'font-weight:600;margin-bottom:8px;text-transform:capitalize;';
  panel.appendChild(title);

  if (!next) {
    const max = document.createElement('div');
    max.textContent = 'Nivel máximo';
    max.style.opacity = '.7';
    panel.appendChild(max);
  } else {
    const cost = next.cost || {};
    const costStr = Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(' · ') || 'gratis';
    const btn = document.createElement('button');
    btn.textContent = `Mejorar → nivel ${level + 1} (${costStr})`;
    btn.style.cssText = 'cursor:pointer;padding:6px 12px;border:none;border-radius:8px;' +
      'background:#3a72c8;color:#fff;font-weight:600;';
    btn.onclick = () => {
      if (resources.canAfford(cost)) {
        resources.spend(cost);
        setCell(x, z, { terrain: cell.terrain, kind: cell.kind, level: level + 1 });
        open(x, z);
      }
    };
    panel.appendChild(btn);
  }

  const close = document.createElement('button');
  close.textContent = '✕';
  close.style.cssText = 'position:absolute;top:6px;right:8px;border:none;background:none;cursor:pointer;font-size:16px;';
  close.onclick = closePanel;
  panel.appendChild(close);
  panel.style.display = 'block';
}

function buildPanel() {
  if (panel) return;
  panel = document.createElement('div');
  panel.id = 'upgradePanel';
  panel.style.cssText =
    'position:fixed;left:50%;bottom:48px;transform:translateX(-50%);z-index:60;' +
    'font-family:Inter,sans-serif;font-size:14px;color:#2a2722;background:rgba(255,255,255,.95);' +
    'padding:14px 18px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.18);display:none;min-width:220px;';
  document.body.appendChild(panel);
}

function closePanel() { if (panel) panel.style.display = 'none'; }
