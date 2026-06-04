/* =====================================================================
   Aris — stats de enemigos
   Dueño: JULIAN. velocidad en celdas/seg, hp, tamaño de malla, AOE.
   ===================================================================== */

export const ENEMIES = {
  scout:    { hp: 30,  speed: 1.5, color: 0x4caf50, size: 0.22, aoe: 0 },
  tanque:   { hp: 150, speed: 0.5, color: 0x6b8e6b, size: 0.34, aoe: 0, attacksWalls: true },
  kamikaze: { hp: 20,  speed: 2.0, color: 0xe53935, size: 0.24, aoe: 1, aoeDmg: 50 },
  giant:    { hp: 300, speed: 0.4, color: 0x4a5d4a, size: 0.48, aoe: 0, attacksWalls: true },
};

// Daño que un enemigo inflige a la base al alcanzar el centro.
export const BASE_HIT_DMG = 25;
