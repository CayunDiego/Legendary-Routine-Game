# El mundo y las mecánicas

## Mapa (`config/mapa.js`)

24 x 20 tiles, ASCII. `F` cerca · `G` pasto · `#` pared · `,` alfombra ·
`T` baldosa · `K` piso cocina · `.` madera · `D` puerta · `~` agua · `P` sendero.
Sólidos: `F #  ~`.

Cuartos: dormitorio (3-11, 3-6) · baño (13-18, 3-6) · pasillo (fila 8) ·
cocina (3-8, 10-12) · living (10-18, 10-12) · jardín (filas 14-18).
Puertas en las filas 7, 9 y 13.

### Poner un objeto — lo que muerde

- **No tapar una puerta.** Un mueble sobre la casilla de arriba o de abajo de
  una `D` deja el cuarto sin salida. Se ve bien y anda mal. Lo cuida el smoke.
- Un mueble de `th: 2` se apoya en la **fila de pared** de arriba (y=9 en el
  living, y=2 en el baño): se ve alto, contra la pared, sin gastar piso.
- La fila 11 del living queda entera libre a propósito: es el único pasillo.
- (14,12) libre: abajo está la puerta al jardín.
- Un objeto `decor` (alfombra) **no** le roba la casilla a un mueble en
  `objPorTile` — se arregló, pero la solapadura sigue permitida a propósito.

### Campos de un objeto

`x, y, art` (clave de `ART_OBJ`) · `accion` · `mision` · `solido` · `decor`
(plano, se dibuja primero) · `pared` (colgado, no ocupa) · `personaje` ·
`dir` (pose inicial) · `flag` (interruptor de `config/flags.js`) ·
`mira` y `tapa` (sólo asientos, abajo).

`accion`: `mision · animo · premios · carta · companero · info · mesa ·
inodoro · espejo · tele · progreso · placard · diego · compu · sillon`.
Se despachan en `game/juego.js#interactuar()`.

## Mecánicas

### Misiones
9 en `config/misiones.js`, con `veces` por día: cama 1 · ducha 1 · dientes 2 ·
agua 6 · comer 3 · ropa 1 · sol 1 · ejercicio 1 · ánimo 1.
**Racha:** 5 misiones completas en el día (`CONFIG.misionesParaRacha`).

### Secundarias
Las que no están en la casa. Kath se las cuenta a Diego (jardín), las escribe en
un modal. Tope 3/día, pagan como una misión pesada (15 XP / 8 oro).

### Premios
6 en `config/premios.js`. Canjear descuenta monedas → el cupón queda
**esperando**; cuando Diego lo cumple de verdad, Kath marca el segundo tilde
(`✓✓`). Tres listas separadas en la pestaña: disponibles / esperando / cumplidos.

### Compañero
Huevo en el jardín (16,16). Nace al **nivel 3**, evoluciona a 7 y 12
(Kathi → Kathira → Kathrix). Camina detrás de Kath siguiendo un rastro de 3
casillas. La cáscara rota queda **2 h reales** y después se va del mundo entero
(no sólo del dibujo: si no, quedaría una casilla invisible que tapa el paso).

### Disfraces
5 (`orejas, antenitas, mono, corona, capa`). Aparecen caminando por el césped:
1 en 45 pasos, sorteando **sólo entre los que faltan**. Se dibujan encima de
Kath en dos capas (atrás: orejas/antenas/capa de costado; adelante: moño/capa de
espaldas) más bamboleo y destellos. Anclados a la celda de 24x32 — una hoja
nueva de Kath tiene que respetar la posición de la cabeza.

### Merlí
La gata. Deambula sola por `config/merli.js#ZONA_MERLI`, sin pathfinding: elige
casilla por peso. Hoja de 10 cuadros x 4 direcciones, celda 57x42, se dibuja 1:1
(sin reescalar) para que quede nítida.

### Diego
`config/flags.js#diego`. Su lugar es el jardín (6,14). Informa cómo viene el día,
toma las secundarias, mira a Kath cuando se acerca (3 casillas), gira solo
cuando está solo, y se prende a bailar si ella baila al lado (misma coreografía,
un cuadro atrás).

**El paseo** (`config/diego.js` + `motor.js#actualizarPaseo`): cada 12-30 s se
manda 3-6 casillas por el jardín y **vuelve solo** a la suya, mirando la casa.
Usa la hoja de caminar que ya tenía, con el mismo alternado de pie que Kath.
Tres cosas que lo separan del paseo de Merlí:
- **Con Kath cerca no arranca** ningún paso (termina el que estaba a medias):
  es el que toma las secundarias, irse cuando ella se acerca sería pelearle.
