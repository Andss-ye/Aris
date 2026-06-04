/* =====================================================================
   Aris — economía: recursos iniciales, duración de fases, tabla de oleadas
   Dueño: ANDREW. Constantes reales para arrancar el balance del juego.
   ===================================================================== */

// Recursos al iniciar la partida.
export const START = { iron: 30, energy: 15, crystal: 0 };

// Segundos de fase de construcción antes de cada oleada.
export const BUILD_TIME = 45;

// Segundos entre spawns dentro de una oleada.
export const SPAWN_INTERVAL = 0.8;

// Tabla de 5 oleadas. Cada entrada = conteo por tipo (+ speedMul opcional).
export const WAVES = [
  { scout: 4 },
  { scout: 4, tanque: 3 },
  { scout: 4, tanque: 3, kamikaze: 3 },
  { scout: 6, tanque: 4, kamikaze: 4, speedMul: 1.15 },
  { scout: 8, tanque: 6, kamikaze: 4, giant: 2 },
];
