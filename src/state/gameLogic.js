import { CONFIG } from '../config/config.js';
import { MISIONES } from '../config/misiones.js';
import { PREMIOS } from '../config/premios.js';
import { CARTAS } from '../config/cartas.js';
import { COMPANERO } from '../config/companero.js';
import { DISFRACES, PASOS_POR_HALLAZGO } from '../config/disfraces.js';
import { EXTRA } from '../config/extras.js';
import { crearStore } from './store.js';
import { xpNecesaria } from './niveles.js';
import * as disco from './persistencia.js';

/* Store al que se enganchan los componentes de React. Se avisa desde guardar(),
   que es por donde pasa toda mutación de EST (ver comentario más abajo). */
const store = crearStore();
const suscribir = store.suscribir;
const version = store.version;

/* ============================================================================
 *  LÓGICA DEL JUEGO — progreso, guardado, misiones, racha, compañero
 * ==========================================================================*/

const CLAVE_GUARDADO = disco.CLAVE;

/* Versión del formato de la partida. Si sube, hace falta una migración en
   MIGRACIONES que lleve de la anterior a esta. */
const V_ACTUAL = 3;

const EST_INICIAL = () => ({
  v: V_ACTUAL,
  dia: null,
  nivel: 1,
  xp: 0,
  oro: 0,
  oroGanado: 0,           // todo el oro ganado en la vida; la fusión lo necesita
  racha: 0,
  mejorRacha: 0,
  diasCompletos: 0,
  totalMisiones: 0,
  hoy: {},
  // Cuándo se completó cada vez de cada misión de hoy: { cama:[ts], agua:[ts,ts] }.
  // Va al lado de `hoy` y no adentro para no cambiarle el formato al contador
  // de siempre, que ya leen la fusión, el guardado y las copias viejas.
  hoyEn: {},
  animoHoy: null,
  historial: [],          // [{d:'2026-08-14', animo:'bien', hechas:6}]
  cartaVista: false,
  cartaIdx: -1,
  eclosionado: false,
  // Date.now() del momento en que nació la mascota. Lo usa el motor para
  // saber cuánto le queda a la cáscara rota en el jardín (HUEVO_DURA_MS).
  // En 0 la cáscara ya no se muestra: es lo que pasa con una partida que
  // eclosionó antes de que existiera este campo, y está bien — nació hace
  // rato.
  eclosionadoEn: 0,
  bichoNombre: null,
  disfraces: [],          // ids de config/disfraces.js ya encontrados
  disfrazPuesto: null,    // el que tiene puesto ahora, o null
  // [{cid, id, fecha, cumplidoEn}] — cumplidoEn es el día en que Kath marcó
  // que Diego se lo cumplió de verdad. Vacío = todavía lo está esperando.
  canjeados: [],
  /* Misiones secundarias: lo que Kath hizo por fuera de la lista y le contó a
     Diego. [{eid, dia, texto, ts, xp, oro}], las más nuevas primero. No se
     vacían al cambiar el día — son un registro, no el contador del día. */
  extras: [],
  sonido: true,
  primeraVez: true,
  // Última versión del juego que Kath ya vio. Vacía en una partida que ya
  // existía antes de este campo: eso es justo lo que dispara el cartelito de
  // "hay algo nuevo" la primera vez que abre el juego actualizado.
  versionVista: null,
  seq: 0,                 // sube en cada guardado; decide quién escribió último
  guardadoEn: 0,          // Date.now() del último guardado
  escritoPor: null,       // qué dispositivo lo guardó
});

let EST = EST_INICIAL();

/* --- migraciones ---------------------------------------------------------- */
/* Cada entrada lleva del número que la nombra al siguiente. Se aplican en
   cadena, así que una partida vieja de varias versiones se pone al día sola. */
