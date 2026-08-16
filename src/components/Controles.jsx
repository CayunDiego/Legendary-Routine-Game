import { useEffect, useRef } from 'react';
import { input } from '../engine/motor.js';
import { iniciarAudio } from '../engine/sonido.js';

const DIRS = { arriba: 3, abajo: 0, izq: 1, der: 2 };

/* ---------------------------------------------------------------------------
 *  D-pad y botones A/B.
 *
 *  Los listeners se enganchan a mano en un useEffect en vez de usar onTouchStart:
 *  el d-pad necesita preventDefault en touchstart para que el dedo no scrollee
 *  ni haga zoom, y para eso el listener tiene que ser { passive: false }, cosa
 *  que las props de React no permiten declarar.
 *
 *  La clase 'presionado' también se toca a mano, porque el teclado la maneja por
 *  su lado desde engine/input.js (pintarDpad) y no conviene que dos dueños se
 *  peleen por el mismo atributo.
 * ------------------------------------------------------------------------- */
export default function Controles({ onA, onB }) {
  const raiz = useRef(null);
  const acciones = useRef({ onA, onB });
  acciones.current = { onA, onB };

  useEffect(() => {
    const nodo = raiz.current;
    if (!nodo) return;
    const limpiar = [];

    for (const k in DIRS) {
      const el = nodo.querySelector('#d' + k);
      if (!el) continue;
      const on = (e) => {
        e.preventDefault();
        iniciarAudio();
        input.dir = DIRS[k];
        el.classList.add('presionado');
      };
      const off = (e) => {
        e.preventDefault();
        if (input.dir === DIRS[k]) input.dir = -1;
        el.classList.remove('presionado');
      };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false });
      el.addEventListener('mousedown', on);
      el.addEventListener('mouseup', off);
      el.addEventListener('mouseleave', off);
      limpiar.push(() => {
        el.removeEventListener('touchstart', on);
        el.removeEventListener('touchend', off);
        el.removeEventListener('touchcancel', off);
        el.removeEventListener('mousedown', on);
        el.removeEventListener('mouseup', off);
        el.removeEventListener('mouseleave', off);
      });
    }

    const botones = [
      ['#botA', () => acciones.current.onA()],
      ['#botB', () => acciones.current.onB()],
    ];
    for (const [sel, fn] of botones) {
      const el = nodo.querySelector(sel);
      if (!el) continue;
      const toque = (e) => { e.preventDefault(); fn(); };
      const clic = (e) => { e.preventDefault(); fn(); };
      el.addEventListener('touchstart', toque, { passive: false });
      el.addEventListener('click', clic);
      limpiar.push(() => {
        el.removeEventListener('touchstart', toque);
        el.removeEventListener('click', clic);
      });
    }

    return () => limpiar.forEach((f) => f());
  }, []);

  return (
    <footer id="controles" ref={raiz}>
      <div id="dpad">
        <div className="dbtn" id="darriba">▲</div>
        <div className="dbtn" id="dizq">◀</div>
        <div id="dcentro"></div>
        <div className="dbtn" id="dder">▶</div>
        <div className="dbtn" id="dabajo">▼</div>
      </div>
      <div id="botones">
        <div className="bbtn" id="botB">B<i className="tecla">X</i></div>
        <div className="bbtn" id="botA">A<i className="tecla">Z</i></div>
      </div>
    </footer>
  );
}