- **Es un objeto del mapa** —sólido y con `accion`—, así que cada paso mueve
  también las tablas de sólidos e interacción (`motor.js#moverObjetoTile`). Si
  no: pared invisible en el pasto, o el botón A hablándole al aire.
- **No pisa el paso de una puerta** (parado ahí deja a Kath encerrada) ni sale
  del pasto/sendero. La vuelta se busca con BFS y no encarando para el lado de
  casa: la casilla vedada de la puerta deja rincones sin camino derecho.

### Baile
Arranca solo a los 15 s quieta, o a pedido con doble toque de A sin nada
enfrente. 3 coreografías, hoja propia con la misma grilla que la de caminar.

### Sentarse
Silla del escritorio (9,4) y los dos sillones del living.
La casilla del asiento es **la que tiene enfrente** — así el mismo código sirve
para la silla (1 casilla) y para el sillón (2: se sienta en la mitad a la que se
acercó). Se levanta con cualquier flecha, con B, o con A si no hay nada enfrente.

La hoja `kath_sentada.png` trae **una silla dibujada adentro del sprite**, así
que dos muebles no pueden convivir en la casilla. Lo resuelve `tapa` en el mapa:

| Asiento | `mira` | `tapa` | Cómo se dibuja |
|---|---|---|---|
| silla del escritorio | 3 (a la notebook) | no | el mueble no se dibuja; la silla que se ve es la del sprite |
| sillones | 3 (a la tele) | sí | el sillón se dibuja **encima** de ella; su respaldo esconde la silla del sprite. Además se la hunde 3 px |

Por eso el sillón está dibujado de espaldas (respaldo abajo, contra la cámara) y
mide 14 filas de alto.

Sentada en la silla la notebook le queda enfrente → A la abre. Sentada en el
sillón arranca el noticiero de la tele.

### Pomodoro
`config/pomodoro.js`. Tres largos: 15/5, 25/5, 50/10. Reloj **de pared**
(`hasta` = instante futuro), así corre con la pantalla apagada — que es cuando
sirve. Al terminar el foco: paga 8 XP / 4 oro (tope 6/día), la para de la silla
y abre la pausa sola. Al terminar la pausa **no** encadena otro foco.
El aviso se posterga si el modo es `titulo`, `modal` o `dialogo` (un diálogo se
llevaría puesto lo que hubiera abierto).
Se ve sin abrir nada, y de dos tamaños según dónde esté:
- **Parada**: reloj chico en la esquina, abajo del reloj de pared
  (`components/PomodoroReloj.jsx`).
- **Sentada a la compu**: reloj GRANDE dibujado en el canvas justo abajo de
  ella, con barra de lo que queda (`motor.js#dibujarPomodoroGrande`, dígitos de
  `engine/glifos.js`). Ahí el chico se esconde: dos veces el mismo número es
  ruido. Va en el canvas y no en un div porque tiene que seguirla mientras la
  cámara se mueve. El dato le llega al motor por `conectar({ pomodoro })`, ya
  masticado, porque el motor no puede importar `gameLogic`. Lleva a la
  izquierda un **tomate** (foco) o una **taza** (pausa) dibujados en píxeles
  —no los emojis del reloj chico: a 36 px al lado de dígitos hechos a mano, un
  emoji del sistema se ve como una calcomanía.

Cada fase termina con su propio sonido, y son distintos entre sí a propósito:
`finFoco` sube y se repite (puede agarrarla de espaldas), `finPausa` baja y es
suave. Los dos en `engine/sonido.js`.

### Día y noche
`motor.js#luzAmbiente()`. Tabla de tintes por hora, interpolada, leyendo
`new Date().getHours()` — la hora real del teléfono. No hay reloj propio del
juego ni ciclo acelerado. Distingue adentro/afuera de la casa.

### Aura de XP
Halo detrás de Kath que crece con la barra del nivel y estalla al subir. Todo
canvas, sin arte. Detecta la subida comparando `EST.nivel`, no por aviso — así
no estalla al cargar una partida avanzada ni cuando la nube trae un nivel menor.

## Textos

Todos en `config/`: `misiones.js` `cartas.js` `animos.js` `extras.js`
`pomodoro.js` `premios.js` `disfraces.js` `companero.js`. Las listas de frases
**rotan**, no se sortean: con 3 o 4 frases `Math.random()` repite la misma dos
veces seguidas seguido, y eso se lee como que el juego no tiene nada más que
decir.
