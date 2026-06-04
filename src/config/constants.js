/* =====================================================================
   Aris — global configuration & tunable constants
   Centralizes magic numbers so gameplay/visual tuning lives in one place.
   ===================================================================== */

// World grid
export const GRID = 16;       // cells per side (Mars colony board)
export const TILE = 1;        // world units per cell
export const TOP_H = 0.18;    // grass slab thickness
export const DIRT_H = 0.55;   // dirt block height (visible side)

// Houses
export const MAX_FLOORS = 3;

// Mars structure heights — shared by the structure factories so all colony
// pieces stay visually proportional on the board.
export const STRUCT_H = {
  WALL:     0.85,  // titanium wall slab height
  TOWER:    0.95,  // plasma tower body height (before cannon)
  MINE:     0.55,  // iron mine body
  REACTOR:  0.7,   // energy reactor body
  HYDRO:    0.5,   // hydroponics planter body
  BASE:     1.1,   // base command dome wall height
};

// House geometry constants. Shared by every house part + assembler so a
// single edit re-proportions all house shapes consistently.
export const H = {
  WALL_W: 0.82,        // short-axis wall width
  WALL_H: 0.55,        // wall height to eaves
  PEAK_Y: 0.87,        // ridge apex
  T:      0.06,        // roof slab thickness
  ROOF_OVERHANG: 0.3,  // roof depth = WALL_D + this (extends past long-axis ends)
};
