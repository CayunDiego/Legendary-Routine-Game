import { CONFIG } from '../config/config.js';
import { MISIONES } from '../config/misiones.js';
import { ANIMOS } from '../config/animos.js';
import { CARTAS } from '../config/cartas.js';
import { COMPANERO } from '../config/companero.js';
import { EXTRA, FRASES_SIN_EXTRA, FRASES_CON_EXTRA } from '../config/extras.js';
import { POMODORO, FRASES_FOCO, FRASES_PAUSA } from '../config/pomodoro.js';
import { MEDICINAS, TOMAS } from '../config/medicinas.js';

import { TILE } from '../engine/drawing.js';
import { construirTiles } from '../engine/tiles.js';
import { construirObjetos } from '../engine/objetos.js';
import { construirDisfraces } from '../engine/disfraces.js';
import { iniciarAudio, sonar, setSonido } from '../engine/sonido.js';
import {
  conectar, jugadora, bicho, input,
  construirMundo, objetoFrente, ajustarCanvas, actualizarCamara, registrarCola,
  bailar, BAILE, animarEclosionHuevo,
  sentarse, levantarse, estaSentada,
} from '../engine/motor.js';
import { TECLAS_DIR, TECLAS_A, TECLAS_B, TECLAS_MENU, pilaDir, pintarDpad } from '../engine/input.js';
import { $ } from '../dom.js';

import {
  EST, guardar, cargar, chequearDia, alReemplazar,
  misionPorId, hechoHoy, horasDe, contarHechasHoy, progresoDelDia, completarMision,
  horaBonita, fechaHoraBonita,
  extrasDeHoy, cupoExtras, agregarExtra,
  pomodoroEnCurso, pomodorosDeHoy,
  tomasDelDia, tomadasDelDia, medicinaPendiente, marcarMedicina,
  arrancarPomodoro, cortarPomodoro, cerrarFasePomodoro, relojPomodoro,
  etapaBicho, puedeEclosionar, nombreBicho,
  buscarDisfrazEnCesped,
} from '../state/gameLogic.js';
import { pedirPermanencia } from '../state/persistencia.js';
import * as sync from '../state/sync.js';
import {
  getModo, setModo, juegoActivo, setPestana, mostrarRecompensa, dispararFlash, mostrarBanner,
  abrirModal, cerrarModal,
} from '../state/ui.js';
import {
  dialogo, avanzarDialogo, cerrarDialogo, moverOpcion, elegirOpcion, hayOpciones,
  setModoAnterior,
} from '../state/dialogo.js';


/* ============================================================================
 *  INTERACCIONES CON LOS OBJETOS
 * ==========================================================================*/
function interactuar(o) {
  switch (o.accion) {
    case 'mision': accionMision(o.mision); break;
    case 'animo': accionAnimo(); break;
    case 'carta': accionCarta(); break;
    case 'premios': abrirMenu('premios'); break;
    case 'progreso': accionNotebook(); break;
    case 'tele': accionTele(); break;
    case 'companero': accionCompanero(o); break;
    case 'placard': abrirMenu('placard'); break;
    case 'info': accionCartel(); break;
    case 'mesa': accionMesa(); break;
    case 'inodoro': accionInodoro(); break;
    case 'espejo': accionEspejo(); break;
    case 'medicinas': accionPastillero(); break;
    case 'diego': accionDiego(); break;
    case 'compu': accionSilla(o); break;
    case 'sillon': accionSillon(o); break;
  }
}

/* La notebook del cuarto: el progreso y el pomodoro.
   El texto cambia según si hay un pomodoro corriendo, porque la notebook es el
   único lugar del mapa desde donde se lo maneja: si no dijera nada, con el
   reloj andando abrirla parecería no tener nada que ver con el reloj. */
function accionNotebook() {
  const p = progresoDelDia();
  const pomo = pomodoroEnCurso();

  const cabeza = pomo
    ? `💻 Tu notebook\n${POMODORO.icono} ${pomo.fase === 'foco' ? 'Pomodoro andando' : 'Estás en la pausa'}: quedan ${relojPomodoro(pomo.restaMs)}.`
    : `💻 Tu notebook\nLa pantalla muestra todos tus números.\n\nHoy: ${p.hechas}/${p.total} · Nivel ${EST.nivel} · Racha ${EST.racha} 🔥`;

  dialogo([{
    t: cabeza,
    opciones: [
      { txt: 'Ver el progreso', cb: () => abrirMenu('progreso') },
      {
        txt: pomo ? `${POMODORO.icono} Ver el pomodoro` : `${POMODORO.icono} Arrancar un pomodoro`,
        cb: () => abrirMenu('pomodoro'),
      },
      { txt: 'Cerrarla', cb: () => { } }
    ]
  }]);
}

/* --- los asientos ---------------------------------------------------------
 *
 *  Sentarse es del motor (motor.js#sentarse): mueve a Kath a la casilla del
 *  mueble y la dibuja con la hoja de sentada. Lo que agrega juego.js es el
 *  para qué — en la silla, la compu; en el sillón, la tele — y el aviso de
 *  cómo se levanta, que es lo único que no se adivina solo.
 * ------------------------------------------------------------------------- */

/* Cómo levantarse. Va una sola vez por sesión y no en cada diálogo: repetirlo
   cada vez que se sienta lo convierte en un trámite. */
let avisoLevantarse = false;

function comoLevantarse() {
  if (avisoLevantarse) return '';
  avisoLevantarse = true;
  return '\n\n(Para pararte, movete o tocá B.)';
}

/* La silla del escritorio. Sentada queda mirando la notebook, así que desde
   acá el botón A la abre: por eso el diálogo no repite el menú de la compu,
   sólo la sienta y le dice que la tiene enfrente. */
