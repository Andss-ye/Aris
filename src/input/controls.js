/* =====================================================================
   Aris — input & cámara. Dueño: ANDREW.
   Click izq: coloca (celda vacía) o abre upgrade (estructura existente).
   Arrastre izq: orbitar. Arrastre derecho / WASD: panear. Rueda: zoom.
   ===================================================================== */

import { TOP_H, TILE } from '../config/constants.js';
import { roundedSlab } from '../geometry/shapes.js';
import { M } from '../materials/materials.js';
import { scene, renderer, worldGroup, camera, orbit, zoom, pan, togglePerspective } from '../core/engine.js';
import { world, tilePos } from '../world/state.js';
import { TOOLS, selectTool, getSelectedTool, applyTool, onToolChange } from './tools.js';
import { loadInitialScene, clearScene } from '../scenes/initialScene.js';
import * as upgrades from '../game/upgrades.js';

// -------- hover indicator --------
const hoverGeo = roundedSlab(TILE * 1.0, 0.04, 0.07);
const hoverMesh = new THREE.Mesh(hoverGeo, M.hover);
hoverMesh.position.y = TOP_H + 0.01;
hoverMesh.visible = false;
scene.add(hoverMesh);

let currentHover = null;

// -------- raycaster --------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function pickTile(clientX, clientY) {
  ndc.x = (clientX / window.innerWidth) * 2 - 1;
  ndc.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(worldGroup.children, true);
  for (const h of hits) {
    let n = h.object;
    while (n && (n.userData.gx === undefined)) n = n.parent;
    if (n && n.userData.gx !== undefined) return { x: n.userData.gx, z: n.userData.gz };
  }
  return null;
}

let pointerDown = null;
let lastPointer = null;
let didDrag = false;
let panning = false;
const DRAG_THRESHOLD = 5;
const PAN_KEY = 0.6;

export function initControls() {
  const dom = renderer.domElement;

  onToolChange((t) => { hoverMesh.material = t.erase ? M.hoverErase : M.hover; });
  hoverMesh.material = getSelectedTool().erase ? M.hoverErase : M.hover;

  dom.addEventListener('contextmenu', (e) => e.preventDefault());

  dom.addEventListener('pointerdown', (e) => {
    pointerDown = { x: e.clientX, y: e.clientY, button: e.button };
    lastPointer = { x: e.clientX, y: e.clientY };
    didDrag = false;
    panning = (e.button === 2); // botón derecho = paneo
    dom.classList.add('dragging');
    dom.setPointerCapture(e.pointerId);
  });

  dom.addEventListener('pointermove', (e) => {
    const cell = pickTile(e.clientX, e.clientY);
    if (cell) {
      const p = tilePos(cell.x, cell.z);
      hoverMesh.position.set(p.x, TOP_H + 0.02, p.z);
      hoverMesh.visible = true;
      currentHover = cell;
    } else {
      hoverMesh.visible = false;
      currentHover = null;
    }

    if (pointerDown) {
      const dx = e.clientX - pointerDown.x;
      const dy = e.clientY - pointerDown.y;
      if (!didDrag && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) didDrag = true;
      if (didDrag) {
        const ddx = e.clientX - lastPointer.x;
        const ddy = e.clientY - lastPointer.y;
        if (panning) pan(ddx, ddy);
        else orbit(ddx, ddy);
      }
      lastPointer = { x: e.clientX, y: e.clientY };
    }
  });

  dom.addEventListener('pointerup', () => {
    dom.classList.remove('dragging');
    if (pointerDown && !didDrag && !panning && currentHover) {
      const { x, z } = currentHover;
      const cell = world[x][z];
      const tool = getSelectedTool();
      // Click en estructura existente (no borrador) → panel de mejora.
      if (cell.kind && cell.kind !== 'base' && !tool.erase) upgrades.open(x, z);
      else applyTool(x, z);
    }
    pointerDown = null;
    lastPointer = null;
    panning = false;
  });

  dom.addEventListener('pointercancel', () => {
    dom.classList.remove('dragging');
    pointerDown = null;
    panning = false;
  });

  dom.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom(e.deltaY);
  }, { passive: false });

  // -------- teclado --------
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '5') {
      const idx = parseInt(k, 10) - 1;
      if (TOOLS[idx]) selectTool(TOOLS[idx]);
    } else if (k === 'e') selectTool(TOOLS[5]);
    else if (k === 'w') pan(0, -PAN_KEY * 30);
    else if (k === 's') pan(0, PAN_KEY * 30);
    else if (k === 'a') pan(-PAN_KEY * 30, 0);
    else if (k === 'd') pan(PAN_KEY * 30, 0);
    else if (k === 'r') doReset();
    else if (k === 'c') doClear();
    else if (k === 'p' || k === 'i') doTogglePerspective();
  });

  document.getElementById('reset').addEventListener('click', doReset);
  document.getElementById('clear').addEventListener('click', doClear);
  document.getElementById('persp').addEventListener('click', doTogglePerspective);
}

function doReset() { loadInitialScene(); }
function doClear() { clearScene(); }
function doTogglePerspective() {
  const mode = togglePerspective();
  document.getElementById('persp').classList.toggle('on', mode === 'perspective');
}
