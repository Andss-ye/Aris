/* =====================================================================
   Aris — Hidropónica (opcional). Dueño: JONATHAN.
   PLACEHOLDER de Fase 0: cubo verde + plantas estilizadas (cilindros).
   ===================================================================== */

import { roundedBox, castReceive } from '../geometry/shapes.js';

const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

export function makeHydroponics(level = 0) {
  const g = new THREE.Group();
  g.userData.kind = 'hydroponics';

  const tank = new THREE.Mesh(roundedBox(0.7, 0.35, 0.7, 0.08), lam(0x2f6b4f));
  tank.position.y = 0.18;
  g.add(tank);

  const leafColor = level >= 1 ? 0x6fe05a : 0x4caf50;
  for (let i = 0; i < 3; i++) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6), lam(leafColor));
    stalk.position.set((i - 1) * 0.18, 0.45, (i % 2) * 0.12 - 0.06);
    g.add(stalk);
  }

  if (level >= 2) {
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.03, 6, 16),
      new THREE.MeshLambertMaterial({ color: 0x88ffcc, emissive: 0x33cc99, emissiveIntensity: 0.7 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.62;
    g.add(halo);
  }

  castReceive(g);
  return g;
}
