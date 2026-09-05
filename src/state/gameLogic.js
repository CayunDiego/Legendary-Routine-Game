import { CONFIG } from '../config/config.js';
import { MISIONES } from '../config/misiones.js';
import { PREMIOS } from '../config/premios.js';
import { CARTAS } from '../config/cartas.js';
import { COMPANERO } from '../config/companero.js';
import {
  DISFRACES_CESPED, DISFRACES_MEDICINAS, PASOS_POR_HALLAZGO,
} from '../config/disfraces.js';
import { EXTRA } from '../config/extras.js';
import { POMODORO } from '../config/pomodoro.js';
import { MEDICINAS, TOMAS } from '../config/medicinas.js';
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
const V_ACTUAL = 5;

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
  /* Pomodoro en curso, o null. { fase:'foco'|'pausa', rato, desde, hasta }.
     `hasta` es un Date.now() futuro y no un contador que baja: el reloj tiene
     que seguir corriendo con el juego cerrado (ver config/pomodoro.js). */
  pomo: null,
  /* Bloques de foco terminados, los más nuevos primero:
     [{ pid, dia, ts, minutos, rato, xp, oro }]. Como las secundarias, no se
     vacían al cambiar el día: son un registro. */
  pomodoros: [],
  /* Las medicinas, día por día: { '2026-09-04': { desayuno: ts, cena: ts } }.
     Es el registro más importante de la partida y el único que se guarda por
     fecha en vez de vaciarse al cambiar el día.

     Tres valores posibles por toma, y la diferencia importa:
       - la clave no está  → nunca se marcó.
       - 0                 → se marcó y Kath lo deshizo (se equivocó de botón).
       - un Date.now()     → tomada, a esa hora exacta.
     El 0 es lo que hace que deshacer y volver a marcar no pague de nuevo, y la
     fusión lo respeta: tomada le gana a deshecha, y deshecha a nunca. */
  meds: {},
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
  /* v3 -> v4: el pomodoro de la compu. No hay nada que reconstruir —una
     partida vieja simplemente no hizo ninguno— pero el paso va igual: sin él
     la partida seguiría diciendo que es v3 y la próxima migración de verdad
     arrancaría desde el lugar equivocado. */
  3: (e) => {
    e.pomo = null;
    e.pomodoros = [];
    e.v = 4;
    return e;
  },
  /* v4 -> v5: el registro de medicinas. Arranca vacío y no se puede
     reconstruir de ningún lado: una partida vieja no tiene ni el dato ni la
     hora, y un registro de medicación inventado es peor que uno que empieza
     hoy. */
  4: (e) => {
    e.meds = {};
    e.v = 5;
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

/* --- pomodoro ------------------------------------------------------------- */
/* El reloj de la compu. Todo lo que se guarda es un instante futuro (`hasta`),
   así que lo que queda se calcula restando y el pomodoro sigue corriendo con
   el juego cerrado. Nada de esto depende del bucle de render a propósito: ver
   el comentario largo de config/pomodoro.js. */

/* Pasado este rato desde que venció una fase, se toma como abandonada: no paga
   y no festeja. Es para el pomodoro que Kath arrancó, se olvidó, y aparece tres
   días después dando monedas y un cartel de "¡terminaste!" que no significa
   nada. Cuatro horas es holgado para el caso real (arrancar, apagar la pantalla
   para no distraerse, volver a la tarde) y corto para el olvido. */
const GRACIA_POMO_MS = 4 * 60 * 60 * 1000;

function ratoPomodoro(id) {
  return POMODORO.ratos.find((r) => r.id === id)
    || POMODORO.ratos.find((r) => r.id === POMODORO.porDefecto)
    || POMODORO.ratos[0];
}

/* El pomodoro en curso con lo que le queda ya calculado, o null. Es lo que
   miran la pestaña y el cartelito de la escena; ninguno de los dos toca EST. */
function pomodoroEnCurso() {
  const p = EST.pomo;
  if (!p || !p.hasta) return null;
  const rato = ratoPomodoro(p.rato);
  const largoMs = (p.fase === 'pausa' ? rato.pausa : rato.foco) * 60000;
  return {
    fase: p.fase,
    rato,
    hasta: p.hasta,
    largoMs,
    restaMs: Math.max(0, p.hasta - Date.now()),
  };
}

function pomodorosDeHoy() {
  return EST.pomodoros.filter((p) => p && p.dia === EST.dia);
}

/* Cuántos bloques más pagan hoy. Pasado el tope el pomodoro sigue andando
   igual —es un reloj, no una fábrica de monedas—, sólo deja de dar premio. */
function cupoPomodoros() {
  return Math.max(0, POMODORO.porDia - pomodorosDeHoy().length);
}

/* Arranca un bloque de foco. Pisa el que hubiera: elegir un largo nuevo con
   uno corriendo es cambiar de idea, no un error. */
function arrancarPomodoro(ratoId) {
  const r = ratoPomodoro(ratoId);
  const ahora = Date.now();
  EST.pomo = { fase: 'foco', rato: r.id, desde: ahora, hasta: ahora + r.foco * 60000 };
  guardar();
  return pomodoroEnCurso();
}

function cortarPomodoro() {
  if (!EST.pomo) return false;
  EST.pomo = null;
  guardar();
  return true;
}

/* Cierra la fase que ya venció y devuelve qué pasó, o null si no venció nada.
   La llama el reloj de game/juego.js una vez por segundo — acá no hay
   temporizadores: este módulo mira la hora, no la espera.

   Al terminar el foco arranca la pausa sola; al terminar la pausa no arranca
   nada. Encadenar los focos solos convierte el pomodoro en una cinta de correr,
   y es justo al revés: cada vuelta se decide de nuevo. */
function cerrarFasePomodoro() {
  const p = EST.pomo;
  if (!p || !p.hasta) return null;
  const ahora = Date.now();
  if (ahora < p.hasta) return null;

  const rato = ratoPomodoro(p.rato);
  const fase = p.fase;

  // Venció hace demasiado: se lo lleva puesto sin pagar ni festejar.
  if (ahora - p.hasta > GRACIA_POMO_MS) {
    EST.pomo = null;
    guardar();
    return { fase, rato, abandonado: true };
  }

  if (fase === 'pausa') {
    EST.pomo = null;
    guardar();
    return { fase: 'pausa', rato };
  }

  // El cupo se mira ANTES de anotar el bloque, si no el sexto se cuenta a sí
  // mismo y termina sin pagar.
  const paga = cupoPomodoros() > 0;
  const reg = {
    pid: disco.uuid(),
    dia: EST.dia,
    ts: ahora,
    minutos: rato.foco,
    rato: rato.id,
    xp: paga ? POMODORO.xp : 0,
    oro: paga ? POMODORO.oro : 0,
  };
  EST.pomodoros.unshift(reg);
  if (EST.pomodoros.length > POMODORO.historia) EST.pomodoros.length = POMODORO.historia;

  const subio = darXP(reg.xp);
  EST.oro += reg.oro;
  EST.oroGanado = (Number(EST.oroGanado) || 0) + reg.oro;

  EST.pomo = { fase: 'pausa', rato: rato.id, desde: ahora, hasta: ahora + rato.pausa * 60000 };
  guardar();
  return { fase: 'foco', rato, reg, subio, pago: paga, hoy: pomodorosDeHoy().length };
}

/* mm:ss de lo que queda. Redondea para arriba para que el reloj muestre el
   minuto entero mientras dure: con Math.floor, un pomodoro de 25 arranca
   diciendo 24:59 y parece que ya empezó tarde. */
function relojPomodoro(ms) {
  const seg = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(seg / 60)).padStart(2, '0') + ':' + String(seg % 60).padStart(2, '0');
}

