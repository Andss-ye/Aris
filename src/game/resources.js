/* =====================================================================
   Aris — Recursos + vida de la Base + HUD. Dueño: ANDREW.
   Implementa el contrato 3.2. Producción real leyendo `world` (minas,
   reactores, base, hidropónicas vía STRUCT), costos reales en canAfford/spend,
   y la vida de la Base como fuente autoritativa (Julian llama damageBase).
   ===================================================================== */

import { GRID } from '../config/constants.js';
import { START } from '../config/economy.js';
import { STRUCT } from '../config/structures.js';
import { world } from '../world/state.js';

const ICONS = { iron: '⚙', energy: '⚡', crystal: '💎' };
const BASE_BASE_HP = (STRUCT.base && STRUCT.base.levels[0] && STRUCT.base.levels[0].hp) || 200;

const res = { iron: 0, energy: 0, crystal: 0 };
let baseHpVal = BASE_BASE_HP;
let baseMax = BASE_BASE_HP;
let running = false;            // produce solo durante una partida activa
let rates = { iron: 0, energy: 0, crystal: 0, heal: 0 };
let built = false;

// -------- ciclo de vida --------
export function init() {
  buildHud();
  res.iron = START.iron; res.energy = START.energy; res.crystal = START.crystal;
  baseHpVal = baseMax = BASE_BASE_HP;
  running = false;             // arranca en pausa hasta que el menú dé "Jugar"
  render();
}

// Reinicia contadores para una nueva partida. startMul escala lo inicial.
export function reset(startMul = 1) {
  res.iron = Math.round(START.iron * startMul);
  res.energy = Math.round(START.energy * startMul);
  res.crystal = START.crystal;
  baseMax = BASE_BASE_HP;
  baseHpVal = baseMax;
  rates = { iron: 0, energy: 0, crystal: 0, heal: 0 };
  running = true;
  render();
}

// Congela la producción (fin de partida / menú).
export function stop() { running = false; }

// -------- producción (lee world) --------
function isBaseAnchor(x, z) {
  if (world[x][z].kind !== 'base') return false;
  if (x > 0 && world[x - 1][z].kind === 'base') return false;
  if (z > 0 && world[x][z - 1].kind === 'base') return false;
  return true;
}

function computeProduction() {
  let iron = 0, energy = 0, crystal = 0, heal = 0, baseLevel = 0;
  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      const c = world[x][z];
      if (!c || !c.kind) continue;
      const s = STRUCT[c.kind];
      if (!s) continue;
      const lvl = s.levels[c.level || 0] || s.levels[0];
      if (c.kind === 'base') {
        if (!isBaseAnchor(x, z)) continue;   // contar la base 2×2 una sola vez
        baseLevel = c.level || 0;
        iron += lvl.ironPerSec || 0;
      } else if (c.kind === 'mine') {
        iron += lvl.ironPerSec || 0;
        if (lvl.crystalEvery) crystal += 1 / lvl.crystalEvery;
      } else if (c.kind === 'reactor') {
        energy += lvl.energyPerSec || 0;
      } else if (c.kind === 'hydroponics') {
        heal += lvl.baseHealPerSec || 0;
      }
    }
  }
  return { iron, energy, crystal, heal, baseLevel };
}

// -------- contrato 3.2 --------
export function get(type) { return res[type] || 0; }

export function canAfford(cost) {
  if (!cost) return true;
  for (const k in cost) if ((res[k] || 0) < cost[k]) return false;
  return true;
}

export function spend(cost) {
  if (!canAfford(cost)) return false;
  for (const k in cost) res[k] -= cost[k];
  render();
  return true;
}

export function add(type, n) { res[type] = (res[type] || 0) + n; render(); }

export function damageBase(n) { baseHpVal -= n; render(); }

export function baseHp() { return baseHpVal; }

export function healBase(n) { baseHpVal = Math.min(baseMax, baseHpVal + n); render(); }

export function tick(dt) {
  if (!running || dt <= 0) return;
  const p = computeProduction();
  res.iron += p.iron * dt;
  res.energy += p.energy * dt;
  res.crystal += p.crystal * dt;
  // Subir nivel de la Base aumenta su blindaje (maxHp): regalar la diferencia.
  const desiredMax = (STRUCT.base.levels[p.baseLevel] && STRUCT.base.levels[p.baseLevel].hp) || baseMax;
  if (desiredMax > baseMax) { baseHpVal += desiredMax - baseMax; baseMax = desiredMax; }
  if (p.heal > 0) baseHpVal = Math.min(baseMax, baseHpVal + p.heal * dt);
  rates = p;
  render();
}

// -------- HUD --------
function buildHud() {
  if (built) return;
  built = true;

  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML =
    '<span class="res"><span class="ic">⚙</span><b id="ironVal">0</b><i id="ironRate"></i></span>' +
    '<span class="res"><span class="ic">⚡</span><b id="energyVal">0</b><i id="energyRate"></i></span>' +
    '<span class="res"><span class="ic">💎</span><b id="crystalVal">0</b><i id="crystalRate"></i></span>';
  document.body.appendChild(hud);

  const bar = document.createElement('div');
  bar.id = 'baseBar';
  bar.innerHTML = '<div class="fill" id="baseFill"></div><span class="lbl" id="baseLbl">Base</span>';
  document.body.appendChild(bar);
}

function fmtRate(n) {
  if (n <= 0.0001) return '';
  return n >= 1 ? `+${Math.round(n)}/s` : `+${n.toFixed(2)}/s`;
}

function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }

function render() {
  if (!built) return;
  setText('ironVal', Math.floor(res.iron));
  setText('energyVal', Math.floor(res.energy));
  setText('crystalVal', Math.floor(res.crystal));
  setText('ironRate', fmtRate(rates.iron));
  setText('energyRate', fmtRate(rates.energy));
  setText('crystalRate', fmtRate(rates.crystal));

  const fill = document.getElementById('baseFill');
  const lbl = document.getElementById('baseLbl');
  const pct = Math.max(0, baseHpVal / baseMax) * 100;
  if (fill) {
    fill.style.width = pct + '%';
    fill.style.background = pct > 50 ? '#4caf50' : pct > 25 ? '#ff9800' : '#e53935';
  }
  if (lbl) lbl.textContent = `Base ${Math.max(0, Math.ceil(baseHpVal))}/${baseMax}`;
}

// -------- toast compartido (lo usan tools.js / upgrades.js de Andrew) --------
let toastEl = null;
let toastTimer = 0;
export function notify(msg, type = 'info') {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.className = type;
  // reflow para reiniciar la animación, luego mostrar
  void toastEl.offsetWidth;
  toastEl.classList.add('show', type);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
}
