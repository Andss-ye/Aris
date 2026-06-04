/* =====================================================================
   Aris — tile factory
   Builds a single ground tile (dirt block + terrain-colored cap) with subtle
   per-terrain decoration.
   ===================================================================== */

import { TILE, TOP_H, DIRT_H } from '../config/constants.js';
import { roundedSlab, castReceive } from '../geometry/shapes.js';
import { M } from '../materials/materials.js';

// Materiales marcianos locales (no toco la paleta congelada materials.js).
const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
const MARS = {
  rock_mars:       lam(0xc1502e), // roca rojo-naranja (default)
  dust:            lam(0xc99a6a), // polvo marrón claro
  crater:          lam(0x5a534e), // cráter gris oscuro
  iron_deposit:    lam(0x8f9aa2), // depósito metálico
  crystal_deposit: lam(0x7a5cc4), // cristal azul-violeta
  sub:             lam(0x7a3a22), // bloque de tierra bajo el tile
};

export function makeTile(terrain) {
  const g = new THREE.Group();
  g.userData = { kind: 'tile', terrain };

  // bloque de subsuelo (lados + fondo del tile)
  const dirt = new THREE.Mesh(roundedSlab(TILE * 0.98, DIRT_H, 0.06), MARS.sub);
  dirt.position.y = -DIRT_H;
  g.add(dirt);

  // tapa superior según terreno
  const topMat = MARS[terrain] || MARS.rock_mars;
  const top = new THREE.Mesh(roundedSlab(TILE * 0.98, TOP_H, 0.06), topMat);
  top.position.y = 0;
  g.add(top);

  // depósitos: cristal/mineral sobresaliendo para señalizar el tile
  if (terrain === 'iron_deposit') {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16), lam(0xb8c0c8));
    rock.position.set(0, TOP_H + 0.08, 0);
    g.add(rock);
  } else if (terrain === 'crystal_deposit') {
    const cry = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 5),
      new THREE.MeshLambertMaterial({ color: 0xa37cff, emissive: 0x5530aa, emissiveIntensity: 0.5 }));
    cry.position.set(0, TOP_H + 0.17, 0);
    g.add(cry);
  } else if (terrain === 'rock_mars' && Math.random() < 0.12) {
    const fleck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06), lam(0x9c3f22));
    fleck.position.set((Math.random() - 0.5) * 0.6, TOP_H + 0.01, (Math.random() - 0.5) * 0.6);
    g.add(fleck);
  }

  castReceive(g);
  return g;
}
