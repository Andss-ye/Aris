# TASKS — Aris: Defensa de la Colonia Marciana

Plan de trabajo para **3 desarrolladores 100% independientes**. Tras una
**Fase 0 única** (el esqueleto), cada quien construye su vertical **sin leer ni
esperar el código de los demás**, programando solo contra los *contratos*
(sección 3) y probando con *placeholders* que ya funcionan.

- **Jonathan** → Estructuras y mundo (todo lo que aparece en el grid)
- **Andrew** → Economía, oleadas, UI e input (los sistemas y el bucle)
- **Julian** → Enemigos, combate y proyectiles (la lógica de algoritmo)

Referencia de diseño: `idea.md`. Arquitectura: `CLAUDE.md`.

---

## 1. Cómo logramos independencia TOTAL

El acoplamiento es inevitable a nivel de *interfaz* (alguien spawnea enemigos,
alguien cobra recursos). Lo eliminamos a nivel de *código* con 3 mecanismos:

1. **Contratos congelados (sección 3).** Firmas de función fijas. Programas
   contra la firma, no contra la implementación del otro.
2. **Esqueleto que camina (Fase 0).** Antes de paralelizar creamos UNA vez todos
   los módulos con un **placeholder que ya funciona**: `resources` regala dinero
   infinito, `enemies.spawn` crea un cubo que camina al centro, `STRUCT` trae los
   números. El juego **arranca y corre** desde el minuto 0.
3. **Cada quien reemplaza solo SUS placeholders.** Como los otros dos siguen
   funcionando, la app nunca se rompe. Nadie importa el código real de nadie;
   importa el contrato, que siempre está presente.

> **Resultado:** después de Fase 0, los tres pueden trabajar offline, en
> cualquier orden, sin merges bloqueantes. El único momento compartido es Fase 0
> (≈10 min, se hace junto y se mergea a `main`).

**Prueba aislada:** cada vertical trae su propio `dev-harness` (sección 5) para
ejercitar su parte sin tocar las otras dos.

---

## 2. Matriz de propiedad (nadie edita el archivo de otro)

| Archivo | Dueño | Acción |
|---------|-------|--------|
| `src/config/constants.js` | **Jonathan** | editar: `GRID = 16` |
| `src/config/structures.js` | **Jonathan** | NUEVO: costos/stats/upgrades |
| `src/world/state.js` | **Jonathan** | editar: terrenos + `hp/maxHp/level` |
| `src/world/render.js` | **Jonathan** | editar: ramas por kind |
| `src/factories/tile.js` | **Jonathan** | editar: terrenos marcianos |
| `src/factories/base.js` | **Jonathan** | NUEVO: Base 2×2 |
| `src/factories/tower.js` | **Jonathan** | NUEVO |
| `src/factories/wall.js` | **Jonathan** | NUEVO |
| `src/factories/mine.js` | **Jonathan** | NUEVO |
| `src/factories/reactor.js` | **Jonathan** | NUEVO |
| `src/factories/hydroponics.js` | **Jonathan** | NUEVO |
| `src/scenes/initialScene.js` | **Jonathan** | editar: colonia + depósitos |
| `src/config/economy.js` | **Andrew** | NUEVO: producción, oleadas, timers |
| `src/game/resources.js` | **Andrew** | NUEVO |
| `src/game/waves.js` | **Andrew** | NUEVO |
| `src/game/upgrades.js` | **Andrew** | NUEVO |
| `src/input/tools.js` | **Andrew** | editar: 5 tools + chequeo de costo |
| `src/input/controls.js` | **Andrew** | editar: paneo + click→upgrade |
| `src/core/engine.js` | **Andrew** | editar: añadir `pan(dx,dz)` |
| `src/main.js` | **Andrew** | editar: cablear el loop |
| `styles/main.css` | **Andrew** | editar: HUD/paneles/overlay |
| `src/config/enemies.js` | **Julian** | NUEVO: stats de enemigos |
| `src/game/enemies.js` | **Julian** | NUEVO |
| `src/game/projectiles.js` | **Julian** | NUEVO |
| `src/game/combat.js` | **Julian** | NUEVO |

**Congelados (NADIE toca):** `index.html`, `core/animation.js`,
`geometry/shapes.js`, `materials/materials.js`, `world/adjacency.js`,
`effects/smoke.js`, `factories/nature.js`, `factories/fence.js`,
`factories/house/*`.

> **Andrew posee `main.js`** (el bucle). Importa los `tick()` de Jonathan y
> Julian — que **ya existen como placeholder** desde Fase 0, así que Andrew nunca
> se bloquea ni edita archivos de ellos.

