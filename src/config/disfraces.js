/* ---------------------------------------------------------------------------
 *  DISFRACES — accesorios que Kath encuentra caminando por el césped
 *
 *  Son accesorios y no trajes enteros a propósito: se dibujan ENCIMA de la
 *  hoja de Kath (ver engine/disfraces.js) en vez de reemplazarla, así no hace
 *  falta una hoja de caminata nueva por cada uno. La cabeza está en el mismo
 *  lugar en los 16 cuadros de la hoja de caminar y en los 16 de la de bailar
 *  —se midió—, así que alcanza con un dibujo por dirección y valen para las
 *  dos.
 *
 *  Para agregar uno nuevo: una entrada acá y su arte en engine/disfraces.js
 *  con la misma `id`. Aparece solo en el placard y en los hallazgos.
 *
 *  `via` dice de dónde sale cada uno, y son dos mundos separados:
 *    'cesped'    aparece solo caminando por el pasto (PASOS_POR_HALLAZGO).
 *    'medicinas' se destraba al completar las tres tomas del día, cuando la
 *                racha llega a `rachaMed` días seguidos. Estos NO salen nunca
 *                en el césped: si salieran, la recompensa de cuidarse se
 *                podría conseguir caminando en círculos.
 *
 *  Por qué las medicinas pagan en accesorios y no en monedas: las tomas no son
 *  una misión que se elige, son algo que tiene que pasar igual. El oro las
 *  pondría a competir con lavar la ropa en una lista de precios; un accesorio
 *  que sólo se consigue así se junta y se muestra (ver config/medicinas.js).
 * -------------------------------------------------------------------------*/
const DISFRACES = [
  {
    id: 'orejas',
    via: 'cesped',
    nombre: 'Orejas de Shrek',
    icono: '💚',
    desc: 'Verdes, enormes y de ogro. Te quedan perfectas.',
    hallazgo: 'Algo verde asoma entre el pasto, en un pantano que no estaba ahí...',
  },
  {
    id: 'antenitas',
    via: 'cesped',
    nombre: 'Antenitas de abeja',
    icono: '🐝',
    desc: 'Se mueven solas cuando caminás. Bzzz.',
    hallazgo: 'Dos bolitas amarillas brillan en el césped...',
  },
  {
    id: 'mono',
    via: 'cesped',
    nombre: 'Moño de Hello Kitty',
    icono: '🎀',
    desc: 'Rojo, enorme y ladeado. Igualito al de ella.',
    hallazgo: 'Hay una cinta roja enredada en el pasto...',
  },
  {
    id: 'corona',
    via: 'cesped',
    nombre: 'Corona de reina',
    icono: '👑',
    desc: 'De oro, con rubí y amatistas. Y tira brillitos sola.',
    hallazgo: 'Algo dorado destella entre el pasto, y no es una moneda...',
  },
  {
    id: 'capa',
    via: 'cesped',
    nombre: 'Capa de superheroína',
    icono: '🦸',
    desc: 'Para los días en que hay que salvar el mundo. O levantarse.',
    hallazgo: 'Hay una tela que se agita con el viento...',
  },

  /* --- los del pastillero --------------------------------------------------
     Van en orden de `rachaMed` creciente: gameLogic entrega el primero que
     falte y que ya esté al alcance, así que desordenarlos cambia cuál toca. */
  {
    id: 'vincha',
    via: 'medicinas',
    rachaMed: 1,
    nombre: 'Vincha de corazón',
    icono: '💗',
    desc: 'Rosa, con un corazón al costado. La primera de las que no se compran.',
    hallazgo: 'Las tres tomas del día, completas. Sobre la mesada quedó algo que no estaba...',
  },
  {
    id: 'flor',
    via: 'medicinas',
    rachaMed: 3,
    nombre: 'Flor en el pelo',
    icono: '🌼',
    desc: 'Una margarita blanca. Tres días seguidos cuidándote valen una flor.',
    hallazgo: 'Tres días seguidos con las tres. Apareció una margarita al lado del vaso...',
  },
  {
    id: 'gorro',
    via: 'medicinas',
    rachaMed: 7,
    nombre: 'Gorro de dormir',
    icono: '💤',
    desc: 'Celeste, con pompón. Una semana entera de tomas en horario.',
    hallazgo: 'Una semana completa. Alguien te dejó un gorro doblado sobre la almohada...',
  },
  {
    id: 'aureola',
    via: 'medicinas',
    rachaMed: 21,
    nombre: 'Aureola de santa paciencia',
    icono: '😇',
    desc: 'Flota sola y tira brillitos. Veintiún días seguidos. Sos de otro nivel.',
    hallazgo: 'Veintiún días seguidos con las tres tomas. Algo dorado te quedó flotando arriba de la cabeza...',
  },
];

/* Cada cuántos pasos por el césped, en promedio, aparece algo. Se sortea una
   vez por paso y sólo entre lo que todavía no encontró, así que el último
   tarda lo mismo que el primero. */
const PASOS_POR_HALLAZGO = 45;

function disfrazPorId(id) {
  return DISFRACES.find((d) => d.id === id) || null;
}

/* Los que aparecen caminando por el pasto y los que se destraban cuidándose.
   Se filtran por `via` y no por una segunda lista escrita a mano: una lista
   aparte se desincroniza el día que alguien agrega un accesorio y se olvida. */
const DISFRACES_CESPED = DISFRACES.filter((d) => d.via === 'cesped');
const DISFRACES_MEDICINAS = DISFRACES.filter((d) => d.via === 'medicinas');

export {
  DISFRACES, DISFRACES_CESPED, DISFRACES_MEDICINAS,
  PASOS_POR_HALLAZGO, disfrazPorId,
};
