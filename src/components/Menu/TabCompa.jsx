import { useEffect, useRef, useState } from 'react';
import { COMPANERO } from '../../config/companero.js';
import { EST, etapaBicho, nombreBicho, guardar } from '../../state/gameLogic.js';
import { SPR } from '../../engine/objetos.js';
import { sonar } from '../../engine/sonido.js';

export default function TabCompa() {
  const et = etapaBicho();
  const lienzo = useRef(null);
  const [nombre, setNombre] = useState(EST.bichoNombre || '');

  /* El bicho se dibuja sobre un canvas, no es una imagen: hay que pintarlo a
     mano cada vez que cambia la etapa. */
  useEffect(() => {
    const c = lienzo.current;
    if (!c || et < 0) return;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, 96, 96);
    if (SPR.__bichos && SPR.__bichos[et]) g.drawImage(SPR.__bichos[et], 0, 0, 96, 96);
  }, [et]);

  if (et < 0) {
    const faltan = Math.max(0, COMPANERO.nivelEclosion - EST.nivel);
    return (
      <div className="panel centro">
        <div className="bichoGrande">🥚</div>
        <div className="panelTitulo">Huevo misterioso</div>
        <div className="sub">
          {faltan > 0
            ? `Nace cuando llegues al nivel ${COMPANERO.nivelEclosion}. Te faltan ${faltan}.`
            : '¡Está por nacer! Andá al jardín.'}
        </div>
      </div>
    );
  }

  const e = COMPANERO.etapas[et];
  const sig = COMPANERO.etapas[et + 1];

  return (
    <>
      <div className="panel centro">
        <canvas ref={lienzo} id="lienzoBicho" width="96" height="96" className="bichoLienzo"></canvas>
        <div className="panelTitulo">{nombreBicho()}</div>
        <div className="sub">{e.desc}</div>
        <div className="sub">{sig ? `Evoluciona en el nivel ${sig.desde}` : 'Forma final alcanzada'}</div>
        <input
          id="inpNombre"
          className="inp"
          maxLength={12}
          placeholder="Ponele un nombre"
          value={nombre}
          onChange={(ev) => setNombre(ev.target.value)}
        />
        <button
          id="btnNombre"
          className="btnPrim"
          onClick={() => {
            EST.bichoNombre = nombre.trim().slice(0, 12) || null;
            guardar();
            sonar('ok');
          }}
        >Guardar nombre</button>
      </div>

      <div className="panel">
        <div className="panelTitulo">Tus números</div>
        <div className="hist">
          <div className="histDia"><span>Nivel</span><span>{EST.nivel}</span></div>
          <div className="histDia"><span>Misiones completadas</span><span>{EST.totalMisiones}</span></div>
          <div className="histDia"><span>Mejor racha</span><span>{EST.mejorRacha} días</span></div>
          <div className="histDia"><span>Días perfectos</span><span>{EST.diasCompletos}</span></div>
        </div>
      </div>
    </>
  );
}
