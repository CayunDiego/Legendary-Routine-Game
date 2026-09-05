import { MAPA, SOLIDOS, OBJETOS, INICIO } from '../config/mapa.js';
import { SPRITE_JUGADORA, SPRITE_BAILE, SPRITE_SENTADA, VIDEO_TELE, SPRITE_DIEGO, SPRITE_DIEGO_BAILE, SPRITE_MERLI, SPRITE_HUEVO, SPRITE_COMPANERO } from '../config/sprites.js';
import { FLAGS } from '../config/flags.js';
import { KATH, SENTADA, MERLI, COMPANERO_ANIM, HUEVO_IDLE, HUEVO_HATCH } from '../config/recortes.js';
import { dentroDeZonaMerli, pesoTileMerli } from '../config/merli.js';
import { PASEO } from '../config/diego.js';
/* niveles.js no importa nada, así que traerlo acá no arma el ciclo que sí
   armaría pedirle xpNecesaria() a gameLogic.js (ver el comentario de allá). */
import { xpNecesaria } from '../state/niveles.js';
import { TILE_SRC, S, TILE, lienzo, circ } from './drawing.js';
import { TILES } from './tiles.js';
import { ART_OBJ, SPR } from './objetos.js';
import { SPR_DISFRAZ, bamboleoDisfraz, destellosDisfraz, ALTO_EXTRA, ANCHO_EXTRA } from './disfraces.js';
import { sonar } from './sonido.js';
import { ALTO_GLIFO, anchoGlifos, dibujarGlifos } from './glifos.js';

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
  alPisarCesped: () => {},
  /* El pomodoro en curso, ya masticado: { fase, txt, parte } o null. Viene
     armado de juego.js porque el mm:ss y las fases son de gameLogic, que el
     motor no puede importar sin armar el ciclo. */
  pomodoro: () => null,
  /* Si hay una toma de medicina pendiente en su franja horaria. Es lo único
     que enciende la burbuja del pastillero: ver config/medicinas.js. */
  medicinaPendiente: () => false,
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
let hojaBaile = null;               // hoja del baile (mismo formato que la de caminar)
let hojaSentada = null;             // hoja de Kath sentada (idem: 4 cuadros x 4 direcciones)
let hojaDiego = null;               // sprite sheet de Diego (mismo formato)
let hojaDiegoBaile = null;          // el baile de Diego (misma grilla que el de Kath)
let hojaMerli = null;               // hoja de Merlí (ver config/sprites.js)
let hojaHuevo = null;                // hoja del huevo (ver config/sprites.js)
let hojaCompanero = null;            // hoja del compañero (ver config/sprites.js)
const FRAME_W = KATH.w, FRAME_H = KATH.h;   // tamaño de cada frame del sheet (config/recortes.js)
const PIES = 30;                    // y donde terminan los pies dentro del frame
const ESC_JUG = 3;                  // escala del sprite (3 = mismo tamaño de píxel que el escenario)

/* Kath baila sola cuando pasa un rato sin que nadie toque nada, y a pedido
   cuando se toca A dos veces sin nada enfrente (eso lo decide juego.js).
   La hoja del baile tiene la misma grilla y el mismo orden de filas que la de
   caminar: 0 frente, 1 izquierda, 2 derecha, 3 atrás.

   Cada coreografía es una lista de cuadros (fila+columna de la hoja) con una
   duración opcional; `rapido` acorta el cuadro a la mitad para los pasos de
   giro. Cada baile sortea una de las tres. */
const BAILE_COREOS = [
  // 1. solo de frente
  [
    { fila: 0, col: 0 }, { fila: 0, col: 1 }, { fila: 0, col: 2 }, { fila: 0, col: 3 },
  ],
  // 2. completo: baila de frente, gira rápido a la derecha, un cuadro de espaldas,
  //    gira rápido a la izquierda y vuelve a bailar de frente
  [
    { fila: 0, col: 0 }, { fila: 0, col: 1 }, { fila: 0, col: 2 }, { fila: 0, col: 3 },
    { fila: 2, col: 0, rapido: true },
    { fila: 3, col: 0 },
    { fila: 1, col: 0, rapido: true },
  ],
  // 3. de costados: todos los cuadros de la derecha, pasa un cuadro por el
  //    frente, todos los cuadros de la izquierda, y otro cuadro de frente
  //    antes de volver a arrancar por la derecha (así el ciclo cierra parejo)
  [
    { fila: 2, col: 0 }, { fila: 2, col: 1 }, { fila: 2, col: 2 }, { fila: 2, col: 3 },
    { fila: 0, col: 0 },
    { fila: 1, col: 0 }, { fila: 1, col: 1 }, { fila: 1, col: 2 }, { fila: 1, col: 3 },
    { fila: 0, col: 0 },
  ],
];

const BAILE = {
  esperaMs: 15000,   // quieta este rato => arranca sola
  cuadroMs: 180,     // cuánto dura cada cuadro
  vueltas: 4,        // vueltas del baile pedido a mano
};

function duracionPaso(paso) {
  return paso.rapido ? BAILE.cuadroMs / 2 : BAILE.cuadroMs;
}

function duracionCoreo(i) {
  return BAILE_COREOS[i].reduce((total, paso) => total + duracionPaso(paso), 0);
}

/* Cuadro que corresponde a la coreografía `i` en el instante `t` (ms desde que
   arrancó el baile), recorriendo la lista en loop. */
function pasoBaile(i, t) {
  const secuencia = BAILE_COREOS[i];
  let resto = t % duracionCoreo(i);
  for (const paso of secuencia) {
    const dur = duracionPaso(paso);
    if (resto < dur) return paso;
    resto -= dur;
  }
  return secuencia[secuencia.length - 1];
}

/* Aura de XP: un halo detrás de Kath que crece a medida que se llena la barra
   del nivel y estalla cuando sube. Es todo canvas — no hay arte nuevo — así que
   los números de acá son la única forma de tocarla.

   El color sale de la lista por nivel: el ciclo es más corto que la curva de
   niveles a propósito, la idea es que se note que cambió, no llevar la cuenta. */
const AURA_COLORES = [
  [126, 200, 255],   // celeste
  [165, 139, 255],   // violeta
  [255, 139, 209],   // rosa
  [255, 209, 102],   // dorado
  [124, 255, 196],   // verde agua
];

/* Los radios se miden contra el sprite, que es de 72 x 96 en pantalla
   (FRAME_W x ESC_JUG). El halo se dibuja DEBAJO de Kath, así que todo lo que
   quede dentro de su silueta no se ve: cualquier radio menor a ~40 es un aura
   invisible por más opaca que sea.

   Por eso lo que crece con la barra es sobre todo la opacidad, no el tamaño:
   si el radio arrancara en cero, media barra se iría escondida atrás del
   cuerpo y el aura aparecería de golpe sobre el final. Arranca pegada a la
   silueta y transparente del todo — con la barra en cero no se dibuja nada — y
   se va encendiendo mientras se abre un poco. */
const AURA = {
  rMin: 40,          // radio con la barra en cero: pegado a la silueta, no asoma
  rMax: 54,          // radio con la barra llena
  alfa: 0.55,        // opacidad con la barra llena
  alfaMin: 0,        // qué parte de esa opacidad tiene con la barra en cero
  brillo: 0.42,      // dónde queda el anillo más brillante (0 centro, 1 borde)
  pulsoMs: 1600,     // cuánto tarda una respiración del halo
  pulso: 0.07,       // cuánto crece y decrece al respirar
  estalloMs: 950,    // lo que dura el estallido al subir de nivel
  estalloR: 3.2,     // hasta cuántas veces el radio llega el estallido
  estalloAlfa: 0.8,  // con cuánto arranca el estallido
};

const cam = { x: 0, y: 0 };
const solido = [];                  // grilla de colisión
const objPorTile = new Map();       // "x,y" -> objeto

const jugadora = {
  tx: INICIO.x, ty: INICIO.y,
  px: INICIO.x * TILE, py: INICIO.y * TILE,
  dir: INICIO.dir,
  moviendo: false, t: 0, desdeX: 0, desdeY: 0,
  paso: 0, giro: 0,
  bailando: false, tBaile: 0, baileHasta: 0, quieta: 0, baileCoreo: 0,
  /* Dónde estaba parada antes de sentarse, para devolverla ahí al levantarse:
     { tx, ty, dir, mueble }. En null cuando está de pie, que es lo que mira
     todo el resto del motor para saber si está sentada. */
  asiento: null, tSentada: 0
};

const bicho = { px: 0, py: 0, dir: 0, visible: false, cola: [], tAnim: 0 };

/* Caminata del compañero: una etapa por entrada, y dentro las cuatro
   direcciones en el mismo orden que DIRS (0 abajo, 1 izq, 2 der, 3 arriba).
   Cada dirección son 4 cuadros que comparten `y`, `w` y `h`: la celda es
   uniforme a propósito, así el ciclo no salta de tamaño ni de anclaje entre
   cuadro y cuadro (los cuadros de la hoja tienen cada uno su propio recorte
   ajustado, que sí variaba hasta 16 px).
   Como el arte trae las cuatro direcciones dibujadas de verdad, acá no se
   espeja nada: la fila es `dir` directo, igual que con Merlí. */
