/* =====================================================================
   Aris — shared material palette
   Lambert (not Standard): non-PBR diffuse only, much more direct color
   response. Stylized low-poly looks better with flat shading than physical
   energy conservation. One shared instance per material keeps draw calls low.
   ===================================================================== */

export const M = {
  grass:     new THREE.MeshLambertMaterial({ color: 0xb0d949 }),
  grassEdge: new THREE.MeshLambertMaterial({ color: 0x95c138 }),
  dirt:      new THREE.MeshLambertMaterial({ color: 0x7d4519 }),
  dirtRich:  new THREE.MeshLambertMaterial({ color: 0x462b15 }),
  path:      new THREE.MeshLambertMaterial({ color: 0xf2d29c }),
  water:     new THREE.MeshLambertMaterial({ color: 0x3a8fcc }),

  trunk:     new THREE.MeshLambertMaterial({ color: 0x5c3818 }),
  leaves:    new THREE.MeshLambertMaterial({ color: 0x86d139 }),
  leavesDk:  new THREE.MeshLambertMaterial({ color: 0x5fab26 }),

  wallCream: new THREE.MeshLambertMaterial({ color: 0xf2dfb0 }),
  wallTrim:  new THREE.MeshLambertMaterial({ color: 0xe5cf99 }),
  roofBlue:  new THREE.MeshLambertMaterial({ color: 0x2a6dd1 }),
  roofBlueD: new THREE.MeshLambertMaterial({ color: 0x1d4d9c }),
  door:      new THREE.MeshLambertMaterial({ color: 0x7a4a2e }),
  woodTrim:  new THREE.MeshLambertMaterial({ color: 0x5c3818 }),
  windowB:   new THREE.MeshLambertMaterial({ color: 0x2a6dd1 }),
  chimney:   new THREE.MeshLambertMaterial({ color: 0xc9c4ba }),
  step:      new THREE.MeshLambertMaterial({ color: 0xa9a49a }),
  knob:      new THREE.MeshLambertMaterial({ color: 0xe8c050 }),

  fence:     new THREE.MeshLambertMaterial({ color: 0x7d4519 }),
  cropLeaf:  new THREE.MeshLambertMaterial({ color: 0x96d943 }),
  cropStem:  new THREE.MeshLambertMaterial({ color: 0x5e9c2e }),

  hover:     new THREE.MeshBasicMaterial({ color: 0x2a2722, transparent: true, opacity: 0.18, depthWrite: false }),
  hoverErase:new THREE.MeshBasicMaterial({ color: 0xb84838, transparent: true, opacity: 0.28, depthWrite: false }),
};
