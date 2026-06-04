/* =====================================================================
   Aris — Enemigos. Dueño: JULIAN.
   PLACEHOLDER de Fase 0 (contrato 3.3): spawn crea un cubo que camina al centro;
   list/count/damage/clear reales mínimos. Al llegar al centro llama
   resources.damageBase. Julian reemplaza con 3 mallas, ataque a muros, kamikaze.
   ===================================================================== */

import { GRID } from '../config/constants.js';
import { ENEMIES, BASE_HIT_DMG } from '../config/enemies.js';
import { tilePos } from '../world/state.js';
import { worldGroup } from '../core/engine.js';
import { disposeGroup } from '../geometry/shapes.js';
import * as resources from './resources.js';

const pool = []; // array interno de enemigos vivos (la API pública es list())
let nextId = 1;

// Centro del mapa en coordenadas de grid (donde está la Base).
const CENTER = GRID / 2 - 0.5;

// -------- contrato 3.3 --------
export function spawn(type, edgeCell) {
  const cfg = ENEMIES[type] || ENEMIES.scout;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(cfg.size * 1.4, cfg.size * 1.4, cfg.size * 1.4),
    new THREE.MeshLambertMaterial({ color: cfg.color })
  );
  const p = tilePos(edgeCell.x, edgeCell.z);
  mesh.position.set(p.x, 0.3, p.z);
  mesh.castShadow = true;
  worldGroup.add(mesh);
  pool.push({
    id: nextId++, type, mesh, hp: cfg.hp, speed: cfg.speed,
    pos: { x: edgeCell.x, z: edgeCell.z },
  });
}

export function tick(dt) {
  for (const e of [...pool]) {
    const dx = CENTER - e.pos.x;
    const dz = CENTER - e.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.4) {
      resources.damageBase(BASE_HIT_DMG);
      removeEnemy(e);
      continue;
    }
    const step = e.speed * dt;
    e.pos.x += (dx / d) * step;
    e.pos.z += (dz / d) * step;
    const p = tilePos(e.pos.x, e.pos.z);
    e.mesh.position.set(p.x, 0.3, p.z);
  }
}

export function list() {
  return pool.map((e) => ({ id: e.id, type: e.type, pos: e.pos, hp: e.hp, mesh: e.mesh }));
}

export function damage(id, amount) {
  const e = pool.find((x) => x.id === id);
  if (!e) return;
  e.hp -= amount;
  if (e.hp <= 0) removeEnemy(e);
}

export function count() { return pool.length; }

export function clear() {
  for (const e of [...pool]) removeEnemy(e);
}

function removeEnemy(e) {
  const idx = pool.indexOf(e);
  if (idx >= 0) pool.splice(idx, 1);
  worldGroup.remove(e.mesh);
  disposeGroup(e.mesh);
}