/* Las coordenadas de cada cuadro salen de config/recortes.js, que las lee del
   archivo que genera scripts/sprites.py al medir la hoja cruda de
   arte-fuente/. Antes vivían acá escritas a mano, y cambiar la hoja obligaba a
   medirlas de nuevo a ojo y pegarlas una por una (ver docs/sprites.md). */
const BICHO_ANIM_MS = 130;    // cuánto dura cada cuadro de la caminata
const BICHO_QUIETO_EPS = 0.4; // px de distancia al destino por debajo de la cual se considera quieto

/* Los cuadros del compañero no se dibujan directo desde la hoja: se
   reescalan UNA vez a su tamaño final (COMPANERO_SPR) y de ahí se dibujan
   1:1. Sin este paso, drawImage() tiene que achicar cuadros de hasta 194 px
   a los ~40-70 que ocupan en pantalla (BICHO_ESC = 0.36) con el suavizado
   apagado — y con el suavizado apagado, achicar así de fuerte no promedia
   nada: toma un píxel de la fuente por cada píxel de destino y se salta el
   resto. Un detalle fino como una garra o media pata mide 1-2 px en la
   fuente, así que según en qué píxel exacto caiga el muestreo, esa pasada
   puede pintarlo entero o comérselo del todo — es justo lo que se veía como
   "los pies se cortan", y por qué salía distinto según el cuadro.
   El achique en sí se hace con el suavizado prendido (una sola vez, en
   construirBicho()), que si promedia el área en vez de mirar un solo píxel;
   de ahí para adelante se dibuja con el suavizado apagado, para que quede
   nítido y no salga borroso. */
let COMPANERO_SPR = null;

function construirBicho() {
  if (!hojaCompanero) return;
  COMPANERO_SPR = COMPANERO_ANIM.map((etapa) => etapa.map((fila) => {
    const dw = Math.max(1, Math.round(fila.w * BICHO_ESC));
    const dh = Math.max(1, Math.round(fila.h * BICHO_ESC));
    return fila.x.map((x0) => {
      const { c, g } = lienzo(dw, dh);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(hojaCompanero, x0, fila.y, fila.w, fila.h, 0, 0, dw, dh);
      return c;
    });
  }));
}

/* Píxel de la hoja -> píxel en pantalla, el mismo número para las tres etapas
   y las cuatro direcciones. Es a propósito: así el bicho crece de verdad al
   evolucionar (de ~39 px de alto a ~60) en vez de que cada etapa se
   reescale al mismo tamaño y la evolución no se note. Por lo mismo, de
   frente y de espaldas se ve más largo que de costado — es el cuerpo visto a
   lo largo, que es como está dibujado. */
const BICHO_ESC = 0.36;

/* Merlí: gato suelto que deambula solo por config/merli.js#ZONA_MERLI (no
   sigue a la jugadora como el bicho, ni depende de una interacción). Arranca
   en una casilla del dormitorio que ya se sabe caminable, igual que INICIO. */
const MERLI_MOV_MS = 260;                 // paso más lento y relajado que el de la jugadora
const MERLI_ESPERA = [500, 2200];         // rango de pausa entre decisiones (ms)
const MERLI_QUIETO_PROB = 0.35;           // a veces la decisión es "quedarse un rato más"

/* Celda de la hoja (ver config/recortes.js): 10 cuadros de caminata x 4
   direcciones, en el mismo orden que DIRS (0 abajo, 1 izq, 2 der, 3 arriba).
   Se dibuja 1:1, sin reescalar, que es lo que la deja nítida. */
const MERLI_FRAME_W = MERLI.w, MERLI_FRAME_H = MERLI.h;
const MERLI_CUADROS = MERLI.cuadros;
const MERLI_CUADRO_MS = 70;               // el ciclo entero dura 700 ms

const merli = {
  tx: 7, ty: 4, px: 7 * TILE, py: 4 * TILE,
  dir: 0, tAnim: 0,
  moviendo: false, t: 0, desdeX: 0, desdeY: 0,
  espera: 800,
};

/* Huevo: dos tiras de 10 cuadros (el bamboleo y la eclosión), cada cuadro con
   su propio rectángulo porque la hoja no está en grilla. Salen medidas de
   config/recortes.js, igual que las del compañero. */
const HUEVO_IDLE_MS = 150;   // cuánto dura cada cuadro del bamboleo
const HUEVO_HATCH_MS = 150;  // cuánto dura cada cuadro de la eclosión

/* Cuánto se queda la cáscara rota en el jardín después de que nace la
   mascota. Pasado ese rato el huevo se va del mundo entero — no sólo del
   dibujo — porque si no quedaría una casilla invisible que igual bloquea el
   paso y contesta el botón A. */
const HUEVO_DURA_MS = 2 * 60 * 60 * 1000;   // 2 horas

/* Cuadro en el que la cáscara se termina de abrir (mirar HUEVO_HATCH: 0-4 es
   el huevo entero agrietándose, 5 es cuando estalla). Ahí sale el bicho: no
   al tocar el huevo, si no aparecería al lado de una cáscara todavía sana. */
const HUEVO_CUADRO_NACE = 5;

/* Sólo hay un huevo en el mapa, así que no hace falta guardar este estado
   por objeto: 'activa' se prende cuando accionCompanero() eclosiona
   (animarEclosionHuevo, más abajo) y se apaga sola al terminar la
   secuencia; a partir de ahí el cuadro final sale del EST.eclosionado
   guardado, así que sobrevive a un refresh de página.
   `nace` guarda la casilla del huevo hasta que le toca aparecer al bicho, y
   se limpia enseguida para no hacerlo nacer dos veces. */
const huevoAnim = { activa: false, t: 0, nace: null };

/* `tx, ty` es la casilla del huevo (la del objeto en config/mapa.js): el
   bicho nace ahí adentro y desde ahí sale caminando solo a buscar a Kath,
   porque actualizarBicho() lo manda al rastro que ella ya dejó. */
function animarEclosionHuevo(tx, ty) {
  huevoAnim.activa = true;
  huevoAnim.t = 0;
  huevoAnim.nace = { tx, ty };
}

/* Saca el huevo del mundo: deja de dibujarse, de tapar el paso y de contestar
   al botón A. Es lo único que hace falta borrar a mano — `oculto` lo mira el
   bucle de dibujo, y las otras dos cosas salen de las estructuras que armó
   construirMundo(). Al recargar la página se rearma todo de cero y este mismo
   chequeo lo vuelve a esconder, así que no hace falta guardar nada. */
function quitarHuevoDelMundo() {
  for (const o of OBJETOS) {
    if (o.art !== 'huevo' || o.oculto) continue;
    o.oculto = true;
    for (let j = 0; j < o.th; j++) {
      for (let i = 0; i < o.tw; i++) {
        objPorTile.delete((o.x + i) + ',' + (o.y + j));
        solido[o.y + j][o.x + i] = false;
      }
    }
  }
}

/* La cáscara se va sola pasadas HUEVO_DURA_MS desde que nació la mascota.
   Se mira el reloj en vez de un flag guardado para que valga igual si Kath
   dejó el juego abierto o si vuelve al día siguiente. */
function huevoVencido() {
  const est = juego.estado();
  if (!est.eclosionado) return false;
  if (huevoAnim.activa) return false;            // que termine de romperse
  if (!est.eclosionadoEn) return true;           // eclosionó antes de que existiera la marca
  return Date.now() - est.eclosionadoEn >= HUEVO_DURA_MS;
}

function actualizarHuevo(dt) {
  if (huevoVencido()) quitarHuevoDelMundo();
  if (!huevoAnim.activa) return;
  huevoAnim.t += dt;
  if (huevoAnim.nace && huevoAnim.t >= HUEVO_CUADRO_NACE * HUEVO_HATCH_MS) {
    bicho.px = huevoAnim.nace.tx * TILE;
    bicho.py = huevoAnim.nace.ty * TILE;
    bicho.dir = 0;                  // recién nacido, mirando a cámara
    bicho.visible = true;
    // El rastro que dejó Kath para llegar hasta acá ya está 3 casillas atrás:
    // si se lo dejara puesto, el recién nacido saldría disparado a un punto
    // detrás de ella, pasándola de largo. Sembrarlo con la casilla del huevo
    // lo deja quieto donde nació y lo hace arrancar recién cuando Kath se va.
    bicho.cola = [0, 1, 2].map(() => ({ x: bicho.px, y: bicho.py }));
    huevoAnim.nace = null;
  }
  if (huevoAnim.t >= (HUEVO_HATCH.length - 1) * HUEVO_HATCH_MS) huevoAnim.activa = false;
}

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
        /* Un objeto plano NO le puede robar la casilla a uno de verdad. Las
           alfombras se dibujan abajo de todo y por eso se pueden solapar con
           los muebles —el chequeo de muebles encimados del smoke las saltea a
           propósito—, pero acá adentro la última en cargarse ganaba, y el
           mueble desaparecía del mapa de interacción: seguía dibujado y
           sólido, y el botón A no lo veía más.
           Pasó con la silla del escritorio, que cae adentro de la alfombra
           grande del dormitorio. */
        const previo = objPorTile.get(k);
        if (!previo || !o.decor || previo.decor) objPorTile.set(k, o);
        if (!o.decor && !o.pared) solido[o.y + j][o.x + i] = true;
      }
    }
  }
  /* Los personajes caminan (ver el paseo, más abajo), así que además de la
     casilla llevan posición en píxeles y se acuerdan de dónde tienen que
     volver. `casa` se toma una sola vez: si esto se llamara de nuevo con Diego
     a mitad de paseo, su lugar de siempre pasaría a ser donde quedó parado. */
  for (const o of OBJETOS) {
    if (!o.personaje || o.casa) continue;
    o.px = o.x * TILE; o.py = o.y * TILE;
    o.casa = { x: o.x, y: o.y, dir: o.dir || 0 };
    o.paseo = { espera: sorteoEntre(PASEO.espera), pasos: 0, volviendo: false, moviendo: false, t: 0, paso: 0, desdeX: o.px, desdeY: o.py, ultima: null };
  }
}

