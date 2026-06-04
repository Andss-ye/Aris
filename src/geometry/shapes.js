/* =====================================================================
   Aris — low-level geometry helpers
   Reusable rounded primitives + scene-graph utilities. No game state here.
   Relies on the global THREE (loaded as a classic <script> from CDN).
   ===================================================================== */

// A rounded extruded slab — used for tile pieces.
export function roundedSlab(size, height, radius = 0.07) {
  const w = size / 2;
  const r = Math.min(radius, w - 0.01);
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -w);
  shape.lineTo(w - r, -w);
  shape.quadraticCurveTo(w, -w, w, -w + r);
  shape.lineTo(w, w - r);
  shape.quadraticCurveTo(w, w, w - r, w);
  shape.lineTo(-w + r, w);
  shape.quadraticCurveTo(-w, w, -w, w - r);
  shape.lineTo(-w, -w + r);
  shape.quadraticCurveTo(-w, -w, -w + r, -w);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    curveSegments: 4
  });
  geo.rotateX(-Math.PI / 2);
  // After rotation Y spans [0, height]
  return geo;
}

// A rounded box — for objects we want a softer cube look.
export function roundedBox(w, h, d, r = 0.05) {
  const shape = new THREE.Shape();
  const hw = w / 2, hd = d / 2;
  const rr = Math.min(r, hw - 0.001, hd - 0.001);
  shape.moveTo(-hw + rr, -hd);
  shape.lineTo(hw - rr, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + rr);
  shape.lineTo(hw, hd - rr);
  shape.quadraticCurveTo(hw, hd, hw - rr, hd);
  shape.lineTo(-hw + rr, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - rr);
  shape.lineTo(-hw, -hd + rr);
  shape.quadraticCurveTo(-hw, -hd, -hw + rr, -hd);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    curveSegments: 3
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 0);
  return geo;
}

// Flag every mesh in a subtree as shadow caster + receiver.
export function castReceive(obj) {
  obj.traverse(c => {
    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
  });
  return obj;
}

// Free geometry of a removed group to avoid GPU memory leaks on re-render.
export function disposeGroup(group) {
  group.traverse(o => {
    if (o.geometry) o.geometry.dispose();
  });
}
