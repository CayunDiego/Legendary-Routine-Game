import { MISIONES } from '../config/misiones.js';
import { PREMIOS } from '../config/premios.js';
import { MEDICINAS } from '../config/medicinas.js';
import { xpTotal, desdeXpTotal } from './niveles.js';

/* ---------------------------------------------------------------------------
 *  Fusión de dos partidas.
 *
 *  Con dos dispositivos, tarde o temprano los dos escriben sin haberse visto:
 *  Kath completa misiones en el teléfono sin señal y a la tarde abre la tablet,
 *  que tenía el estado de ayer. Lo obvio sería "gana el que guardó último", y
 *  es exactamente lo que no queremos: la tablet borraría el día del teléfono.
 *
 *  Así que se fusiona de verdad. La mayoría de los datos lo permite sin
 *  ambigüedad porque sólo crecen (XP, misiones totales, días completos) o están
 *  indexados por fecha (el historial, las misiones de hoy). Para lo poco que es
 *  una preferencia y no un logro — el sonido, el nombre del bicho — decide el
 *  que escribió último, que es lo que quiere decir `seq`.
 *
 *  Regla de oro: ante la duda, se redondea a favor de Kath. Nunca se le saca
 *  algo que hizo.
 * ------------------------------------------------------------------------- */

const maxNum = (x, y) => Math.max(Number(x) || 0, Number(y) || 0);

function contarHechas(hoy) {
  const h = hoy || {};
  let n = 0;
  for (const m of MISIONES) if ((h[m.id] || 0) >= m.veces) n++;
  return n;
}

function costoPremio(id) {
  const p = PREMIOS.find((x) => x.id === id);
  return p ? p.costo : 0;
}

/* --- misiones del día ----------------------------------------------------- */
function fusionarHoy(a, b) {
  const out = {};
  for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    out[k] = maxNum(a && a[k], b && b[k]);
  }
  return out;
}

/* --- horas de las misiones de hoy ------------------------------------------ */
/* No se mezclan las dos listas de un mismo id: se elige entera la del
   dispositivo que hizo más veces esa misión. Intercalar las horas de los dos
   armaría una tarde que no pasó en ningún lado (el teléfono tomó agua a las
   9:00 y la tablet a las 9:05: no fueron dos vasos, fue el mismo mal
   sincronizado). Ante el mismo largo gana la que empieza más temprano.

   Después se recorta al contador ya fusionado. Puede quedar más corta que él
   —una partida vieja no guardaba horas— y así se muestra: sin la hora. Lo que
   no puede es sobrar. */
function fusionarHoyEn(a, b, hoy) {
  const out = {};
  const A = a || {}, B = b || {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const la = (A[k] || []).map(Number).filter(Boolean).sort((x, y) => x - y);
    const lb = (B[k] || []).map(Number).filter(Boolean).sort((x, y) => x - y);
    let elegida;
    if (la.length !== lb.length) elegida = la.length > lb.length ? la : lb;
    else elegida = (la[0] || Infinity) <= (lb[0] || Infinity) ? la : lb;
    const tope = Number((hoy || {})[k]) || elegida.length;
    if (elegida.length) out[k] = elegida.slice(0, tope);
  }
  return out;
}

/* --- misiones secundarias --------------------------------------------------- */
/* Sólo crecen y cada una trae su `eid`, así que la unión es directa. Las de
   antes del eid —no hay ninguna publicada, pero una copia a mano podría
   traerlas— se distinguen por día + hora + texto, que es tan único como hace
   falta: dos secundarias distintas del mismo día se escribieron en momentos
   distintos. */
function fusionarExtras(a, b) {
  const porClave = new Map();
  for (const x of [...(a || []), ...(b || [])]) {
    if (!x || !x.texto) continue;
    const k = x.eid || [x.dia, x.ts, x.texto].join('|');
    if (!porClave.has(k)) porClave.set(k, x);
  }
  return [...porClave.values()]
    .sort((x, y) => (Number(y.ts) || 0) - (Number(x.ts) || 0))
    .slice(0, 200);   // el mismo tope que usa agregarExtra()
}