---

## 3. Contratos congelados (la ÚNICA interfaz entre verticales)

### 3.1 Estado del mundo — lo define **Jonathan**, lo leen todos

```js
world[x][z] = {
  terrain,  // 'rock_mars'|'dust'|'crater'|'iron_deposit'|'crystal_deposit'
  kind,     // null|'base'|'tower'|'wall'|'mine'|'reactor'|'hydroponics'
  level,    // 0|1|2
  hp, maxHp // estructuras dañables
}
// 'base' ocupa 4 celdas; solo la ancla (min x,z) renderiza.
```

### 3.2 API de Recursos — la define **Andrew**, la consumen Jonathan/Julian

```js
get(type) -> number            // 'iron'|'energy'|'crystal'
canAfford(cost) -> boolean     // cost {iron?,energy?,crystal?}
spend(cost) -> boolean
add(type, n)
damageBase(n)                  // Julian la llama cuando un enemigo llega al centro
baseHp() -> number
healBase(n)
tick(dt)                       // producción + HUD
reset()
```

### 3.3 API de Enemigos/Combate — la define **Julian**, la consumen Andrew/Jonathan

```js
// enemies.js
spawn(type, edgeCell)          // 'scout'|'tanque'|'kamikaze'; {x,z}
tick(dt)
list() -> [{id,type,pos,hp,mesh}]
damage(id, amount)
count() -> number              // Andrew/waves consulta fin de oleada
clear()
// combat.js
tick(dt)
// projectiles.js
fire(from, targetId, dmg, aoe)
tick(dt)
```

Julian llama `resources.damageBase(n)` al centro; **no** importa `waves.js`
(evita ciclos). Lee stats de torre de `STRUCT` y torres de `world`.

### 3.4 API de Oleadas — la define **Andrew**

```js
// waves.js
tick(dt)
start()
let state   // 'build'|'invasion'|'won'|'lost'
```

### 3.5 Config de estructuras — la define **Jonathan**, la leen Andrew/Julian

```js
export const STRUCT = {
  base:        { footprint:2, levels:[{hp:200,ironPerSec:2}, ...] },
  mine:        { tile:'iron_deposit',    levels:[{cost:{iron:5}, ironPerSec:3}, ...] },
  reactor:     { tile:'crystal_deposit', levels:[{cost:{iron:8}, energyPerSec:3}, ...] },
  tower:       { levels:[{cost:{iron:12,energy:8}, range:3, fireRate:2, dmg:15, aoe:0}, ...] },
  wall:        { levels:[{cost:{iron:6}, hp:60}, ...] },
  hydroponics: { levels:[{cost:{iron:10,energy:5}, baseHealPerSec:1}, ...] },
};
```

### 3.6 Daño a muros (la única excepción acordada)

Julian, al chocar un enemigo con `kind:'wall'`, llama un helper que **Jonathan
expone** en `world/render.js`: `export function damageStructure(x,z,dmg)`
(decrementa `hp`, y si `hp<=0` hace `setCell(x,z,{kind:null})`). Así Julian
**no** muta `world` directamente. Esta firma se congela en Fase 0.

---

## 4. Fase 0 — El esqueleto que camina (≈10 min, juntos, una sola vez)

Objetivo: que `main` arranque y corra con TODOS los contratos presentes como
placeholder funcional. Pasos:

1. Crear **todos** los archivos NUEVOS con su firma de contrato y un
   **placeholder que funciona** (no vacío):
   - `resources.js` → recursos = 9999, `canAfford→true`, `spend→true`,
     `damageBase`/`tick` no-op, HUD estático.
   - `enemies.js` → `spawn` crea un cubo simple que avanza al centro;
     `list/count/damage/clear` mínimos reales.
   - `combat.js`/`projectiles.js` → `tick` no-op.
   - `waves.js` → spawnea 1 enemigo cada 3 s (para ver movimiento).
   - `config/structures.js` → `STRUCT` con los números reales de `idea.md`.
   - `config/enemies.js`, `config/economy.js` → constantes reales.
   - `render.js` → `damageStructure` real; ramas de kind que por ahora dibujan
     un cubo de color por tipo (placeholder de malla).
2. **Andrew** cablea `main.js` con el loop y todos los `tick`. Compila porque
   todo existe.
3. Congelar firmas de sección 3. Merge a `main`.
4. Abrir ramas: `feat/structures-jonathan`, `feat/systems-andrew`,
   `feat/combat-julian`.

Desde aquí: **cero dependencias bloqueantes.** Cada quien reemplaza sus
placeholders; los otros dos siguen corriendo.

