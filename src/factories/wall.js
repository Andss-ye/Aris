/* =====================================================================
   Aris — Muro de Titanio. Dueño: JONATHAN.
   PLACEHOLDER de Fase 0: slab alto. level 1 más alto/grueso, level 2
   electrificado (línea luminosa emisiva).
   ===================================================================== */

import { roundedBox, castReceive } from '../geometry/shapes.js';

const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

export function makeWall(level = 0) {
  const g = new THREE.Group();
  g.userData.kind = 'wall';

  const h = level >= 1 ? 0.9 : 0.7;
  const slab = new THREE.Mesh(roundedBox(0.78, h, 0.78, 0.08), lam(level >= 1 ? 0x4a4f57 : 0x5a606a));
  slab.position.y = h / 2;
  g.add(slab);

  if (level >= 2) {
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.06, 0.82),
      new THREE.MeshLambertMaterial({ color: 0x33ccff, emissive: 0x1188cc, emissiveIntensity: 0.9 })
    );
    glow.position.y = h * 0.7;
    g.add(glow);
  }

  castReceive(g);
  return g;
}
