import { DISFRACES } from '../../config/disfraces.js';
import { EST, ponerDisfraz } from '../../state/gameLogic.js';
import { sonar } from '../../engine/sonido.js';

/* El placard del cuarto. Muestra la colección entera y no sólo lo encontrado:
   los que faltan aparecen en gris con una silueta, que es lo que convierte
   esto en una colección y no en una lista de cosas sueltas. */
/* Qué dice un accesorio que todavía no tiene, según de dónde sale. Sin esto,
   los del pastillero parecen escondidos en el pasto como los demás y Kath
   caminaría por el césped esperando algo que no va a aparecer nunca ahí. */
const PISTA = {
  cesped: 'Todavía no lo encontraste. Anda escondido en el césped.',
  medicinas: 'Se destraba cuidando tus medicinas, no aparece en el césped.',
};

export default function TabPlacard() {
  const encontrados = DISFRACES.filter((d) => EST.disfraces.includes(d.id));

  return (
    <>
      <div className="panel">
        <div className="panelTitulo">Tu placard</div>
        <div className="sub">
          {encontrados.length === 0
            ? 'Está vacío. Los accesorios aparecen solos mientras caminás por el césped del jardín.'
            : `Tenés ${encontrados.length} de ${DISFRACES.length}. Los que faltan están escondidos en el césped.`}
        </div>
      </div>

      <div className="lista">
        {DISFRACES.map((d) => {
          const tiene = EST.disfraces.includes(d.id);
          const puesto = EST.disfrazPuesto === d.id;
          return (
            <div key={d.id} className={'item ' + (tiene ? '' : 'caro')}>
              <div className="ico">{tiene ? d.icono : '❔'}</div>
              <div className="txt">
                <b>{tiene ? d.nombre : '???'}</b>
                <small>{tiene ? d.desc : PISTA[d.via] || 'Todavía no lo encontraste.'}</small>
              </div>
              <button
                className="btnCanje"
                disabled={!tiene}
                onClick={() => {
                  // Tocar el que ya tiene puesto se lo saca: sin esto haría
                  // falta un botón aparte sólo para quedar sin nada.
                  if (!ponerDisfraz(puesto ? null : d.id)) return;
                  sonar('ok');
                }}
              >{puesto ? 'Sacar' : 'Poner'}</button>
            </div>
          );
        })}
      </div>
    </>
  );
}
