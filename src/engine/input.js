import { $ } from '../dom.js';
import { input } from './motor.js';

/* ---------------------------------------------------------------------------
 *  TECLADO (para jugar en la computadora)
 *
 *  Moverse ....... flechas  o  W A S D
 *  Botón A ....... Z  ·  Espacio  ·  Enter      (aceptar / hablar)
 *  Botón B ....... X  ·  Esc  ·  Backspace      (volver / cerrar)
 *  Menú .......... M  ·  Tab
 *  Opciones ...... flechas para elegir, o las teclas 1-5 directo
 *
 *  Z y X son las de siempre en los emuladores de Game Boy: quedan al lado
 *  de las flechas si usás las dos manos, y no chocan con W A S D.
 * -------------------------------------------------------------------------*/
const TECLAS_DIR = {
  ArrowUp: 3, ArrowDown: 0, ArrowLeft: 1, ArrowRight: 2,
  KeyW: 3, KeyS: 0, KeyA: 1, KeyD: 2
};
const TECLAS_A = ['KeyZ', 'Space', 'Enter', 'NumpadEnter'];
const TECLAS_B = ['KeyX', 'Escape', 'Backspace'];
const TECLAS_MENU = ['KeyM', 'Tab'];
const IDS_DPAD = { 0: 'dabajo', 1: 'dizq', 2: 'dder', 3: 'darriba' };

const pilaDir = [];   // direcciones apretadas, la última manda

function pintarDpad() {
  for (const d in IDS_DPAD) $(IDS_DPAD[d]).classList.toggle('presionado', input.dir === +d);
}

function soltarTodo() {
  pilaDir.length = 0;
  input.dir = -1;
  pintarDpad();
}

export { TECLAS_DIR, TECLAS_A, TECLAS_B, TECLAS_MENU, IDS_DPAD, pilaDir, pintarDpad, soltarTodo };
