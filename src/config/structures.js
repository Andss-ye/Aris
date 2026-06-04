/* =====================================================================
   Aris — structure config (STRUCT)  [Jonathan's vertical]
   Gameplay/visual numbers per structure level (from idea.md). NO economy:
   there are no resource costs here — placing and upgrading is free, so the
   colony builder runs entirely without the economy vertical. (Andrew can add
   costs in his own economy module later without touching this file.)

   Shape:
     STRUCT[kind] = {
       footprint?,           // cells per side (base = 2); default 1
       tile?,                // required terrain to place on (mine/reactor)
       levels: [ { hp?, ...stats } x3 ]   // index = level 0|1|2
     }
   ===================================================================== */

export const STRUCT = {
  // Command base — 2x2, the objective to defend.
  base: {
    footprint: 2,
    levels: [
      { hp: 200, ironPerSec: 2 },
      { hp: 400, ironPerSec: 2, armor: 0.5 },
      { hp: 400, ironPerSec: 2, armor: 0.5, range: 4, fireRate: 2, dmg: 15, aoe: 0 }, // integrated turret
    ],
  },

  // Iron Mine — placed on an iron_deposit tile.
  mine: {
    tile: 'iron_deposit',
    levels: [
      { hp: 50, ironPerSec: 3 },
      { hp: 50, ironPerSec: 6 },
      { hp: 50, ironPerSec: 10, crystalPer: 30 }, // +1 crystal / 30s
    ],
  },

  // Energy Reactor — placed on a crystal_deposit tile.
  reactor: {
    tile: 'crystal_deposit',
    levels: [
      { hp: 50, energyPerSec: 3 },
      { hp: 50, energyPerSec: 6 },
      { hp: 50, energyPerSec: 12 },
    ],
  },

  // Plasma Tower — auto-targets nearest enemy in range.
  tower: {
    levels: [
      { hp: 80, range: 3, fireRate: 2, dmg: 15, aoe: 0 },
      { hp: 80, range: 3, fireRate: 1, dmg: 15, aoe: 0 },
      { hp: 80, range: 3, fireRate: 1, dmg: 30, aoe: 1 },
    ],
  },

  // Titanium Wall — soaks hits; level 2 returns damage on hit.
  wall: {
    levels: [
      { hp: 60 },
      { hp: 150 },
      { hp: 150, returnDmg: 10 },
    ],
  },

  // Hydroponics — optional; regenerates base (and adjacent structures at L2).
  hydroponics: {
    levels: [
      { hp: 40, baseHealPerSec: 1 },
      { hp: 40, baseHealPerSec: 3 },
      { hp: 40, baseHealPerSec: 3, adjacentRepair: 1 },
    ],
  },
};

// Convenience: max HP for a kind at a given level (0 when not damageable).
export function structMaxHp(kind, level = 0) {
  const def = STRUCT[kind] && STRUCT[kind].levels[level];
  return def && def.hp != null ? def.hp : 0;
}
