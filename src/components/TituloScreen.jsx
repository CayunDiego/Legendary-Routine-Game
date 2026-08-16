import { useEffect, useMemo, useRef, useState } from 'react';
import { useLogica, useUI } from '../hooks/useStore.js';
import { CONFIG } from '../config/config.js';
import { EST } from '../state/gameLogic.js';
import { getModo } from '../state/ui.js';

const CARAS = ['💗', '💛', '✨', '💙'];

export default function TituloScreen({ onEmpezar }) {
  useLogica();
  useUI();

  const enTitulo = getModo() === 'titulo';

  /* Los corazones se sortean una sola vez: si se recalcularan en cada dibujado,
     saltarían de lugar cada vez que cambia el estado. */
  const corazones = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      cara: CARAS[i % CARAS.length],
      left: Math.random() * 100 + '%',
      dur: 7 + Math.random() * 8 + 's',
      delay: -Math.random() * 12 + 's',
      size: 12 + Math.random() * 14 + 'px',
    })),
    []
  );

  /* El pie se congela cuando arranca el juego. empezar() cambia el modo antes
     de tocar EST.primeraVez, así que el texto no cambia durante el fundido. */
  const pieRef = useRef('');
  if (enTitulo) {
    pieRef.current = EST.primeraVez
      ? `un regalo de ${CONFIG.autor}`
      : `nivel ${EST.nivel} · racha de ${EST.racha} ${EST.racha === 1 ? 'día' : 'días'}`;
  }

  /* Igual que el original: primero se desvanece, y recién a los 450 ms se saca
     del layout para que no siga tapando la escena. */
  const [fuera, setFuera] = useState(false);
  useEffect(() => {
    if (enTitulo) { setFuera(false); return; }
    const t = setTimeout(() => setFuera(true), 450);
    return () => clearTimeout(t);
  }, [enTitulo]);

  return (
    <section
      id="titulo"
      className={enTitulo ? '' : 'oculto'}
      style={fuera ? { display: 'none' } : undefined}
    >
      <div id="corazones">
        {corazones.map((h, i) => (
          <i
            key={i}
            style={{
              left: h.left,
              animationDuration: h.dur,
              animationDelay: h.delay,
              fontSize: h.size,
            }}
          >{h.cara}</i>
        ))}
      </div>
      <div id="tituloChico">rutina</div>
      <div id="tituloGrande">LEGENDARIA</div>
      <div id="tituloNombre">{CONFIG.jugadora}</div>
      <div id="tituloPie">{pieRef.current}</div>
      <button id="tituloTocar" onClick={onEmpezar}>▶  Empezar</button>
    </section>
  );
}
