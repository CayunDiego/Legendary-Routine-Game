/* Arranca el juego con un DOM simulado y dispara eventos reales (clics, teclas)
   para recorrer menú, diálogos e interacciones. No dibuja nada: sólo buscamos
   que ninguna ruta tire ReferenceError después de partir el monolito.

   Correr con:  node smoke.mjs   */

const noop = () => {};
const fallos = [];

function ctxStub() {
  return new Proxy({}, {
    get(t, p) {
      if (p === 'canvas') return { width: 400, height: 600 };
      if (p === 'createImageData' || p === 'getImageData')
        return () => ({ data: new Uint8ClampedArray(4 * 64 * 64), width: 64, height: 64 });
      if (p === 'measureText') return () => ({ width: 10 });
      // el aura de XP arma un gradiente y le pide addColorStop al resultado
      if (p === 'createRadialGradient' || p === 'createLinearGradient')
        return () => ({ addColorStop: noop });
      if (p in t) return t[p];
      return noop;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}

/* Elemento con listeners de verdad, para poder dispararlos después. */
function elStub(id, cls = '') {
  const oyentes = new Map();
  const el = {
    id, className: cls,
    style: new Proxy({}, { get: (t, p) => t[p] ?? '', set: (t, p, v) => (t[p] = v, true) }),
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    dataset: { p: 'misiones' },
    textContent: '', innerHTML: '', value: '', checked: false,
    width: 400, height: 600, clientWidth: 400, clientHeight: 600,
    tagName: 'DIV',
    addEventListener(t, fn) { if (!oyentes.has(t)) oyentes.set(t, []); oyentes.get(t).push(fn); },
    removeEventListener: noop,
    appendChild: (c) => c,
    removeChild: noop, remove: noop,
    querySelector: () => elStub('q'),
    querySelectorAll: () => [],
    getContext: () => ctxStub(),
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 400, height: 600, top: 0, left: 0 }),
    focus: noop, closest: () => null,
    _fire(tipo, evt = {}) {
      const e = { preventDefault: noop, stopPropagation: noop, target: el, ...evt };
      for (const fn of oyentes.get(tipo) || []) fn(e);
      const prop = el['on' + tipo];
      if (typeof prop === 'function') prop(e);
    },
  };
  return el;
}

const cache = new Map();
const oyentesDoc = new Map();

/* Las pestañas del menú, para poder clickearlas. */
const tabs = ['misiones', 'progreso', 'pomodoro', 'premios', 'compa', 'placard', 'ajustes'].map((p) => {
  const t = elStub('tab-' + p, 'tab');
  t.dataset = { p };
  return t;
});

globalThis.document = {
  readyState: 'complete',
  visibilityState: 'visible',
  documentElement: elStub('html'),
  body: elStub('body'),
  getElementById(id) {
    if (!cache.has(id)) cache.set(id, elStub(id));
    return cache.get(id);
  },
  createElement: (tag) => elStub(tag),
  querySelector: () => elStub('q'),
  querySelectorAll: (sel) => (sel === '.tab' ? tabs : []),
  addEventListener(t, fn) { if (!oyentesDoc.has(t)) oyentesDoc.set(t, []); oyentesDoc.get(t).push(fn); },
  removeEventListener: noop,
};

globalThis.window = globalThis;
const oyentesWin = new Map();
globalThis.addEventListener = (t, fn) => {
  if (!oyentesWin.has(t)) oyentesWin.set(t, []);
  oyentesWin.get(t).push(fn);
};
globalThis.removeEventListener = noop;
/* storage.persist() y onLine los usan persistencia.js y sync.js. Devolver que
   no hay permanencia y que sí hay red es el caso normal de un navegador. */
Object.defineProperty(globalThis, 'navigator', {
  value: {
    userAgent: 'node', maxTouchPoints: 0, onLine: true,
    storage: { persisted: async () => false, persist: async () => false },
  },
  configurable: true, writable: true,
});
globalThis.location = { protocol: 'http:', href: 'http://localhost/', reload: noop };
globalThis.devicePixelRatio = 1;
globalThis.innerWidth = 400;
globalThis.innerHeight = 700;

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

globalThis.Image = class {
  constructor() { this.width = 96; this.height = 128; }
  set src(v) { this._src = v; setTimeout(() => this.onload && this.onload(), 0); }
  get src() { return this._src; }
};

globalThis.AudioContext = class {
  constructor() { this.destination = {}; this.currentTime = 0; this.state = 'running'; }
  createOscillator() { return { connect: noop, start: noop, stop: noop, frequency: { value: 0, setValueAtTime: noop }, type: '' }; }
  createGain() { return { connect: noop, gain: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop } }; }
  resume() {}
};

let frames = 0, seguirBucle = true;
globalThis.requestAnimationFrame = (fn) => {
  if (!seguirBucle || frames++ > 40) return 0;
  setTimeout(() => fn(frames * 16), 0);
  return frames;
};

function paso(nombre, fn) {
  try { fn(); console.log(`  ok   ${nombre}`); }
  catch (e) { fallos.push([nombre, e]); console.log(`  FALLA ${nombre}  -> ${e.message}`); }
}

/* Igual que paso() pero espera. Las pruebas de la nube son todas asíncronas y
   con paso() a secas un rechazo se perdería sin marcar la falla. */
async function paso2(nombre, fn) {
  try { await fn(); console.log(`  ok   ${nombre}`); }
  catch (e) { fallos.push([nombre, e]); console.log(`  FALLA ${nombre}  -> ${e.message}`); }
}

const teclaDoc = (code) => {
  for (const fn of oyentesWin.get('keydown') || [])
    fn({ code, repeat: false, target: { tagName: 'BODY' }, preventDefault: noop });
  for (const fn of oyentesWin.get('keyup') || [])
    fn({ code, target: { tagName: 'BODY' }, preventDefault: noop });
};

const { createServer } = await import('vite');
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const mod = await vite.ssrLoadModule('/src/game/juego.js');
const motor = await vite.ssrLoadModule('/src/engine/motor.js');
const dlg = await vite.ssrLoadModule('/src/state/dialogo.js');
const uiSt = await vite.ssrLoadModule('/src/state/ui.js');
const logica = await vite.ssrLoadModule('/src/state/gameLogic.js');
const zonaMerli = await vite.ssrLoadModule('/src/config/merli.js');
const paseoCfg = await vite.ssrLoadModule('/src/config/diego.js');
console.log('modulo importado, exports:', Object.keys(mod), '\n');

/* config.js trae la URL del Worker de verdad, que es lo que necesita el juego
   publicado. Acá se apaga ANTES de iniciar(): un test no puede depender de que
   haya internet ni escribir en la base de producción. Más abajo se vuelve a
   prender, pero apuntando al Worker corriendo en este mismo proceso. */
const cfg = (await vite.ssrLoadModule('/src/config/config.js')).CONFIG;
const cfgDisfraces = await vite.ssrLoadModule('/src/config/disfraces.js');
const { DISFRACES } = cfgDisfraces;
const DEL_CESPED = cfgDisfraces.DISFRACES_CESPED;
const DE_MEDICINAS = cfgDisfraces.DISFRACES_MEDICINAS;
cfg.nube = '';

paso('montarCanvas + iniciar()', () => {
  motor.montarCanvas(cache.get('lienzo') || document.getElementById('lienzo'));
  mod.iniciar();
});
paso('cargar sprites + arrancar bucle', () => motor.cargarSprite(() => motor.arrancarBucle()));
paso('armarTeclado()', () => { const off = mod.armarTeclado(); if (typeof off !== 'function') throw new Error('no devolvio limpieza'); });

await new Promise((r) => setTimeout(r, 120));   // deja correr el bucle de render

paso('bucle de render', () => { if (frames < 2) throw new Error(`solo corrio ${frames} frames`); });
paso('empezar()  (portada -> juego)', () => mod.empezar());

const el = (id) => cache.get(id);

