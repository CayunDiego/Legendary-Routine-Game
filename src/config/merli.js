/* ---------------------------------------------------------------------------
 *  MERLÍ — el gatito que deambula
 *
 *  No es un objeto fijo del mapa (como los muebles) ni sigue a la jugadora
 *  (como el compañero del huevo): camina solo dentro de esta zona, tomando
 *  una decisión nueva cada tanto. Las coordenadas son en tiles y coinciden
 *  con las de config/mapa.js.
 * -------------------------------------------------------------------------*/
const ZONA_MERLI = {
  // el dormitorio entero (comas de MAPA, x:3-11 y:3-6) más el pasillo
  // (x:3-18 y:8): "mayormente" en la habitación porque es el rectángulo
  // grande, pero a veces cruza la puerta y sale a pasear.
  rects: [
    { x0: 3, y0: 3, x1: 11, y1: 6 },
    { x0: 3, y0: 8, x1: 18, y1: 8 },
  ],
};

function dentroDeZonaMerli(x, y) {
  return ZONA_MERLI.rects.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
}

export { ZONA_MERLI, dentroDeZonaMerli };
