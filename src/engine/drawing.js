/* ============================================================================
 *  ARTE — todo el pixel art se dibuja por código (rectángulos de 1 px)
 *  Fuente en grilla de 16 px por tile; se escala x3 => 48 px reales.
 * ==========================================================================*/

const TILE_SRC = 16;      // px de la grilla fuente
const S = 3;              // escala
const TILE = TILE_SRC * S; // 48 px en pantalla

/* --- utilidades de dibujo ------------------------------------------------ */
function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { c, g };
}

function pintar(w, h, rects) {
  const { c, g } = lienzo(w, h);
  for (const r of rects) {
    if (!r) continue;
    g.fillStyle = r[4];
    g.fillRect(r[0], r[1], r[2], r[3]);
  }
  return c;
}

/* círculo relleno hecho con filas de píxeles */
function circ(cx, cy, rad, color) {
  const out = [];
  for (let y = -rad; y <= rad; y++) {
    const dx = Math.floor(Math.sqrt(Math.max(0, rad * rad - y * y)));
    if (dx <= 0) continue;
    out.push([cx - dx, cy + y, dx * 2, 1, color]);
  }
  return out;
}

/* óvalo relleno */
function oval(cx, cy, rx, ry, color) {
  const out = [];
  for (let y = -ry; y <= ry; y++) {
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    if (dx <= 0) continue;
    out.push([cx - dx, cy + y, dx * 2, 1, color]);
  }
  return out;
}

/* ruido determinístico para variar los tiles sin que se note el patrón */
function rnd(seed) {
  let x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export { TILE_SRC, S, TILE, lienzo, pintar, circ, oval, rnd };