function accionSilla(o) {
  if (!sentarse(o)) return;
  const pomo = pomodoroEnCurso();
  const t = pomo
    ? `Te sentás a la compu.\n${POMODORO.icono} ${pomo.fase === 'foco' ? 'El pomodoro sigue andando' : 'Seguís en la pausa'}: quedan ${relojPomodoro(pomo.restaMs)}.`
    : `Te sentás a la compu.\nLa notebook está justo enfrente: tocá A para abrirla.${comoLevantarse()}`;
  dialogo([{ t }]);
}

/* El sillón del living. Sentarse acá es ponerse a ver la tele, así que arranca
   el mismo noticiero que la tele del cuarto (colaTele) sin tener que ir hasta
   allá. Queda de espaldas, mirando la tele, con el respaldo del sillón
   tapándola de la nuca para abajo (ver `tapa` en config/mapa.js). */
function accionSillon(o) {
  if (!sentarse(o)) return;
  dialogo([
    { t: `Te tirás en el sillón y prendés la tele.${comoLevantarse()}` },
    ...colaTele(),
  ]);
}

/* La tele del cuarto: el resumen del día en tono de noticiero. La cola se arma
   aparte porque la usan dos lugares — la tele colgada del dormitorio y el
   sillón del living, donde Kath se sienta a mirarla. */
function accionTele() {
  dialogo(colaTele());
}

function colaTele() {
  const p = progresoDelDia();
  const hechas = contarHechasHoy();
  let nota;
  if (p.hechas === 0) {
    nota = `"Todavía no hay novedades desde la casa de ${CONFIG.jugadora}. Los analistas coinciden: el día recién arranca y no hay apuro."`;
  } else if (p.hechas === p.total) {
    nota = `"¡ÚLTIMO MOMENTO! ${CONFIG.jugadora} completó las ${MISIONES.length} misiones del día. El país entero está impactado. ${CONFIG.autor} no puede parar de sonreír."`;
  } else if (hechas >= CONFIG.misionesParaRacha) {
    nota = `"${CONFIG.jugadora} lleva ${hechas} misiones completas y la racha asegurada. Fuentes cercanas hablan de una persona imparable."`;
  } else {
    nota = `"${CONFIG.jugadora} avanza con ${p.hechas} de ${p.total} tareas del día. Los expertos recomiendan seguir sin exigirse de más."`;
  }
  const cola = [
    { t: '📺 Están dando Hello Kitty.\nLos dos gatitos se dan un beso. Siempre el mismo, en loop, sin cansarse nunca.\n\nTe queda mirándolo un rato.' },
    { t: `📺 Cambiás de canal. Están dando las noticias.\n\n${nota}` }
  ];
  if (EST.racha > 0) {
    cola.push({ t: `📺 "En deportes: ${EST.racha} ${EST.racha === 1 ? 'día' : 'días'} seguidos de racha. Un récord que sigue creciendo."` });
  }
  cola.push({ t: 'Volvés a poner Hello Kitty. Obvio.' });
  return cola;
}

function accionMision(id) {
  const m = misionPorId(id);
  const hechas = hechoHoy(id);
  if (hechas >= m.veces) {
    dialogo([{ t: `${m.icono}  ${m.nombre}\nYa lo hiciste hoy (${m.veces}/${m.veces}).${cuandoLoHizo(id)}\nDescansá, campeona.` }]);
    return;
  }
  const restante = m.veces > 1 ? `  (${hechas}/${m.veces} hoy)` : '';
  dialogo([{
    t: `${m.icono}  ${m.nombre}${restante}\n¿Lo hiciste?`,
    opciones: [
      { txt: 'Sí, ya está', cb: () => confirmarMision(id) },
      { txt: 'Todavía no', cb: () => dialogo([{ t: 'Cuando puedas. No hay apuro, no hay culpa.' }]) }
    ]
  }]);
}

/* La hora de una misión que ya está cumplida, para el diálogo. Puede no haber
   ninguna —una partida de antes de que se guardara la hora— y entonces no dice
   nada, que es mejor que inventar un horario. */
function cuandoLoHizo(id) {
  const hs = horasDe(id).map(horaBonita);
  if (!hs.length) return '';
  if (hs.length === 1) return `\nFue a las ${hs[0]}.`;
  return `\nA las ${hs.join(' y a las ')}.`;
}

function confirmarMision(id) {
  const r = completarMision(id);
  if (!r) return;
  sonar('ok');
  mostrarRecompensa(r.xp, r.oro);
  const cola = [{ t: `${r.texto}\n\n🕒 ${fechaHoraBonita(r.ts)}`, premio: `+${r.xp} XP   +${r.oro} 💰` }];
  if (!r.completa && r.resta > 0) {
    cola.push({ t: `Te quedan ${r.resta} para completar esta misión hoy.` });
  }
  if (r.subio) {
    const nivelAntes = EST.nivel - r.subio;
    for (let i = 0; i < r.subio; i++) cola.push({ t: `¡SUBISTE AL NIVEL ${EST.nivel - r.subio + i + 1}!\n${fraseNivel(EST.nivel - r.subio + i + 1)}`, fanfarria: true });
    agregarEvolucion(cola, nivelAntes, EST.nivel);
  }
  const p = progresoDelDia();
  if (p.hechas === p.total) {
    cola.push({ t: `¡DÍA COMPLETO!\nHiciste todo lo del día. Estoy muy orgulloso de vos, ${CONFIG.jugadora}. Te merecés todo lo lindo.`, fanfarria: true });
  } else if (contarHechasHoy() === CONFIG.misionesParaRacha) {
    cola.push({ t: `Racha asegurada por hoy 🔥\nLlevás ${EST.racha + 1} ${EST.racha + 1 === 1 ? 'día' : 'días'} seguidos cuidándote.` });
  }
  if (puedeEclosionar()) {
    cola.push({ t: '¡El huevo del jardín se está moviendo!\nAndá a verlo.' });
  }
  dialogo(cola);
}

