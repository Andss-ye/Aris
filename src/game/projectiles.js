/* =====================================================================
   Aris — Proyectiles. Dueño: JULIAN.
   Contrato 3.3: fire(from, targetId, dmg, aoe) + tick(dt). Pool de proyectiles
   que persiguen (homing) la posición viva del enemigo objetivo y, al impactar,
   llaman enemies.damage. Si aoe>0, salpican daño a los enemigos cercanos.
   ===================================================================== */

import { worldGroup } from '../core/engine.js';
import { disposeGroup } from '../geometry/shapes.js';
import * as enemies from './enemies.js';

const pool = [];
const FLIGHT = 0.32 / 1.1;  // ~0.29 s -> proyectil 10% más rápido
const AOE_SLACK = 0.5;      // margen extra (en celdas) al radio de salpicadura

// Posición world-space viva de un enemigo por id (o null si ya murió).
function enemyPos(targetId) {
  const e = enemies.list().find((x) => x.id === targetId);
  return e ? e.mesh.position : null;
}

// Construye la malla del proyectil: núcleo brillante + halo translúcido.
function makeProjectileMesh(aoe) {
  const g = new THREE.Group();
  const coreColor = aoe > 0 ? 0xb26bff : 0x6cc4ff;
  const haloColor = aoe > 0 ? 0x8e44ad : 0x4a90c2;
  const scale = aoe > 0 ? 1.4 : 1.0; // los AOE son más grandes para leerlos

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.06 * scale, 10, 8),
    new THREE.MeshBasicMaterial({ color: coreColor })
  );
  g.add(core);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.13 * scale, 10, 8),
    new THREE.MeshBasicMaterial({ color: haloColor, transparent: true, opacity: 0.35 })
  );
  g.add(halo);

  return g;
}

// fire(from, targetId, dmg, aoe) — encola un proyectil hacia un enemigo.
export function fire(from, targetId, dmg, aoe) {
  const mesh = makeProjectileMesh(aoe || 0);
  mesh.position.set(from.x, from.y != null ? from.y : 0.7, from.z);
  worldGroup.add(mesh);

  const start = mesh.position.clone();
  const live = enemyPos(targetId);
  pool.push({
    mesh, targetId, dmg, aoe: aoe || 0,
    t: 0,
    start,
    last: live ? live.clone() : start.clone(), // última posición conocida
  });
}

export function tick(dt) {
  for (const p of [...pool]) {
    p.t += dt / FLIGHT;

    const live = enemyPos(p.targetId);
    if (live) p.last.copy(live);

    if (p.t >= 1) {
      enemies.damage(p.targetId, p.dmg);
      if (p.aoe > 0) splash(p);
      remove(p);
      continue;
    }

    p.mesh.position.lerpVectors(p.start, p.last, p.t);
  }
}

// -------- internos --------
function splash(p) {
  const center = p.last;
  const radius = p.aoe + AOE_SLACK; // TILE = 1, así que celdas ≈ unidades world
  for (const e of enemies.list()) {
    if (e.id === p.targetId) continue; // el objetivo ya recibió el impacto directo
    if (e.mesh.position.distanceTo(center) <= radius) enemies.damage(e.id, p.dmg);
  }
}

function remove(p) {
  const idx = pool.indexOf(p);
  if (idx >= 0) pool.splice(idx, 1);
  worldGroup.remove(p.mesh);
  disposeGroup(p.mesh); // geometrías
  p.mesh.traverse((o) => { if (o.material) o.material.dispose(); });
}