/* --- medicinas -------------------------------------------------------------
   Las tres tomas del día. Se parecen a una misión de tres veces, pero no lo
   son: cada toma tiene nombre y horario propios, el registro no se archiva al
   cambiar el día y lo que hay que poder mirar es la hora exacta de cada una,
   no un contador. Por eso viven en EST.meds y no en EST.hoy. */

function tomaPorId(id) { return TOMAS.find((t) => t.id === id) || null; }

/* La hora del reloj llevada a la escala del día del juego, que arranca a las 4
   AM: la 1 de la mañana es "las 25 de ayer". Sin esto, la franja de la cena
   (20 a 26) no existiría después de medianoche. */
function horaDelDiaDeJuego(ts) {
  const h = new Date(ts || Date.now()).getHours();
  return h < CONFIG.horaReinicio ? h + 24 : h;
}

/* Qué toma corresponde a un instante, o null si no cae en ninguna franja. */
function franjaDeHora(ts) {
  const h = horaDelDiaDeJuego(ts);
  return TOMAS.find((t) => h >= t.desde && h < t.hasta) || null;
}

/* El registro de un día, siempre un objeto (nunca undefined) para que quien lo
   muestre no tenga que preguntar dos veces. */
function medsDelDia(dia) {
  return (EST.meds && EST.meds[dia || EST.dia]) || {};
}

