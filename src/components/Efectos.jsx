import { useUI } from '../hooks/useStore.js';
import { getFlotantes, getFlashes } from '../state/ui.js';

/* Los textos de recompensa que suben, y el destello blanco de la eclosión.

   El original reiniciaba la animación del destello forzando un reflow
   (`void f.offsetWidth`). Acá alcanza con cambiarle la key al nodo: React lo
   desmonta y lo vuelve a montar, y la animación CSS arranca de nuevo. */
export default function Efectos() {
  useUI();

  const flotantes = getFlotantes();
  const flashes = getFlashes();

  return (
    <>
      <div id="efectos">
        {flotantes.map((f) => (
          <div key={f.id} className="flotante">{f.texto}</div>
        ))}
      </div>
      <div id="flash" key={flashes} className={flashes > 0 ? 'activo' : ''}></div>
    </>
  );
}
