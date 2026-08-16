import { useEffect } from 'react';
import { armarTeclado } from '../game/juego.js';
import { soltarTodo } from '../engine/input.js';
import { ajustarCanvas, actualizarCamara } from '../engine/motor.js';

/* Teclado, redimensionado de ventana y "soltar todo" cuando la pestaña pierde
   el foco (si no, una tecla queda apretada para siempre). */
export function useInput() {
  useEffect(() => {
    const desarmar = armarTeclado();
    const alRedimensionar = () => { ajustarCanvas(); actualizarCamara(true); };
    addEventListener('resize', alRedimensionar);
    addEventListener('blur', soltarTodo);
    return () => {
      if (typeof desarmar === 'function') desarmar();
      removeEventListener('resize', alRedimensionar);
      removeEventListener('blur', soltarTodo);
    };
  }, []);
}
