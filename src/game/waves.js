/* =====================================================================
   Aris — Oleadas, fases y flujo de partida (menú/pausa/fin). Dueño: ANDREW.
   Implementa el contrato 3.4. Máquina de estados:
     menu → build (construcción) → invasion → (reward → build | won | lost)
   Spawnea desde la tabla WAVES vía enemies.spawn; la oleada termina cuando todo
   está spawneado y enemies.count()===0. Construye el HUD de oleada y los overlays.
   No importa scenes/ ni input/ (disciplina de imports): recibe `reloadScene` por
   inyección desde main.js para recargar el tablero al (re)iniciar.
   ===================================================================== */

import { GRID } from '../config/constants.js';
import {
  SPAWN_INTERVAL, WAVES, WAVE_REWARD, DIFFICULTY, DEFAULT_DIFFICULTY,
} from '../config/economy.js';
import { ENEMIES } from '../config/enemies.js';
import * as enemies from './enemies.js';
import * as resources from './resources.js';

// Estado del contrato 3.4 (también usamos 'menu' internamente; nadie externo lo lee).
export let state = 'menu';

const VALID_TYPES = Object.keys(ENEMIES);

let phase = 'menu';          // 'menu'|'build'|'invasion'|'won'|'lost'
let paused = false;
let difficulty = DEFAULT_DIFFICULTY;
let waveIndex = 0;
let buildTimer = 0;
let buildDuration = DIFFICULTY[DEFAULT_DIFFICULTY].buildTime;
let spawnQueue = [];
let spawnTimer = 0;
let allSpawned = false;
let reloadScene = () => {};

let overlay = null;
let waveHud = null;

// -------- arranque (lo llama main.js una vez) --------
export function start(hooks = {}) {
  reloadScene = hooks.reloadScene || (() => {});
  buildWaveHud();
  buildOverlay();
  showMenu();
}

// -------- helpers de fase --------
function syncPhase(p) { document.body.dataset.phase = p; }
function setPaused(v) { paused = v; document.body.dataset.paused = v ? '1' : '0'; }
function q(sel) { return document.querySelector(sel); }

function setState(p) { phase = p; state = p; }

// -------- menú principal --------
function showMenu() {
  setState('menu');
  setPaused(false);
  syncPhase('menu');
  enemies.clear();
  resources.stop();

  const diffBtns = Object.values(DIFFICULTY).map((d) =>
    `<button class="diff-opt${d.id === difficulty ? ' sel' : ''}" data-d="${d.id}">` +
    `${d.label}<small>${d.hint}</small></button>`).join('');

  overlay.innerHTML =
    `<div class="overlay-panel menu">
       <h1>Defensa de la Colonia <em>Marciana</em></h1>
       <p class="lead">Construye tu colonia, extrae minerales y resiste 5 oleadas.
         Si un marciano llega al centro de la Base Principal, pierdes.</p>
       <div class="diff-row">${diffBtns}</div>
       <button class="menu-btn primary" id="playBtn">▶ Jugar</button>
       <p class="hint">Construye durante la fase ⏱ y pulsa <b>Iniciar oleada</b> cuando estés listo.</p>
     </div>`;
  showOverlay();
  overlay.querySelectorAll('.diff-opt').forEach((b) => {
    b.onclick = () => { difficulty = b.dataset.d; showMenu(); };
  });
  q('#playBtn').onclick = beginRun;
}

// -------- iniciar / reiniciar una partida --------
export function beginRun() {
  const d = DIFFICULTY[difficulty];
  reloadScene();              // tablero limpio (base + depósitos) vía main/scenes
  enemies.clear();
  buildDuration = d.buildTime;
  resources.reset(d.startMul);
  waveIndex = 0;
  setPaused(false);
  hideOverlay();
  enterBuild();
}

function enterBuild() {
  setState('build');
  syncPhase('play');
  buildTimer = buildDuration;
  updateWaveHud();
}

function startInvasion() {
  setState('invasion');
  syncPhase('play');
  spawnQueue = buildSpawnQueue(WAVES[waveIndex]);
  allSpawned = spawnQueue.length === 0;
  spawnTimer = 0;
  updateWaveHud();
}

// Intercala tipos en round-robin para un ritmo de spawn más variado.
function buildSpawnQueue(waveDef) {
  const buckets = Object.entries(waveDef)
    .filter(([k]) => VALID_TYPES.includes(k))
    .map(([k, n]) => ({ k, n }));
  const queue = [];
  let pending = true;
  while (pending) {
    pending = false;
    for (const b of buckets) {
      if (b.n > 0) { queue.push(b.k); b.n--; pending = true; }
    }
  }
  return queue;
}

