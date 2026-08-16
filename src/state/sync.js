import { CONFIG } from '../config/config.js';
import { crearStore } from './store.js';
import { alGuardar, obtenerEstado, reemplazarEstado } from './gameLogic.js';
import { fusionar } from './fusion.js';
import * as disco from './persistencia.js';

/* ---------------------------------------------------------------------------
 *  Sincronización con la nube.
 *
 *  Tres decisiones que explican todo lo demás:
 *
 *  1. La partida local manda. El juego nunca espera a la red para nada: se
 *     dibuja, se juega y se guarda igual sin señal. La nube es una copia que
 *     se pone al día cuando puede. Si el Worker se cae, Kath no se entera.
 *
 *  2. La lógica de fusión vive acá, no en el servidor. El servidor no sabe qué
 *     es una misión ni cuánto cuesta un premio; guarda un texto. Eso lo deja
 *     tonto, barato y sin necesidad de actualizarlo cuando cambian las reglas
 *     del juego.
 *
 *  3. Se escribe con compare-and-swap. Cada PUT dice de qué versión partió; si
 *     el servidor ya tiene otra, contesta 409 con la suya, se vuelve a fusionar
 *     y se reintenta. Sin esto, dos dispositivos que guardan a la vez se pisan
 *     y uno pierde el día.
 * ------------------------------------------------------------------------- */

const store = crearStore();

/* 'apagado' — no hay URL configurada, el juego anda 100% local
   'inicial'  — todavía no se habló con el servidor
   'sync'     — hay una operación en curso
   'ok'       — al día
   'pendiente'— hay cambios locales sin subir (sin señal o con error)
   'error'    — el servidor contestó mal */
let estado = 'inicial';
let ultimoError = null;
let ultimaVez = 0;
let seqRemota = null;      // la versión que el servidor tenía la última vez
let huellaSubida = null;   // huella de lo último que el servidor confirmó
let hayPendiente = false;
let corriendo = false;
let tmrDebounce = null;
let desengancharGuardado = null;

const DEBOUNCE_MS = 4000;
const REINTENTOS_CAS = 4;
const TIMEOUT_MS = 12000;

function activa() { return !!CONFIG.nube; }

/* ¿Esta partida tiene algo que valga la pena mandar a la nube?
 *
 *  Abrir el juego ya alcanzaba para reclamar un código y subir una partida en
 *  blanco. Cada navegador nuevo — una prueba, un incógnito, el celular de
 *  alguien que lo quiso ver — dejaba una fila vacía en la base para siempre.
 *
 *  `primeraVez` se apaga apenas Kath toca "empezar", así que con sólo eso ya
 *  cuenta como que está jugando. Lo demás cubre el caso de una partida que
 *  llegó por una copia o por fusión sin haber pasado por la portada. */
function hayAlgoQueGuardar(e) {
  if (!e) return false;
  return !e.primeraVez
    || (Number(e.totalMisiones) || 0) > 0
    || (Number(e.oroGanado) || 0) > 0
    || (Number(e.nivel) || 1) > 1
    || (Number(e.xp) || 0) > 0
    || (e.historial || []).length > 0
    || (e.canjeados || []).length > 0
    || !!e.eclosionado
    || !!e.animoHoy;
}

function estadoSync() {
  return { estado, error: ultimoError, ultimaVez, pendiente: hayPendiente };
}

function marcar(e, err) {
  estado = e;
  ultimoError = err || null;
  if (e === 'ok') { ultimaVez = Date.now(); hayPendiente = false; }
  store.avisar();
}

/* --- transporte ----------------------------------------------------------- */
function url(codigo) {
  return CONFIG.nube.replace(/\/+$/, '') + '/partida/' + encodeURIComponent(codigo);
}

/* AbortSignal.timeout no está en Safari viejo, así que el timeout va a mano.
   Sin timeout, una red que acepta la conexión y no contesta nunca deja la
   sincronización colgada para siempre. */
