/* =====================================================================
   Aris — fence factory (adjacency-aware)
   Posts/rails merge across neighbouring fence cells: shared corner posts and
   the rail between two fenced cells are dropped so a run reads as one fence.
   ===================================================================== */

import { castReceive } from '../geometry/shapes.js';
import { M } from '../materials/materials.js';

export function makeFence(neighbors) {
  neighbors = neighbors || { n: false, s: false, e: false, w: false };
  const g = new THREE.Group();
  const postGeo = new THREE.BoxGeometry(0.09, 0.32, 0.09);

  // Drop a corner post if either of its two adjacent sides has a fence neighbour
  // (the neighbour cell's own corner post sits right next to it, so we'd get
  // chunky double-posts at every cell boundary in a run).
  const corners = [
    [-0.4, -0.4, neighbors.n || neighbors.w], // NW
    [ 0.4, -0.4, neighbors.n || neighbors.e], // NE
    [-0.4,  0.4, neighbors.s || neighbors.w], // SW
    [ 0.4,  0.4, neighbors.s || neighbors.e], // SE
  ];
  for (const [px, pz, drop] of corners) {
    if (drop) continue;
    const p = new THREE.Mesh(postGeo, M.fence);
    p.position.set(px, 0.16, pz);
    g.add(p);
  }

  // Rails on each side, skipped where a neighbour exists (run merges cleanly).
  const railH = new THREE.BoxGeometry(0.72, 0.06, 0.06); // along x (north/south sides)
  const railV = new THREE.BoxGeometry(0.06, 0.06, 0.72); // along z (west/east sides)
  if (!neighbors.n) {
    const a = new THREE.Mesh(railH, M.fence); a.position.set(0, 0.24, -0.4); g.add(a);
    const b = new THREE.Mesh(railH, M.fence); b.position.set(0, 0.08, -0.4); g.add(b);
  }
  if (!neighbors.s) {
    const a = new THREE.Mesh(railH, M.fence); a.position.set(0, 0.24,  0.4); g.add(a);
    const b = new THREE.Mesh(railH, M.fence); b.position.set(0, 0.08,  0.4); g.add(b);
  }
  if (!neighbors.w) {
    const a = new THREE.Mesh(railV, M.fence); a.position.set(-0.4, 0.24, 0); g.add(a);
    const b = new THREE.Mesh(railV, M.fence); b.position.set(-0.4, 0.08, 0); g.add(b);
  }
  if (!neighbors.e) {
    const a = new THREE.Mesh(railV, M.fence); a.position.set( 0.4, 0.24, 0); g.add(a);
    const b = new THREE.Mesh(railV, M.fence); b.position.set( 0.4, 0.08, 0); g.add(b);
  }

  g.userData = { kind: 'fence' };
  castReceive(g);
  return g;
}
