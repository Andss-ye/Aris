/* =====================================================================
   Aris — Enemigos. Dueño: JULIAN.
   Contrato 3.3: spawn/tick/list/damage/count/clear. 3 mallas (scout / tanque /
   kamikaze; giant como variante de tanque), movimiento recto al centro (sin A*),
   los tanques rompen muros en su camino vía damageStructure, y todos dañan la
   Base al llegar al centro vía resources.damageBase. El kamikaze late y explota.
   ===================================================================== */

import { GRID } from '../config/constants.js';
import { ENEMIES, BASE_HIT_DMG, WALL_DPS } from '../config/enemies.js';
import { world, tilePos } from '../world/state.js';
import { damageStructure } from '../world/render.js';
import { worldGroup } from '../core/engine.js';
import { disposeGroup, castReceive } from '../geometry/shapes.js';
import * as resources from './resources.js';

const pool = []; // array interno de enemigos vivos (la API pública es list())
let nextId = 1;

// Centro del mapa en coordenadas de grid (ancla 2×2 de la Base).
const CENTER = GRID / 2 - 0.5;
// Altura a la que "flotan/ruedan" los enemigos sobre el tile.
const GROUND = 0.18;

const lam = (c, emissive = 0x000000) => new THREE.MeshLambertMaterial({ color: c, emissive });

function inBounds(x, z) { return x >= 0 && x < GRID && z >= 0 && z < GRID; }

// -------- mallas por tipo --------
function makeEnemyMesh(type, cfg) {
  const g = new THREE.Group();
  const s = cfg.size;
  const accent = cfg.accent != null ? cfg.accent : cfg.color;
  const detail = cfg.detail != null ? cfg.detail : 0x111111;
  const glow = cfg.glow != null ? cfg.glow : 0x000000;

  if (type === 'tanque' || type === 'giant') {
    // Chasis inclinado + placa frontal de blindaje (accent).
    const body = new THREE.Mesh(new THREE.BoxGeometry(s * 2, s * 1.4, s * 2), lam(cfg.color));
    body.position.y = s * 0.95;
    g.add(body);

    const plate = new THREE.Mesh(new THREE.BoxGeometry(s * 2.05, s * 0.7, s * 0.35), lam(accent));
    plate.position.set(0, s * 0.8, -s * 0.95);
    g.add(plate);

    // Torreta + cañón corto que apunta al frente.
    const turret = new THREE.Mesh(new THREE.BoxGeometry(s * 1.2, s * 0.7, s * 1.2), lam(0x4a5a4a));
    turret.position.y = s * 1.85;
    g.add(turret);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.16, s * 0.16, s * 1.3, 8), lam(detail));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, s * 1.85, -s * 1.0);
    g.add(barrel);

    if (type === 'giant') {
      // Placas de blindaje extra a los costados del giant.
      for (const side of [-1, 1]) {
        const armor = new THREE.Mesh(new THREE.BoxGeometry(s * 0.3, s * 1.0, s * 1.6), lam(accent));
        armor.position.set(side * s * 1.05, s * 1.0, 0);
        g.add(armor);
      }
    }

    // Orugas con 3 ruedas (cilindros) cada una.
    for (const side of [-1, 1]) {
      const tread = new THREE.Mesh(new THREE.BoxGeometry(s * 0.5, s * 0.55, s * 2.2), lam(0x2e2e2e));
      tread.position.set(side * s * 1.05, s * 0.3, 0);
      g.add(tread);
      for (let i = -1; i <= 1; i++) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.28, s * 0.28, s * 0.18, 10), lam(detail));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * s * 1.05, s * 0.3, i * s * 0.72);
        g.add(wheel);
      }
    }
  } else if (type === 'kamikaze') {
    // Esfera roja + corona de púas (conos) + núcleo emisivo que late.
    const body = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 12), lam(cfg.color));
    body.position.y = s;
    g.add(body);

    const spikes = 8;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(s * 0.18, s * 0.55, 6), lam(accent));
      spike.position.set(Math.cos(a) * s, s, Math.sin(a) * s);
      spike.rotation.z = -Math.cos(a) * (Math.PI / 2);
      spike.rotation.x = Math.sin(a) * (Math.PI / 2);
      g.add(spike);
    }

    const core = new THREE.Mesh(new THREE.SphereGeometry(s * 0.5, 12, 10), lam(accent, glow));
    core.position.y = s;
    g.add(core);
  } else {
    // scout (default): cuerpo verde + vientre claro + ojos + antenas con punta emisiva.
    const body = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 12), lam(cfg.color));
    body.position.y = s;
    g.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(s * 0.72, 14, 10), lam(accent));
    belly.position.set(0, s * 0.82, s * 0.18);
    g.add(belly);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.16, 8, 6), lam(detail));
      eye.position.set(side * s * 0.34, s * 1.12, s * 0.78);
      g.add(eye);
    }

    for (const side of [-1, 1]) {
      const antenna = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, s * 1.1, 6), lam(detail));
      stick.position.y = s * 0.55;
      antenna.add(stick);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(s * 0.18, 8, 6), lam(glow, glow));
      tip.position.y = s * 1.1;
      antenna.add(tip);
      antenna.position.set(side * s * 0.45, s * 1.2, 0);
      antenna.rotation.z = -side * 0.35;
      g.add(antenna);
    }
  }

  castReceive(g);
  return g;
}

