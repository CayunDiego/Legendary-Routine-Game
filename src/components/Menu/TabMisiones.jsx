import { MISIONES } from '../../config/misiones.js';
import { ANIMOS } from '../../config/animos.js';
import { EST, hechoHoy, progresoDelDia, fechaBonita } from '../../state/gameLogic.js';

export default function TabMisiones() {
  const p = progresoDelDia();
  const ultimos = EST.historial.slice(-7).reverse();

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
          return (
            <div key={m.id} className={'item ' + (listo ? 'ok' : '')}>
              <div className="ico">{m.icono}</div>
              <div className="txt">
                <b>{m.nombre}</b>
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
