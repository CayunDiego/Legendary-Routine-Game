# Prompts para pedir una hoja de sprites

Prompts listos para pegar en Gemini (Nano Banana) o ChatGPT. Están pensados para
que lo que vuelva pase limpio por `npm run sprites` (ver [sprites.md](sprites.md)).

Están **en inglés a propósito**: los modelos de imagen entienden bastante mejor
las instrucciones de grilla y de píxeles en inglés, aunque uno les hable en
castellano en el resto del chat.

Dos cosas antes de pedir nada:

- **Adjuntá siempre la hoja actual** (la de `arte-fuente/`) y pedí que mantenga
  el estilo, la paleta y el tamaño del personaje. Es lo que más mueve la aguja:
  sin referencia, cada tirada vuelve con otro personaje.
- **Las medidas exactas no son lo crítico.** El script mide y reescala solo. Lo
  que sí lo rompe es que los cuadros se toquen, que haya texto quemado o que el
  fondo tenga degradé. Eso es lo que los prompts machacan.

---

## Las reglas que hacen la diferencia

Este bloque va en **todos** los prompts (ya está incluido en cada uno de abajo).
Es el que traduce "que el script lo lea bien" a algo que el modelo entienda:

```
HARD REQUIREMENTS (these matter more than art style):
- Transparent background (PNG with alpha). If transparency is impossible, use a
  single flat #FF00FF magenta background, perfectly uniform, no gradient, no
  checkerboard, no vignette, and never use magenta anywhere in the artwork.
- NO text, NO labels, NO frame numbers, NO row titles, NO watermark, NO logo,
  NO grid lines, NO borders, NO drop shadows on the ground.
- Every frame must be fully separated: at least 10% of the cell width of empty
  space between frames, and the same between rows. Nothing may touch, overlap or
  bleed into the neighbouring cell — not a tail, not a wing, not a particle.
- Each character must stay inside its own cell with a clear margin on all four
  sides, and must never be cropped by the cell edge.
- Same character size and same ground line in every frame: the feet must sit at
  the same height in all frames of the sheet.
- One single light source, same lighting in every frame, no perspective change.
- Flat colours, crisp edges, no blur, no glow, no soft antialiased haze around
  the silhouette.
```

Traducción de por qué cada una:

| Regla | Qué rompe si no está |
|---|---|
| Aire entre cuadros | El script mide un solo cuadro donde hay dos → animación rota |
| Sin texto ni marcos | El filtro de rótulos aguanta carteles grises, no uno de color |
| Fondo plano o transparente | El fondo se saca por color: con degradé queda mugre pegada |
| Mismo piso en todos los cuadros | El bicho salta al caminar |
| Sin sombra en el piso | La sombra pega dos cuadros y los junta en uno |

---

## Kath (y Diego): caminata 4 x 4

El juego usa celda de 24 x 32 px. Se pide 8 veces más grande y el script la baja.

```
Create a single sprite sheet image, 768 x 1024 pixels, PNG with transparent
background.

Layout: a strict 4 columns x 4 rows grid of 192 x 256 pixel cells.
Column 1 starts at x=0, column 2 at x=192, column 3 at x=384, column 4 at x=576.
Row 1 starts at y=0, row 2 at y=256, row 3 at y=512, row 4 at y=768.

Content: a 4-frame walk cycle of the SAME character, seen from four directions.
- Row 1: character walking TOWARDS the viewer (front view, face visible).
- Row 2: character walking to the LEFT of the image (left side view).
- Row 3: character walking to the RIGHT of the image (right side view, mirrored
  pose of row 2 but redrawn, not flipped).
- Row 4: character walking AWAY from the viewer (back view, no face).
Each row is the same cycle in 4 steps: contact, passing, contact (other leg),
passing. The cycle must loop seamlessly from frame 4 back to frame 1.

Style: match the attached reference image exactly — same character, same palette,
same proportions, same pixel-art look. The character is about 200 px tall inside
a 256 px cell, standing on the bottom third of the cell, horizontally centred.

HARD REQUIREMENTS (these matter more than art style):
- Transparent background (PNG with alpha). If transparency is impossible, use a
  single flat #FF00FF magenta background, perfectly uniform, no gradient, no
  checkerboard, no vignette, and never use magenta anywhere in the artwork.
- NO text, NO labels, NO frame numbers, NO row titles, NO watermark, NO logo,
  NO grid lines, NO borders, NO drop shadows on the ground.
- Every frame must be fully separated: at least 10% of the cell width of empty
  space between frames, and the same between rows. Nothing may touch, overlap or
  bleed into the neighbouring cell — not a tail, not a wing, not a particle.
- Each character must stay inside its own cell with a clear margin on all four
  sides, and must never be cropped by the cell edge.
- Same character size and same ground line in every frame: the feet must sit at
  the same height in all frames of the sheet.
- One single light source, same lighting in every frame, no perspective change.
- Flat colours, crisp edges, no blur, no glow, no soft antialiased haze around
  the silhouette.
```

