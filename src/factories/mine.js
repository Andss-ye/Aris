/* =====================================================================
   Aris — Iron Mine factory  (sits on an iron_deposit tile)
   makeMine(level): industrial housing + downward drill. The rig escalates
   per level: a taller drilling derrick, explosive canisters, base spikes and
   a glowing crystal byproduct at level 2.
   ===================================================================== */

import { castReceive, roundedBox } from '../geometry/shapes.js';
import { MM } from './marsMaterials.js';

const LEVELS = [
  { bodyH: 0.42, drillH: 0.34, drillR: 0.10, derrick: 0.00, cans: 0, spikes: 0 },
  { bodyH: 0.50, drillH: 0.52, drillR: 0.14, derrick: 0.70, cans: 0, spikes: 3 },
  { bodyH: 0.58, drillH: 0.66, drillR: 0.17, derrick: 1.05, cans: 2, spikes: 5 },
];

export function makeMine(level = 0) {
  const g = new THREE.Group();
  const L = LEVELS[level] || LEVELS[0];

  const body = new THREE.Mesh(roundedBox(0.66, L.bodyH, 0.66, 0.05), MM.steelMid);
  g.add(body);

  // top machinery housing
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.42), MM.steelDark);
  housing.position.y = L.bodyH + 0.09;
  g.add(housing);

  // drill bit pointing down into the deposit at the front edge
  const drill = new THREE.Mesh(new THREE.ConeGeometry(L.drillR, L.drillH, 8), MM.drill);
  drill.rotation.x = Math.PI;            // point down
  drill.position.set(0, L.drillH / 2 - 0.02, 0.3);
  g.add(drill);

  // exhaust pipe
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 8), MM.rust);
  pipe.position.set(-0.24, L.bodyH + 0.17, -0.18);
  g.add(pipe);

  // drilling derrick tower (taller each upgrade)
  if (L.derrick > 0) {
    const baseY = L.bodyH + 0.18;
    const frame = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.24, L.derrick, 4, 1, true),
      MM.steelDark,
    );
    frame.position.y = baseY + L.derrick / 2;
    g.add(frame);
    for (let i = 0; i < 3; i++) {
      const brace = new THREE.Mesh(new THREE.TorusGeometry(0.14 - i * 0.035, 0.018, 6, 4), MM.steel);
      brace.rotation.x = Math.PI / 2;
      brace.position.y = baseY + L.derrick * (0.25 + i * 0.3);
      g.add(brace);
    }
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 14), MM.hazard);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.y = baseY + L.derrick + 0.02;
    g.add(wheel);
  }

  // explosive canisters (level 2)
  for (let i = 0; i < L.cans; i++) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 10), MM.hazard);
    can.position.set(i === 0 ? -0.22 : 0.22, L.bodyH + 0.11, -0.22);
    g.add(can);
  }

  // base spikes
  for (let i = 0; i < L.spikes; i++) {
    const a = (i / Math.max(L.spikes, 1)) * Math.PI * 2 + 0.4;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 6), MM.steelDark);
    sp.position.set(Math.cos(a) * 0.34, 0.12, Math.sin(a) * 0.34);
    sp.rotation.z = -Math.cos(a) * 0.7;
    sp.rotation.x = Math.sin(a) * 0.7;
    g.add(sp);
  }

  const lights = [];
  if (level >= 2) {
    // crystal byproduct that glows
    const cry = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), MM.crystalDep);
    cry.position.set(0.26, L.bodyH + 0.2, 0.22);
    g.add(cry);
    const light = new THREE.PointLight(0x7d5fe6, 0.6, 1.6, 2);
    light.position.set(0.26, L.bodyH + 0.25, 0.22);
    light.userData.baseIntensity = 0.6;
    light.userData.phase = Math.random() * Math.PI * 2;
    g.add(light);
    lights.push(light);
  }

  castReceive(g);
  g.userData = { kind: 'mine', level, lights };
  return g;
}
