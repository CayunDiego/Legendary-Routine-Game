import { useSyncExternalStore } from 'react';
import * as dlg from '../state/dialogo.js';

/* Devuelve lo que necesita quien dibuje un diálogo, ya suscripto al store. */
export function useDialogo() {
  useSyncExternalStore(dlg.suscribir, dlg.version, dlg.version);
  return {
    actual: dlg.getActual(),
    texto: dlg.getTextoVisible(),
    escribiendo: dlg.getEscribiendo(),
    opcionSel: dlg.getOpcionSel(),
    abierto: dlg.estaAbierto(),
    avanzar: dlg.avanzarDialogo,
    elegir: dlg.elegirOpcion,
    marcar: dlg.marcarOpcion,
  };
}
