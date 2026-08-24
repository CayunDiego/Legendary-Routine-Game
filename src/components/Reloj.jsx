import { useEffect, useState } from 'react';
import { useUI } from '../hooks/useStore.js';
import { getModo } from '../state/ui.js';
import { GLIFOS, ALTO_GLIFO, SEP_GLIFO, anchoGlifos } from '../engine/glifos.js';

/* ---------------------------------------------------------------------------
 *  RELOJ DE PARED — la fecha y la hora, arriba a la izquierda de la escena.
 *
 *  Los dígitos salen de engine/glifos.js: son una grilla de 3x5 dibujada pixel
 *  por pixel, para que no desentonen con el arte del juego (el porqué largo está
 *  allá). Acá se pintan como rectángulos de un SVG con shape-rendering
 *  crispEdges, así que escalan a cualquier tamaño sin desenfoque y sin pesar
 *  nada.
 * -------------------------------------------------------------------------*/

/* Un texto corto escrito con la grilla de arriba. `px` es cuántos píxeles de
   pantalla mide cada píxel del dibujo. El color sale de `currentColor`, así
   que se cambia desde el CSS como si fuera texto. */
function PixelTexto({ txt, px = 3, titulo }) {
  const glifos = [...String(txt)].map((c) => GLIFOS[c] || GLIFOS[' ']);
  const ancho = anchoGlifos(txt);

  const puntos = [];
  let x = 0;
  for (const g of glifos) {
    for (let fila = 0; fila < ALTO_GLIFO; fila++) {
      for (let col = 0; col < g[fila].length; col++) {
        if (g[fila][col] === '1') puntos.push(<rect key={`${x}-${col}-${fila}`} x={x + col} y={fila} width="1" height="1" />);
      }
    }
    x += g[0].length + SEP_GLIFO;
  }

  return (
    <svg
      className="pixTexto"
      viewBox={`0 0 ${ancho} ${ALTO_GLIFO}`}
      width={ancho * px}
      height={ALTO_GLIFO * px}
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
