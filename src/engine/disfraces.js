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
   costados: ALTO_EXTRA arriba para lo que se va por encima de la cabeza (las
   antenas, y las orejas de Shrek, que suben en diagonal hasta 3 px por arriba
   del cuadro) y ANCHO_EXTRA a cada lado para lo que se va por los costados.
   Sin esto no habría lugar: el afro ya ocupa de x=3 a x=20 de los 24 de ancho
   que tiene el cuadro, y arriba de la cabeza quedan 2 px. */
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

/* La oreja se autorea por FILAS de 1 px en vez de por bloques: con bloques de
   4 px la curva de la trompeta quedaba escalonada y se leia como tres cajas
   apiladas. Cada fila es [y, dx, ancho], con dx contado desde la base pegada a
   la cabeza.

   Mide la mitad que la primera version (8 x 6 contra 13 x 8): a tamano completo
   la trompeta era mas ancha que media cabeza y se comia el sprite. Achicarla
   obligo a correr la base hacia AFUERA —de x=15 a x=17 de frente— porque con el
   cuello corto y la base donde estaba, el afro (que llega hasta x=20) se la
   tapaba entera y no asomaba nada.

   Salen en DIAGONAL de las esquinas de arriba del pelo, no horizontales de los
   costados. Apoyadas al nivel de la oreja quedaban como dos manchas verdes
   pegadas a la cara; arriba se leen como las trompetas del ogro.

   La forma es una CAMPANA REDONDA con el agujero adentro, y un tubo fino que
   baja hasta el pelo — no una cuna que se va ensanchando. Esa es la diferencia
   entre "algo verde en diagonal" y una oreja de Shrek: en el original casi todo
   el volumen esta en la boca, y el tubo es angosto.

   La oreja derecha, de arriba hacia abajo (la fila 6 es la base, tapada por el
   afro). El `.` de adentro de la campana es el agujero:

        dx  01234567
      y=0      ###
      y=1     ##..#        <- campana: anillo cerrado con el agujero adentro
      y=2     ##..#
      y=3     ####
      y=4    ####          <- de aca para abajo, el tubo
      y=5   ###
      y=6  ##

   El tubo tiene 3 filas y no 4: con 4 la oreja sobresalia 1 px de mas y la
   campana quedaba despegada de la cabeza. Al sacar una fila hay que correr el
   ancla de -2 a -1, si no la base se sale del pelo en vez de bajar la punta.  */
const OREJA_CUERPO = [
  [0, 4, 3],
  [1, 3, 5],
  [2, 3, 5],
  [3, 3, 4],
  [4, 2, 4],
  [5, 1, 3],
  [6, 0, 2],
];

/* Brillo por el canto de arriba a la izquierda, que es el que da la luz. */
const OREJA_LUZ = [
  [0, 4, 3],
  [1, 3, 2],
  [3, 3, 1],
  [5, 1, 1],
  [6, 0, 1],
];

/* El agujero de la campana (dx5-6, cerrado por arriba, abajo y los dos lados)
   y el canto de abajo a la derecha del tubo. Sin el agujero la boca no se lee
   y la oreja queda un palo verde. */
const OREJA_SOMBRA = [
  [1, 5, 2],
  [2, 5, 2],
  [4, 4, 2],
  [5, 3, 1],
  [6, 1, 1],
];





/* Convierte filas de 1 px —[y, dx, ancho], con dx contado desde `x`— en los
   rectangulos que espera pintar(). `y0` corre el dibujo entero hacia abajo,
   para el arte que se autorea en coordenadas propias y despues se apoya en
   algun lugar de la cabeza. */
function filas(rows, x, color, y0 = 0) {
  return rows.map(([y, dx, w]) => [x + dx, y + y0, w, 1, color]);
}

/* La oreja derecha, con la base pegada a la cabeza en `x` y creciendo hacia
   afuera. `y` la corre hacia abajo: de perfil la cabeza es mas angosta arriba,
   asi que la oreja apoyada a la misma altura que de frente deja un hueco entre
   la boca de la trompeta y el pelo. */
