/* =====================================================================
   Aris — Recursos + vida de la Base + HUD. Dueño: ANDREW.
   PLACEHOLDER de Fase 0 (contrato 3.2): contadores reales pero compras GRATIS
   (canAfford→true, spend no descuenta) para no bloquear pruebas. HUD inline.
   Andrew reemplaza con producción real leyendo `world` y costos reales.
   ===================================================================== */

import { START } from '../config/economy.js';

const res = { iron: 9999, energy: 9999, crystal: 9999 };
let baseHpVal = 200;
let baseMax = 200;
let hud = null;

export function init() {
  res.iron = START.iron; res.energy = START.energy; res.crystal = START.crystal;
  // PLACEHOLDER: dinero abundante para probar sin bloqueo.
  res.iron = 9999; res.energy = 9999; res.crystal = 9999;
  baseHpVal = 200; baseMax = 200;
  buildHud();
  render();
}

function buildHud() {
  if (hud) return;
  hud = document.createElement('div');
  hud.id = 'hud';
  hud.style.cssText =
    'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:50;' +
    'font-family:Inter,system-ui,sans-serif;font-weight:600;font-size:15px;color:#2a2722;' +
    'background:rgba(255,255,255,.82);padding:8px 16px;border-radius:12px;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.12);display:flex;gap:18px;align-items:center;';
  document.body.appendChild(hud);

  const bar = document.createElement('div');
  bar.id = 'baseHpBar';
  bar.style.cssText =
    'position:fixed;left:12px;bottom:12px;z-index:50;width:200px;height:18px;' +
    'background:rgba(0,0,0,.25);border-radius:9px;overflow:hidden;' +
    'font-family:Inter,sans-serif;font-size:11px;color:#fff;';
  bar.innerHTML = '<div id="baseHpFill" style="height:100%;width:100%;background:#4caf50;' +
    'display:flex;align-items:center;justify-content:center;transition:width .2s;">Base</div>';
  document.body.appendChild(bar);
}

function render() {
  if (!hud) return;
  hud.textContent = `⚙ ${Math.floor(res.iron)}   ⚡ ${Math.floor(res.energy)}   💎 ${Math.floor(res.crystal)}`;
  const fill = document.getElementById('baseHpFill');
  if (fill) {
    const pct = Math.max(0, baseHpVal / baseMax) * 100;
    fill.style.width = pct + '%';
    fill.style.background = pct > 50 ? '#4caf50' : pct > 25 ? '#ff9800' : '#e53935';
    fill.textContent = `Base ${Math.max(0, Math.ceil(baseHpVal))}`;
  }
}

// -------- contrato 3.2 --------
export function get(type) { return res[type] || 0; }
export function canAfford(_cost) { return true; }          // PLACEHOLDER: siempre alcanza
export function spend(_cost) { return true; }              // PLACEHOLDER: no descuenta
export function add(type, n) { res[type] = (res[type] || 0) + n; render(); }
export function damageBase(n) { baseHpVal -= n; render(); }
export function baseHp() { return baseHpVal; }
export function healBase(n) { baseHpVal = Math.min(baseMax, baseHpVal + n); render(); }
export function tick(_dt) { /* PLACEHOLDER: sin producción aún */ }
export function reset() { init(); }