/* ============================================================================
 *  EL PASTILLERO DE LA COCINA
 *
 *  Las tres tomas del día. Es el registro más importante del juego, así que
 *  interactuar tiene que ser lo más corto posible: A, la toma, listo. La franja
 *  que está abierta ahora va primera en la lista, así casi siempre la opción ya
 *  seleccionada al abrirse el diálogo es la que Kath vino a marcar.
 *
 *  Deshacer NO está acá: vive en la pestaña 💊. Un botón de "me equivoqué"
 *  pegado al de marcar es la forma más fácil de tocar el equivocado justo
 *  cuando importa.
 * ==========================================================================*/
function lineaTomas() {
  return tomasDelDia().map(({ toma, ts }) =>
    `${toma.icono} ${toma.nombre}: ${ts ? horaBonita(ts) : '—'}`).join('\n');
}

function accionPastillero() {
  const pendientes = tomasDelDia().filter((x) => !x.ts).map((x) => x.toma);

  if (!pendientes.length) {
    dialogo([{
      t: `${MEDICINAS.icono} El pastillero\nHoy están las tres tomadas.\n\n${lineaTomas()}\n\nGracias por cuidarte, ${CONFIG.jugadora}.`,
    }]);
    return;
  }

  // La de la franja abierta primero: es la que Kath viene a marcar.
  const ahora = medicinaPendiente();
  const orden = [...pendientes].sort((x, y) =>
    (ahora && y.id === ahora.id ? 1 : 0) - (ahora && x.id === ahora.id ? 1 : 0));

  const encabezado = ahora
    ? `Es la hora de ${ahora.recuerdo}.`
    : 'Todavía te falta alguna.';

  dialogo([{
    t: `${MEDICINAS.icono} El pastillero\n${encabezado}\n\n${lineaTomas()}`,
    opciones: [
      ...orden.map((t) => ({ txt: `${t.icono} ${t.nombre}`, cb: () => confirmarMedicina(t.id) })),
      { txt: 'Ahora no', cb: () => dialogo([{ t: 'Está bien. Cuando la tomes, marcala y queda anotada con la hora.' }]) },
    ],
  }]);
}

function confirmarMedicina(id) {
  const r = marcarMedicina(id);
  if (!r) return;
  sonar('ok');
  if (r.xp) mostrarRecompensa(r.xp, r.oro);

  const faltan = TOMAS.length - tomadasDelDia(r.dia);
  const cola = [{
    t: `${r.toma.icono} ${r.toma.nombre} — anotada.\n\n🕒 ${fechaHoraBonita(r.ts)}`,
    premio: r.xp ? `+${r.xp} XP   +${r.oro} 💰` : null,
  }];
  if (faltan > 0) {
    cola.push({ t: `Te ${faltan === 1 ? 'queda' : 'quedan'} ${faltan} ${faltan === 1 ? 'toma' : 'tomas'} para completar el día.` });
  } else {
    cola.push({ t: `Las tres del día, completas.\nEsto es lo que más me importa que hagas, ${CONFIG.jugadora}.`, fanfarria: true });
  }
  // El día completo puede destrabar un accesorio: es lo que las medicinas pagan
  // en vez de monedas (ver config/disfraces.js).
  if (r.disfraz) agregarHallazgo(cola, r.disfraz);
  if (r.subio) {
    const nivelAntes = EST.nivel - r.subio;
    for (let i = 0; i < r.subio; i++) {
      cola.push({ t: `¡SUBISTE AL NIVEL ${nivelAntes + i + 1}!\n${fraseNivel(nivelAntes + i + 1)}`, fanfarria: true });
    }
    agregarEvolucion(cola, nivelAntes, EST.nivel);
  }
  dialogo(cola);
}

/* Marcar una toma desde la pestaña 💊, que es el otro camino además del
   pastillero. Acá no se abre el diálogo largo —Kath está mirando el registro,
   no hablando con un mueble— pero un accesorio nuevo sí interrumpe: cerrar el
   menú y mostrarlo es la única forma de que se entere, y es el premio de haber
   completado el día. */
function marcarToma(id) {
  const r = marcarMedicina(id);
  if (!r) return null;
  sonar('ok');
  if (r.xp) mostrarRecompensa(r.xp, r.oro);
  if (r.disfraz) {
    cerrarMenu();
    dialogo(agregarHallazgo([], r.disfraz));
  }
  return r;
}

/* Evolución del compañero: se detecta comparando el nivel antes y después de
   ganar XP, no con un flag guardado — así vale para cualquier salto (incluso
   de varios niveles de una) sin acordarse de tocar dos lados. La primera
   etapa (nacer) ya tiene su propio momento en accionCompanero(); acá sólo
   importan las siguientes. */
function agregarEvolucion(cola, nivelAntes, nivelAhora) {
  if (!EST.eclosionado) return;
  COMPANERO.etapas.forEach((e, i) => {
    if (i === 0 || nivelAntes >= e.desde || nivelAhora < e.desde) return;
    sonar('eclosion');
    dispararFlash();
    cola.push({ t: `¡Evolucionó! ✨\nAhora es ${nombreBicho()}.\n${e.desc}`, retrato: i, fanfarria: true });
  });
}

