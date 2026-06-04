/* =====================================================================
   Aris — Reactor de Energía. Dueño: JONATHAN.
   PLACEHOLDER de Fase 0: núcleo metálico + antena. Se coloca sobre
   crystal_deposit. Niveles añaden brillo del núcleo.
   ===================================================================== */

import { roundedBox, castReceive } from '../geometry/shapes.js';

const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

export function makeReactor(level = 0) {
  const g = new THREE.Group();
  g.userData.kind = 'reactor';

  const body = new THREE.Mesh(roundedBox(0.7, 0.45, 0.7, 0.08), lam(0x4a5560));
  body.position.y = 0.22;
  g.add(body);

  const glowI = 0.4 + level * 0.4;
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0x66ddff, emissive: 0x22aaff, emissiveIntensity: glowI })
  );
  core.position.y = 0.55;
  g.add(core);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), lam(0xbbbbbb));
  antenna.position.set(0.22, 0.55, 0);
  g.add(antenna);

  castReceive(g);
  return g;
}