function clearWave() {
  if (waveIndex >= WAVES.length - 1) { win(); return; }
  resources.add('iron', WAVE_REWARD.iron);
  resources.add('energy', WAVE_REWARD.energy);
  resources.notify(
    `Oleada ${waveIndex + 1} superada · +${WAVE_REWARD.iron}⚙ +${WAVE_REWARD.energy}⚡`, 'good');
  waveIndex++;
  enterBuild();
}

function win() { setState('won'); syncPhase('over'); resources.stop(); showEnd(true); }
function lose() { setState('lost'); syncPhase('over'); resources.stop(); enemies.clear(); showEnd(false); }

// -------- bucle (lo llama main.js cuando no está en pausa) --------
export function tick(dt) {
  if (phase === 'build') {
    buildTimer -= dt;
    if (buildTimer <= 0) startInvasion();
    updateWaveHud();
  } else if (phase === 'invasion') {
    if (resources.baseHp() <= 0) { lose(); return; }
    if (spawnQueue.length > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        enemies.spawn(spawnQueue.shift(), edgeCell());
        spawnTimer = SPAWN_INTERVAL;
        if (spawnQueue.length === 0) allSpawned = true;
      }
    }
    if (allSpawned && enemies.count() === 0) { clearWave(); return; }
    updateWaveHud();
  }
}

// Celda aleatoria en un borde del grid (punto de aparición).
function edgeCell() {
  const side = Math.floor(Math.random() * 4);
  const r = Math.floor(Math.random() * GRID);
  if (side === 0) return { x: 0, z: r };
  if (side === 1) return { x: GRID - 1, z: r };
  if (side === 2) return { x: r, z: 0 };
  return { x: r, z: GRID - 1 };
}

// -------- pausa (ESC desde controls.js) --------
export function togglePause() {
  if (phase !== 'build' && phase !== 'invasion') return;
  if (paused) { setPaused(false); hideOverlay(); }
  else { setPaused(true); showPause(); }
}

export function isPaused() {
  return paused || phase === 'menu' || phase === 'won' || phase === 'lost';
}

function showPause() {
  overlay.innerHTML =
    `<div class="overlay-panel">
       <h2>Pausa</h2>
       <button class="menu-btn primary" id="resumeBtn">Reanudar</button>
       <button class="menu-btn" id="restartBtn">Reiniciar partida</button>
       <button class="menu-btn ghost" id="menuBtn">Salir al menú</button>
     </div>`;
  showOverlay();
  q('#resumeBtn').onclick = () => togglePause();
  q('#restartBtn').onclick = () => { setPaused(false); beginRun(); };
  q('#menuBtn').onclick = () => { setPaused(false); showMenu(); };
}

function showEnd(won) {
  overlay.innerHTML =
    `<div class="overlay-panel ${won ? 'win' : 'lose'}">
       <h1>${won ? '¡Victoria!' : 'Derrota'}</h1>
       <p class="lead">${won
        ? 'Defendiste la colonia durante las 5 oleadas marcianas.'
        : 'Un marciano alcanzó la Base Principal.'}</p>
       <p class="stat">Oleadas superadas: <b>${won ? WAVES.length : waveIndex}</b> / ${WAVES.length}</p>
       <button class="menu-btn primary" id="againBtn">Jugar de nuevo</button>
       <button class="menu-btn ghost" id="toMenuBtn">Menú principal</button>
     </div>`;
  showOverlay();
  q('#againBtn').onclick = beginRun;
  q('#toMenuBtn').onclick = showMenu;
}

// -------- DOM: HUD de oleada + overlay --------
function buildWaveHud() {
  if (waveHud) return;
  waveHud = document.createElement('div');
  waveHud.id = 'waveHud';
  waveHud.innerHTML =
    '<span id="wavePhase">—</span>' +
    '<span id="waveInfo"></span>' +
    '<button id="earlyBtn">▶ Iniciar oleada</button>';
  document.body.appendChild(waveHud);
  waveHud.querySelector('#earlyBtn').onclick = () => { if (phase === 'build') startInvasion(); };
}

function updateWaveHud() {
  const phaseEl = q('#wavePhase');
  const infoEl = q('#waveInfo');
  const early = q('#earlyBtn');
  if (!phaseEl) return;
  if (phase === 'build') {
    phaseEl.textContent = '🛠 Construcción';
    infoEl.textContent = `Oleada ${waveIndex + 1}/${WAVES.length} en ${Math.ceil(Math.max(0, buildTimer))}s`;
    early.style.display = '';
  } else if (phase === 'invasion') {
    phaseEl.textContent = `👾 Oleada ${waveIndex + 1}/${WAVES.length}`;
    const pending = spawnQueue.length ? ` (+${spawnQueue.length})` : '';
    infoEl.textContent = `Enemigos: ${enemies.count()}${pending}`;
    early.style.display = 'none';
  }
}

function buildOverlay() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'overlay';
  document.body.appendChild(overlay);
}

function showOverlay() { overlay.style.display = 'flex'; }
function hideOverlay() { overlay.style.display = 'none'; }