/* Cómo se anuncia un accesorio nuevo, venga del césped o del pastillero: dos
   pantallas, la primera sin decir qué es. Está en un solo lugar porque los dos
   hallazgos tienen que sentirse igual — el del pastillero no es un premio de
   segunda por no haber aparecido en el pasto. */
function agregarHallazgo(cola, d) {
  sonar('eclosion');
  dispararFlash();
  cola.push({ t: `${d.hallazgo}`, fanfarria: true });
  cola.push({
    t: `¡${d.icono} ${d.nombre}!\n${d.desc}\n\nLo guardaste en el placard del cuarto.`,
    fanfarria: true,
  });
  return cola;
}

/* Lo llama el motor cada vez que Kath termina un paso sobre el césped. El
   sorteo y la colección viven en gameLogic; acá sólo queda avisarle. */
function alPisarCesped() {
  const d = buscarDisfrazEnCesped();
  if (!d) return;
  dialogo(agregarHallazgo([], d));
}

function fraseNivel(n) {
  const f = [
    'Cada día que te cuidás, subís un poquito.',
    'Mirá lo que lográs cuando te das lugar.',
    'Nivel nuevo, misma persona increíble.',
    'Esto no es suerte. Es constancia tuya.',
    'Te dije que podías.'
  ];
  return f[n % f.length];
}

function accionAnimo() {
  if (EST.animoHoy) {
    const a = ANIMOS.find(x => x.id === EST.animoHoy);
    dialogo([{ t: `📔 Diario\nHoy anotaste que estabas: ${a.cara} ${a.label}.\n\n${a.resp}` }]);
    return;
  }
  dialogo([{
    t: '📔 Diario\n¿Cómo venís hoy? Contame la verdad, no la versión educada.',
    opciones: ANIMOS.map(a => ({
      txt: `${a.cara} ${a.label}`,
      cb: () => {
        EST.animoHoy = a.id;
        const r = completarMision('animo');
        sonar('ok');
        if (r) mostrarRecompensa(r.xp, r.oro);
        guardar();
        const cola = [{ t: a.resp, premio: r ? `+${r.xp} XP   +${r.oro} 💰` : null }];
        if (r && r.subio) {
          cola.push({ t: `¡SUBISTE AL NIVEL ${EST.nivel}!`, fanfarria: true });
          agregarEvolucion(cola, EST.nivel - r.subio, EST.nivel);
        }
        dialogo(cola);
      }
    }))
  }]);
}

function accionCarta() {
  if (EST.cartaIdx < 0) EST.cartaIdx = Math.floor(Math.random() * CARTAS.length);
  EST.cartaVista = true;
  guardar();
  dialogo([{ t: `💌 Nota de ${CONFIG.autor}\n\n"${CARTAS[EST.cartaIdx]}"`, carta: true }]);
}

/* Diego informa cómo viene el día y toma las misiones secundarias. Lo que dice
   sale del estado, así que cambia solo; para tocar los textos es acá y nada más
   (las frases de las secundarias viven en config/extras.js).

   Las frases rotan en vez de sortearse: con tres o cuatro, Math.random() repite
   la misma dos veces seguidas bastante seguido, y eso se lee como que Diego no
   tiene nada más para decir. */
let diegoIdx = 0;

function accionDiego() {
  const p = progresoDelDia();
  const hechas = contarHechasHoy();
  const faltan = CONFIG.misionesParaRacha - hechas;

  const cola = [];
  if (p.hechas === 0) {
    cola.push({ t: `Hola, ${CONFIG.jugadora}.\nTodavía no arrancaste con nada, y está bien. Empezá por la que menos te cueste.` });
  } else if (p.hechas === p.total) {
    cola.push({ t: `Hiciste TODO, ${CONFIG.jugadora}.\nNo tengo nada para informarte hoy. Andá a descansar.`, fanfarria: true });
  } else if (faltan > 0) {
    cola.push({ t: `Vas ${p.hechas} de ${p.total}.\nCon ${faltan} ${faltan === 1 ? 'misión más' : 'misiones más'} tenés la racha de hoy asegurada.` });
  } else {
    cola.push({ t: `Vas ${p.hechas} de ${p.total} y la racha de hoy ya está.\nLo que hagas de acá en más es ganancia.` });
  }

  if (EST.racha >= 3) {
    cola.push({ t: `Ah, y llevás ${EST.racha} días seguidos 🔥\nQuería que lo supieras.` });
  }
  if (EST.oro >= 30) {
    cola.push({ t: `Tenés ${EST.oro} 💰 juntadas.\nEl puesto de premios está en el living. Yo los cumplo.` });
  }

  /* Las medicinas, de vez en cuando. Sólo si hay una toma pendiente en SU
     franja —o sea, ahora mismo— y ni siquiera siempre: ver MEDICINAS.chanceDiego.
     Diego informa cómo viene el día, no controla la medicación; un recordatorio
     en cada charla se lee como que desconfía. */
  const med = medicinaPendiente();
  if (med && Math.random() < MEDICINAS.chanceDiego) {
    cola.push({ t: `Ah, y una cosa.\n¿Tomaste ${med.recuerdo}? El pastillero está en la mesada de la cocina.` });
  }

  /* La pregunta va siempre última, porque es lo único que espera respuesta: en
     el medio, el resto del informe se leería recién después de haber abierto (o
     cerrado) el formulario. */
  const hoy = extrasDeHoy();
  if (cupoExtras() <= 0) {
    cola.push({
      t: `Ah, y ya me contaste ${hoy.length} ${hoy.length === 1 ? 'cosa' : 'cosas'} por fuera de la lista hoy.\nPor hoy cerramos el cuaderno. Mañana te escucho de nuevo.`,
    });
    dialogo(cola);
    return;
  }

  cola.push({
    t: `¿Hiciste alguna misión secundaria hoy?\nAlgo que no está en la casa, pero que te costó igual.`,
    opciones: [
      { txt: 'Sí, te cuento', cb: () => abrirModal('extra') },
      { txt: 'Hoy no', cb: () => dialogo([{ t: FRASES_SIN_EXTRA[diegoIdx++ % FRASES_SIN_EXTRA.length] }]) },
    ],
  });
  dialogo(cola);
}