function orejaShrek(x, y = 0) {
  return [
    ...filas(OREJA_CUERPO, x, VERDE, y),
    ...filas(OREJA_LUZ, x, VERDE_LUZ, y),
    ...filas(OREJA_SOMBRA, x, VERDE_OSC, y),
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

/* --- mono de Hello Kitty ---------------------------------------------------
   Va ladeado y no centrado, como lo lleva ella: el lazo de arriba mira a un
   costado y el de abajo al otro, con el nudo cruzado en el medio. A diferencia
   de las orejas y las antenas, este se dibuja ADELANTE del sprite — un mono
   se apoya SOBRE el pelo, y detras el afro se lo comeria entero.

   Se autorea con el vertice de arriba a la izquierda en (0,0) y despues se
   apoya donde va en cada direccion, que no es el mismo lugar en las cuatro.

        dx  012345678
      dy0    ###           <- lazo de arriba
      dy1   #####
      dy2   ######         <- el nudo arranca en dx4
      dy3    ########
      dy4      #####       <- lazo de abajo
      dy5       ###                                                          */
const ROJO = '#e8455c', ROJO_LUZ = '#ff8fa0', ROJO_OSC = '#9c1f38';

const MONO_CUERPO = [
  [0, 1, 3],
  [1, 0, 5],
  [2, 0, 6],
  [3, 1, 8],
  [4, 4, 5],
  [5, 5, 3],
];

/* Brillo en el lomo de cada lazo, que es lo que los despega uno del otro
   cuando el mono queda chico contra el pelo oscuro. */
const MONO_LUZ = [
  [0, 1, 3],
  [1, 0, 2],
  [3, 6, 3],
];

/* El nudo del medio en oscuro (dx4-5, cruzando las tres filas del centro) mas
   el hueco de cada lazo. Sin esto el mono es una mancha roja con forma rara;
   con esto se lee cinta atada. */
const MONO_SOMBRA = [
  [2, 4, 2],
  [3, 4, 2],
  [4, 4, 2],
  [1, 2, 2],
  [4, 6, 2],
];

/* El mono con su vertice de arriba a la izquierda en (x, y). */
function mono(x, y) {
  return [
    ...filas(MONO_CUERPO, x, ROJO, y),
    ...filas(MONO_LUZ, x, ROJO_LUZ, y),
    ...filas(MONO_SOMBRA, x, ROJO_OSC, y),
  ];
}

/* --- capa ------------------------------------------------------------------ */
const CAPA = '#4f63c8', CAPA_LUZ = '#7186e6', CAPA_SOMBRA = '#3a4aa0';

const DISFRAZ_ART = {
  /* De frente y de espaldas salen las dos orejas. De perfil sólo se dibuja
     una, la de atrás de la cabeza: la otra quedaría apuntando a la cámara y
     de costado no se leería como oreja. */
  orejas: [
    { atras: conBorde([...orejaShrek(16, -1), ...espejar(orejaShrek(16, -1))]) },  // abajo
    { atras: conBorde(orejaShrek(14, -1)) },                                       // izquierda
    { atras: conBorde(espejar(orejaShrek(14, -1))) },                              // derecha
    { atras: conBorde([...orejaShrek(16, -1), ...espejar(orejaShrek(16, -1))]) },  // arriba
  ],

  antenitas: [
    { atras: conBorde([...antena(7, -6), ...antena(14, -6)]) },            // abajo
    { atras: conBorde([...antena(8, -5), ...antena(12, -6)]) },            // izquierda
    { atras: conBorde([...antena(9, -6), ...antena(13, -5)]) },            // derecha
    { atras: conBorde([...antena(7, -6), ...antena(14, -6)]) },            // arriba
  ],

  /* Siempre del mismo lado de la cabeza: el izquierdo de Kath. De frente eso
     cae a la derecha del cuadro y de espaldas a la izquierda, por eso el de
     arriba es el espejo del de abajo. De perfil el mono queda del lado de la
     nuca, que es donde se ve un accesorio de costado sin taparle la cara. */
  mono: [
    { adelante: conBorde(mono(12, 1)) },                 // abajo
    { adelante: conBorde(mono(11, 3)) },                 // izquierda
    { adelante: conBorde(espejar(mono(11, 4))) },        // derecha
    { adelante: conBorde(espejar(mono(12, 4))) },        // arriba
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
