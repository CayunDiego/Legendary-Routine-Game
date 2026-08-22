import Canvas from './Canvas.jsx';
import Reloj from './Reloj.jsx';
import Efectos from './Efectos.jsx';
import Dialogo from './Dialogo.jsx';
import TituloScreen from './TituloScreen.jsx';

/* El <main> del juego: el canvas y todo lo que va encima. */
export default function Escena({ cargando, onEmpezar }) {
  return (
    <main id="escena">
      <Canvas />
      <Reloj />
      <Efectos />
      <Dialogo />
      <TituloScreen onEmpezar={onEmpezar} />
      {cargando && <div id="cargando">CARGANDO…</div>}
    </main>
  );
}
