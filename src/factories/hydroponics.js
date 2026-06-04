/* =====================================================================
   Aris — Hydroponics factory  (optional support structure)
   makeHydroponics(level): nutrient tank + glowing plants.
   0 open bed, 1 glass dome + more plants, 2 nanobot orbs orbiting.
   ===================================================================== */

import { castReceive, roundedBox } from '../geometry/shapes.js';
import { MM } from './marsMaterials.js';

export function makeHydroponics(level = 0) {
  const g = new THREE.Group();
  const h = 0.34;

  const tank = new THREE.Mesh(roundedBox(0.66, h, 0.66, 0.06), MM.steelMid);
  g.add(tank);

  // glowing nutrient bed
  const bed = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.56), MM.bio);
  bed.position.y = h;
  g.add(bed);

  // stylized plants
  const nPlants = level === 0 ? 3 : 5;
  for (let i = 0; i < nPlants; i++) {
    const px = (Math.random() - 0.5) * 0.4;
    const pz = (Math.random() - 0.5) * 0.4;
    const stalk = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 6), MM.leafMars);
    stalk.position.set(px, h + 0.06 + 0.13, pz);
    g.add(stalk);
  }

  if (level >= 1) {
    // translucent grow dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      MM.glass,
    );
    dome.position.y = h + 0.02;
    g.add(dome);
  }

  if (level >= 2) {
    // orbiting nanobot repair drones
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), MM.cyan);
      orb.position.set(Math.cos(a) * 0.3, h + 0.3, Math.sin(a) * 0.3);
      g.add(orb);
    }
  }

  // soft bio glow light
  const light = new THREE.PointLight(0x4fe06a, 0.45, 1.6, 2);
  light.position.y = h + 0.22;
  light.userData.baseIntensity = 0.45;
  light.userData.phase = Math.random() * Math.PI * 2;
  g.add(light);

  castReceive(g);
  g.userData = { kind: 'hydroponics', level, lights: [light] };
  return g;
}
