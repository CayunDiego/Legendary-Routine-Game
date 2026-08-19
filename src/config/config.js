/* ============================================================================
 *  RUTINA LEGENDARIA — Datos y configuración
 *  ---------------------------------------------------------------------------
 *  TODO lo que probablemente quieras cambiar (nombres, mensajes, misiones,
 *  premios) está en este bloque. No hace falta tocar el resto del código.
 * ==========================================================================*/

const CONFIG = {
  juego: 'Rutina Legendaria',
  jugadora: 'Kath',
  autor: 'Diego',
  /* Adónde llegan los reportes de Kath (state/reporte.js). Formato
     internacional; el + y los espacios se limpian solos, así que se puede
     escribir como se quiera. Vaciarlo esconde el formulario entero. */
  whatsapp: '+54 9 2974 140952',
  // Cuántas misiones hay que completar en el día para mantener la racha
  misionesParaRacha: 5,
  // La "hora de reinicio": a las 4 AM arranca el día nuevo (así trasnochar no rompe la racha)
  horaReinicio: 4,
  /* La versión que decide el cartelito de "✨ Hay algo nuevo" al entrar. No es
     la versión de la build: es el SHA del último commit marcado como novedad
     para Kath (trailer `Novedad: si`), que calcula leerNovedad() en
     vite.config.js. Un deploy de puros fixes no la mueve y no avisa nada.
     Quien pone la marca es el comando /commit, no la memoria de nadie. */
  version: (import.meta.env && import.meta.env.VITE_VERSION_NOVEDAD) || 'sin-novedades',

  /* Dirección del Worker que guarda las partidas en la nube. Vaciar esto hace
     que el juego ande 100% local, sin sincronizar y sin errores: es un extra,
     no un requisito. Ver worker/README.md.
     Se puede pisar en la build con VITE_NUBE_URL sin tocar este archivo. */
  nube: (import.meta.env && import.meta.env.VITE_NUBE_URL)
    || 'https://rutina-legendaria.cayun-diego-09.workers.dev',
};

export { CONFIG };
