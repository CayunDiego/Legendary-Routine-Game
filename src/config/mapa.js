import { FLAGS } from './flags.js';

/* ---------------------------------------------------------------------------
 *  MAPA — 24 x 20 tiles
 *  F fence   G pasto   # pared   , alfombra   T baldosa baño
 *  K piso cocina   . piso madera   D puerta   ~ agua   P sendero
 * -------------------------------------------------------------------------*/
const MAPA = [
  'FFFFFFFFFFFFFFFFFFFFFFFF', // 0
  'FG##################GGGF', // 1   pared de arriba (dos casillas de alto)
  'FG##################GGGF', // 2
  'FG#,,,,,,,,,#TTTTTT#GGGF', // 3   dormitorio | baño
  'FG#,,,,,,,,,#TTTTTT#GGGF', // 4
  'FG#,,,,,,,,,#TTTTTT#GGGF', // 5
  'FG#,,,,,,,,,#TTTTTT#GGGF', // 6
  'FG####D########D####GGGF', // 7   puertas del dormitorio y del baño
  'FG#................#GGGF', // 8   pasillo
  'FG######D##D########GGGF', // 9   puertas de la cocina y del living
  'FG#KKKKKK#.........#GGGF', // 10  cocina | living
  'FG#KKKKKK#.........#GGGF', // 11
  'FG#KKKKKK#.........#GGGF', // 12
  'FG###D########D#####GGGF', // 13  dos puertas al jardín
  'FGGGGPGGGGGGGGPGGGGGGGGF', // 14  jardín
  'FGGGGPGGGGGGGGPGGGGGGGGF', // 15
  'FGGGGPPPPPPPPPPGGGGGGGGF', // 16
  'FGGGGGGGGGGGGGGGG~~~GGGF', // 17
  'FGGGGGGGGGGGGGGGG~~~GGGF', // 18
  'FFFFFFFFFFFFFFFFFFFFFFFF'  // 19
];

/* Tiles que NO se pueden pisar */
const SOLIDOS = new Set(['F', '#', '~']);

/* ---------------------------------------------------------------------------
 *  OBJETOS DEL MUNDO
 *  x,y en tiles. art = clave en ART_OBJ. mision = id de MISIONES.
 *  accion = 'mision' | 'animo' | 'premios' | 'carta' | 'companero' | 'info'
 *           | 'mesa' | 'inodoro' | 'espejo' | 'compu' | 'sillon'
 *  mira   = sólo en los asientos ('compu', 'sillon'): para qué lado queda
 *           mirando Kath una vez sentada, en el orden de motor.js#DIRS.
 *  tapa   = sólo en los asientos: el mueble se dibuja ENCIMA de Kath sentada,
 *           en vez de esconderse debajo de ella. Es lo que distingue al sillón
 *           (el respaldo la cubre) de la silla del escritorio (que desaparece
 *           porque ya viene dibujada adentro del sprite).
 * -------------------------------------------------------------------------*/