async function pedir(recurso, opciones = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(recurso, { ...opciones, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function traer(codigo) {
  const r = await pedir(url(codigo), { method: 'GET', headers: { Accept: 'application/json' } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('El servidor contestó ' + r.status);
  return r.json();          // { estado, seq, actualizadoEn }
}

async function poner(codigo, partida, baseSeq, opciones = {}) {
  const r = await pedir(url(codigo), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Base-Seq': String(baseSeq ?? -1) },
    body: JSON.stringify({ estado: partida }),
    keepalive: !!opciones.keepalive,
  });
  if (r.status === 409) return { conflicto: true, remoto: await r.json() };
  if (!r.ok) throw new Error('El servidor contestó ' + r.status);
  return { conflicto: false, remoto: await r.json() };
}

/* --- operación principal --------------------------------------------------- */
/* Un solo camino para todo: bajar, fusionar, subir. Se usa igual al arrancar,
   al volver de segundo plano y después de cada guardado. Que sea el mismo
   código en los tres casos es lo que evita que se comporten distinto. */
async function sincronizar(opciones = {}) {
  if (!activa()) { marcar('apagado'); return false; }
  if (corriendo) { hayPendiente = true; store.avisar(); return false; }

  corriendo = true;
  marcar('sync');
  const codigo = disco.asegurarCodigo();

  try {
    let remoto = await traer(codigo);
    let base = remoto ? remoto.seq : -1;

    /* Nada guardado allá y nada que guardar acá: no se crea la partida todavía.
       El GET igual valía la pena — si el código estaba enlazado a otro
       dispositivo, lo que baje va a tener progreso y esto no frena nada. */
    if (!remoto && !hayAlgoQueGuardar(obtenerEstado())) {
      marcar('ok');
      return true;
    }

    for (let intento = 0; intento < REINTENTOS_CAS; intento++) {
      const local = obtenerEstado();
      const fusionado = remoto && remoto.estado ? fusionar(local, remoto.estado) : local;

      // Sólo se toca la partida local si la fusión trajo algo. Comparar el JSON
      // evita un reemplazo (y su guardado, y su re-render) por cada latido.
      if (remoto && remoto.estado && JSON.stringify(fusionado) !== JSON.stringify(local)) {
        reemplazarEstado(fusionado, { guardarTambien: true });
      }

      const aSubir = obtenerEstado();

      /* Si después de fusionar tenemos exactamente lo que el servidor ya tiene,
         no hay nada que contarle. Es el caso normal de volver al juego después
         de dejarlo en segundo plano: cuesta un GET en vez de un GET y un PUT.
         La huella ignora `seq`, que es justamente lo único que iba a diferir. */
      const huellaLocal = disco.huella(aSubir);
      if (remoto && remoto.estado && huellaLocal === disco.huella(remoto.estado)) {
        seqRemota = remoto.seq;
        huellaSubida = huellaLocal;
        marcar('ok');
        return true;
      }

      const r = await poner(codigo, aSubir, base, opciones);
      if (!r.conflicto) {
        seqRemota = r.remoto.seq;
        huellaSubida = huellaLocal;
        marcar('ok');
        return true;
      }
      // Alguien escribió en el medio: nos quedamos con lo suyo y volvemos a
      // fusionar contra eso.
      remoto = r.remoto;
      base = r.remoto.seq;
    }

    marcar('pendiente', 'No se pudo cerrar la sincronización: el otro dispositivo está escribiendo al mismo tiempo.');
    hayPendiente = true;
    return false;
  } catch (e) {
    hayPendiente = true;
    const caido = !navigator.onLine || e.name === 'AbortError' || e.name === 'TypeError';
    marcar(caido ? 'pendiente' : 'error',
      caido ? 'Sin conexión. El progreso está guardado en este dispositivo y se va a subir solo.' : e.message);
    return false;
  } finally {
    corriendo = false;
    store.avisar();
  }
}

/* --- disparadores ---------------------------------------------------------- */
/* No se sube en cada guardado: completar una misión dispara varios seguidos
   (la misión, el diálogo al cerrarse, el cambio de pestaña). Cuatro segundos
   junta todo eso en un viaje.

   Y si lo que hay ahora es lo mismo que el servidor ya confirmó, ni se agenda.
   Sin esto, cualquier guardado que no cambiara nada — o un guardado que sí
   cambió algo pero justo volvió a dejar la partida como estaba — nos hacía
   salir a la red para no decir nada. */
function pedirSincro() {
  if (!activa()) return;
  if (!hayAlgoQueGuardar(obtenerEstado())) return;
  if (huellaSubida !== null && disco.huella(obtenerEstado()) === huellaSubida) return;

  hayPendiente = true;
  store.avisar();
  clearTimeout(tmrDebounce);
  tmrDebounce = setTimeout(() => { sincronizar(); }, DEBOUNCE_MS);
}

function sincronizarYa() {
  clearTimeout(tmrDebounce);
  return sincronizar();
}

/* Cerrar la pestaña con algo sin subir es el caso más común de "lo perdí":
   keepalive deja que el navegador termine el envío aunque la página ya no
   esté. El cuerpo es de unos pocos kB, muy por debajo del límite de 64 kB. */
function empujarAlSalir() {
  if (!activa() || !hayPendiente || corriendo) return;
  clearTimeout(tmrDebounce);
  const codigo = disco.getCodigo();
  if (!codigo) return;
  poner(codigo, obtenerEstado(), seqRemota ?? -1, { keepalive: true }).catch(() => { });
}

function arrancar() {
  if (!activa()) { marcar('apagado'); return; }
  disco.asegurarCodigo();

  desengancharGuardado = alGuardar(() => pedirSincro());

  addEventListener('online', () => { sincronizarYa(); });
  addEventListener('offline', () => { marcar('pendiente', 'Sin conexión.'); });
  addEventListener('pagehide', empujarAlSalir);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sincronizarYa();
    else empujarAlSalir();
  });

  sincronizar();
}

function parar() {
  clearTimeout(tmrDebounce);
  if (desengancharGuardado) desengancharGuardado();
  desengancharGuardado = null;
}

/* --- cambiar de partida ---------------------------------------------------- */
/* Lo usa Ajustes cuando Kath pega el código del otro dispositivo. Se fusiona en
   vez de reemplazar: si este teléfono ya tenía progreso sin subir, se suma en
   lugar de desaparecer. */
async function conectarCon(codigo) {
  if (!disco.codigoValido(codigo)) throw new Error('Ese código no tiene la forma correcta.');
  if (!activa()) throw new Error('La sincronización no está configurada en esta versión del juego.');

  disco.setCodigo(codigo);
  // Otra partida: lo que sabíamos de la anterior no vale para esta.
  seqRemota = null;
  huellaSubida = null;
  const ok = await sincronizarYa();
  if (!ok && estado === 'error') throw new Error(ultimoError || 'No se pudo conectar.');
  return ok;
}

export {
  arrancar, parar, sincronizarYa, pedirSincro, conectarCon,
  estadoSync, activa, hayAlgoQueGuardar,
};
export const suscribir = store.suscribir;
export const version = store.version;
