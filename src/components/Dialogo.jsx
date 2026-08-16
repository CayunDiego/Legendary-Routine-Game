import { useDialogo } from '../hooks/useDialogo.js';

/* Reemplaza a siguienteDialogo() + terminarTexto(), que escribían el texto en
   #dlgTexto y construían los botones de opción con document.createElement. */
export default function Dialogo() {
  const { actual, texto, escribiendo, opcionSel, abierto, avanzar, elegir, marcar } = useDialogo();

  const clases = [
    abierto ? 'visible' : '',
    actual && actual.carta ? 'carta' : '',
    actual && actual.fanfarria ? 'fanfarria' : '',
  ].filter(Boolean).join(' ');

  const opciones = !escribiendo && actual && actual.opciones ? actual.opciones : null;

  return (
    <section
      id="dialogo"
      className={clases}
      onClick={() => { if (!opciones) avanzar(); }}
    >
      <div id="dlgTexto">{texto}</div>

      <div id="dlgPremio" style={{ display: actual && actual.premio ? 'block' : 'none' }}>
        {(actual && actual.premio) || ''}
      </div>

      <div id="dlgOpciones" className={opciones ? 'visible' : ''}>
        {opciones && opciones.map((op, i) => (
          <button
            key={i}
            className={'opcion' + (i === opcionSel ? ' sel' : '')}
            data-i={i}
            onClick={(e) => { e.stopPropagation(); elegir(i); }}
            onMouseEnter={() => marcar(i)}
          >
            <span className="numOp">{i + 1}</span>{op.txt}
          </button>
        ))}
      </div>

      <div id="dlgFlecha" className={!escribiendo && actual && !actual.opciones ? 'visible' : ''}></div>
    </section>
  );
}