Va a `arte-fuente/kath.png` (o `diego.png`). El orden de filas ya es el que
espera el manifiesto, así que no hay que tocar nada.

**Para el baile** (`kath_baile.png`): mismo prompt, cambiando el bloque de
contenido por:

```
Content: a 4-frame DANCE loop of the same character, seen from four directions,
same row order as above (front, left, right, back). Feet stay planted; the
motion is in the hips, arms and head. The loop must be seamless.
```

---

## Compañero: 3 etapas de evolución en una hoja

Es la hoja más grande: 3 bloques (una etapa cada uno) de 4 filas x 4 cuadros.

```
Create a single sprite sheet image, 3072 x 1024 pixels, PNG with transparent
background.

Layout: a strict 12 columns x 4 rows grid of 256 x 256 pixel cells, read as
THREE blocks of 4 columns each:
- Columns 1-4  = evolution stage 1 (baby form).
- Columns 5-8  = evolution stage 2 (teen form).
- Columns 9-12 = evolution stage 3 (adult form).
Leave the three blocks visually separated by one empty cell width of background.

Rows, identical for all three blocks:
- Row 1: walking TOWARDS the viewer (front view, face visible).
- Row 2: walking to the LEFT of the image.
- Row 3: walking to the RIGHT of the image.
- Row 4: walking AWAY from the viewer (back view).
Each row is a 4-frame walk cycle that loops seamlessly.

Content: the same creature at three ages. Stage 1 is small and round and fills
about 45% of its cell height; stage 2 is mid-sized and fills about 65%; stage 3
is the tallest and fills about 90%. Same creature identity across the three:
same colours, same markings, same silhouette language — it grows, it does not
become a different animal.

Style: match the attached reference image exactly — same palette, same shading,
same pixel-art look.

HARD REQUIREMENTS (these matter more than art style):
- Transparent background (PNG with alpha). If transparency is impossible, use a
  single flat #FF00FF magenta background, perfectly uniform, no gradient, no
  checkerboard, no vignette, and never use magenta anywhere in the artwork.
- NO text, NO labels, NO frame numbers, NO row titles, NO stage titles, NO
  watermark, NO grid lines, NO borders, NO drop shadows on the ground.
- Every frame must be fully separated: at least 10% of the cell width of empty
  space between frames, and the same between rows. Nothing may touch, overlap or
  bleed into the neighbouring cell — not a tail, not an ear, not a particle.
- Each creature must stay inside its own cell with a clear margin on all four
  sides, and must never be cropped by the cell edge.
- Within a row, all four frames share the same ground line and the same size.
- One single light source, same lighting in every frame, no perspective change.
- Flat colours, crisp edges, no blur, no glow, no soft antialiased haze.
```

Con este orden de filas (frente, izquierda, derecha, espalda, igual en las tres
etapas), el manifiesto queda así — es la única edición, y es copiar y pegar:

```json
"orden": [
  ["abajo", "abajo", "abajo"],
  ["izquierda", "izquierda", "izquierda"],
  ["derecha", "derecha", "derecha"],
  ["arriba", "arriba", "arriba"]
]
```

> Ojo con esto: el orden se confirma **mirando el dibujo** en la imagen de
> revisión, nunca lo que el modelo diga que dibujó. La hoja que está hoy en el
> repo vino con la etapa 3 espejada respecto de las otras dos.

---

## Merlí: caminata de 10 cuadros

Celda del juego: 57 x 42 px (apaisada, el gato es más largo que alto).

```
Create a single sprite sheet image, 2280 x 672 pixels, PNG with transparent
background.

Layout: a strict 10 columns x 4 rows grid of 228 x 168 pixel cells (landscape
cells, wider than tall). Columns start every 228 px, rows every 168 px.

Content: a 10-frame walk cycle of the same cat, seen from four directions.
- Row 1: walking TOWARDS the viewer (front view, face visible).
- Row 2: walking to the LEFT of the image (full side view).
- Row 3: walking to the RIGHT of the image (full side view).
- Row 4: walking AWAY from the viewer (back view, tail up).
Ten frames is a slow, relaxed, smooth cat walk that loops seamlessly.

Style: match the attached reference image exactly — same cat, same orange tabby
palette, same pixel-art look. The cat fills about 80% of the cell width and
stands on the bottom of the cell.

HARD REQUIREMENTS (these matter more than art style):
- Transparent background (PNG with alpha). If transparency is impossible, use a
  single flat #FF00FF magenta background, perfectly uniform, no gradient, no
  checkerboard, no vignette, and never use magenta anywhere in the artwork.
- NO text, NO labels, NO frame numbers, NO row titles, NO watermark, NO grid
  lines, NO borders, NO drop shadows on the ground.
- Every frame must be fully separated: at least 10% of the cell width of empty
  space between frames, and the same between rows. The TAIL especially must stay
  inside its own cell.
- Same cat size and same ground line in every frame of the sheet.
- One single light source, same lighting in every frame, no perspective change.
- Flat colours, crisp edges, no blur, no glow, no soft antialiased haze.
```