paso('mover con teclado (flechas + WASD)', () => ['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].forEach(teclaDoc));
paso('boton A (interactuar)', () => mod.pulsarA());
paso('boton B', () => mod.pulsarB());
paso('abrir menu', () => mod.abrirMenu('misiones'));

for (const t of tabs) paso(`pestana "${t.dataset.p}"`, () => uiSt.setPestana(t.dataset.p));

paso('casilla de sonido', () => { const c = el('chkSonido'); if (c) { c.checked = false; c._fire('change', { target: { checked: false } }); } });
paso('cerrar menu', () => mod.cerrarMenu());
paso('tecla M (menu)', () => teclaDoc('KeyM'));
paso('tecla Z (aceptar)', () => teclaDoc('KeyZ'));
paso('tecla X (volver)', () => teclaDoc('KeyX'));
paso('abrir dialogo con opciones', () => mod.dialogo([{ t: 'hola', opciones: [{ txt: 'a', cb: () => {} }, { txt: 'b', cb: () => {} }] }]));
paso('mover opcion con flechas', () => dlg.moverOpcion(1));
paso('avanzar dialogo', () => dlg.avanzarDialogo());
paso('dialogo con premio y fanfarria', () => mod.dialogo([{ t: 'x', premio: '+1 XP', fanfarria: true }, { t: 'y', carta: true }]));
paso('cerrar dialogo', () => dlg.cerrarDialogo());

/* Novedades: el cartelito de "hay algo nuevo" arriba a la derecha. No pide
   ningún toque (a diferencia de dialogo()), así que lo que hay que probar es
   que EST.versionVista se ponga al día y que una partida nueva, que ya lo vio
   todo en la bienvenida, no lo vea aparte. */
const igualNov = (a, b, q) => { if (a !== b) throw new Error(`${q}: esperaba ${b}, hubo ${a}`); };

paso('novedades: la bienvenida de una partida nueva ya la deja vista', () => {
  igualNov(logica.EST.versionVista, cfg.version, 'versionVista tras la bienvenida');
  igualNov(uiSt.getBanner(), null, 'no aparece el cartelito en la bienvenida');
});

paso('novedades: una partida existente que no la vio, la ve una vez al volver', () => {
  logica.EST.versionVista = null;   // como si fuera de antes de que existiera el campo
  mod.empezar();
  igualNov(logica.EST.versionVista, cfg.version, 'se marca vista');
  if (!uiSt.getBanner()) throw new Error('no aparecio el cartelito');
  dlg.cerrarDialogo();   // puede haber quedado tambien el saludo del dia
});

paso('novedades: una vez vista no la vuelve a mostrar', () => {
  // El cartelito de la prueba anterior puede seguir vivo (se borra solo a los
  // 4s), así que lo que hay que ver es que no aparezca uno NUEVO: mismo objeto
  // antes y después, no null.
  const antes = uiSt.getBanner();
  uiSt.setModo('titulo');
  mod.empezar();
  if (uiSt.getBanner() !== antes) throw new Error('aparecio un cartelito nuevo con la version ya vista');
  dlg.cerrarDialogo();
});

/* El baile: sale de una hoja de sprites distinta y de un reloj de inactividad,
   así que es fácil dejarlo prendido para siempre o que no arranque nunca. */
paso('baile: dos toques de A sin nada enfrente', () => {
  uiSt.setModo('juego');
  motor.input.dir = -1;
  motor.jugadora.moviendo = false;
  motor.jugadora.bailando = false;
  // mirando a algún lado libre: con un objeto enfrente, A es interactuar
  for (let d = 0; d < 4 && motor.objetoFrente(); d++) motor.jugadora.dir = d;
  if (motor.objetoFrente()) throw new Error('esta rodeada de objetos, no sirve de prueba');
  mod.pulsarA(); mod.pulsarA();
  if (!motor.jugadora.bailando) throw new Error('no se puso a bailar');
});

paso('baile: moverse lo corta', () => {
  motor.input.dir = 0;
  motor.actualizarJugadora(16);
  motor.input.dir = -1;
  if (motor.jugadora.bailando) throw new Error('siguio bailando con el d-pad apretado');
});

paso('baile: la inactividad lo arranca sola', () => {
  motor.jugadora.moviendo = false;
  motor.actualizarJugadora(motor.BAILE.esperaMs + 1);
  if (!motor.jugadora.bailando) throw new Error('no arranco por inactividad');
});

paso('baile: fuera del juego no baila', () => {
  uiSt.setModo('menu');
  motor.actualizarJugadora(16);
  if (motor.jugadora.bailando) throw new Error('bailo con el menu abierto');
  uiSt.setModo('juego');
});

/* Merlí: deambula solo por config/merli.js#ZONA_MERLI. Sin pathfinding real,
   así que lo que puede romperse es que se salga de la zona, que atraviese
   algo sólido, o que seguir caminando con el juego en pausa. */
paso('merli: arranca dentro de la zona', () => {
  if (!zonaMerli.dentroDeZonaMerli(motor.merli.tx, motor.merli.ty)) {
    throw new Error(`posicion inicial (${motor.merli.tx},${motor.merli.ty}) fuera de la zona`);
  }
});

paso('merli: camina sola con el tiempo, sin salirse de la zona ni de lo solido', () => {
  uiSt.setModo('juego');
  let pasos = 0;
  for (let i = 0; i < 400; i++) {
    const antes = motor.merli.moviendo;
    motor.actualizarMerli(50);
    if (antes && !motor.merli.moviendo) pasos++;   // completó un paso
    if (!zonaMerli.dentroDeZonaMerli(motor.merli.tx, motor.merli.ty)) {
      throw new Error(`se salio de la zona: (${motor.merli.tx},${motor.merli.ty})`);
    }
    if (!motor.tilePasable(motor.merli.tx, motor.merli.ty)) {
      throw new Error(`quedo parada en una casilla solida: (${motor.merli.tx},${motor.merli.ty})`);
    }
  }
  if (pasos === 0) throw new Error('nunca se movio en 400 frames simulados (20s)');
});

paso('merli: fuera del juego se queda quieta', () => {
  uiSt.setModo('menu');
  const antes = { tx: motor.merli.tx, ty: motor.merli.ty, px: motor.merli.px, py: motor.merli.py };
  for (let i = 0; i < 50; i++) motor.actualizarMerli(50);
  if (motor.merli.tx !== antes.tx || motor.merli.ty !== antes.ty || motor.merli.px !== antes.px || motor.merli.py !== antes.py) {
    throw new Error('se movio con el menu abierto');
  }
  uiSt.setModo('juego');
});

/* La cáscara del huevo se va sola del jardín pasadas dos horas. Lo que no
   puede pasar es que deje una casilla invisible que igual tape el paso: sería
   una pared fantasma en el medio del patio. */
paso('huevo: la cascara vencida deja de tapar el paso', () => {
  const est = logica.obtenerEstado();
  const HUEVO = { x: 16, y: 16 };
  est.eclosionado = true;
  est.eclosionadoEn = Date.now();          // recién nacida
  motor.actualizarHuevo(16);
  if (motor.tilePasable(HUEVO.x, HUEVO.y)) throw new Error('la cascara recien rota ya no ocupa lugar');

  est.eclosionadoEn = Date.now() - (2 * 60 * 60 * 1000 + 1000);   // dos horas y monedas
  motor.actualizarHuevo(16);
  if (!motor.tilePasable(HUEVO.x, HUEVO.y)) throw new Error('quedo una casilla invisible bloqueando');
  if (motor.objetoEnTile(HUEVO.x, HUEVO.y)) throw new Error('sigue contestando al boton A');
});

/* Aura de XP: el estallido lo dispara el motor mirando EST.nivel, no un aviso
   de juego.js. Lo que puede romperse es que salte donde no corresponde —al
   cargar una partida ya avanzada, o cuando la nube trae un nivel más bajo— o
   que se quede prendido para siempre. */
paso('aura: subir de nivel dispara el estallido y se apaga solo', () => {
  const est = logica.obtenerEstado();
  motor.actualizarAura(16);                       // parte del nivel que haya
  if (motor.auraActiva()) throw new Error('estallo sin subir de nivel');

  est.nivel += 1;
  motor.actualizarAura(16);
  if (!motor.auraActiva()) throw new Error('no estallo al subir de nivel');

  for (let i = 0; i < 100; i++) motor.actualizarAura(50);   // 5s, de sobra
  if (motor.auraActiva()) throw new Error('el estallido no se apago');
});

paso('aura: un nivel mas bajo (partida reemplazada) no estalla', () => {
  const est = logica.obtenerEstado();
  est.nivel = Math.max(1, est.nivel - 3);
  motor.actualizarAura(16);
  if (motor.auraActiva()) throw new Error('estallo al bajar de nivel');
});

paso('cambio de dia (visibilitychange)', () => { for (const fn of oyentesDoc.get('visibilitychange') || []) fn({}); });
paso('resize', () => { for (const fn of oyentesWin.get('resize') || []) fn({}); });

/* ---------------------------------------------------------------------------
 *  Guardado y fusión.
 *
 *  Estos no son "que no explote" como los de arriba: son afirmaciones sobre qué
 *  tiene que pasar. El juego entero existe para no perder lo que hace Kath, y
 *  los dos caminos por donde se pierde — una partida ilegible y dos
 *  dispositivos que se pisan — no se ven a ojo en el navegador.
 * ------------------------------------------------------------------------- */
const disco = await vite.ssrLoadModule('/src/state/persistencia.js');
const fusion = await vite.ssrLoadModule('/src/state/fusion.js');
const CLAVE = disco.CLAVE, CLAVE_BAK = disco.CLAVE_BAK;

const igual = (a, b, q) => { if (a !== b) throw new Error(`${q}: esperaba ${b}, hubo ${a}`); };

paso('guardado: escribe y vuelve a leer', () => {
  store.delete(CLAVE); store.delete(CLAVE_BAK); disco.desbloquear();
  if (!disco.escribir({ v: 2, nivel: 4, xp: 7, hoy: {} })) throw new Error('no escribio');
  igual(disco.leer().partida.nivel, 4, 'nivel leido');
});

paso('guardado: la version anterior queda de respaldo', () => {
  disco.escribir({ v: 2, nivel: 5, xp: 0, hoy: {} });
  igual(JSON.parse(store.get(CLAVE_BAK)).nivel, 4, 'respaldo');
  igual(JSON.parse(store.get(CLAVE)).nivel, 5, 'principal');
});

paso('guardado: partida rota se recupera del respaldo', () => {
  store.set(CLAVE, '{roto');
  const r = disco.leer();
  igual(r.origen, 'copia', 'origen');
  igual(r.partida.nivel, 4, 'nivel recuperado');
  if (disco.estaBloqueado()) throw new Error('no deberia bloquear: habia respaldo');
});

paso('guardado: sin nada legible se traba y NO pisa', () => {
  store.set(CLAVE, '{roto'); store.set(CLAVE_BAK, 'tambien roto');
  const r = disco.leer();
  igual(r.origen, 'roto', 'origen');
  if (!disco.estaBloqueado()) throw new Error('deberia haberse bloqueado');
  if (disco.escribir({ v: 2, nivel: 1, xp: 0, hoy: {} })) throw new Error('escribio estando trabado');
  igual(store.get(CLAVE), '{roto', 'la partida rota NO se piso');
});

paso('guardado: sin nada guardado es jugadora nueva, no error', () => {
  store.delete(CLAVE); store.delete(CLAVE_BAK); disco.desbloquear();
  const r = disco.leer();
  igual(r.origen, 'nada', 'origen');
  if (disco.estaBloqueado()) throw new Error('trabo una partida nueva');
});

paso('huella: ignora lo volatil y no depende del orden de las claves', () => {
  const a = { v: 2, nivel: 3, hoy: { agua: 1, cama: 2 }, seq: 1, guardadoEn: 100, escritoPor: 'aa' };
  const b = { v: 2, nivel: 3, hoy: { cama: 2, agua: 1 }, seq: 99, guardadoEn: 999, escritoPor: 'bb' };
  igual(disco.huella(a), disco.huella(b), 'misma partida, distinta seq y distinto orden');
  if (disco.huella(a) === disco.huella({ ...a, nivel: 4 })) throw new Error('no detecto un cambio real');
});

paso('guardar() no escribe ni sube la seq si no cambio nada', () => {
  const est = logica.obtenerEstado();
  est.oro += 5;
  logica.guardar();
  const seq = est.seq;

  // Tres guardados seguidos sin tocar nada: como cerrar el menu tres veces.
  logica.guardar(); logica.guardar(); logica.guardar();
  igual(est.seq, seq, 'la seq no se movio con tres guardados vacios');

  // Y en cuanto cambia algo de verdad, vuelve a escribir.
  est.oro += 5;
  logica.guardar();
  igual(est.seq, seq + 1, 'un cambio real vuelve a guardar');
});

paso('codigo de partida: se genera valido y estable', () => {
  const c = disco.asegurarCodigo();
  if (!disco.codigoValido(c)) throw new Error('codigo invalido: ' + c);
  igual(disco.asegurarCodigo(), c, 'no debe regenerarse');
  igual(disco.normalizarCodigo(disco.formatearCodigo(c)), c, 'con guiones y sin guiones');
});

paso('migracion: una partida v1 se pone al dia en cadena', () => {
  // Las migraciones se aplican una atras de otra, asi que una partida vieja de
  // varias versiones llega sola hasta la actual. Por eso se comprueba la ultima
  // version y no la 2: si alguien agrega una migracion y rompe la cadena, la
  // partida de Kath se queda a mitad de camino y este paso lo dice.
  const viejo = { v: 1, nivel: 2, xp: 10, oro: 40, hoy: {}, canjeados: [{ id: 'abrazo', fecha: '2026-08-10' }] };
  const nuevo = logica.migrar(viejo);
  igual(nuevo.v, logica.V_ACTUAL, 'version');
  igual(nuevo.oroGanado, 70, 'oro ganado = 40 que tiene + 30 del abrazo (v1 -> v2)');
  if (!nuevo.canjeados[0].cid) throw new Error('el canje viejo no recibio cid');
  igual(nuevo.extras.length, 0, 'y llego con las secundarias vacias (v2 -> v3)');
});

const partidaBase = (extra) => ({
  ...logica.EST_INICIAL(), dia: '2026-08-15', ...extra,
});

paso('fusion: dos dispositivos el mismo dia suman misiones', () => {
  const tel = partidaBase({ seq: 5, hoy: { agua: 2, dientes: 1 }, totalMisiones: 3, oroGanado: 30, oro: 30 });
  const tab = partidaBase({ seq: 9, hoy: { agua: 1, cama: 1 }, totalMisiones: 2, oroGanado: 20, oro: 20 });
  const f = fusion.fusionar(tel, tab);
  igual(f.hoy.agua, 2, 'agua');
  igual(f.hoy.dientes, 1, 'dientes solo estaba en el telefono');
  igual(f.hoy.cama, 1, 'cama solo estaba en la tablet');
  igual(f.totalMisiones, 3, 'total de misiones');
  igual(f.oro, 30, 'oro');
  if (f.seq <= 9) throw new Error('la seq fusionada tiene que superar a las dos');
});

paso('fusion: el nivel se compara por XP total, no por nivel suelto', () => {
  const a = partidaBase({ seq: 1, nivel: 3, xp: 5 });
  const b = partidaBase({ seq: 2, nivel: 2, xp: 70 });
  const f = fusion.fusionar(a, b);
  igual(f.nivel, 3, 'gana el que tiene mas XP total aunque escribio primero');
  igual(f.xp, 5, 'xp del nivel');
});

paso('fusion: un dia atrasado se archiva en vez de perderse', () => {
  const ayer = partidaBase({ seq: 20, dia: '2026-08-14', hoy: { agua: 2, dientes: 2, cama: 1, animo: 1, ejercicio: 1 } });
  const hoyDia = partidaBase({ seq: 3, dia: '2026-08-15', hoy: { agua: 1 } });
  const f = fusion.fusionar(ayer, hoyDia);
  igual(f.dia, '2026-08-15', 'manda el dia mas nuevo');
  igual(f.hoy.agua, 1, 'las misiones de hoy son las de hoy');
  if (!f.historial.some((h) => h.d === '2026-08-14')) throw new Error('el dia viejo se perdio');
});

paso('fusion: los canjes no se duplican ni se comen', () => {
  const uno = { cid: 'a1', id: 'abrazo', fecha: '2026-08-15' };
  const dos = { cid: 'b2', id: 'peli', fecha: '2026-08-15' };
  const a = partidaBase({ seq: 1, oroGanado: 200, canjeados: [uno] });
  const b = partidaBase({ seq: 2, oroGanado: 200, canjeados: [uno, dos] });
  const f = fusion.fusionar(a, b);
  igual(f.canjeados.length, 2, 'canjes');
  igual(f.oro, 110, 'oro = 200 ganadas - 30 del abrazo - 60 de la peli');
});

paso('disfraces: aparecen todos los del cesped, y ninguno del pastillero', () => {
  const est = logica.obtenerEstado();
  est.disfraces = [];
  const vistos = new Set();
  // El sorteo es al azar, así que se camina "mucho" y se comprueba el
  // invariante que importa: nunca sale dos veces el mismo, y con suficientes
  // pasos aparecen todos.
  for (let i = 0; i < 40000 && vistos.size < DEL_CESPED.length; i++) {
    const d = logica.buscarDisfrazEnCesped();
    if (!d) continue;
    if (vistos.has(d.id)) throw new Error('salio dos veces: ' + d.id);
    if (d.via !== 'cesped') throw new Error('salio en el pasto uno del pastillero: ' + d.id);
    vistos.add(d.id);
  }
  igual(vistos.size, DEL_CESPED.length, 'aparecieron todos los del cesped');
  // Con los del cesped completos ya no sale nada, aunque falten los del
  // pastillero: caminar no puede destrabar la recompensa de cuidarse.
  igual(logica.buscarDisfrazEnCesped(), null, 'con los del cesped juntados ya no aparece nada');
  if (!DE_MEDICINAS.every((d) => !est.disfraces.includes(d.id))) {
    throw new Error('el cesped entrego uno del pastillero');
  }
});

const fs = await import('node:fs');
paso('emojis: ninguno del bloque que Windows no dibuja', () => {
  // Historia: U+1FA99, U+1FAA5 y U+1FAA7 salieron como cuadrados en Windows y
  // hubo que cambiarlos a mano; meses despues volvio a pasar con U+1FA9E en el
  // espejo del bano. Los cuatro son del mismo bloque, U+1FA70..U+1FAFF (Emoji
  // 12-14, de 2019 en adelante), que seguiemj.ttf de Windows 10 no trae.
  //
  // Van escritos como codepoint y no dibujados a proposito: si se pegan aca,
  // este mismo paso falla por su propio comentario. Ya paso.
  //
  // No se puede probar como se ve una fuente desde node, pero si se puede
  // prohibir el bloque entero, que es de donde salieron los cuatro casos. Lo
  // demas que usa el juego es Emoji 11 o anterior y se vio andar.
  const raiz = new URL('./src/', import.meta.url);
  const malos = [];
  const mirar = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = new URL(e.name + (e.isDirectory() ? '/' : ''), dir);
      if (e.isDirectory()) { mirar(ruta); continue; }
      if (!/\.(js|jsx)$/.test(e.name)) continue;
      const texto = fs.readFileSync(ruta, 'utf8');
      let linea = 1;
      for (const ch of texto) {
        if (ch === '\n') linea++;
        const cp = ch.codePointAt(0);
        if (cp >= 0x1FA70 && cp <= 0x1FAFF) {
          malos.push(`${e.name}:${linea} U+${cp.toString(16).toUpperCase()}`);
        }
      }
    }
  };
  mirar(raiz);
  if (malos.length) {
    throw new Error('emojis que Windows dibuja como cuadrado: ' + malos.join(', '));
  }
});