/* Lo llama ModalExtra.jsx al tocar "Anotarla". El formulario no toca el estado
   ni festeja: guardar es de gameLogic y el festejo (sonido, la recompensa que
   sube, el diálogo, la subida de nivel) sale de acá, igual que en cualquier
   otra misión. */
function guardarExtra(texto) {
  const r = agregarExtra(texto);
  cerrarModal();
  if (!r) {
    dialogo([{ t: `No me llegó nada escrito, así que no anoté nada.\nVolvé cuando quieras contarme.` }]);
    return;
  }

  sonar('ok');
  mostrarRecompensa(r.xp, r.oro);
  const remate = FRASES_CON_EXTRA[Math.min(r.hoy, FRASES_CON_EXTRA.length) - 1];
  const cola = [{
    t: `${EXTRA.icono} "${r.extra.texto}"\n${remate}\n\n🕒 ${fechaHoraBonita(r.extra.ts)}`,
    premio: `+${r.xp} XP   +${r.oro} 💰`,
  }];
  if (r.subio) {
    const nivelAntes = EST.nivel - r.subio;
    for (let i = 0; i < r.subio; i++) {
      cola.push({ t: `¡SUBISTE AL NIVEL ${nivelAntes + i + 1}!\n${fraseNivel(nivelAntes + i + 1)}`, fanfarria: true });
    }
    agregarEvolucion(cola, nivelAntes, EST.nivel);
  }
  dialogo(cola);
}

/* La mesa de la cocina no da misión ni abre ningún panel: está para que la
   casa se sienta habitada. Lo que hay encima sale del estado, así que la mesa
   "se entera" sola de lo que Kath hizo hoy — las migas aparecen recién cuando
   comió de verdad, no siempre.

   Va rotando en vez de sortear al azar: con `Math.random()` sobre tres frases
   se repite la misma dos y tres veces seguidas bastante seguido, y eso se lee
   como que el juego no tiene nada más para decir. */
const MESA_DIBUJO = [
  '🍽️ La mesa de la cocina\n\nHay hojas y lápices de colores desparramados.\nSe ve que estuviste haciendo un lindo dibujo.',
  '🍽️ La mesa de la cocina\n\nUn dibujo a medio terminar y el lápiz naranja gastado hasta la mitad.\nEse color siempre se termina primero.',
  '🍽️ La mesa de la cocina\n\nQuedó un dibujo apoyado ahí.\nTe lo quedás mirando un rato. Está bueno.',
];

const MESA_COMIO = [
  '🍽️ La mesa de la cocina\n\nHay migas y un plato sin lavar.\nParece que alguien comió acá hace un rato.',
  '🍽️ La mesa de la cocina\n\nUna taza todavía tibia y unas migas al costado.\nAlguien pasó por acá.',
];

let mesaIdx = 0;

function accionMesa() {
  // Sin haber comido no hay migas que valgan: eso lo notaría enseguida.
  const cola = hechoHoy('comer') > 0 ? [...MESA_COMIO, ...MESA_DIBUJO] : MESA_DIBUJO;
  dialogo([{ t: cola[mesaIdx++ % cola.length] }]);
}

/* El inodoro tampoco da misión: es un chiste con premio. La gracia es que se
   llega de casualidad, buscando otra cosa, y lo que devuelve no es un chiste
   de baño. Es una sola frase a propósito — con varias, la sorpresa se gasta. */
function accionInodoro() {
  dialogo([{
    t: `🚽 El inodoro\n\nBrilla tanto que te ves reflejada.\nY ya que estamos: estás hermosa, ${CONFIG.jugadora}.`,
  }]);
}

/* El espejo del baño. Ninguna frase nombra a nadie ni viene firmada: no es
   alguien diciéndole que está linda, es ella mirándose.

   El emoji del espejo es el de las chispas y NO el de un espejo de verdad
   (U+1FA9E): ese es de Emoji 13 y la fuente de emojis de Windows 10 no lo
   trae, así que sale un cuadrado. Es el mismo bloque U+1FA70..U+1FAFF que ya
   se comió tres emojis del juego (ver docs/deuda-tecnica.md). Los codepoints
   van escritos y no dibujados a propósito: son justamente los que no se ven.
   El smoke tiene un paso que revisa el bloque entero, así que no hace falta
   acordarse: si alguien mete uno nuevo de ahí, falla.

   Hoy hay una sola, y la lista queda igual: para sumar más con el tiempo
   alcanza con escribirlas acá abajo. Rotan solas, sin tocar nada más. */
const ESPEJO = [
  `✨ El espejo\n\nTe quedás mirándote.\nEsa sonrisa. Esos ojos.\nTu carita es una obra de arte.`,
];

let espejoIdx = 0;

function accionEspejo() {
  dialogo([{ t: ESPEJO[espejoIdx++ % ESPEJO.length] }]);
}

function accionCartel() {
  dialogo([
    { t: `🏠 "Casa de ${CONFIG.jugadora}"\nCada cosa de la casa es una misión del día. Acercate y tocá A.` },
    { t: 'Las misiones dan XP y monedas. Las monedas se cambian por premios reales en el puesto del living.' },
    { t: `Si hacés ${CONFIG.misionesParaRacha} misiones en el día, mantenés la racha 🔥` }
  ]);
}

