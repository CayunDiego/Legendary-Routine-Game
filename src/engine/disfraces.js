import { pintar } from './drawing.js';

/* ============================================================================
 *  ARTE DE LOS DISFRACES
 *
 *  Cada accesorio se dibuja encima del cuadro de Kath, en las MISMAS
 *  coordenadas de su hoja (24 x 32) y con la misma escala, así que acá se
 *  autorea mirando el sprite: la cabeza arranca en y=2 de frente, y=3 de
 *  perfil izquierdo, y=4 de perfil derecho y de espaldas.
 *
 *  Se permite `y` negativo para lo que sobresale por arriba del cuadro (las
 *  orejas y las antenas no entran en 2 px). El lienzo real es más alto y
 *  `pintarCapas()` corre todo hacia abajo; dibujarJugadora() compensa con el
 *  mismo ALTO_EXTRA, de modo que quien escribe el arte no tiene que pensarlo.
 *
 *  Dos capas por dirección:
 *    atras    se dibuja ANTES que Kath (lo que queda dentro de su silueta no
 *             se ve). Es lo que hace que la capa asome sólo por los costados.
 *    adelante se dibuja DESPUÉS. Orejas, antenas, y la capa vista de espaldas.
 *
 *  El orden de las direcciones es el de DIRS: 0 abajo, 1 izq, 2 der, 3 arriba.
 * ==========================================================================*/

/* El lienzo del accesorio es más grande que el cuadro de Kath por los cuatro
   costados: ALTO_EXTRA arriba para las antenas, y ANCHO_EXTRA a cada lado para
   las orejas de Shrek, que salen para afuera. Sin esto no habría lugar — el
   afro ya ocupa de x=3 a x=20 de los 24 de ancho que tiene el cuadro. */
const ALTO_EXTRA = 8;
const ANCHO_EXTRA = 6;
const ANCHO = 24, ALTO = 32;

/* Todo lo que va en la cabeza baja hasta acá. El pelo de Kath es un afro
   redondeado que arranca en y=2 en la coronilla pero recién en y=5 o 6 en los
   costados, así que una oreja apoyada "sobre" la cabeza queda flotando con un
   hueco visible. Bajándola hasta bien adentro del pelo, y dibujándola DETRÁS
   del sprite, el pelo le tapa la base y se lee como que sale de atrás — que es
   como se dibujan las orejas y las vinchas de verdad. */
const RAIZ = 11;

/* --- orejas de Shrek -------------------------------------------------------
   No son orejas paradas sino las trompetas del ogro: salen de los costados de
   la cabeza, se van ensanchando hacia afuera y terminan con la boca apuntando
   un poco hacia arriba. Por eso no usan RAIZ — no cuelgan del pelo, lo
   atraviesan de lado a lado. Igual van detrás del sprite: el arranque queda
   tapado por el afro y sólo se ve lo que sobresale, que es como corresponde.  */
const VERDE = '#8bc34a', VERDE_LUZ = '#aada6b', VERDE_OSC = '#5f8f2f';

/* La oreja derecha, con la base pegada a la cabeza en `x` y creciendo hacia
   afuera. `alto` es la altura de la boca de la trompeta. */
function orejaShrek(x) {
  return [
    [x, 7, 4, 3, VERDE],                 // arranque, tapado por el pelo
    [x + 4, 6, 4, 4, VERDE],             // cuello
    [x + 8, 4, 4, 6, VERDE],             // boca de la trompeta, abierta y más alta
    [x + 8, 4, 4, 1, VERDE_LUZ],
    [x + 4, 6, 4, 1, VERDE_LUZ],
    [x + 8, 9, 4, 1, VERDE_OSC],
    [x + 4, 9, 4, 1, VERDE_OSC],
  ];
}

/* La misma oreja del otro lado del cuadro. */
function espejar(rects) {
  return rects.map(([x, y, w, h, c]) => [ANCHO - x - w, y, w, h, c]);
}

/* Contorno oscuro, como el que traen dibujado todas las hojas del juego. Sin
   esto un accesorio verde sobre el césped —o sobre la alfombra del cuarto,
   que también es verde— se camufla y desaparece.
   Se pintan primero TODAS las siluetas agrandadas y recién después los
   colores: así el relleno tapa los bordes internos y sólo queda la línea de
   afuera, sin tener que dibujar el contorno a mano rectángulo por rectángulo. */