const TODOS_LOS_OBJETOS = [
  // --- Dormitorio ---
  { x:5,  y:1,  art:'tvpared',   accion:'tele',   pared:true },
  { x:10, y:2,  art:'cuadro',    accion:'carta',  pared:true },
  { x:3,  y:3,  art:'cama',      accion:'mision', mision:'cama' },
  { x:7,  y:3,  art:'biblioteca',solido:true },
  { x:8,  y:3,  art:'escritorio',accion:'animo' },
  { x:9,  y:3,  art:'notebook',  accion:'progreso' },
  /* La silla, justo abajo de la notebook. Sentarse ACÁ es "ir a la compu":
     mirando para arriba (`mira:3`) queda de espaldas y con la notebook
     enfrente, así que estando sentada el botón A la sigue abriendo.
     La notebook además se puede seguir tocando de parada desde (10,3), que es
     por donde se llega si la silla está ocupada por el propio mueble. */
  { x:9,  y:4,  art:'silla',     accion:'compu',  mira:3 },
  // El placard va contra la pared de la derecha y NO debajo del cuadro: el
  // cuadro está colgado en (10,2) y se lee parándose en (10,3), así que un
  // mueble ahí dejaba la carta inalcanzable.
  { x:11, y:3,  art:'placard',   accion:'placard' },
  { x:11, y:6,  art:'planta',    solido:true },
  { x:5,  y:4,  art:'alfombraGrande', decor:true },

  // --- Baño ---
  { x:13, y:3,  art:'ducha',     accion:'mision', mision:'ducha' },
  { x:15, y:3,  art:'lavabo',    accion:'mision', mision:'dientes' },
  // 2 de alto: la mochila va sobre la pared. Habla: ver accionInodoro().
  { x:17, y:2,  art:'inodoro',   accion:'inodoro' },
  // Colgado en la pared, al lado del lavabo. Va en (16,2) y no en (15,2)
  // —justo encima de la pileta, que seria lo natural— porque para tocarlo hay
  // que poder pararse abajo, y abajo de (15,2) esta el lavabo, que es solido.
  { x:16, y:2,  art:'espejo',    accion:'espejo', pared:true },
  { x:18, y:5,  art:'toalla',    solido:true },

  // --- Cocina (todo apoyado contra la pared de arriba) ---
  { x:3,  y:10, art:'heladera',  accion:'mision', mision:'agua' },
  { x:4,  y:10, art:'mesada',    solido:true },
  { x:5,  y:10, art:'cocina',    accion:'mision', mision:'comer' },
  { x:6,  y:10, art:'mesada',    solido:true },
  { x:7,  y:10, art:'lavarropas',accion:'mision', mision:'ropa' },
  // La mesa no da misión: habla. Ver accionMesa() en game/juego.js.
  { x:7,  y:12, art:'mesa',      accion:'mesa' },

  /* --- Living ---
     Amoblado como una sala de verdad y no como un depósito: todo lo alto
     contra la pared de arriba, los dos sillones enfrentados a la chimenea con
     la mesa ratona en el medio, y la alfombra abajo de todo eso.

     La fila y=11 queda ENTERA libre a propósito: es el único pasillo del
     cuarto. Con las filas 10 y 12 ocupadas, cualquier cosa que se ponga en la
     11 parte el living en dos y deja muebles inalcanzables. Diego llegó a
     estar ahí y hubo que correrlo; hoy directamente vive afuera, en el jardín.

     Y la casilla (14,12) tiene que quedar libre: justo abajo está la puerta al
     jardín (14,13). Un sillón ahí no rompe nada que se note —al jardín se
     puede seguir saliendo por la cocina— pero deja al living sin salida
     propia, que es peor: se ve bien y anda mal.

     La biblioteca, la chimenea y la lámpara van apoyadas en y=9, que es la
     fila de PARED: miden 2 casillas de alto y así se ven de pie contra la
     pared sin gastar piso, porque la casilla de arriba ya era pared y ya era
     sólida. Lo que NO se puede es taparle una puerta a esa fila (x=8 y x=11);
     el smoke lo verifica.

     El puesto de premios se quedó donde estaba, en (16,10). */
  { x:11, y:11, art:'alfombraLiving', decor:true },
  { x:10, y:9,  art:'bibliotecaAlta', solido:true },
  { x:12, y:9,  art:'chimenea',  solido:true },
  { x:14, y:10, art:'cuadro',    pared:true },   // decorativo: la carta es la del cuarto
  { x:15, y:10, art:'tv',        solido:true },
  { x:16, y:10, art:'tienda',    accion:'premios' },
  { x:17, y:10, art:'planta',    solido:true },
  { x:18, y:9,  art:'lampara',   solido:true },
  /* Los dos sillones se usan: Kath se sienta a ver la tele. `mira:3` la deja
     mirando para arriba, o sea a la tele (15,10) y a la chimenea, que es para
     donde miran los sillones desde siempre según este mismo archivo.

     `tapa` es lo que hace que eso se pueda: el sillón se dibuja DESPUÉS de
     ella y su respaldo la cubre de la nuca para abajo. No es un adorno — la
     hoja de Kath sentada trae una silla de madera adentro del sprite, y sin
     algo que la tape, sentarse de espaldas en el sillón se ve como que arrimó
     una silla al living. Con el respaldo encima queda lo que se quiere: la
     cabeza asomando por arriba del sillón, mirando la tele.

     Se sienta en la mitad a la que se acercó: eso lo resuelve solo el motor,
     que usa la casilla que ella tiene enfrente. */
  { x:11, y:12, art:'sofa',      accion:'sillon', mira:3, tapa:true },
  { x:13, y:12, art:'mesaRatona',solido:true },
  { x:15, y:12, art:'sofa',      accion:'sillon', mira:3, tapa:true },   // en 14 tapaba la puerta al jardin
  { x:18, y:12, art:'planta',    solido:true },

  /* --- Jardín ---
     Diego: personaje, no objeto. El motor lo dibuja recortando cuadros de su
     hoja (24x32 x3), igual que a la jugadora, y se da vuelta cuando ella se
     acerca.

     Va AFUERA de la casa a propósito: es el que toma las misiones secundarias,
     y contarle algo que hiciste puertas afuera se parece más a salir a
     buscarlo que a cruzárselo en el living.

     La casilla es (6,14): al lado del sendero que baja de la puerta de la
     cocina —o sea, lo primero que se cruza al salir— pero corrido una casilla
     para no pararse encima del sendero ni tapar la puerta de arriba. Diego es
     sólido: parado en (5,14) dejaría la salida de la cocina sin paso.

     `dir:3` es con qué pose arranca: mirando para arriba, o sea a la casa,
     esperando que ella salga. De ahí en más no se queda quieto — solo, mira
     para todos lados (actualizarPersonajes en motor.js) y con Kath cerca la
     mira a ella (dirHaciaJugadora).

     Conviene que la pose inicial NO sea la misma que le toca cuando Kath le
     habla, que es `dir:0` (ella se le para enfrente, él mira para abajo). Con
     esa puesta, el primer encuentro del día es un giro que no se ve. */
  { x:6,  y:14, art:'diego',     accion:'diego', personaje:true, dir:3, flag:'diego' },
  { x:2,  y:16, art:'reposera',  accion:'mision', mision:'sol' },
  { x:8,  y:17, art:'yoga',      accion:'mision', mision:'ejercicio' },
  { x:16, y:16, art:'huevo',     accion:'companero' },
  { x:2,  y:14, art:'arbol',     solido:true },
  { x:20, y:15, art:'arbol',     solido:true },
  { x:18, y:15, art:'arbol',     solido:true },
  { x:11, y:18, art:'flores',    decor:true },
  { x:16, y:14, art:'flores',    decor:true },
  { x:12, y:17, art:'flores',    decor:true },
  { x:20, y:9,  art:'cartel',    accion:'info' }
];

/* Un objeto con `flag` sólo entra al mundo si su interruptor está prendido.
   Filtrar acá alcanza para todo: construirMundo() arma la colisión y el mapa de
   interacción sobre esta lista, y el bucle de dibujo la recorre igual. */
const OBJETOS = TODOS_LOS_OBJETOS.filter(o => !o.flag || FLAGS[o.flag]);

/* Posición inicial de la jugadora (en tiles) */
const INICIO = { x:6, y:5, dir:0 };

export { MAPA, SOLIDOS, OBJETOS, INICIO };
