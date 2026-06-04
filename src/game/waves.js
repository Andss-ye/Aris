/* =====================================================================
   Aris — Oleadas / fases. Dueño: ANDREW.
   PLACEHOLDER de Fase 0 (contrato 3.4): spawnea 1 enemigo cada 3 s en bucle
   para ver movimiento. Andrew reemplaza con build↔invasion, tabla WAVES y
   condiciones de victoria/derrota.
   ===================================================================== */

import { GRID } from '../config/constants.js';
import * as enemies from './enemies.js';

export let state = 'invasion'; // 'build'|'invasion'|'won'|'lost'

const TYPES = ['scout', 'tanque', 'kamikaze'];
let timer = 0;
let i = 0;
let hud = null;

export function start() {
  timer = 0;
  i = 0;
  state = 'invasion';
  buildHud();
}

function buildHud() {
  if (hud) return;
  hud = document.createElement('div');
  hud.id = 'waveHud';
  hud.style.cssText =
    'position:fixed;top:14px;right:16px;z-index:50;font-family:Inter,sans-serif;' +
    'font-weight:600;font-size:14px;color:#2a2722;background:rgba(255,255,255,.82);' +
    'padding:8px 14px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.12);';
  document.body.appendChild(hud);
}

function edgeCell() {
  const side = Math.floor(Math.random() * 4);
  const r = Math.floor(Math.random() * GRID);
  if (side === 0) return { x: 0, z: r };
  if (side === 1) return { x: GRID - 1, z: r };
  if (side === 2) return { x: r, z: 0 };
  return { x: r, z: GRID - 1 };
}

export function tick(dt) {
  timer += dt;
  if (timer >= 3) {
    timer = 0;
    enemies.spawn(TYPES[i++ % TYPES.length], edgeCell());
  }
  if (hud) hud.textContent = `Oleada (demo) · enemigos: ${enemies.count()}`;
}
