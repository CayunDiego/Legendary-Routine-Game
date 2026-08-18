import { crearStore } from './store.js';

/* ---------------------------------------------------------------------------
 *  Guardado local. Es el único módulo que toca localStorage.
 *
 *  Antes esto eran dos líneas dentro de gameLogic.js, y tenían un agujero que
 *  costaba la partida entera: si el JSON guardado se corrompía, cargar() hacía
 *  EST = EST_INICIAL() y seguía como si nada. El primer guardar() posterior
 *  pisaba la partida buena con la vacía. Silencioso e irreversible.
 *
 *  Las tres reglas de acá salen de ese bug:
 *
 *    1. Se guardan DOS copias. Antes de pisar la principal, la que estaba se
 *       mueve a la de respaldo. Una escritura cortada a la mitad se come la
 *       principal, nunca las dos.
 *    2. Si no se puede leer NINGUNA de las dos, no se escribe más. Se levanta
 *       el cerrojo y la interfaz avisa. Preferimos un juego que no guarda a un
 *       juego que borra.
 *    3. Nada falla en silencio. Todo error queda en salud() para que Ajustes
 *       lo muestre.
 * ------------------------------------------------------------------------- */

const CLAVE = 'rutina_legendaria_v1';
const CLAVE_BAK = 'rutina_legendaria_v1_bak';
const CLAVE_DISPOSITIVO = 'rutina_legendaria_dispositivo';
const CLAVE_CODIGO = 'rutina_legendaria_codigo';

const store = crearStore();

/* Cerrojo de la regla 2. Una vez levantado no se baja solo: hace falta que la
   jugadora restaure una copia o empiece de cero, las dos cosas explícitas. */
let bloqueado = false;
let estadoSalud = { ok: true, motivo: null, detalle: null };

function salud() { return estadoSalud; }

function marcar(ok, motivo, detalle) {
  estadoSalud = { ok, motivo: motivo || null, detalle: detalle || null };
  store.avisar();
}

/* --- acceso crudo a localStorage ----------------------------------------- */
/* Safari en modo privado tira SecurityError con sólo tocar localStorage, así
   que hasta la lectura va envuelta. */
function leerCrudo(clave) {
  try { return localStorage.getItem(clave); } catch { return null; }
}

function escribirCrudo(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
    return null;
  } catch (e) {
    return e;
  }
}

function borrarCrudo(clave) {
  try { localStorage.removeItem(clave); } catch { /* nada que hacer */ }
}

/* --- validación ----------------------------------------------------------- */
/* No valida el juego entero: sólo lo suficiente para distinguir "una partida"
   de "basura". Si esto pasa, las migraciones y los valores por defecto se
   encargan del resto. */
function esPartida(o) {
  return !!o
    && typeof o === 'object'
    && !Array.isArray(o)
    && typeof o.v === 'number'
    && typeof o.nivel === 'number' && o.nivel >= 1
    && typeof o.xp === 'number'
    && typeof o.hoy === 'object' && o.hoy !== null;
}

function parsear(raw) {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    return esPartida(o) ? o : null;
  } catch {
    return null;
  }
}

/* --- lectura -------------------------------------------------------------- */
/* Devuelve de dónde salió la partida además de la partida misma, porque no es
   lo mismo "no había nada" (jugadora nueva) que "la principal estaba rota"
   (hay que avisar que se recuperó del respaldo). */
function leer() {
  const crudoPrincipal = leerCrudo(CLAVE);
  const crudoBak = leerCrudo(CLAVE_BAK);

  const principal = parsear(crudoPrincipal);
  if (principal) {
    marcar(true);
    return { partida: principal, origen: 'principal' };
  }

  const bak = parsear(crudoBak);
  if (bak) {
    // La principal estaba rota pero el respaldo sirve. Se puede seguir
    // jugando y guardando: la próxima escritura arregla la principal.
    marcar(true, 'recuperado', 'La partida principal estaba dañada y se recuperó del respaldo.');
    return { partida: bak, origen: 'copia' };
  }

  // Nada en ninguna de las dos. Distinguir vacío de roto es lo que decide si
  // se puede escribir: una jugadora nueva sí, una partida ilegible no.
  const habiaAlgo = !!(crudoPrincipal || crudoBak);
  if (habiaAlgo) {
    bloqueado = true;
    marcar(false, 'ilegible',
      'Había una partida guardada pero no se puede leer. El juego no va a guardar nada para no pisarla. Restaurá una copia desde Ajustes.');
    return { partida: null, origen: 'roto' };
  }

  marcar(true);
  return { partida: null, origen: 'nada' };
}

/* --- escritura ------------------------------------------------------------ */
/* Devuelve true/false en vez de tragarse el error: guardar() en gameLogic.js lo
   usa para que la interfaz pueda mostrar "no se pudo guardar". */
function escribir(partida) {
  if (bloqueado) return false;

  let texto;
  try {
    texto = JSON.stringify(partida);
  } catch (e) {
    marcar(false, 'serializar', 'La partida tiene algo que no se puede guardar: ' + e.message);
    return false;
  }

  // Respaldo primero. Sólo se respalda lo que se puede leer: copiar una
  // principal rota encima del respaldo bueno sería perder las dos.
  const anterior = leerCrudo(CLAVE);
  if (anterior && anterior !== texto && parsear(anterior)) {
    escribirCrudo(CLAVE_BAK, anterior);
  }

  const err = escribirCrudo(CLAVE, texto);
  if (err) {
    const lleno = err.name === 'QuotaExceededError'
      || err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      || err.code === 22;
    marcar(false, lleno ? 'lleno' : 'escritura',
      lleno
        ? 'No entra más en el almacenamiento del navegador. Descargá una copia desde Ajustes.'
        : 'El navegador no deja guardar (' + err.name + '). Puede ser el modo privado.');
    return false;
  }

  marcar(true);
  return true;
}

