/* =====================================================================
   Aris — Mars sci-fi material palette (Jonathan's vertical)
   The shared palette in materials/materials.js is FROZEN, so the Mars reskin
   keeps its metallic + emissive materials here, imported only by the colony
   tile + structure factories. Still MeshLambertMaterial (r128, non-PBR) to
   match the renderer; "glow" is faked with emissive/emissiveIntensity — no
   bloom/postprocessing needed.
   ===================================================================== */

export const MM = {
  // ---- terrain ----
  rockMars:      new THREE.MeshLambertMaterial({ color: 0xb24a26 }), // red-orange Martian rock
  rockMarsSide:  new THREE.MeshLambertMaterial({ color: 0x6e2c16 }), // darker dirt block side
  dust:          new THREE.MeshLambertMaterial({ color: 0xcf9b63 }), // light brown dust
  crater:        new THREE.MeshLambertMaterial({ color: 0x463f3a }), // dark gray crater floor
  ironDeposit:   new THREE.MeshLambertMaterial({ color: 0x9aa1a8, emissive: 0x2a2e33, emissiveIntensity: 0.4 }),
  crystalDep:    new THREE.MeshLambertMaterial({ color: 0x7d5fe6, emissive: 0x4a2fcf, emissiveIntensity: 0.9 }),

  // ---- structural metals ----
  steel:         new THREE.MeshLambertMaterial({ color: 0xc2cad2 }), // bright hull plating
  steelMid:      new THREE.MeshLambertMaterial({ color: 0x8b939c }), // mid panel
  steelDark:     new THREE.MeshLambertMaterial({ color: 0x565d66 }), // dark frame / trim
  titanium:      new THREE.MeshLambertMaterial({ color: 0x7e8893 }), // titanium wall
  titaniumDark:  new THREE.MeshLambertMaterial({ color: 0x474d55 }),
  hull:          new THREE.MeshLambertMaterial({ color: 0xd2d7dc }), // base command dome hull
  rust:          new THREE.MeshLambertMaterial({ color: 0x8a4a2c }), // industrial rust accent

  // ---- emissive tech accents ----
  cyan:          new THREE.MeshLambertMaterial({ color: 0x27e0d0, emissive: 0x18d6c6, emissiveIntensity: 1.1 }),
  plasma:        new THREE.MeshLambertMaterial({ color: 0x46e0ff, emissive: 0x32d6ff, emissiveIntensity: 1.3 }),
  reactorCore:   new THREE.MeshLambertMaterial({ color: 0x36c8ff, emissive: 0x1ea8ff, emissiveIntensity: 1.4 }),
  electrified:   new THREE.MeshLambertMaterial({ color: 0x6fe9ff, emissive: 0x4fd6ff, emissiveIntensity: 1.5 }),
  hazard:        new THREE.MeshLambertMaterial({ color: 0xffc23a, emissive: 0xc78400, emissiveIntensity: 0.7 }),
  drill:         new THREE.MeshLambertMaterial({ color: 0xffb020, emissive: 0x5a3a00, emissiveIntensity: 0.4 }),

  // ---- hydroponics greens ----
  bio:           new THREE.MeshLambertMaterial({ color: 0x4fe06a, emissive: 0x1fb84a, emissiveIntensity: 1.0 }),
  leafMars:      new THREE.MeshLambertMaterial({ color: 0x6fe88a }),
  glass:         new THREE.MeshLambertMaterial({ color: 0x9fe8ff, emissive: 0x3aa6cc, emissiveIntensity: 0.5, transparent: true, opacity: 0.55 }),
};
