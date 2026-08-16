/* ============================================================================
 *  RUTINA LEGENDARIA — Datos y configuración
 *  ---------------------------------------------------------------------------
 *  TODO lo que probablemente quieras cambiar (nombres, mensajes, misiones,
 *  premios) está en este bloque. No hace falta tocar el resto del código.
 * ==========================================================================*/

const CONFIG = {
  jugadora: 'Kath',
  autor: 'Diego',
  // Cuántas misiones hay que completar en el día para mantener la racha
  misionesParaRacha: 5,
  // La "hora de reinicio": a las 4 AM arranca el día nuevo (así trasnochar no rompe la racha)
  horaReinicio: 4,
  version: '1.1.0',

  /* Dirección del Worker que guarda las partidas en la nube. Vaciar esto hace
     que el juego ande 100% local, sin sincronizar y sin errores: es un extra,
     no un requisito. Ver worker/README.md.
     Se puede pisar en la build con VITE_NUBE_URL sin tocar este archivo. */
  nube: (import.meta.env && import.meta.env.VITE_NUBE_URL)
    || 'https://rutina-legendaria.cayun-diego-09.workers.dev',
};

export { CONFIG };