function accionCompanero(o) {
  if (puedeEclosionar()) {
    EST.eclosionado = true;
    EST.eclosionadoEn = Date.now();
    guardar();
    sonar('eclosion');
    dispararFlash();
    // El bicho no se prende acá: nace adentro del huevo, y lo hace visible
    // el motor cuando la cáscara se abre (ver animarEclosionHuevo).
    animarEclosionHuevo(o.x, o.y);
    dialogo([
      { t: '¡El huevo se está rompiendo!', fanfarria: true },
      { t: `¡Nació ${COMPANERO.etapas[0].nombre}!\n${COMPANERO.etapas[0].desc}` },
      { t: 'Va a crecer con vos: cada nivel tuyo también es suyo.' }
    ]);
    return;
  }
  if (!EST.eclosionado) {
    const faltan = COMPANERO.nivelEclosion - EST.nivel;
    dialogo([{ t: `🥚 Un huevo tibio.\nParece que necesita más energía para nacer.\n\nLe faltan ${faltan} ${faltan === 1 ? 'nivel' : 'niveles'} tuyos.` }]);
    return;
  }
  const et = etapaBicho();
  const e = COMPANERO.etapas[et];
  const sig = COMPANERO.etapas[et + 1];
  const cola = [{ t: `${nombreBicho()} (etapa ${et + 1})\n${e.desc}` }];
  if (sig) cola.push({ t: `Va a evolucionar cuando llegues al nivel ${sig.desde}. Te faltan ${sig.desde - EST.nivel}.` });
  else cola.push({ t: 'Llegó a su forma final. Eso lo hiciste vos, día por día.' });
  dialogo(cola);
}


/* ============================================================================
 *  POMODORO
 *
 *  El estado y el reloj viven en gameLogic (que no espera: mira la hora). Acá
 *  está el único latido que lo consulta, y lo que pasa cuando una fase cierra.
 *
 *  El latido es un setInterval y NO el bucle de render a propósito: el bucle se
 *  frena solo cuando la pestaña deja de estar visible, que es justo el rato en
 *  que Kath está trabajando con la pantalla apagada. Un segundo alcanza y
 *  sobra — cerrarFasePomodoro() sale enseguida si no venció nada.
 * ==========================================================================*/

/* Lo que Kath elige en la pestaña. Cuando arranca un pomodoro estando parada
   frente a la silla, se sienta sola: "arrancar a trabajar" y "sentarse a la
   compu" son la misma cosa, y hacérselo hacer a mano es un paso de más. */
function empezarPomodoro(ratoId) {
  const pomo = arrancarPomodoro(ratoId);
  sonar('ok');
  cerrarMenu();
  const silla = objetoFrente();
  if (silla && silla.accion === 'compu') sentarse(silla);
  dialogo([{
    t: `${POMODORO.icono} ${pomo.rato.label} · ${pomo.rato.foco} minutos.\nArrancá. Yo te aviso cuando se termine.`,
  }]);
  return pomo;
}

function frenarPomodoro() {
  if (!cortarPomodoro()) return;
  sonar('menu');
  dialogo([{ t: `${POMODORO.icono} Cortado.\nNo pasa nada: el rato que estuviste igual lo estuviste.` }]);
}

/* Momentos en los que el aviso del pomodoro NO puede aparecer: el festejo se
   muestra con dialogo(), y dialogo() se lleva puesto lo que hubiera abierto.
   En la portada saldría antes de empezar a jugar; encima del formulario de las
   secundarias le borraría a Kath lo que está escribiendo; y arriba de otro
   diálogo le cortaría la frase por la mitad.

   No se pierde nada: la fase no se cierra y el latido de un segundo después lo
   vuelve a intentar. El reloj sigue siendo la hora, así que esperar no le mueve
   un minuto a nada. */
const MODOS_SIN_AVISO = ['titulo', 'modal', 'dialogo'];

/* Corre una vez por segundo. Casi siempre no hace nada. */
function revisarPomodoro() {
  if (MODOS_SIN_AVISO.includes(getModo())) return;
  const ev = cerrarFasePomodoro();
  if (!ev) return;

  // Un pomodoro que venció hace horas no se festeja: Kath no estaba (ver
  // GRACIA_POMO_MS). Se lo lleva el cierre y no se dice nada.
  if (ev.abandonado) return;

  if (ev.fase === 'pausa') {
    sonar('finPausa');
    mostrarBanner(`${POMODORO.icono} ${FRASES_PAUSA[pomodorosDeHoy().length % FRASES_PAUSA.length]}`, 6000);
    return;
  }

  // Terminó un bloque de foco: se para de la silla sola. La pausa es pararse.
  levantarse();
  sonar('finFoco');
  if (ev.pago) mostrarRecompensa(ev.reg.xp, ev.reg.oro);

  const remate = FRASES_FOCO[Math.min(ev.hoy, FRASES_FOCO.length) - 1];
  const cola = [{
    t: `${POMODORO.icono} ¡${ev.rato.foco} minutos de foco!\n${remate}\n\nAhora ${ev.rato.pausa} de pausa.`,
    premio: ev.pago ? `+${ev.reg.xp} XP   +${ev.reg.oro} 💰` : null,
    fanfarria: true,
  }];
  if (!ev.pago) {
    cola.push({ t: `Por hoy ya cobraste ${POMODORO.porDia} pomodoros, así que este no paga.\nSeguí usándolo igual: para eso está.` });
  }
  if (ev.subio) {
    const nivelAntes = EST.nivel - ev.subio;
    for (let i = 0; i < ev.subio; i++) {
      cola.push({ t: `¡SUBISTE AL NIVEL ${nivelAntes + i + 1}!\n${fraseNivel(nivelAntes + i + 1)}`, fanfarria: true });
    }
    agregarEvolucion(cola, nivelAntes, EST.nivel);
  }
  dialogo(cola);
}


