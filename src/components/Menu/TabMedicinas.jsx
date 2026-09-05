import { MEDICINAS } from '../../config/medicinas.js';
import {
  tomasDelDia, tomadasDelDia, medicinaPendiente, desmarcarMedicina,
  diasDeMedicinas, rachaMedicinas, horaBonita, fechaBonita,
} from '../../state/gameLogic.js';
import { useLogica } from '../../hooks/useStore.js';
import { useAcciones } from '../../state/GameContext.jsx';

/* ---------------------------------------------------------------------------
 *  El registro de medicinas.
 *
 *  Es el registro más importante del juego, así que esta pestaña muestra dos
 *  cosas y nada más: cómo viene HOY (con la hora exacta de cada toma) y el
 *  historial día por día. Sin gráficos ni porcentajes de adherencia: lo que
 *  hace falta poder contestar es "¿la tomé?" y "¿a qué hora?".
 *
 *  Deshacer vive acá y no en el diálogo del pastillero a propósito: marcar
 *  tiene que ser de un toque, y un botón de "me equivoqué" al lado del de
 *  marcar es la mejor forma de que se toque el equivocado. Deshacer no
 *  devuelve el XP —`oroGanado` nunca baja, la fusión depende de eso— pero
 *  tampoco deja que la toma vuelva a pagar (ver marcarMedicina).
 * -------------------------------------------------------------------------*/
export default function TabMedicinas() {
  useLogica();
  const { marcarToma } = useAcciones();

  const hoy = tomasDelDia();
  const pendienteAhora = medicinaPendiente();
  const completas = tomadasDelDia();
  const racha = rachaMedicinas();
  const dias = diasDeMedicinas();

  return (
    <>
      <div className="panel">
        <div className="panelTitulo">{MEDICINAS.icono} Medicinas</div>
        <div className="sub">
          {completas === MEDICINAS.tomas.length
            ? 'Hoy están las tres. Eso es lo más importante que hiciste en el día.'
            : pendienteAhora
              ? `Es la hora de ${pendienteAhora.recuerdo}. El pastillero está en la mesada de la cocina.`
              : `Llevás ${completas} de ${MEDICINAS.tomas.length} hoy. Podés marcarlas desde acá o desde el pastillero de la cocina.`}
        </div>
      </div>

      <div className="panel">
        <div className="panelTitulo">Hoy</div>
        <div className="lista">
          {hoy.map(({ toma, ts }) => (
            <div key={toma.id} className={'item' + (ts ? ' ok' : '')}>
              <div className="ico">{toma.icono}</div>
              <div className="txt">
                <b>{toma.nombre}</b>
                <small>
                  {ts ? `Tomada a las ${horaBonita(ts)}` : `Entre las ${toma.desde} y las ${toma.hasta % 24}`}
                </small>
              </div>
              {ts
                ? (
                  <button className="btnDeshacer" onClick={() => desmarcarMedicina(toma.id)}>
                    Deshacer
                  </button>
                )
                : (
                  <button className="btnCanje" onClick={() => marcarToma(toma.id)}>
                    Marcar
                  </button>
                )}
            </div>
          ))}
        </div>
        <div className="sub">
          Cada toma marcada da {MEDICINAS.xp} XP, una vez por día. Las medicinas no
          dan monedas: lo que dan son los accesorios del placard que no se compran
          con nada, y se destraban completando el día.
          {racha > 0 && ` Llevás ${racha} ${racha === 1 ? 'día' : 'días'} con las tres completas.`}
        </div>
      </div>

      <div className="panel">
        <div className="panelTitulo">Registro</div>
        <div className="sub">
          Los últimos {MEDICINAS.diasVisibles} días. La hora es la que quedó anotada al marcar.
        </div>
        <div className="hist">
          {dias.map(({ dia, tomas, tomadas }) => (
            <div key={dia} className={'medDia' + (tomadas === MEDICINAS.tomas.length ? ' full' : '')}>
              <b>{fechaBonita(dia)}</b>
              <div className="medTomas">
                {tomas.map(({ toma, ts }) => (
                  <span key={toma.id} className={ts ? 'medOk' : 'medNo'}>
                    {toma.icono} {ts ? horaBonita(ts) : '—'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