/* Mueve un objeto de casilla y lleva con él las dos tablas que dicen dónde
   está: la de sólidos (si no, deja una pared invisible donde estaba) y la de
   interacción (si no, el botón A le habla al lugar vacío). Sólo para objetos
   de 1x1 —los únicos que se mueven— y sólo a una casilla que no tenga otro
   objeto, que es lo que `puedePisarPaseo` ya garantiza. */
function moverObjetoTile(o, nx, ny) {
  const antes = o.x + ',' + o.y;
  if (objPorTile.get(antes) === o) objPorTile.delete(antes);
  if (!o.decor && !o.pared) solido[o.y][o.x] = SOLIDOS.has(MAPA[o.y][o.x]);
  o.x = nx; o.y = ny;
  objPorTile.set(nx + ',' + ny, o);
  if (!o.decor && !o.pared) solido[ny][nx] = true;
}

function tilePasable(x, y) {
  if (x < 0 || y < 0 || x >= ANCHO_MAPA || y >= ALTO_MAPA) return false;
  return !solido[y][x];
}

function objetoEnTile(x, y) {
  return objPorTile.get(x + ',' + y) || null;
}

function objetoFrente() {
  const d = DIRS[jugadora.dir];
  const o = objetoEnTile(jugadora.tx + d.dx, jugadora.ty + d.dy);
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

/* --- baile ---------------------------------------------------------------- */

/* Sin `vueltas` baila hasta que Kath haga algo; con un número, esa cantidad de
   vueltas a la coreografía y vuelve sola a quedarse quieta. Cada baile sortea
   entre las coreografías de BAILE_COREOS. */
function bailar(vueltas) {
  if (!juego.juegoActivo()) return;
  jugadora.bailando = true;
  jugadora.tBaile = 0;
  jugadora.quieta = 0;
  jugadora.baileCoreo = Math.floor(Math.random() * BAILE_COREOS.length);
  jugadora.baileHasta = vueltas ? vueltas * duracionCoreo(jugadora.baileCoreo) : Infinity;
}

function pararBaile() {
  jugadora.bailando = false;
  jugadora.tBaile = 0;
  jugadora.quieta = 0;
}

/* Corre antes que el movimiento: moverse, abrir el menú o hablar con algo corta
   el baile y pone el reloj de la inactividad de nuevo en cero. */
function actualizarBaile(dt) {
  if (!juego.juegoActivo() || input.dir >= 0 || jugadora.moviendo) {
    pararBaile();
    return;
  }
  if (jugadora.bailando) {
    jugadora.tBaile += dt;
    if (jugadora.tBaile >= jugadora.baileHasta) pararBaile();
    return;
  }
  jugadora.quieta += dt;
  if (jugadora.quieta >= BAILE.esperaMs) bailar();
}

/* --- sentarse ------------------------------------------------------------
 *
 *  Kath se sienta en el mueble que tenga enfrente: la silla del escritorio y
 *  los sillones del living. No es una animación ni un modo aparte — es la
 *  misma jugadora, parada en la casilla del mueble y dibujada con otra hoja de
 *  sprites (la de sentada, misma grilla que caminar).
 *
 *  Dos cosas que parecen detalles y no lo son:
 *
 *  - La casilla del asiento es la que tiene ENFRENTE, no una guardada en el
 *    mapa. Así el mismo código sirve para la silla (1 casilla) y para los
 *    sillones (2 casillas): se sienta en la mitad a la que se acercó, y no hay
 *    que anotar en config/mapa.js qué mitad es cuál.
 *
 *  - Hacia dónde queda mirando lo decide el mueble (`mira`) y no la caminata.
 *    Los dos asientos la sientan de espaldas (`mira:3`): en la silla porque
 *    enfrente tiene la notebook, en el sillón porque enfrente tiene la tele.
 *
 *  - La hoja de sentada trae una SILLA dibujada adentro del sprite, así que
 *    dos muebles no pueden convivir en la misma casilla. Cada asiento resuelve
 *    eso de una manera y la elige el mapa con `tapa`:
 *      · la silla del escritorio no se dibuja (la que se ve es la del sprite);
 *      · el sillón sí se dibuja, y encima de ella: su respaldo es lo que le
 *        tapa esa sillita. Por eso el sillón está dibujado de espaldas —el
 *        respaldo abajo, contra la cámara— y por eso mide 14 filas de alto.
 * ------------------------------------------------------------------------- */

/* Cuánto dura cada uno de los 4 cuadros de la hoja de sentada. Es el respiro
   de estar quieta —los brazos y el pelo se mueven un poco—, no una caminata:
   a la velocidad del baile (180 ms) parece que tiembla. */
const SENTADA_MS = 320;

function estaSentada() { return !!jugadora.asiento; }

/* Sentada en la silla del escritorio, o sea trabajando. Lo miran el reloj
   grande del pomodoro (acá abajo) y el chiquito de la esquina, que se esconde
   mientras el grande está puesto. */
function sentadaEnCompu() {
  return !!(jugadora.asiento && jugadora.asiento.mueble.accion === 'compu');
}

/* Devuelve si se pudo. Falla si ya está sentada o si no tiene el mueble
   enfrente, que es justo lo que pasa cuando el pomodoro arranca desde el menú
   y Kath se fue caminando a otro lado: ahí no se sienta y listo. */
function sentarse(mueble) {
  if (!mueble || jugadora.asiento) return false;
  const d = DIRS[jugadora.dir];
  const sx = jugadora.tx + d.dx, sy = jugadora.ty + d.dy;
  if (objetoEnTile(sx, sy) !== mueble) return false;

  /* Puede llegar acá en medio de un paso: `tx,ty` ya es la casilla de destino
     desde el primer cuadro, así que el mueble que tiene "enfrente" es el
     correcto, pero el paso queda a medias. Hay que cerrarlo a mano — si no,
     `moviendo` se queda prendido y al levantarse retoma la interpolación con
     un origen viejo, o sea que se desliza sola desde donde estaba antes. */
  jugadora.moviendo = false;
  pararBaile();
  jugadora.asiento = { tx: jugadora.tx, ty: jugadora.ty, dir: jugadora.dir, mueble };
  jugadora.tx = sx; jugadora.ty = sy;
  jugadora.px = sx * TILE; jugadora.py = sy * TILE;
  jugadora.dir = mueble.mira === undefined ? jugadora.dir : mueble.mira;
  jugadora.tSentada = 0;
  return true;
}

/* La devuelve a la casilla desde donde se sentó. Vuelve a la pose con la que
   llegó y no a la de sentada: levantarse mirando la pared del fondo, que es
   para donde estaba mirando en la silla, se ve como un salto. */
function levantarse() {
  if (!jugadora.asiento) return false;
  const { tx, ty, dir } = jugadora.asiento;
  jugadora.asiento = null;
  jugadora.tx = tx; jugadora.ty = ty;
  jugadora.px = tx * TILE; jugadora.py = ty * TILE;
  jugadora.dir = dir;
  jugadora.quieta = 0;
  return true;
}

/* --- movimiento ---------------------------------------------------------- */
function actualizarJugadora(dt) {
  /* Sentada no camina ni baila: la primera flecha la para y recién con la
     siguiente vuelta del bucle da el paso. Ese cuadro de diferencia es a
     propósito — sin él se levanta y arranca a caminar en el mismo frame, y no
     se llega a ver que estaba sentada. */
  if (jugadora.asiento) {
    jugadora.tSentada += dt;
    if (juego.juegoActivo() && input.dir >= 0) levantarse();
    return;
  }

  actualizarBaile(dt);
  if (jugadora.moviendo) {
    jugadora.t += dt;
    const p = Math.min(1, jugadora.t / MOV_MS);
    jugadora.px = jugadora.desdeX + (jugadora.tx * TILE - jugadora.desdeX) * p;
    jugadora.py = jugadora.desdeY + (jugadora.ty * TILE - jugadora.desdeY) * p;
    if (p >= 1) {
      jugadora.moviendo = false;
      jugadora.paso ^= 1;
      registrarCola();
      // Recién terminado el paso, no en cada cuadro: si no, un paso lento
      // sortearía el hallazgo diez veces y el césped sería una lluvia de
      // accesorios. Quién decide si aparece algo es juego.js.
      if (MAPA[jugadora.ty][jugadora.tx] === 'G') juego.alPisarCesped();
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

function actualizarBicho(dt) {
  if (!bicho.visible || bicho.cola.length < 3) return;
  const dest = bicho.cola[0];
  const dx = dest.x - bicho.px, dy = dest.y - bicho.py;
  bicho.px += dx * 0.16;
  bicho.py += dy * 0.16;

  // Mira hacia donde se está moviendo, por el eje que más lo corre. El reloj
  // de la animación sólo corre mientras camina: quieto se queda en el primer
  // cuadro, si no parecería estar pisando en el lugar.
  if (Math.abs(dx) <= BICHO_QUIETO_EPS && Math.abs(dy) <= BICHO_QUIETO_EPS) return;
  bicho.dir = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 2 : 1)
    : (dy > 0 ? 0 : 3);
  bicho.tAnim += dt;
}

/* Merlí no sigue a nadie: cada tanto sortea una casilla vecina dentro de su
   zona y camina hasta ahí sola, con pausas entre paso y paso — nada de
   pathfinding, sólo un paseo creíble. Se congela fuera de 'juego' igual que
   la jugadora, para no seguir caminando con el menú abierto. */
function actualizarMerli(dt) {
  if (!juego.juegoActivo()) return;

  if (merli.moviendo) {
    merli.t += dt;
    // El reloj de la animación sólo corre mientras camina, y no se reinicia en
    // cada casilla: así dos pasos seguidos siguen el ciclo en vez de saltar de
    // vuelta al primer cuadro.
    merli.tAnim += dt;
    const p = Math.min(1, merli.t / MERLI_MOV_MS);
    merli.px = merli.desdeX + (merli.tx * TILE - merli.desdeX) * p;
    merli.py = merli.desdeY + (merli.ty * TILE - merli.desdeY) * p;
    if (p >= 1) {
      merli.moviendo = false;
      merli.espera = MERLI_ESPERA[0] + Math.random() * (MERLI_ESPERA[1] - MERLI_ESPERA[0]);
    }
    return;
  }

  if (merli.espera > 0) { merli.espera -= dt; return; }

  const candidatos = DIRS
    .map((d, i) => ({ dir: i, nx: merli.tx + d.dx, ny: merli.ty + d.dy }))
    .filter((c) => dentroDeZonaMerli(c.nx, c.ny) && tilePasable(c.nx, c.ny));

  if (!candidatos.length || Math.random() < MERLI_QUIETO_PROB) {
    merli.espera = MERLI_ESPERA[0] + Math.random() * (MERLI_ESPERA[1] - MERLI_ESPERA[0]);
    return;
  }

  /* Sorteo con peso, no parejo: las casillas del dormitorio tiran mas (ver
     QUERENCIA en config/merli.js). Con esto el paseo por la casa se aleja de a
     ratos y vuelve solo, sin calcularle un camino de regreso: en la puerta del
     cuarto, quedarse adentro es varias veces mas probable que salir. */
  const total = candidatos.reduce((s, c) => s + pesoTileMerli(c.nx, c.ny), 0);
  let r = Math.random() * total;
  let elegido = candidatos[candidatos.length - 1];
  for (const c of candidatos) {
    r -= pesoTileMerli(c.nx, c.ny);
    if (r <= 0) { elegido = c; break; }
  }

  merli.dir = elegido.dir;
  merli.desdeX = merli.px; merli.desdeY = merli.py;
  merli.tx = elegido.nx; merli.ty = elegido.ny;
  merli.t = 0; merli.moviendo = true;
}

/* --- aura ---------------------------------------------------------------- */
/* El estallido se dispara mirando EST.nivel en vez de que juego.js avise cuando
   da XP: así vale para todo lo que suba de nivel, lo que hay hoy y lo que se
   agregue después, sin acordarse de tocar dos lados.

   La primera vuelta sólo anota el nivel: si no, abrir una partida guardada en
   nivel 7 estallaría de entrada. Y si el nivel baja (reemplazo de partida desde
   la nube o desde un código) tampoco es un logro: se anota y listo. */
let auraNivel = -1;                 // último nivel visto (-1 = todavía ninguno)
let auraEstallido = 0;              // ms que le quedan al estallido

function actualizarAura(dt) {
  const nivel = juego.estado().nivel || 1;
  if (auraNivel < 0 || nivel < auraNivel) auraNivel = nivel;
  else if (nivel > auraNivel) {
    auraEstallido = AURA.estalloMs;
    auraNivel = nivel;
  }
  if (auraEstallido > 0) auraEstallido = Math.max(0, auraEstallido - dt);
}

/* Sólo para la prueba: el estallido no deja rastro en el estado del juego, y
   sin esto no hay forma de mirar desde afuera si salió. */
function auraActiva() { return auraEstallido > 0; }

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
    if (!o.decor || o.oculto) continue;
    if (o.x + o.tw < x0 - 1 || o.x > x1 + 1 || o.y + o.th < y0 - 1 || o.y > y1 + 1) continue;
    dibujarObjeto(o);
  }

  // el resto se ordena por su base para que la jugadora pase por delante o por detrás
  const lista = [];
  for (const o of OBJETOS) {
    if (o.decor || o.oculto) continue;
    if (o.x + o.tw < x0 - 1 || o.x > x1 + 1 || o.y + o.th < y0 - 1 || o.y > y1 + 1) continue;
    /* El mueble en el que Kath está sentada no se dibuja: la hoja de sentada
       ya trae una silla adentro del sprite, y las dos juntas se ven como dos
       sillas encimadas. La excepción son los asientos con `tapa` —los
       sillones—, que sí se dibujan, y encima de ella: ver más abajo. */
    if (jugadora.asiento && jugadora.asiento.mueble === o && !o.tapa) continue;
    lista.push({ tipo: 'obj', o, base: (o.y + o.th) * TILE });
  }
  /* Kath sentada tiene exactamente la misma base que el mueble —los dos
     terminan en el borde de abajo de la casilla— y ese empate lo desempataba
     el orden de la lista, o sea el azar. El -1 lo resuelve para siempre y en
     el sentido que hace falta: el sillón se dibuja después que ella, y su
     respaldo le tapa la silla del sprite. */
  lista.push({ tipo: 'jug', base: (jugadora.py + TILE) - (jugadora.asiento ? 1 : 0) });
  if (bicho.visible) lista.push({ tipo: 'bicho', base: bicho.py + TILE - 1 });
  lista.push({ tipo: 'merli', base: merli.py + TILE - 1 });
  lista.sort((a, b) => a.base - b.base);

  for (const it of lista) {
    if (it.tipo === 'obj') dibujarObjeto(it.o);
    else if (it.tipo === 'jug') dibujarJugadora();
    else if (it.tipo === 'merli') dibujarMerli();
    else dibujarBicho();
  }

  aplicarLuzAmbiente();

  /* Va DESPUÉS de la luz ambiente a propósito: es un reloj, no algo de la casa.
     Adentro del tinte de la noche los dígitos se apagan justo cuando más se los
     mira. */
  dibujarPomodoroGrande();
}

/* --- el reloj grande del pomodoro ------------------------------------------
 *
 *  Mientras Kath está sentada a la compu con un pomodoro andando, el reloj sale
 *  GRANDE y pegado abajo de ella, en el canvas. El chiquito de la esquina
 *  (components/PomodoroReloj.jsx) se esconde mientras tanto: son el mismo dato y
 *  dos veces el mismo número es ruido.
 *
 *  Grande y sobre ella y no en una esquina porque el momento es ese: está
 *  laburando de verdad, mirando otra pantalla, y levanta la vista al teléfono
 *  apoyado al lado. Lo que tiene que poder hacer es leer cuánto falta de un
 *  vistazo y de costado, sin acercarse ni buscar dónde estaba el número.
 *
 *  Va en el canvas y no en un div encima porque tiene que seguirla a ella: la
 *  cámara se mueve sola, y en React eso sería redibujar el juego entero una vez
 *  por cuadro para correr un cartelito dos píxeles.
 * ------------------------------------------------------------------------- */
const POMO_PX = 6;               // cuánto mide en pantalla cada píxel del dígito
const POMO_PAD = 9;              // aire adentro de la caja
const POMO_BARRA = 5;            // alto de la barra de lo que queda
const POMO_HUECO = 8;            // entre el dibujito y los dígitos
const POMO_COLOR = { foco: '#ff9d7a', pausa: '#8ee0c8' };

/* El dibujito de la izquierda: un tomate mientras trabaja, una taza en la
   pausa. Está para que el cartel no sea "un número cualquiera contando" — de
   un vistazo tiene que decir QUÉ está contando, y de paso cuál de las dos
   cosas está pasando sin depender sólo del color.

   Van en píxeles como todo lo demás (grilla de 12x12, `drawing.js#circ`) y no
   con los emojis 🍅 / ☕ del reloj chico: acá el dibujo mide 36 px al lado de
   dígitos hechos a mano, y un emoji del sistema a ese tamaño se ve como una
   calcomanía pegada sobre el juego. */
const ICONO_LADO = 12;
const ICONO_PX = 3;
const ICONO_TOMATE = [
  ...circ(6, 7, 4, '#d93b26'),
  ...circ(5, 6, 2, '#ef5a3f'),                                  // la luz de arriba
  [4, 4, 2, 1, '#ff9d7a'],                                      // el brillo
  /* Las hojas: dos filas nada más, y la de abajo cortada en tres. Enteras y
     más altas quedaban como un sombrero verde encima de una pelota roja. */
  [4, 2, 4, 1, '#4bb85c'],
  [2, 3, 2, 1, '#3f9e4d'], [5, 3, 2, 1, '#4bb85c'], [8, 3, 2, 1, '#3f9e4d'],
  [5, 1, 2, 1, '#2f7a3b'],                                      // el cabito
];
const ICONO_TAZA = [
  [4, 1, 1, 2, '#a9d8cb'], [5, 3, 1, 1, '#a9d8cb'],             // el vapor
  [7, 0, 1, 2, '#a9d8cb'], [8, 2, 1, 1, '#a9d8cb'],
  [2, 5, 7, 6, '#f2f6f8'], [2, 5, 7, 1, '#ffffff'],             // la taza
  [3, 6, 5, 1, '#7a4a2b'],                                      // el café adentro
  [2, 10, 7, 1, '#cfd8dd'],
  [9, 6, 2, 1, '#e3eaed'], [10, 7, 1, 2, '#e3eaed'], [9, 9, 2, 1, '#e3eaed'], // la manija
  [1, 11, 9, 1, '#b9c2c9'],                                     // el plato
];

/* Pinta una lista de rectángulos de la grilla fuente escalada. Es lo mismo que
   hace `drawing.js#pintar`, pero directo sobre el canvas del juego: son veinte
   rectángulos por cuadro y no vale la pena guardar un lienzo aparte. */
function dibujarIcono(rects, x, y, px) {
  for (const r of rects) {
    ctx.fillStyle = r[4];
    ctx.fillRect(x + r[0] * px, y + r[1] * px, r[2] * px, r[3] * px);
  }
}

function dibujarPomodoroGrande() {
  if (!sentadaEnCompu()) return;
  const p = juego.pomodoro();
  if (!p) return;

  const color = POMO_COLOR[p.fase] || POMO_COLOR.foco;
  const anchoTxt = anchoGlifos(p.txt) * POMO_PX;
  const altoTxt = ALTO_GLIFO * POMO_PX;
  const anchoIco = ICONO_LADO * ICONO_PX;
  const dentro = anchoIco + POMO_HUECO + anchoTxt;
  const w = dentro + POMO_PAD * 2;
  const h = altoTxt + POMO_BARRA + POMO_PAD * 2 + 5;

  /* Centrado en ella y apoyado abajo de los pies. El clamp es para el caso
     borde de la cámara pegada a un borde del mapa: mejor corrido que cortado. */
  let x = Math.round(jugadora.px - cam.x + TILE / 2 - w / 2);
  let y = Math.round(jugadora.py - cam.y + TILE) + 6;
  x = Math.max(4, Math.min(vpW - w - 4, x));
  y = Math.max(4, Math.min(vpH - h - 4, y));

  // la caja: la misma de los relojes de la esquina, para que sean la misma cosa
  ctx.fillStyle = 'rgba(13,13,24,.78)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2);
  ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h);

  /* El dibujito queda centrado contra la fila de dígitos: mide 36 y ellos 30,
     así que asoma 3 px arriba y abajo, que es lo que se quiere —el ícono es lo
     que se ve primero desde lejos. */
  dibujarIcono(p.fase === 'pausa' ? ICONO_TAZA : ICONO_TOMATE,
    x + POMO_PAD, y + POMO_PAD - (anchoIco - altoTxt) / 2, ICONO_PX);

  ctx.fillStyle = color;
  dibujarGlifos(ctx, p.txt, x + POMO_PAD + anchoIco + POMO_HUECO, y + POMO_PAD, POMO_PX);

  /* La barra dice de un vistazo cuánto falta sin tener que leer los números: de
     lejos y de reojo, "va por la mitad" se ve antes que "17:42". */
  const by = y + POMO_PAD + altoTxt + 5;
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  ctx.fillRect(x + POMO_PAD, by, dentro, POMO_BARRA);
  ctx.fillStyle = color;
  ctx.fillRect(x + POMO_PAD, by, Math.round(dentro * Math.max(0, Math.min(1, p.parte))), POMO_BARRA);
}