const mapaCfg = await vite.ssrLoadModule('/src/config/mapa.js');
const arteObj = await vite.ssrLoadModule('/src/engine/objetos.js');
paso('mapa: ningun mueble tapa una puerta ni pisa a otro mueble', () => {
  // Este paso existe por un bug real: al amoblar el living, un sillon de 2
  // casillas quedo justo encima de la puerta al jardin. No rompia nada visible
  // —al jardin se seguia saliendo por la cocina— asi que el cuarto se veia bien
  // y andaba mal. Un mueble tapando una puerta no se nota jugando hasta que
  // alguien intenta salir por ahi.
  const { MAPA, SOLIDOS, OBJETOS } = mapaCfg;
  const { ART_OBJ } = arteObj;
  const alto = MAPA.length, ancho = MAPA[0].length;

  for (const f of MAPA) igual(f.length, ancho, 'todas las filas del mapa miden lo mismo');

  const solido = MAPA.map((f) => [...f].map((c) => SOLIDOS.has(c)));
  const ocupado = new Map();
  for (const o of OBJETOS) {
    const a = ART_OBJ[o.art];
    if (!a) throw new Error('objeto sin arte: ' + o.art);
    for (let j = 0; j < a.th; j++) for (let i = 0; i < a.tw; i++) {
      const x = o.x + i, y = o.y + j;
      if (x >= ancho || y >= alto) throw new Error(`${o.art} se sale del mapa en ${x},${y}`);
      if (o.decor || a.decor || o.pared) continue;
      const antes = ocupado.get(x + ',' + y);
      if (antes) throw new Error(`${o.art} y ${antes} pisan la misma casilla ${x},${y}`);
      ocupado.set(x + ',' + y, o.art);
      solido[y][x] = true;
    }
  }

  // Las puertas de esta casa estan todas en paredes horizontales, asi que lo
  // que tiene que quedar libre es la casilla de arriba y la de abajo.
  let puertas = 0;
  for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) {
    if (MAPA[y][x] !== 'D') continue;
    puertas++;
    for (const dy of [-1, 1]) {
      const ny = y + dy;
      if (ny < 0 || ny >= alto || solido[ny][x]) {
        throw new Error(`la puerta ${x},${y} esta tapada en ${x},${ny}`);
      }
    }
  }
  if (puertas < 6) throw new Error('se perdieron puertas del mapa: ' + puertas);
});

const medCfg = (await vite.ssrLoadModule('/src/config/medicinas.js')).MEDICINAS;

/* Un instante de HOY a la hora que se pida. Las franjas se prueban con horas
   puestas a mano y no con el reloj de verdad: si no, la suite pasaria o
   fallaria segun la hora a la que se la corre. */
const enHora = (h, m) => { const d = new Date(); d.setHours(h, m || 0, 0, 0); return d.getTime(); };

paso('medicinas: el pastillero esta en la cocina y se puede tocar', () => {
  // El registro mas importante del juego entra por este mueble: si queda sin
  // una casilla libre enfrente, Kath no puede marcar nada y no se entera hasta
  // que va a tomarlas.
  const past = mapaCfg.OBJETOS.find((o) => o.accion === 'medicinas');
  if (!past) throw new Error('no hay pastillero en el mapa');
  const abajo = mapaCfg.MAPA[past.y + 1][past.x];
  igual(abajo, 'K', 'la casilla de abajo es piso de cocina');
  if (mapaCfg.SOLIDOS.has(abajo)) throw new Error('no se puede parar enfrente');
  if (mapaCfg.OBJETOS.some((o) => o.x === past.x && o.y === past.y + 1)) {
    throw new Error('hay un mueble justo enfrente del pastillero');
  }
});

/* ---------------------------------------------------------------------------
 *  Sentarse (la silla del escritorio y los sillones del living).
 *
 *  Lo delicado no es la pose: es que Kath queda parada ENCIMA de una casilla
 *  solida. Si algo sale mal levantandose, queda adentro del mueble para
 *  siempre, y ese es un guardado roto que no se arregla jugando.
 * ------------------------------------------------------------------------- */
const silla = mapaCfg.OBJETOS.find((o) => o.accion === 'compu');
const sillon = mapaCfg.OBJETOS.find((o) => o.accion === 'sillon');

/* La deja parada en la casilla `desde`, mirando al mueble. Devuelve el objeto
   que le queda enfrente, que es lo que recibe sentarse(). */
function pararseFrenteA(mueble, desde, dir) {
  uiSt.setModo('juego');
  motor.input.dir = -1;
  motor.jugadora.moviendo = false;
  motor.jugadora.asiento = null;
  motor.jugadora.tx = desde.x; motor.jugadora.ty = desde.y;
  motor.jugadora.px = desde.x * 48; motor.jugadora.py = desde.y * 48;
  motor.jugadora.dir = dir;
  const enfrente = motor.objetoFrente();
  if (enfrente !== mueble) throw new Error('no quedo con el mueble enfrente');
  return enfrente;
}

paso('sentarse: la silla esta justo abajo de la notebook', () => {
  const nb = mapaCfg.OBJETOS.find((o) => o.accion === 'progreso');
  if (!silla) throw new Error('no hay silla en el mapa');
  igual(silla.x, nb.x, 'misma columna que la notebook');
  igual(silla.y, nb.y + 1, 'una casilla abajo');
  igual(silla.mira, 3, 'sentada mira para arriba, o sea a la notebook');
});

paso('sentarse: se sienta en la casilla del mueble y vuelve a la suya', () => {
  const desde = { x: silla.x, y: silla.y + 1 };
  const mueble = pararseFrenteA(silla, desde, 3);
  if (!motor.sentarse(mueble)) throw new Error('no se pudo sentar');
  if (!motor.estaSentada()) throw new Error('no quedo marcada como sentada');
  igual(motor.jugadora.tx + ',' + motor.jugadora.ty, silla.x + ',' + silla.y, 'quedo en la silla');
  igual(motor.jugadora.dir, silla.mira, 'mirando para donde dice el mapa');

  if (!motor.levantarse()) throw new Error('no se pudo levantar');
  igual(motor.jugadora.tx + ',' + motor.jugadora.ty, desde.x + ',' + desde.y, 'volvio a su casilla');
  if (!motor.tilePasable(motor.jugadora.tx, motor.jugadora.ty)) {
    throw new Error('quedo parada adentro de algo solido');
  }
});

paso('sentarse: sentada no camina, y la primera flecha la para', () => {
  const desde = { x: silla.x, y: silla.y + 1 };
  motor.sentarse(pararseFrenteA(silla, desde, 3));
  const enLaSilla = { tx: motor.jugadora.tx, ty: motor.jugadora.ty };

  motor.input.dir = 3;                 // para arriba, contra la notebook
  motor.actualizarJugadora(16);
  if (motor.estaSentada()) throw new Error('la flecha no la levanto');
  igual(motor.jugadora.tx + ',' + motor.jugadora.ty, desde.x + ',' + desde.y, 'se paro donde estaba');
  if (enLaSilla.ty !== silla.y) throw new Error('nunca llego a sentarse');
  motor.input.dir = -1;
});

paso('sentarse: sentada no baila', () => {
  motor.sentarse(pararseFrenteA(silla, { x: silla.x, y: silla.y + 1 }, 3));
  motor.jugadora.bailando = false;
  motor.actualizarJugadora(motor.BAILE.esperaMs + 1);
  if (motor.jugadora.bailando) throw new Error('se puso a bailar sentada');
  motor.levantarse();
});

paso('sentarse: B la para en vez de abrir el menu', () => {
  motor.sentarse(pararseFrenteA(silla, { x: silla.x, y: silla.y + 1 }, 3));
  mod.pulsarB();
  if (motor.estaSentada()) throw new Error('siguio sentada');
  igual(uiSt.getModo(), 'juego', 'y no abrio el menu');
});

paso('sentarse: los sillones miran a la tele, y Kath tambien', () => {
  // La razon de ser del sillon es sentarse a ver la tele. Que la pose apunte
  // para otro lado no rompe nada que explote, asi que sin este paso se puede
  // dar vuelta sin que nadie se entere hasta verlo jugando.
  const tele = mapaCfg.OBJETOS.find((o) => o.art === 'tv');
  if (!tele) throw new Error('no hay tele en el living');
  for (const s of mapaCfg.OBJETOS.filter((o) => o.accion === 'sillon')) {
    if (s.y <= tele.y) throw new Error(`el sillon (${s.x},${s.y}) no esta abajo de la tele`);
    igual(s.mira, 3, `el sillon (${s.x},${s.y}) sienta a Kath mirando para arriba`);
    if (!s.tapa) throw new Error('sin `tapa` el respaldo no la dibuja encima y se le ve la silla del sprite');
  }
});

paso('sentarse: en el sillon se sienta en la mitad a la que se acerco', () => {
  if (!sillon) throw new Error('no hay sillon con accion en el mapa');
  // El sillon mide dos casillas: se prueban las dos, acercandose por arriba.
  for (const dx of [0, 1]) {
    const desde = { x: sillon.x + dx, y: sillon.y - 1 };
    motor.sentarse(pararseFrenteA(sillon, desde, 0));
    igual(motor.jugadora.tx, sillon.x + dx, `se sento en la mitad ${dx}`);
    igual(motor.jugadora.dir, sillon.mira, 'mirando a camara, como esta dibujado el sillon');
    motor.levantarse();
  }
});

