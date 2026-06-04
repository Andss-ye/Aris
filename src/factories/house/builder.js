/* =====================================================================
   Aris — house assemblers
   buildHouse() is the shared assembler: it takes a cell plan + orientation +
   floors + overhang options and emits geometry from the Parts primitives.
   Solo, linear, square and composite houses all funnel through these builders,
   so new shapes only need a plan/detector — not new geometry code.
   ===================================================================== */

import { TILE, H } from '../../config/constants.js';
import { castReceive, roundedBox } from '../../geometry/shapes.js';
import { M } from '../../materials/materials.js';
import { Parts } from './parts.js';
import { linearHousePlan } from './plans.js';

// Assemble a house from a cell plan. orientation: 'z' (long-axis along z, no
// rotation) or 'x' (long-axis along x, geometry rotated +π/2 around Y).
// floors: 1 (default), 2, 3 — walls stretch upward, per-floor windows added,
// and at floors === 2 an exterior staircase appears against the +x face
// leading to an upper door (floors >= 3 implies internal stairs and the
// exterior set is removed). opts.{frontOverhang, backOverhang} let composite
// wings trim the inside end of the roof so it doesn't poke through the main
// wing's roof — pass backOverhang=0 to disable the inside overhang. opts.
// suppressBackGable hides the -z gable triangle (used for composite wings,
// since their back gable would be coplanar with the main wing's outer wall
// and cause z-fighting / redundant geometry).
export function buildHouse(cells, orientation = 'z', floors = 1, opts = {}) {
  const { frontOverhang = 0.15, backOverhang = 0.15, suppressBackGable = false } = opts;
  const g = new THREE.Group();
  const length = cells.length;
  // Solo cottage keeps its original slimmer depth. Clusters fill the cells.
  const WALL_D = (length === 1) ? 0.7 : length * TILE - 0.18;
  const halfW = H.WALL_W / 2;
  const halfD = WALL_D / 2;
  const wallHTotal = H.WALL_H * floors;
  const roofLift   = (floors - 1) * H.WALL_H;

  // Walls — stretched in Y for upper floors. roundedBox extrudes from y=0
  // upward, so no y-shift is needed: bottom sits at ground, top at wallHTotal.
  const walls = new THREE.Mesh(roundedBox(H.WALL_W, wallHTotal, WALL_D, 0.04), M.wallCream);
  g.add(walls);

  // Gables sit above the top floor's wall top. Composite wings suppress the
  // back gable since it's coplanar with the main wing's outer wall.
  const gF = Parts.gable(); gF.position.set(0, roofLift, halfD - 0.04); g.add(gF);
  if (!suppressBackGable) {
    const gB = Parts.gable(); gB.position.set(0, roofLift, -halfD); g.add(gB);
  }

  // Roof — pitched roof raised by roofLift. backOverhang/frontOverhang let
  // composite wings trim the inside end so it doesn't poke through the main
  // wing's roof.
  const roof = Parts.pitchedRoof(WALL_D, frontOverhang, backOverhang);
  roof.position.y = roofLift;
  g.add(roof);

  // Per-floor windows for any floor above the ground floor — small windows on
  // both long sides AND on both gable faces (so tall houses don't have blank
  // gable walls).
  for (let f = 1; f < floors; f++) {
    const yOff = f * H.WALL_H;
    for (let i = 0; i < length; i++) {
      const cellZ = -((length - 1) / 2) + i;
      const wR = Parts.window('side', 'small');
      wR.position.set( halfW + 0.005, 0.32 + yOff, cellZ); g.add(wR);
      const wL = Parts.window('side', 'small');
      wL.position.set(-halfW - 0.005, 0.32 + yOff, cellZ);
      wL.rotation.y = Math.PI;
      g.add(wL);
    }
    // Gable-face upper windows at cluster's two ends
    const wGF = Parts.window('gable', 'small');
    wGF.position.set(0, 0.32 + yOff, halfD + 0.005); g.add(wGF);
    const wGB = Parts.window('gable', 'small');
    wGB.position.set(0, 0.32 + yOff, -halfD - 0.005);
    wGB.rotation.y = Math.PI;
    g.add(wGB);
  }

  // Per-cell ground-floor decorations (door, window, chimney, step).
  const chimneyTopsLocal = [];
  for (let i = 0; i < length; i++) {
    const cell = cells[i];
    const cellZ = -((length - 1) / 2) + i;

    if (cell.face === 'gable') {
      const door = Parts.door('gable');
      door.position.set(-0.12, 0, halfD + 0.01); g.add(door);
      const win = Parts.window('gable');
      win.position.set(0.2, 0.32, halfD + 0.01); g.add(win);
      const step = Parts.step('gable');
      step.position.set(-0.12, 0.03, halfD + 0.08); g.add(step);
    } else if (cell.face === 'side') {
      const dx = halfW + 0.005;
      const door = Parts.door('side');
      door.position.set(dx, 0, cellZ - 0.1); g.add(door);
      const win = Parts.window('side');
      win.position.set(dx, 0.32, cellZ + 0.18); g.add(win);
      const step = Parts.step('side');
      step.position.set(dx + 0.06, 0.03, cellZ - 0.1); g.add(step);
      const bwin = Parts.window('side', 'small');
      bwin.position.set(-halfW - 0.005, 0.32, cellZ);
      bwin.rotation.y = Math.PI;
      g.add(bwin);
    }

    // Chimney — bottom hides at the top floor's wall top, top sits 0.30
    // above the wall top regardless of floors.
    const chim = Parts.chimney();
    const chimX = -0.28;
    const chimZ = cellZ + (cell.chimneyOffset || 0);
    chim.position.set(chimX, wallHTotal + 0.30, chimZ); g.add(chim);
    chimneyTopsLocal.push(new THREE.Vector3(chimX, wallHTotal + 0.60, chimZ));
  }

  // External staircase + upper door — only when there's exactly 2 floors.
  // Stairs sit alongside the +x face, climbing from south (bottom) to north
  // (top); the upper door sits at the top, on the +x wall at floor 2 height.
  if (floors === 2) {
    const stairsBottomZ = halfD - 0.10;
    const stairsX = halfW + 0.13;
    const stairsTopZ = stairsBottomZ - 5 * 0.10; // 5 steps further north (z=-)
    const stairs = Parts.externalStairs(H.WALL_H);
    stairs.position.set(stairsX, 0, stairsBottomZ);
    g.add(stairs);
    const upd = Parts.upperDoor();
    upd.position.set(halfW + 0.005, H.WALL_H, stairsTopZ);
    g.add(upd);
  }

  castReceive(g);

  let chimneyTops;
  if (orientation === 'x') {
    g.rotation.y = Math.PI / 2;
    const ax = new THREE.Vector3(0, 1, 0);
    chimneyTops = chimneyTopsLocal.map(v => v.clone().applyAxisAngle(ax, Math.PI / 2));
  } else {
    chimneyTops = chimneyTopsLocal;
  }
  g.userData = { kind: 'house', chimneyTops };
  return g;
}

