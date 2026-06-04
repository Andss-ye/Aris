/* =====================================================================
   Aris — Energy Reactor factory  (sits on a crystal_deposit tile)
   makeReactor(level): caged glowing core + antenna. The reactor grows taller
   and more powerful per level: bigger core, cooling fins, fusion rings, and a
   ring of glowing plasma rods/spikes at level 2.
   ===================================================================== */

import { castReceive, roundedBox } from '../geometry/shapes.js';
import { MM } from './marsMaterials.js';

const LEVELS = [
  { bodyH: 0.50, coreR: 0.11, fins: 0, rings: 0, rods: 0, antenna: 0.30 },
  { bodyH: 0.68, coreR: 0.15, fins: 3, rings: 1, rods: 0, antenna: 0.42 },
  { bodyH: 0.90, coreR: 0.20, fins: 4, rings: 2, rods: 6, antenna: 0.58 },
];

export function makeReactor(level = 0) {
  const g = new THREE.Group();
  const L = LEVELS[level] || LEVELS[0];
  const h = L.bodyH;

  const body = new THREE.Mesh(roundedBox(0.6, h, 0.6, 0.05), MM.steelMid);
  g.add(body);

  // glowing core column
  const core = new THREE.Mesh(new THREE.CylinderGeometry(L.coreR, L.coreR, h * 0.85, 14), MM.reactorCore);
  core.position.y = h * 0.5;
  g.add(core);

  // dark frame ribs so the glow reads as enclosed
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, h + 0.02, 0.62), MM.steelDark);
    rib.rotation.y = a;
    rib.position.y = h / 2;
    g.add(rib);
  }

  // top cap + antenna with a cyan tip
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.1, 14), MM.steelDark);
  cap.position.y = h + 0.05;
  g.add(cap);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, L.antenna, 6), MM.steel);
  ant.position.y = h + 0.05 + L.antenna / 2;
  g.add(ant);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), MM.cyan);
  tip.position.y = h + 0.05 + L.antenna + 0.04;
  g.add(tip);

  // cooling fins climbing the body
  for (let i = 0; i < L.fins; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.035, 0.16), MM.steel);
    fin.position.y = 0.14 + i * (h * 0.62 / Math.max(L.fins, 1));
    g.add(fin);
  }

  // fusion rings near the top
  for (let i = 0; i < L.rings; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3 - i * 0.05, 0.03, 8, 20), MM.reactorCore);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = h * (0.5 + i * 0.22);
    g.add(ring);
  }

  // ring of glowing plasma rods/spikes (level 2 — aggressive)
  for (let i = 0; i < L.rods; i++) {
    const a = (i / L.rods) * Math.PI * 2;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h * 0.8, 6), MM.plasma);
    rod.position.set(Math.cos(a) * 0.34, h * 0.45, Math.sin(a) * 0.34);
    g.add(rod);
    const cap2 = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), MM.plasma);
    cap2.position.set(Math.cos(a) * 0.34, h * 0.85 + 0.07, Math.sin(a) * 0.34);
    g.add(cap2);
  }

  // core glow light (intensifies with level)
  const light = new THREE.PointLight(0x36c8ff, 0.6 + level * 0.5, 2.4 + level * 0.4, 2);
  light.position.y = h * 0.5;
  light.userData.baseIntensity = light.intensity;
  light.userData.phase = Math.random() * Math.PI * 2;
  g.add(light);

  castReceive(g);
  g.userData = { kind: 'reactor', level, lights: [light] };
  return g;
}