paso('sentarse: en medio de un paso no la deja deslizandose', () => {
  // A se puede tocar con el paso a medio dar. `tx,ty` ya es el destino, asi que
  // el mueble de enfrente es el correcto, pero el paso queda abierto: si no se
  // cierra, al levantarse retoma la interpolacion desde donde estaba antes.
  const desde = { x: silla.x, y: silla.y + 1 };
  const mueble = pararseFrenteA(silla, desde, 3);
  motor.jugadora.moviendo = true;
  motor.jugadora.t = 0;
  motor.jugadora.desdeX = 0; motor.jugadora.desdeY = 0;

  if (!motor.sentarse(mueble)) throw new Error('no se sento con el paso a medias');
  if (motor.jugadora.moviendo) throw new Error('quedo el paso abierto');

  motor.levantarse();
  motor.actualizarJugadora(16);
  igual(motor.jugadora.px, desde.x * 48, 'no se deslizo en x');
  igual(motor.jugadora.py, desde.y * 48, 'no se deslizo en y');
});

paso('sentarse: no se sienta en algo que no tiene enfrente', () => {
  pararseFrenteA(silla, { x: silla.x, y: silla.y + 1 }, 3);
  if (motor.sentarse(sillon)) throw new Error('se sento en un sillon que estaba en otro cuarto');
  if (motor.estaSentada()) throw new Error('quedo sentada igual');
});

const { EXTRA } = await vite.ssrLoadModule('/src/config/extras.js');
const dibujo = await vite.ssrLoadModule('/src/engine/drawing.js');

/* ---------------------------------------------------------------------------
 *  La hora de cada misión y las misiones secundarias.
 *
 *  Las dos cosas tocan lo mismo que ya era delicado: el formato de la partida
 *  (que hay que migrar sin perder nada) y la fusión de dos dispositivos, donde
 *  "sumar" está bien para un contador y muy mal para una hora.
 * ------------------------------------------------------------------------- */
paso('medicinas: el boton A frente al pastillero abre las tres tomas', () => {
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  logica.chequearDia();
  const past = mapaCfg.OBJETOS.find((o) => o.accion === 'medicinas');
  pararseFrenteA(past, { x: past.x, y: past.y + 1 }, 3);
  mod.pulsarA();
  const act = dlg.getActual();
  if (!act || !act.opciones) throw new Error('no abrio el dialogo con opciones');
  igual(act.opciones.length, medCfg.tomas.length + 1, 'las tres tomas y "Ahora no"');
  dlg.cerrarDialogo();
  uiSt.setModo('juego');
});

paso('Diego: parado afuera de la casa, sin taparle el paso a nadie', () => {
  const d = mapaCfg.OBJETOS.find((o) => o.art === 'diego');
  if (!d) throw new Error('Diego no esta en el mundo: FLAGS.diego apagado');
  if (d.y <= 13) throw new Error(`sigue adentro de la casa, en ${d.x},${d.y}`);
  igual(mapaCfg.MAPA[d.y][d.x], 'G', 'parado en el pasto y no sobre el sendero');
  igual(d.accion, 'diego', 'sigue siendo el que habla');
});

paso('Diego: se da vuelta hacia donde esta parada Kath', () => {
  const d = mapaCfg.OBJETOS.find((o) => o.art === 'diego');
  const { TILE } = dibujo;
  const guardada = { px: motor.jugadora.px, py: motor.jugadora.py };
  const parar = (tx, ty) => { motor.jugadora.px = tx * TILE; motor.jugadora.py = ty * TILE; };

  // Las cuatro casillas desde las que se le puede hablar. La direccion es la
  // fila de la hoja de sprites: 0 abajo, 1 izquierda, 2 derecha, 3 arriba.
  parar(d.x, d.y + 1); igual(motor.dirHaciaJugadora(d), 0, 'Kath abajo -> mira abajo');
  parar(d.x - 1, d.y); igual(motor.dirHaciaJugadora(d), 1, 'Kath a la izquierda');
  parar(d.x + 1, d.y); igual(motor.dirHaciaJugadora(d), 2, 'Kath a la derecha');
  parar(d.x, d.y - 1); igual(motor.dirHaciaJugadora(d), 3, 'Kath arriba');

  // A mitad de paso: ya casi al lado por la derecha, todavia sin llegar a la
  // casilla. Tiene que estar mirandola desde antes de que termine de caminar.
  parar(d.x + 1, d.y + 0.4);
  igual(motor.dirHaciaJugadora(d), 2, 'a mitad de paso ya la sigue');

  // Cerca la sigue; lejos se queda como lo dejo el mapa (RADIO_MIRADA = 3).
  parar(d.x + 2, d.y);
  igual(motor.dirHaciaJugadora(d), 2, 'a dos casillas todavia la mira');
  parar(d.x + 5, d.y);
  igual(motor.dirHaciaJugadora(d), d.dir || 0, 'a cinco ya no: vuelve a su pose');

  // Y la pose de descanso no puede ser la misma que le toca cuando Kath se le
  // para enfrente: giraria igual, pero no se notaria. Es el bug que hubo.
  parar(d.x, d.y + 1);
  if (motor.dirHaciaJugadora(d) === (d.dir || 0)) {
    throw new Error('mira para el mismo lado parado que hablando: el giro no se ve');
  }

  motor.jugadora.px = guardada.px; motor.jugadora.py = guardada.py;
});

paso('Diego: si Kath baila al lado, el se prende', () => {
  const d = mapaCfg.OBJETOS.find((o) => o.art === 'diego');
  const { TILE } = dibujo;
  const guardada = { px: motor.jugadora.px, py: motor.jugadora.py };
  uiSt.setModo('juego');
  motor.input.dir = -1;
  motor.jugadora.moviendo = false;

  const parar = (tx, ty) => {
    motor.jugadora.tx = tx; motor.jugadora.ty = ty;
    motor.jugadora.px = tx * TILE; motor.jugadora.py = ty * TILE;
  };

  parar(d.x, d.y + 1);
  motor.bailar(4);
  motor.actualizarPersonajes(16);
  if (!d.bailando) throw new Error('Kath baila al lado y el no se prende');
  igual(d.baileCoreo, motor.jugadora.baileCoreo, 'baila la misma coreografia que ella');

  // Va un cuadro atras: si estuvieran en fase exacta se ven como dos copias de
  // la misma animacion.
  motor.jugadora.tBaile = 1000;
  motor.actualizarPersonajes(16);
  if (!(d.tBaile < motor.jugadora.tBaile)) throw new Error('tendria que ir atras de ella');

  // Desde la otra punta del jardin, no.
  parar(d.x + 9, d.y);
  motor.actualizarPersonajes(16);
  if (d.bailando) throw new Error('bailo desde lejos');

  // Y cuando ella para, el para.
  parar(d.x, d.y + 1);
  motor.actualizarPersonajes(16);
  if (!d.bailando) throw new Error('volviendo al lado tendria que prenderse de nuevo');
  motor.jugadora.bailando = false;
  motor.actualizarPersonajes(16);
  if (d.bailando) throw new Error('ella paro y el sigue bailando solo');

  motor.jugadora.px = guardada.px; motor.jugadora.py = guardada.py;
});

paso('dia y noche: la luz sigue la hora real, sin saltos', () => {
  const aLas = (h, m) => new Date(2026, 7, 22, h, m || 0);
  const alfa = (h, m, adentro) => motor.luzAmbiente(aLas(h, m), !!adentro).a;

  igual(alfa(12), 0, 'al mediodia no se pinta nada');
  if (alfa(23) < 0.35) throw new Error('a las 11 de la noche tendria que estar oscuro: ' + alfa(23));
  if (alfa(3) < 0.35) throw new Error('a las 3 de la madrugada tambien: ' + alfa(3));

  // Amanecer y atardecer: entre medio, ni de dia ni de noche.
  const tarde = alfa(19, 30);
  if (!(tarde > 0.1 && tarde < 0.35)) throw new Error('el atardecer quedo raro: ' + tarde);

  // Lo que se pedia es que cambie, no que salte: entre las 18 y las 22 no puede
  // haber ningun escalon grande de un minuto al siguiente.
  let previa = alfa(18);
  for (let min = 1; min <= 4 * 60; min++) {
    const ahora = alfa(18 + Math.floor(min / 60), min % 60);
    if (Math.abs(ahora - previa) > 0.02) {
      throw new Error('salto de luz de ' + (ahora - previa).toFixed(3) + ' a las ' + (18 + min / 60));
    }
    previa = ahora;
  }

  // El circulo cierra: 23:59 y 00:00 tienen que ser casi lo mismo.
  if (Math.abs(alfa(23, 59) - alfa(0, 0)) > 0.02) throw new Error('la medianoche pega un salto');

  // Adentro hay luz prendida: la noche pega menos que en el jardin.
  if (!(alfa(23, 0, true) < alfa(23, 0))) throw new Error('adentro tendria que estar mas claro');
  igual(alfa(12, 0, true), 0, 'de dia, adentro tampoco se pinta');

  // Y el color acompana: de noche tira a azul, al atardecer a naranja.
  const noche = motor.luzAmbiente(aLas(23), false);
  if (!(noche.b > noche.r)) throw new Error('la noche tendria que tirar a azul');
  const atardecer = motor.luzAmbiente(aLas(19), false);
  if (!(atardecer.r > atardecer.b)) throw new Error('el atardecer tendria que tirar a naranja');
});

paso('Diego: solo, mira para todos lados', () => {
  const d = mapaCfg.OBJETOS.find((o) => o.art === 'diego');
  const { TILE } = dibujo;
  const guardada = { px: motor.jugadora.px, py: motor.jugadora.py };
  uiSt.setModo('juego');
  // Bien lejos: con Kath cerca el ocio no corre, mira a Kath y listo.
  motor.jugadora.px = (d.x + 12) * TILE; motor.jugadora.py = d.y * TILE;
  d.tOcio = undefined; d.dirOcio = undefined;
  // Y con el paseo frenado: caminando la pose la manda el paso, no el ocio.
  // Lo que se mide aca es el que espera quieto (el paseo tiene sus pasos).
  d.paseo.espera = Infinity;

  const vistas = new Set();
  let previa = d.dir;
  // ~5 minutos de juego a 100 ms por vuelta. Los ratos se sortean entre 1,6 y
  // 4,2 segundos, asi que dan de sobra para ver las cuatro direcciones.
  for (let i = 0; i < 3000; i++) {
    motor.actualizarPersonajes(100);
    const ahora = motor.dirHaciaJugadora(d);
    if (ahora !== previa) { vistas.add(ahora); previa = ahora; }
  }
  igual(vistas.size, 4, 'direcciones distintas que llego a mirar');

  // Con ella al lado, el ocio no le gana: mira a Kath.
  motor.jugadora.px = d.x * TILE; motor.jugadora.py = (d.y + 1) * TILE;
  motor.actualizarPersonajes(100);
  igual(motor.dirHaciaJugadora(d), 0, 'con Kath enfrente la mira a ella');

  motor.jugadora.px = guardada.px; motor.jugadora.py = guardada.py;
});

/* ---------------------------------------------------------------------------
 *  El paseo de Diego.
 *
 *  Es el unico objeto del mapa que se mueve, y por eso lo que hay que vigilar
 *  no es que camine lindo: es que se lleve con el las dos tablas que dicen
 *  donde esta (solido y objPorTile) y que no se pare en el paso de una puerta.
 *  Las dos cosas se ven bien en pantalla y rompen el juego en silencio: una
 *  pared invisible en el pasto, o Kath encerrada adentro de la casa.
 * ------------------------------------------------------------------------- */
const diego = mapaCfg.OBJETOS.find((o) => o.art === 'diego');

/* Deja a Kath bien lejos (con ella cerca el paseo no arranca) y a Diego listo
   para salir ya mismo, sin esperar el sorteo de 12 a 30 segundos. */
function prepararPaseo() {
  const { TILE } = dibujo;
  uiSt.setModo('juego');
  motor.jugadora.px = (diego.casa.x + 12) * TILE;
  motor.jugadora.py = (diego.casa.y + 3) * TILE;
  diego.paseo.espera = 0;
}

