/* =====================================================================
   Aris — entry point (Defensa de la Colonia Marciana). Dueño: ANDREW.
   Boot de módulos + bucle por frame unificado: drop-ins, recursos, oleadas,
   enemigos, combate, proyectiles, render. Todos los tick() existen desde Fase 0
   (placeholders), así que el bucle compila y corre sin el código real de nadie.
   ===================================================================== */

import { scene, renderer, camera, onResize } from './core/engine.js';
import { dropAnims, tickDropAnims } from './core/animation.js';
import { cellMeshes } from './world/state.js';
import { buildToolbar, selectTool, TOOLS } from './input/tools.js';
import { initControls } from './input/controls.js';
import { loadInitialScene } from './scenes/initialScene.js';
import * as resources from './game/resources.js';
import * as waves from './game/waves.js';
import * as enemies from './game/enemies.js';
import * as combat from './game/combat.js';
import * as projectiles from './game/projectiles.js';

let prevT = 0;

function animate(now) {
  requestAnimationFrame(animate);
  const t = now / 1000;
  const dt = prevT ? Math.min(t - prevT, 0.05) : 0;
  prevT = t;

  if (dropAnims.length) tickDropAnims(dt);

  // pulse emissive lights on Mars structures + crystal deposits (Jonathan)
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

  // --- game tick (congelado en menú / pausa / fin de partida) ---
  if (!waves.isPaused()) {
    resources.tick(dt);
    waves.tick(dt);
    enemies.tick(dt);
    combat.tick(dt);
    projectiles.tick(dt);
  }

  renderer.render(scene, camera);
}

// -------- boot --------
buildToolbar();
selectTool(TOOLS[0]);
initControls();
loadInitialScene();
resources.init();
waves.start({ reloadScene: loadInitialScene });
onResize();
requestAnimationFrame(animate);