// -------- contrato 3.3 --------
export function spawn(type, edgeCell) {
  const cfg = ENEMIES[type] || ENEMIES.scout;
  const mesh = makeEnemyMesh(type, cfg);
  const p = tilePos(edgeCell.x, edgeCell.z);
  mesh.position.set(p.x, GROUND, p.z);
  worldGroup.add(mesh);
  pool.push({
    id: nextId++, type, mesh, hp: cfg.hp, speed: cfg.speed,
    pos: { x: edgeCell.x, z: edgeCell.z },
    attacksWalls: !!cfg.attacksWalls,
    aoe: cfg.aoe || 0,
    aoeDmg: cfg.aoeDmg || 0,
    pulse: 0,
  });
}

export function tick(dt) {
  for (const e of [...pool]) {
    // Latido visual del kamikaze (no afecta su posición en el grid).
    if (e.type === 'kamikaze') {
      e.pulse += dt * 8;
      e.mesh.scale.setScalar(1 + Math.sin(e.pulse) * 0.12);
    }

    const dx = CENTER - e.pos.x;
    const dz = CENTER - e.pos.z;
    const d = Math.hypot(dx, dz);

    // Llegada al centro: golpe a la Base (kamikaze explota con AOE).
    if (d < 0.5) {
      if (e.type === 'kamikaze') {
        resources.damageBase(e.aoeDmg || BASE_HIT_DMG);
        explodeWalls(e);
      } else {
        resources.damageBase(BASE_HIT_DMG);
      }
      removeEnemy(e);
      continue;
    }

    const step = e.speed * dt;
    const nx = e.pos.x + (dx / d) * step;
    const nz = e.pos.z + (dz / d) * step;

    // Tanques/giants rompen un muro que bloquee la celda a la que entran.
    if (e.attacksWalls) {
      const cx = Math.round(nx);
      const cz = Math.round(nz);
      const blocking = inBounds(cx, cz) && world[cx][cz].kind === 'wall';
      if (blocking) {
        damageStructure(cx, cz, WALL_DPS * dt); // se queda quieto golpeando
        continue;
      }
    }

    e.pos.x = nx;
    e.pos.z = nz;
    const p = tilePos(e.pos.x, e.pos.z);
    e.mesh.position.set(p.x, GROUND, p.z);
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

// -------- internos --------
// El kamikaze, al estallar en el centro, también daña muros adyacentes.
function explodeWalls(e) {
  const r = Math.max(1, Math.ceil(e.aoe));
  const cx = Math.round(e.pos.x);
  const cz = Math.round(e.pos.z);
  for (let x = cx - r; x <= cx + r; x++) {
    for (let z = cz - r; z <= cz + r; z++) {
      if (!inBounds(x, z)) continue;
      if (world[x][z].kind === 'wall') damageStructure(x, z, e.aoeDmg || BASE_HIT_DMG);
    }
  }
}

function removeEnemy(e) {
  const idx = pool.indexOf(e);
  if (idx >= 0) pool.splice(idx, 1);
  worldGroup.remove(e.mesh);
  disposeGroup(e.mesh);
}
