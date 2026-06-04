/* =====================================================================
   Aris — Titanium Wall factory
   makeWall(level): 0 basic, 1 reinforced (corner posts), 2 electrified
   (emissive strips + node). Slab grows taller at level >= 1.
   ===================================================================== */

import { castReceive, roundedBox } from '../geometry/shapes.js';
import { MM } from './marsMaterials.js';

export function makeWall(level = 0) {
  const g = new THREE.Group();
  const h = level === 0 ? 0.62 : 0.85;
  const w = 0.84, d = 0.84;

  const body = new THREE.Mesh(roundedBox(w, h, d, 0.05), MM.titanium);
  g.add(body);

  // dark cap rim
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.06, d + 0.02), MM.titaniumDark);
  cap.position.y = h;
  g.add(cap);

  if (level >= 1) {
    // corner reinforcement posts
    const postGeo = new THREE.BoxGeometry(0.12, h + 0.06, 0.12);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const p = new THREE.Mesh(postGeo, MM.steelDark);
      p.position.set(sx * (w / 2 - 0.04), (h + 0.06) / 2, sz * (d / 2 - 0.04));
      g.add(p);
    }
  }

  if (level >= 2) {
    // electrified strips on both long faces + a glowing node on top
    const stripGeo = new THREE.BoxGeometry(w + 0.04, 0.05, 0.05);
    const front = new THREE.Mesh(stripGeo, MM.electrified);
    front.position.set(0, h * 0.7, d / 2 + 0.01);
    g.add(front);
    const back = new THREE.Mesh(stripGeo, MM.electrified);
    back.position.set(0, h * 0.7, -d / 2 - 0.01);
    g.add(back);
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), MM.electrified);
    node.position.y = h + 0.12;
    g.add(node);
  }

  castReceive(g);
  g.userData = { kind: 'wall', level };
  return g;
}
