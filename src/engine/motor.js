import { MAPA, SOLIDOS, OBJETOS, INICIO } from '../config/mapa.js';
import { SPRITE_JUGADORA, VIDEO_TELE, SPRITE_DIEGO } from '../config/sprites.js';
import { FLAGS } from '../config/flags.js';
import { TILE_SRC, S, TILE } from './drawing.js';
import { TILES } from './tiles.js';
import { ART_OBJ, SPR } from './objetos.js';
import { sonar } from './sonido.js';

/* ---------------------------------------------------------------------------
 *  Puente hacia la lógica del juego.
 *
 *  El motor necesita seis datos que viven en juego.js: si el juego está activo,
 *  y qué burbuja mostrar sobre cada objeto (misión pendiente, carta sin leer,
 *  huevo listo). Importarlos crearía un ciclo motor <-> juego, así que juego.js
 *  los inyecta con conectar() antes de arrancar el bucle.
 * ------------------------------------------------------------------------- */
let juego = {
  juegoActivo: () => false,
  misionPorId: () => null,
  hechoHoy: () => 0,
  puedeEclosionar: () => false,
  etapaBicho: () => 0,
  estado: () => ({}),
};

function conectar(api) { juego = { ...juego, ...api }; }

/* ============================================================================
 *  MOTOR — cámara, colisiones, movimiento por casillas y render
 * ==========================================================================*/

const ANCHO_MAPA = MAPA[0].length;
const ALTO_MAPA = MAPA.length;

const DIRS = [
  { dx: 0, dy: 1 },   // 0 abajo
  { dx: -1, dy: 0 },  // 1 izquierda
  { dx: 1, dy: 0 },   // 2 derecha
  { dx: 0, dy: -1 }   // 3 arriba
];

const MOV_MS = 185;   // duración de un paso
const GIRO_MS = 75;   // pausa al girar sin moverse

let cv, ctx, vpW = 0, vpH = 0, dpr = 1;
let hojaSprite = null;              // sprite sheet de la jugadora
let hojaDiego = null;               // sprite sheet de Diego (mismo formato)
const FRAME_W = 24, FRAME_H = 32;   // tamaño de cada frame del sheet
const PIES = 30;                    // y donde terminan los pies dentro del frame
const ESC_JUG = 3;                  // escala del sprite (3 = mismo tamaño de píxel que el escenario)

const cam = { x: 0, y: 0 };
const solido = [];                  // grilla de colisión
const objPorTile = new Map();       // "x,y" -> objeto

const jugadora = {
  tx: INICIO.x, ty: INICIO.y,
  px: INICIO.x * TILE, py: INICIO.y * TILE,
  dir: INICIO.dir,
  moviendo: false, t: 0, desdeX: 0, desdeY: 0,
  paso: 0, giro: 0
};

const bicho = { px: 0, py: 0, dir: 0, visible: false, cola: [] };

const input = { dir: -1, a: false, aEdge: false };

/* --- construcción del mundo --------------------------------------------- */
function construirMundo() {
  for (let y = 0; y < ALTO_MAPA; y++) {
    solido[y] = [];
    for (let x = 0; x < ANCHO_MAPA; x++) {
      solido[y][x] = SOLIDOS.has(MAPA[y][x]);
    }
  }
  for (const o of OBJETOS) {
    const art = ART_OBJ[o.art];
    o.tw = art.tw; o.th = art.th;
    o.decor = o.decor || art.decor;
    o.pared = o.pared || art.pared;   // colgado en la pared: no ocupa lugar, ya era sólida
    for (let j = 0; j < art.th; j++) {
      for (let i = 0; i < art.tw; i++) {
        const k = (o.x + i) + ',' + (o.y + j);
        objPorTile.set(k, o);
        if (!o.decor && !o.pared) solido[o.y + j][o.x + i] = true;
      }
    }
  }
}

function tilePasable(x, y) {
  if (x < 0 || y < 0 || x >= ANCHO_MAPA || y >= ALTO_MAPA) return false;
  return !solido[y][x];
}

function objetoFrente() {
  const d = DIRS[jugadora.dir];
  const o = objPorTile.get((jugadora.tx + d.dx) + ',' + (jugadora.ty + d.dy));
  return (o && o.accion) ? o : null;
}

