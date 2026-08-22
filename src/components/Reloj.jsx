import { useEffect, useState } from 'react';
import { useUI } from '../hooks/useStore.js';
import { getModo } from '../state/ui.js';

/* ---------------------------------------------------------------------------
 *  RELOJ DE PARED — la fecha y la hora, arriba a la izquierda de la escena.
 *
 *  Los números se dibujan pixel por pixel y no con una tipografía: el resto del
 *  juego es arte de 24x32 escalado x3, y cualquier fuente del sistema al lado
 *  se ve como una etiqueta pegada encima. Además una fuente pixelada de verdad
 *  serían ~30 KB de archivo y un parpadeo mientras carga, para nueve dígitos y
 *  dos signos.
 *
 *  Cada glifo es una grilla de 3 de ancho x 5 de alto (los dos puntos, 1 de
 *  ancho). Se dibujan como rectángulos de un SVG con shape-rendering
 *  crispEdges, así que escalan a cualquier tamaño sin desenfoque y sin pesar
 *  nada.
 * -------------------------------------------------------------------------*/
const GLIFOS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  ':': ['0', '1', '0', '1', '0'],
  '/': ['001', '001', '010', '100', '100'],
  ' ': ['0', '0', '0', '0', '0'],
};

const ALTO = 5;
const SEPARACION = 1;   // columnas vacías entre glifo y glifo

/* Un texto corto escrito con la grilla de arriba. `px` es cuántos píxeles de
   pantalla mide cada píxel del dibujo. El color sale de `currentColor`, así
   que se cambia desde el CSS como si fuera texto. */
function PixelTexto({ txt, px = 3, titulo }) {
  const glifos = [...String(txt)].map((c) => GLIFOS[c] || GLIFOS[' ']);
  const ancho = glifos.reduce((s, g) => s + g[0].length + SEPARACION, 0) - SEPARACION;

  const puntos = [];
  let x = 0;
  for (const g of glifos) {
    for (let fila = 0; fila < ALTO; fila++) {
      for (let col = 0; col < g[fila].length; col++) {
        if (g[fila][col] === '1') puntos.push(<rect key={`${x}-${col}-${fila}`} x={x + col} y={fila} width="1" height="1" />);
      }
    }
    x += g[0].length + SEPARACION;
  }

  return (
    <svg
      className="pixTexto"
      viewBox={`0 0 ${ancho} ${ALTO}`}
      width={ancho * px}
      height={ALTO * px}
      shapeRendering="crispEdges"
      role="img"
      aria-label={titulo || String(txt)}
    >
      {puntos}
    </svg>
  );
}

/* dd/mm y hh:mm del reloj del dispositivo. Van juntos en un solo string porque
   así el estado es un valor comparable: si el minuto no cambió, React no
   redibuja aunque el temporizador corra cada segundo. */
function leerReloj() {
  const d = new Date();
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export default function Reloj() {
  useUI();
  const [ahora, setAhora] = useState(leerReloj);

  /* Cada segundo y no cada minuto: alcanzaría con esperar al minuto siguiente,
     pero el teléfono suspende los temporizadores mientras está bloqueado y al
     volver el reloj tiene que ponerse en hora enseguida, no dentro de un
     minuto. Es un setState con el mismo string casi siempre, y React corta ahí
     sin redibujar nada. */
  useEffect(() => {
    const t = setInterval(() => setAhora(leerReloj()), 1000);
    return () => clearInterval(t);
  }, []);

  // En la portada no va: tapa el título y todavía no empezó nada.
  if (getModo() === 'titulo') return null;

  const [fecha, hora] = ahora.split(' ');

  return (
    <div id="reloj" aria-label={`Fecha y hora: ${fecha}, ${hora}`}>
      <PixelTexto txt={fecha} px={2} titulo={fecha} />
      <PixelTexto txt={hora} px={3} titulo={hora} />
    </div>
  );
}

export { PixelTexto, GLIFOS };
