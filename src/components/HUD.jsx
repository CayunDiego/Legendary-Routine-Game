import { useLogica } from '../hooks/useStore.js';
import { EST, xpNecesaria, progresoDelDia } from '../state/gameLogic.js';
import { getModo } from '../state/ui.js';
import { abrirMenu, cerrarMenu } from '../game/juego.js';
import { iniciarAudio } from '../engine/sonido.js';

/* Reemplaza a actualizarHUD(), que escribía en siete nodos por id.
   Ahora se redibuja solo cuando el store del juego avisa. */
export default function HUD() {
  useLogica();

  const nec = xpNecesaria(EST.nivel);
  const p = progresoDelDia();

  return (
    <header id="hud">
      <div className="hudBloque">
        <div className="hudFila">
          <span className="insignia">Nv <span id="hudNivel">{EST.nivel}</span></span>
          <span className="hudMini" id="hudXPTxt">{EST.xp}/{nec}</span>
        </div>
        <div className="barra" style={{ width: '96px' }}>
          <div id="hudXP" style={{ width: Math.min(100, (EST.xp / nec) * 100) + '%' }}></div>
        </div>
      </div>

      <div className="hudBloque">
        <div className="hudFila">
          <span className="hudMini">HOY</span>
          <span className="hudChip" id="hudDia">{p.hechas}/{p.total}</span>
        </div>
        <div className="barra" style={{ width: '80px' }}>
          <div id="hudDiaBarra" style={{ width: p.pct + '%' }}></div>
        </div>
      </div>

      <div className="hudBloque">
        <div className="hudFila"><span className="hudChip">💰 <span id="hudOro">{EST.oro}</span></span></div>
        <div className="hudFila"><span className="hudChip">🔥 <span id="hudRacha">{EST.racha}</span></span></div>
      </div>

      <button
        id="btnMenu"
        aria-label="Menú"
        onClick={() => {
          iniciarAudio();
          if (getModo() === 'menu') cerrarMenu(); else abrirMenu('misiones');
        }}
      >☰</button>
    </header>
  );
}
