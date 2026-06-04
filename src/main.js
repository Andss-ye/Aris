/* =====================================================================
   Aris — application entry point
   Boots the modules in order and runs the per-frame animation loop
   (drop-ins, structure glow pulse, render). Import side effects in engine.js
   create the renderer/scene; this file wires UI + input + loop.
   ===================================================================== */

import { scene, renderer, camera, onResize } from './core/engine.js';
import { dropAnims, tickDropAnims } from './core/animation.js';
import { cellMeshes } from './world/state.js';
import { buildToolbar, selectTool, TOOLS } from './input/tools.js';
import { initControls } from './input/controls.js';
import { loadInitialScene } from './scenes/initialScene.js';

// -------- animation loop --------
let prevT = 0;

function animate(now) {
  requestAnimationFrame(animate);
  const t = now / 1000;
  const dt = prevT ? Math.min(t - prevT, 0.05) : 0;
  prevT = t;

  // tile/object drop-in animations (load + placement)
  if (dropAnims.length) tickDropAnims(dt);

  // pulse the emissive glow lights on Mars structures + crystal deposits
  for (const key in cellMeshes) {
    const entry = cellMeshes[key];
    for (const holder of [entry.object, entry.tile]) {
      if (!holder || !holder.userData.lights) continue;
      for (const L of holder.userData.lights) {
        const base = L.userData.baseIntensity != null ? L.userData.baseIntensity : L.intensity;
        L.intensity = base * (0.7 + 0.3 * Math.sin(t * 3 + (L.userData.phase || 0)));
      }
    }
  }

  renderer.render(scene, camera);
}

// -------- boot --------
buildToolbar();
selectTool(TOOLS[1]); // start on Torre
initControls();
loadInitialScene();
onResize();
requestAnimationFrame(animate);