/* El instante en que se tomó, o 0 si no está tomada (nunca marcada o deshecha).
   Quien quiera distinguir "deshecha" de "nunca" mira medsDelDia() directo. */
function horaDeToma(id, dia) {
  const v = Number(medsDelDia(dia)[id]) || 0;
  return v > 0 ? v : 0;
}

function tomasDelDia(dia) {
  const reg = medsDelDia(dia);
  return TOMAS.map((t) => ({ toma: t, ts: Number(reg[t.id]) > 0 ? Number(reg[t.id]) : 0 }));
}

/* Cuántas de las tres están tomadas ese día. */
function tomadasDelDia(dia) {
  return tomasDelDia(dia).filter((x) => x.ts > 0).length;
}

/* La toma que está pendiente AHORA: hay franja abierta y todavía no se marcó.
   Es lo único que enciende la burbuja del pastillero y lo que Diego puede
   llegar a mencionar. Fuera de franja devuelve null a propósito: el
   recordatorio es de vez en cuando, no un cartel prendido todo el día. */
function medicinaPendiente(ts) {
  const f = franjaDeHora(ts);
  if (!f) return null;
  // La franja de la cena se estira pasada la medianoche, y ahí el día del juego
  // sigue siendo el de ayer: por eso el día sale del mismo instante que la
  // franja y no de EST.dia, que podría estar sin actualizar.
  const dia = diaDeJuego(ts);
  return horaDeToma(f.id, dia) > 0 ? null : f;
}

/* Marca una toma. Devuelve la recompensa, o null si ya estaba tomada.
   Paga una sola vez por día y por toma: si la clave ya existe (aunque valga 0,
   o sea que se marcó y se deshizo) se anota la hora pero no se cobra de nuevo.

   La toma se anota en el día que le corresponde a la franja de ESE momento, no
   siempre en EST.dia: marcar la cena a la 1 AM es la cena de anoche. Si la hora
   no cae en ninguna franja manda el día de juego actual, que es lo mismo salvo
   entre las 2 y las 4 de la mañana. */
function marcarMedicina(id, ts) {
  const t = tomaPorId(id);
  if (!t) return null;
  const ahora = Number(ts) || Date.now();
  const dia = diaDeJuego(ahora);
  if (!EST.meds) EST.meds = {};
  const reg = EST.meds[dia] || (EST.meds[dia] = {});
  if (Number(reg[id]) > 0) return null;

  const yaCobrada = Object.prototype.hasOwnProperty.call(reg, id);
  reg[id] = ahora;
  podarMeds();

  if (yaCobrada) {
    guardar();
    return { toma: t, ts: ahora, xp: 0, oro: 0, subio: 0, dia, repetida: true };
  }
  const subio = darXP(MEDICINAS.xp);
  // Las medicinas NO pagan monedas (MEDICINAS.oro es 0). El `if` no es por las
  // dudas: es lo que deja subirlo algún día sin que oroGanado se ensucie con
  // sumas de cero mientras tanto. Ver el comentario de config/medicinas.js.
  if (MEDICINAS.oro) {
    EST.oro += MEDICINAS.oro;
    EST.oroGanado = (Number(EST.oroGanado) || 0) + MEDICINAS.oro;
  }
  guardar();
  return {
    toma: t, ts: ahora, xp: MEDICINAS.xp, oro: MEDICINAS.oro, subio, dia,
    repetida: false, disfraz: buscarDisfrazDeMedicinas(dia),
  };
}

/* El premio de verdad de las medicinas: los accesorios que no se compran.
   Se entrega al completar las tres tomas del día, y sólo si la racha ya llega
   al `rachaMed` del que sigue. Devuelve el disfraz encontrado, o null.

   Mira el día que se acaba de marcar y no EST.dia: la cena de anoche, marcada
   a la 1 AM, completa el día de ayer y tiene que poder destrabar igual. Un día
   viejo, en cambio, no destraba nada — la racha de hoy ya lo tuvo en cuenta o
   ya se cortó. */