/* --- pomodoros --------------------------------------------------------------
   Mismo caso que las secundarias: sólo crecen y cada bloque trae su `pid`. */
function fusionarPomodoros(a, b) {
  const porClave = new Map();
  for (const x of [...(a || []), ...(b || [])]) {
    if (!x || !x.ts) continue;
    const k = x.pid || [x.dia, x.ts, x.rato].join('|');
    if (!porClave.has(k)) porClave.set(k, x);
  }
  return [...porClave.values()]
    .sort((x, y) => (Number(y.ts) || 0) - (Number(x.ts) || 0))
    .slice(0, 300);   // el mismo tope que POMODORO.historia
}

/* El pomodoro EN CURSO no se puede resolver por quién escribió último: el
   dispositivo donde Kath lo arrancó se queda callado justamente mientras ella
   trabaja, así que el otro casi siempre escribe después y su `null` le apagaría
   el reloj. Gana el que todavía no venció, y entre dos vivos, el que termina más
   tarde — que es el que arrancó último, o sea el que ella está mirando. */
function fusionarPomo(a, b) {
  const ahora = Date.now();
  const vivos = [a, b].filter((p) => p && Number(p.hasta) > ahora);
  if (!vivos.length) return null;
  return vivos.reduce((x, y) => (Number(y.hasta) > Number(x.hasta) ? y : x));
}

/* --- medicinas --------------------------------------------------------------
   Indexado por fecha y por toma, así que la unión es directa, pero el empate no
   se resuelve por `seq`: gana el valor más alto, y eso alcanza porque los tres
   estados están ordenados solos —tomada (un Date.now()) > deshecha (0) > nunca
   (la clave no está)—.

   O sea: si un dispositivo la tiene tomada y el otro deshecha, queda tomada. Es
   la regla de oro de este archivo aplicada al registro que más importa: nunca
   se le borra a Kath una toma que hizo. Entre dos horas distintas del mismo día
   gana la más temprana, que es cuando pasó de verdad; la más tarde es el otro
   dispositivo enterándose. */
function fusionarMeds(a, b) {
  const out = {};
  const A = a || {}, B = b || {};
  for (const dia of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const ra = A[dia] || {}, rb = B[dia] || {};
    const reg = {};
    for (const id of new Set([...Object.keys(ra), ...Object.keys(rb)])) {
      const va = Number(ra[id]) || 0, vb = Number(rb[id]) || 0;
      if (va > 0 && vb > 0) reg[id] = Math.min(va, vb);
      else reg[id] = Math.max(va, vb);
    }
    out[dia] = reg;
  }
  // El mismo tope que usa podarMeds(): las fechas son ISO, así que ordenan solas.
  const dias = Object.keys(out).sort();
  for (const d of dias.slice(0, Math.max(0, dias.length - MEDICINAS.historia))) delete out[d];
  return out;
}

/* --- historial ------------------------------------------------------------ */
/* Indexado por fecha, así que la unión es directa. Si los dos tienen el mismo
   día con distinto número, gana el mayor: uno de los dos no llegó a enterarse
   de la última misión. */
function fusionarHistorial(a, b, extra) {
  const porFecha = new Map();
  const meter = (h) => {
    if (!h || !h.d) return;
    const prev = porFecha.get(h.d);
    if (!prev) { porFecha.set(h.d, { ...h }); return; }
    prev.hechas = maxNum(prev.hechas, h.hechas);
    if (!prev.animo && h.animo) prev.animo = h.animo;
  };
  for (const h of a || []) meter(h);
  for (const h of b || []) meter(h);
  for (const h of extra || []) meter(h);

  const out = [...porFecha.values()].sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0));
  return out.slice(-90);   // el mismo tope que usa chequearDia()
}