/* Hasta dónde un personaje sigue a Kath con la mirada: tres casillas, o sea
   cuando ya está cerca. Más lejos se queda mirando adonde lo dejó el mapa.

   Estuvo en ocho —casi toda la pantalla— mientras buscábamos por qué Diego
   parecía no girar nunca. No era el radio: era que su hoja de sprites tenía las
   dos poses de perfil mirando a la izquierda, y que estaba puesto mirando justo
   para donde iba a girar. Arreglado eso, tres casillas alcanza y sobra, y
   además es lo que se quiere: que te mire cuando te acercás, no que te siga con
   los ojos desde la otra punta del jardín. */
const RADIO_MIRADA = 3 * TILE;

/* Hacia dónde tiene que mirar un personaje del mapa para tener a Kath de frente.

   Se mide contra su posición en píxeles y no contra `tx/ty`: esas dos son la
   casilla a la que ella VA, así que un personaje que mirara la casilla se daba
   vuelta un paso tarde —y al arrancar el paso siguiente, antes de tiempo—. Con
   la posición real gira mientras ella camina, que es lo que se ve natural.

   Manda el eje más largo. Cuando ella le habla está pegada y de frente, así que
   uno de los dos ejes vale 0 y no hay empate posible; los empates son de lejos
   y en diagonal exacta, y ahí se elige la vertical, que es la que más se nota
   (el sprite cambia de frente a espaldas, no de perfil a perfil). */
