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

/* --- corona ----------------------------------------------------------------
   Cinco puntas: la del medio la mas alta, las dos de los extremos rematadas en
   bolita y las dos del medio mas bajas. Abajo el aro con las gemas y, al pie,
   la vuelta de armino blanco — que es lo que la distingue de "un sombrero
   amarillo" cuando mide 13 px.

   Se autorea con la esquina de arriba a la izquierda en (0,0). La fila 7, el
   armino, es la que apoya sobre el pelo: `corona(x, y)` recibe donde va esa
   esquina, y como la cabeza no arranca a la misma altura en las cuatro filas
   de la hoja, cada direccion tiene su ancla. */
const ORO = '#f5c542', ORO_LUZ = '#ffe89a', ORO_OSC = '#b07d17';
const RUBI = '#d6273f', RUBI_LUZ = '#ff6b7a';
const AMATISTA = '#8e44d0', AMATISTA_LUZ = '#c08ae8';
const ARMINIO = '#fdf6ec';

const CORONA_ORO = [
  [2, 0, 1], [2, 3, 1], [2, 5, 1], [2, 7, 1], [2, 10, 1],
  [3, 0, 11],
];

/* Las puntas y el canto de arriba del aro son lo que primero le pega la luz. */
const CORONA_LUZ = [
  [0, 5, 1],
  [1, 0, 1], [1, 5, 1], [1, 10, 1],
  [4, 0, 11],
];

const CORONA_ARO = [[5, 0, 11]];
const CORONA_SOMBRA = [[6, 0, 11]];
const CORONA_PIE = [[7, 0, 11]];

/* Un rubi al medio y dos amatistas a los costados, cada una con su reflejo de
   1 px. Sin el reflejo, a este tamano una gema es un cuadradito de color. */
const CORONA_RUBI = [[5, 4, 3]];
const CORONA_RUBI_LUZ = [[5, 4, 1]];
const CORONA_AMATISTA = [[5, 1, 2], [5, 8, 2]];
const CORONA_AMATISTA_LUZ = [[5, 1, 1], [5, 8, 1]];

function corona(x, y) {
  return [
    ...filas(CORONA_ORO, x, ORO, y),
    ...filas(CORONA_ARO, x, ORO, y),
    ...filas(CORONA_LUZ, x, ORO_LUZ, y),
    ...filas(CORONA_SOMBRA, x, ORO_OSC, y),
    ...filas(CORONA_AMATISTA, x, AMATISTA, y),
    ...filas(CORONA_AMATISTA_LUZ, x, AMATISTA_LUZ, y),
    ...filas(CORONA_RUBI, x, RUBI, y),
    ...filas(CORONA_RUBI_LUZ, x, RUBI_LUZ, y),
    ...filas(CORONA_PIE, x, ARMINIO, y),
  ];
}

/* --- capa ------------------------------------------------------------------
   Azul y no roja como la capa clasica de heroe: el vestido de Kath ya es rojo
   (#c51d34), asi que una capa roja se le camufla contra el cuerpo y desaparece.
   El azul es justo el contraste que usa el arte de superheroe de toda la vida,
   solo que al reves — traje azul, capa roja.

   Es el UNICO accesorio que se dibuja distinto en cada cuadro de animacion, y
   tiene que serlo: es tela, y una tela quieta mientras ella camina se lee como
   una tabla pintada en la espalda. Pero no son 16 dibujos a mano (4 direcciones
   x 4 cuadros): se autorea UNO por direccion, en filas de 1 px, y el modulo
   saca los cuatro cuadros ondeandolo. */
const CAPA = '#3b4fbf', CAPA_LUZ = '#7a8dee', CAPA_SOMBRA = '#222d7a';
const CAPA_K = '#fdf0d5';

/* La onda: cada fila se corre en horizontal segun su altura y el cuadro.
   La fila del cuello NO se mueve nunca —ahi esta atada— y la libertad crece
   hacia el ruedo, que es donde la tela chicotea. Sin esa rampa, la capa entera
   se desliza de costado y parece que se le cae de los hombros.

   `cuello` y `ruedo` son de cada dibujo y no constantes globales: **la cabeza
   de Kath no termina a la misma altura en las cuatro filas de la hoja**. De
   frente el pelo llega hasta y=15 y los hombros arrancan en y=16; de perfil el
   pelo baja hasta y=16; de espaldas hasta y=17. Con un solo valor para las
   cuatro, la capa arranca dentro del afro en por lo menos dos direcciones y se
   ve salir de la cabeza en vez del cuello. */
