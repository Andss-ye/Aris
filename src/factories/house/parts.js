/* =====================================================================
   Aris — house primitive parts
   Reusable building blocks (walls, gables, roofs, doors, windows, chimneys,
   steps, stairs). Each part documents its origin convention so the assembler
   can place it by a single position. No game state here.
   ===================================================================== */

import { H } from '../../config/constants.js';
import { roundedBox } from '../../geometry/shapes.js';
import { M } from '../../materials/materials.js';

export const Parts = {
  // Wall volume — rounded box covering the cluster's long-axis extent.
  walls(WALL_D) {
    return new THREE.Mesh(roundedBox(H.WALL_W, H.WALL_H, WALL_D, 0.04), M.wallCream);
  },

  // Triangular gable panel (in XY plane, 0.04 thick in z). Caller positions.
  gable() {
    const shape = new THREE.Shape();
    shape.moveTo(-H.WALL_W / 2, H.WALL_H);
    shape.lineTo( H.WALL_W / 2, H.WALL_H);
    shape.lineTo(0, H.PEAK_Y);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false, curveSegments: 1 });
    return new THREE.Mesh(geo, M.wallCream);
  },

  // Pitched roof: two slabs whose bottom faces sit along the gable hypotenuse,
  // plus a ridge cap. Origin at house centre. Front/back overhang can be set
  // asymmetrically — composite wings pass backOverhang=0 so the wing's inside
  // end doesn't poke through the main wing's roof.
  pitchedRoof(WALL_D, frontOverhang = 0.15, backOverhang = 0.15) {
    const g = new THREE.Group();
    const halfW = H.WALL_W / 2;
    const ROOF_DEPTH = WALL_D + frontOverhang + backOverhang;
    const ROOF_Z     = (frontOverhang - backOverhang) / 2; // shift centre when asymmetric
    const rise = H.PEAK_Y - H.WALL_H;
    const slabLen   = Math.sqrt(halfW * halfW + rise * rise);
    const slabAngle = Math.atan2(rise, halfW);
    const sa = Math.sin(slabAngle), ca = Math.cos(slabAngle);
    const slabGeo = new THREE.BoxGeometry(slabLen, H.T, ROOF_DEPTH);

    const slabL = new THREE.Mesh(slabGeo, M.roofBlue);
    slabL.position.set(-halfW / 2 - (H.T / 2) * sa, (H.WALL_H + H.PEAK_Y) / 2 + (H.T / 2) * ca, ROOF_Z);
    slabL.rotation.z = slabAngle;
    g.add(slabL);

    const slabR = new THREE.Mesh(slabGeo, M.roofBlue);
    slabR.position.set( halfW / 2 + (H.T / 2) * sa, (H.WALL_H + H.PEAK_Y) / 2 + (H.T / 2) * ca, ROOF_Z);
    slabR.rotation.z = -slabAngle;
    g.add(slabR);

    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, ROOF_DEPTH + 0.02), M.roofBlueD);
    ridge.position.set(0, H.PEAK_Y + (H.T / 2) * ca + 0.005, ROOF_Z);
    g.add(ridge);
    return g;
  },

  // Hipped (pyramidal) roof — 4 triangular slabs meeting at a central apex.
  // Used for square / 2x2 footprints. Origin at base centre, base at y=0,
  // apex at y=rise. Built as a BufferGeometry pyramid with computed normals.
  hippedRoof(width, depth, rise) {
    const halfW = width / 2;
    const halfD = depth / 2;
    const verts = new Float32Array([
      0,      rise, 0,        // 0: apex
      -halfW, 0,    -halfD,   // 1: NW
       halfW, 0,    -halfD,   // 2: NE
       halfW, 0,     halfD,   // 3: SE
      -halfW, 0,     halfD,   // 4: SW
    ]);
    // CCW winding from outside (verified by cross-product: each face's outward
    // normal points away from the apex with the correct sign).
    const indices = new Uint16Array([
      0, 2, 1,  // north face (apex, ne, nw) — outward normal -z
      0, 3, 2,  // east face  (apex, se, ne) — outward normal +x
      0, 4, 3,  // south face (apex, sw, se) — outward normal +z
      0, 1, 4,  // west face  (apex, nw, sw) — outward normal -x
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, M.roofBlue);
  },

  // Door + arches + knob. orientation:
  //   'gable' — door faces +z, outer face at z=0 of the part's local frame.
  //   'side'  — door faces +x, outer face at x=0.
  // Origin is at GROUND LEVEL beneath the door's outer face centre, so callers
  // place a door by setting its position to where the door's centre projects on the floor.
  door(orientation) {
    const g = new THREE.Group();
    if (orientation === 'gable') {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.48, 0.04), M.door);
      door.position.set(0, 0.24, 0); g.add(door);
      const aL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.04), M.woodTrim); aL.position.set(-0.10, 0.24, 0.01); g.add(aL);
      const aR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.04), M.woodTrim); aR.position.set( 0.10, 0.24, 0.01); g.add(aR);
      const aT = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.04), M.woodTrim); aT.position.set(0,     0.50, 0.01); g.add(aT);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), M.knob);
      knob.position.set(0.08, 0.24, 0.03); g.add(knob);
    } else {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.2), M.door);
      door.position.set(0, 0.24, 0); g.add(door);
      const aL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.04), M.woodTrim); aL.position.set(0.01, 0.24, -0.10); g.add(aL);
      const aR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.04), M.woodTrim); aR.position.set(0.01, 0.24,  0.10); g.add(aR);
      const aT = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.24), M.woodTrim); aT.position.set(0.01, 0.50,  0   ); g.add(aT);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), M.knob);
      knob.position.set(0.03, 0.24, 0.05); g.add(knob);
    }
    return g;
  },

  // Window with frame, glass and cross trims, layered along the outer-face axis.
  // Origin at the FRAME CENTRE; callers place by setting position to where the
  // frame's centre should sit on the wall surface.
  window(orientation, size = 'large') {
    const g = new THREE.Group();
    const f = size === 'small' ? 0.20 : 0.24; // frame
    const p = size === 'small' ? 0.14 : 0.17; // glass / cross length
    if (orientation === 'gable') {
      const wf = new THREE.Mesh(new THREE.BoxGeometry(f, f, 0.04),       M.woodTrim); wf.position.set(0, 0, 0);     g.add(wf);
      const wg = new THREE.Mesh(new THREE.BoxGeometry(p, p, 0.04),       M.windowB);  wg.position.set(0, 0, 0.015); g.add(wg);
      const cH = new THREE.Mesh(new THREE.BoxGeometry(p, 0.012, 0.04),   M.woodTrim); cH.position.set(0, 0, 0.025); g.add(cH);
      const cV = new THREE.Mesh(new THREE.BoxGeometry(0.012, p, 0.04),   M.woodTrim); cV.position.set(0, 0, 0.025); g.add(cV);
    } else {
      const wf = new THREE.Mesh(new THREE.BoxGeometry(0.04, f, f),       M.woodTrim); wf.position.set(0,     0, 0); g.add(wf);
      const wg = new THREE.Mesh(new THREE.BoxGeometry(0.04, p, p),       M.windowB);  wg.position.set(0.015, 0, 0); g.add(wg);
      const cH = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, p),   M.woodTrim); cH.position.set(0.025, 0, 0); g.add(cH);
      const cV = new THREE.Mesh(new THREE.BoxGeometry(0.04, p, 0.012),   M.woodTrim); cV.position.set(0.025, 0, 0); g.add(cV);
    }
    return g;
  },

  // Chimney stack. Origin at chimney CENTRE in y (so a position of y=0.85 puts
  // the bottom inside the wall and the top at y=1.15).
  chimney() {
    return new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), M.chimney);
  },

  // Doorstep slab. Origin at step CENTRE.
  step(orientation) {
    return orientation === 'side'
      ? new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.26), M.step)
      : new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.12), M.step);
  },

  // External staircase — chunky stylized stair climbing toward -z and +y
  // from the part's origin (placed at the bottom-front of the lowest step).
  // 6 steps; each step is full stepRise tall (no y overlap) but 1.4x wide
  // in depth so consecutive steps visually overlap in z.
  externalStairs(rise) {
    const g = new THREE.Group();
    const N = 6;
    const stepRise = rise / N;
    const stepRun  = 0.10;
    const width    = 0.22;
    for (let i = 0; i < N; i++) {
      const s = new THREE.Mesh(
        new THREE.BoxGeometry(width, stepRise, stepRun * 1.4),
        M.step
      );
      s.position.set(0, stepRise * (i + 0.5), -i * stepRun);
      g.add(s);
    }
    return g;
  },

  // Upper-floor door reached by external stairs. Same geometry as the side
  // door but smaller, intended to sit on a +x face.
  upperDoor() {
    const g = new THREE.Group();
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.18), M.door);
    door.position.set(0, 0.21, 0); g.add(door);
    const aL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.04), M.woodTrim); aL.position.set(0.01, 0.21, -0.09); g.add(aL);
    const aR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.04), M.woodTrim); aR.position.set(0.01, 0.21,  0.09); g.add(aR);
    const aT = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.22), M.woodTrim); aT.position.set(0.01, 0.44, 0   ); g.add(aT);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.020, 8, 8), M.knob);
    knob.position.set(0.03, 0.21, 0.05); g.add(knob);
    return g;
  },
};