/* Corre el paseo `vueltas` cuadros de 50 ms, llamando a `mirar` en cada uno.
   Corta antes si `mirar` devuelve true. Devuelve si corto antes. */
function correrPaseo(vueltas, mirar) {
  for (let i = 0; i < vueltas; i++) {
    motor.actualizarPersonajes(50);
    if (mirar && mirar()) return true;
  }
  return false;
}

/* Lo devuelve a su casilla, pase lo que pase: los pasos de abajo lo dejan
   caminando por el jardin y el resto del smoke lo espera en su lugar. */
function diegoACasa() {
  diego.paseo.espera = 0;
  diego.paseo.volviendo = true;
  diego.paseo.pasos = 0;
  correrPaseo(4000, () => !diego.paseo.moviendo && diego.x === diego.casa.x && diego.y === diego.casa.y);
  // Cerrar el paseo a mano: si queda en "volviendo" estando en su casilla, el
  // proximo prepararPaseo() no lo saca a caminar.
  diego.paseo.volviendo = false;
  diego.paseo.pasos = 0;
  diego.paseo.espera = Infinity;
}

paso('Diego: cada tanto sale a caminar y vuelve solo a su lugar', () => {
  prepararPaseo();
  const casa = diego.casa;
  igual(diego.x, casa.x, 'arranca en su casilla');

  const salio = correrPaseo(2000, () => diego.x !== casa.x || diego.y !== casa.y);
  if (!salio) throw new Error('nunca se movio de su casilla');

  const volvio = correrPaseo(6000, () => !diego.paseo.moviendo
    && diego.x === casa.x && diego.y === casa.y && !diego.paseo.volviendo);
  if (!volvio) throw new Error('se fue caminando y no volvio');
  igual(diego.dirOcio, casa.dir, 'y vuelve mirando la casa, como al principio');
  diego.paseo.espera = Infinity;
});

paso('Diego: el paseo no lo saca del jardin ni le tapa el paso a una puerta', () => {
  prepararPaseo();
  const { MAPA } = mapaCfg;
  const visitadas = new Set();
  correrPaseo(8000, () => { visitadas.add(diego.x + ',' + diego.y); return false; });
  if (visitadas.size < 3) throw new Error('casi no camino: la prueba no mira nada');

  for (const k of visitadas) {
    const [x, y] = k.split(',').map(Number);
    const piso = MAPA[y][x];
    if (piso !== 'G' && piso !== 'P') throw new Error(`piso ${piso} en ${k}: se metio adentro de la casa`);
    for (const dy of [-1, 1]) {
      if (MAPA[y + dy] && MAPA[y + dy][x] === 'D') throw new Error(`parado en el paso de la puerta ${x},${y + dy}`);
    }
    const lejos = Math.abs(x - diego.casa.x) + Math.abs(y - diego.casa.y);
    if (lejos > paseoCfg.PASEO.radio) throw new Error(`se alejo ${lejos} casillas de su lugar`);
  }
  diegoACasa();
});

paso('Diego: caminando se lleva la solidez y el boton A con el', () => {
  prepararPaseo();
  const antes = { x: diego.x, y: diego.y };
  const semovio = correrPaseo(2000, () => diego.x !== antes.x || diego.y !== antes.y);
  if (!semovio) throw new Error('no se movio');

  igual(motor.objetoEnTile(diego.x, diego.y), diego, 'el boton A lo encuentra donde esta');
  if (motor.tilePasable(diego.x, diego.y)) throw new Error('dejo de ser solido al caminar');
  if (motor.objetoEnTile(antes.x, antes.y)) throw new Error('quedo un Diego fantasma en la casilla vieja');
  if (!motor.tilePasable(antes.x, antes.y)) throw new Error('dejo una pared invisible donde estaba');

  diegoACasa();
  igual(motor.objetoEnTile(diego.casa.x, diego.casa.y), diego, 'de vuelta en su casilla');
});

paso('Diego: vuelve a su lugar aunque el camino derecho este tapado', () => {
  const { TILE } = dibujo;
  prepararPaseo();
  diegoACasa();

  /* El rincon que rompia la version anterior de la vuelta: a la izquierda del
     sendero, a la misma altura que su casilla. El paso obvio —de frente— es la
     casilla de abajo de la puerta de la cocina, que tiene vedada porque es
     solido y ahi dejaria a Kath encerrada; y el otro eje no lo acerca. La
     vuelta existe, pero rodeando por abajo. */
  const x = diego.casa.x - 2, y = diego.casa.y;
  igual(mapaCfg.MAPA[y][diego.casa.x - 1], 'P', 'el sendero sigue en el medio');
  igual(mapaCfg.MAPA[y - 1][diego.casa.x - 1], 'D', 'con la puerta justo arriba');
  motor.moverObjetoTile(diego, x, y);
  diego.px = x * TILE; diego.py = y * TILE;
  diego.paseo.volviendo = true; diego.paseo.pasos = 0; diego.paseo.espera = 0;

  const volvio = correrPaseo(4000, () => !diego.paseo.moviendo
    && diego.x === diego.casa.x && diego.y === diego.casa.y);
  if (!volvio) throw new Error(`se quedo trabado en ${diego.x},${diego.y}`);
  diegoACasa();
});

paso('Diego: con Kath al lado no se va caminando', () => {
  const { TILE } = dibujo;
  uiSt.setModo('juego');
  diegoACasa();
  motor.jugadora.px = diego.casa.x * TILE;
  motor.jugadora.py = (diego.casa.y + 1) * TILE;   // justo enfrente, hablandole
  diego.paseo.espera = 0;
  correrPaseo(2000);
  igual(diego.x, diego.casa.x, 'no se movio en x');
  igual(diego.y, diego.casa.y, 'no se movio en y');
  igual(motor.dirHaciaJugadora(diego), 0, 'y la sigue mirando a ella');
  diego.paseo.espera = Infinity;
});

paso('misiones: cada vez cumplida deja su hora', () => {
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  logica.chequearDia();
  const r1 = logica.completarMision('agua');
  const r2 = logica.completarMision('agua');
  igual(logica.horasDe('agua').length, 2, 'dos vasos, dos horas');
  if (!(r1.ts > 0)) throw new Error('la primera no trajo marca de tiempo');
  if (r2.ts < r1.ts) throw new Error('las horas quedaron desordenadas');
  const h = logica.horaBonita(r1.ts);
  igual(h.length, 5, 'la hora mide hh:mm');
  igual(h[2], ':', 'los dos puntos en el medio');
  igual(logica.fechaHoraBonita(r1.ts).length, 11, 'dd/mm hh:mm');
  igual(logica.horasDe('cama').length, 0, 'una mision sin hacer no tiene horas');
});

paso('medicinas: cada franja es la de su horario', () => {
  igual(logica.franjaDeHora(enHora(9)).id, 'desayuno', 'a la manana');
  igual(logica.franjaDeHora(enHora(17)).id, 'merienda', 'a la tarde');
  igual(logica.franjaDeHora(enHora(21)).id, 'cena', 'a la noche');
  igual(logica.franjaDeHora(enHora(13)), null, 'entre franjas no hay ninguna abierta');

  // El dia del juego arranca a las 4 AM: la 1 de la manana sigue siendo anoche,
  // asi que la cena marcada a esa hora tiene que caer en el dia de ayer y no
  // estrenar el de hoy.
  igual(logica.franjaDeHora(enHora(1)).id, 'cena', 'la 1 AM sigue siendo la cena de anoche');
  const ayer = new Date(); ayer.setHours(12, 0, 0, 0); ayer.setDate(ayer.getDate() - 1);
  igual(logica.diaDeJuego(enHora(1)), logica.diaDeJuego(ayer.getTime()), 'y se anota en el dia de ayer');
});

paso('medicinas: marcar deja la hora y paga una sola vez', () => {
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  logica.chequearDia();
  const est = logica.obtenerEstado();
  const oroAntes = est.oro;
  const t = enHora(9, 30);
  const dia = logica.diaDeJuego(t);

  const xpAntes = est.xp;
  const ganadoAntes = est.oroGanado;

  const r = logica.marcarMedicina('desayuno', t);
  igual(r.xp, medCfg.xp, 'pago el XP');
  igual(est.xp, xpAntes + medCfg.xp, 'y quedo sumado');
  // Las medicinas NO pagan monedas: son algo que hay que hacer igual, y el oro
  // las pondria a competir con lavar la ropa. Su premio son los accesorios.
  igual(medCfg.oro, 0, 'la configuracion no paga oro');
  igual(est.oro, oroAntes, 'no dio monedas');
  igual(est.oroGanado, ganadoAntes, 'ni ensucio el oro ganado de toda la vida');
  igual(logica.horaDeToma('desayuno', dia), t, 'quedo la hora exacta');
  igual(logica.marcarMedicina('desayuno', t), null, 'marcarla de nuevo no hace nada');

  // Deshacer y volver a marcar no puede volver a pagar: seria la forma mas
  // facil de subir de nivel del juego, y un registro que se puede fabricar
  // deja de servir como registro.
  if (!logica.desmarcarMedicina('desayuno', dia)) throw new Error('no se pudo deshacer');
  igual(logica.horaDeToma('desayuno', dia), 0, 'quedo deshecha');
  igual(logica.marcarMedicina('desayuno', t).xp, 0, 'volver a marcarla no vuelve a pagar');
  igual(est.xp, xpAntes + medCfg.xp, 'el XP quedo igual');
  igual(logica.tomadasDelDia(dia), 1, 'una de las tres');
  igual(logica.desmarcarMedicina('merienda', dia), false, 'no se puede deshacer algo que no se marco');
});

paso('medicinas: el recordatorio existe solo dentro de la franja', () => {
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  logica.chequearDia();
  igual(logica.medicinaPendiente(enHora(13)), null, 'fuera de franja no hay nada pendiente');
  igual(logica.medicinaPendiente(enHora(9)).id, 'desayuno', 'en franja y sin marcar, pendiente');
  logica.marcarMedicina('desayuno', enHora(9));
  igual(logica.medicinaPendiente(enHora(9)), null, 'marcada, el recordatorio se apaga');
});