/* --- premios canjeados ---------------------------------------------------- */
/* Los canjes nuevos traen `cid` y se unen por ahí. Los viejos no tienen nada
   que los distinga, así que se agrupan por premio+fecha y se toma la cantidad
   mayor de los dos lados: canjear dos abrazos el mismo día es legítimo y no se
   puede confundir con un duplicado de sincronización. */

/* Dos copias del mismo canje (mismo cid). Lo único que puede diferir es el
   segundo tilde, así que si cualquiera de los dos lados lo tiene marcado el
   canje queda cumplido: desmarcarlo sería decirle a Kath que el premio que ya
   recibió sigue pendiente. Ante dos fechas gana la más temprana, que es
   cuando pasó de verdad. */
function unirCanje(x, y) {
  const fechas = [x.cumplidoEn, y.cumplidoEn].filter(Boolean).sort();
  return { ...x, ...y, cumplidoEn: fechas[0] || null };
}

function fusionarCanjeados(a, b) {
  const conCid = new Map();
  const sinCid = new Map();

  const clasificar = (lista, bolsaSinCid) => {
    for (const c of lista || []) {
      if (!c || !c.id) continue;
      if (c.cid) {
        const previo = conCid.get(c.cid);
        conCid.set(c.cid, previo ? unirCanje(previo, c) : c);
        continue;
      }
      const k = c.id + '|' + (c.fecha || '');
      if (!bolsaSinCid.has(k)) bolsaSinCid.set(k, []);
      bolsaSinCid.get(k).push(c);
    }
  };

  const bolsaA = new Map(), bolsaB = new Map();
  clasificar(a, bolsaA);
  clasificar(b, bolsaB);

  for (const k of new Set([...bolsaA.keys(), ...bolsaB.keys()])) {
    const la = bolsaA.get(k) || [], lb = bolsaB.get(k) || [];
    const ganadora = la.length >= lb.length ? la : lb;
    sinCid.set(k, ganadora);
  }

  const out = [...conCid.values()];
  for (const lista of sinCid.values()) out.push(...lista);
  // Más nuevos primero, que es como los muestra TabPremios.
  return out.sort((x, y) => String(y.fecha || '').localeCompare(String(x.fecha || '')));
}

