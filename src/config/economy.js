/* =====================================================================
   Aris — economía: recursos iniciales, dificultad, fases y tabla de oleadas.
   Dueño: ANDREW. Constantes reales que balancean el juego. Las leen
   resources.js y waves.js (ambos de Andrew); nadie más depende de esto.
   ===================================================================== */

// Recursos al iniciar (nivel Normal). La dificultad escala con startMul.
export const START = { iron: 30, energy: 15, crystal: 0 };

// Segundos de fase de construcción por defecto (la dificultad lo sobreescribe).
export const BUILD_TIME = 45;

// Segundos entre spawns dentro de una oleada.
export const SPAWN_INTERVAL = 0.8;

// Bonus al limpiar una oleada (no se da tras la oleada final).
export const WAVE_REWARD = { iron: 15, energy: 10 };

// Dificultades seleccionables en el menú. startMul escala recursos iniciales;
// buildTime ajusta el tiempo de construcción por fase.
export const DIFFICULTY = {
  facil:   { id: 'facil',   label: 'Fácil',   startMul: 1.6, buildTime: 60, hint: 'Más recursos y tiempo' },
  normal:  { id: 'normal',  label: 'Normal',  startMul: 1.0, buildTime: 45, hint: 'Experiencia equilibrada' },
  dificil: { id: 'dificil', label: 'Difícil', startMul: 0.7, buildTime: 30, hint: 'Recursos y tiempo justos' },
};
export const DEFAULT_DIFFICULTY = 'normal';

// Tabla de 5 oleadas. Cada entrada = conteo por tipo de enemigo (Julian define
// los tipos en config/enemies.js; aquí solo decidimos cuántos y cuándo).
export const WAVES = [
  { scout: 4 },
  { scout: 4, tanque: 3 },
  { scout: 5, tanque: 3, kamikaze: 2 },
  { scout: 6, tanque: 4, kamikaze: 3 },
  { scout: 6, tanque: 4, kamikaze: 4, giant: 2 },
];
