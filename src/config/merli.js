/* ---------------------------------------------------------------------------
 *  MERLÍ — el gatito que deambula
 *
 *  No es un objeto fijo del mapa (como los muebles) ni sigue a la jugadora
 *  (como el compañero del huevo): camina solo dentro de esta zona, tomando
 *  una decisión nueva cada tanto. Las coordenadas son en tiles y coinciden
 *  con las de config/mapa.js.
 *
 *  El dormitorio es su lugar, pero no el único: sale al pasillo, entra a la
 *  cocina y al living. Eso NO se resuelve sólo agrandando la zona — ver
 *  QUERENCIA más abajo — y tiene una trampa que ya costó una vez: las puertas
 *  son casillas del mapa, así que si no están adentro de la zona el gato queda
 *  encerrado aunque el cuarto de al lado sí esté. El pasillo estaba en la lista
 *  desde el primer día y Merlí no piso ninguna baldosa: le faltaba la puerta
 *  (6,7).
 * -------------------------------------------------------------------------*/
const ZONA_MERLI = {
  rects: [
    { x0: 3, y0: 3, x1: 11, y1: 6 },    // dormitorio
    { x0: 6, y0: 7, x1: 6, y1: 7 },     // puerta del dormitorio al pasillo
    { x0: 3, y0: 8, x1: 18, y1: 8 },    // pasillo
    { x0: 9, y0: 9, x1: 9, y1: 9 },     // puerta de la cocina
    { x0: 11, y0: 9, x1: 11, y1: 9 },   // puerta del living
    { x0: 3, y0: 10, x1: 9, y1: 12 },   // cocina
    { x0: 11, y0: 10, x1: 18, y1: 12 }, // living
  ],
};

/* El baño y el jardín quedan afuera a propósito. El baño porque un gato metido
   en la ducha se lee como un bug, y el jardín porque es enorme y abierto: una
   vez que sale, el paseo al azar lo deja perdido en el pasto y Kath no lo
   encuentra más. */

/* La querencia: adónde vuelve solo. Sin esto, agrandar la zona convierte el
   paseo en una caminata al azar por toda la casa y el gato deja de "vivir" en
   ningún lado — que es justo lo contrario de lo que se busca.
   Las casillas de acá adentro pesan `peso` veces más en el sorteo del próximo
   paso, así que salir cuesta y volver sale gratis: el paseo se aleja de a
   ratos y se vuelve solo, sin necesidad de que nadie le calcule un camino.

   El número salió de simular 300.000 decisiones, no a ojo. Cuánto tiempo pasa
   en el dormitorio según el peso:

     peso 1 (sin querencia)   ~45% — vive en cualquier lado, no tiene lugar
     peso 2                   ~75% — el elegido
     peso 3                   ~92% — sale muy de vez en cuando
     peso 4                   ~97% — casi no sale

   Los porcentajes bailan varios puntos entre corridas y es esperable: sale
   poco pero cuando sale se queda un rato, así que el promedio depende de
   cuántos paseos entraron en la muestra. Lo que no cambia es el orden. */
const QUERENCIA = { x0: 3, y0: 3, x1: 11, y1: 6, peso: 2 };

function enRect(r, x, y) {
  return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

function dentroDeZonaMerli(x, y) {
  return ZONA_MERLI.rects.some((r) => enRect(r, x, y));
}

/* Cuánto "tira" una casilla en el sorteo del próximo paso. */
function pesoTileMerli(x, y) {
  return enRect(QUERENCIA, x, y) ? QUERENCIA.peso : 1;
}

export { ZONA_MERLI, QUERENCIA, dentroDeZonaMerli, pesoTileMerli };
