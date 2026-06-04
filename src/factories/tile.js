/* =====================================================================
   Aris — tile factory (Mars reskin)
   Builds a single ground tile (rusty dirt block + terrain-colored cap) with
   per-terrain decoration. Resource deposits get emissive accents so they read
   as "build here" targets for mines/reactors.
   ===================================================================== */

import { TILE, TOP_H, DIRT_H } from '../config/constants.js';
import { roundedSlab, castReceive } from '../geometry/shapes.js';
import { MM } from './marsMaterials.js';

export function makeTile(terrain) {
  const g = new THREE.Group();
  g.userData = { kind: 'tile', terrain };

  // dirt block (sides + bottom of tile) — Martian sub-surface
  const dirt = new THREE.Mesh(roundedSlab(TILE * 0.98, DIRT_H, 0.06), MM.rockMarsSide);
  dirt.position.y = -DIRT_H;
  g.add(dirt);

  // top cap colored by terrain
  let topMat = MM.rockMars;
  if (terrain === 'dust')            topMat = MM.dust;
  else if (terrain === 'crater')     topMat = MM.crater;
  else if (terrain === 'iron_deposit')    topMat = MM.ironDeposit;
  else if (terrain === 'crystal_deposit') topMat = MM.crystalDep;

  const top = new THREE.Mesh(roundedSlab(TILE * 0.98, TOP_H, 0.06), topMat);
  top.position.y = 0;
  g.add(top);

  // tiny rocky flecks on plain Martian rock (subtle variation)
  if (terrain === 'rock_mars' && Math.random() < 0.2) {
    const fleck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.06), MM.crater);
    fleck.position.set((Math.random() - 0.5) * 0.6, TOP_H + 0.02, (Math.random() - 0.5) * 0.6);
    g.add(fleck);
  }

  // iron deposit: a few metallic ore nuggets clustered on the surface
  if (terrain === 'iron_deposit') {
    for (let i = 0; i < 4; i++) {
      const nug = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09 + Math.random() * 0.04, 0), MM.steel);
      nug.position.set((Math.random() - 0.5) * 0.55, TOP_H + 0.05, (Math.random() - 0.5) * 0.55);
      nug.rotation.set(Math.random(), Math.random(), Math.random());
      g.add(nug);
    }
  }

  // crystal deposit: glowing violet shards poking up + a soft light
  if (terrain === 'crystal_deposit') {
    for (let i = 0; i < 3; i++) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.26 + Math.random() * 0.12, 5), MM.crystalDep);
      shard.position.set((Math.random() - 0.5) * 0.45, TOP_H + 0.12, (Math.random() - 0.5) * 0.45);
      shard.rotation.z = (Math.random() - 0.5) * 0.4;
      shard.rotation.x = (Math.random() - 0.5) * 0.4;
      g.add(shard);
    }
    const light = new THREE.PointLight(0x7d5fe6, 0.7, 1.8, 2);
    light.position.set(0, TOP_H + 0.3, 0);
    light.userData.baseIntensity = 0.7;
    light.userData.phase = Math.random() * Math.PI * 2;
    g.add(light);
    g.userData.lights = [light];
  }

  castReceive(g);
  return g;
}
