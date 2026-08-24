/* ============================================================================
 *  GLIFOS — los dígitos pixelados de los relojes
 *
 *  Los números se dibujan pixel por pixel y no con una tipografía: el resto del
 *  juego es arte de 16 px escalado x3, y cualquier fuente del sistema al lado se
 *  ve como una etiqueta pegada encima. Además una fuente pixelada de verdad
 *  serían ~30 KB y un parpadeo mientras carga, para nueve dígitos y dos signos.
 *
 *  Vive en engine/ y no en el componente del reloj porque lo usan los dos lados:
 *  el reloj de pared lo dibuja como SVG (components/Reloj.jsx) y el reloj grande
 *  del pomodoro lo dibuja en el canvas (motor.js). Un solo juego de dígitos para
 *  los dos, que es lo que hace que se lean como el mismo reloj.
 *
 *  Cada glifo es una grilla de 3 de ancho x 5 de alto (los dos puntos, 1 de
 *  ancho).
 * ==========================================================================*/
const GLIFOS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  ':': ['0', '1', '0', '1', '0'],
  '/': ['001', '001', '010', '100', '100'],
  ' ': ['0', '0', '0', '0', '0'],
};

const ALTO_GLIFO = 5;
const SEP_GLIFO = 1;   // columnas vacías entre glifo y glifo

function glifosDe(txt) {
  return [...String(txt)].map((c) => GLIFOS[c] || GLIFOS[' ']);
}

/* Ancho del texto en píxeles del DIBUJO (o sea, sin escalar). */
function anchoGlifos(txt) {
  return glifosDe(txt).reduce((s, g) => s + g[0].length + SEP_GLIFO, 0) - SEP_GLIFO;
}

/* Lo mismo en un canvas 2D: cada píxel del dibujo es un cuadrado de `px` de
   lado. Pinta con el `fillStyle` que ya tenga el contexto. */
function dibujarGlifos(ctx, txt, x, y, px) {
  let cx = x;
  for (const g of glifosDe(txt)) {
    for (let fila = 0; fila < ALTO_GLIFO; fila++) {
      for (let col = 0; col < g[fila].length; col++) {
        if (g[fila][col] === '1') ctx.fillRect(cx + col * px, y + fila * px, px, px);
      }
    }
    cx += (g[0].length + SEP_GLIFO) * px;
  }
}

export { GLIFOS, ALTO_GLIFO, SEP_GLIFO, anchoGlifos, dibujarGlifos };
