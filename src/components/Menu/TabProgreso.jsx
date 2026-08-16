import { MISIONES } from '../../config/misiones.js';
import { ANIMOS } from '../../config/animos.js';
import { EST, xpNecesaria, fechaBonita, ultimosDias, DIAS_TIRA } from '../../state/gameLogic.js';

/* ---------------------------------------------------------------------------
 *  La tira de días mide "cuántas misiones completaste" (una magnitud a lo largo
 *  del tiempo), así que va como barritas: la altura ya dice el número. El color
 *  es un solo tono que va de claro a oscuro acompañando esa altura, nunca
 *  colores distintos por día — el dato no cambia de categoría, cambia de
 *  cantidad. Así también se entiende sin distinguir bien los colores.
 * ------------------------------------------------------------------------- */
const RAMPA = ['#e8ded0', '#f7dc94', '#f2c14e', '#e0a020', '#c9821a'];

function colorDia(n, total) {
  if (!n) return RAMPA[0];
  const p = n / total;
  if (p >= 1) return RAMPA[4];
  if (p >= 0.66) return RAMPA[3];
  if (p >= 0.33) return RAMPA[2];
  return RAMPA[1];
}

export default function TabProgreso() {
  const dias = ultimosDias();
  const total = MISIONES.length;
  const nec = xpNecesaria(EST.nivel);
  const maxD = Math.max(...dias.map((d) => d.hechas));
  const conDato = dias.filter((d) => d.hayDato);
  const prom = conDato.length ? conDato.reduce((s, d) => s + d.hechas, 0) / conDato.length : 0;

  const animos = {};
  for (const d of dias) if (d.animo) animos[d.animo] = (animos[d.animo] || 0) + 1;
  const conAnimo = ANIMOS.filter((a) => animos[a.id]);

  return (
    <>
      <div className="panel centro">
        <div className="heroNum">{EST.racha}<small>🔥</small></div>
        <div className="heroTxt">{EST.racha === 1 ? 'día' : 'días'} de racha</div>
        <div className="sub">
          Tu mejor marca: {EST.mejorRacha} {EST.mejorRacha === 1 ? 'día' : 'días'}
        </div>
      </div>

      <div className="panel">
        <div className="panelTitulo">Últimos {DIAS_TIRA} días</div>
        <div className="sub">Misiones completas por día (de {total})</div>
        <div className="tira">
          {dias.map((d, i) => {
            const alt = d.hechas ? Math.max(8, Math.round((d.hechas / total) * 100)) : 4;
            const esHoy = d.iso === EST.dia;
            const etiqueta =
              (d.hechas === maxD && maxD > 0 && !dias.slice(0, i).some((x) => x.hechas === maxD)) || esHoy;
            return (
              <div
                key={d.iso}
                className={'colDia' + (esHoy ? ' hoy' : '')}
                title={`${fechaBonita(d.iso)} · ${d.hechas} de ${total}`}
              >
                <span className="valDia">{etiqueta && d.hechas ? d.hechas : ''}</span>
                <div className="barDia" style={{ height: alt + '%', background: colorDia(d.hechas, total) }}></div>
              </div>
            );
          })}
        </div>
        <div className="tiraPie">
          <span>{fechaBonita(dias[0].iso)}</span>
          <span className="escala">
            menos {RAMPA.slice(1).map((c) => <i key={c} style={{ background: c }}></i>)} más
          </span>
          <span>hoy</span>
        </div>
        <div className="sub">Promedio de los días jugados: <b>{prom.toFixed(1)}</b> de {total}</div>
      </div>

      <div className="panel">
        <div className="panelTitulo">Tus números</div>
        <div className="cuadricula">
          <div className="celda"><b>{EST.nivel}</b><span>nivel</span></div>
          <div className="celda"><b>{EST.xp}/{nec}</b><span>XP</span></div>
          <div className="celda"><b>{EST.oro}</b><span>monedas</span></div>
          <div className="celda"><b>{EST.totalMisiones}</b><span>misiones hechas</span></div>
          <div className="celda"><b>{EST.diasCompletos}</b><span>días perfectos</span></div>
          <div className="celda"><b>{EST.canjeados.length}</b><span>premios canjeados</span></div>
        </div>
      </div>

      {conAnimo.length > 0 && (
        <div className="panel">
          <div className="panelTitulo">Cómo te sentiste</div>
          <div className="sub">En los últimos {DIAS_TIRA} días</div>
          <div className="chips">
            {conAnimo.map((a) => (
              <span key={a.id} className="chipAnimo">{a.cara} {a.label} <b>{animos[a.id]}</b></span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