export function makeHouse(floors = 1) {
  return buildHouse(linearHousePlan(1), 'z', floors);
}

export function makeStretchedHouse(length, orientation, floors = 1) {
  return buildHouse(linearHousePlan(length), orientation, floors);
}

// Square (2x2) farmhouse — single rectangular footprint with a hipped
// (pyramidal) roof. Door + window pair at the +z face, exterior stairs at
// floors === 2 on the +x side.
export function buildSquareHouse(floors = 1) {
  const g = new THREE.Group();
  const SIDE = 2 * TILE - 0.18; // 1.82
  const halfSide = SIDE / 2;
  const wallH = H.WALL_H * floors;

  // Walls — roundedBox extrudes from y=0 upward, so no y-shift needed.
  const walls = new THREE.Mesh(roundedBox(SIDE, wallH, SIDE, 0.04), M.wallCream);
  g.add(walls);

  // Hipped roof at the top of the wall stack
  const roof = Parts.hippedRoof(SIDE, SIDE, 0.65);
  roof.position.y = wallH;
  g.add(roof);

  // Roof eave trim — a thin dark rim around the roof base for visual punch
  const eaveR = new THREE.Mesh(new THREE.BoxGeometry(SIDE + 0.04, 0.04, SIDE + 0.04), M.roofBlueD);
  eaveR.position.y = wallH + 0.02;
  g.add(eaveR);

  // Door + window pair on +z face
  const door = Parts.door('gable');
  door.position.set(0, 0, halfSide + 0.01); g.add(door);
  const winR = Parts.window('gable');
  winR.position.set( 0.45, 0.32, halfSide + 0.01); g.add(winR);
  const winL = Parts.window('gable');
  winL.position.set(-0.45, 0.32, halfSide + 0.01); g.add(winL);
  const step = Parts.step('gable');
  step.position.set(0, 0.03, halfSide + 0.08); g.add(step);

  // Side windows along -x and back -z faces (one per side, ground floor)
  const wB = Parts.window('side');
  wB.position.set(-halfSide - 0.005, 0.32, 0); g.add(wB);
  wB.rotation.y = Math.PI;
  const wRside = Parts.window('side');
  wRside.position.set( halfSide + 0.005, 0.32, -0.45); g.add(wRside);

  // Per-floor windows on all 4 faces for upper floors
  for (let f = 1; f < floors; f++) {
    const yOff = f * H.WALL_H;
    const upperWindows = [
      { x: -0.45, z:  halfSide + 0.005, rot: 0 },
      { x:  0.45, z:  halfSide + 0.005, rot: 0 },
      { x: -0.45, z: -halfSide - 0.005, rot: Math.PI },
      { x:  0.45, z: -halfSide - 0.005, rot: Math.PI },
      { x:  halfSide + 0.005, z:  0.45, rot: 0,        side: true },
      { x:  halfSide + 0.005, z: -0.45, rot: 0,        side: true },
      { x: -halfSide - 0.005, z:  0.45, rot: Math.PI,  side: true },
      { x: -halfSide - 0.005, z: -0.45, rot: Math.PI,  side: true },
    ];
    for (const p of upperWindows) {
      const w = Parts.window(p.side ? 'side' : 'gable', 'small');
      w.position.set(p.x, 0.32 + yOff, p.z);
      w.rotation.y = p.rot;
      g.add(w);
    }
  }

  // Two chimneys for visual interest, on opposite corners
  const chimneyTopsLocal = [];
  [
    { x: -0.55, z: -0.55 },
    { x:  0.55, z:  0.55 },
  ].forEach(c => {
    const chim = Parts.chimney();
    chim.position.set(c.x, wallH + 0.30, c.z); g.add(chim);
    chimneyTopsLocal.push(new THREE.Vector3(c.x, wallH + 0.60, c.z));
  });

  // External stairs on +x face when floors === 2
  if (floors === 2) {
    const stairsBottomZ = halfSide - 0.10;
    const stairsX = halfSide + 0.13;
    const stairsTopZ = stairsBottomZ - 5 * 0.10;
    const stairs = Parts.externalStairs(H.WALL_H);
    stairs.position.set(stairsX, 0, stairsBottomZ);
    g.add(stairs);
    const upd = Parts.upperDoor();
    upd.position.set(halfSide + 0.005, H.WALL_H, stairsTopZ);
    g.add(upd);
  }

  castReceive(g);
  g.userData = { kind: 'house', chimneyTops: chimneyTopsLocal };
  return g;
}