/* ============================================================================
 *  MENÚ  (la interfaz la dibuja components/Menu/Menu.jsx)
 * ==========================================================================*/
function abrirMenu(p) {
  setPestana(p || 'misiones');
  setModo('menu');
  setModoAnterior('menu');
  sonar('menu');
}

function cerrarMenu() {
  setModo('juego');
  input.dir = -1;
  guardar();
}


/* --- controles ----------------------------------------------------------- */

/* Dos toques seguidos de A sin nada enfrente y Kath se pone a bailar. Va acá y
   no en el teclado porque el botón A de la pantalla entra por la misma puerta.
   Si hay algo enfrente manda la interacción: el doble toque sería abrir dos
   veces el mismo diálogo. */
const DOBLE_A_MS = 400;
let ultimaA = 0;

function pulsarA() {
  iniciarAudio();
  // Con el formulario abierto los botones no hacen nada: Kath está escribiendo,
  // y un A de más abriría el mueble que tenga enfrente por debajo del modal.
  if (getModo() === 'modal') return;
  if (getModo() === 'dialogo') { avanzarDialogo(); return; }
  if (getModo() === 'menu') return;
  if (getModo() === 'titulo') { empezar(); return; }
  const o = objetoFrente();
  // Sentada en la silla tiene la notebook enfrente, así que A la sigue
  // abriendo. El único caso raro sería volver a tocar el asiento estando
  // sentada encima, y eso no pasa: el asiento le queda abajo, no adelante.
  if (o) { ultimaA = 0; sonar('menu'); interactuar(o); return; }

  // Sentada y sin nada enfrente (el sillón), A la para. Sin esto el doble
  // toque la pondría a bailar sentada, que es exactamente lo que se ve.
  if (estaSentada()) { ultimaA = 0; levantarse(); return; }

  const ahora = Date.now();
  if (ahora - ultimaA <= DOBLE_A_MS) { ultimaA = 0; bailar(BAILE.vueltas); }
  else ultimaA = ahora;
}

function pulsarB() {
  iniciarAudio();
  if (getModo() === 'modal') { cerrarModal(); return; }
  if (getModo() === 'dialogo') { cerrarDialogo(); return; }
  if (getModo() === 'menu') { cerrarMenu(); return; }
  // Pararse le gana a abrir el menú: B es "volver", y estando sentada lo que
  // se quiere dejar es la silla, no la pantalla.
  if (getModo() === 'juego' && estaSentada()) { levantarse(); return; }
  if (getModo() === 'juego') abrirMenu('misiones');
}

/* Devuelve la función para desengancharse: la usa useInput() al desmontar. */
function armarTeclado() {
  const alBajar = e => {
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;

    const d = TECLAS_DIR[e.code];
    if (d !== undefined) {
      e.preventDefault();
      if (e.repeat) return;
      // durante un diálogo con opciones, las flechas eligen
      if (hayOpciones() && (d === 0 || d === 3)) { moverOpcion(d === 0 ? 1 : -1); return; }
      if (!pilaDir.includes(d)) pilaDir.push(d);
      input.dir = d;
      pintarDpad();
      return;
    }

    // elegir opción con 1-5
    if (hayOpciones() && /^(Digit|Numpad)[1-5]$/.test(e.code)) {
      e.preventDefault();
      elegirOpcion(parseInt(e.code.slice(-1), 10) - 1);
      return;
    }

    if (TECLAS_A.includes(e.code)) {
      e.preventDefault();
      if (e.repeat) return;           // sin esto, dejar apretada la tecla se come los diálogos
      $('botA').classList.add('presionado');
      pulsarA();
      return;
    }
    if (TECLAS_B.includes(e.code)) {
      e.preventDefault();
      if (e.repeat) return;
      $('botB').classList.add('presionado');
      pulsarB();
      return;
    }
    if (TECLAS_MENU.includes(e.code)) {
      e.preventDefault();
      if (e.repeat) return;
      if (getModo() === 'menu') cerrarMenu();
      else if (getModo() === 'juego') { iniciarAudio(); abrirMenu('misiones'); }
    }
  };

  const alSubir = e => {
    const d = TECLAS_DIR[e.code];
    if (d !== undefined) {
      const i = pilaDir.indexOf(d);
      if (i >= 0) pilaDir.splice(i, 1);
      input.dir = pilaDir.length ? pilaDir[pilaDir.length - 1] : -1;
      pintarDpad();
    }
    if (TECLAS_A.includes(e.code)) $('botA').classList.remove('presionado');
    if (TECLAS_B.includes(e.code)) $('botB').classList.remove('presionado');
  };

  addEventListener('keydown', alBajar);
  addEventListener('keyup', alSubir);
  return () => {
    removeEventListener('keydown', alBajar);
    removeEventListener('keyup', alSubir);
  };
}