/* --- canvas -------------------------------------------------------------- */
function ajustarCanvas() {
  const cont = document.getElementById('escena');
  const r = cont.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  vpW = Math.round(r.width); vpH = Math.round(r.height);
  cv.width = Math.round(vpW * dpr);
  cv.height = Math.round(vpH * dpr);
  cv.style.width = vpW + 'px';
  cv.style.height = vpH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function actualizarCamara(inmediato) {
  const mundoW = ANCHO_MAPA * TILE, mundoH = ALTO_MAPA * TILE;
  let cx = jugadora.px + TILE / 2 - vpW / 2;
  let cy = jugadora.py + TILE / 2 - vpH / 2;
  cx = mundoW <= vpW ? (mundoW - vpW) / 2 : Math.max(0, Math.min(mundoW - vpW, cx));
  cy = mundoH <= vpH ? (mundoH - vpH) / 2 : Math.max(0, Math.min(mundoH - vpH, cy));
  if (inmediato) { cam.x = cx; cam.y = cy; }
  else { cam.x += (cx - cam.x) * 0.18; cam.y += (cy - cam.y) * 0.18; }
}

/* --- movimiento ---------------------------------------------------------- */
function actualizarJugadora(dt) {
  if (jugadora.moviendo) {
    jugadora.t += dt;
    const p = Math.min(1, jugadora.t / MOV_MS);
    jugadora.px = jugadora.desdeX + (jugadora.tx * TILE - jugadora.desdeX) * p;
    jugadora.py = jugadora.desdeY + (jugadora.ty * TILE - jugadora.desdeY) * p;
    if (p >= 1) {
      jugadora.moviendo = false;
      jugadora.paso ^= 1;
      registrarCola();
    }
    return;
  }
  if (jugadora.giro > 0) { jugadora.giro -= dt; return; }
  if (!juego.juegoActivo()) return;

  const d = input.dir;
  if (d < 0) return;
  if (jugadora.dir !== d) {
    jugadora.dir = d;
    jugadora.giro = GIRO_MS;
    return;
  }
  const dd = DIRS[d];
  const nx = jugadora.tx + dd.dx, ny = jugadora.ty + dd.dy;
  if (!tilePasable(nx, ny)) { sonar('bloqueo'); return; }
  jugadora.desdeX = jugadora.px; jugadora.desdeY = jugadora.py;
  jugadora.tx = nx; jugadora.ty = ny;
  jugadora.t = 0; jugadora.moviendo = true;
}

/* el compañero sigue el rastro de la jugadora */
function registrarCola() {
  bicho.cola.push({ x: jugadora.tx * TILE, y: jugadora.ty * TILE });
  if (bicho.cola.length > 3) bicho.cola.shift();
}

function actualizarBicho() {
  if (!bicho.visible || bicho.cola.length < 3) return;
  const dest = bicho.cola[0];
  bicho.px += (dest.x - bicho.px) * 0.16;
  bicho.py += (dest.y - bicho.py) * 0.16;
}

/* --- render -------------------------------------------------------------- */
let tiempoAnim = 0;

function dibujar(dt) {
  tiempoAnim += dt;
  ctx.fillStyle = '#1b1b2a';
  ctx.fillRect(0, 0, vpW, vpH);

  const x0 = Math.max(0, Math.floor(cam.x / TILE));
  const y0 = Math.max(0, Math.floor(cam.y / TILE));
  const x1 = Math.min(ANCHO_MAPA - 1, Math.ceil((cam.x + vpW) / TILE));
  const y1 = Math.min(ALTO_MAPA - 1, Math.ceil((cam.y + vpH) / TILE));
  const fAgua = Math.floor(tiempoAnim / 550) % 2;

  // suelo
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = MAPA[y][x];
      let set = TILES[c] || TILES.G;
      let img;
      if (c === '~') img = set[fAgua];
      // la pared usa el remate sólo cuando no tiene otra pared encima
      else if (c === '#') img = (y > 0 && MAPA[y - 1][x] === '#') ? set[1] : set[0];
      else img = set.length > 1 ? set[(x * 7 + y * 13) % set.length] : set[0];
      ctx.drawImage(img, 0, 0, TILE_SRC, TILE_SRC,
        Math.round(x * TILE - cam.x), Math.round(y * TILE - cam.y), TILE, TILE);
    }
  }

  // sombra bajo paredes (da profundidad)
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (MAPA[y][x] === '#' && y + 1 < ALTO_MAPA && MAPA[y + 1][x] !== '#') {
        ctx.fillRect(Math.round(x * TILE - cam.x), Math.round((y + 1) * TILE - cam.y), TILE, 7);
      }
    }
  }

  // las cosas planas (alfombras, flores) son parte del piso: van antes que todo,
  // si no una alfombra grande termina tapando a la jugadora
  for (const o of OBJETOS) {
    if (!o.decor) continue;
    if (o.x + o.tw < x0 - 1 || o.x > x1 + 1 || o.y + o.th < y0 - 1 || o.y > y1 + 1) continue;
    dibujarObjeto(o);
  }

  // el resto se ordena por su base para que la jugadora pase por delante o por detrás
  const lista = [];
  for (const o of OBJETOS) {
    if (o.decor) continue;
    if (o.x + o.tw < x0 - 1 || o.x > x1 + 1 || o.y + o.th < y0 - 1 || o.y > y1 + 1) continue;
    lista.push({ tipo: 'obj', o, base: (o.y + o.th) * TILE });
  }
  lista.push({ tipo: 'jug', base: (jugadora.py + TILE) });
  if (bicho.visible) lista.push({ tipo: 'bicho', base: bicho.py + TILE - 1 });
  lista.sort((a, b) => a.base - b.base);

  for (const it of lista) {
    if (it.tipo === 'obj') dibujarObjeto(it.o);
    else if (it.tipo === 'jug') dibujarJugadora();
    else dibujarBicho();
  }

  aplicarLuzAmbiente();
}

