/* =====================================================================
   Aris — stats de enemigos
   Dueño: JULIAN. velocidad en celdas/seg, hp, tamaño de malla, AOE.
   ===================================================================== */

// Campos numéricos = gameplay (no se tocan). accent/detail/glow = solo visual,
// los leen las mallas en game/enemies.js.
// `dmg` = daño POR SEGUNDO que el enemigo inflige a cualquier estructura (o a la
// Base) con la que choca en su camino al centro. El kamikaze no usa `dmg`: estalla
// al contacto con `aoeDmg`.
export const ENEMIES = {
  scout:    { hp: 30,  speed: 1.5, dmg: 12, color: 0x4caf50, size: 0.22, aoe: 0,            accent: 0x8bc34a, detail: 0x10220f, glow: 0xffeb3b },
  tanque:   { hp: 150, speed: 0.5, dmg: 40, color: 0x6b8e6b, size: 0.34, aoe: 0, attacksWalls: true, accent: 0x2e2e2e, detail: 0x9aa89a, glow: 0x000000 },
  kamikaze: { hp: 20,  speed: 2.0, dmg: 0,  color: 0xe53935, size: 0.24, aoe: 1, aoeDmg: 50, accent: 0xffd54f, detail: 0x7f1d1d, glow: 0xff5722 },
  giant:    { hp: 300, speed: 0.4, dmg: 60, color: 0x4a5d4a, size: 0.48, aoe: 0, attacksWalls: true, accent: 0x2e2e2e, detail: 0x6a7d6a, glow: 0x000000 },
};

// Daño que un enemigo inflige a la base al alcanzar el centro (golpe puntual de
// respaldo si llega al núcleo sin haber chocado antes con una celda de la Base).
export const BASE_HIT_DMG = 25;

// Daño por segundo de respaldo para enemigos sin `dmg` definido al golpear una
// estructura que bloquea su camino.
export const WALL_DPS = 40;
