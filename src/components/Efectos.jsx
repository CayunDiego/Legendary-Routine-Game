import { useUI } from '../hooks/useStore.js';
import { getFlotantes, getFlashes, getBanner } from '../state/ui.js';

/* Los textos de recompensa que suben, el destello blanco de la eclosión, y el
   cartelito arriba a la derecha para avisos que no necesitan más que eso.

   El original reiniciaba la animación del destello forzando un reflow
   (`void f.offsetWidth`). Acá alcanza con cambiarle la key al nodo: React lo
   desmonta y lo vuelve a montar, y la animación CSS arranca de nuevo. */
export default function Efectos() {
  useUI();

  const flotantes = getFlotantes();
  const flashes = getFlashes();
  const banner = getBanner();

  return (
    <>
      <div id="efectos">
        {flotantes.map((f) => (
          <div key={f.id} className="flotante">{f.texto}</div>
        ))}
        {banner && <div key={banner.id} className="banner">{banner.texto}</div>}
      </div>
      <div id="flash" key={flashes} className={flashes > 0 ? 'activo' : ''}></div>
    </>
  );
}