/* Un personaje del mapa (por ahora Diego) usa la hoja de cuadros de 24x32 y la
   misma escala x3 que la jugadora, no el arte por codigo de los objetos. Si se
   dibujara con la ruta normal quedaria mas bajo y mas flaco parado al lado. */
function dibujarPersonaje(hoja, o) {
  const w = FRAME_W * ESC_JUG, h = FRAME_H * ESC_JUG;
  const cx = o.x * TILE - cam.x + TILE / 2;
  const dx = Math.round(cx - w / 2);
  const dy = Math.round(o.y * TILE - cam.y + TILE - PIES * ESC_JUG - 3);

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(Math.round(cx), Math.round(o.y * TILE - cam.y + TILE - 5), 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Se da vuelta hacia la jugadora cuando esta cerca.
  let dir = o.dir || 0;
  const ddx = jugadora.tx - o.x, ddy = jugadora.ty - o.y;
  if (Math.abs(ddx) + Math.abs(ddy) <= 3) {
    if (Math.abs(ddx) > Math.abs(ddy)) dir = ddx > 0 ? 2 : 1;
    else if (ddy !== 0) dir = ddy > 0 ? 0 : 3;
  }

  if (hoja) ctx.drawImage(hoja, 0, dir * FRAME_H, FRAME_W, FRAME_H, dx, dy, w, h);
}

function dibujarObjeto(o) {
  if (o.personaje) { dibujarPersonaje(hojaDiego, o); return; }
  const img = SPR[o.art];
  const dx = Math.round(o.x * TILE - cam.x);
  const dy = Math.round(o.y * TILE - cam.y);
  const w = o.tw * TILE, h = o.th * TILE;
  if (!o.decor && !o.pared) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(dx + w / 2, dy + h - 5, w * 0.36, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.drawImage(img, dx, dy, w, h);
  if (o.art === 'tvpared') dibujarPantallaTele(dx, dy);

  // burbuja de estado sobre las misiones
  if (o.accion === 'mision') {
    const m = juego.misionPorId(o.mision);
    const hecho = juego.hechoHoy(o.mision) >= m.veces;
    const flot = Math.sin(tiempoAnim / 320) * 3;
    ctx.drawImage(hecho ? SPR.__check : SPR.__alerta,
      Math.round(dx + w / 2 - 12), Math.round(dy - 26 + flot), 24, 24);
  } else if (o.accion && o.accion !== 'info') {
    const pend = (o.accion === 'animo' && juego.hechoHoy('animo') === 0) ||
      (o.accion === 'carta' && !juego.estado().cartaVista) ||
      (o.accion === 'companero' && juego.puedeEclosionar());
    if (pend) {
      const flot = Math.sin(tiempoAnim / 320) * 3;
      ctx.drawImage(SPR.__alerta, Math.round(dx + w / 2 - 12), Math.round(dy - 26 + flot), 24, 24);
    }
  }
}

/* --- la tele de verdad reproduce el gif ---------------------------------- */
/* La tira tiene los cuadros uno al lado del otro; se dibuja adentro del marco. */
const TELE = { w: 39, h: 30, cuadros: 19, ms: 50 };
const PANTALLA_TELE = { x: 3, y: 6, w: 26, h: 20 };   // en píxeles del arte (x3 en pantalla)
let hojaTele = null;

function dibujarPantallaTele(dx, dy) {
  const px = dx + PANTALLA_TELE.x * S;
  const py = dy + PANTALLA_TELE.y * S;
  const pw = PANTALLA_TELE.w * S, ph = PANTALLA_TELE.h * S;

  if (!hojaTele) {
    ctx.fillStyle = '#1a1a28';
    ctx.fillRect(px, py, pw, ph);
    return;
  }
  const f = Math.floor(tiempoAnim / TELE.ms) % TELE.cuadros;
  ctx.drawImage(hojaTele, f * TELE.w, 0, TELE.w, TELE.h, px, py, pw, ph);

  // brillo del vidrio, para que se lea como pantalla y no como un póster
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.moveTo(px, py); ctx.lineTo(px + pw * 0.45, py);
  ctx.lineTo(px, py + ph * 0.75); ctx.closePath();
  ctx.fill();
}

function dibujarJugadora() {
  const w = FRAME_W * ESC_JUG, h = FRAME_H * ESC_JUG;
  const dx = Math.round(jugadora.px - cam.x + TILE / 2 - w / 2);
  const dy = Math.round(jugadora.py - cam.y + TILE - PIES * ESC_JUG - 3);

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(Math.round(jugadora.px - cam.x + TILE / 2), Math.round(jugadora.py - cam.y + TILE - 5),
    15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  let f = 0;
  if (jugadora.moviendo) {
    const p = jugadora.t / MOV_MS;
    f = p < 0.5 ? (jugadora.paso ? 3 : 1) : (jugadora.paso ? 2 : 0);
  }
  if (hojaSprite) {
    ctx.drawImage(hojaSprite, f * FRAME_W, jugadora.dir * FRAME_H, FRAME_W, FRAME_H, dx, dy, w, h);
  } else {
    ctx.fillStyle = '#f06292';
    ctx.fillRect(dx + 12, dy + 20, 26, 34);
  }
}

function dibujarBicho() {
  const et = juego.etapaBicho();
  if (et < 0) return;
  const img = SPR.__bichos[et];
  const flot = Math.sin(tiempoAnim / 260) * 2;
  const dx = Math.round(bicho.px - cam.x + TILE / 2 - TILE * 0.38);
  const dy = Math.round(bicho.py - cam.y + TILE - TILE * 0.72 + flot);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(dx + TILE * 0.38, dy + TILE * 0.72, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(img, dx, dy, TILE * 0.76, TILE * 0.76);
}

/* luz según la hora real: mañana cálida, tarde neutra, noche azulada */
function aplicarLuzAmbiente() {
  const h = new Date().getHours();
  let col = null;
  if (h >= 21 || h < 6) col = 'rgba(30,40,90,0.34)';
  else if (h >= 19) col = 'rgba(255,140,80,0.16)';
  else if (h < 8) col = 'rgba(255,200,120,0.12)';
  if (!col) return;
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, vpW, vpH);
}

function cargarImagen(src) {
  return new Promise(ok => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });
}

function cargarSprite(listo) {
  // Con el interruptor apagado ni se pide el PNG de Diego.
  Promise.all([
    cargarImagen(SPRITE_JUGADORA),
    cargarImagen(VIDEO_TELE),
    FLAGS.diego ? cargarImagen(SPRITE_DIEGO) : Promise.resolve(null),
  ]).then(([sp, tv, dg]) => { hojaSprite = sp; hojaTele = tv; hojaDiego = dg; listo(); });
}

let ultimo = 0;
function bucle(ts) {
  const dt = Math.min(50, ts - ultimo || 16);
  ultimo = ts;
  actualizarJugadora(dt);
  actualizarBicho();
  actualizarCamara(false);
  dibujar(dt);
  requestAnimationFrame(bucle);
}

/* Engancha el canvas del DOM. Antes esto vivía al principio de iniciar(). */
function montarCanvas(canvas) {
  cv = canvas;
  ctx = cv.getContext('2d');
}

/* Arranca el bucle de render. */
function arrancarBucle() {
  requestAnimationFrame(bucle);
}

export {
  conectar, montarCanvas, arrancarBucle, cargarSprite,
  jugadora, bicho, input,
  construirMundo, tilePasable, objetoFrente,
  ajustarCanvas, actualizarCamara, actualizarJugadora, actualizarBicho,
  registrarCola, dibujar,
};