paso('medicinas: la racha cuenta los dias con las tres', () => {
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  logica.chequearDia();
  const est = logica.obtenerEstado();
  const diaMenos = (n) => {
    const d = new Date(est.dia + 'T12:00:00');
    d.setDate(d.getDate() - n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      + '-' + String(d.getDate()).padStart(2, '0');
  };
  const tres = { desayuno: 100, merienda: 200, cena: 300 };
  est.meds = { [diaMenos(1)]: { ...tres }, [diaMenos(2)]: { ...tres } };
  // Hoy todavia no tiene ninguna, y eso NO corta: a las nueve de la manana no
  // hay nada que reprochar.
  igual(logica.rachaMedicinas(), 2, 'dos dias completos para atras');
  est.meds[diaMenos(3)] = { desayuno: 100 };
  igual(logica.rachaMedicinas(), 2, 'un dia a medias corta la racha');
  igual(logica.diasDeMedicinas().length, 4, 'el registro lista los dias anotados mas el de hoy');
});

paso('medicinas: completar el dia destraba accesorios, y el cesped no los da', () => {
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  logica.chequearDia();
  const est = logica.obtenerEstado();
  const primero = DE_MEDICINAS[0];

  igual(logica.marcarMedicina('desayuno', enHora(9)).disfraz, null, 'con una sola no hay nada');
  igual(logica.marcarMedicina('merienda', enHora(17)).disfraz, null, 'con dos tampoco');
  const r = logica.marcarMedicina('cena', enHora(21));
  igual(r.disfraz && r.disfraz.id, primero.id, 'el dia completo destraba el primero');
  if (!est.disfraces.includes(primero.id)) throw new Error('no quedo guardado en el placard');
  igual(logica.buscarDisfrazDeMedicinas(est.dia), null, 'y no entrega dos por el mismo dia');

  // El que sigue pide mas racha que la de un dia: no se puede adelantar
  // completando el mismo dia dos veces.
  const segundo = DE_MEDICINAS[1];
  if (est.disfraces.includes(segundo.id)) throw new Error('entrego uno que pedia mas racha');
  if (!(segundo.rachaMed > primero.rachaMed)) throw new Error('la lista quedo desordenada por racha');
});

paso('medicinas: un dia viejo completo no destraba nada', () => {
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  logica.chequearDia();
  const est = logica.obtenerEstado();
  est.meds = { '2020-01-01': { desayuno: 1, merienda: 2, cena: 3 } };
  igual(logica.buscarDisfrazDeMedicinas('2020-01-01'), null, 'la racha de hoy ya lo tuvo en cuenta');
  igual(est.disfraces.length, 0, 'y el placard quedo vacio');
});

paso('secundarias: se anotan con su hora, pagan, y tienen tope diario', () => {
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  logica.chequearDia();
  const est = logica.obtenerEstado();
  const oroAntes = est.oro;

  igual(logica.agregarExtra('   '), null, 'un texto vacio no anota nada');

  const r = logica.agregarExtra('  Sali a caminar sin motivo  ');
  igual(logica.extrasDeHoy().length, 1, 'quedo anotada');
  igual(logica.extrasDeHoy()[0].texto, 'Sali a caminar sin motivo', 'se guarda sin los espacios de mas');
  igual(est.oro, oroAntes + r.oro, 'pago el oro');
  igual(est.oroGanado, r.oro, 'y lo sumo a lo ganado de toda la vida');
  if (!(logica.extrasDeHoy()[0].ts > 0)) throw new Error('quedo sin hora');

  const largo = logica.agregarExtra('x'.repeat(EXTRA.largoMax + 200));
  igual(largo.extra.texto.length, EXTRA.largoMax, 'se recorta al largo maximo');

  while (logica.cupoExtras() > 0) logica.agregarExtra('otra mas');
  igual(logica.extrasDeHoy().length, EXTRA.porDia, 'el tope del dia');
  igual(logica.agregarExtra('una mas'), null, 'pasado el tope no anota');
});

paso('secundarias: guardarla cierra el formulario y lo festeja', () => {
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  logica.chequearDia();
  uiSt.abrirModal('extra');
  igual(uiSt.getModo(), 'modal', 'el modal abre su propio modo');
  mod.guardarExtra('ordene el cajon de los cables');
  igual(uiSt.getModal(), null, 'el formulario se cerro');
  igual(uiSt.getModo(), 'dialogo', 'y el festejo va en un dialogo');
  igual(logica.extrasDeHoy().length, 1, 'quedo anotada');
  dlg.cerrarDialogo();
});

/* ---------------------------------------------------------------------------
 *  El pomodoro.
 *
 *  Todo el asunto es que el reloj es de PARED: se guarda un instante futuro y
 *  se compara contra Date.now(). Eso es lo que lo hace servir con el juego
 *  cerrado, y también lo que lo vuelve fácil de romper — un pomodoro que se
 *  cierra dos veces paga dos veces, y uno que venció hace tres días no tendría
 *  que festejar nada.
 * ------------------------------------------------------------------------- */
const { POMODORO } = await vite.ssrLoadModule('/src/config/pomodoro.js');

/* Adelanta el reloj del pomodoro corriéndole el `hasta` para atrás. Es más
   honesto que tocar Date.now(): mueve el dato guardado, que es exactamente lo
   que pasa cuando el teléfono estuvo un rato apagado. */
function vencerPomodoro(hace = 0) {
  const est = logica.obtenerEstado();
  est.pomo.hasta = Date.now() - hace;
}

paso('pomodoro: arranca, y lo que queda sale de la hora y no de un contador', () => {
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  logica.chequearDia();
  igual(logica.pomodoroEnCurso(), null, 'sin nada corriendo arranca en null');

  const p = logica.arrancarPomodoro('clasico');
  igual(p.fase, 'foco', 'arranca en foco');
  igual(p.rato.foco, 25, 'el largo del clasico');
  const quedan = Math.round(p.restaMs / 60000);
  if (quedan !== 25) throw new Error(`quedaban ${quedan} minutos y tenian que ser 25`);
  igual(logica.relojPomodoro(90 * 1000), '01:30', 'el mm:ss');
  igual(logica.relojPomodoro(25 * 60 * 1000), '25:00', 'un pomodoro entero no arranca en 24:59');
});

paso('pomodoro: sin vencer no cierra nada', () => {
  igual(logica.cerrarFasePomodoro(), null, 'todavia no');
  if (!logica.pomodoroEnCurso()) throw new Error('se lo llevo puesto igual');
});

paso('pomodoro: al terminar el foco paga una vez y abre la pausa sola', () => {
  const est = logica.obtenerEstado();
  const oroAntes = est.oro;
  vencerPomodoro();

  const ev = logica.cerrarFasePomodoro();
  igual(ev.fase, 'foco', 'cerro el foco');
  igual(ev.pago, true, 'pago');
  igual(est.oro, oroAntes + POMODORO.oro, 'el oro');
  igual(est.oroGanado, POMODORO.oro, 'y lo ganado de toda la vida');
  igual(logica.pomodorosDeHoy().length, 1, 'quedo anotado');
  igual(logica.pomodoroEnCurso().fase, 'pausa', 'y arranco la pausa sola');

  // El mismo bloque no se puede cobrar dos veces: es el error clasico de un
  // reloj que se mira una vez por segundo.
  igual(logica.cerrarFasePomodoro(), null, 'la pausa recien empezada no cierra');
  igual(est.oro, oroAntes + POMODORO.oro, 'y no volvio a pagar');
});

paso('pomodoro: al terminar la pausa no arranca otro foco solo', () => {
  vencerPomodoro();
  const ev = logica.cerrarFasePomodoro();
  igual(ev.fase, 'pausa', 'cerro la pausa');
  igual(logica.pomodoroEnCurso(), null, 'y no encadeno nada: la proxima vuelta la decide ella');
});

paso('pomodoro: pasado el tope del dia sigue andando pero no paga', () => {
  const est = logica.obtenerEstado();
  while (logica.cupoPomodoros() > 0) {
    logica.arrancarPomodoro('corto');
    vencerPomodoro();
    logica.cerrarFasePomodoro();
    logica.cortarPomodoro();               // saltea la pausa
  }
  igual(logica.pomodorosDeHoy().length, POMODORO.porDia, 'el tope del dia');
  const oroAntes = est.oro;

  logica.arrancarPomodoro('corto');
  vencerPomodoro();
  const ev = logica.cerrarFasePomodoro();
  igual(ev.pago, false, 'el que pasa el tope no paga');
  igual(est.oro, oroAntes, 'y el oro no se movio');
  igual(logica.pomodorosDeHoy().length, POMODORO.porDia + 1, 'pero queda anotado igual');
  logica.cortarPomodoro();
});

paso('pomodoro: uno olvidado hace dias no paga ni festeja', () => {
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  logica.chequearDia();
  const est = logica.obtenerEstado();

  logica.arrancarPomodoro('clasico');
  vencerPomodoro(3 * 24 * 60 * 60 * 1000);   // vencio hace tres dias
  const ev = logica.cerrarFasePomodoro();
  igual(ev.abandonado, true, 'se toma como abandonado');
  igual(est.oro, 0, 'no pago');
  igual(logica.pomodorosDeHoy().length, 0, 'no lo anoto');
  igual(logica.pomodoroEnCurso(), null, 'y lo saco del medio');
});

paso('pomodoro: cortarlo no deja nada colgado', () => {
  logica.arrancarPomodoro('largo');
  igual(logica.cortarPomodoro(), true, 'corta');
  igual(logica.pomodoroEnCurso(), null, 'no queda nada');
  igual(logica.cortarPomodoro(), false, 'y cortar dos veces no rompe');
});

paso('pomodoro: arrancarlo frente a la silla la sienta sola', () => {
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  logica.chequearDia();
  const mueble = pararseFrenteA(silla, { x: silla.x, y: silla.y + 1 }, 3);
  if (mueble !== silla) throw new Error('no quedo frente a la silla');

  uiSt.setModo('menu');
  mod.empezarPomodoro('corto');
  if (!motor.estaSentada()) throw new Error('arranco el pomodoro pero se quedo parada');
  igual(motor.jugadora.ty, silla.y, 'quedo en la silla');
  igual(uiSt.getModo(), 'dialogo', 'y el menu se cerro para contarlo');
  dlg.cerrarDialogo();
  logica.cortarPomodoro();
  motor.levantarse();
});

paso('pomodoro: terminar el foco la para de la silla', () => {
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  logica.chequearDia();
  pararseFrenteA(silla, { x: silla.x, y: silla.y + 1 }, 3);
  uiSt.setModo('menu');
  mod.empezarPomodoro('corto');
  dlg.cerrarDialogo();

  vencerPomodoro();
  mod.revisarPomodoro();
  if (motor.estaSentada()) throw new Error('la pausa la dejo sentada trabajando');
  igual(logica.pomodorosDeHoy().length, 1, 'y quedo anotado');
  dlg.cerrarDialogo();
  logica.cortarPomodoro();
});

paso('pomodoro: sentada a la compu el reloj le sale grande abajo de ella', () => {
  // Sin reemplazarEstado(): la partida que viene de los pasos de arriba ya
  // tiene un pomodoro cobrado, y dejarla virgen le apagaria la primera subida
  // a los pasos de la nube (una partida sin empezar no se sube).
  pararseFrenteA(silla, { x: silla.x, y: silla.y + 1 }, 3);
  uiSt.setModo('menu');
  mod.empezarPomodoro('clasico');
  dlg.cerrarDialogo();
  if (!motor.sentadaEnCompu()) throw new Error('no quedo sentada a la compu');

  /* El reloj grande se dibuja adentro del cuadro, asi que esto es lo que lo
     ejercita: si el puente con gameLogic o los glifos se rompen, revienta aca
     y no en el telefono de Kath con el pomodoro andando. */
  motor.dibujar(16);

  motor.levantarse();
  logica.cortarPomodoro();
});

paso('pomodoro: el reloj grande es de la compu, no de cualquier asiento', () => {
  // En el sillon esta viendo la tele: el reloj de trabajo no tiene por que
  // taparle media pantalla.
  const desde = { x: sillon.x, y: sillon.y + 1 };
  motor.sentarse(pararseFrenteA(sillon, desde, 3));
  if (!motor.estaSentada()) throw new Error('no se sento en el sillon');
  if (motor.sentadaEnCompu()) throw new Error('el sillon paso por silla de la compu');
  motor.levantarse();
});

paso('fusion: el pomodoro que sigue andando no se apaga al sincronizar', () => {
  const enCurso = { fase: 'foco', rato: 'clasico', desde: Date.now(), hasta: Date.now() + 600000 };
  // El telefono lo arranco y se quedo callado; la tablet escribio despues.
  const tel = partidaBase({ seq: 1, pomo: enCurso });
  const tab = partidaBase({ seq: 9, pomo: null });
  const f = fusion.fusionar(tel, tab);
  if (!f.pomo) throw new Error('el que escribio ultimo le apago el reloj');
  igual(f.pomo.hasta, enCurso.hasta, 'y quedo el mismo');

  // Uno ya vencido no revive.
  const viejo = partidaBase({ seq: 1, pomo: { ...enCurso, hasta: Date.now() - 60000 } });
  igual(fusion.fusionar(viejo, tab).pomo, null, 'uno vencido no vuelve');
});

paso('fusion: los pomodoros se unen y no se duplican', () => {
  const uno = { pid: 'p1', dia: '2026-08-15', ts: 100, minutos: 25, rato: 'clasico', xp: 8, oro: 4 };
  const otro = { pid: 'p2', dia: '2026-08-15', ts: 300, minutos: 15, rato: 'corto', xp: 8, oro: 4 };
  const a = partidaBase({ seq: 1, oroGanado: 100, pomodoros: [uno] });
  const b = partidaBase({ seq: 2, oroGanado: 100, pomodoros: [otro, uno] });
  const f = fusion.fusionar(a, b);
  igual(f.pomodoros.length, 2, 'los dos, una sola vez');
  igual(f.pomodoros[0].pid, 'p2', 'el mas nuevo primero');
});

paso('modal: mientras se escribe, A y B no juegan', () => {
  uiSt.abrirModal('extra');
  mod.pulsarA();
  igual(uiSt.getModo(), 'modal', 'A no interactuo con lo que hubiera enfrente');
  mod.pulsarB();
  igual(uiSt.getModo(), 'juego', 'B cierra el formulario');
  igual(uiSt.getModal(), null, 'y lo deja limpio');
});

paso('migracion v2 -> v4 no inventa horas, secundarias ni pomodoros', () => {
  // Encadena dos pasos (v2->v3 y v3->v4), que es el caso que importa: una
  // partida vieja de verdad se salta versiones.
  const viejo = { v: 2, nivel: 2, xp: 0, oro: 0, hoy: { cama: 1 }, canjeados: [] };
  const nuevo = logica.migrar(viejo);
  igual(nuevo.v, logica.V_ACTUAL, 'version');
  igual(Object.keys(nuevo.hoyEn).length, 0, 'lo de hoy queda sin hora, no con una inventada');
  igual(nuevo.extras.length, 0, 'sin secundarias');
  igual(nuevo.pomodoros.length, 0, 'sin pomodoros');
  igual(nuevo.pomo, null, 'y sin ninguno andando');
  igual(nuevo.hoy.cama, 1, 'y la mision de hoy sigue estando');
});

paso('migracion v4 -> v5 no inventa medicinas', () => {
  // Un registro de medicacion inventado es peor que uno que empieza hoy: de
  // esta pestana hay que poder fiarse.
  const viejo = { v: 4, nivel: 1, xp: 0, oro: 0, hoy: {}, canjeados: [] };
  const nuevo = logica.migrar(viejo);
  igual(nuevo.v, logica.V_ACTUAL, 'version');
  igual(Object.keys(nuevo.meds).length, 0, 'el registro arranca vacio');
});

paso('fusion: una medicina tomada le gana a una deshecha', () => {
  const a = partidaBase({ seq: 1, meds: { '2026-08-15': { desayuno: 900, cena: 0, merienda: 1500 } } });
  const b = partidaBase({
    seq: 9,
    meds: { '2026-08-15': { desayuno: 0, merienda: 1000 }, '2026-08-14': { cena: 500 } },
  });
  const f = fusion.fusionar(a, b);
  igual(f.meds['2026-08-15'].desayuno, 900, 'tomada le gana a deshecha, aunque el otro escribio despues');
  igual(f.meds['2026-08-15'].merienda, 1000, 'entre dos horas gana la mas temprana');
  igual(f.meds['2026-08-15'].cena, 0, 'la deshecha sigue deshecha, y asi no vuelve a pagar');
  igual(f.meds['2026-08-14'].cena, 500, 'los dias que tenia uno solo de los dos no se pierden');
});

paso('fusion: las horas de hoy no se intercalan entre dos dispositivos', () => {
  // El telefono tomo agua dos veces; la tablet una, cinco minutos despues de la
  // primera. Es el mismo vaso mal sincronizado: mezclarlas armaria una manana
  // que no paso en ningun lado.
  const tel = partidaBase({ seq: 5, hoy: { agua: 2 }, hoyEn: { agua: [1000, 9000] } });
  const tab = partidaBase({ seq: 9, hoy: { agua: 1 }, hoyEn: { agua: [1300] } });
  const f = fusion.fusionar(tel, tab);
  igual(f.hoy.agua, 2, 'el contador');
  igual(f.hoyEn.agua.join(','), '1000,9000', 'las horas enteras del que hizo mas veces');
});

paso('fusion: las horas nunca sobran del contador', () => {
  const a = partidaBase({ seq: 1, dia: '2026-08-14', hoy: { agua: 3 }, hoyEn: { agua: [1, 2, 3] } });
  const b = partidaBase({ seq: 2, dia: '2026-08-15', hoy: { agua: 1 }, hoyEn: { agua: [7] } });
  const f = fusion.fusionar(a, b);
  igual(f.dia, '2026-08-15', 'manda el dia mas nuevo');
  igual(f.hoyEn.agua.length, 1, 'y se lleva solo las horas de ese dia');
});

paso('fusion: las secundarias se unen y no se duplican', () => {
  const una = { eid: 'e1', dia: '2026-08-15', texto: 'caminar', ts: 100, xp: 15, oro: 8 };
  const otra = { eid: 'e2', dia: '2026-08-15', texto: 'llamar a mama', ts: 300, xp: 15, oro: 8 };
  const a = partidaBase({ seq: 1, oroGanado: 100, extras: [una] });
  const b = partidaBase({ seq: 2, oroGanado: 100, extras: [otra, una] });
  const f = fusion.fusionar(a, b);
  igual(f.extras.length, 2, 'las dos, una sola vez');
  igual(f.extras[0].eid, 'e2', 'la mas nueva primero');
});

const arteDisfraz = await vite.ssrLoadModule('/src/engine/disfraces.js');
paso('disfraces: todos se bambolean, y quieta ninguno esta corrido', () => {
  // El cuadro 0 es la pose quieta: si algun accesorio arranca corrido, se ve
  // fuera de lugar todo el tiempo que ella no camina, que es la mayoria.
  for (const d of DISFRACES) {
    const q = arteDisfraz.bamboleoDisfraz(d.id, 0);
    if (q[0] !== 0 || q[1] !== 0) throw new Error(d.id + ' arranca corrido: ' + q);

    // Y tiene que moverse en ALGUN cuadro, si no el disfraz queda clavado
    // justo en la coreografia que baila siempre de frente. Vale de las dos
    // formas: con bamboleo (se corre el lienzo) o con dibujo propio por cuadro
    // (la capa). Lo que no vale es quedarse quieto.
    let semueve = false;
    for (let f = 0; f < 4; f++) {
      const b = arteDisfraz.bamboleoDisfraz(d.id, f);
      if (b[0] || b[1]) semueve = true;
      if (Math.abs(b[0]) > 1 || Math.abs(b[1]) > 1) throw new Error(d.id + ' se corre mas de 1 px: ' + b);
    }
    const porCuadro = arteDisfraz.DISFRAZ_ART[d.id].some((dir) => Array.isArray(dir));
    if (!semueve && !porCuadro) throw new Error(d.id + ' no se mueve en ningun cuadro');
  }

  // Sin disfraz puesto no se corre nada (disfrazPuesto es null)
  const nada = arteDisfraz.bamboleoDisfraz(null, 2);
  if (nada[0] !== 0 || nada[1] !== 0) throw new Error('sin disfraz no se corre nada');
});

paso('disfraces: solo se puede poner lo que ya encontro', () => {
  const est = logica.obtenerEstado();
  est.disfraces = ['orejas'];
  est.disfrazPuesto = null;
  if (logica.ponerDisfraz('capa')) throw new Error('dejo poner una capa que no tiene');
  igual(est.disfrazPuesto, null, 'sigue sin nada puesto');
  if (!logica.ponerDisfraz('orejas')) throw new Error('no dejo poner lo que si tiene');
  igual(est.disfrazPuesto, 'orejas', 'quedo puesto');
  logica.ponerDisfraz(null);
  igual(est.disfrazPuesto, null, 'null lo saca');
});

paso('fusion: los disfraces se suman y no queda puesto uno que no esta', () => {
  const a = partidaBase({ seq: 1, disfraces: ['orejas'], disfrazPuesto: 'orejas' });
  const b = partidaBase({ seq: 2, disfraces: ['capa'], disfrazPuesto: 'capa' });
  const f = fusion.fusionar(a, b);
  igual(f.disfraces.slice().sort().join(','), 'capa,orejas', 'se suman los dos');
  igual(f.disfrazPuesto, 'capa', 'queda el del ultimo que escribio');
  // Y el caso feo: el que escribio ultimo tiene puesto algo que la coleccion
  // fusionada no contiene (partida vieja, o un id que ya no existe).
  const c = partidaBase({ seq: 3, disfraces: [], disfrazPuesto: 'fantasma' });
  igual(fusion.fusionar(a, c).disfrazPuesto, null, 'no queda puesto un disfraz que no tiene');
});

paso('fusion: un cupon ya cumplido no vuelve a quedar pendiente', () => {
  // El caso real: Kath marca el segundo tilde en el telefono y la tablet, que
  // todavia lo tiene pendiente, sincroniza despues. Sin unir por cid la copia
  // sin marcar pisaba a la marcada y el premio recibido volvia a la lista de
  // espera.
  const pendiente = { cid: 'a1', id: 'abrazo', fecha: '2026-08-15', cumplidoEn: null };
  const cumplido = { ...pendiente, cumplidoEn: '2026-08-16' };
  const a = partidaBase({ seq: 1, oroGanado: 200, canjeados: [cumplido] });
  const b = partidaBase({ seq: 2, oroGanado: 200, canjeados: [pendiente] });
  igual(fusion.fusionar(a, b).canjeados.length, 1, 'sigue siendo un solo canje');
  igual(fusion.fusionar(a, b).canjeados[0].cumplidoEn, '2026-08-16', 'gana el que esta cumplido');
  igual(fusion.fusionar(b, a).canjeados[0].cumplidoEn, '2026-08-16', 'y no depende del orden');
});

paso('fusion: la mascota nacio una sola vez, vale la fecha mas temprana', () => {
  // Si ganara la mas nueva, cada sincronizacion le regalaria dos horas mas de
  // vida a la cascara rota del jardin.
  const a = partidaBase({ seq: 1, eclosionado: true, eclosionadoEn: 1000 });
  const b = partidaBase({ seq: 2, eclosionado: true, eclosionadoEn: 9000 });
  igual(fusion.fusionar(a, b).eclosionadoEn, 1000, 'la mas temprana');
  const c = partidaBase({ seq: 2, eclosionado: false, eclosionadoEn: 0 });
  igual(fusion.fusionar(a, c).eclosionadoEn, 1000, 'el que no sabe la fecha no la borra');
});

paso('fusion: el oro nunca queda negativo', () => {
  const a = partidaBase({ seq: 1, oroGanado: 10, canjeados: [{ cid: 'x', id: 'delivery', fecha: '2026-08-15' }] });
  const f = fusion.fusionar(a, partidaBase({ seq: 2, oroGanado: 10 }));
  if (f.oro < 0) throw new Error('oro negativo: ' + f.oro);
});

paso('fusion: conserva campos de una version mas nueva', () => {
  const a = partidaBase({ seq: 1 });
  const b = partidaBase({ seq: 2, inventoDelFuturo: 'no lo tires' });
  igual(fusion.fusionar(a, b).inventoDelFuturo, 'no lo tires', 'campo desconocido');
});

const copia = await vite.ssrLoadModule('/src/state/copia.js');
paso('copia: el sobre se arma y se valida', () => {
  const sobre = copia.armarSobre(logica.EST_INICIAL());
  igual(sobre.juego, copia.MARCA, 'marca');
  if (!disco.esPartida(sobre.estado)) throw new Error('el sobre no lleva una partida valida');
});

const reporte = await vite.ssrLoadModule('/src/state/reporte.js');
paso('reporte: el mensaje lleva titulo automatico y el link va a wa.me', () => {
  const m = reporte.armarMensaje('bug', '  no me anda el huevo  ', { nivel: 5 });
  if (!m.startsWith('🐛 *Bug en ')) throw new Error('sin titulo automatico: ' + m);
  if (!m.includes('nivel 5')) throw new Error('sin el nivel');
  if (!m.includes('v ' + cfg.version)) throw new Error('sin la version del juego');
  if (!m.endsWith('no me anda el huevo')) throw new Error('no recorta los espacios');

  // El tipo elegido tiene que cambiar el titulo, si no elegir no sirve de nada
  const idea = reporte.armarMensaje('idea', 'que merli maulle', {});
  if (!idea.startsWith('💡 *Idea en ')) throw new Error('el tipo no cambia el titulo');

  // wa.me no acepta +, espacios ni guiones: el numero se limpia solo
  const link = reporte.linkWhatsapp(m);
  if (!/^https:\/\/wa\.me\/\d+\?text=/.test(link)) throw new Error('link mal armado: ' + link);
  igual(decodeURIComponent(link.split('?text=')[1]), m, 'el mensaje viaja entero en el link');
});

/* ---------------------------------------------------------------------------
 *  Cliente contra el Worker de verdad.
 *
 *  El cliente y el servidor se hablan por un contrato chico pero fácil de
 *  romper de un lado sin darse cuenta: el nombre de X-Base-Seq, la forma del
 *  409, dónde viene el estado. Acá corren los dos módulos reales; lo único
 *  falso es la base D1 y el cable entre ellos.
 * ------------------------------------------------------------------------- */
const { default: trabajador } = await import('./worker/src/index.js');
const { baseFalsa } = await import('./worker/basefalsa.mjs');

const sync = await vite.ssrLoadModule('/src/state/sync.js');

const entorno = baseFalsa();
const viajes = { GET: 0, PUT: 0 };
globalThis.fetch = (recurso, opciones = {}) => {
  const metodo = opciones.method || 'GET';
  if (metodo in viajes) viajes[metodo]++;
  return trabajador.fetch(new Request(String(recurso), {
    method: metodo,
    headers: opciones.headers || {},
    body: opciones.body,
  }), entorno);
};

cfg.nube = 'https://juego.test';
const CODIGO_TEST = disco.asegurarCodigo();

paso('nube: la sincronizacion queda activa con la URL puesta', () => {
  if (!sync.activa()) throw new Error('sigue apagada');
});

await paso2('nube: primera subida', async () => {
  const ok = await sync.sincronizarYa();
  if (!ok) throw new Error('no sincronizo: ' + JSON.stringify(sync.estadoSync()));
  igual(sync.estadoSync().estado, 'ok', 'estado');
  if (!entorno._partidas.has(CODIGO_TEST)) throw new Error('el servidor no guardo nada');
});

await paso2('nube: lo que hizo el otro dispositivo se fusiona al bajar', async () => {
  // El "otro dispositivo": mete directo en la base una partida con misiones y
  // XP que este no tiene, como si la tablet hubiera guardado sin avisar.
  const mia = logica.obtenerEstado();
  const otra = {
    ...logica.EST_INICIAL(),
    dia: mia.dia, seq: (mia.seq || 0) + 50,
    nivel: 6, xp: 40, totalMisiones: 25, oroGanado: 300, oro: 300,
    hoy: { ...(mia.hoy || {}), ropa: 1, sol: 1 },
    eclosionado: true,
  };
  const fila = entorno._partidas.get(CODIGO_TEST);
  entorno._partidas.set(CODIGO_TEST, { ...fila, estado: JSON.stringify(otra), seq: otra.seq });

  const ok = await sync.sincronizarYa();
  if (!ok) throw new Error('no sincronizo: ' + JSON.stringify(sync.estadoSync()));

  const ahora = logica.obtenerEstado();
  igual(ahora.nivel, 6, 'el nivel del otro dispositivo llego');
  igual(ahora.hoy.ropa, 1, 'las misiones del otro llegaron');
  igual(ahora.eclosionado, true, 'el bicho eclosionado llego');
  if (!ahora.seq || ahora.seq <= otra.seq) throw new Error('la seq local no supero a la remota');
});

await paso2('nube: el 409 se resuelve solo sin perder nada', async () => {
  // Hace falta algo local sin subir: si no hay nada que decirle al servidor, el
  // cliente ni manda el PUT y nunca llegaría a haber conflicto.
  logica.obtenerEstado().totalMisiones += 1;
  logica.guardar();

  const mia = JSON.parse(JSON.stringify(logica.obtenerEstado()));
  const esperado = mia.totalMisiones + 7;

  // Alguien escribe entre el GET y el PUT. Se simula pisando la fila justo
  // cuando el cliente ya leyó: el primer PUT se va a topar con otra seq.
  const original = entorno.DB.prepare;
  let interceptado = false;
  entorno.DB.prepare = (sql) => {
    const st = original(sql);
    if (!interceptado && sql.includes('SELECT estado, seq')) {
      return {
        bind: (...args) => {
          const b = st.bind(...args);
          const first = b.first;
          b.first = async () => {
            const fila = await first();
            if (!interceptado && fila) {
              interceptado = true;
              const intrusa = { ...mia, seq: fila.seq + 99, totalMisiones: esperado };
              entorno._partidas.set(CODIGO_TEST, {
                ...fila, estado: JSON.stringify(intrusa), seq: intrusa.seq,
              });
            }
            return fila;
          };
          return b;
        },
      };
    }
    return st;
  };

  const ok = await sync.sincronizarYa();
  entorno.DB.prepare = original;
  if (!interceptado) throw new Error('la prueba no llego a provocar el conflicto');
  if (!ok) throw new Error('no resolvio el conflicto: ' + JSON.stringify(sync.estadoSync()));
  igual(logica.obtenerEstado().totalMisiones, esperado,
    'las misiones del que escribio en el medio');
});

await paso2('nube: sin conexion no rompe nada y queda pendiente', async () => {
  const fetchBueno = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(Object.assign(new Error('offline'), { name: 'TypeError' }));
  const ok = await sync.sincronizarYa();
  globalThis.fetch = fetchBueno;
  if (ok) throw new Error('dijo que sincronizo sin red');
  igual(sync.estadoSync().estado, 'pendiente', 'estado');
  if (!logica.guardar()) throw new Error('el guardado local tiene que seguir andando sin red');
});

await paso2('nube: se recupera al volver la red', async () => {
  if (!await sync.sincronizarYa()) throw new Error('no se recupero');
  igual(sync.estadoSync().estado, 'ok', 'estado');
});

await paso2('nube: sincronizar sin cambios no manda ningun PUT', async () => {
  // El caso de volver al juego después de dejarlo en segundo plano: hay que
  // bajar por si el otro dispositivo hizo algo, pero no hay nada que subir.
  await sync.sincronizarYa();
  const antes = { ...viajes };
  if (!await sync.sincronizarYa()) throw new Error('no sincronizo');
  igual(viajes.GET - antes.GET, 1, 'GET (hay que bajar igual)');
  igual(viajes.PUT - antes.PUT, 0, 'PUT');
});

await paso2('nube: guardar sin cambios no agenda ninguna subida', async () => {
  await sync.sincronizarYa();
  const antes = { ...viajes };
  // Como cerrar el menú y un par de diálogos sin tocar nada.
  logica.guardar(); logica.guardar(); logica.guardar();
  await new Promise((r) => setTimeout(r, 250));
  igual(viajes.GET + viajes.PUT - antes.GET - antes.PUT, 0, 'viajes a la red');
});

await paso2('nube: un cambio real si dispara la subida', async () => {
  await sync.sincronizarYa();
  const antes = { ...viajes };
  // Una misión hecha, que es un cambio que la fusión respeta. Tocar EST.oro a
  // mano no sirve de prueba: la fusión lo reconstruye desde oroGanado y los
  // canjes, justamente para que dos dispositivos no inventen monedas.
  logica.obtenerEstado().hoy.ducha = 1;
  logica.obtenerEstado().totalMisiones += 1;
  logica.guardar();
  await sync.sincronizarYa();
  if (viajes.PUT - antes.PUT < 1) throw new Error('no subio un cambio real');
  const guardado = JSON.parse(entorno._partidas.get(CODIGO_TEST).estado);
  igual(guardado.hoy.ducha, 1, 'la mision llego al servidor');
});

await paso2('nube: una partida sin empezar no crea nada en el servidor', async () => {
  igual(sync.hayAlgoQueGuardar(logica.EST_INICIAL()), false, 'recien abierta');
  igual(sync.hayAlgoQueGuardar({ ...logica.EST_INICIAL(), primeraVez: false }), true, 'ya toco empezar');
  igual(sync.hayAlgoQueGuardar({ ...logica.EST_INICIAL(), totalMisiones: 1 }), true, 'con una mision');
  igual(sync.hayAlgoQueGuardar({ ...logica.EST_INICIAL(), animoHoy: 'bien' }), true, 'con animo anotado');

  // Un dispositivo recien estrenado: codigo nuevo y partida en blanco. Es el
  // caso que llenaba la base de filas vacias.
  const virgen = 'AAAAABBBBBCCCCCDDDDD';
  disco.setCodigo(virgen);
  logica.reemplazarEstado(logica.EST_INICIAL(), { guardarTambien: false });
  const antes = { ...viajes };

  if (!await sync.sincronizarYa()) throw new Error('tendria que terminar bien igual');
  igual(viajes.PUT - antes.PUT, 0, 'PUT');
  if (entorno._partidas.has(virgen)) throw new Error('creo una partida vacia en el servidor');
});

cfg.nube = '';
sync.parar();

/* Los componentes de React no se ejercitan con los eventos de arriba, así que
   los dibujamos aparte: renderToStaticMarkup ejecuta el cuerpo de cada uno y
   deja ver cualquier error de dibujado sin necesidad de un navegador. */
const { renderToStaticMarkup } = await import('react-dom/server');
const React = (await import('react')).default;
const { GameProvider: Provider } = await vite.ssrLoadModule('/src/state/GameContext.jsx');

/* El formulario de las secundarias no dibuja nada mientras esta cerrado, que es
   lo correcto en el juego pero seria un "dibujo vacio" aca. Se abre para que le
   toque el turno con algo adentro. */
uiSt.abrirModal('extra');

/* Y el reloj del pomodoro tampoco dibuja nada si no hay ninguno andando. Se
   arranca uno para que le toque el turno con el reloj puesto, que es el único
   estado en el que ese componente existe. */
logica.arrancarPomodoro('clasico');

/* Y tiene que estar PARADA: sentada a la compu el reloj chico se esconde a
   proposito —manda el grande del canvas—, y eso, justo abajo, seria un
   "dibujo vacio". */
motor.levantarse();

const PomoRelojMod = await vite.ssrLoadModule('/src/components/PomodoroReloj.jsx');
paso('pomodoro: sentada a la compu no salen los dos relojes', () => {
  const dibujo = () => renderToStaticMarkup(
    React.createElement(Provider, null, React.createElement(PomoRelojMod.default, {})));
  if (!dibujo()) throw new Error('parada tendria que dibujar el reloj chico');
  motor.sentarse(pararseFrenteA(silla, { x: silla.x, y: silla.y + 1 }, 3));
  if (dibujo()) throw new Error('sentada quedaron los dos relojes puestos');
  motor.levantarse();
});

for (const [nombre, ruta] of [
  ['App', '/src/App.jsx'],
  ['HUD', '/src/components/HUD.jsx'],
  ['Efectos', '/src/components/Efectos.jsx'],
  ['TituloScreen', '/src/components/TituloScreen.jsx'],
  ['Controles', '/src/components/Controles.jsx'],
  ['AyudaTeclas', '/src/components/AyudaTeclas.jsx'],
  ['Escena', '/src/components/Escena.jsx'],
  ['Reloj', '/src/components/Reloj.jsx'],
  ['PomodoroReloj', '/src/components/PomodoroReloj.jsx'],
  ['ModalExtra', '/src/components/ModalExtra.jsx'],
  ['Canvas', '/src/components/Canvas.jsx'],
  ['Dialogo', '/src/components/Dialogo.jsx'],
  ['Menu', '/src/components/Menu/Menu.jsx'],
  ['TabMisiones', '/src/components/Menu/TabMisiones.jsx'],
  ['TabMedicinas', '/src/components/Menu/TabMedicinas.jsx'],
  ['TabProgreso', '/src/components/Menu/TabProgreso.jsx'],
  ['TabPomodoro', '/src/components/Menu/TabPomodoro.jsx'],
  ['TabPremios', '/src/components/Menu/TabPremios.jsx'],
  ['TabCompa', '/src/components/Menu/TabCompa.jsx'],
  ['TabPlacard', '/src/components/Menu/TabPlacard.jsx'],
  ['TabAjustes', '/src/components/Menu/TabAjustes.jsx'],
]) {
  // eslint-disable-next-line no-await-in-loop
  const m = await vite.ssrLoadModule(ruta);
  paso(`dibujar <${nombre}/>`, () => {
    const html = renderToStaticMarkup(
      React.createElement(Provider, null,
        React.createElement(m.default, {
          onEmpezar: noop, onA: noop, onB: noop, onMontado: noop, cargando: false,
        })));
    if (!html || html.length < 10) throw new Error('dibujo vacio');
  });
}

await new Promise((r) => setTimeout(r, 120));
seguirBucle = false;

console.log(`\nframes renderizados: ${frames}`);
if (fallos.length) {
  console.log(`\n=== ${fallos.length} FALLA(S) ===`);
  for (const [n, e] of fallos) console.log(`\n--- ${n} ---\n${e.stack}`);
} else {
  console.log('\nTodo verde: ninguna ruta tiro error.');
}

await vite.close();
process.exit(fallos.length ? 1 : 0);