/* --- pantalla de título -------------------------------------------------- */
function empezar() {
  iniciarAudio();
  // El fundido y el display:none los maneja TituloScreen.jsx mirando el modo.
  setModo('juego');
  if (EST.primeraVez) {
    EST.primeraVez = false;
    // Ya está viendo el juego tal cual es hoy: no hace falta avisarle además
    // que "hay algo nuevo".
    EST.versionVista = CONFIG.version;
    guardar();
    dialogo([
      { t: `Hola, ${CONFIG.jugadora}.`, fanfarria: true },
      { t: `Te hice esto para que los días pesen un poco menos.\nCada cosa de la casa es una misión: acercate y tocá A.` },
      { t: 'Hacé las que puedas. Ganás XP, subís de nivel y juntás monedas.' },
      { t: `Las monedas se cambian por premios de verdad en el puesto del living. Yo los cumplo.` },
      { t: 'En el jardín hay un huevo. Va a nacer cuando llegues al nivel 3.' },
      { t: `Con ${CONFIG.misionesParaRacha} misiones por día mantenés la racha 🔥\nY si un día no podés, no pasa nada. En serio.` },
      { t: `Te quiero mucho.\n— ${CONFIG.autor}`, carta: true }
    ]);
  } else {
    if (EST.versionVista !== CONFIG.version) {
      EST.versionVista = CONFIG.version;
      guardar();
      mostrarBanner('✨ Hay algo nuevo en el juego');
    }

    const p = progresoDelDia();
    if (p.hechas === 0) {
      const saludo = new Date().getHours() < 12 ? 'Buen día' : (new Date().getHours() < 20 ? 'Buenas tardes' : 'Buenas noches');
      dialogo([{ t: `${saludo}, ${CONFIG.jugadora}.\n${EST.racha > 0 ? `Llevás ${EST.racha} ${EST.racha === 1 ? 'día' : 'días'} de racha 🔥 No la sueltes.` : 'Hoy arrancamos de nuevo. Una misión ya es suficiente.'}` }]);
    }
  }
}


/* ============================================================================
 *  ARRANQUE
 * ==========================================================================*/

/* Prepara el mundo y el estado. Lo llama App.jsx una sola vez, después de que
   React montó el árbol. El bucle de render no arranca acá: lo prende
   useGameLoop() cuando terminaron de cargar las hojas de sprites. */
let arrancado = false;

function iniciar() {
  if (arrancado) return;
  arrancado = true;

  // El motor dibuja las burbujas de estado sobre los objetos y frena el
  // movimiento fuera del juego, así que necesita consultar esto de acá.
  conectar({
    juegoActivo, misionPorId, hechoHoy, puedeEclosionar, etapaBicho, alPisarCesped,
    estado: () => EST,
    /* Para el reloj grande que el motor le dibuja abajo mientras trabaja
       (motor.js#dibujarPomodoroGrande). Se le pasa masticado —el mm:ss ya
       escrito y la fracción que queda— porque el motor no puede importar
       gameLogic. */
    pomodoro: () => {
      const p = pomodoroEnCurso();
      return p && { fase: p.fase, txt: relojPomodoro(p.restaMs), parte: p.restaMs / p.largoMs };
    },
    /* La burbuja del pastillero. Se prende sólo mientras la franja está abierta
       y la toma sin marcar: fuera de eso el pastillero se ve como cualquier
       mueble, que es lo que lo separa de un cartel prendido todo el día. */
    medicinaPendiente: () => !!medicinaPendiente(),
  });

  construirTiles();
  construirObjetos();
  construirDisfraces();
  construirMundo();

  cargar();
  setSonido(EST.sonido);
  chequearDia();
  if (EST.cartaIdx < 0) EST.cartaIdx = Math.floor(Math.random() * CARTAS.length);

  jugadora.px = jugadora.tx * TILE;
  jugadora.py = jugadora.ty * TILE;
  registrarCola(); registrarCola(); registrarCola();
  if (EST.eclosionado) {
    bicho.visible = true;
    bicho.px = jugadora.px; bicho.py = jugadora.py;
  }

  /* Cuando la partida se cambia entera de golpe — al restaurar una copia o al
     fusionar con la nube — hay cosas que no viven en EST y quedarían viejas.
     El compañero es la que se nota: eclosionó en la tablet y acá el bicho
     seguiría invisible hasta recargar. */
  alReemplazar((est) => {
    setSonido(est.sonido);
    if (est.eclosionado && !bicho.visible) {
      bicho.visible = true;
      bicho.px = jugadora.px; bicho.py = jugadora.py;
    }
  });

  // Le pide al navegador que no borre solo el guardado si le falta espacio.
  // Si dice que no, el juego sigue igual: es una mejora, no un requisito.
  pedirPermanencia();
  sync.arrancar();

  ajustarCanvas();
  actualizarCamara(true);

  /* El latido del pomodoro. Un segundo: cerrarFasePomodoro() sale en dos
     comparaciones si no venció nada, y así el aviso llega cuando se termina y
     no hasta un minuto después. */
  setInterval(revisarPomodoro, 1000);

  // si el teléfono estuvo dormido y cambió el día, refrescamos
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    /* El navegador frena o ralentiza los setInterval de una pestaña escondida,
       que es justo lo que pasa mientras Kath trabaja con la pantalla apagada.
       Al volver hay que cerrar a mano lo que venció mientras tanto, sin
       esperar al próximo latido. */
    revisarPomodoro();
    if (chequearDia()) {
      dialogo([{ t: `Día nuevo, ${CONFIG.jugadora}.
Las misiones se reiniciaron. ${EST.racha > 0 ? `Racha: ${EST.racha} 🔥` : ''}` }]);
    }
  });

  // evita el scroll y el zoom con dos dedos
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());

  // Sólo en la build de producción: si el service worker cachea en desarrollo
  // se queda con los módulos viejos y el recargado en caliente de Vite deja de
  // andar. En el juego publicado se comporta igual que antes.
  if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  }
}

export {
  iniciar, empezar, pulsarA, pulsarB, abrirMenu, cerrarMenu, armarTeclado, dialogo,
  marcarToma,
  guardarExtra,
  empezarPomodoro, frenarPomodoro, revisarPomodoro,
};
