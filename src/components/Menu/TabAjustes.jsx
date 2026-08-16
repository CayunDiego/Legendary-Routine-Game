import { useRef, useState } from 'react';
import { CONFIG } from '../../config/config.js';
import { EST, guardar } from '../../state/gameLogic.js';
import { sonar, setSonido } from '../../engine/sonido.js';
import { useDisco, useSync } from '../../hooks/useStore.js';
import * as disco from '../../state/persistencia.js';
import * as sync from '../../state/sync.js';
import { descargarCopia, restaurarCopia } from '../../state/copia.js';

/* ---------------------------------------------------------------------------
 *  La pestaña donde Kath puede ver y arreglar todo lo del guardado.
 *
 *  Existe porque el guardado silencioso es el peor de los mundos: si algo falla
 *  — el navegador no deja escribir, la nube no responde, la partida quedó
 *  ilegible — tiene que verse acá y tiene que haber un botón para salir del
 *  problema. Nada de esto es decorativo.
 * ------------------------------------------------------------------------- */

const HACE = (ms) => {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'recién';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  return `hace ${Math.round(s / 3600)} h`;
};

function textoSync(s) {
  switch (s.estado) {
    case 'apagado': return { txt: 'No configurada', tono: 'sub' };
    case 'sync': return { txt: 'Sincronizando…', tono: 'sub' };
    case 'ok': return { txt: `Al día · ${HACE(s.ultimaVez)}`, tono: 'sub' };
    case 'pendiente': return { txt: s.error || 'Falta subir cambios', tono: 'aviso' };
    case 'error': return { txt: s.error || 'Error', tono: 'aviso' };
    default: return { txt: 'Conectando…', tono: 'sub' };
  }
}

