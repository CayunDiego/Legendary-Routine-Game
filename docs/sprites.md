# Sprites

Los personajes salen de hojas de sprites. `npm run sprites` mide la hoja cruda,
recorta los cuadros, arma una versión liviana en `src/assets/` y escribe las
coordenadas en `src/config/recortes.json`. **Cambiar un sprite no toca código.**

```bash
npm run sprites               # todas
npm run sprites -- companero  # una sola
npm run sprites -- --plantillas   # cuadrículas rotuladas en arte-fuente/_plantillas/
```

Requiere Python: `pip install pillow numpy`. El original de `arte-fuente/` no se
toca nunca.

## Hojas de hoy (`scripts/sprites.json`)

| Fuente en `arte-fuente/` | Forma |
|---|---|
| `kath.png` | 4 cuadros x 4 direcciones, celda 24x32 |
| `kath_baile.png` | igual |
| `kath_sentada.png` | igual, **con la silla dibujada adentro** |
| `diego.png` / `diego_baile.png` | igual. `diego` espeja la fila `derecha` |
| `companero.png` | 3 bloques (una etapa cada uno) x 4 filas x 4 cuadros |
| `huevo_mascota.png` | tiras de 10 cuadros; se usan `idle` y `hatch` |
| `merli.png` | 10 cuadros x 4 direcciones, celda 57x42 |

Orden de filas siempre: `abajo, izquierda, derecha, arriba` (= `motor.js#DIRS`).

`merli_hoja.png` es la única que **no** se regenera: su cruda está archivada
como `merli-crudo.png` a propósito (rehacerla sale bien pero el gato queda un
toque más grande que el publicado).

## Verificación

`arte-fuente/_revision/` queda con cada cuadro marcado en rojo y numerado, y el
nombre de cada fila en verde. Dos preguntas y listo:

1. ¿Cada recuadro encierra un dibujo entero, sin comerse al de al lado?
2. ¿El nombre verde dice para dónde mira el bicho de esa fila?

## Qué hace por dentro

1. Saca el fondo (mira el marco de 1 px; cubre gris plano y damero, y suma las
   mezclas entre los colores encontrados).
2. Encuentra los cuadros por franjas y grupos de píxeles pegados. Descarta
   rótulos (rectángulos macizos sin color) y suma las esquirlas al cuadro del
   que salieron.
3. Empaqueta sin huecos con paleta reducida (el compañero: 1 MB → 429 kB).
4. Escribe `recortes.json`.

Al bajar de escala promedia el color **multiplicado por el alfa**; si no, el
fondo que quedó "debajo" de lo transparente deja un halo claro.

## Cuando algo sale mal

Todo se ajusta en `scripts/sprites.json`. Nada de esto obliga a tocar el juego.

| Síntoma | Perilla |
|---|---|
| "se encontraron N filas y el manifiesto describe M" | `orden` — cómo se llama cada fila, de arriba hacia abajo. `null` para las que no se usan |
| Los recuadros no encierran bien | `ruido` (qué tan llena tiene que estar una fila) → `hueco` (píxeles vacíos tolerados adentro) → `tolerancia` → `minima_banda` |
| Los cuadros de una fila se pisan y no hay hueco donde cortar | `cortes: {"3": [150, 284, ...]}` — la clave es el nº de fila desde 0; los números se leen de la regla de la imagen de revisión |
| Una pose mira para el lado equivocado | `espejar: ["derecha"]` — espeja cuadro por cuadro, así la caminata sigue yendo para adelante. Sólo modo `grilla` |
| Quedó una reja de líneas finas | ya resuelto (las mezclas). Si aún queda, subir `tolerancia` |
| **El fondo a cuadros salió entero** | la detección pide que cada gris ocupe ≥5% del marco; un damero con degradé lo reparte en decenas de tonos y ninguno llega. Escribirlos a mano: `"fondo": [[208,207,213],[150,150,160]]`. Los intermedios los completa el script. Pasó con `kath_sentada` |

Cómo darse cuenta del espejado sin ojo de relojero: las dos poses de perfil
tienen que ser espejo una de la otra. Si las dos miran para el mismo lado, falta.

Los rótulos del generador no sirven para nombrar filas: en la hoja del compañero
están cruzados (la que dice "LEFT" mira a la derecha). Ese es el único dato que
el script **no puede** adivinar.

## Lo que el script NO hace

- Tamaño en pantalla y velocidad → `motor.js` (`ESC_JUG`, `BICHO_ESC`, `MERLI_CUADRO_MS`).
- Agregar un personaje nuevo al juego (medirlo sí, dibujarlo es código).
- Decir si la hoja está linda. Eso es `npm run dev`.

## Límites de la hoja de Kath

Celda 24x32 fija: los disfraces (`engine/disfraces.js`) se dibujan encima
contando desde ese tamaño. Y las tres hojas de Kath (caminar, baile, sentada)
tienen que compartir **la posición de la cabeza** — hoy: fila 2 de frente, fila
4 de espaldas, columnas 3 a 20 — o los accesorios quedan flotando. Es lo primero
que hay que mirar si se rehace una.

Arte todavía sin hoja → `prompt-generador.md`.
