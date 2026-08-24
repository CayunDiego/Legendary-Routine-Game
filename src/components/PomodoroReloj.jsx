import { useEffect, useState } from 'react';
import { useLogica, useUI } from '../hooks/useStore.js';
import { getModo } from '../state/ui.js';
import { POMODORO } from '../config/pomodoro.js';
import { pomodoroEnCurso, relojPomodoro } from '../state/gameLogic.js';
import { sentadaEnCompu } from '../engine/motor.js';
import { PixelTexto } from './Reloj.jsx';

/* ---------------------------------------------------------------------------
 *  El reloj del pomodoro, abajo del reloj de pared.
 *
 *  Existe para que el pomodoro se vea SIN abrir nada: Kath está sentada a la
 *  compu trabajando, y lo que tiene que poder hacer es levantar la vista al
 *  teléfono y ver cuánto falta. Si hubiera que entrar al menú, el reloj sería
 *  una pantalla más que mirar, que es lo contrario de lo que hace falta.
 *
 *  Usa los mismos dígitos pixelados que el reloj de pared (Reloj.jsx#PixelTexto)
 *  a propósito: son dos relojes, tienen que verse como dos relojes.
 *
 *  Sentada a la compu no sale: ahí el motor le dibuja el reloj GRANDE abajo de
 *  ella (motor.js#dibujarPomodoroGrande) y este quedaría diciendo lo mismo en
 *  chiquito en la otra punta de la pantalla.
 * -------------------------------------------------------------------------*/
export default function PomodoroReloj() {
  useUI();
  useLogica();

  /* El segundero es local, como en la pestaña: EST sólo cambia cuando una fase
     abre o cierra, así que latir por el store redibujaría todo el juego una vez
     por segundo para mover dos dígitos. */
  const [, latir] = useState(0);
  useEffect(() => {
    const t = setInterval(() => latir((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const pomo = pomodoroEnCurso();
  // En la portada no va, igual que el reloj de pared: todavía no empezó nada.
  if (!pomo || getModo() === 'titulo') return null;
  /* Le toca al reloj grande. Se entera en el próximo latido, dentro del
     segundo: sentarse ya la deja mirando el grande, así que el chiquito
     apagándose un instante después no lo ve nadie. */
  if (sentadaEnCompu()) return null;

  const foco = pomo.fase === 'foco';
  const txt = relojPomodoro(pomo.restaMs);

  return (
    <div
      id="pomoReloj"
      className={foco ? 'foco' : 'pausa'}
      aria-label={`${foco ? 'Pomodoro' : 'Pausa'}: quedan ${txt}`}
    >
      <span className="pomoIcono" aria-hidden="true">{foco ? POMODORO.icono : '☕'}</span>
      <PixelTexto txt={txt} px={3} titulo={txt} />
    </div>
  );
}
