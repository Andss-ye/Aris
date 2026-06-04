/* =====================================================================
   Aris — chimney smoke particles
   Spawns short-lived rising puffs from each house's chimney tops and fades
   them out. Particles live directly on the scene (not worldGroup) so resets
   don't disturb in-flight smoke.
   ===================================================================== */

import { scene } from '../core/engine.js';

const smokeMat = new THREE.MeshBasicMaterial({ color: 0xd4cfc2, transparent: true, opacity: 0.65, depthWrite: false });
const smokeGeo = new THREE.SphereGeometry(0.06, 6, 6);
const smokeParticles = [];

export function spawnSmoke(houseObj) {
  const tops = houseObj.userData.chimneyTops
    || (houseObj.userData.chimneyTop ? [houseObj.userData.chimneyTop] : []);
  for (const top of tops) {
    const s = new THREE.Mesh(smokeGeo, smokeMat.clone());
    s.position.set(
      houseObj.position.x + top.x + (Math.random() - 0.5) * 0.02,
      houseObj.position.y + top.y,
      houseObj.position.z + top.z + (Math.random() - 0.5) * 0.02
    );
    s.userData = {
      life: 0,
      maxLife: 2.4 + Math.random() * 0.6,
      vy: 0.45 + Math.random() * 0.2,
      vx: (Math.random() - 0.5) * 0.15,
      vz: (Math.random() - 0.5) * 0.15,
    };
    scene.add(s);
    smokeParticles.push(s);
  }
}

export function updateSmoke(dt) {
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const s = smokeParticles[i];
    s.userData.life += dt;
    const t = s.userData.life / s.userData.maxLife;
    s.position.y += s.userData.vy * dt;
    s.position.x += s.userData.vx * dt;
    s.position.z += s.userData.vz * dt;
    s.material.opacity = (1 - t) * 0.65;
    const sc = 1 + t * 1.4;
    s.scale.set(sc, sc, sc);
    if (t >= 1) {
      scene.remove(s);
      s.material.dispose();
      smokeParticles.splice(i, 1);
    }
  }
}
