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
Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'node', maxTouchPoints: 0 }, configurable: true, writable: true,
});
globalThis.location = { protocol: 'http:', href: 'http://localhost/' };
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
console.log('modulo importado, exports:', Object.keys(mod), '\n');

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
paso('cambio de dia (visibilitychange)', () => { for (const fn of oyentesDoc.get('visibilitychange') || []) fn({}); });
paso('resize', () => { for (const fn of oyentesWin.get('resize') || []) fn({}); });

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
