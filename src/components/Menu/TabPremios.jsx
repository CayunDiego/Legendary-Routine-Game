import { CONFIG } from '../../config/config.js';
import { PREMIOS } from '../../config/premios.js';
import { EST, canjear, fechaBonita } from '../../state/gameLogic.js';
import { sonar } from '../../engine/sonido.js';
import { useAcciones } from '../../state/GameContext.jsx';

/* Reemplaza a htmlPremios() + enlazarPremios(), que armaba el HTML como texto
   y después volvía a buscar los botones por clase para engancharles el onclick. */
export default function TabPremios() {
  const { canjearPremio } = useAcciones();

  return (
    <>
      <div className="panel">
        <div className="panelTitulo">Puesto de premios</div>
        <div className="sub">
          Tenés <b>{EST.oro} 💰</b>. Los premios se canjean acá y se los mostrás a {CONFIG.autor}.
        </div>
      </div>

      <div className="lista">
        {PREMIOS.map((p) => {
          const puede = EST.oro >= p.costo;
          return (
            <div key={p.id} className={'item ' + (puede ? '' : 'caro')}>
              <div className="ico">{p.icono}</div>
              <div className="txt"><b>{p.nombre}</b><small>{p.desc}</small></div>
              <button
                className="btnCanje"
                disabled={!puede}
                onClick={() => {
                  if (!canjear(p.id)) return;
                  sonar('moneda');
                  canjearPremio(p);
                }}
              >{p.costo} 💰</button>
            </div>
          );
        })}
      </div>

      {EST.canjeados.length > 0 && (
        <div className="panel">
          <div className="panelTitulo">Cupones canjeados</div>
          <div className="hist">
            {EST.canjeados.slice(0, 12).map((c, i) => {
              const p = PREMIOS.find((x) => x.id === c.id);
              if (!p) return null;
              return (
                <div key={i} className="histDia">
                  <span>{p.icono} {p.nombre}</span>
                  <span>{fechaBonita(c.fecha)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
