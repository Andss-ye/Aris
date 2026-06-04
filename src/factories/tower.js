/* =====================================================================
   Aris — Plasma Tower factory
   makeTower(level): cylinder body + a rotating turret head exposed as
   userData.cannon so the combat vertical (Julian) can aim it at enemies.
   The silhouette escalates hard per level: taller body, more energy rings,
   aggressive spikes around the head, and a big plasma emitter at level 2.
   ===================================================================== */

import { castReceive } from '../geometry/shapes.js';
import { MM } from './marsMaterials.js';

const LEVELS = [
  { bodyH: 0.70, bodyR: 0.24, foundR: 0.40, rings: 1, spikes: 0, accent: MM.cyan,   barrelLen: 0.42, barrelR: 0.05 },
  { bodyH: 1.04, bodyR: 0.27, foundR: 0.46, rings: 2, spikes: 5, accent: MM.cyan,   barrelLen: 0.48, barrelR: 0.06 },
  { bodyH: 1.46, bodyR: 0.32, foundR: 0.54, rings: 3, spikes: 9, accent: MM.plasma, barrelLen: 0.56, barrelR: 0.08 },
];

function makeBarrel(zoff, len, r, barrelMat, tipMat) {
  const b = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), barrelMat);
  barrel.rotation.z = Math.PI / 2;        // lay along +x
  barrel.position.set(len / 2, 0.06, zoff);
  b.add(barrel);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 1.5, 10, 10), tipMat);
  tip.position.set(len + 0.02, 0.06, zoff);
  b.add(tip);
  return b;
}

export function makeTower(level = 0) {
  const g = new THREE.Group();
  const P = LEVELS[level] || LEVELS[0];

  // foundation
  const found = new THREE.Mesh(new THREE.CylinderGeometry(P.foundR * 0.85, P.foundR, 0.18, 12), MM.steelDark);
  found.position.y = 0.09;
  g.add(found);

  // body
  const bodyBase = 0.18;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(P.bodyR, P.bodyR * 1.25, P.bodyH, 12), MM.steel);
  body.position.y = bodyBase + P.bodyH / 2;
  g.add(body);

  // glowing energy rings up the body
  for (let i = 0; i < P.rings; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(P.bodyR + 0.05, 0.035, 8, 18), P.accent);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = bodyBase + P.bodyH * (0.32 + i * (0.6 / Math.max(P.rings, 1)));
    g.add(ring);
  }

  const headY = bodyBase + P.bodyH + 0.04;

  // aggressive spikes flaring out around the head base
  for (let i = 0; i < P.spikes; i++) {
    const a = (i / P.spikes) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 6), MM.steelDark);
    spike.position.set(Math.cos(a) * (P.bodyR + 0.04), headY - 0.06, Math.sin(a) * (P.bodyR + 0.04));
    spike.rotation.z = -Math.cos(a) * 0.6;
    spike.rotation.x = Math.sin(a) * 0.6;
    g.add(spike);
  }

  // rotating turret head (the cannon)
  const head = new THREE.Group();
  head.position.y = headY;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(P.bodyR * 0.85, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    MM.steelMid,
  );
  head.add(dome);

  const barrelMat = MM.steelDark;
  const tipMat = P.accent;
  if (level === 0) {
    head.add(makeBarrel(0, P.barrelLen, P.barrelR, barrelMat, tipMat));
  } else if (level === 1) {
    head.add(makeBarrel(-0.1, P.barrelLen, P.barrelR, barrelMat, tipMat));
    head.add(makeBarrel(0.1, P.barrelLen, P.barrelR, barrelMat, tipMat));
  } else {
    // big plasma emitter with side prongs
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, P.barrelLen, 12), barrelMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(P.barrelLen / 2, 0.06, 0);
    head.add(barrel);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), MM.plasma);
    orb.position.set(P.barrelLen + 0.04, 0.06, 0);
    head.add(orb);
    for (const s of [-1, 1]) {
      const prong = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.34, 6), MM.plasma);
      prong.rotation.z = -Math.PI / 2;
      prong.position.set(P.barrelLen * 0.72, 0.06, s * 0.13);
      head.add(prong);
    }
  }
  g.add(head);

  // emitter glow light (brighter for the level-2 plasma)
  const light = new THREE.PointLight(level >= 2 ? 0x46e0ff : 0x27e0d0, level >= 2 ? 1.4 : 0.6, level >= 2 ? 3.0 : 1.8, 2);
  light.position.y = headY + 0.12;
  light.userData.baseIntensity = light.intensity;
  light.userData.phase = Math.random() * Math.PI * 2;
  g.add(light);

  castReceive(g);
  g.userData = { kind: 'tower', level, cannon: head, lights: [light] };
  return g;
}
