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

/* Las cinco pestañas del menú, para poder clickearlas. */
const tabs = ['misiones', 'progreso', 'premios', 'compa', 'ajustes'].map((p) => {
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
console.log('modulo importado, exports:', Object.keys(mod), '\n');

/* config.js trae la URL del Worker de verdad, que es lo que necesita el juego
   publicado. Acá se apaga ANTES de iniciar(): un test no puede depender de que
   haya internet ni escribir en la base de producción. Más abajo se vuelve a
   prender, pero apuntando al Worker corriendo en este mismo proceso. */
const cfg = (await vite.ssrLoadModule('/src/config/config.js')).CONFIG;
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

paso('migracion v1 -> v2 reconstruye el oro ganado', () => {
  const viejo = { v: 1, nivel: 2, xp: 10, oro: 40, hoy: {}, canjeados: [{ id: 'abrazo', fecha: '2026-08-10' }] };
  const nuevo = logica.migrar(viejo);
  igual(nuevo.v, 2, 'version');
  igual(nuevo.oroGanado, 70, 'oro ganado = 40 que tiene + 30 del abrazo');
  if (!nuevo.canjeados[0].cid) throw new Error('el canje viejo no recibio cid');
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

paso('fusion: el oro nunca queda negativo', () => {
  const a = partidaBase({ seq: 1, oroGanado: 10, canjeados: [{ cid: 'x', id: 'cita', fecha: '2026-08-15' }] });
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

for (const [nombre, ruta] of [
  ['App', '/src/App.jsx'],
  ['HUD', '/src/components/HUD.jsx'],
  ['Efectos', '/src/components/Efectos.jsx'],
  ['TituloScreen', '/src/components/TituloScreen.jsx'],
  ['Controles', '/src/components/Controles.jsx'],
  ['AyudaTeclas', '/src/components/AyudaTeclas.jsx'],
  ['Escena', '/src/components/Escena.jsx'],
  ['Canvas', '/src/components/Canvas.jsx'],
  ['Dialogo', '/src/components/Dialogo.jsx'],
  ['Menu', '/src/components/Menu/Menu.jsx'],
  ['TabMisiones', '/src/components/Menu/TabMisiones.jsx'],
  ['TabProgreso', '/src/components/Menu/TabProgreso.jsx'],
  ['TabPremios', '/src/components/Menu/TabPremios.jsx'],
  ['TabCompa', '/src/components/Menu/TabCompa.jsx'],
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
