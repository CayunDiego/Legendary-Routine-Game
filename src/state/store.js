/* ---------------------------------------------------------------------------
 *  Pub/sub mínimo.
 *
 *  El estado del juego se muta de forma imperativa: el motor lo lee dentro del
 *  bucle de render y no puede pasar por setState en cada frame. Pero React sí
 *  tiene que enterarse cuando algo cambia de verdad (una misión completada, un
 *  premio canjeado, un día nuevo).
 *
 *  La solución es este store diminuto: quien muta avisa, y los componentes se
 *  enganchan con useSyncExternalStore. Como sólo se avisa en cambios reales y
 *  nunca por frame, React se redibuja por evento y no 60 veces por segundo.
 * ------------------------------------------------------------------------- */
export function crearStore() {
  const oyentes = new Set();
  let version = 0;

  return {
    /* useSyncExternalStore espera exactamente esta forma: suscribir devuelve
       la función para desuscribirse, y version() es un valor comparable con
       Object.is para saber si hay que redibujar. */
    suscribir(fn) {
      oyentes.add(fn);
      return () => oyentes.delete(fn);
    },
    version: () => version,
    avisar() {
      version++;
      for (const fn of oyentes) fn();
    },
  };
}
