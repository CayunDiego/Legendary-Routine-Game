import { useEffect } from 'react';
import { arrancarBucle, cargarSprite } from '../engine/motor.js';

/* Carga las hojas de sprites y recién ahí prende el requestAnimationFrame.
   `listo` se llama cuando terminó la carga, para sacar el cartel de CARGANDO. */
export function useGameLoop(listo) {
  useEffect(() => {
    let vivo = true;
    cargarSprite(() => {
      if (!vivo) return;
      listo();
      arrancarBucle();
    });
    return () => { vivo = false; };
  }, []);
}
