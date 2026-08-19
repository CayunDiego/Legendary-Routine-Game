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
 * -------------------------------------------------------------------------*/
const DISFRACES = [
  {
    id: 'orejas',
    nombre: 'Orejas de Shrek',
    icono: '💚',
    desc: 'Verdes, enormes y de ogro. Te quedan perfectas.',
    hallazgo: 'Algo verde asoma entre el pasto, en un pantano que no estaba ahí...',
  },
  {
    id: 'antenitas',
    nombre: 'Antenitas de abeja',
    icono: '🐝',
    desc: 'Se mueven solas cuando caminás. Bzzz.',
    hallazgo: 'Dos bolitas amarillas brillan en el césped...',
  },
  {
    id: 'mono',
    nombre: 'Moño de Hello Kitty',
    icono: '🎀',
    desc: 'Rojo, enorme y ladeado. Igualito al de ella.',
    hallazgo: 'Hay una cinta roja enredada en el pasto...',
  },
  {
    id: 'corona',
    nombre: 'Corona de reina',
    icono: '👑',
    desc: 'De oro, con rubí y amatistas. Y tira brillitos sola.',
    hallazgo: 'Algo dorado destella entre el pasto, y no es una moneda...',
  },
  {
    id: 'capa',
    nombre: 'Capa de superheroína',
    icono: '🦸',
    desc: 'Para los días en que hay que salvar el mundo. O levantarse.',
    hallazgo: 'Hay una tela que se agita con el viento...',
  },
];

/* Cada cuántos pasos por el césped, en promedio, aparece algo. Se sortea una
   vez por paso y sólo entre lo que todavía no encontró, así que el último
   tarda lo mismo que el primero. */
const PASOS_POR_HALLAZGO = 45;

function disfrazPorId(id) {
  return DISFRACES.find((d) => d.id === id) || null;
}

export { DISFRACES, PASOS_POR_HALLAZGO, disfrazPorId };
