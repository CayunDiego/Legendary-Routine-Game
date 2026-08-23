import { createContext, useContext, useMemo } from 'react';
import { CONFIG } from '../config/config.js';
import {
  empezar, pulsarA, pulsarB, abrirMenu, cerrarMenu, dialogo,
  empezarPomodoro, frenarPomodoro,
} from '../game/juego.js';

/* ---------------------------------------------------------------------------
 *  Acciones del juego, disponibles en todo el árbol.
 *
 *  Ojo con lo que NO está acá: el estado (EST, modo, pestaña) no pasa por el
 *  contexto. Vive en los stores de src/state/ y se lee con los hooks de
 *  useStore.js. La razón es el rendimiento: el motor muta EST dentro del bucle
 *  de render, y meter eso en un contexto obligaría a redibujar todo el árbol.
 *  Con useSyncExternalStore cada componente se suscribe por su cuenta y se
 *  redibuja solo el que mira el dato que cambió.
 *
 *  Lo que sí resuelve el contexto es el pasamanos de callbacks: TabPremios
 *  necesita abrir un diálogo, y sin esto la función tendría que bajar por props
 *  desde App pasando por Menu.
 * ------------------------------------------------------------------------- */
const Ctx = createContext(null);

export function GameProvider({ children }) {
  const acciones = useMemo(() => ({
    empezar,
    pulsarA,
    pulsarB,
    abrirMenu,
    cerrarMenu,
    dialogo,
    /* El pomodoro lo maneja juego.js y no la pestaña: arrancar uno también
       cierra el menú, sienta a Kath en la silla y abre un diálogo, que son
       tres cosas de las que un componente de formulario no tiene por qué
       enterarse. */
    empezarPomodoro,
    frenarPomodoro,

    /* Canjear un premio cierra el menú y muestra el cupón. */
    canjearPremio(p) {
      cerrarMenu();
      dialogo([{
        t: `🎟️ CUPÓN CANJEADO\n${p.icono} ${p.nombre}\n\n${p.desc}\n\nMostrale esto a ${CONFIG.autor}. Lo tiene que cumplir sí o sí.`,
        fanfarria: true,
      }]);
    },
  }), []);

  return <Ctx.Provider value={acciones}>{children}</Ctx.Provider>;
}

export function useAcciones() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAcciones() usado fuera de <GameProvider>');
  return v;
}