function dirHaciaJugadora(o) {
  // Sin Kath cerca manda el ocio (actualizarPersonajes). Si nadie lo movio
  // todavia, la pose que le puso el mapa.
  const puesta = o.dirOcio === undefined ? (o.dir || 0) : o.dirOcio;
  const dx = jugadora.px - (o.px === undefined ? o.x * TILE : o.px);
  const dy = jugadora.py - (o.py === undefined ? o.y * TILE : o.py);
  if (Math.hypot(dx, dy) > RADIO_MIRADA) return puesta;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 2 : 1;
  if (dy !== 0) return dy > 0 ? 0 : 3;
  return puesta;
}

/* Cuanto se queda mirando para un lado antes de girar a otro, esperando solo.
   Sortear el rato ademas de la direccion es lo que lo saca de parecer un
   metronomo: con un intervalo fijo se nota el reloj enseguida. */
const OCIO_MIN_MS = 1600;
const OCIO_MAX_MS = 4200;

/* Los personajes del mapa (por ahora Diego) miran para todos lados mientras
   esperan. No es adorno: un monigote clavado en una pose parece un cartel, y
   dos giros de vez en cuando alcanzan para que se lea como alguien parado
   afuera.

   Con Kath cerca esto no corre: ahi manda mirarla a ella, y el reloj del ocio
   se reinicia para que al irse ella no gire de golpe en el mismo frame. */
function actualizarPersonajes(dt) {
  if (!juego.juegoActivo()) {
    for (const o of OBJETOS) if (o.personaje) o.bailando = false;
    return;
  }
  for (const o of OBJETOS) {
    if (!o.personaje || o.oculto) continue;

    const cerca = Math.hypot(jugadora.px - (o.px === undefined ? o.x * TILE : o.px),
      jugadora.py - (o.py === undefined ? o.y * TILE : o.py)) <= RADIO_MIRADA;

    /* Si Kath se pone a bailar al lado, se prende. Le copia la coreografía y el
       reloj, corridos un cuadro: bailan lo mismo pero él va atrás, como quien
       se suma a algo que ya empezó. Con los dos exactamente en fase parecen dos
       copias de la misma animación, que es justo lo que no se quiere. */
    o.bailando = cerca && jugadora.bailando;
    if (o.bailando) {
      o.baileCoreo = jugadora.baileCoreo;
      o.tBaile = Math.max(0, jugadora.tBaile - BAILE.cuadroMs);
    }

    /* El paseo corre igual con Kath cerca, pero frenado: lo único que sigue
       pasando es el paso que ya estaba a mitad de camino. */
    if (o.paseo) actualizarPaseo(o, dt, cerca || o.bailando);

    if (cerca) { o.tOcio = OCIO_MIN_MS; continue; }
    // Caminando no gira la cabeza sola: la pose la manda el paso.
    if (o.paseo && (o.paseo.moviendo || o.paseo.volviendo || o.paseo.pasos > 0)) continue;

    o.tOcio = (o.tOcio === undefined ? sorteoOcio() : o.tOcio) - dt;
    if (o.tOcio > 0) continue;
    o.tOcio = sorteoOcio();
    // Siempre a una direccion distinta de la que ya tiene: sortear entre las
    // cuatro deja que salga la misma y el giro no pasa, que desde afuera se ve
    // igual que si el sorteo estuviera roto.
    const actual = o.dirOcio === undefined ? (o.dir || 0) : o.dirOcio;
    const otras = [0, 1, 2, 3].filter((d) => d !== actual);
    o.dirOcio = otras[Math.floor(Math.random() * otras.length)];
  }
}

