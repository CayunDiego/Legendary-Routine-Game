import { CONFIG } from '../../config/config.js';
import { PREMIOS } from '../../config/premios.js';
import { EST, canjear, confirmarCanje, fechaBonita } from '../../state/gameLogic.js';
import { sonar } from '../../engine/sonido.js';
import { useAcciones } from '../../state/GameContext.jsx';

/* Reemplaza a htmlPremios() + enlazarPremios(), que armaba el HTML como texto
   y después volvía a buscar los botones por clase para engancharles el onclick.

   Los canjeados van en dos listas separadas y no en una sola: canjear sólo
   descuenta las monedas, así que hasta que Kath no marca el segundo tilde no
   hay forma de saber si Diego se lo cumplió. Mezclarlos escondía los que
   seguían esperando entre los que ya estaban saldados. */
export default function TabPremios() {
  const { canjearPremio } = useAcciones();

  const pendientes = EST.canjeados.filter((c) => !c.cumplidoEn);
  const cumplidos = EST.canjeados.filter((c) => c.cumplidoEn);

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

      {pendientes.length > 0 && (
        <div className="panel">
          <div className="panelTitulo">Esperando a {CONFIG.autor}</div>
          <div className="sub">
            Cuando te lo cumpla, tocá el ✓ y queda cerrado.
          </div>
          <div className="lista">
            {pendientes.map((c, i) => {
              const p = PREMIOS.find((x) => x.id === c.id);
              if (!p) return null;
              return (
                <div key={c.cid || `sincid-${i}`} className="item">
                  <div className="ico">{p.icono}</div>
                  <div className="txt">
                    <b>{p.nombre}</b>
                    <small>Canjeado el {fechaBonita(c.fecha)}</small>
                  </div>
                  <button
                    className="btnCanje"
                    onClick={() => {
                      if (!confirmarCanje(c)) return;
                      sonar('ok');
                    }}
                  >✓</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cumplidos.length > 0 && (
        <div className="panel">
          <div className="panelTitulo">Ya cumplidos</div>
          <div className="hist">
            {cumplidos.slice(0, 12).map((c, i) => {
              const p = PREMIOS.find((x) => x.id === c.id);
              if (!p) return null;
              return (
                <div key={c.cid || `sincid-${i}`} className="histDia">
                  <span><span className="dobleTilde">✓✓</span> {p.icono} {p.nombre}</span>
                  <span>{fechaBonita(c.cumplidoEn)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