/* --- fusión ---------------------------------------------------------------- */
function fusionar(a, b) {
  if (!a) return b;
  if (!b) return a;

  const seqA = Number(a.seq) || 0;
  const seqB = Number(b.seq) || 0;
  const ultimo = seqB >= seqA ? b : a;      // el que escribió más tarde
  const viejo = ultimo === b ? a : b;

  // Base: todo lo que no tiene regla propia lo decide el último en escribir.
  // Arrancar del viejo y pisar con el último también conserva los campos que
  // este código todavía no conoce (una versión más nueva del juego en el otro
  // dispositivo), en vez de tirarlos.
  const out = { ...viejo, ...ultimo };

  // --- progreso: sólo sube -------------------------------------------------
  const nivelado = desdeXpTotal(maxNum(xpTotal(a.nivel || 1, a.xp), xpTotal(b.nivel || 1, b.xp)));
  out.nivel = nivelado.nivel;
  out.xp = nivelado.xp;
  out.totalMisiones = maxNum(a.totalMisiones, b.totalMisiones);
  out.diasCompletos = maxNum(a.diasCompletos, b.diasCompletos);
  out.mejorRacha = maxNum(a.mejorRacha, b.mejorRacha);
  out.racha = maxNum(a.racha, b.racha);
  out.eclosionado = !!(a.eclosionado || b.eclosionado);
  // Nació una sola vez: vale el momento más temprano que conozca cualquiera de
  // los dos. Tomar el más nuevo le regalaría vida extra a la cáscara del
  // jardín cada vez que sincroniza.
  const nacimientos = [a.eclosionadoEn, b.eclosionadoEn].map(Number).filter((n) => n > 0);
  out.eclosionadoEn = nacimientos.length ? Math.min(...nacimientos) : 0;
  out.primeraVez = !!(a.primeraVez && b.primeraVez);
  // Los disfraces encontrados se suman: lo que apareció en el césped de un
  // dispositivo ya es parte de la colección, y no hay forma de "desencontrar".
  out.disfraces = [...new Set([...(a.disfraces || []), ...(b.disfraces || [])])];
  // El que tiene puesto lo decide el último en escribir (viene en `out`), pero
  // no puede quedar puesto algo que no está en la colección fusionada.
  if (out.disfrazPuesto && !out.disfraces.includes(out.disfrazPuesto)) out.disfrazPuesto = null;

  // --- el día ---------------------------------------------------------------
  const diaA = a.dia || '', diaB = b.dia || '';
  const arrastrados = [];
  if (diaA === diaB) {
    out.dia = diaA || null;
    out.hoy = fusionarHoy(a.hoy, b.hoy);
    out.hoyEn = fusionarHoyEn(a.hoyEn, b.hoyEn, out.hoy);
    out.animoHoy = ultimo.animoHoy || viejo.animoHoy || null;
    out.cartaVista = !!(a.cartaVista || b.cartaVista);
  } else {
    // Días distintos: manda el más nuevo. El día del otro no se tira, se cierra
    // y se manda al historial — es progreso real que nadie llegó a archivar.
    const nuevoDia = diaA > diaB ? a : b;
    const otro = nuevoDia === a ? b : a;
    out.dia = nuevoDia.dia || null;
    out.hoy = { ...(nuevoDia.hoy || {}) };
    out.hoyEn = { ...(nuevoDia.hoyEn || {}) };
    out.animoHoy = nuevoDia.animoHoy || null;
    out.cartaVista = !!nuevoDia.cartaVista;
    out.cartaIdx = typeof nuevoDia.cartaIdx === 'number' ? nuevoDia.cartaIdx : -1;
    if (otro.dia) {
      arrastrados.push({ d: otro.dia, animo: otro.animoHoy || null, hechas: contarHechas(otro.hoy) });
    }
  }

  out.historial = fusionarHistorial(a.historial, b.historial, arrastrados);
  // Las secundarias no se archivan al cambiar el día: se unen siempre, sin
  // importar en qué día esté cada dispositivo.
  out.extras = fusionarExtras(a.extras, b.extras);
  // Los pomodoros tampoco se archivan al cambiar el día.
  out.pomodoros = fusionarPomodoros(a.pomodoros, b.pomodoros);
  out.pomo = fusionarPomo(a.pomo, b.pomo);
  // Las medicinas tampoco se archivan al cambiar el día: son el registro, y se
  // unen siempre, esté cada dispositivo en el día que esté.
  out.meds = fusionarMeds(a.meds, b.meds);

  // --- oro: no se puede tomar el máximo -------------------------------------
  // El oro baja al canjear, así que el número en sí no dice quién está más
  // adelantado. Se reconstruye: lo ganado (que sólo sube) menos lo gastado
  // según la lista de canjes ya fusionada.
  out.canjeados = fusionarCanjeados(a.canjeados, b.canjeados);
  const ganado = maxNum(a.oroGanado, b.oroGanado);
  const gastado = out.canjeados.reduce((s, c) => s + costoPremio(c.id), 0);
  out.oroGanado = ganado;
  out.oro = Math.max(0, ganado - gastado);

  // --- compañero -------------------------------------------------------------
  out.bichoNombre = ultimo.bichoNombre || viejo.bichoNombre || null;

  // --- metadatos --------------------------------------------------------------
  out.v = maxNum(a.v, b.v);
  out.seq = Math.max(seqA, seqB) + 1;
  out.guardadoEn = maxNum(a.guardadoEn, b.guardadoEn) || Date.now();

  return out;
}

export {
  fusionar, fusionarHoy, fusionarHoyEn, fusionarExtras, fusionarMeds,
  fusionarHistorial, fusionarCanjeados, contarHechas,
};
