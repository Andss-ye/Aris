/* =====================================================================
   Aris — STRUCT: costos / stats / upgrades de cada estructura
   Dueño: JONATHAN. Lo leen Andrew (costos, upgrades) y Julian (stats de torre).
   Números reales tomados de idea.md. Nivel 0 = básica, 1 = upgrade 1, 2 = upgrade 2.
   `cost` es lo que cuesta SUBIR a ese nivel ({iron?,energy?,crystal?}).
   ===================================================================== */

export const STRUCT = {
  base: {
    footprint: 2, // ocupa 2×2 celdas
    levels: [
      { hp: 200, ironPerSec: 2 },
      { cost: { iron: 20, energy: 10 }, hp: 400, ironPerSec: 2 },
      { cost: { energy: 15, crystal: 5 }, hp: 400, ironPerSec: 2, range: 4, fireRate: 2, dmg: 15 },
    ],
  },
  mine: {
    tile: 'iron_deposit',
    levels: [
      { cost: { iron: 5 }, hp: 60, ironPerSec: 3 },
      { cost: { iron: 10 }, hp: 60, ironPerSec: 6 },
      { cost: { energy: 8 }, hp: 60, ironPerSec: 10, crystalEvery: 30 },
    ],
  },
  reactor: {
    tile: 'crystal_deposit',
    levels: [
      { cost: { iron: 8 }, hp: 60, energyPerSec: 3 },
      { cost: { iron: 10 }, hp: 60, energyPerSec: 6 },
      { cost: { crystal: 5 }, hp: 60, energyPerSec: 12 },
    ],
  },
  tower: {
    levels: [
      { cost: { iron: 12, energy: 8 }, hp: 80, range: 3, fireRate: 2, dmg: 15, aoe: 0 },
      { cost: { energy: 10 }, hp: 80, range: 3, fireRate: 1, dmg: 15, aoe: 0 },
      { cost: { crystal: 8 }, hp: 80, range: 3, fireRate: 1, dmg: 30, aoe: 1 },
    ],
  },
  wall: {
    levels: [
      { cost: { iron: 6 }, hp: 60 },
      { cost: { iron: 8 }, hp: 150 },
      { cost: { energy: 6 }, hp: 150, returnDmg: 10 },
    ],
  },
  hydroponics: {
    levels: [
      { cost: { iron: 10, energy: 5 }, hp: 40, baseHealPerSec: 1 },
      { cost: { energy: 8 }, hp: 40, baseHealPerSec: 3 },
      { cost: { crystal: 5 }, hp: 40, baseHealPerSec: 3, repairAdjacent: 1 },
    ],
  },
};

// Helper compartido: ¿la estructura `kind` en ese nivel tiene HP? (muros/base)
export function maxHpFor(kind, level) {
  const s = STRUCT[kind];
  if (!s) return 0;
  const lvl = s.levels[level] || s.levels[0];
  return lvl.hp || 0;
}
