/* =====================================================================
   Aris — application entry point
   Boots the modules in order and runs the per-frame animation loop
   (drop-ins, prop idle motion, chimney smoke, render). Import side effects in
   engine.js create the renderer/scene; this file wires UI + input + loop.
   ===================================================================== */

import { scene, renderer, camera, onResize } from './core/engine.js';
import { dropAnims, tickDropAnims } from './core/animation.js';
import { cellMeshes } from './world/state.js';
import { spawnSmoke, updateSmoke } from './effects/smoke.js';
import { buildToolbar, selectTool, TOOLS } from './input/tools.js';
import { initControls } from './input/controls.js';
import { loadInitialScene } from './scenes/initialScene.js';

// -------- animation loop --------
let prevT = 0;
let smokeTimer = 0;

function animate(now) {
  requestAnimationFrame(animate);
  const t = now / 1000;
  const dt = prevT ? Math.min(t - prevT, 0.05) : 0;
  prevT = t;

  // tile/object drop-in animations (load + placement)
  if (dropAnims.length) tickDropAnims(dt);

  // sway trees / bob crops / wiggle tufts
  for (const key in cellMeshes) {
    const obj = cellMeshes[key].object;
    if (!obj) continue;
    const k = obj.userData.kind;
    if (k === 'tree') {
      obj.rotation.z = Math.sin(t * 0.85 + obj.userData.swayPhase) * 0.022;
      obj.rotation.x = Math.cos(t * 0.65 + obj.userData.swayPhase) * 0.012;
    } else if (k === 'crop') {
      if (!obj.userData.landing)
        obj.position.y = obj.userData.baseY + Math.sin(t * 1.6 + obj.userData.bobPhase) * 0.03;
    } else if (k === 'tuft') {
      obj.rotation.z = Math.sin(t * 1.2 + (obj.userData.gx + obj.userData.gz)) * 0.05;
    }
  }

  // chimney smoke — skip while the house is still landing (origin would be airborne)
  smokeTimer += dt;
  if (smokeTimer > 0.18) {
    smokeTimer = 0;
    for (const key in cellMeshes) {
      const o = cellMeshes[key].object;
      if (o && o.userData.kind === 'house' && !o.userData.landing) spawnSmoke(o);
    }
  }
  updateSmoke(dt);

  renderer.render(scene, camera);
}

// -------- boot --------
buildToolbar();
selectTool(TOOLS[5]);
initControls();
loadInitialScene();
onResize();
requestAnimationFrame(animate);