---

## Huevo: dos tiras de 10 cuadros

Esta es la que más cuidado necesita: la hoja que está hoy tuvo que cortarse a
mano porque las esquirlas de un cuadro caían encima del vecino.

```
Create a single sprite sheet image, 2560 x 512 pixels, PNG with transparent
background.

Layout: a strict 10 columns x 2 rows grid of 256 x 256 pixel cells.

Content:
- Row 1: a 10-frame IDLE loop of an intact egg — a soft wobble, tilting left and
  right and settling. The egg is whole in all ten frames. The loop is seamless.
- Row 2: a 10-frame HATCHING sequence, in order: intact egg, first crack, the
  crack spreading, a hole opening, the top breaking off, the egg bursting open,
  and the last frames settling into a broken empty shell that stays as scenery.

Style: match the attached reference image exactly — same egg, same speckled
pattern, same palette, same shading.

HARD REQUIREMENTS (these matter more than art style):
- Transparent background (PNG with alpha). If transparency is impossible, use a
  single flat #FF00FF magenta background, perfectly uniform, no gradient, no
  checkerboard, no vignette, and never use magenta anywhere in the artwork.
- NO text, NO labels, NO frame numbers, NO row titles, NO watermark, NO grid
  lines, NO borders, NO drop shadows on the ground.
- CRITICAL: every flying shell fragment, crumb and yolk splash must stay fully
  inside its own 256 x 256 cell, with at least 24 px of empty space to each cell
  edge. No debris may cross into the neighbouring frame. This is more important
  than making the explosion look big.
- The egg sits on the same ground line in every frame.
- One single light source, same lighting in every frame, no perspective change.
- Crisp edges, no blur, no glow around the silhouette.
```

---

## Antes de correr el script: la revisión de 20 segundos

Abrí la imagen que volvió y mirá estas cinco cosas. Si alguna falla, conviene
pedirla de nuevo antes que arreglarla a mano:

1. **¿Se tocan dos cuadros?** Aunque sea una punta de cola. Es el problema que
   más ensucia el resultado.
2. **¿Hay texto, números o un marco?** Pedir de nuevo sin eso.
3. **¿El fondo es parejo?** Un degradé suave (aunque sea casi invisible) deja
   manchas al recortar.
4. **¿Los pies están a la misma altura en toda la fila?** Si no, el personaje va
   a saltar al caminar.
5. **¿Es el mismo personaje en todos los cuadros?** Los modelos le cambian un
   detalle a mitad de la fila (un color, una oreja) y se nota en movimiento.

Después: `npm run sprites`, mirar `arte-fuente/_revision/` y `npm run dev`.

---

## Prompts de arreglo

Cuando la hoja está buena pero tiene un defecto puntual, sale más barato
retocarla que volver a generarla. Nano Banana es especialmente bueno en esto:

```
Edit the attached sprite sheet. Keep every character pixel identical — same art,
same colours, same positions. Only remove the background and every text label,
frame number, row title, border and grid line, replacing them with full
transparency. Do not redraw, do not restyle, do not move anything.
```

```
Edit the attached sprite sheet. Keep the art identical, but add empty space so
that no two frames touch: move each frame so it is fully centred inside its own
cell of the grid, with clear background between all frames and all rows.
```

---

## Si el modelo no logra la grilla

Pasa, sobre todo con hojas de muchas columnas. Dos salidas:

- **Pedir una fila por vez** ("only the front-facing walk cycle, 4 frames in a
  row") y después pegar las filas una debajo de otra en cualquier editor,
  dejando unos 40 px de aire entre filas. Al script le da igual: mide la hoja que
  le den, no la que esperaba.
- **Usar la plantilla**: `npm run sprites -- --plantillas` deja en
  `arte-fuente/_plantillas/` la cuadrícula rotulada del personaje. Adjuntarla
  junto con la referencia ayuda bastante a que el modelo entienda el pedido.