/* Lo usa "Empezar de cero" y también la restauración de una copia: las dos
   necesitan sacar el cerrojo de la regla 2. */
function borrarTodo() {
  borrarCrudo(CLAVE);
  borrarCrudo(CLAVE_BAK);
  bloqueado = false;
  marcar(true);
}

function desbloquear() {
  bloqueado = false;
  marcar(true);
}

function estaBloqueado() { return bloqueado; }

/* --- huella --------------------------------------------------------------- */
/* Resume una partida en un texto que cambia sólo si cambió algo que valga la
   pena guardar. Es lo que permite no escribir a disco ni salir a la red cuando
   Kath abre el menú, mira la tele y lo cierra: nada de eso toca el progreso.
 *
 *  Se saltean los tres campos que suben en CADA guardado por definición. Si
 *  entraran, la huella sería siempre distinta y no serviría para nada. */
const CLAVES_VOLATILES = new Set(['seq', 'guardadoEn', 'escritoPor']);

/* JSON.stringify normal depende del orden en que se crearon las claves, y
   `hoy` va sumando misiones en el orden en que Kath las hace — así que dos
   partidas iguales fusionadas desde dispositivos distintos darían textos
   distintos. Ordenar las claves lo vuelve comparable de verdad. */
function estable(v, omitir) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return '[' + v.map((x) => estable(x, null)).join(',') + ']';
  return '{' + Object.keys(v)
    .filter((k) => !(omitir && omitir.has(k)))
    .sort()
    .map((k) => JSON.stringify(k) + ':' + estable(v[k], null))
    .join(',') + '}';
}

/* `omitir` se aplica sólo en el primer nivel, que es donde viven los tres
   campos volátiles. Un `seq` adentro de otra cosa sería otra cosa. */
function huella(estado) {
  return estable(estado, CLAVES_VOLATILES);
}

/* --- identidad ------------------------------------------------------------ */
/* crypto.randomUUID no existe en Safari anterior a 15.4 y el juego se usa en
   teléfonos viejos, así que hay plan B. */
function uuid() {
  try {
    if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* sigue abajo */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/* Identifica al teléfono, no a la partida. Sirve para saber quién escribió
   último cuando se fusionan dos dispositivos. Nunca viaja como secreto. */
function idDispositivo() {
  let id = leerCrudo(CLAVE_DISPOSITIVO);
  if (!id) {
    id = uuid().slice(0, 8);
    escribirCrudo(CLAVE_DISPOSITIVO, id);
  }
  return id;
}

/* --- código de partida ---------------------------------------------------- */
/* Es el nombre de la partida en la nube Y la llave para abrirla: quien lo tiene
   puede leerla y escribirla. Por eso son 100 bits de azar y no algo lindo.
   El alfabeto se saltea 0/O/1/I/L para que se pueda dictar por teléfono. */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LARGO_CODIGO = 20;

function generarCodigo() {
  const n = new Uint8Array(LARGO_CODIGO);
  try {
    crypto.getRandomValues(n);
  } catch {
    for (let i = 0; i < LARGO_CODIGO; i++) n[i] = Math.floor(Math.random() * 256);
  }
  let s = '';
  for (let i = 0; i < LARGO_CODIGO; i++) s += ALFABETO[n[i] % ALFABETO.length];
  return s;
}

/* Se muestra en grupos de 5 y se guarda pelado, así copiar y pegar con o sin
   guiones da lo mismo. */
function formatearCodigo(c) {
  return (c || '').replace(/(.{5})(?=.)/g, '$1-');
}

function normalizarCodigo(c) {
  return (c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function codigoValido(c) {
  const n = normalizarCodigo(c);
  return n.length === LARGO_CODIGO && [...n].every((ch) => ALFABETO.includes(ch));
}

function getCodigo() {
  return leerCrudo(CLAVE_CODIGO) || '';
}

/* Se crea recién cuando alguien lo necesita (o sea, cuando la nube está
   configurada). Un juego sin nube nunca genera código. */
function asegurarCodigo() {
  let c = getCodigo();
  if (!codigoValido(c)) {
    c = generarCodigo();
    escribirCrudo(CLAVE_CODIGO, c);
    store.avisar();
  }
  return c;
}

function setCodigo(c) {
  const n = normalizarCodigo(c);
  if (!codigoValido(n)) return false;
  escribirCrudo(CLAVE_CODIGO, n);
  store.avisar();
  return true;
}

/* --- permanencia ---------------------------------------------------------- */
/* Sin esto el navegador puede borrar localStorage solo cuando le falta espacio.
   Con el juego instalado en la pantalla de inicio suele conceder sin preguntar.
   Si dice que no, no pasa nada malo: seguimos igual que antes. */
let permanente = null;

async function pedirPermanencia() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return null;
    permanente = await navigator.storage.persisted()
      ? true
      : await navigator.storage.persist();
    store.avisar();
    return permanente;
  } catch {
    return null;
  }
}

function esPermanente() { return permanente; }

export {
  CLAVE, CLAVE_BAK, CLAVE_CODIGO, CLAVE_DISPOSITIVO,
  leer, escribir, borrarTodo, desbloquear, estaBloqueado,
  salud, esPartida, huella,
  uuid, idDispositivo,
  getCodigo, setCodigo, asegurarCodigo, generarCodigo,
  formatearCodigo, normalizarCodigo, codigoValido, LARGO_CODIGO,
  pedirPermanencia, esPermanente,
};
export const suscribir = store.suscribir;
export const version = store.version;
