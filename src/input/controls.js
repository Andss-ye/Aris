/* =====================================================================
   Aris — input & camera controls
   Wires pointer/keyboard/wheel events to camera orbit, tile picking and tool
   placement, plus the hover indicator and the top-right control buttons.
   Call initControls() once after the toolbar exists.
   ===================================================================== */

import { TOP_H, TILE } from '../config/constants.js';
import { roundedSlab } from '../geometry/shapes.js';
import { M } from '../materials/materials.js';
import { scene, renderer, worldGroup, camera, orbit, zoom, togglePerspective } from '../core/engine.js';
import { tilePos } from '../world/state.js';
import { TOOLS, selectTool, getSelectedTool, applyTool, onToolChange } from './tools.js';
import { loadInitialScene, clearScene } from '../scenes/initialScene.js';

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

// -------- pointer: drag-to-orbit + click-to-place --------
let pointerDown = null;
let lastPointer = null;
let didDrag = false;
const DRAG_THRESHOLD = 5;

export function initControls() {
  const dom = renderer.domElement;

  // Keep the hover indicator's tint in sync with the active tool.
  onToolChange(t => { hoverMesh.material = t.erase ? M.hoverErase : M.hover; });
  hoverMesh.material = getSelectedTool().erase ? M.hoverErase : M.hover;

  dom.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointerDown = { x: e.clientX, y: e.clientY };
    lastPointer = { x: e.clientX, y: e.clientY };
    didDrag = false;
    dom.classList.add('dragging');
    dom.setPointerCapture(e.pointerId);
  });

  dom.addEventListener('pointermove', e => {
    // hover update always
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
        orbit(ddx, ddy);
      }
      lastPointer = { x: e.clientX, y: e.clientY };
    }
  });

  dom.addEventListener('pointerup', () => {
    dom.classList.remove('dragging');
    if (pointerDown && !didDrag && currentHover) {
      applyTool(currentHover.x, currentHover.z);
    }
    pointerDown = null;
    lastPointer = null;
  });

  dom.addEventListener('pointercancel', () => {
    dom.classList.remove('dragging');
    pointerDown = null;
  });

  dom.addEventListener('wheel', e => {
    e.preventDefault();
    zoom(e.deltaY);
  }, { passive: false });

  // -------- keyboard shortcuts --------
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '9') {
      const idx = parseInt(k, 10) - 1;
      if (TOOLS[idx]) selectTool(TOOLS[idx]);
    } else if (k === 'e') selectTool(TOOLS[9]);
    else if (k === 'r') doReset();
    else if (k === 'c') doClear();
    else if (k === 'p' || k === 'i') doTogglePerspective();
  });

  // -------- control buttons --------
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
