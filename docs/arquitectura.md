# Arquitectura

## Capas y quién importa a quién

```
config/  →  engine/ · state/  →  game/  →  components/
```

Reglas que sostienen eso:

- `engine/motor.js` **no** importa `state/gameLogic.js`. Sería ciclo. En su
  lugar `game/juego.js` le inyecta lo que necesita con `motor.conectar({...})`:
  `juegoActivo`, `misionPorId`, `hechoHoy`, `puedeEclosionar`, `etapaBicho`,
  `estado`, `alPisarCesped`. El motor los llama como `juego.loQueSea()`.
- `state/niveles.js` no importa nada. Existe aparte porque `fusion.js` y
  `gameLogic.js` necesitan la curva de XP y de otra forma sería ciclo.
- `components/` sólo dibuja. Ninguna decisión de juego vive ahí. Lo que un
  componente necesita disparar entra por `state/GameContext.jsx`.

## Estado fuera de React

`EST` (la partida) vive en `state/gameLogic.js`, se muta ahí y **el motor lo lee
en cada frame**. Meterlo en un contexto de React redibujaría el árbol entero 60
veces por segundo.

Los componentes se suscriben con `useSyncExternalStore` (`hooks/useStore.js`)
a dos stores separados (`state/store.js`):

| Store | Avisa cuando | Hook |
|---|---|---|
| `gameLogic` | se guarda la partida (o sea, cambió algo real) | `useLogica()` |
| `ui` | cambia modo / pestaña / flotantes / banner / modal | `useUI()` |

**`guardar()` es el único lugar que avisa al store del juego.** Mutar `EST` sin
llamar a `guardar()` = la interfaz no se entera. Es a propósito.

`guardar()` compara una huella antes de escribir: si nada cambió, no escribe, no
sube `seq`, no redibuja y no despierta la nube. Por eso cerrar un diálogo no
cuesta nada.

## Modos de la interfaz (`state/ui.js`)

`titulo` → `juego` → `dialogo` | `menu` | `modal`

`juegoActivo()` es `modo === 'juego'`. El motor lo consulta para frenar a Kath.
`modal` existe aparte de `dialogo` porque es el único lugar donde el teclado
escribe en vez de jugar.

## Bucle de render (`motor.js#bucle`)

```
actualizarJugadora → actualizarPersonajes → actualizarBicho → actualizarMerli
→ actualizarHuevo → actualizarAura → actualizarCamara → dibujar
```

`dt` viene capado a 50 ms: volver de segundo plano no puede teletransportar nada.

Lo que **no** va en el bucle: el pomodoro. El navegador frena los rAF de una
pestaña escondida, que es justo cuando el pomodoro tiene que correr. Late en un
`setInterval` de 1 s en `game/juego.js`, más un chequeo en `visibilitychange`.

## Dibujo: el orden es todo

`dibujar()` pinta en este orden:

1. tiles del piso
2. sombra bajo las paredes
3. objetos `decor` (alfombras, flores) — plano, antes que todo
4. **lista ordenada por `base`** (borde de abajo en píxeles): objetos, jugadora,
   compañero, Merlí. Menor base = más lejos = se dibuja antes.
5. `aplicarLuzAmbiente()` — el tinte de la hora, encima de todo

Empates de `base` los desempataba el orden de la lista, o sea el azar. Donde
importa se sesga a mano (Kath sentada: `base - 1`, así el sillón la tapa).

## Grilla y escalas

| Constante | Valor | Dónde |
|---|---|---|
| `TILE_SRC` | 16 px (grilla de origen) | `engine/drawing.js` |
| `S` | 3 (escala) | idem |
| `TILE` | 48 px en pantalla | idem |
| `ESC_JUG` | 3 | `motor.js` |
| celda de Kath | 24 x 32 | `config/recortes.json` |
| `PIES` | 30 (fila donde terminan los pies dentro del cuadro) | `motor.js` |

**`S === ESC_JUG === 3`**: 1 px de arte por código = 1 px de sprite = 3 px de
pantalla. Por eso un mueble dibujado a mano se puede medir copiando píxeles de
una hoja de sprites (así se hizo la silla del escritorio).

El sprite se dibuja en `dy = py + TILE - PIES*ESC_JUG - 3`, o sea **sobresale
una fila de origen (3 px) por debajo de la casilla**. Parada eso es la sombra;
sentada en el sillón son las patas de la silla, y hay que hundirla esos 3 px.

## Arte por código (`engine/objetos.js`)

Los muebles no son PNG: son listas de rectángulos `[x, y, w, h, color]` en una
grilla de 16 (o 16·tw x 16·th), pintadas una vez a un canvas y cacheadas en
`SPR`. Helpers: `circ()`, `oval()`.

Ventaja: pesan cero y se editan sin herramientas. Costo: no hay previsualización
— para mirar un cambio sin levantar el navegador conviene componer la escena
aparte leyendo los rects del archivo.

Los personajes sí son hojas de sprites → `sprites.md`.

## Sonido

`engine/sonido.js`, WebAudio sintetizado, sin archivos. `iniciarAudio()` en el
primer toque (los navegadores exigen gesto del usuario). Claves: `ok`, `menu`,
`moneda`, `nivel`, `eclosion`, `texto`, `bloqueo`.