const CAPA_VUELO = 2;

function ondaCapa(y, cuadro, cuello, ruedo) {
  const libre = Math.max(0, Math.min(1, (y - cuello) / (ruedo - cuello)));
  return Math.round(libre * CAPA_VUELO * Math.sin(y * 0.5 + cuadro * Math.PI / 2));
}

/* Filas [y, x, ancho] -> rectangulos de 1 px, ya ondeados. */
function ondear(filas, capa, cuadro, color) {
  return filas.map(([y, x, w]) => [x + ondaCapa(y, cuadro, capa.cuello, capa.ruedo), y, w, 1, color]);
}

/* La K NO se ondea fila por fila: se corre entera con el desplazamiento de una
   sola fila de referencia. Ondeada como la tela se descuajeringa —el palo se
   parte en dos y la letra deja de leerse— pero quieta sobre una capa que se
   mueve parece una calcomania pegada encima. Rigida y acompanando, se lee como
   una insignia cosida. */
function ondearJunto(filas, capa, cuadro, color, yRef) {
  const off = ondaCapa(yRef, cuadro, capa.cuello, capa.ruedo);
  return filas.map(([y, x, w]) => [x + off, y, w, 1, color]);
}

/* Trapecio que se abre hacia abajo y termina en dos puntas, con un tajo en el
   medio: es lo que la hace leerse como capa al viento y no como un delantal.
   Arranca en los hombros —no en la nuca ni mas arriba— y muere a la altura de
   los pies. De perfil la capa barre hacia atras en diagonal, que es como se ve
   una capa cuando la que la lleva camina. */
const CAPA_FRENTE = {
  cuello: 16, ruedo: 27,
  /* De frente la capa esta casi toda TAPADA por ella: lo unico que se ve es la
     franja que sobresale a los costados. Por eso el ancho hay que medirlo
     contra el cuerpo y no en absoluto — a 18 px de ancho asomaba 5 px por lado
     y se leia como una pollera. A 14 asoma 2 o 3 y se lee como capa. */
  luz: [[16, 8, 8], [17, 6, 12]],
  /* El bulto de y=20-21 (18 px contra los 16 del resto) no es un descuido: son
     las dos filas de los brazos, las mas anchas del sprite. Sin esas dos filas
     la capa arranca a verse recien a la altura de la pollera y parece que le
     sale de la cintura. Con ellas asoma un pelito al costado de cada brazo,
     que es donde se espera ver una capa colgada de los hombros. */
  cuerpo: [
    [18, 5, 14], [19, 4, 16], [20, 3, 18], [21, 3, 18],
    [22, 4, 16], [23, 4, 16],
  ],
  sombra: [
    [24, 4, 16], [25, 4, 16], [26, 4, 16],
    [27, 5, 4], [27, 15, 4],
  ],
};

/* Mirando a la izquierda: la capa queda a su derecha y barre hacia atras. */
const CAPA_PERFIL = {
  cuello: 17, ruedo: 27,
  luz: [[17, 11, 6], [18, 11, 7]],
  /* Angosta a proposito: se probo ensanchandola 2 px para que "billara" mas y
     queda peor — de costado la capa se ve de canto, no de frente, asi que
     cuanto mas ancha menos se lee como tela y mas como un panel pegado. */
  cuerpo: [
    [19, 12, 7], [20, 12, 7], [21, 12, 8],
    [22, 13, 8], [23, 13, 8], [24, 14, 7],
  ],
  sombra: [[25, 15, 6], [26, 16, 5], [27, 17, 4]],
};

/* De espaldas se ve entera, asi que va por delante del sprite y lleva la K.
   Arranca dos filas mas abajo que de frente: de espaldas el pelo tapa hasta
   y=17. */
