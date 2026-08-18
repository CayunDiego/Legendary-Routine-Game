import { useState } from 'react';
import { COMPANERO } from '../../config/companero.js';
import { EST, etapaBicho, nombreBicho, guardar } from '../../state/gameLogic.js';
import { retratoBicho } from '../../engine/retratosCompanero.js';
import { sonar } from '../../engine/sonido.js';

export default function TabCompa() {
  const et = etapaBicho();
  const [nombre, setNombre] = useState(EST.bichoNombre || '');

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
        {retratoBicho(et) && <img className="bichoRetrato" src={retratoBicho(et)} alt="" />}
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
