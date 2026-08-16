import { useEffect, useRef } from 'react';
import { useLogica, useUI } from '../../hooks/useStore.js';
import { getModo, getPestana, setPestana } from '../../state/ui.js';
import { sonar } from '../../engine/sonido.js';
import { useAcciones } from '../../state/GameContext.jsx';
import TabMisiones from './TabMisiones.jsx';
import TabProgreso from './TabProgreso.jsx';
import TabPremios from './TabPremios.jsx';
import TabCompa from './TabCompa.jsx';
import TabAjustes from './TabAjustes.jsx';

const TABS = [
  ['misiones', 'Hoy'],
  ['progreso', 'Progreso'],
  ['premios', 'Premios'],
  ['compa', 'Compa'],
  ['ajustes', 'Ajustes'],
];

export default function Menu() {
  useUI();
  useLogica();
  const { cerrarMenu } = useAcciones();

  const pestana = getPestana();
  const visible = getModo() === 'menu';
  const cuerpo = useRef(null);

  /* Al cambiar de pestaña el panel vuelve arriba, como hacía renderMenu(). */
  useEffect(() => {
    if (cuerpo.current) cuerpo.current.scrollTop = 0;
  }, [pestana]);

  return (
    <section id="menu" className={visible ? 'visible' : ''}>
      <div id="menuCaja">
        <nav id="menuBarra">
          {TABS.map(([id, texto]) => (
            <button
              key={id}
              className={'tab' + (pestana === id ? ' activa' : '')}
              data-p={id}
              onClick={() => { setPestana(id); sonar('menu'); }}
            >{texto}</button>
          ))}
          <button id="btnCerrarMenu" aria-label="Cerrar" onClick={cerrarMenu}>✕</button>
        </nav>

        <div id="menuCuerpo" ref={cuerpo}>
          {pestana === 'misiones' && <TabMisiones />}
          {pestana === 'progreso' && <TabProgreso />}
          {pestana === 'premios' && <TabPremios />}
          {pestana === 'compa' && <TabCompa />}
          {pestana === 'ajustes' && <TabAjustes />}
        </div>
      </div>
    </section>
  );
}