const CAPA_ESPALDA = {
  cuello: 18, ruedo: 29,
  luz: [[18, 7, 10], [19, 6, 12]],
  cuerpo: [
    [20, 6, 12], [21, 5, 14], [22, 5, 14],
    [23, 4, 16], [24, 4, 16], [25, 4, 16], [26, 3, 18],
  ],
  sombra: [
    [27, 3, 18],
    [28, 3, 6], [28, 15, 6],
    [29, 4, 4], [29, 16, 4],
  ],
  k: [
    [20, 10, 2], [20, 14, 1],
    [21, 10, 2], [21, 13, 1],
    [22, 10, 2], [22, 12, 1],
    [23, 10, 2],
    [24, 10, 2], [24, 12, 1],
    [25, 10, 2], [25, 13, 1],
    [26, 10, 2], [26, 14, 1],
  ],
  kFila: 23,   // la fila del medio de la K, la que le marca el paso
};

function capaCuadro(capa, cuadro) {
  return conBorde([
    ...ondear(capa.cuerpo, capa, cuadro, CAPA),
    ...ondear(capa.luz, capa, cuadro, CAPA_LUZ),
    ...ondear(capa.sombra, capa, cuadro, CAPA_SOMBRA),
    ...ondearJunto(capa.k || [], capa, cuadro, CAPA_K, capa.kFila || 0),
  ]);
}

function capaAnimada(dibujo, lado, espejada) {
  return [0, 1, 2, 3].map((cuadro) => {
    const rects = capaCuadro(dibujo, cuadro);
    return { [lado]: espejada ? espejar(rects) : rects };
  });
}

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

  /* La corona va ADELANTE, como el mono: se apoya sobre el pelo. Cada ancla es
     distinta porque el pelo no termina a la misma altura en las cuatro filas
     de la hoja (y=3 de frente, y=4 de perfil izquierdo, y=5 en las otras dos):
     con una sola, la corona flota o se hunde segun para donde mire. */
  corona: [
    { adelante: conBorde(corona(6, -2)) },   // abajo
    { adelante: conBorde(corona(6, -1)) },   // izquierda
    { adelante: conBorde(corona(7, 0)) },    // derecha
    { adelante: conBorde(corona(6, 0)) },    // arriba
  ],

  /* Cuatro cuadros por direccion, no uno: ver la nota de la capa mas arriba. */
  capa: [
    capaAnimada(CAPA_FRENTE, 'atras'),            // abajo
    capaAnimada(CAPA_PERFIL, 'atras'),            // izquierda
    capaAnimada(CAPA_PERFIL, 'atras', true),      // derecha
    capaAnimada(CAPA_ESPALDA, 'adelante'),        // arriba
  ],
};

/* --- bamboleo ---------------------------------------------------------------
 *  Los accesorios NO tienen un dibujo por cuadro de animacion: SPR_DISFRAZ se
 *  indexa por direccion y nada mas. Sin esto, lo unico que se movia al bailar
 *  era la direccion cambiando en las coreografias que giran — y hay una que
 *  baila siempre de frente, donde el accesorio quedaba clavado.
 *
 *  En vez de dibujar cuatro versiones de cada accesorio, el motor corre el
 *  lienzo entero unos pocos pixeles segun el cuadro. Sale gratis (no hay
 *  lienzos nuevos) y alcanza, porque todos los accesorios tienen el arranque
 *  enterrado en el pelo con varios pixeles de margen: correrlo 1 px no
 *  despega la base ni deja ver el hueco.
 *
 *  Es 1 px del sprite, que en pantalla son 3 (ESC_JUG). Mas que eso y deja de
 *  parecer que se bambolea para parecer que se le cae.
 *
 *  El cuadro 0 va SIEMPRE en [0, 0]: quieta, el accesorio se ve exactamente
 *  como se dibujo, sin un corrimiento fijo que despues nadie entiende.
 * ------------------------------------------------------------------------- */
const SIN_BAMBOLEO = [0, 0];