function buscarDisfrazDeMedicinas(dia) {
  const d = dia || EST.dia;
  if (d !== EST.dia && d !== diaDeJuego()) return null;
  if (tomadasDelDia(d) < TOMAS.length) return null;

  const racha = rachaMedicinas();
  const premio = DISFRACES_MEDICINAS.find(
    (x) => racha >= x.rachaMed && !EST.disfraces.includes(x.id));
  if (!premio) return null;
  EST.disfraces.push(premio.id);
  guardar();
  return premio;
}

/* Deshacer: se marcó de más o se tocó el botón equivocado. No devuelve el XP ni
   el oro —`oroGanado` nunca baja, es de lo que depende la fusión para no
   inventar monedas— pero deja la clave en 0, así volver a marcarla tampoco
   vuelve a pagar. Sólo se puede deshacer un día que existe en el registro. */
function desmarcarMedicina(id, dia) {
  const d = dia || EST.dia;
  const reg = EST.meds && EST.meds[d];
  if (!reg || !(Number(reg[id]) > 0)) return false;
  reg[id] = 0;
  guardar();
  return true;
}

/* Los últimos días con algo anotado, del más nuevo al más viejo. El día de hoy
   va siempre, aunque esté vacío: es el que Kath viene a mirar. */
function diasDeMedicinas(cuantos) {
  const dias = new Set(Object.keys(EST.meds || {}));
  if (EST.dia) dias.add(EST.dia);
  return [...dias].sort().reverse()
    .slice(0, cuantos || MEDICINAS.diasVisibles)
    .map((d) => ({ dia: d, tomas: tomasDelDia(d), tomadas: tomadasDelDia(d) }));
}

/* Racha de días con las tres tomas, contando para atrás desde ayer. Hoy entra
   sólo si ya están las tres: si no, un día a medio hacer cortaría la racha a
   las nueve de la mañana, que es exactamente cuando no hay nada que reprochar. */
function rachaMedicinas() {
  if (!EST.dia) return 0;
  let n = 0;
  const d = new Date(EST.dia + 'T12:00:00');
  if (tomadasDelDia(EST.dia) < TOMAS.length) d.setDate(d.getDate() - 1);
  for (let i = 0; i < MEDICINAS.historia; i++) {
    const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      + '-' + String(d.getDate()).padStart(2, '0');
    if (tomadasDelDia(iso) < TOMAS.length) break;
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/* Tope de historia. Se poda por fecha y no por cantidad de escrituras: el
   registro se ordena solo porque las claves son ISO. */
function podarMeds() {
  const dias = Object.keys(EST.meds || {});
  if (dias.length <= MEDICINAS.historia) return;
  for (const d of dias.sort().slice(0, dias.length - MEDICINAS.historia)) delete EST.meds[d];
}

/* --- disfraces ------------------------------------------------------------ */
/* Sortea un hallazgo entre lo que TODAVÍA no encontró. Se sortea sobre los que
   faltan y no sobre la lista entera para que el último accesorio no se vuelva
   cada vez más improbable: encontrar el tercero cuesta lo mismo que el
   primero. Devuelve el disfraz encontrado, o null si esta vez no hubo nada. */
function buscarDisfrazEnCesped() {
  // Sólo los del césped: los del pastillero se ganan completando el día, y si
  // también aparecieran acá la recompensa de cuidarse se conseguiría caminando
  // en círculos por el pasto.
  const faltan = DISFRACES_CESPED.filter((d) => !EST.disfraces.includes(d.id));
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
  ratoPomodoro, pomodoroEnCurso, pomodorosDeHoy, cupoPomodoros,
  arrancarPomodoro, cortarPomodoro, cerrarFasePomodoro, relojPomodoro,
  darXP,
  tomaPorId, franjaDeHora, medsDelDia, horaDeToma, tomasDelDia, tomadasDelDia,
  medicinaPendiente, marcarMedicina, desmarcarMedicina, diasDeMedicinas, rachaMedicinas,
  buscarDisfrazDeMedicinas,
  etapaBicho, puedeEclosionar, nombreBicho,
  canjear, confirmarCanje,
  buscarDisfrazEnCesped, ponerDisfraz,
  DIAS_TIRA, ultimosDias,
};
export { xpNecesaria } from './niveles.js';
