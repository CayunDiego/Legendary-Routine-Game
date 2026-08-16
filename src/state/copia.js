import { CONFIG } from '../config/config.js';
import { obtenerEstado, reemplazarEstado, diaDeJuego } from './gameLogic.js';
import { fusionar } from './fusion.js';
import * as disco from './persistencia.js';

/* ---------------------------------------------------------------------------
 *  Copia de seguridad en archivo.
 *
 *  Es la red debajo de todo lo demás. La nube puede fallar, el navegador puede
 *  borrar sus datos, el teléfono se puede perder: un .json en el celular o en
 *  el mail sobrevive a las tres cosas y no depende de que nada siga en línea
 *  dentro de cinco años.
 *
 *  El archivo lleva `juego` y `formato` adentro para que restaurar el backup de
 *  otra cosa falle con un mensaje claro en vez de dejar la partida en un estado
 *  imposible.
 * ------------------------------------------------------------------------- */

const MARCA = 'rutina-legendaria';
const FORMATO = 1;

function armarSobre(estado) {
  return {
    juego: MARCA,
    formato: FORMATO,
    version: CONFIG.version,
    exportadoEn: new Date().toISOString(),
    dispositivo: disco.idDispositivo(),
    estado,
  };
}

function nombreArchivo() {
  const hoy = diaDeJuego();
  return `rutina-legendaria-${hoy}.json`;
}

/* --- descargar ------------------------------------------------------------ */
function descargarCopia() {
  const texto = JSON.stringify(armarSobre(obtenerEstado()), null, 2);
  const blob = new Blob([texto], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo();
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revocar en el mismo tick cancela la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return nombreArchivo();
}

/* --- leer un archivo ------------------------------------------------------ */
function validarSobre(o) {
  if (!o || typeof o !== 'object') return 'El archivo no es una copia del juego.';
  if (o.juego !== MARCA) return 'Ese archivo es de otra cosa, no de este juego.';
  if (Number(o.formato) > FORMATO) return 'La copia es de una versión más nueva del juego. Actualizá el juego primero.';
  if (!disco.esPartida(o.estado)) return 'La copia está dañada: no tiene una partida adentro.';
  return null;
}

async function leerArchivo(file) {
  const texto = await file.text();
  let o;
  try {
    o = JSON.parse(texto);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  const err = validarSobre(o);
  if (err) throw new Error(err);
  return o;
}

/* --- restaurar ------------------------------------------------------------ */
/* Dos modos, porque las dos cosas se necesitan de verdad:
     'fusionar'  suma la copia a lo que ya hay. Es lo seguro y el que se ofrece
                 primero: no puede hacer perder nada.
     'reemplazar' tira lo actual. Sirve cuando lo actual quedó mal (por ejemplo
                 después de un modo seguro) y la copia es la buena. */
async function restaurarCopia(file, modo = 'fusionar') {
  const sobre = await leerArchivo(file);

  // Restaurar es también la salida del cerrojo: si el guardado estaba trabado
  // porque no se podía leer nada, ahora sí hay algo bueno para escribir.
  disco.desbloquear();

  const actual = obtenerEstado();
  const resultado = modo === 'reemplazar'
    ? sobre.estado
    : fusionar(actual, sobre.estado);

  reemplazarEstado(resultado);
  return { exportadoEn: sobre.exportadoEn, modo };
}

export { descargarCopia, restaurarCopia, leerArchivo, armarSobre, MARCA, FORMATO };
