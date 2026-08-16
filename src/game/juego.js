import { CONFIG } from '../config/config.js';
import { MISIONES } from '../config/misiones.js';
import { ANIMOS } from '../config/animos.js';
import { CARTAS } from '../config/cartas.js';
import { COMPANERO } from '../config/companero.js';

import { TILE } from '../engine/drawing.js';
import { construirTiles } from '../engine/tiles.js';
import { construirObjetos } from '../engine/objetos.js';
import { iniciarAudio, sonar, setSonido } from '../engine/sonido.js';
import {
  conectar, jugadora, bicho, input,
  construirMundo, objetoFrente, ajustarCanvas, actualizarCamara, registrarCola,
  bailar, BAILE,
} from '../engine/motor.js';
import { TECLAS_DIR, TECLAS_A, TECLAS_B, TECLAS_MENU, pilaDir, pintarDpad } from '../engine/input.js';
import { $ } from '../dom.js';

import {
  EST, guardar, cargar, chequearDia, alReemplazar,
  misionPorId, hechoHoy, contarHechasHoy, progresoDelDia, completarMision,
  etapaBicho, puedeEclosionar, nombreBicho,
} from '../state/gameLogic.js';
import { pedirPermanencia } from '../state/persistencia.js';
import * as sync from '../state/sync.js';
import {
  getModo, setModo, juegoActivo, setPestana, mostrarRecompensa, dispararFlash, mostrarBanner,
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
    case 'companero': accionCompanero(); break;
    case 'info': accionCartel(); break;
    case 'diego': accionDiego(); break;
  }
}

/* La notebook del cuarto: abre el panel de progreso */
function accionNotebook() {
  const p = progresoDelDia();
  dialogo([{
    t: `💻 Tu notebook\nLa pantalla muestra todos tus números.\n\nHoy: ${p.hechas}/${p.total} · Nivel ${EST.nivel} · Racha ${EST.racha} 🔥`,
    opciones: [
      { txt: 'Ver el progreso', cb: () => abrirMenu('progreso') },
      { txt: 'Cerrarla', cb: () => { } }
    ]
  }]);
}

/* La tele del cuarto: el resumen del día en tono de noticiero */
function accionTele() {
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
  dialogo(cola);
}

function accionMision(id) {
  const m = misionPorId(id);
  const hechas = hechoHoy(id);
  if (hechas >= m.veces) {
    dialogo([{ t: `${m.icono}  ${m.nombre}\nYa lo hiciste hoy (${m.veces}/${m.veces}). Descansá, campeona.` }]);
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

function confirmarMision(id) {
  const r = completarMision(id);
  if (!r) return;
  sonar('ok');
  mostrarRecompensa(r.xp, r.oro);
  const cola = [{ t: r.texto, premio: `+${r.xp} XP   +${r.oro} 💰` }];
  if (!r.completa && r.resta > 0) {
    cola.push({ t: `Te quedan ${r.resta} para completar esta misión hoy.` });
  }
  if (r.subio) {
    for (let i = 0; i < r.subio; i++) cola.push({ t: `¡SUBISTE AL NIVEL ${EST.nivel - r.subio + i + 1}!\n${fraseNivel(EST.nivel - r.subio + i + 1)}`, fanfarria: true });
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
        if (r && r.subio) cola.push({ t: `¡SUBISTE AL NIVEL ${EST.nivel}!`, fanfarria: true });
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

/* Diego informa cómo viene el día. Lo que dice sale del estado, así que cambia
   solo; para tocar los textos, es acá y nada más. */
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
    cola.push({ t: `Tenés ${EST.oro} 💰 juntadas.\nEl puesto de premios está acá al lado. Yo los cumplo.` });
  }
  dialogo(cola);
}

function accionCartel() {
  dialogo([
    { t: `🏠 "Casa de ${CONFIG.jugadora}"\nCada cosa de la casa es una misión del día. Acercate y tocá A.` },
    { t: 'Las misiones dan XP y monedas. Las monedas se cambian por premios reales en el puesto del living.' },
    { t: `Si hacés ${CONFIG.misionesParaRacha} misiones en el día, mantenés la racha 🔥` }
  ]);
}

function accionCompanero() {
  if (puedeEclosionar()) {
    EST.eclosionado = true;
    bicho.visible = true;
    bicho.px = jugadora.px; bicho.py = jugadora.py;
    guardar();
    sonar('eclosion');
    dispararFlash();
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
  if (getModo() === 'dialogo') { avanzarDialogo(); return; }
  if (getModo() === 'menu') return;
  if (getModo() === 'titulo') { empezar(); return; }
  const o = objetoFrente();
  if (o) { ultimaA = 0; sonar('menu'); interactuar(o); return; }

  const ahora = Date.now();
  if (ahora - ultimaA <= DOBLE_A_MS) { ultimaA = 0; bailar(BAILE.vueltas); }
  else ultimaA = ahora;
}

function pulsarB() {
  iniciarAudio();
  if (getModo() === 'dialogo') { cerrarDialogo(); return; }
  if (getModo() === 'menu') { cerrarMenu(); return; }
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
    juegoActivo, misionPorId, hechoHoy, puedeEclosionar, etapaBicho,
    estado: () => EST,
  });

  construirTiles();
  construirObjetos();
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

  // si el teléfono estuvo dormido y cambió el día, refrescamos
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && chequearDia()) {
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

export { iniciar, empezar, pulsarA, pulsarB, abrirMenu, cerrarMenu, armarTeclado, dialogo };
