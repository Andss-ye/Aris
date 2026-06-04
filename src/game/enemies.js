/* =====================================================================
   Aris — Enemigos. Dueño: JULIAN. (rama coliciones: colisión + barras de vida)
   Contrato 3.3: spawn/tick/list/damage/count/clear. 3 mallas (scout / tanque /
   kamikaze; giant como variante de tanque) + barra de vida tipo billboard.
   Movimiento recto al centro (sin A*). COLISIÓN GENERAL: cualquier enemigo que
   intente entrar en una celda ocupada por una estructura se DETIENE y la ataca
   con `dmg`/seg vía damageStructure (la Base vía resources.damageBase). El
   kamikaze estalla al contacto (aoeDmg + salpicadura a estructuras vecinas).
   ===================================================================== */

import { GRID } from '../config/constants.js';
import { ENEMIES, BASE_HIT_DMG, WALL_DPS } from '../config/enemies.js';
import { world, tilePos } from '../world/state.js';
import { damageStructure } from '../world/render.js';
import { worldGroup, camera } from '../core/engine.js';
import { disposeGroup, castReceive } from '../geometry/shapes.js';
import * as resources from './resources.js';

const pool = []; // array interno de enemigos vivos (la API pública es list())
let nextId = 1;

// Centro del mapa en coordenadas de grid (ancla 2×2 de la Base).
const CENTER = GRID / 2 - 0.5;
// Altura a la que "flotan/ruedan" los enemigos sobre el tile.
const GROUND = 0.18;

// Barra de vida.
const BAR_W = 0.5;
const BAR_H = 0.07;

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

// -------- barra de vida (billboard) --------
// Group separado (no parentado al mesh) para que el latido del kamikaze no la
// escale. Se orienta hacia la cámara cada frame y el relleno encoge desde la
// derecha. depthTest:false → siempre legible por encima de las mallas.
function makeHpBar() {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(BAR_W + 0.04, BAR_H + 0.04),
    new THREE.MeshBasicMaterial({ color: 0x141414, transparent: true, opacity: 0.85, depthTest: false }),
  );
  bg.renderOrder = 998;
  g.add(bg);
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(BAR_W, BAR_H),
    new THREE.MeshBasicMaterial({ color: 0x4caf50, depthTest: false }),
  );
  fill.position.z = 0.001;
  fill.renderOrder = 999;
  g.add(fill);
  g.userData.fill = fill;
  worldGroup.add(g);
  return g;
}

function updateHpBar(e) {
  const bar = e.hpBar;
  if (!bar) return;
  bar.position.set(e.mesh.position.x, e.mesh.position.y + e.barY, e.mesh.position.z);
  bar.quaternion.copy(camera.quaternion); // billboard: siempre de cara
  const ratio = Math.max(0, Math.min(1, e.hp / e.maxHp));
  const fill = bar.userData.fill;
  fill.scale.x = ratio > 0 ? ratio : 0.0001;
  fill.position.x = -(BAR_W / 2) * (1 - ratio);
  fill.material.color.setHex(ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xff9800 : 0xe53935);
}

// -------- contrato 3.3 --------
export function spawn(type, edgeCell) {
  const cfg = ENEMIES[type] || ENEMIES.scout;
  const mesh = makeEnemyMesh(type, cfg);
  const p = tilePos(edgeCell.x, edgeCell.z);
  mesh.position.set(p.x, GROUND, p.z);
  worldGroup.add(mesh);

  const e = {
    id: nextId++, type, mesh, hp: cfg.hp, maxHp: cfg.hp, speed: cfg.speed,
    pos: { x: edgeCell.x, z: edgeCell.z },
    dmg: cfg.dmg != null ? cfg.dmg : WALL_DPS,
    aoe: cfg.aoe || 0,
    aoeDmg: cfg.aoeDmg || 0,
    pulse: 0,
    barY: cfg.size * 3.2 + 0.28, // altura de la barra sobre el suelo del enemigo
    hpBar: null,
  };
  e.hpBar = makeHpBar();
  pool.push(e);
  updateHpBar(e);
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

    // Respaldo: si alcanza el núcleo sin haber chocado antes, golpea la Base.
    if (d < 0.5) {
      if (e.type === 'kamikaze') {
        resources.damageBase(e.aoeDmg || BASE_HIT_DMG);
        explodeStructures(e);
      } else {
        resources.damageBase(BASE_HIT_DMG);
      }
      removeEnemy(e);
      continue;
    }

    const step = e.speed * dt;
    const nx = e.pos.x + (dx / d) * step;
    const nz = e.pos.z + (dz / d) * step;

    // -------- COLISIÓN: ¿la celda a la que entra tiene una estructura? --------
    const cx = Math.round(nx);
    const cz = Math.round(nz);
    const blockingKind = inBounds(cx, cz) ? world[cx][cz].kind : null;

    if (blockingKind) {
      if (e.type === 'kamikaze') {
        // Estalla al contacto con cualquier estructura.
        if (blockingKind === 'base') resources.damageBase(e.aoeDmg || BASE_HIT_DMG);
        else damageStructure(cx, cz, e.aoeDmg || BASE_HIT_DMG);
        explodeStructures(e);
        removeEnemy(e);
        continue;
      }
      // Resto: se detiene y ataca por segundo (Base o estructura).
      if (blockingKind === 'base') resources.damageBase(e.dmg * dt);
      else damageStructure(cx, cz, e.dmg * dt);
      // Pequeño "empuje" de ataque hacia el objetivo (cosmético).
      e.pulse += dt * 6;
      e.mesh.position.x = tilePos(e.pos.x, e.pos.z).x + (dx / d) * Math.sin(e.pulse) * 0.04;
      e.mesh.position.z = tilePos(e.pos.x, e.pos.z).z + (dz / d) * Math.sin(e.pulse) * 0.04;
      updateHpBar(e);
      continue; // no avanza mientras haya algo que destruir
    }

    // Avance normal (celda libre).
    e.pos.x = nx;
    e.pos.z = nz;
    const p = tilePos(e.pos.x, e.pos.z);
    e.mesh.position.set(p.x, GROUND, p.z);
    updateHpBar(e);
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
  else updateHpBar(e);
}

export function count() { return pool.length; }

export function clear() {
  for (const e of [...pool]) removeEnemy(e);
}

// -------- internos --------
// Salpicadura del kamikaze: daña estructuras (no-base) en un radio alrededor.
function explodeStructures(e) {
  const r = Math.max(1, Math.ceil(e.aoe));
  const cx = Math.round(e.pos.x);
  const cz = Math.round(e.pos.z);
  for (let x = cx - r; x <= cx + r; x++) {
    for (let z = cz - r; z <= cz + r; z++) {
      if (!inBounds(x, z)) continue;
      const k = world[x][z].kind;
      if (k && k !== 'base') damageStructure(x, z, e.aoeDmg || BASE_HIT_DMG);
    }
  }
}

function removeEnemy(e) {
  const idx = pool.indexOf(e);
  if (idx >= 0) pool.splice(idx, 1);
  worldGroup.remove(e.mesh);
  disposeGroup(e.mesh);
  if (e.hpBar) {
    worldGroup.remove(e.hpBar);
    disposeGroup(e.hpBar);
    e.hpBar.traverse((o) => { if (o.material) o.material.dispose(); });
    e.hpBar = null;
  }
}
