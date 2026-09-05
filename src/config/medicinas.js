/* ---------------------------------------------------------------------------
 *  MEDICINAS — las tres tomas del día
 *
 *  El registro más importante del juego: acá no importa tanto el XP como poder
 *  mirar para atrás y saber si tomó y a qué hora. Por eso cada toma guarda el
 *  instante exacto y nunca se borra sola al cambiar el día (ver EST.meds en
 *  state/gameLogic.js).
 *
 *  Las franjas están en horas del reloj, pero medidas en la MISMA escala que
 *  el día del juego, que arranca a las 4 AM (CONFIG.horaReinicio). Por eso la
 *  cena puede llegar hasta 26: las 2 de la mañana siguen siendo "anoche", y
 *  marcar la cena a la 1 AM tiene que anotarse en el día de ayer y no estrenar
 *  el de hoy. Cualquier hora menor a la de reinicio se le suma 24 antes de
 *  comparar (franjaDeHora() en gameLogic).
 *
 *  `desde` entra, `hasta` no. Fuera de toda franja no hay ninguna abierta: eso
 *  es a propósito y es lo que hace que el recordatorio sea de vez en cuando y
 *  no un cartel prendido todo el día — la burbuja del pastillero y el
 *  comentario de Diego sólo existen con una franja abierta y sin marcar.
 * -------------------------------------------------------------------------*/
const TOMAS = [
  { id: 'desayuno', nombre: 'Desayuno', icono: '☀️', desde: 6,  hasta: 12,
    recuerdo: 'las de la mañana' },
  { id: 'merienda', nombre: 'Merienda', icono: '☕', desde: 15, hasta: 19,
    recuerdo: 'las de la merienda' },
  { id: 'cena',     nombre: 'Cena',     icono: '🌙', desde: 20, hasta: 26,
    recuerdo: 'las de la noche' },
];

const MEDICINAS = {
  icono: '💊',
  tomas: TOMAS,

  /* Lo que paga marcar una toma: XP sí, monedas NO, y eso es a propósito.
     Las medicinas no son una misión que Kath elige hacer para juntar plata:
     son algo que tiene que pasar sí o sí. Pagarlas en oro las pondría a
     competir con lavar la ropa en la misma lista de precios, y convertiría el
     registro en la forma más eficiente de comprar premios.

     La recompensa de las medicinas es otra y está en config/disfraces.js: los
     accesorios que sólo se destraban por días completos (`via: 'medicinas'`).
     Se juntan, no se gastan.

     El XP se cobra UNA sola vez por día y por toma, aunque se marque, se
     deshaga y se vuelva a marcar (ver marcarMedicina). */
  xp: 12,
  oro: 0,

  /* Cada cuánto Diego lo menciona cuando hay una toma pendiente en su franja.
     Bajo a propósito: Diego informa el día, no controla la medicación. Con 1
     de cada 3 charlas alcanza para que aparezca sin volverse un reproche. */
  chanceDiego: 0.34,

  /* Días de registro que se guardan. Cuatro meses entran holgados y evitan que
     una partida vieja se vuelva pesada de sincronizar. */
  historia: 120,

  /* Cuántos días muestra la pestaña de una. */
  diasVisibles: 30,
};

export { MEDICINAS, TOMAS };
