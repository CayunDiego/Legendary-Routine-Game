/* ---------------------------------------------------------------------------
 *  Interruptores de funcionalidades.
 *
 *  Poner una en false la saca del juego entera: del dibujo, de la colisión y de
 *  la interacción. No queda una casilla sólida invisible ni se carga el sprite.
 *
 *  Cómo se apaga un objeto del mapa: en config/mapa.js se le pone `flag:'nombre'`
 *  y acá el interruptor con ese nombre. construirMundo() y el bucle de dibujo
 *  trabajan sobre OBJETOS ya filtrado, así que no hay que tocar nada más.
 * ------------------------------------------------------------------------- */
export const FLAGS = {
  /* Diego, parado afuera de la casa. Informa cómo viene el día y es el único
     que toma las misiones secundarias (las que Kath escribe ella). */
  diego: true,
};