// Composite house — a main wing (linear stretched house) plus 1+ single-cell
// perpendicular side wings. Each side wing is a length-1 house oriented and
// rotated to face away from the main wing; positioned so the wing's gable
// touches the main wing's outer wall (no visible gap). Junction geometry
// overlaps slightly which is hidden by Z-buffer / matching wall material.
export function buildCompositeHouse(topology, floors = 1) {
  const { mainOrientation, mainCells, branches, bbox } = topology;
  const composite = new THREE.Group();
  const allChimneyTops = [];

  const bboxCX = (bbox.xMin + bbox.xMax) / 2;
  const bboxCZ = (bbox.zMin + bbox.zMax) / 2;

  // Main wing: positioned at its run's centre, in composite-local coords.
  const mainLength = mainCells.length;
  const first = mainCells[0], last = mainCells[mainCells.length - 1];
  const mainCX = mainOrientation === 'z' ? first.x          : (first.x + last.x) / 2;
  const mainCZ = mainOrientation === 'z' ? (first.z + last.z) / 2 : first.z;
  const mainOX = mainCX - bboxCX;
  const mainOZ = mainCZ - bboxCZ;

  const mainWing = buildHouse(linearHousePlan(mainLength), mainOrientation, floors);
  mainWing.position.set(mainOX, 0, mainOZ);
  composite.add(mainWing);
  for (const top of (mainWing.userData.chimneyTops || [])) {
    allChimneyTops.push(new THREE.Vector3(top.x + mainOX, top.y, top.z + mainOZ));
  }

  // Side wings (always 1 cell each, only render external stairs once on the
  // main wing — pass floors=floors but suppress stairs for wings by passing 1).
  const SHIFT = 0.18;
  const ax = new THREE.Vector3(0, 1, 0);
  for (const br of branches) {
    let wingX = br.x - bboxCX;
    let wingZ = br.z - bboxCZ;
    if      (br.axis === '+x') wingX -= SHIFT;
    else if (br.axis === '-x') wingX += SHIFT;
    else if (br.axis === '+z') wingZ -= SHIFT;
    else                       wingZ += SHIFT;

    const wingOrientation = (br.axis === '+x' || br.axis === '-x') ? 'x' : 'z';
    // Wings trim their inside-end overhang AND suppress their back gable so
    // the roof clips cleanly at the main wing's outer wall without redundant
    // / coplanar geometry. The "back" of a wing (pre-rotation -z gable, no
    // door) is always the side facing the main wing.
    const wing = buildHouse(linearHousePlan(1), wingOrientation, floors, {
      backOverhang: 0,
      suppressBackGable: true,
    });
    const flip = (br.axis === '-x' || br.axis === '-z');
    if (flip) wing.rotation.y += Math.PI;
    wing.position.set(wingX, 0, wingZ);
    composite.add(wing);

    for (const top of (wing.userData.chimneyTops || [])) {
      const r = flip ? top.clone().applyAxisAngle(ax, Math.PI) : top;
      allChimneyTops.push(new THREE.Vector3(r.x + wingX, r.y, r.z + wingZ));
    }
  }

  composite.userData = { kind: 'house', chimneyTops: allChimneyTops };
  return composite;
}