const BORDE = '#1a1a24';

function conBorde(rects) {
  return [
    ...rects.map(([x, y, w, h]) => [x - 1, y - 1, w + 2, h + 2, BORDE]),
    ...rects,
  ];
}

/* --- antenas --------------------------------------------------------------- */
const TALLO = '#3a3a3a', BOLITA = '#f7c948', BRILLO = '#fff0b8';

function antena(x, top) {
  return [
    [x + 1, top + 3, 1, RAIZ - top - 3, TALLO],
    [x, top, 3, 3, BOLITA],
    [x, top, 2, 1, BRILLO],
  ];
}

/* --- capa ------------------------------------------------------------------ */
const CAPA = '#4f63c8', CAPA_LUZ = '#7186e6', CAPA_SOMBRA = '#3a4aa0';

const DISFRAZ_ART = {
  /* De frente y de espaldas salen las dos orejas. De perfil sólo se dibuja
     una, la de atrás de la cabeza: la otra quedaría apuntando a la cámara y
     de costado no se leería como oreja. */
  orejas: [
    { atras: conBorde([...orejaShrek(15), ...espejar(orejaShrek(15))]) },  // abajo
    { atras: conBorde(orejaShrek(14)) },                                   // izquierda
    { atras: conBorde(espejar(orejaShrek(14))) },                          // derecha
    { atras: conBorde([...orejaShrek(15), ...espejar(orejaShrek(15))]) },  // arriba
  ],

  antenitas: [
    { atras: conBorde([...antena(7, -6), ...antena(14, -6)]) },            // abajo
    { atras: conBorde([...antena(8, -5), ...antena(12, -6)]) },            // izquierda
    { atras: conBorde([...antena(9, -6), ...antena(13, -5)]) },            // derecha
    { atras: conBorde([...antena(7, -6), ...antena(14, -6)]) },            // arriba
  ],

  capa: [
    { // abajo: cuelga detrás, sólo asoma por los costados y abajo. Va abriéndose
      //         hacia abajo para que la franja visible se lea como tela y no
      //         como dos bloques rectos a los lados.
      atras: conBorde([
        [6, 9, 12, 4, CAPA], [6, 9, 12, 1, CAPA_LUZ],
        [5, 13, 14, 6, CAPA],
        [4, 19, 16, 5, CAPA],
        [4, 24, 16, 2, CAPA_SOMBRA],
      ]),
    },
    { // izquierda: mira a la izquierda, la capa queda a su derecha
      atras: conBorde([
        [11, 9, 8, 15, CAPA],
        [11, 9, 8, 1, CAPA_LUZ],
        [12, 23, 7, 2, CAPA_SOMBRA],
      ]),
    },
    { // derecha: espejo de la anterior
      atras: conBorde([
        [5, 9, 8, 15, CAPA],
        [5, 9, 8, 1, CAPA_LUZ],
        [5, 23, 7, 2, CAPA_SOMBRA],
      ]),
    },
    { // arriba: de espaldas se ve entera, así que va por delante
      adelante: conBorde([
        [8, 9, 8, 3, CAPA_LUZ],
        [7, 11, 10, 6, CAPA],
        [6, 17, 12, 7, CAPA],
        [6, 24, 12, 2, CAPA_SOMBRA],
        [11, 11, 1, 13, CAPA_SOMBRA],
      ]),
    },
  ],
};

/* --- caché ----------------------------------------------------------------- */
/* SPR_DISFRAZ[id][dir] = { atras, adelante } con lienzos ya pintados (o null
   si esa capa no tiene nada). Se arma una vez, igual que SPR en objetos.js. */
const SPR_DISFRAZ = {};

function pintarCapas(rects) {
  if (!rects || !rects.length) return null;
  return pintar(ANCHO + ANCHO_EXTRA * 2, ALTO + ALTO_EXTRA,
    rects.map((r) => [r[0] + ANCHO_EXTRA, r[1] + ALTO_EXTRA, r[2], r[3], r[4]]));
}

function construirDisfraces() {
  for (const id in DISFRAZ_ART) {
    SPR_DISFRAZ[id] = DISFRAZ_ART[id].map((capas) => ({
      atras: pintarCapas(capas.atras),
      adelante: pintarCapas(capas.adelante),
    }));
  }
}

export { DISFRAZ_ART, SPR_DISFRAZ, construirDisfraces, ALTO_EXTRA, ANCHO_EXTRA };