const MIGRACIONES = {
  /* v1 -> v2: llegaron la sincronización y la fusión.
     `oroGanado` no estaba guardado en ningún lado, pero se puede reconstruir:
     lo que tiene ahora más lo que gastó en premios. */
  1: (e) => {
    const gastado = (e.canjeados || []).reduce((s, c) => {
      const p = PREMIOS.find((x) => x.id === c.id);
      return s + (p ? p.costo : 0);
    }, 0);
    e.oroGanado = (Number(e.oro) || 0) + gastado;
    e.canjeados = (e.canjeados || []).map((c) => ({ ...c, cid: c.cid || disco.uuid() }));
    e.seq = 1;
    e.guardadoEn = Date.now();
    e.escritoPor = null;
    e.v = 2;
    return e;
  },
  /* v2 -> v3: la hora de cada misión cumplida y las misiones secundarias.
     A qué hora se hizo lo de hoy no se puede reconstruir, así que arranca
     vacío: las de hoy quedan sin hora y las de mañana ya la tienen. */
  2: (e) => {
    e.hoyEn = {};
    e.extras = [];
    e.v = 3;
    return e;
  },
};

function migrar(partida) {
  let e = partida;
  let vueltas = 0;
  while ((Number(e.v) || 1) < V_ACTUAL && vueltas++ < 20) {
    const paso = MIGRACIONES[Number(e.v) || 1];
    if (!paso) break;
    e = paso(e);
  }
  return e;
}
/* --- fecha lógica del juego (el día arranca a las 4 AM) ------------------ */
function diaDeJuego(f) {
  const d = new Date(f || Date.now());
  if (d.getHours() < CONFIG.horaReinicio) d.setDate(d.getDate() - 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function fechaBonita(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d}/${m}/${a}`;
}

/* Hora de reloj de un instante guardado. Sin segundos: al segundo no le dice
   nada a nadie y ocupa lugar en una línea que ya es corta. */
function horaBonita(ts) {
  const d = new Date(Number(ts) || 0);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* Día y hora juntos, que es lo que se muestra al lado de una misión cumplida.
   El día va aunque casi siempre sea el de hoy: pasada la medianoche una misión
   de anoche sigue contando para "hoy" (el día del juego arranca a las 4 AM), y
   ahí ver sólo "02:40" confunde más de lo que aclara. */
function fechaHoraBonita(ts) {
  const d = new Date(Number(ts) || 0);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0')
    + ' ' + horaBonita(ts);
}

function diasEntre(isoA, isoB) {
  const a = new Date(isoA + 'T12:00:00'), b = new Date(isoB + 'T12:00:00');
  return Math.round((b - a) / 86400000);
}

/* --- guardado ------------------------------------------------------------ */
/* Quién quiere enterarse de que se guardó. Lo usa sync.js para empujar a la
   nube. Es un registro de funciones y no un import directo a propósito: si
   gameLogic importara sync y sync importara gameLogic tendríamos un ciclo. */
const oyentesGuardado = new Set();
const oyentesReemplazo = new Set();

function alGuardar(fn) { oyentesGuardado.add(fn); return () => oyentesGuardado.delete(fn); }
function alReemplazar(fn) { oyentesReemplazo.add(fn); return () => oyentesReemplazo.delete(fn); }

/* Huella de lo último que quedó escrito en disco. Sirve para no repetir
   trabajo: ver el comentario de guardar(). */
let huellaEnDisco = null;

/* Toda mutación de EST termina llamando a guardar(), así que este es el único
   lugar donde hace falta avisarle a React. Si algún día se muta EST sin guardar,
   la interfaz no se va a enterar: el aviso va acá a propósito.

   Pero muchas de esas llamadas no traen ningún cambio: cerrar un diálogo o
   cerrar el menú llaman a guardar() aunque Kath sólo haya mirado la tele. Antes
   cada una de esas escribía a disco, subía `seq`, redibujaba y despertaba a la
   nube. Ahora se comparan las huellas primero y, si no cambió nada que valga la
   pena guardar, no pasa nada de eso.

   Devuelve si la partida está a salvo en disco. Ajustes lo mira para poder decir
   "no se está guardando" en vez de dejar que Kath juegue una tarde entera al
   vacío — por eso saltear también devuelve true: no se escribió porque no hacía
   falta, no porque haya fallado. */
function guardar() {
  const huellaAhora = disco.huella(EST);
  if (huellaAhora === huellaEnDisco) return true;

  EST.seq = (Number(EST.seq) || 0) + 1;
  EST.guardadoEn = Date.now();
  EST.escritoPor = disco.idDispositivo();

  const ok = disco.escribir(EST);
  // La huella se actualiza sólo si la escritura entró. Si falló por cuota o
  // por el modo privado, el próximo guardado tiene que volver a intentarlo en
  // vez de creer que ya está guardado.
  if (ok) huellaEnDisco = huellaAhora;

  store.avisar();
  for (const fn of oyentesGuardado) {
    try { fn(EST); } catch { /* un oyente roto no puede tumbar el guardado */ }
  }
  return ok;
}

function cargar() {
  const { partida, origen } = disco.leer();
  if (partida) EST = Object.assign(EST_INICIAL(), migrar(partida));
  else EST = EST_INICIAL();
  // A propósito en null y no en la huella de lo leído: si la partida venía de
  // una versión vieja, migrar() la cambió y lo que hay en disco ya no es lo que
  // tenemos en memoria. Un guardado de más al arrancar no le duele a nadie.
  huellaEnDisco = null;
  // Avisar acá es imprescindible: los componentes se dibujan por primera vez
  // antes de que corra iniciar(), así que sin este aviso el HUD se quedaría
  // mostrando la partida vacía cuando el día ya estaba empezado.
  store.avisar();
  return origen;
}

/* Cambia la partida entera de una. La usan la restauración de una copia y la
   fusión con la nube. Avisa aparte porque hay cosas fuera de EST que dependen
   de esto — el bicho visible en el motor, por ejemplo — y el motor no puede
   importar este módulo sin invertir las capas. */
function reemplazarEstado(nuevo, opciones) {
  EST = Object.assign(EST_INICIAL(), migrar(nuevo));
  const { guardarTambien = true } = opciones || {};
  for (const fn of oyentesReemplazo) {
    try { fn(EST); } catch { /* idem */ }
  }
  if (guardarTambien) guardar();
  else store.avisar();
  return EST;
}

function obtenerEstado() { return EST; }

/* --- cambio de día ------------------------------------------------------- */
function chequearDia() {
  const hoy = diaDeJuego();
  if (EST.dia === hoy) return false;

  if (EST.dia) {
    const hechas = contarHechasHoy();
    EST.historial.push({ d: EST.dia, animo: EST.animoHoy, hechas });
    if (EST.historial.length > 90) EST.historial.shift();

    const cumplio = hechas >= CONFIG.misionesParaRacha;
    const consecutivo = diasEntre(EST.dia, hoy) === 1;
    if (cumplio && consecutivo) EST.racha++;
    else if (cumplio) EST.racha = 1;
    else EST.racha = 0;
    if (EST.racha > EST.mejorRacha) EST.mejorRacha = EST.racha;
    if (hechas >= MISIONES.length) EST.diasCompletos++;
  }

  EST.dia = hoy;
  EST.hoy = {};
  EST.hoyEn = {};
  EST.animoHoy = null;
  EST.cartaVista = false;
  EST.cartaIdx = Math.floor(Math.random() * CARTAS.length);
  guardar();
  return true;
}

/* --- misiones ------------------------------------------------------------ */
function misionPorId(id) { return MISIONES.find(m => m.id === id); }
function hechoHoy(id) { return EST.hoy[id] || 0; }

/* Los momentos en que se cumplió hoy, del más viejo al más nuevo. Puede venir
   más corta que el contador, o vacía: una partida de antes de v3 tiene las
   misiones de hoy pero no sus horas. Quien la muestre tiene que bancarse eso. */
function horasDe(id) { return (EST.hoyEn && EST.hoyEn[id]) || []; }

function contarHechasHoy() {
  let n = 0;
  for (const m of MISIONES) if (hechoHoy(m.id) >= m.veces) n++;
  return n;
}

function progresoDelDia() {
  let hechas = 0, total = 0;
  for (const m of MISIONES) { hechas += Math.min(hechoHoy(m.id), m.veces); total += m.veces; }
  return { hechas, total, pct: Math.round(hechas / total * 100) };
}

function completarMision(id) {
  const m = misionPorId(id);
  const antes = hechoHoy(id);
  if (antes >= m.veces) return null;
  EST.hoy[id] = antes + 1;
  if (!EST.hoyEn) EST.hoyEn = {};
  const ahora = Date.now();
  EST.hoyEn[id] = [...horasDe(id), ahora];
  EST.totalMisiones++;
  const completa = EST.hoy[id] >= m.veces;
  const subio = darXP(m.xp);
  EST.oro += m.oro;
  // oroGanado nunca baja. Es lo que deja fusionar dos dispositivos sin
  // inventar monedas ni comerse un canje (ver fusion.js).
  EST.oroGanado = (Number(EST.oroGanado) || 0) + m.oro;
  guardar();
  return {
    xp: m.xp, oro: m.oro, completa, subio, ts: ahora,
    texto: completa ? m.final : m.frase[Math.min(antes, m.frase.length - 1)],
    resta: m.veces - EST.hoy[id]
  };
}

/* --- nivel --------------------------------------------------------------- */
/* xpNecesaria() vive en niveles.js: fusion.js también la necesita y desde acá
   sería un ciclo de imports. Se re-exporta para no tocar a quien ya la usaba. */
function darXP(n) {
  EST.xp += n;
  let subio = 0;
  while (EST.xp >= xpNecesaria(EST.nivel)) {
    EST.xp -= xpNecesaria(EST.nivel);
    EST.nivel++;
    subio++;
  }
  return subio;
}

/* --- compañero ----------------------------------------------------------- */
function etapaBicho() {
  if (!EST.eclosionado) return -1;
  let et = 0;
  COMPANERO.etapas.forEach((e, i) => { if (EST.nivel >= e.desde) et = i; });
  return et;
}

function puedeEclosionar() {
  return !EST.eclosionado && EST.nivel >= COMPANERO.nivelEclosion;
}

function nombreBicho() {
  const et = etapaBicho();
  if (et < 0) return 'Huevo';
  return EST.bichoNombre || COMPANERO.etapas[et].nombre;
}

/* --- premios ------------------------------------------------------------- */
function canjear(id) {
  const p = PREMIOS.find(x => x.id === id);
  if (!p || EST.oro < p.costo) return false;
  EST.oro -= p.costo;
  // El cid identifica este canje en particular. Sin él, dos dispositivos que
  // canjean el mismo premio el mismo día se fusionan en uno solo y Kath
  // pierde un cupón.
  EST.canjeados.unshift({ cid: disco.uuid(), id, fecha: diaDeJuego(), cumplidoEn: null });
  guardar();
  return true;
}

/* El segundo tilde: Kath marca que Diego ya le cumplió el premio de verdad.
   Canjearlo sólo saca las monedas — de este lado no hay forma de saber si el
   abrazo o la salida pasaron, y sin esto un cupón viejo se ve igual que uno
   que sigue esperando.
   Se guarda el día y no un booleano porque el día ya se muestra en la lista,
   y porque deja ver cuánto tardó en cumplirse.

   Recibe el canje en sí y no su `cid` porque no todos tienen: la fusión
   arrastra los viejos de antes del cid tal cual (ver fusion.js), y buscarlos
   por un cid vacío marcaría el primero de la lista que tampoco tenga, o sea
   un cupón cualquiera. */
function confirmarCanje(canje) {
  if (!canje || canje.cumplidoEn) return false;
  if (!EST.canjeados.includes(canje)) return false;
  canje.cumplidoEn = diaDeJuego();
  guardar();
  return true;
}

/* --- misiones secundarias -------------------------------------------------- */
/* Las que no están puestas en la casa: Kath escribe qué hizo y queda guardada
   como una misión más del día, con su fecha y su hora. Pagan todas lo mismo —
   ponerla a tasar lo que hizo sería pedirle justo el trabajo que el juego le
   quiere sacar de encima. */
function extrasDeHoy() {
  return EST.extras.filter((e) => e && e.dia === EST.dia);
}

/* Cuántas más entran hoy. La interfaz lo mira para no abrir un formulario que
   después no va a poder guardar. */
function cupoExtras() {
  return Math.max(0, EXTRA.porDia - extrasDeHoy().length);
}

/* Devuelve la recompensa, o null si el texto vino vacío o ya llegó al tope.
   El recorte de largo se hace acá y no en el formulario: el formulario es una
   sugerencia, esto es lo que efectivamente se guarda. */
function agregarExtra(texto) {
  const t = String(texto || '').trim().slice(0, EXTRA.largoMax);
  if (!t) return null;
  if (cupoExtras() <= 0) return null;

  const extra = {
    eid: disco.uuid(),
    dia: EST.dia,
    texto: t,
    ts: Date.now(),
    xp: EXTRA.xp,
    oro: EXTRA.oro,
  };
  EST.extras.unshift(extra);
  // Tope de historia: 200 es más de dos meses anotando el máximo por día, y
  // evita que una partida vieja se vuelva pesada de sincronizar.
  if (EST.extras.length > 200) EST.extras.length = 200;

  const subio = darXP(extra.xp);
  EST.oro += extra.oro;
  EST.oroGanado = (Number(EST.oroGanado) || 0) + extra.oro;
  guardar();
  return { xp: extra.xp, oro: extra.oro, subio, extra, hoy: extrasDeHoy().length };
}

/* --- disfraces ------------------------------------------------------------ */
/* Sortea un hallazgo entre lo que TODAVÍA no encontró. Se sortea sobre los que
   faltan y no sobre la lista entera para que el último accesorio no se vuelva
   cada vez más improbable: encontrar el tercero cuesta lo mismo que el
   primero. Devuelve el disfraz encontrado, o null si esta vez no hubo nada. */
function buscarDisfrazEnCesped() {
  const faltan = DISFRACES.filter((d) => !EST.disfraces.includes(d.id));
  if (!faltan.length) return null;
  if (Math.random() >= 1 / PASOS_POR_HALLAZGO) return null;
  const d = faltan[Math.floor(Math.random() * faltan.length)];
  EST.disfraces.push(d.id);
  guardar();
  return d;
}

/* null saca lo que tenga puesto. Sólo deja ponerse algo ya encontrado: si no,
   una partida vieja fusionada podría dejar puesto un accesorio que Kath
   todavía no juntó. */
function ponerDisfraz(id) {
  if (id !== null && !EST.disfraces.includes(id)) return false;
  EST.disfrazPuesto = id;
  guardar();
  return true;
}

/* --- tira de los últimos días (la usa la pestaña Progreso) ---------------- */
const DIAS_TIRA = 14;

function ultimosDias() {
  const total = MISIONES.length;
  const porFecha = {};
  for (const h of EST.historial) porFecha[h.d] = h;
  porFecha[EST.dia] = { d: EST.dia, animo: EST.animoHoy, hechas: contarHechasHoy() };

  const hoy = new Date(EST.dia + 'T12:00:00');
  const out = [];
  for (let i = DIAS_TIRA - 1; i >= 0; i--) {
    const f = new Date(hoy); f.setDate(f.getDate() - i);
    const iso = f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0');
    const reg = porFecha[iso];
    out.push({ iso, hechas: reg ? reg.hechas : 0, animo: reg ? reg.animo : null, hayDato: !!reg, total });
  }
  return out;
}

export {
  EST, EST_INICIAL, CLAVE_GUARDADO, V_ACTUAL, migrar,
  suscribir, version,
  diaDeJuego, fechaBonita, horaBonita, fechaHoraBonita, diasEntre,
  guardar, cargar, chequearDia,
  alGuardar, alReemplazar, reemplazarEstado, obtenerEstado,
  misionPorId, hechoHoy, horasDe, contarHechasHoy, progresoDelDia, completarMision,
  extrasDeHoy, cupoExtras, agregarExtra,
  darXP,
  etapaBicho, puedeEclosionar, nombreBicho,
  canjear, confirmarCanje,
  buscarDisfrazEnCesped, ponerDisfraz,
  DIAS_TIRA, ultimosDias,
};
export { xpNecesaria } from './niveles.js';
