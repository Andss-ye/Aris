/* =====================================================================
   Aris — Enemigos. Dueño: JULIAN. (rama coliciones)
   Contrato 3.3: spawn/tick/list/damage/count/clear + barra de vida billboard.

   IA de objetivo: cada enemigo busca la ESTRUCTURA MÁS CERCANA (base, torre,
   muro, mina, reactor, hidropónica) y se dirige a ella; ataca lo que tenga más
   cerca. Al chocar, se DETIENE, gira sobre su propio eje para encarar el blanco
   y lo golpea (dmg/seg vía damageStructure; la Base vía resources.damageBase).
   El kamikaze estalla al contacto. Sin A*: avance vectorial al objetivo.
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

// Centro del mapa en coordenadas de grid (respaldo si no hay estructuras).
const CENTER = GRID / 2 - 0.5;
// Altura a la que "flotan/ruedan" los enemigos sobre el tile.
const GROUND = 0.18;

// Barra de vida.
const BAR_W = 0.5;
const BAR_H = 0.07;

const lam = (c, emissive = 0x000000) => new THREE.MeshLambertMaterial({ color: c, emissive });

function inBounds(x, z) { return x >= 0 && x < GRID && z >= 0 && z < GRID; }

// Interpola un ángulo hacia otro por el camino más corto.
function lerpAngle(a, b, t) {
  let diff = (b - a) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
}

// Aclara un color hex multiplicando sus canales (para acentos del alien).
function lighten(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * f));
  const b = Math.min(255, Math.round((hex & 255) * f));
  return (r << 16) | (g << 8) | b;
}

// -------- mallas por tipo --------
function makeEnemyMesh(type, cfg) {
  const g = new THREE.Group();
  const s = cfg.size;
  const accent = cfg.accent != null ? cfg.accent : cfg.color;
  const detail = cfg.detail != null ? cfg.detail : 0x111111;
  const glow = cfg.glow != null ? cfg.glow : 0x000000;

  if (type === 'tanque' || type === 'giant') {
    buildTank(g, s, cfg, accent, detail, type === 'giant');
  } else if (type === 'kamikaze') {
    buildKamikaze(g, s, cfg, accent, glow);
  } else {
    buildScout(g, s, cfg, accent, detail, glow);
  }

  castReceive(g);
  return g;
}

// -------- ALIEN scout: cabeza grande, ojos almendrados, brazos, espinas --------
// Frente del modelo = +Z (cara, ojos), para que la rotación lo encare al blanco.
function buildScout(g, s, cfg, accent, detail, glow) {
  const skin = lighten(cfg.color, 1.15);
  const skinDk = cfg.color;

  // piernas cortas
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.1, s * 0.07, s * 0.7, 8), lam(skinDk));
    leg.position.set(side * s * 0.26, s * 0.35, 0);
    g.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(s * 0.13, 8, 6), lam(skinDk));
    foot.scale.set(1, 0.6, 1.4);
    foot.position.set(side * s * 0.26, s * 0.06, s * 0.08);
    g.add(foot);
  }

  // torso tipo gota
  const torso = new THREE.Mesh(new THREE.SphereGeometry(s * 0.62, 16, 14), lam(skin));
  torso.scale.set(1, 1.25, 0.85);
  torso.position.y = s * 0.95;
  g.add(torso);

  // brazos delgados con manos
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.075, s * 0.05, s * 0.95, 8), lam(skin));
    arm.position.set(side * s * 0.55, s * 0.95, s * 0.05);
    arm.rotation.z = side * 0.55;
    arm.rotation.x = -0.25;
    g.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(s * 0.11, 8, 6), lam(skin));
    hand.position.set(side * s * 0.92, s * 0.55, s * 0.18);
    g.add(hand);
    // 3 deditos
    for (let f = -1; f <= 1; f++) {
      const fng = new THREE.Mesh(new THREE.ConeGeometry(s * 0.03, s * 0.16, 5), lam(skinDk));
      fng.position.set(side * s * 0.92 + f * s * 0.05, s * 0.46, s * 0.22);
      g.add(fng);
    }
  }

  // cuello
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.2, s * 0.3, s * 0.28, 8), lam(skin));
  neck.position.y = s * 1.5;
  g.add(neck);

  // cabeza grande alargada (cráneo alien)
  const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.8, 18, 16), lam(skin));
  head.scale.set(1, 1.18, 1.28);
  head.position.set(0, s * 2.05, -s * 0.04);
  g.add(head);

  // barbilla puntiaguda
  const chin = new THREE.Mesh(new THREE.ConeGeometry(s * 0.42, s * 0.55, 12), lam(skin));
  chin.rotation.x = Math.PI;
  chin.position.set(0, s * 1.78, s * 0.18);
  g.add(chin);

  // ojos almendrados grandes negros + brillo
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.32, 14, 12), lam(detail, 0x060606));
    eye.scale.set(0.5, 1.0, 0.32);
    eye.position.set(side * s * 0.34, s * 2.05, s * 0.66);
    eye.rotation.z = side * 0.55;
    eye.rotation.x = -0.18;
    g.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(s * 0.06, 6, 6), lam(0xffffff, 0x888888));
    glint.position.set(side * s * 0.4, s * 2.16, s * 0.78);
    g.add(glint);
  }

  // boca: pequeña hendidura
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(s * 0.32, s * 0.05, s * 0.06), lam(detail));
  mouth.position.set(0, s * 1.74, s * 0.56);
  g.add(mouth);

  // espinas dorsales emisivas
  for (let i = 0; i < 3; i++) {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(s * 0.11, s * 0.34, 6), lam(glow, glow));
    spine.position.set(0, s * (1.05 + i * 0.32), -s * 0.5 - i * s * 0.04);
    spine.rotation.x = -0.7;
    g.add(spine);
  }

  // antenas con punta emisiva sobre la cabeza
  for (const side of [-1, 1]) {
    const ant = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, s * 0.8, 6), lam(detail));
    stick.position.y = s * 0.4;
    ant.add(stick);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(s * 0.13, 8, 6), lam(glow, glow));
    tip.position.y = s * 0.8;
    ant.add(tip);
    ant.position.set(side * s * 0.3, s * 2.55, -s * 0.08);
    ant.rotation.z = -side * 0.4;
    g.add(ant);
  }
}

// -------- TANQUE / GIANT: blindaje, pinchos, torreta y cañón agresivos --------
// Frente del modelo = +Z (cañón), para que la rotación lo encare al blanco.
function buildTank(g, s, cfg, accent, detail, giant) {
  // chasis inferior oscuro
  const hull = new THREE.Mesh(new THREE.BoxGeometry(s * 2.1, s * 0.8, s * 2.3), lam(0x262b26));
  hull.position.y = s * 0.55;
  g.add(hull);

  // superestructura blindada
  const body = new THREE.Mesh(new THREE.BoxGeometry(s * 1.7, s * 0.85, s * 1.9), lam(cfg.color));
  body.position.y = s * 1.15;
  g.add(body);

  // placa frontal inclinada (glacis) + pinchos al frente
  const glacis = new THREE.Mesh(new THREE.BoxGeometry(s * 1.7, s * 0.7, s * 0.28), lam(accent));
  glacis.position.set(0, s * 1.0, s * 1.0);
  glacis.rotation.x = 0.5;
  g.add(glacis);
  for (let i = -1; i <= 1; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(s * 0.16, s * 0.6, 6), lam(detail));
    spike.rotation.x = Math.PI / 2;        // apunta +Z
    spike.position.set(i * s * 0.5, s * 1.02, s * 1.42);
    g.add(spike);
  }

  // pinchos laterales (fila por costado, apuntando hacia afuera)
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(s * 0.12, s * 0.46, 6), lam(detail));
      sp.rotation.z = -side * Math.PI / 2;
      sp.position.set(side * s * 0.92, s * 1.2, i * s * 0.6);
      g.add(sp);
    }
  }

  // torreta + corona de pinchos
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.7, s * 0.85, s * 0.7, 12), lam(0x36433a));
  turret.position.y = s * 1.82;
  g.add(turret);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(s * 0.1, s * 0.4, 6), lam(accent));
    sp.position.set(Math.cos(a) * s * 0.72, s * 1.98, Math.sin(a) * s * 0.72);
    sp.rotation.z = -Math.cos(a) * (Math.PI / 2);
    sp.rotation.x = Math.sin(a) * (Math.PI / 2);
    g.add(sp);
  }

  // sensor/ojo emisivo rojo al frente de la torreta
  const sensor = new THREE.Mesh(new THREE.SphereGeometry(s * 0.15, 10, 8), lam(0xff3322, 0xaa1100));
  sensor.position.set(0, s * 1.95, s * 0.42);
  g.add(sensor);

  // cañón largo al frente (+Z) + boca
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.16, s * 0.18, s * 1.8, 12), lam(detail));
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, s * 1.8, s * 1.15);
  g.add(barrel);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.22, s * 0.22, s * 0.26, 12), lam(0x161616));
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, s * 1.8, s * 2.05);
  g.add(muzzle);

  // orugas + ruedas + cubre-oruga
  for (const side of [-1, 1]) {
    const tread = new THREE.Mesh(new THREE.BoxGeometry(s * 0.55, s * 0.7, s * 2.5), lam(0x1c1c1c));
    tread.position.set(side * s * 1.05, s * 0.4, 0);
    g.add(tread);
    for (let i = -2; i <= 2; i++) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.3, s * 0.3, s * 0.2, 12), lam(0x3c3c3c));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * s * 1.05, s * 0.4, i * s * 0.55);
      g.add(wheel);
    }
    const fender = new THREE.Mesh(new THREE.BoxGeometry(s * 0.62, s * 0.12, s * 2.6), lam(accent));
    fender.position.set(side * s * 1.05, s * 0.82, 0);
    g.add(fender);
  }

  if (giant) {
    // cañones laterales extra
    for (const side of [-1, 1]) {
      const sb = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.1, s * 0.1, s * 1.2, 8), lam(detail));
      sb.rotation.x = Math.PI / 2;
      sb.position.set(side * s * 0.7, s * 1.45, s * 0.9);
      g.add(sb);
    }
    // cresta de pinchos dorsal
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(s * 0.14, s * 0.5, 6), lam(accent));
      sp.position.set(0, s * 1.7, -s * 0.4 - i * s * 0.35);
      sp.rotation.x = -0.5;
      g.add(sp);
    }
  }
}

// -------- KAMIKAZE: esfera roja + púas + núcleo emisivo (sin cambios) --------
function buildKamikaze(g, s, cfg, accent, glow) {
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
}

// -------- barra de vida (billboard) --------
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

// -------- objetivos: estructuras del mundo --------
function collectTargets() {
  const out = [];
  for (let x = 0; x < GRID; x++)
    for (let z = 0; z < GRID; z++)
      if (world[x][z].kind) out.push({ x, z });
  return out;
}

// Estructura más cercana al enemigo, con histéresis para no oscilar entre dos.
function pickTarget(e, targets) {
  let best = null, bestD = Infinity;
  for (const t of targets) {
    const ddx = t.x - e.pos.x, ddz = t.z - e.pos.z;
    const dd = ddx * ddx + ddz * ddz;
    if (dd < bestD) { bestD = dd; best = t; }
  }
  // mantener objetivo actual si sigue existiendo y no está mucho más lejos
  if (e.cur && inBounds(e.cur.x, e.cur.z) && world[e.cur.x][e.cur.z].kind) {
    const cdx = e.cur.x - e.pos.x, cdz = e.cur.z - e.pos.z;
    const cd = cdx * cdx + cdz * cdz;
    if (cd <= bestD * 1.4) return e.cur;
  }
  e.cur = best ? { x: best.x, z: best.z } : null;
  return e.cur;
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
    attack: 0,
    yaw: 0,
    cur: null,                    // celda objetivo actual (histéresis)
    barY: cfg.size * 3.2 + 0.28,
    hpBar: null,
  };
  e.hpBar = makeHpBar();
  pool.push(e);
  updateHpBar(e);
}

export function tick(dt) {
  const targets = collectTargets();

  for (const e of [...pool]) {
    // Latido visual del kamikaze (no afecta su posición en el grid).
    if (e.type === 'kamikaze') {
      e.pulse += dt * 8;
      e.mesh.scale.setScalar(1 + Math.sin(e.pulse) * 0.12);
    }

    // Objetivo: estructura más cercana (incluye la Base). Respaldo: centro.
    const tgt = pickTarget(e, targets);
    const aimX = tgt ? tgt.x : CENTER;
    const aimZ = tgt ? tgt.z : CENTER;
    const dx = aimX - e.pos.x;
    const dz = aimZ - e.pos.z;
    let d = Math.hypot(dx, dz);

    // Respaldo: si no hay estructuras y llega al centro, golpe a la base.
    if (!tgt && d < 0.5) {
      resources.damageBase(e.type === 'kamikaze' ? (e.aoeDmg || BASE_HIT_DMG) : BASE_HIT_DMG);
      if (e.type === 'kamikaze') explodeStructures(e);
      removeEnemy(e);
      continue;
    }
    if (d < 1e-4) d = 1;

    const step = e.speed * dt;
    const nx = e.pos.x + (dx / d) * step;
    const nz = e.pos.z + (dz / d) * step;

    // -------- COLISIÓN: ¿la celda a la que entra tiene una estructura? --------
    const cx = Math.round(nx);
    const cz = Math.round(nz);
    const blockingKind = inBounds(cx, cz) ? world[cx][cz].kind : null;

    if (blockingKind) {
      if (e.type === 'kamikaze') {
        if (blockingKind === 'base') resources.damageBase(e.aoeDmg || BASE_HIT_DMG);
        else damageStructure(cx, cz, e.aoeDmg || BASE_HIT_DMG);
        explodeStructures(e);
        removeEnemy(e);
        continue;
      }

      // Se detiene y ataca por segundo (Base o estructura).
      if (blockingKind === 'base') resources.damageBase(e.dmg * dt);
      else damageStructure(cx, cz, e.dmg * dt);

      // Gira sobre su eje para encarar el blanco + bamboleo/lunge de ataque.
      const fdx = cx - e.pos.x, fdz = cz - e.pos.z;
      const flen = Math.hypot(fdx, fdz) || 1;
      e.yaw = lerpAngle(e.yaw, Math.atan2(fdx, fdz), Math.min(1, dt * 14));
      e.attack += dt * 12;
      const lunge = Math.max(0, Math.sin(e.attack)) * 0.08;
      const base = tilePos(e.pos.x, e.pos.z);
      e.mesh.position.set(base.x + (fdx / flen) * lunge, GROUND, base.z + (fdz / flen) * lunge);
      e.mesh.rotation.y = e.yaw + Math.sin(e.attack) * 0.22;  // se voltea/golpea
      updateHpBar(e);
      continue; // no avanza mientras haya algo que destruir
    }

    // Avance normal (celda libre): mira hacia donde camina.
    e.pos.x = nx;
    e.pos.z = nz;
    const p = tilePos(e.pos.x, e.pos.z);
    e.mesh.position.set(p.x, GROUND, p.z);
    e.yaw = lerpAngle(e.yaw, Math.atan2(dx, dz), Math.min(1, dt * 8));
    e.mesh.rotation.y = e.yaw;
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
