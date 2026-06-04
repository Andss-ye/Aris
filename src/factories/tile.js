/* =====================================================================
   Aris — tile factory
   Builds a single ground tile (dirt block + terrain-colored cap) with subtle
   per-terrain decoration.
   ===================================================================== */

import { TILE, TOP_H, DIRT_H } from '../config/constants.js';
import { roundedSlab, castReceive } from '../geometry/shapes.js';
import { M } from '../materials/materials.js';

export function makeTile(terrain) {
  const g = new THREE.Group();
  g.userData = { kind: 'tile', terrain };

  // dirt block (sides + bottom of tile)
  const dirt = new THREE.Mesh(roundedSlab(TILE * 0.98, DIRT_H, 0.06), M.dirt);
  dirt.position.y = -DIRT_H;
  g.add(dirt);

  // top cap
  let topMat = M.grass;
  if (terrain === 'path')  topMat = M.path;
  if (terrain === 'water') topMat = M.water;
  if (terrain === 'dirt')  topMat = M.dirtRich;

  const top = new THREE.Mesh(roundedSlab(TILE * 0.98, TOP_H, 0.06), topMat);
  top.position.y = 0;
  g.add(top);

  // tiny grass details on grass tiles (very subtle)
  if (terrain === 'grass' && Math.random() < 0.18) {
    const fleck = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.04, 0.05),
      M.leavesDk
    );
    fleck.position.set((Math.random() - 0.5) * 0.6, TOP_H + 0.01, (Math.random() - 0.5) * 0.6);
    g.add(fleck);
  }

  // path scuff: little dimple on path tiles
  if (terrain === 'path') {
    const scuff = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.02, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xd4be8c, roughness: 0.95 })
    );
    scuff.position.set((Math.random() - 0.5) * 0.4, TOP_H + 0.005, (Math.random() - 0.5) * 0.4);
    g.add(scuff);
  }

  castReceive(g);
  return g;
}
