/* =====================================================================
   Aris — global configuration & tunable constants
   Centralizes magic numbers so gameplay/visual tuning lives in one place.
   ===================================================================== */

// World grid
export const GRID = 16;       // cells per side (Mars colony 16×16)
export const TILE = 1;        // world units per cell
export const TOP_H = 0.18;    // grass slab thickness
export const DIRT_H = 0.55;   // dirt block height (visible side)

// Houses
export const MAX_FLOORS = 3;

// House geometry constants. Shared by every house part + assembler so a
// single edit re-proportions all house shapes consistently.
export const H = {
  WALL_W: 0.82,        // short-axis wall width
  WALL_H: 0.55,        // wall height to eaves
  PEAK_Y: 0.87,        // ridge apex
  T:      0.06,        // roof slab thickness
  ROOF_OVERHANG: 0.3,  // roof depth = WALL_D + this (extends past long-axis ends)
};
