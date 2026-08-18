# Cambiar un sprite sin tocar código

Todo lo que dibuja el juego sale de unas pocas **hojas de sprites**: una imagen
con todos los cuadritos de un personaje. Cuando llega una hoja nueva del
generador, no hay que medir nada a mano ni abrir el código: se deja el archivo
en su lugar y se corre un comando.

```
npm run sprites
```

Eso mide la hoja, recorta los cuadros, arma la versión liviana que viaja al
teléfono de Kath y escribe las coordenadas que el juego lee. Después:

```
npm run dev      # mirarlo andando
npm run test     # que no se haya roto nada
```

La primera vez hace falta tener Python con dos paquetes:
`pip install pillow numpy`.

**¿La hoja todavía no existe?** En
[prompt-generador.md](prompt-generador.md) están los prompts listos para pegar
en Gemini (Nano Banana) o ChatGPT, uno por personaje, con las medidas y las
reglas que hacen que lo que vuelva pase limpio por acá.

---

## Los tres pasos

### 1. Dejar la hoja nueva en `arte-fuente/`

Con el nombre que ya tiene el personaje. Los nombres están en
`scripts/sprites.json`, y hoy son:

| Personaje | Archivo | Cómo tiene que estar la hoja |
|---|---|---|
| Kath | `arte-fuente/kath.png` | 4 cuadros de caminata x 4 direcciones |
| Baile de Kath | `arte-fuente/kath_baile.png` | igual que la de caminar |
| Compañero (las 3 etapas) | `arte-fuente/companero.png` | 3 bloques (uno por etapa), cada uno con 4 filas x 4 cuadros |
| Huevo | `arte-fuente/huevo_mascota.png` | filas de 10 cuadros |
| Merlí | `arte-fuente/merli.png` | 10 cuadros x 4 direcciones |
| Diego | `arte-fuente/diego.png` | 4 x 4, igual que Kath |

No importa que la hoja venga enorme, con fondo gris o a cuadros, con filas de
más o con los rótulos del generador ("ETAPA 1", "DERECHA", los números) quemados
en la imagen: el script saca el fondo, tira los rótulos, se queda con las filas
que el juego usa y achica todo a la medida que corresponde.

**El original no se toca nunca.** Queda en `arte-fuente/` como está; lo que el
juego usa es la copia recortada que el script deja en `src/assets/`.

### 2. Correr `npm run sprites`

Sale algo así:

```
== companero
   companero_hoja.png: 467x1567 px, 429 kB  (la cruda pesa 1015 kB)
   revision -> arte-fuente/_revision/companero.png
```

Para rehacer uno solo, con el nombre alcanza: `npm run sprites -- companero`.

### 3. Mirar la imagen de revisión

En `arte-fuente/_revision/` queda la hoja original con **cada cuadro marcado en
rojo y numerado**, y el nombre de cada fila en verde. Es la única verificación
que hay que hacer, y se hace de un vistazo:

- ¿Cada recuadro rojo encierra un dibujo entero, sin comerse al de al lado?
- ¿El nombre verde de cada fila dice para dónde mira el bicho de esa fila?

Si las dos cosas están bien, listo. Si no, mirá "Cuando algo sale mal", abajo.

---

## Qué pasa por dentro

1. **Saca el fondo.** Mira el marco de la imagen: el color que esté ahí es
   fondo. Cubre el gris plano y el damero. Si la hoja ya viene con
   transparencia, no toca nada.
2. **Encuentra los cuadros.** Corta la hoja en franjas horizontales, y dentro de
   cada franja busca los grupos de píxeles pegados entre sí. Los rótulos se
   descartan porque son rectángulos macizos y sin color, y las esquirlas (el
   cascarón que salta cuando el huevo estalla) se le suman al cuadro del que
   salieron.
3. **Empaqueta.** Pega los cuadros uno al lado del otro sin huecos, en una hoja
   nueva con la paleta reducida. La del compañero pasa de 1 MB a 429 kB, y eso
   es peso que Kath no baja cada vez que instala o actualiza el juego.
4. **Escribe las coordenadas** en `src/config/recortes.json`, que es de donde el
   juego las lee (`src/config/recortes.js` les pone nombre). Por eso cambiar un
   sprite no toca código.

