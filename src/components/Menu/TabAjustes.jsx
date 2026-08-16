import { useState } from 'react';
import { CONFIG } from '../../config/config.js';
import { EST, guardar, CLAVE_GUARDADO } from '../../state/gameLogic.js';
import { sonar, setSonido } from '../../engine/sonido.js';

export default function TabAjustes() {
  /* El botón de borrar pide confirmación cambiando su propio texto: el primer
     toque arma, el segundo borra. Igual que en el original. */
  const [armado, setArmado] = useState(false);

  return (
    <>
      <div className="panel">
        <div className="panelTitulo">Ajustes</div>
        <label className="fila">
          <span>Sonido</span>
          <input
            type="checkbox"
            id="chkSonido"
            checked={!!EST.sonido}
            onChange={(e) => {
              EST.sonido = e.target.checked;
              setSonido(EST.sonido);
              guardar();
              if (EST.sonido) sonar('menu');
            }}
          />
        </label>
        <div className="sub">
          Versión {CONFIG.version} · hecho por {CONFIG.autor} para {CONFIG.jugadora}
        </div>
      </div>

      <div className="panel">
        <div className="panelTitulo">Controles</div>
        <div className="hist">
          <div className="histDia"><span>Moverte</span><span>Flechas o WASD</span></div>
          <div className="histDia"><span>Aceptar / hablar (A)</span><span>Z · Espacio · Enter</span></div>
          <div className="histDia"><span>Volver / cerrar (B)</span><span>X · Esc</span></div>
          <div className="histDia"><span>Abrir el menú</span><span>M</span></div>
          <div className="histDia"><span>Elegir una opción</span><span>Flechas, o 1-5</span></div>
        </div>
        <div className="sub">En el celular es todo táctil: la cruceta y los botones de abajo.</div>
      </div>

      <div className="panel">
        <div className="panelTitulo">Datos</div>
        <div className="sub">
          El progreso se guarda en este teléfono. Si borrás los datos del navegador, se pierde.
        </div>
        <button
          id="btnBorrar"
          className="btnPeligro"
          onClick={() => {
            if (!armado) { setArmado(true); return; }
            localStorage.removeItem(CLAVE_GUARDADO);
            location.reload();
          }}
        >{armado ? '¿Seguro? Tocá de nuevo' : 'Empezar de cero'}</button>
      </div>
    </>
  );
}
