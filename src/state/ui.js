import { crearStore } from './store.js';

/* ---------------------------------------------------------------------------
 *  Estado de la interfaz: qué se está mostrando en pantalla.
 *
 *  modo:
 *    titulo   la portada, antes de empezar
 *    juego    se puede caminar
 *    dialogo  hay un cuadro de texto abierto
 *    menu     el overlay con las pestañas
 *
 *  El motor lo consulta con juegoActivo() para frenar el movimiento; los
 *  componentes se enganchan al store para mostrarse o esconderse.
 * ------------------------------------------------------------------------- */
const store = crearStore();

let modo = 'titulo';
let pestana = 'misiones';
let flotantes = [];      // [{ id, texto }] textos de recompensa que suben y se van
let flashes = 0;         // contador: cada incremento dispara un destello blanco
let banner = null;       // { id, texto } cartelito arriba a la derecha, o null
let proximoId = 1;

function getModo() { return modo; }

function setModo(m) {
  if (modo === m) return;
  modo = m;
  store.avisar();
}

function juegoActivo() { return modo === 'juego'; }

/* --- menú ----------------------------------------------------------------- */
function getPestana() { return pestana; }

function setPestana(p) {
  if (pestana === p) return;
  pestana = p;
  store.avisar();
}

/* --- efectos -------------------------------------------------------------- */
function getFlotantes() { return flotantes; }
function getFlashes() { return flashes; }

/* El flotante se borra solo: el componente no tiene que acordarse de limpiarlo.
   1400 ms es lo que dura la animación .flotante en App.css. */
function mostrarRecompensa(xp, oro) {
  const id = proximoId++;
  flotantes = [...flotantes, { id, texto: `+${xp} XP  +${oro}💰` }];
  store.avisar();
  setTimeout(() => {
    flotantes = flotantes.filter((f) => f.id !== id);
    store.avisar();
  }, 1400);
}

function dispararFlash() {
  flashes++;
  store.avisar();
}

/* Cartelito chico arriba a la derecha, que aparece solo y se va solo: no pide
   ningún toque ni frena el juego (a diferencia de dialogo(), que sí lo hace).
   Sirve para avisos que no necesitan explicación, como "hay algo nuevo". */
function getBanner() { return banner; }

function mostrarBanner(texto, ms = 4000) {
  const id = proximoId++;
  banner = { id, texto };
  store.avisar();
  setTimeout(() => {
    if (banner && banner.id === id) { banner = null; store.avisar(); }
  }, ms);
}

export {
  getModo, setModo, juegoActivo,
  getPestana, setPestana,
  getFlotantes, getFlashes, mostrarRecompensa, dispararFlash,
  getBanner, mostrarBanner,
};
export const suscribir = store.suscribir;
export const version = store.version;
