/* =====================================================================
   Aris — Torre de Plasma. Dueño: JONATHAN.
   PLACEHOLDER de Fase 0: base + cabeza + cañón en pivote. combat.js rota
   `userData.cannon` (Group) en Y para apuntar. level 2 tiñe el cañón (AOE).
   ===================================================================== */

import { castReceive } from '../geometry/shapes.js';

const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

export function makeTower(level = 0) {
  const g = new THREE.Group();
  g.userData.kind = 'tower';

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.5, 12), lam(0x8b939c));
  base.position.y = 0.25;
  g.add(base);

  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 12), lam(0x6b7480));
  head.position.y = 0.6;
  g.add(head);

  const cannon = new THREE.Group();
  cannon.position.y = 0.6;
  const barrelColor = level >= 2 ? 0x8e44ad : (level >= 1 ? 0x3aa0d0 : 0x4a90c2);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), lam(barrelColor));
  barrel.position.z = 0.26;
  cannon.add(barrel);
  g.add(cannon);
  g.userData.cannon = cannon;

  castReceive(g);
  return g;
}
