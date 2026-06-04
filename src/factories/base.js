/* =====================================================================
   Aris — Base Principal factory (2x2 command dome — the objective)
   makeBase(level): hull walls + dome + emissive viewports + beacon mast.
   0 base, 1 blindaje (corner armor pillars), 2 integrated turret on the dome
   (exposed as userData.turret for the combat vertical).
   Rendered centred between the 4 anchor cells by world/render.js.
   ===================================================================== */

import { TILE } from '../config/constants.js';
import { castReceive, roundedBox } from '../geometry/shapes.js';
import { MM } from './marsMaterials.js';

export function makeBase(level = 0) {
  const g = new THREE.Group();
  const SIDE = 2 * TILE - 0.2;     // ~1.8, fits inside the 2x2 footprint
  const half = SIDE / 2;
  const wallH = 0.7;

  // hull walls
  const walls = new THREE.Mesh(roundedBox(SIDE, wallH, SIDE, 0.08), MM.hull);
  g.add(walls);

  // base rim
  const rim = new THREE.Mesh(new THREE.BoxGeometry(SIDE + 0.06, 0.1, SIDE + 0.06), MM.steelDark);
  rim.position.y = 0.05;
  g.add(rim);

  // dome roof
  const domeR = half * 0.92;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(domeR, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    MM.steel,
  );
  dome.position.y = wallH;
  g.add(dome);

  // emissive viewport strips on the 4 faces
  const stripGeo = new THREE.BoxGeometry(SIDE * 0.7, 0.14, 0.04);
  const faces = [
    { pos: [0, wallH * 0.55, half + 0.01], rot: 0 },
    { pos: [0, wallH * 0.55, -half - 0.01], rot: 0 },
    { pos: [half + 0.01, wallH * 0.55, 0], rot: Math.PI / 2 },
    { pos: [-half - 0.01, wallH * 0.55, 0], rot: Math.PI / 2 },
  ];
  for (const f of faces) {
    const s = new THREE.Mesh(stripGeo, MM.cyan);
    s.position.set(f.pos[0], f.pos[1], f.pos[2]);
    s.rotation.y = f.rot;
    g.add(s);
  }

  // beacon mast on top of the dome
  const apex = wallH + domeR;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), MM.steel);
  mast.position.y = apex + 0.2;
  g.add(mast);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), MM.hazard);
  beacon.position.y = apex + 0.42;
  g.add(beacon);

  if (level >= 1) {
    // blindaje: corner armor pillars
    const pillGeo = new THREE.BoxGeometry(0.22, wallH + 0.12, 0.22);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const p = new THREE.Mesh(pillGeo, MM.steelDark);
      p.position.set(sx * (half - 0.04), (wallH + 0.12) / 2, sz * (half - 0.04));
      g.add(p);
    }
  }

  let turret = null;
  if (level >= 2) {
    // integrated turret seated on the dome apex
    turret = new THREE.Group();
    turret.position.y = apex - 0.04;
    const tBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      MM.steelMid,
    );
    turret.add(tBody);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 10), MM.steelDark);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.2, 0.05, 0);
    turret.add(barrel);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), MM.plasma);
    tip.position.set(0.42, 0.05, 0);
    turret.add(tip);
    g.add(turret);
  }

  // beacon light on top + a soft interior glow from the viewports
  const beaconLight = new THREE.PointLight(0xffc23a, 0.9, 3.0, 2);
  beaconLight.position.y = apex + 0.42;
  beaconLight.userData.baseIntensity = 0.9;
  beaconLight.userData.phase = 0;
  g.add(beaconLight);
  const glowLight = new THREE.PointLight(0x27e0d0, 0.5, 2.4, 2);
  glowLight.position.y = wallH * 0.55;
  glowLight.userData.baseIntensity = 0.5;
  glowLight.userData.phase = Math.PI;
  g.add(glowLight);

  castReceive(g);
  g.userData = { kind: 'base', level, turret, lights: [beaconLight, glowLight] };
  return g;
}
