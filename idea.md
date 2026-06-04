# Aris — Defensa de la Colonia Marciana

## Premisa

Eres el comandante de la primera colonia humana en Marte. Los marcianos nativos contraatacan en oleadas crecientes. Extraes minerales del suelo marciano, generas energía con reactores y construyes defensas alrededor de tu **Base Principal** antes de que llegue cada oleada.

---

## Mapa

- **Grid 16×16** (ampliado desde 8×8 en `constants.js`)
- Cámara isométrica que **panea** con click derecho + arrastre (o teclas WASD)
- El mapa **no se pré-carga completo**: el terreno base es roca marciana (rojo/naranja), y aparecen dispersos depósitos de recursos (3-5 de cada tipo, posición aleatoria al iniciar)
- La Base Principal se coloca en el centro (8,8) al arrancar

### Terreno

| Tile | Color | Efecto |
|------|-------|--------|
| Roca marciana | Rojo-naranja | Default, buildable |
| Polvo marciano | Marrón claro | Buildable, marcianos avanzan más rápido |
| Cráter | Gris oscuro | No buildable, frena marcianos |
| Depósito de hierro | Gris metálico | Construir Mina encima |
| Cristal de energía | Azul-violeta | Construir Extractor encima |

---

## Recursos (3 tipos)

| Recurso | Cómo se obtiene | Uso |
|---------|----------------|-----|
| **⚙ Hierro** | Mina de hierro / depósitos | Construir estructuras básicas, muros |
| **⚡ Energía** | Reactor / cristales | Construir torres, upgrades |
| **💎 Cristales** | Extractor en cristal | Upgrades avanzados únicamente |

Sin madera. Sin comida por defecto — la Hidropónica es una estructura opcional que no es necesaria para ganar.

---

## Base Principal (2×2 celdas — objetivo a defender)

Estructura central que ocupa 4 celdas. Usa `buildSquareHouse` adaptado con skin marciana (muros grises, domo en lugar de techo a dos aguas).

| Nivel | Costo | Efecto |
|-------|-------|--------|
| Base | — | 200 HP, genera +2 hierro/seg |
| **Upgrade 1** — Blindaje | 20 hierro + 10 energía | HP → 400, armadura +50% daño reducido |
| **Upgrade 2** — Torreta Integrada | 15 energía + 5 cristales | Auto-dispara al enemigo más cercano en rango 4 |

---

## Estructuras (con 2 upgrades cada una)

### 🏭 Mina de Hierro (1×1)
Se coloca **encima de un depósito de hierro** (tile gris metálico).
| Nivel | Costo | Producción |
|-------|-------|-----------|
| Básica | 5 hierro | +3 hierro/seg |
| **Upgrade 1** — Taladro | 10 hierro | +6 hierro/seg |
| **Upgrade 2** — Explosivos | 8 energía | +10 hierro/seg + produce 1 cristal/30 seg |

### ⚡ Reactor de Energía (1×1)
Se coloca **encima de un cristal de energía**.
| Nivel | Costo | Producción |
|-------|-------|-----------|
| Básico | 8 hierro | +3 energía/seg |
| **Upgrade 1** — Sobrecarga | 10 hierro | +6 energía/seg |
| **Upgrade 2** — Fusión | 5 cristales | +12 energía/seg |

### 🗼 Torre de Plasma (1×1)
Torre defensiva de largo alcance.
| Nivel | Costo | Stats |
|-------|-------|-------|
| Básica | 12 hierro + 8 energía | Rango 3, disparo cada 2 seg, 15 daño |
| **Upgrade 1** — Cañón Rápido | 10 energía | Disparo cada 1 seg |
| **Upgrade 2** — Plasma AOE | 8 cristales | Proyectil explota r=1 celda, 30 daño |

*Visualmente: cilindro gris plateado con cañón en la cima que rota hacia el objetivo.*

### 🧱 Muro de Titanio (1×1)
Barrera estructural. Soporta impactos antes de destruirse.
| Nivel | Costo | HP |
|-------|-------|-----|
| Básico | 6 hierro | 60 HP |
| **Upgrade 1** — Reforzado | 8 hierro | 150 HP |
| **Upgrade 2** — Electrificado | 6 energía | 150 HP + devuelve 10 daño por hit |

*Visualmente: roundedSlab gris oscuro alto (0.8u), con línea luminosa en Upgrade 2.*

### 🌿 Hidropónica (1×1) — opcional
No necesaria para ganar. Produce biomasa para un buff de regeneración de la Base.
| Nivel | Costo | Efecto |
|-------|-------|--------|
| Básica | 10 hierro + 5 energía | Base recupera +1 HP/seg |
| **Upgrade 1** — Acelerador | 8 energía | +3 HP/seg |
| **Upgrade 2** — Nanobots | 5 cristales | Repara estructuras adyacentes +1 HP/seg |

