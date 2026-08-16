import { useEffect, useRef } from 'react';
import { montarCanvas } from '../engine/motor.js';

/* El canvas es el único nodo que React crea pero no controla: a partir de que
   montarCanvas() se queda con la referencia, todo lo que pasa adentro lo dibuja
   el motor a 60fps. React no vuelve a tocarlo porque el elemento no depende de
   ningún estado. */
export default function Canvas({ onMontado }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    montarCanvas(ref.current);
    if (onMontado) onMontado();
  }, []);

  return <canvas id="lienzo" ref={ref}></canvas>;
}