---

## Cuando algo sale mal

Todo lo que se puede ajustar está en **`scripts/sprites.json`**, que es un
archivo de texto corto. Ninguna de estas cosas obliga a tocar el juego.

### "se encontraron 5 filas y el manifiesto describe 4"

El script cuenta las filas de dibujos y las compara con lo que dice el
manifiesto. Mirá la imagen de revisión, contá las filas y ajustá `orden`: es la
lista de cómo se llama cada fila, **de arriba hacia abajo, tal como se ven en la
hoja**.

Para el compañero cada fila tiene tres nombres (uno por etapa, de izquierda a
derecha), porque el generador no siempre pone las tres etapas en el mismo orden:

```json
"orden": [
  ["derecha", "derecha", "izquierda"],
  ["izquierda", "izquierda", "derecha"],
  ["arriba", "arriba", "arriba"],
  ["abajo", "abajo", "abajo"]
]
```

Ese es el único dato que el script **no puede** adivinar: mirar un dibujo y
saber si el bicho mira a la izquierda es trabajo de ojo humano. Y los rótulos de
la hoja no sirven: en la del compañero están cruzados (la fila que dice "LEFT"
tiene al bicho mirando a la derecha).

Para el huevo, `orden` nombra las tiras que se usan y deja el resto en `null`:

```json
"orden": ["idle", null, null, "hatch"]
```

### Los recuadros no encierran bien los cuadros

Perillas del manifiesto, en el orden en que conviene probarlas:

| Perilla | Qué hace | Cuándo |
|---|---|---|
| `ruido` | qué tan llena tiene que estar una fila para contar como fila (fracción del ancho) | dos filas salen pegadas en una, o una mota suelta arma una fila fantasma |
| `hueco` | cuántos píxeles vacíos se toleran adentro de un dibujo | un dibujo sale partido en dos |
| `tolerancia` | qué tan parecido al fondo hay que ser para borrarse | queda borde de fondo, o se comen partes del dibujo |
| `minima_banda` | cuánto más baja que la fila más alta puede ser una fila para que cuente | los rótulos de título no se van solos |

### Una fila donde los cuadros se pisan

Es el caso del huevo estallando: las esquirlas de un cuadro caen encima del
cuadro de al lado y no queda ningún hueco donde cortar. Para eso está `cortes`:
los números de las columnas donde hay que partir esa fila, que se leen de la
regla que la imagen de revisión dibuja arriba de todo.

```json
"cortes": { "3": [150, 284, 425, 575, 723, 920, 1136, 1270, 1473] }
```

El `"3"` es el número de fila contando desde 0 arriba de todo. Son 9 números
para 10 cuadros (los cortes van entre cuadro y cuadro).

---

## Plantillas

```
npm run sprites -- --plantillas
```

Deja en `arte-fuente/_plantillas/` una cuadrícula por personaje, con cada
casilla rotulada (qué fila es, qué número de cuadro) y del tamaño que el juego
espera. Sirve para pedirle al generador una hoja ya acomodada, o para dibujar
encima.

Es una guía, no un requisito: el script mide igual, así que una hoja que no
respete la plantilla también funciona. Adjuntarla al pedido, junto con la hoja
vieja de referencia, ayuda a que el generador entienda la grilla — ver
[prompt-generador.md](prompt-generador.md).

---

## Lo que el script no hace

- **No cambia el tamaño en pantalla ni la velocidad.** Eso vive en
  `src/engine/motor.js` (`ESC_JUG`, `BICHO_ESC`, `MERLI_CUADRO_MS`...).
- **No agrega personajes nuevos.** Agregar una fila al manifiesto alcanza para
  que los mida, pero que el juego los dibuje sí es tocar código.
- **No sabe si la hoja está linda.** Que la caminata no salte, que los colores
  peguen con el resto: eso es mirarlo en `npm run dev`.
- **Kath tiene un límite:** su celda es de 24 x 32 px y los disfraces
  (`src/engine/disfraces.js`) se dibujan encima contando desde ese tamaño. Una
  hoja nueva de Kath se reescala sola a esa medida; cambiar la medida es tocar
  código.
