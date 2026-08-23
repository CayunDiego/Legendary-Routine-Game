import { useEffect, useState } from 'react';
import { POMODORO } from '../../config/pomodoro.js';
import {
  pomodoroEnCurso, pomodorosDeHoy, cupoPomodoros, relojPomodoro, horaBonita,
} from '../../state/gameLogic.js';
import { useLogica } from '../../hooks/useStore.js';
import { useAcciones } from '../../state/GameContext.jsx';

/* ---------------------------------------------------------------------------
 *  El reloj de la compu.
 *
 *  Dos estados y nada más: sin nada corriendo se elige un largo; con algo
 *  corriendo se ve cuánto falta. No hay "pausar": un pomodoro pausado no es un
 *  pomodoro, y el botón invita justamente a lo que el método existe para
 *  evitar. Se puede cortar, que es otra cosa — cortarlo es decidir que hoy no.
 *
 *  El segundero es de este componente y no del store del juego: EST sólo
 *  cambia cuando una fase abre o cierra, y hacer que el estado del juego lata
 *  una vez por segundo redibujaría el HUD entero para mover dos dígitos.
 * -------------------------------------------------------------------------*/
export default function TabPomodoro() {
  useLogica();
  const { empezarPomodoro, frenarPomodoro } = useAcciones();

  /* Sólo existe para forzar el redibujo cada segundo. Lo que se muestra sale
     siempre de pomodoroEnCurso(), que recalcula contra el reloj de verdad. */
  const [, latir] = useState(0);
  useEffect(() => {
    const t = setInterval(() => latir((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const pomo = pomodoroEnCurso();
  const hoy = pomodorosDeHoy();
  const cupo = cupoPomodoros();
  const minutosHoy = hoy.reduce((s, p) => s + (Number(p.minutos) || 0), 0);

  return (
    <>
      <div className="panel">
        <div className="panelTitulo">{POMODORO.icono} Pomodoro</div>
        <div className="sub">
          Trabajás un rato con el reloj corriendo y después parás. El reloj sigue
          andando aunque cierres el juego o apagues la pantalla.
        </div>
      </div>

      {pomo ? <EnCurso pomo={pomo} onCortar={frenarPomodoro} />
        : <Elegir cupo={cupo} onArrancar={empezarPomodoro} />}

      <div className="panel">
        <div className="panelTitulo">Hoy</div>
        <div className="sub">
          {hoy.length === 0
            ? 'Todavía ninguno. Cuando quieras arrancar, estoy acá.'
            : `${hoy.length} ${hoy.length === 1 ? 'bloque' : 'bloques'} · ${minutosHoy} minutos de foco.`}
          {hoy.length > 0 && cupo === 0 && ' Ya llegaste al tope que paga, pero el reloj sirve igual.'}
        </div>
        {hoy.length > 0 && (
          <div className="hist">
            {hoy.map((p, i) => (
              <div key={p.pid || `sinpid-${i}`} className="histDia">
                <span>{POMODORO.icono} {p.minutos} min</span>
                <span>{horaBonita(p.ts)}{p.oro > 0 ? ` · +${p.oro} 💰` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* --- eligiendo el largo --------------------------------------------------- */
function Elegir({ cupo, onArrancar }) {
  return (
    <div className="panel">
      <div className="panelTitulo">¿Cuánto?</div>
      <div className="lista">
        {POMODORO.ratos.map((r) => (
          <div key={r.id} className="item">
            <div className="ico">{r.foco}</div>
            <div className="txt"><b>{r.label}</b><small>{r.desc}</small></div>
            <button className="btnCanje" onClick={() => onArrancar(r.id)}>
              {r.foco} + {r.pausa}
            </button>
          </div>
        ))}
      </div>
      <div className="sub">
        {cupo > 0
          ? `Cada bloque terminado da ${POMODORO.xp} XP y ${POMODORO.oro} 💰. Te quedan ${cupo} que pagan hoy.`
          : 'Por hoy ya cobraste todos los que pagan. El reloj anda igual.'}
      </div>
    </div>
  );
}

/* --- con el reloj andando -------------------------------------------------- */
function EnCurso({ pomo, onCortar }) {
  const foco = pomo.fase === 'foco';
  // Se llena a medida que pasa el rato, no al revés: una barra que se vacía se
  // lee como algo que se está por acabar mal.
  const pct = Math.min(100, Math.max(0, (1 - pomo.restaMs / pomo.largoMs) * 100));

  return (
    <div className={'panel pomoCaja' + (foco ? '' : ' pausa')}>
      <div className="panelTitulo">{foco ? `${POMODORO.icono} Foco` : '☕ Pausa'}</div>
      <div className="pomoReloj">{relojPomodoro(pomo.restaMs)}</div>
      <div className="barra"><div style={{ width: pct + '%' }}></div></div>
      <div className="sub">
        {foco
          ? `${pomo.rato.label} · ${pomo.rato.foco} minutos. Después vienen ${pomo.rato.pausa} de pausa.`
          : `${pomo.rato.pausa} minutos para vos. Parate, tomá agua, mirá cualquier cosa que no sea una pantalla.`}
      </div>
      <button className="btnAncho" onClick={onCortar}>Cortar</button>
    </div>
  );
}
