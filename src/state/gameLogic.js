import { CONFIG } from '../config/config.js';
import { MISIONES } from '../config/misiones.js';
import { PREMIOS } from '../config/premios.js';
import { CARTAS } from '../config/cartas.js';
import { COMPANERO } from '../config/companero.js';
import { crearStore } from './store.js';

/* Store al que se enganchan los componentes de React. Se avisa desde guardar(),
   que es por donde pasa toda mutación de EST (ver comentario más abajo). */
const store = crearStore();
const suscribir = store.suscribir;
const version = store.version;

/* ============================================================================
 *  LÓGICA DEL JUEGO — progreso, guardado, misiones, racha, compañero
 * ==========================================================================*/

const CLAVE_GUARDADO = 'rutina_legendaria_v1';

const EST_INICIAL = () => ({
  v: 1,
  dia: null,
  nivel: 1,
  xp: 0,
  oro: 0,
  racha: 0,
  mejorRacha: 0,
  diasCompletos: 0,
  totalMisiones: 0,
  hoy: {},
  animoHoy: null,
  historial: [],          // [{d:'2026-08-14', animo:'bien', hechas:6}]
  cartaVista: false,
  cartaIdx: -1,
  eclosionado: false,
  bichoNombre: null,
  canjeados: [],          // [{id, fecha}]
  sonido: true,
  primeraVez: true
});

let EST = EST_INICIAL();
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

function diasEntre(isoA, isoB) {
  const a = new Date(isoA + 'T12:00:00'), b = new Date(isoB + 'T12:00:00');
  return Math.round((b - a) / 86400000);
}

/* --- guardado ------------------------------------------------------------ */
/* Toda mutación de EST termina llamando a guardar(), así que este es el único
   lugar donde hace falta avisarle a React. Si algún día se muta EST sin guardar,
   la interfaz no se va a enterar: el aviso va acá a propósito. */
function guardar() {
  try { localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(EST)); } catch (e) { }
  store.avisar();
}

function cargar() {
  try {
    const raw = localStorage.getItem(CLAVE_GUARDADO);
    if (raw) EST = Object.assign(EST_INICIAL(), JSON.parse(raw));
  } catch (e) { EST = EST_INICIAL(); }
  // Avisar acá es imprescindible: los componentes se dibujan por primera vez
  // antes de que corra iniciar(), así que sin este aviso el HUD se quedaría
  // mostrando la partida vacía cuando el día ya estaba empezado.
  store.avisar();
}

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
  EST.animoHoy = null;
  EST.cartaVista = false;
  EST.cartaIdx = Math.floor(Math.random() * CARTAS.length);
  guardar();
  return true;
}

/* --- misiones ------------------------------------------------------------ */
function misionPorId(id) { return MISIONES.find(m => m.id === id); }
function hechoHoy(id) { return EST.hoy[id] || 0; }

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
  EST.totalMisiones++;
  const completa = EST.hoy[id] >= m.veces;
  const subio = darXP(m.xp);
  EST.oro += m.oro;
  guardar();
  return {
    xp: m.xp, oro: m.oro, completa, subio,
    texto: completa ? m.final : m.frase[Math.min(antes, m.frase.length - 1)],
    resta: m.veces - EST.hoy[id]
  };
}

/* --- nivel --------------------------------------------------------------- */
function xpNecesaria(nivel) { return 80 + (nivel - 1) * 55; }

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
  EST.canjeados.unshift({ id, fecha: diaDeJuego() });
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
  EST, EST_INICIAL, CLAVE_GUARDADO,
  suscribir, version,
  diaDeJuego, fechaBonita, diasEntre,
  guardar, cargar, chequearDia,
  misionPorId, hechoHoy, contarHechasHoy, progresoDelDia, completarMision,
  xpNecesaria, darXP,
  etapaBicho, puedeEclosionar, nombreBicho,
  canjear,
  DIAS_TIRA, ultimosDias,
};
