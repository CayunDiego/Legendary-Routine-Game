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
  'FG#######D#D########GGGF', // 9   puertas de la cocina y del living
  'FG#KKKKKKK#........#GGGF', // 10  cocina | living
  'FG#KKKKKKK#........#GGGF', // 11
  'FG#KKKKKKK#........#GGGF', // 12
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
 * -------------------------------------------------------------------------*/
const TODOS_LOS_OBJETOS = [
  // --- Dormitorio ---
  { x:5,  y:1,  art:'tvpared',   accion:'tele',   pared:true },
  { x:10, y:2,  art:'cuadro',    accion:'carta',  pared:true },
  { x:3,  y:3,  art:'cama',      accion:'mision', mision:'cama' },
  { x:7,  y:3,  art:'biblioteca',solido:true },
  { x:8,  y:3,  art:'escritorio',accion:'animo' },
  { x:9,  y:3,  art:'notebook',  accion:'progreso' },
  // El placard va contra la pared de la derecha y NO debajo del cuadro: el
  // cuadro está colgado en (10,2) y se lee parándose en (10,3), así que un
  // mueble ahí dejaba la carta inalcanzable.
  { x:11, y:3,  art:'placard',   accion:'placard' },
  { x:11, y:6,  art:'planta',    solido:true },
  { x:5,  y:4,  art:'alfombraGrande', decor:true },

  // --- Baño ---
  { x:13, y:3,  art:'ducha',     accion:'mision', mision:'ducha' },
  { x:15, y:3,  art:'lavabo',    accion:'mision', mision:'dientes' },
  { x:17, y:3,  art:'inodoro',   solido:true },
  { x:18, y:5,  art:'toalla',    solido:true },

  // --- Cocina (todo apoyado contra la pared de arriba) ---
  { x:3,  y:10, art:'heladera',  accion:'mision', mision:'agua' },
  { x:4,  y:10, art:'mesada',    solido:true },
  { x:5,  y:10, art:'cocina',    accion:'mision', mision:'comer' },
  { x:6,  y:10, art:'mesada',    solido:true },
  { x:7,  y:10, art:'lavarropas',accion:'mision', mision:'ropa' },
  { x:7,  y:12, art:'mesa',      solido:true },

  // --- Living ---
  { x:12, y:10, art:'tv',        solido:true },
  { x:16, y:10, art:'tienda',    accion:'premios' },
  { x:18, y:10, art:'planta',    solido:true },
  { x:12, y:12, art:'sofa',      solido:true },
  { x:17, y:12, art:'planta',    solido:true },
  // Diego: personaje, no objeto. El motor lo dibuja recortando cuadros de su
  // hoja (24x32 x3), igual que a la jugadora, y se da vuelta cuando ella se
  // acerca. Va al lado del puesto de premios, que es el que el cumple.
  { x:15, y:11, art:'diego',     accion:'diego', personaje:true, dir:0, flag:'diego' },

  // --- Jardín ---
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
