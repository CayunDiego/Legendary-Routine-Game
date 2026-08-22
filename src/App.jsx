import { useEffect, useState } from 'react';
import { iniciar } from './game/juego.js';
import { GameProvider, useAcciones } from './state/GameContext.jsx';
import { useGameLoop } from './hooks/useGameLoop.js';
import { useInput } from './hooks/useInput.js';
import HUD from './components/HUD.jsx';
import Escena from './components/Escena.jsx';
import Controles from './components/Controles.jsx';
import AyudaTeclas from './components/AyudaTeclas.jsx';
import Menu from './components/Menu/Menu.jsx';
import ModalExtra from './components/ModalExtra.jsx';

/* ---------------------------------------------------------------------------
 *  Orden de arranque, que es lo único delicado acá:
 *
 *    1. Escena monta el <canvas> y se lo pasa al motor (montarCanvas).
 *    2. Este efecto llama a iniciar(): construye tiles, objetos y mundo, y
 *       carga la partida.
 *    3. useGameLoop carga las hojas de sprites y recién ahí prende el
 *       requestAnimationFrame.
 *
 *  Los efectos de los hijos corren antes que los del padre, así que para cuando
 *  el useEffect de Juego se ejecuta el canvas ya está montado.
 * ------------------------------------------------------------------------- */
function Juego() {
  const { empezar, pulsarA, pulsarB } = useAcciones();
  const [cargando, setCargando] = useState(true);

  useEffect(() => { iniciar(); }, []);
  useGameLoop(() => setCargando(false));
  useInput();

  return (
    <div id="app">
      <HUD />
      <Escena cargando={cargando} onEmpezar={empezar} />
      <Controles onA={pulsarA} onB={pulsarB} />
      <AyudaTeclas />
      <Menu />
      <ModalExtra />
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Juego />
    </GameProvider>
  );
}
