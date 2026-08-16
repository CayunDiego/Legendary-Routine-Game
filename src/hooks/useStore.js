import { useSyncExternalStore } from 'react';
import * as logica from '../state/gameLogic.js';
import * as ui from '../state/ui.js';

/* ---------------------------------------------------------------------------
 *  Enganche entre los stores imperativos y React.
 *
 *  useSyncExternalStore es justo para esto: el estado vive afuera de React
 *  (el motor lo necesita así) y el componente se vuelve a dibujar cuando el
 *  store avisa. La "instantánea" es el contador de versión, no el objeto EST:
 *  EST se muta en el lugar, así que comparar por identidad nunca detectaría
 *  un cambio.
 * ------------------------------------------------------------------------- */

/* Se redibuja cuando cambia el estado del juego (XP, oro, misiones, racha). */
export function useLogica() {
  return useSyncExternalStore(logica.suscribir, logica.version, logica.version);
}

/* Se redibuja cuando cambia la interfaz (modo, pestaña, efectos). */
export function useUI() {
  return useSyncExternalStore(ui.suscribir, ui.version, ui.version);
}
