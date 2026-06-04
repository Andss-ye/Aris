/* =====================================================================
   Aris — Mina de Hierro. Dueño: JONATHAN.
   PLACEHOLDER de Fase 0: bloque industrial + taladro. Se coloca sobre
   iron_deposit (no tapa el tile, lo overlaya).
   ===================================================================== */

import { roundedBox, castReceive } from '../geometry/shapes.js';

const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

export function makeMine(level = 0) {
  const g = new THREE.Group();
  g.userData.kind = 'mine';

  const body = new THREE.Mesh(roundedBox(0.7, 0.4, 0.7, 0.06), lam(level >= 1 ? 0x9c6b3a : 0x7d5a32));
  body.position.y = 0.2;
  g.add(body);

  const drill = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 8), lam(0xc8c8c8));
  drill.rotation.x = Math.PI;
  drill.position.y = 0.55;
  g.add(drill);

  if (level >= 2) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.2), lam(0xffaa33));
    cap.position.y = 0.46;
    g.add(cap);
  }

  castReceive(g);
  return g;
}
