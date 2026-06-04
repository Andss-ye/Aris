/* =====================================================================
   Aris — nature object factories (tree, crop, tuft)
   Small decorative props. Each tags userData.kind (+ animation phase) so the
   main loop can sway/bob/wiggle them.
   ===================================================================== */

import { roundedBox, castReceive } from '../geometry/shapes.js';
import { M } from '../materials/materials.js';

export function makeTree() {
  const g = new THREE.Group();

  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), M.trunk);
  trunk.position.y = 0.25;
  g.add(trunk);

  const lower = new THREE.Mesh(roundedBox(0.62, 0.42, 0.62, 0.08), M.leaves);
  lower.position.y = 0.5;
  g.add(lower);

  const upper = new THREE.Mesh(roundedBox(0.42, 0.32, 0.42, 0.06), M.leaves);
  upper.position.y = 0.92;
  g.add(upper);

  const tip = new THREE.Mesh(roundedBox(0.22, 0.18, 0.22, 0.04), M.leaves);
  tip.position.y = 1.18;
  g.add(tip);

  g.userData = { kind: 'tree', swayPhase: Math.random() * Math.PI * 2 };
  castReceive(g);
  return g;
}

export function makeCrop() {
  const g = new THREE.Group();
  const positions = [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]];
  positions.forEach(([x, z], i) => {
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), M.cropStem);
    stem.position.set(x, 0.06, z);
    g.add(stem);
    const leaf = new THREE.Mesh(roundedBox(0.18, 0.16, 0.18, 0.04), M.cropLeaf);
    leaf.position.set(x, 0.16, z);
    leaf.rotation.y = i * 0.4;
    g.add(leaf);
  });
  g.userData = { kind: 'crop', bobPhase: Math.random() * Math.PI * 2 };
  castReceive(g);
  return g;
}

export function makeTuft() {
  const g = new THREE.Group();
  const positions = [[0, 0], [0.08, 0.06], [-0.07, 0.04], [0.03, -0.08], [-0.04, -0.05]];
  positions.forEach(([x, z]) => {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1 + Math.random() * 0.04, 0.05), M.leaves);
    blade.position.set(x, blade.geometry.parameters.height / 2, z);
    g.add(blade);
  });
  g.userData = { kind: 'tuft' };
  castReceive(g);
  return g;
}