/* --- el paseo -------------------------------------------------------------
 *
 *  Cada tanto Diego se manda unos pasos por el jardín y vuelve solo a su
 *  casilla. El porqué de cada regla está en config/diego.js; acá está el cómo.
 *
 *  Dos cosas lo separan del paseo de Merlí, que es el otro que camina solo:
 *
 *  - Merlí no es un objeto del mapa: no es sólida, no se le habla, y por eso
 *    puede caminar por toda la casa sin avisarle a nadie. Diego SÍ es un
 *    objeto —sólido y con `accion`—, así que cada paso tiene que mover también
 *    las dos tablas que dicen dónde está (`moverObjetoTile`).
 *
 *  - Merlí se aleja y vuelve por peso: las casillas del dormitorio tiran más
 *    en el sorteo, y el regreso pasa solo. Acá el regreso es explícito
 *    (`volviendo`), porque Kath tiene que encontrarlo SIEMPRE en el mismo
 *    lugar: es el que toma las misiones secundarias, no un gato.
 * ------------------------------------------------------------------------ */
function sorteoEntre([a, b]) { return a + Math.random() * (b - a); }

/* El jardín, que es por donde pasea: pasto y sendero. Escrito como los pisos
   que sí puede pisar y no como una lista de casillas prohibidas — así no puede
   meterse adentro de la casa por una puerta ni terminar en el agua. */
const PISOS_PASEO = new Set(['G', 'P']);

/* Las tres razones por las que una casilla no sirve, en orden de gravedad:
   es el paso de una puerta (Diego es sólido: parado ahí deja a Kath encerrada
   adentro de la casa), ya tiene algo puesto, o queda más lejos de su lugar de
   lo que se aleja. */
function puedePisarPaseo(o, x, y) {
  if (x < 0 || y < 0 || x >= ANCHO_MAPA || y >= ALTO_MAPA) return false;
  if (!PISOS_PASEO.has(MAPA[y][x]) || !tilePasable(x, y)) return false;
  for (const dy of [-1, 1]) {
    const fy = y + dy;
    if (fy >= 0 && fy < ALTO_MAPA && MAPA[fy][x] === 'D') return false;
  }
  const otro = objetoEnTile(x, y);
  if (otro && otro !== o) return false;
  return Math.abs(x - o.casa.x) + Math.abs(y - o.casa.y) <= PASEO.radio;
}

function vecinosDe(o, x, y) {
  return DIRS
    .map((d, i) => ({ dir: i, nx: x + d.dx, ny: y + d.dy }))
    .filter((c) => puedePisarPaseo(o, c.nx, c.ny));
}

function vecinosPaseo(o) { return vecinosDe(o, o.x, o.y); }

/* A dónde va el próximo paso de ida. Evita la casilla de la que viene: sin eso
   el sorteo lo deja yendo y viniendo entre dos casillas, que no se lee como
   pasear sino como dudar. Si no hay otra, vuelve por donde vino y listo. */
function pasoAlAzar(o) {
  const todos = vecinosPaseo(o);
  const ult = o.paseo.ultima;
  const nuevos = ult ? todos.filter((c) => c.nx !== ult.x || c.ny !== ult.y) : todos;
  const lista = nuevos.length ? nuevos : todos;
  return lista.length ? lista[Math.floor(Math.random() * lista.length)] : null;
}

/* El primer paso del camino de vuelta, buscado a lo ancho (BFS) por el pedazo
   de jardín donde pasea.

   Empezó siendo "encará para el lado de casa, y si está tapado probá el otro
   eje", que es lo que alcanza en un jardín abierto. No alcanza: la casilla de
   abajo de la puerta está vedada, y eso sola deja rincones desde los que el
   camino derecho no existe. Parado a la izquierda del sendero, a la misma
   altura que su casilla, el paso obvio es el prohibido y el otro eje no lo
   acerca — se quedaba ahí para siempre, con Kath buscándolo en el lugar de
   siempre. La zona es de unas cuarenta casillas: buscar el camino entero cada
   vez que arranca un paso no cuesta nada. */
function pasoACasa(o) {
  const casa = o.casa;
  if (o.x === casa.x && o.y === casa.y) return null;
  const visto = new Set([o.x + ',' + o.y]);
  const cola = [];
  for (const c of vecinosPaseo(o)) {
    visto.add(c.nx + ',' + c.ny);
    cola.push({ x: c.nx, y: c.ny, primero: c });   // `primero` viaja con la rama
  }
  while (cola.length) {
    const n = cola.shift();
    if (n.x === casa.x && n.y === casa.y) return n.primero;
    for (const c of vecinosDe(o, n.x, n.y)) {
      const k = c.nx + ',' + c.ny;
      if (visto.has(k)) continue;
      visto.add(k);
      cola.push({ x: c.nx, y: c.ny, primero: n.primero });
    }
  }
  return null;
}

function arrancarPasoPaseo(o, c) {
  const p = o.paseo;
  o.dirOcio = c.dir;                  // camina mirando para donde va
  p.ultima = { x: o.x, y: o.y };
  p.desdeX = o.px; p.desdeY = o.py;
  p.t = 0; p.moviendo = true;
  moverObjetoTile(o, c.nx, c.ny);
}

/* Un cuadro del paseo. `frenado` es "Kath está cerca (o están bailando)": no
   arranca ningún paso nuevo, pero el que está a mitad de camino se termina
   igual — cortarlo lo dejaría parado entre dos casillas. */
function actualizarPaseo(o, dt, frenado) {
  const p = o.paseo;

  if (p.moviendo) {
    p.t += dt;
    const f = Math.min(1, p.t / PASEO.pasoMs);
    o.px = p.desdeX + (o.x * TILE - p.desdeX) * f;
    o.py = p.desdeY + (o.y * TILE - p.desdeY) * f;
    if (f < 1) return;
    p.moviendo = false;
    p.paso ^= 1;
    p.espera = sorteoEntre(PASEO.respiro);
    if (p.volviendo && o.x === o.casa.x && o.y === o.casa.y) {
      p.volviendo = false;
      p.ultima = null;
      p.espera = sorteoEntre(PASEO.espera);
      o.dirOcio = o.casa.dir;         // de vuelta en su lugar, mirando la casa
    }
    return;
  }

  if (frenado) return;
  p.espera -= dt;
  if (p.espera > 0) return;

  /* Ya está de vuelta en su lugar: cierra el paseo. Normalmente esto lo
     resuelve el final del paso (arriba), pero dejarlo también acá es lo que
     hace que no pueda quedar trabado en "volviendo" estando en su casilla —
     que es un Diego que no vuelve a salir nunca más, y desde afuera se ve
     igual que si el paseo no existiera. */
  if (p.volviendo && o.x === o.casa.x && o.y === o.casa.y) {
    p.volviendo = false; p.pasos = 0; p.ultima = null;
    p.espera = sorteoEntre(PASEO.espera);
    o.dirOcio = o.casa.dir;
    return;
  }

  // Parado en su casilla y sin paseo en curso: éste es el que arranca uno.
  if (!p.volviendo && p.pasos <= 0) p.pasos = Math.round(sorteoEntre(PASEO.pasos));

  const c = p.volviendo ? pasoACasa(o) : pasoAlAzar(o);
  if (!c) {
    // Sin salida (no pasa hoy: el jardín está abierto). Si estaba de paseo,
    // encara la vuelta; si tampoco puede volver, espera y prueba de nuevo.
    if (!p.volviendo) { p.volviendo = true; p.pasos = 0; }
    p.espera = sorteoEntre(PASEO.respiro);
    return;
  }
  if (!p.volviendo && --p.pasos <= 0) p.volviendo = true;
  arrancarPasoPaseo(o, c);
}

function sorteoOcio() {
  return OCIO_MIN_MS + Math.random() * (OCIO_MAX_MS - OCIO_MIN_MS);
}

/* Un personaje del mapa (por ahora Diego) usa la hoja de cuadros de 24x32 y la
   misma escala x3 que la jugadora, no el arte por codigo de los objetos. Si se
   dibujara con la ruta normal quedaria mas bajo y mas flaco parado al lado. */