*Visualmente: cubo verde brillante pequeño con plantas estilizadas encima (cilindros verdes).*

---

## Enemigos (3 tipos a modelar)

### 👾 Scout Marciano
- **Forma:** esfera pequeña verde (r=0.22) + 2 antenas finas
- **Stats:** 30 HP, velocidad 1.5 celdas/seg
- **Comportamiento:** camina directo al centro ignorando muros laterales, busca el camino libre más corto (sin pathfinding real: prueba 3 direcciones, toma la que acerque más al centro)
- **Oleadas:** aparece desde la oleada 1

### 🤖 Tanque Marciano
- **Forma:** cubo gris-verde más grande (0.5u) con "blindaje" visual (BoxGeometry con aristas biseladas)
- **Stats:** 150 HP, velocidad 0.5 celdas/seg, ataca muros/torres por el camino
- **Comportamiento:** si hay muro adyacente, lo ataca hasta destruirlo antes de avanzar
- **Oleadas:** aparece desde oleada 2

### 💥 Kamikaze
- **Forma:** esfera roja pulsante (shader simple: oscila `emissiveIntensity` en el loop)
- **Stats:** 20 HP, velocidad 2 celdas/seg, al llegar al objetivo explota en r=1 celda (50 daño AOE)
- **Comportamiento:** elige el camino más directo sin detenerse por nada
- **Oleadas:** aparece desde oleada 3

---

## Oleadas

```
Fase Construcción (45 seg) → Fase Invasión → Recompensa → siguiente oleada
```

| Oleada | Enemies | Composición |
|--------|---------|-------------|
| 1 | 4 | 4 scouts |
| 2 | 7 | 4 scouts + 3 tanques |
| 3 | 10 | 4 scouts + 3 tanques + 3 kamikazes |
| 4 | 14 | mix + velocidad +15% |
| 5 (**FINAL**) | 20 | todo + 2 tanques gigantes (300 HP) |

**Game Over:** un enemigo llega al centro de la Base Principal.  
**Victoria:** sobrevivir oleada 5.

---

## HUD

```
[⚙ 24]  [⚡ 18]  [💎 3]          Oleada 2/5     ⏱ 38s
```

Barra horizontal fija arriba al centro. Abajo a la izquierda: HP de la Base (barra de vida). Click en estructura existente abre mini-panel con botón de upgrade.

---

## Archivos nuevos a crear

```
src/
  game/
    resources.js      contadores + UI, produce por tick
    waves.js          timer de fase, spawn de oleadas, win/lose
    enemies.js        mesh por tipo, movimiento, HP, ataque a estructuras
    projectiles.js    pool de proyectiles, lerp animación, impacto/AOE
    combat.js         detección rango torres, disparo, colisiones
    upgrades.js       sistema de upgrade por click en estructura
  factories/
    tower.js          mesh Torre de Plasma (cilindro + cañón rotante)
    wall.js           mesh Muro de Titanio (slab alto gris)
    reactor.js        mesh Reactor (cubo metálico + antena)
    mine.js           mesh Mina (cubo industrial + taladro)
    hydroponics.js    mesh Hidropónica (cubo verde + plantas)
```

Cambios en archivos existentes:
- `constants.js` → `GRID = 16`
- `world/state.js` → añadir tile types: `rock_mars`, `dust`, `crater`, `iron_deposit`, `crystal_deposit`
- `input/controls.js` → añadir paneo de cámara con click derecho / WASD
- `input/tools.js` → 5 tools nuevas (Torre, Muro, Reactor, Mina, Hidropónica)
- `main.js` → tick de recursos, enemies, projectiles, combat en el loop

---

## Qué NO hacer (para terminar en 1 hora)

- Sin pathfinding A* — movimiento vectorial directo al centro con desviación simple
- Sin animaciones de muerte elaboradas — enemigo desaparece con scale(0) en 0.2 seg
- Sin guardado ni menú
- Sin efectos de sonido
- Sin más de 3 tipos de enemigos
- Sin niebla de guerra

---

## Orden de implementación (sprints de 10 min)

1. **Grid 16×16 + tiles marcianos + paneo cámara** — `constants.js`, `state.js`, `controls.js`
2. **Recursos** — `resources.js`, UI barra, producción pasiva por tick
3. **Base Principal 2×2 + factories básicos** — adaptar `buildSquareHouse`, `mine.js`, `reactor.js`
4. **Enemigos** — `enemies.js`, 3 meshes, spawn en bordes, movimiento
5. **Torres + proyectiles** — `tower.js`, `combat.js`, `projectiles.js`
6. **Oleadas + win/lose + upgrades** — `waves.js`, `upgrades.js`, overlay de resultado
