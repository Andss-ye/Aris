/* =====================================================================
   Aris — Combate (targeting de torres). Dueño: JULIAN.
   Contrato 3.3: tick(dt). Recorre las torres (y la Base nivel 2 con torreta) en
   `world`, elige el enemigo vivo más cercano dentro de rango, respeta la cadencia
   de STRUCT.tower, rota userData.cannon hacia el objetivo y dispara vía
   projectiles.fire. Lee stats de STRUCT; no muta `world`.
   ===================================================================== */

import { GRID } from '../config/constants.js';
import { world, cellMeshes, tilePos } from '../world/state.js';
import { STRUCT } from '../config/structures.js';
import { worldGroup } from '../core/engine.js';
import { disposeGroup } from '../geometry/shapes.js';
import * as enemies from './enemies.js';
import * as projectiles from './projectiles.js';

// Cadencia restante por estructura: 'x,z' -> segundos hasta poder disparar.
const cooldowns = new Map();

// Altura desde la que sale el proyectil (cima del cañón de la torre).
const MUZZLE_Y = 0.7;

// Destellos de disparo (cosméticos): esferas emisivas que decaen rápido.
const flashes = [];
const FLASH_LIFE = 0.08; // segundos

function spawnFlash(muzzle) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe082, transparent: true, opacity: 0.9 })
  );
  mesh.position.copy(muzzle);
  worldGroup.add(mesh);
  flashes.push({ mesh, t: 0 });
}

function tickFlashes(dt) {
  for (const f of [...flashes]) {
    f.t += dt;
    const k = f.t / FLASH_LIFE;
    if (k >= 1) {
      worldGroup.remove(f.mesh);
      disposeGroup(f.mesh);
      f.mesh.material.dispose();
      flashes.splice(flashes.indexOf(f), 1);
      continue;
    }
    f.mesh.scale.setScalar(1 + k * 1.5);
    f.mesh.material.opacity = 0.9 * (1 - k);
  }
}

function statsFor(cell) {
  if (cell.kind === 'tower') return STRUCT.tower.levels[cell.level || 0];
  if (cell.kind === 'base') {
    const bl = STRUCT.base.levels[cell.level || 0];
    if (bl && bl.range) return bl; // torreta integrada (upgrade 2)
  }
  return null;
}

export function tick(dt) {
  const live = enemies.list();

  for (let x = 0; x < GRID; x++) {
    for (let z = 0; z < GRID; z++) {
      const cell = world[x][z];
      if (!cell || !cell.kind) continue;

      const stats = statsFor(cell);
      if (!stats || !stats.range) continue;

      const key = x + ',' + z;
      const cd = (cooldowns.get(key) || 0) - dt;
      if (cd > 0) { cooldowns.set(key, cd); continue; }

      // Objetivo: enemigo vivo más cercano dentro de rango.
      const origin = tilePos(x, z);
      let target = null;
      let best = Infinity;
      for (const e of live) {
        const ep = tilePos(e.pos.x, e.pos.z);
        const dist = origin.distanceTo(ep);
        if (dist <= stats.range && dist < best) { best = dist; target = e; }
      }
      if (!target) { cooldowns.set(key, 0); continue; }

      // Rotar el cañón hacia el objetivo (barril apunta +Z en reposo).
      const obj = cellMeshes[key] && cellMeshes[key].object;
      if (obj && obj.userData.cannon) {
        obj.userData.cannon.rotation.y = Math.atan2(target.pos.x - x, target.pos.z - z);
      }

      // Disparar desde la boca del cañón.
      const muzzle = origin.clone();
      muzzle.y = MUZZLE_Y;
      projectiles.fire(muzzle, target.id, stats.dmg, stats.aoe || 0);
      spawnFlash(muzzle);

      cooldowns.set(key, 1 / stats.fireRate);
    }
  }

  tickFlashes(dt);
}
