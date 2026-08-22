import { MISIONES } from '../../config/misiones.js';
import { ANIMOS } from '../../config/animos.js';
import { EXTRA } from '../../config/extras.js';
import { CONFIG } from '../../config/config.js';
import {
  EST, hechoHoy, horasDe, progresoDelDia, fechaBonita, horaBonita, fechaHoraBonita,
  extrasDeHoy,
} from '../../state/gameLogic.js';

/* Cuándo se cumplió una misión, para la línea chica de abajo del nombre. La
   primera vez lleva el día y la hora; las que siguen, sólo la hora — el día ya
   está escrito ahí al lado y repetirlo tres veces no agrega nada.

   Una partida vieja no tiene horas guardadas (llegaron en la v3), así que esto
   puede devolver null aunque la misión esté hecha. */
function cuando(id) {
  const hs = horasDe(id);
  if (!hs.length) return null;
  const resto = hs.slice(1).map(horaBonita);
  return fechaHoraBonita(hs[0]) + (resto.length ? ' · ' + resto.join(' · ') : '');
}

export default function TabMisiones() {
  const p = progresoDelDia();
  const ultimos = EST.historial.slice(-7).reverse();
  const extras = extrasDeHoy();

  return (
    <>
      <div className="panel">
        <div className="panelTitulo">Misiones de hoy</div>
        <div className="barraGrande"><div style={{ width: p.pct + '%' }}></div></div>
        <div className="sub">
          {p.hechas} de {p.total} completadas · racha de {EST.racha} {EST.racha === 1 ? 'día' : 'días'} 🔥
        </div>
      </div>

      <div className="lista">
        {MISIONES.map((m) => {
          const n = hechoHoy(m.id);
          const listo = n >= m.veces;
          const marca = n > 0 ? cuando(m.id) : null;
          return (
            <div key={m.id} className={'item ' + (listo ? 'ok' : '')}>
              <div className="ico">{m.icono}</div>
              <div className="txt">
                <b>{m.nombre}</b>
                {marca && <small>🕒 {marca}</small>}
                {m.veces > 1 && (
                  <div className="pips">
                    {Array.from({ length: m.veces }, (_, i) => (
                      <i key={i} className={i < n ? 'on' : ''}></i>
                    ))}
                  </div>
                )}
              </div>
              <div className="der">{listo ? '✔' : `+${m.xp}xp`}</div>
            </div>
          );
        })}
      </div>

      {/* Las secundarias van en la misma lista y con la misma forma que las de
          arriba —son misiones del día igual— pero de otro color, porque no
          salen de la casa: las escribió ella. */}
      <div className="panel">
        <div className="panelTitulo">{EXTRA.icono} Misiones secundarias</div>
        <div className="sub">
          {extras.length
            ? `${extras.length} de ${EXTRA.porDia} hoy · +${EXTRA.xp} XP y +${EXTRA.oro} 💰 cada una`
            : `Lo que hiciste hoy y no está en la casa. Contáselo a ${CONFIG.autor}, que está en el jardín.`}
        </div>
      </div>

      {extras.length > 0 && (
        <div className="lista">
          {extras.map((x) => (
            <div key={x.eid} className="item extra">
              <div className="ico">{EXTRA.icono}</div>
              <div className="txt">
                <b>{x.texto}</b>
                <small>🕒 {fechaHoraBonita(x.ts)}</small>
              </div>
              <div className="der">✔</div>
            </div>
          ))}
        </div>
      )}

      {ultimos.length > 0 && (
        <div className="panel">
          <div className="panelTitulo">Últimos días</div>
          <div className="hist">
            {ultimos.map((d) => {
              const a = ANIMOS.find((x) => x.id === d.animo);
              return (
                <div key={d.d} className="histDia">
                  <span>{fechaBonita(d.d)}</span>
                  <span>{a ? a.cara : '·'} {d.hechas}/{MISIONES.length}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