---

## 5. Tareas por persona (con harness de prueba aislado)

### 🏗️ JONATHAN — Estructuras y mundo

**Consume (solo contrato):** nada de los demás. (El más independiente → mergea
primero.)
**Produce:** `STRUCT`, forma de `world`, `damageStructure`, todas las mallas.

Pasos: `GRID=16` → terrenos marcianos en `state.js`/`tile.js` → `STRUCT`
completo → factories `base/tower/wall/mine/reactor/hydroponics` (cada una
`make<X>(level)`, torre expone `userData.cannon`) → ramas reales en
`renderCellObject` → `damageStructure` → colonia inicial con depósitos.

**Harness aislado:** en consola del navegador, `setCell(x,z,{kind:'tower',level:0})`
y subir `level` para ver cada malla. No necesita recursos ni enemigos.

**DoD:** cada estructura y nivel renderiza; base 2×2 ancla bien; `damageStructure`
destruye un muro al llegar a 0.

---

### 🎛️ ANDREW — Economía, oleadas, UI e input

**Consume (solo contrato):** `enemies.spawn/count/clear` (placeholder de Julian),
`STRUCT` (placeholder de Jonathan), `setCell` (placeholder de Jonathan).
**Produce:** `resources` API, `waves` API, HUD, tools, controles, `pan`, `main.js`.

Pasos: `config/economy.js` (recursos iniciales, fase 45 s, tabla W1–W5) →
`resources.js` (contadores, producción leyendo `world`, HP base, HUD DOM) →
`waves.js` (build↔invasion, spawnea vía `enemies.spawn`, fin con
`enemies.count()===0`, win tras W5, lost si `baseHp()<=0`, overlay+reinicio) →
`upgrades.js` (panel al click, cobra y `setCell`) → `tools.js` (5 tools, valida
terreno + `canAfford/spend`) → `controls.js` (paneo WASD/derecho + click) →
`engine.pan` → `main.js` loop → CSS.

**Harness aislado:** el placeholder de `enemies` ya spawnea cubos que caminan; el
de `STRUCT` ya trae números. Andrew prueba HUD, oleadas y compras sin el código
real de los otros.

**DoD:** HUD en vivo; timer alterna fases; oleadas spawnean; comprar/upgrade
descuenta; victoria/derrota con reinicio.

---

### 👾 JULIAN — Enemigos, combate y proyectiles

**Consume (solo contrato):** `resources.damageBase` (placeholder de Andrew),
`STRUCT.tower` + `damageStructure` + `world` (placeholder de Jonathan),
`worldGroup` (engine, congelado).
**Produce:** `enemies` API, `combat`, `projectiles`, `config/enemies.js`.

Pasos: `config/enemies.js` (scout/tanque/kamikaze + multiplicadores) →
`enemies.js` (3 mallas, array plano, movimiento al centro sin A*, ataque a muros
vía `damageStructure`, `damageBase` al centro, pulso kamikaze) →
`projectiles.js` (pool, lerp, impacto/AOE → `enemies.damage`) → `combat.js`
(recorre torres en `world`, targeting con `list()`, cadencia, rota `cannon`,
`projectiles.fire`).

**Harness aislado:** el placeholder de `resources` absorbe `damageBase`; coloca
una torre de prueba con `setCell` (malla placeholder de Jonathan sirve). Julian
prueba spawn, movimiento y disparo sin el código real de los otros.

**DoD:** enemigos cruzan el mapa; torre apunta y derriba; kamikaze hace AOE;
muros frenan tanques.

---

## 6. Orden de merge

1. **Fase 0** (esqueleto) → `main`.
2. Cualquier orden después — los tres archivos no se solapan y todos corren
   sobre placeholders. Recomendado: **Jonathan** primero (su `STRUCT`/mallas dan
   realismo), luego Andrew y Julian.
3. Humo final juntos: partida completa de 5 oleadas.

---

## 7. Checklist "terminado"

- [ ] `find src -name '*.js' | xargs -I{} node --check {}` limpio.
- [ ] Grid 16×16, terreno marciano, depósitos; cámara panea.
- [ ] HUD: 3 recursos + oleada + timer + vida de base.
- [ ] 5 estructuras colocables, validan terreno, descuentan recursos.
- [ ] 2 upgrades por estructura cambian malla y stats.
- [ ] Base 2×2 como objetivo.
- [ ] 3 enemigos: aparecen, se mueven, atacan, mueren.
- [ ] Torres apuntan/disparan; proyectiles + AOE.
- [ ] 5 oleadas con escalado; victoria/derrota + reinicio.
