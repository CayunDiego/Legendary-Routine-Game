import { crearStore } from './store.js';
import { getModo, setModo, dispararFlash } from './ui.js';
import { guardar } from './gameLogic.js';
import { sonar } from '../engine/sonido.js';
import { input } from '../engine/motor.js';

/* ---------------------------------------------------------------------------
 *  Cola de diálogos estilo Pokémon.
 *
 *  Antes esto escribía directo en #dlgTexto letra por letra. Ahora el texto
 *  visible es estado: el temporizador lo va alargando y avisa, y Dialogo.jsx
 *  lo dibuja. La máquina de estados es la misma del original.
 * ------------------------------------------------------------------------- */
const store = crearStore();

let cola = [];
let actual = null;
let escribiendo = false;
let textoCompleto = '';
let textoVisible = '';
let idxLetra = 0;
let tmrTexto = null;
let opcionSel = 0;
let modoAnterior = 'juego';

/* --- lectura para el componente ------------------------------------------ */
function getActual() { return actual; }
function getTextoVisible() { return textoVisible; }
function getEscribiendo() { return escribiendo; }
function getOpcionSel() { return opcionSel; }
function estaAbierto() { return getModo() === 'dialogo'; }

/* --- apertura ------------------------------------------------------------- */
function dialogo(items) {
  cola = items.slice();
  if (getModo() !== 'dialogo') modoAnterior = getModo();
  setModo('dialogo');
  siguienteDialogo();
}

function siguienteDialogo() {
  if (cola.length === 0) { cerrarDialogo(); return; }
  actual = cola.shift();
  if (actual.fanfarria) { sonar('nivel'); dispararFlash(); }
  textoCompleto = actual.t;
  textoVisible = '';
  idxLetra = 0;
  escribiendo = true;
  opcionSel = 0;
  clearInterval(tmrTexto);
  tmrTexto = setInterval(tecleo, 18);
  store.avisar();
}

/* --- máquina de escribir --------------------------------------------------- */
function tecleo() {
  if (idxLetra >= textoCompleto.length) { terminarTexto(); return; }
  const paso = 2;
  const trozo = textoCompleto.slice(idxLetra, idxLetra + paso);
  textoVisible += trozo;
  idxLetra += paso;
  if (idxLetra % 6 < paso && trozo.trim()) sonar('texto');
  store.avisar();
}

function terminarTexto() {
  clearInterval(tmrTexto);
  escribiendo = false;
  textoVisible = textoCompleto;
  opcionSel = 0;
  store.avisar();
}

/* --- opciones -------------------------------------------------------------- */
function marcarOpcion(i) {
  if (!actual || !actual.opciones) return;
  const n = actual.opciones.length;
  opcionSel = (i + n) % n;
  store.avisar();
}

function moverOpcion(paso) {
  if (!actual || !actual.opciones) return false;
  marcarOpcion(opcionSel + paso);
  sonar('menu');
  return true;
}

function elegirOpcion(i) {
  const op = actual && actual.opciones && actual.opciones[i];
  if (!op) return;
  sonar('menu');
  cerrarDialogo(true);
  op.cb();
}

function hayOpciones() {
  return getModo() === 'dialogo' && !escribiendo && actual && actual.opciones;
}

/* --- avance y cierre ------------------------------------------------------- */
function avanzarDialogo() {
  if (getModo() !== 'dialogo') return;
  if (escribiendo) { idxLetra = textoCompleto.length; terminarTexto(); return; }
  if (actual && actual.opciones) { elegirOpcion(opcionSel); return; }
  siguienteDialogo();
}

function cerrarDialogo(silencioso) {
  clearInterval(tmrTexto);
  cola = [];
  actual = null;
  escribiendo = false;
  textoVisible = '';
  setModo(modoAnterior === 'menu' ? 'menu' : 'juego');
  input.dir = -1;
  if (!silencioso) guardar();
  store.avisar();
}

/* Lo usa abrirMenu() para que al cerrar el diálogo se vuelva al menú. */
function setModoAnterior(m) { modoAnterior = m; }

export {
  dialogo, avanzarDialogo, cerrarDialogo,
  moverOpcion, elegirOpcion, marcarOpcion, hayOpciones,
  getActual, getTextoVisible, getEscribiendo, getOpcionSel, estaAbierto,
  setModoAnterior,
};
export const suscribir = store.suscribir;
export const version = store.version;