const BAMBOLEO = {
  /* Las trompetas son pesadas y cuelgan: rebotan para arriba y para abajo. */
  orejas:    [[0, 0], [0, -1], [0, 0], [0, 1]],
  /* Las antenitas van en fase contraria a las orejas, para que las dos cosas
     no parezcan una sola pieza si algun dia se pueden usar juntas. */
  antenitas: [[0, 0], [0, 1], [0, 0], [0, -1]],
  /* El mono esta atado corto: se mueve la mitad de veces que lo demas. */
  mono:      [[0, 0], [0, -1], [0, 0], [0, 0]],
  /* La corona esta apoyada, no atada: se tambalea de lado al caminar. */
  corona:    [[0, 0], [-1, 0], [0, 0], [1, 0]],
  /* La capa NO esta aca a proposito: es el unico accesorio con dibujo propio
     por cuadro (ver CAPA_FRENTE y companeras), asi que ya ondea de verdad.
     Sumarle el bamboleo encima le correria el lienzo entero ademas de la
     onda, y se veria como si se le resbalara de los hombros. */
};

/* Cuanto se corre el accesorio `id` en el cuadro `cuadro`, en pixeles del
   sprite. Sin disfraz puesto, o sin bamboleo definido, no se mueve. */
function bamboleoDisfraz(id, cuadro) {
  const b = BAMBOLEO[id];
  return b ? b[cuadro % b.length] : SIN_BAMBOLEO;
}

/* --- destellos --------------------------------------------------------------
 *  La corona tiene que brillar SIEMPRE, tambien parada. Por eso los brillitos
 *  no son parte del dibujo ni un cuadro mas de animacion: los cuadros solo
 *  avanzan mientras camina o baila, asi que quieta el juego se queda en el
 *  cuadro 0 y el brillo se congelaria justo cuando mas se mira.
 *
 *  Son estrellitas que pinta el motor aparte, con su propio reloj. Cada una es
 *  [x, y, fase] en coordenadas del cuadro de Kath (se permite negativo: la
 *  corona sobresale por arriba). La fase las desincroniza a proposito — las
 *  tres titilando juntas se leen como un parpadeo de pantalla, no como brillo.
 * ------------------------------------------------------------------------- */
const DESTELLOS = {
  corona: [
    [[4, 2, 0], [17, 3, 0.38], [11, -4, 0.7]],    // abajo
    [[4, 3, 0], [17, 4, 0.38], [11, -3, 0.7]],    // izquierda
    [[5, 4, 0], [18, 5, 0.38], [12, -2, 0.7]],    // derecha
    [[4, 4, 0], [17, 5, 0.38], [11, -2, 0.7]],    // arriba
  ],
};

function destellosDisfraz(id, dir) {
  const d = DESTELLOS[id];
  return d ? d[dir] : null;
}

/* --- caché ----------------------------------------------------------------- */
/* SPR_DISFRAZ[id][dir] = [{ atras, adelante } x4], un lienzo ya pintado por
   cuadro de animacion (o null si esa capa no tiene nada). Se arma una vez,
   igual que SPR en objetos.js.

   Casi todos los accesorios traen UN dibujo por direccion y se repite en los
   cuatro cuadros: se normaliza aca y no en cada uno para que el motor tenga
   siempre la misma forma y no pregunte. El unico que trae los cuatro de verdad
   es la capa. */
const SPR_DISFRAZ = {};

function pintarCapas(rects) {
  if (!rects || !rects.length) return null;
  return pintar(ANCHO + ANCHO_EXTRA * 2, ALTO + ALTO_EXTRA,
    rects.map((r) => [r[0] + ANCHO_EXTRA, r[1] + ALTO_EXTRA, r[2], r[3], r[4]]));
}

function construirDisfraces() {
  for (const id in DISFRAZ_ART) {
    SPR_DISFRAZ[id] = DISFRAZ_ART[id].map((dir) => {
      const cuadros = Array.isArray(dir) ? dir : [dir, dir, dir, dir];
      return cuadros.map((capas) => ({
        atras: pintarCapas(capas.atras),
        adelante: pintarCapas(capas.adelante),
      }));
    });
  }
}

export {
  DISFRAZ_ART, SPR_DISFRAZ, construirDisfraces,
  bamboleoDisfraz, destellosDisfraz,
  ALTO_EXTRA, ANCHO_EXTRA,
};
