/* =====================================================================
   Aris — Base Principal (2×2). Dueño: JONATHAN.
   PLACEHOLDER de Fase 0: cuerpo + domo marciano. level 1 = blindaje (más claro),
   level 2 = torreta integrada (expone userData.cannon para que combat la rote).
   ===================================================================== */

import { roundedBox, castReceive } from '../geometry/shapes.js';

const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

export function makeBase(level = 0) {
  const g = new THREE.Group();
  g.userData.kind = 'base';

  const wallColor = level >= 1 ? 0x9aa4b0 : 0x82888f;
  const body = new THREE.Mesh(roundedBox(1.7, 0.7, 1.7, 0.12), lam(wallColor));
  body.position.y = 0.35;
  g.add(body);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    lam(0xb5651d)
  );
  dome.position.y = 0.68;
  g.add(dome);

  if (level >= 2) {
    const cannon = new THREE.Group();
    cannon.position.y = 1.45;
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.55), lam(0x556270));
    barrel.position.z = 0.28;
    cannon.add(barrel);
    g.add(cannon);
    g.userData.cannon = cannon;
  }

  castReceive(g);
  return g;
}
