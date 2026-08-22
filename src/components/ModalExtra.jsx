import { useEffect, useRef, useState } from 'react';
import { useLogica, useUI } from '../hooks/useStore.js';
import { getModal, cerrarModal } from '../state/ui.js';
import { EXTRA } from '../config/extras.js';
import { CONFIG } from '../config/config.js';
import { cupoExtras, extrasDeHoy, horaBonita } from '../state/gameLogic.js';
import { guardarExtra } from '../game/juego.js';

/* ---------------------------------------------------------------------------
 *  El formulario de las misiones secundarias.
 *
 *  Es lo único del juego donde se escribe con el teclado, así que no es un
 *  diálogo con opciones: es un modo aparte ('modal' en state/ui.js) que frena
 *  al motor y desconecta A y B mientras Kath tipea.
 *
 *  Lo abre Diego, desde el jardín. Guardar cierra el modal y le pasa la posta a
 *  juego.js, que es quien festeja (sonido, recompensa que sube, diálogo).
 * -------------------------------------------------------------------------*/
export default function ModalExtra() {
  useUI();
  useLogica();

  const modal = getModal();
  const abierto = !!modal && modal.tipo === 'extra';
  const [texto, setTexto] = useState('');
  const campo = useRef(null);

  /* Al abrirse: campo limpio y foco puesto. Sin el foco automático hace falta
     un toque de más en el celular para que aparezca el teclado. */
  useEffect(() => {
    if (!abierto) return;
    setTexto('');
    const t = setTimeout(() => campo.current && campo.current.focus(), 60);
    return () => clearTimeout(t);
  }, [abierto]);

  if (!abierto) return null;

  const limpio = texto.trim();
  const quedan = cupoExtras();
  const hoy = extrasDeHoy();

  const guardar = () => {
    if (!limpio) return;
    guardarExtra(limpio);
  };

  return (
    <div id="modalFondo" onMouseDown={(e) => { if (e.target.id === 'modalFondo') cerrarModal(); }}>
      <div id="modalCaja" role="dialog" aria-modal="true" aria-labelledby="modalTitulo">
        <div className="panelTitulo" id="modalTitulo">{EXTRA.icono} Misión secundaria</div>
        <div className="sub">
          Contame qué hiciste hoy que no estaba en la lista. Lo anoto como misión del día.
        </div>

        <textarea
          ref={campo}
          className="campoExtra"
          rows={3}
          maxLength={EXTRA.largoMax}
          value={texto}
          placeholder="Salí a caminar sin motivo…"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // El teclado de acá es para escribir, no para jugar: nada de esto
            // tiene que llegar al motor.
            e.stopPropagation();
            if (e.key === 'Escape') { e.preventDefault(); cerrarModal(); }
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); guardar(); }
          }}
        />

        <div className="modalPie">
          <span className="sub">{texto.length}/{EXTRA.largoMax}</span>
          <span className="sub">+{EXTRA.xp} XP · +{EXTRA.oro} 💰 · te {quedan === 1 ? 'queda 1' : `quedan ${quedan}`} hoy</span>
        </div>

        {hoy.length > 0 && (
          <div className="lista listaExtras">
            {hoy.map((x) => (
              <div key={x.eid} className="item extra">
                <div className="ico">{EXTRA.icono}</div>
                <div className="txt"><b>{x.texto}</b><small>{horaBonita(x.ts)}</small></div>
              </div>
            ))}
          </div>
        )}

        <div className="modalBotones">
          <button className="btnModal fantasma" onClick={cerrarModal}>Cancelar</button>
          <button className="btnModal" disabled={!limpio} onClick={guardar}>Anotarla</button>
        </div>

        <div className="sub modalFirma">Se la contás a {CONFIG.autor}.</div>
      </div>
    </div>
  );
}