function dibujarPersonaje(hoja, o) {
  const w = FRAME_W * ESC_JUG, h = FRAME_H * ESC_JUG;
  /* Por píxeles y no por casilla: mientras pasea está a mitad de camino entre
     dos, igual que la jugadora. Un personaje que no camina no tiene `px`, y
     ahí su casilla es su posición. */
  const ox = o.px === undefined ? o.x * TILE : o.px;
  const oy = o.py === undefined ? o.y * TILE : o.py;
  const cx = ox - cam.x + TILE / 2;
  const dx = Math.round(cx - w / 2);
  const dy = Math.round(oy - cam.y + TILE - PIES * ESC_JUG - 3);

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(Math.round(cx), Math.round(oy - cam.y + TILE - 5), 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bailando manda la coreografía: ella decide la fila y el cuadro, así que no
  // hay que mirar hacia dónde está parada. Sin la hoja del baile cargada se
  // sigue dibujando quieto, como cualquier otra cosa que no llegó.
  if (o.bailando && hojaDiegoBaile) {
    const paso = pasoBaile(o.baileCoreo || 0, o.tBaile || 0);
    ctx.drawImage(hojaDiegoBaile, paso.col * FRAME_W, paso.fila * FRAME_H,
      FRAME_W, FRAME_H, dx, dy, w, h);
    return;
  }

  const dir = dirHaciaJugadora(o);

  /* La caminata usa los mismos cuatro cuadros y el mismo alternado de pie que
     la jugadora (dibujarJugadora): las dos hojas comparten grilla. */
  let f = 0;
  const p = o.paseo;
  if (p && p.moviendo) {
    const t = p.t / PASEO.pasoMs;
    f = t < 0.5 ? (p.paso ? 3 : 1) : (p.paso ? 2 : 0);
  }

  if (hoja) ctx.drawImage(hoja, f * FRAME_W, dir * FRAME_H, FRAME_W, FRAME_H, dx, dy, w, h);
}

/* Huevo del jardín: bambolea quieto en el mapa, y cuando accionCompanero()
   lo eclosiona (animarEclosionHuevo) reproduce la grieta -> estallido una
   sola vez. Terminada esa secuencia, o directo si se recarga la página con
   EST.eclosionado ya en true, se queda en el último cuadro (cáscara rota)
   para siempre. */
function dibujarHuevo(o, dx, dy, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(dx + w / 2, dy + h - 5, w * 0.36, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!hojaHuevo) return;

  let frame;
  if (huevoAnim.activa) {
    const idx = Math.min(HUEVO_HATCH.length - 1, Math.floor(huevoAnim.t / HUEVO_HATCH_MS));
    frame = HUEVO_HATCH[idx];
  } else if (juego.estado().eclosionado) {
    frame = HUEVO_HATCH[HUEVO_HATCH.length - 1];
  } else {
    const idx = Math.floor(tiempoAnim / HUEVO_IDLE_MS) % HUEVO_IDLE.length;
    frame = HUEVO_IDLE[idx];
  }

  // los cuadros no vienen todos del mismo tamaño (hoja empaquetada, no
  // grilla uniforme): se escalan por altura y se anclan centrados abajo,
  // así el huevo se apoya siempre en el mismo lugar de la casilla.
  const boxH = h * 1.35;
  const esc = boxH / frame.h;
  const dw = frame.w * esc, dh = frame.h * esc;
  const ddx = Math.round(dx + w / 2 - dw / 2);
  const ddy = Math.round(dy + h - dh);
  ctx.drawImage(hojaHuevo, frame.x, frame.y, frame.w, frame.h, ddx, ddy, dw, dh);
}

function dibujarObjeto(o) {
  if (o.personaje) { dibujarPersonaje(hojaDiego, o); return; }
  const dx = Math.round(o.x * TILE - cam.x);
  const dy = Math.round(o.y * TILE - cam.y);
  const w = o.tw * TILE, h = o.th * TILE;

  if (o.art === 'huevo') {
    dibujarHuevo(o, dx, dy, w, h);
  } else {
    const img = SPR[o.art];
    if (!o.decor && !o.pared) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(dx + w / 2, dy + h - 5, w * 0.36, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.drawImage(img, dx, dy, w, h);
    if (o.art === 'tvpared') dibujarPantallaTele(dx, dy);
  }

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
      (o.accion === 'companero' && juego.puedeEclosionar()) ||
      (o.accion === 'medicinas' && juego.medicinaPendiente());
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

/* El halo, centrado en el cuerpo de Kath. Va con 'lighter' porque es luz que
   ella emite: sobre el piso oscuro del cuarto y sobre el césped se suma en vez
   de tapar, que es lo que hace que se lea como resplandor y no como una mancha. */
function dibujarAura(cx, cy) {
  const est = juego.estado();
  const nivel = est.nivel || 1;
  const progreso = Math.min(1, (est.xp || 0) / xpNecesaria(nivel));
  const [r, g, b] = AURA_COLORES[(nivel - 1) % AURA_COLORES.length];

  const pulso = 1 + Math.sin((tiempoAnim / AURA.pulsoMs) * Math.PI * 2) * AURA.pulso;
  let radio = (AURA.rMin + (AURA.rMax - AURA.rMin) * progreso) * pulso;
  let alfa = AURA.alfa * (AURA.alfaMin + (1 - AURA.alfaMin) * progreso);

  // El estallido pisa al halo de siempre: sale del tamaño que tenía, se abre y
  // se apaga. Se toma el máximo para que el halo no lo achique sobre el final.
  if (auraEstallido > 0) {
    const p = 1 - auraEstallido / AURA.estalloMs;   // 0 recién subido -> 1 apagado
    radio = radio * (1 + (AURA.estalloR - 1) * p);
    alfa = Math.max(alfa, AURA.estalloAlfa * (1 - p));
  }
  // Recién subida de nivel la barra vuelve a cero y el aura se apaga del todo:
  // esta salida es la que hace que "sin XP" sea nada, no un halo mínimo.
  if (alfa <= 0.01) return;

  // Lo más brillante no va en el centro sino en `brillo`, más o menos donde
  // termina la silueta: el centro queda tapado por ella y lo que se ve es el
  // anillo de afuera, así que ahí es donde conviene poner la luz.
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radio);
  grad.addColorStop(0, `rgba(${r},${g},${b},${alfa * 0.8})`);
  grad.addColorStop(AURA.brillo, `rgba(${r},${g},${b},${alfa})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radio, radio * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function dibujarJugadora() {
  const w = FRAME_W * ESC_JUG, h = FRAME_H * ESC_JUG;
  const dx = Math.round(jugadora.px - cam.x + TILE / 2 - w / 2);
  /* El sprite sobresale una fila de origen (3 px) por debajo de la casilla: los
     pies están en la fila 30 de 32. Parada eso no se ve —es la sombra—, pero
     sentada en el sillón esos 3 px son la punta de las patas de la silla que
     trae el sprite, y asoman por debajo del respaldo que tendría que taparla.
     Subirla esos 3 px la mete entera adentro del mueble. */
  const hundir = jugadora.asiento && jugadora.asiento.mueble.tapa ? ESC_JUG : 0;
  const dy = Math.round(jugadora.py - cam.y + TILE - PIES * ESC_JUG - 3) - hundir;

  // detrás de todo lo suyo: primero el aura, después la sombra y el sprite
  dibujarAura(dx + w / 2, dy + h * 0.5);

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(Math.round(jugadora.px - cam.x + TILE / 2), Math.round(jugadora.py - cam.y + TILE - 5),
    15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  let f = 0, fila = jugadora.dir;
  let hoja = hojaSprite;
  if (jugadora.asiento && hojaSentada) {
    hoja = hojaSentada;
    f = Math.floor(jugadora.tSentada / SENTADA_MS) % SENTADA.cuadros;
  } else if (jugadora.bailando && hojaBaile) {
    hoja = hojaBaile;
    const paso = pasoBaile(jugadora.baileCoreo, jugadora.tBaile);
    f = paso.col;
    fila = paso.fila;
  } else if (jugadora.moviendo) {
    const p = jugadora.t / MOV_MS;
    f = p < 0.5 ? (jugadora.paso ? 3 : 1) : (jugadora.paso ? 2 : 0);
  }
  // El accesorio se parte en dos: lo que va detrás (orejas y antenas, que el
  // pelo tiene que taparles la base, y la capa asomando por los costados)
  // antes del sprite, y lo que va delante (el moño, que se apoya SOBRE el
  // pelo, y la capa vista de espaldas) después.
  const puesto = juego.estado().disfrazPuesto;
  const disfraz = SPR_DISFRAZ[puesto];
  // SPR_DISFRAZ trae SIEMPRE cuatro cuadros por direccion (los accesorios que
  // no se animan repiten el mismo lienzo), asi que aca no hay que preguntar.
  const capas = disfraz ? disfraz[fila][f] : null;
  // El accesorio no tiene un dibujo por cuadro: se corre unos pocos pixeles
  // segun el cuadro para que se bambolee al caminar y al bailar (BAMBOLEO en
  // disfraces.js). Quieta, el corrimiento es cero.
  const vaiven = bamboleoDisfraz(puesto, f);
  if (capas && capas.atras) dibujarCapaDisfraz(capas.atras, dx, dy, vaiven);

  if (hoja) {
    ctx.drawImage(hoja, f * FRAME_W, fila * FRAME_H, FRAME_W, FRAME_H, dx, dy, w, h);
  } else {
    ctx.fillStyle = '#f06292';
    ctx.fillRect(dx + 12, dy + 20, 26, 34);
  }

  if (capas && capas.adelante) dibujarCapaDisfraz(capas.adelante, dx, dy, vaiven);
  dibujarDestellos(puesto, fila, dx, dy);
}

/* Los brillitos de la corona. Van con el reloj del motor y no con el cuadro de
   animacion, para que titilen igual parada (ver DESTELLOS en disfraces.js).

   Cada uno es una cruz de 4 puntas que crece y se apaga. La mitad del ciclo la
   pasa apagada a proposito: encendida todo el tiempo deja de leerse como
   destello y pasa a ser un adorno mas de la corona. */
const DESTELLO_MS = 1500;
const DESTELLO_COLOR = '#fffdf0';

function dibujarDestellos(id, fila, dx, dy) {
  const lista = destellosDisfraz(id, fila);
  if (!lista) return;

  const e = ESC_JUG;
  for (const [px, py, fase] of lista) {
    const v = Math.sin((((tiempoAnim / DESTELLO_MS) + fase) % 1) * Math.PI * 2);
    if (v <= 0.08) continue;                 // apagado la mitad del ciclo
    const brazo = v > 0.72 ? 2 : (v > 0.34 ? 1 : 0);

    const bx = dx + px * e, by = dy + py * e;
    ctx.globalAlpha = Math.min(1, v * 1.4);
    ctx.fillStyle = DESTELLO_COLOR;
    ctx.fillRect(bx, by, e, e);
    if (brazo) {
      ctx.fillRect(bx - brazo * e, by, brazo * e, e);
      ctx.fillRect(bx + e, by, brazo * e, e);
      ctx.fillRect(bx, by - brazo * e, e, brazo * e);
      ctx.fillRect(bx, by + e, e, brazo * e);
    }
    ctx.globalAlpha = 1;
  }
}

/* El lienzo del accesorio es ALTO_EXTRA filas más alto que el cuadro, para que
   las orejas y las antenas puedan salirse por arriba (ver engine/disfraces.js).
   Se sube otro tanto al dibujarlo, así el resto cae justo sobre el sprite. */
function dibujarCapaDisfraz(img, dx, dy, vaiven = [0, 0]) {
  ctx.drawImage(img,
    dx + (vaiven[0] - ANCHO_EXTRA) * ESC_JUG, dy + (vaiven[1] - ALTO_EXTRA) * ESC_JUG,
    (FRAME_W + ANCHO_EXTRA * 2) * ESC_JUG, (FRAME_H + ALTO_EXTRA) * ESC_JUG);
}

/* El compañero usa la fila de su dirección tal cual (la hoja trae las cuatro
   dibujadas de verdad, no un espejo) y el cuadro del ciclo de caminata.
   Quieto se congela en el primero, igual que Merlí. */
function dibujarBicho() {
  const et = juego.etapaBicho();
  if (et < 0) return;
  const cx = Math.round(bicho.px - cam.x + TILE / 2);
  const suelo = Math.round(bicho.py - cam.y + TILE * 0.85);

  if (!COMPANERO_SPR) return;
  const cuadros = COMPANERO_SPR[Math.min(et, COMPANERO_SPR.length - 1)][bicho.dir];
  const cuadro = cuadros[Math.floor(bicho.tAnim / BICHO_ANIM_MS) % cuadros.length];
  const dw = cuadro.width, dh = cuadro.height;

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, suelo, dw * 0.36, Math.max(3, dw * 0.13), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.drawImage(cuadro, Math.round(cx - dw / 2), Math.round(suelo - dh));
}

/* A diferencia del bicho, la hoja de Merlí trae las 4 direcciones dibujadas de
   verdad (no un espejo): la fila es `dir` directo, la columna es el cuadro de
   la caminata. Quieto se queda en el primero — los cuadros laterales son un
   ciclo de pasos, así que animarlos parada se vería como caminar en el lugar.
   Sin la hoja cargada no se dibuja nada, igual que Diego. */
function dibujarMerli() {
  if (!hojaMerli) return;
  const w = MERLI_FRAME_W, h = MERLI_FRAME_H;   // 1:1, sin reescalar
  const dx = Math.round(merli.px - cam.x + TILE / 2 - w / 2);
  const dy = Math.round(merli.py - cam.y + TILE - h - 4);

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(dx + w / 2, dy + h + 1, w * 0.3, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const f = merli.moviendo
    ? Math.floor(merli.tAnim / MERLI_CUADRO_MS) % MERLI_CUADROS
    : 0;
  ctx.drawImage(hojaMerli, f * MERLI_FRAME_W, merli.dir * MERLI_FRAME_H, MERLI_FRAME_W, MERLI_FRAME_H, dx, dy, w, h);
}

/* ---------------------------------------------------------------------------
 *  DÍA Y NOCHE
 *
 *  La casa se oscurece y se aclara con la hora REAL del teléfono: si Kath juega
 *  a las once de la noche, el jardín está de noche. No hay reloj propio del
 *  juego ni un ciclo acelerado a propósito — la gracia es que el juego esté a
 *  la misma hora que ella.
 *
 *  Antes esto eran cuatro baldes de color con saltos secos (a las 21:00 la casa
 *  se apagaba de golpe). Ahora es una tabla de momentos del día y el color sale
 *  interpolado entre los dos que rodean a la hora actual, así que el cambio es
 *  continuo: a las 18:40 el atardecer ya empezó, apenas.
 *
 *  Los momentos van en horas con decimales (6.5 = 06:30) y la tabla cierra el
 *  círculo: la última entrada es la hora 24, igual a la de la hora 0.
 * ------------------------------------------------------------------------- */
const LUZ = [
  { h: 0,    r: 24,  g: 34,  b: 92,  a: 0.44 },   // noche cerrada
  { h: 5,    r: 24,  g: 34,  b: 92,  a: 0.42 },
  { h: 6.5,  r: 96,  g: 70,  b: 130, a: 0.30 },   // clarea, violeta
  { h: 8,    r: 255, g: 198, b: 120, a: 0.13 },   // amanecer tibio
  { h: 10,   r: 255, g: 255, b: 255, a: 0    },   // día pleno: sin tinte
  { h: 17,   r: 255, g: 255, b: 255, a: 0    },
  { h: 19,   r: 255, g: 146, b: 78,  a: 0.18 },   // atardecer
  { h: 20.5, r: 132, g: 76,  b: 116, a: 0.32 },   // crepúsculo
  { h: 22,   r: 24,  g: 34,  b: 92,  a: 0.44 },   // ya es de noche
  { h: 24,   r: 24,  g: 34,  b: 92,  a: 0.44 },   // cierra el círculo con la 0
];

/* Adentro de la casa hay luz prendida, así que la noche pega menos. No es
   realismo: es que si adentro estuviera igual de oscuro que el jardín, hacer
   una misión a la noche sería jugar a oscuras.

   Se mira la casilla donde está Kath y no la que se ve en pantalla: el tinte es
   uno solo para todo el cuadro, y partirlo por zona sería iluminar por tile, que
   es otro trabajo entero para algo que casi no se ve (la casa se ve casi
   siempre completa). */
const TECHADO = new Set(['#', ',', 'T', 'K', '.', 'D']);
const LUZ_ADENTRO = 0.42;      // cuánto del tinte de afuera queda adentro

function estaAdentro(tx, ty) {
  const fila = MAPA[ty];
  return !!fila && TECHADO.has(fila[tx]);
}

/* El color del ambiente a una hora dada. Separado del dibujo para poder
   probarlo: recibe la fecha y si está bajo techo, y no toca el canvas. */
function luzAmbiente(fecha, adentro) {
  const d = fecha || new Date();
  const h = d.getHours() + d.getMinutes() / 60;

  let i = 0;
  while (i < LUZ.length - 2 && LUZ[i + 1].h <= h) i++;
  const a = LUZ[i], b = LUZ[i + 1];
  const t = b.h === a.h ? 0 : (h - a.h) / (b.h - a.h);
  const entre = (x, y) => x + (y - x) * t;

  return {
    r: Math.round(entre(a.r, b.r)),
    g: Math.round(entre(a.g, b.g)),
    b: Math.round(entre(a.b, b.b)),
    a: entre(a.a, b.a) * (adentro ? LUZ_ADENTRO : 1),
  };
}

function aplicarLuzAmbiente() {
  const luz = luzAmbiente(null, estaAdentro(jugadora.tx, jugadora.ty));
  if (luz.a < 0.01) return;                       // mediodía: no se pinta nada
  ctx.fillStyle = `rgba(${luz.r},${luz.g},${luz.b},${luz.a.toFixed(3)})`;
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
    cargarImagen(SPRITE_BAILE),
    cargarImagen(SPRITE_SENTADA),
    cargarImagen(VIDEO_TELE),
    FLAGS.diego ? cargarImagen(SPRITE_DIEGO) : Promise.resolve(null),
    FLAGS.diego ? cargarImagen(SPRITE_DIEGO_BAILE) : Promise.resolve(null),
    cargarImagen(SPRITE_MERLI),
    cargarImagen(SPRITE_HUEVO),
    cargarImagen(SPRITE_COMPANERO),
  ]).then(([sp, bl, st, tv, dg, dgb, mr, hv, cp]) => {
    hojaSprite = sp; hojaBaile = bl; hojaSentada = st; hojaTele = tv;
    hojaDiego = dg; hojaDiegoBaile = dgb;
    hojaMerli = mr; hojaHuevo = hv; hojaCompanero = cp;
    construirBicho();
    listo();
  });
}

let ultimo = 0;
function bucle(ts) {
  const dt = Math.min(50, ts - ultimo || 16);
  ultimo = ts;
  actualizarJugadora(dt);
  actualizarPersonajes(dt);
  actualizarBicho(dt);
  actualizarMerli(dt);
  actualizarHuevo(dt);
  actualizarAura(dt);
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
  jugadora, bicho, merli, input,
  construirMundo, tilePasable, objetoFrente, objetoEnTile, dirHaciaJugadora,
  ajustarCanvas, actualizarCamara, actualizarJugadora, actualizarBicho, actualizarMerli,
  actualizarPersonajes,
  actualizarAura, auraActiva, actualizarHuevo,
  registrarCola, dibujar, bailar, BAILE, luzAmbiente,
  sentarse, levantarse, estaSentada, sentadaEnCompu,
  moverObjetoTile,
  animarEclosionHuevo,
};