export default function TabAjustes() {
  useDisco();
  useSync();

  /* El botón de borrar pide confirmación cambiando su propio texto: el primer
     toque arma, el segundo borra. Igual que en el original. */
  const [armado, setArmado] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [mostrarCodigo, setMostrarCodigo] = useState(false);
  const [codigoNuevo, setCodigoNuevo] = useState('');
  const [conectando, setConectando] = useState(false);
  const archivoRef = useRef(null);

  const salud = disco.salud();
  const bloqueado = disco.estaBloqueado();
  const estadoNube = sync.estadoSync();
  const nube = textoSync(estadoNube);
  const codigo = disco.getCodigo();

  const decir = (txt, malo) => setAviso({ txt, malo: !!malo });

  async function alElegirArchivo(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';          // deja volver a elegir el mismo archivo
    if (!file) return;
    try {
      const r = await restaurarCopia(file, 'fusionar');
      decir(`Copia restaurada (del ${new Date(r.exportadoEn).toLocaleDateString()}). Se sumó a lo que ya había.`);
      sonar('ok');
    } catch (err) {
      decir(err.message, true);
    }
  }

  async function alConectar() {
    setConectando(true);
    try {
      await sync.conectarCon(codigoNuevo);
      decir('Conectado. Las dos partidas se fusionaron.');
      setCodigoNuevo('');
      sonar('ok');
    } catch (err) {
      decir(err.message, true);
    } finally {
      setConectando(false);
    }
  }

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

      {/* --- estado del guardado ------------------------------------------- */}
      <div className="panel">
        <div className="panelTitulo">Tu progreso</div>

        <div className="hist">
          <div className="histDia">
            <span>En este dispositivo</span>
            <span>{bloqueado ? '⛔ detenido' : salud.ok ? '✅ guardando' : '⚠️ con problemas'}</span>
          </div>
          <div className="histDia">
            <span>En la nube</span>
            <span>{estadoNube.estado === 'ok' ? '✅' : estadoNube.estado === 'apagado' ? '—' : '⏳'} {nube.txt}</span>
          </div>
        </div>

        {salud.detalle && <div className={salud.ok ? 'sub' : 'aviso'}>{salud.detalle}</div>}

        {bloqueado && (
          <div className="aviso">
            El juego dejó de guardar a propósito para no pisar la partida que hay
            guardada. Restaurá una copia acá abajo, o empezá de cero si no tenés
            ninguna.
          </div>
        )}

        {sync.activa() && (
          <button
            className="btnPrim"
            disabled={estadoNube.estado === 'sync'}
            onClick={() => { sonar('menu'); sync.sincronizarYa(); }}
          >Sincronizar ahora</button>
        )}
      </div>

      {/* --- nube ----------------------------------------------------------- */}
      {sync.activa() && (
        <div className="panel">
          <div className="panelTitulo">Jugar en otro dispositivo</div>
          <div className="sub">
            Tu progreso se guarda también en la nube. Para seguir la misma partida
            en otro teléfono o en la tablet, copiá este código y pegalo allá.
          </div>

          <button
            className="btnPrim"
            onClick={() => { sonar('menu'); setMostrarCodigo(!mostrarCodigo); }}
          >{mostrarCodigo ? 'Ocultar el código' : 'Ver mi código de partida'}</button>

          {mostrarCodigo && (
            <>
              <div className="codigoPartida">{disco.formatearCodigo(codigo)}</div>
              <div className="sub">
                Es la llave de tu partida: quien lo tenga puede verla y cambiarla.
                No lo compartas con nadie más.
              </div>
              {navigator.clipboard && (
                <button
                  className="btnPrim"
                  onClick={() => {
                    navigator.clipboard.writeText(disco.formatearCodigo(codigo))
                      .then(() => decir('Código copiado.'))
                      .catch(() => decir('No se pudo copiar. Anotalo a mano.', true));
                  }}
                >Copiar</button>
              )}
            </>
          )}

          <div className="sub" style={{ marginTop: '10px' }}>
            ¿Ya tenés una partida en otro lado? Pegá su código:
          </div>
          <input
            className="inp"
            value={codigoNuevo}
            placeholder="ABCDE-FGHJK-MNPQR-STUVW"
            onChange={(e) => setCodigoNuevo(e.target.value)}
          />
          <button
            className="btnPrim"
            disabled={conectando || !disco.codigoValido(codigoNuevo)}
            onClick={alConectar}
          >{conectando ? 'Conectando…' : 'Conectar esa partida'}</button>
          <div className="sub">
            No se pierde nada: lo de este dispositivo y lo de allá se suman.
          </div>
        </div>
      )}

      {/* --- copias --------------------------------------------------------- */}
      <div className="panel">
        <div className="panelTitulo">Copia de seguridad</div>
        <div className="sub">
          Un archivo con toda tu partida, para guardar donde quieras. Funciona
          aunque no haya internet y no depende de nada.
        </div>

        <button
          className="btnPrim"
          onClick={() => {
            try {
              const n = descargarCopia();
              decir(`Copia descargada: ${n}`);
              sonar('ok');
            } catch (err) {
              decir('No se pudo descargar: ' + err.message, true);
            }
          }}
        >Descargar una copia</button>

        <button className="btnPrim" onClick={() => archivoRef.current && archivoRef.current.click()}>
          Restaurar desde un archivo
        </button>
        <input
          ref={archivoRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={alElegirArchivo}
        />
      </div>

      {aviso && <div className={aviso.malo ? 'aviso' : 'sub'} role="status">{aviso.txt}</div>}

      <div className="panel">
        <div className="panelTitulo">Datos</div>
        <div className="sub">
          El progreso se guarda en este dispositivo
          {sync.activa() ? ' y en la nube' : ''}. Antes de borrar, descargá una copia.
        </div>
        <button
          id="btnBorrar"
          className="btnPeligro"
          onClick={() => {
            if (!armado) { setArmado(true); return; }
            disco.borrarTodo();
            location.reload();
          }}
        >{armado ? '¿Seguro? Tocá de nuevo' : 'Empezar de cero'}</button>
        {armado && sync.activa() && (
          <div className="sub">
            Ojo: esto borra la partida de este dispositivo. La de la nube sigue
            ahí con tu código viejo.
          </div>
        )}
      </div>
    </>
  );
}
