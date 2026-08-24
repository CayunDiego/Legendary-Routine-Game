/* ---------------------------------------------------------------------------
 *  EL PASEO DE DIEGO
 *
 *  Diego espera a Kath en el jardín, y hasta acá se quedaba clavado en su
 *  casilla mirando para los costados. Ahora, cada tanto, se manda unos pasos
 *  por el pasto y vuelve solo al lugar de siempre.
 *
 *  Tres reglas que no son un número que se pueda tocar de más:
 *
 *  - **Con Kath cerca no se mueve.** Es el que toma las misiones secundarias:
 *    que se vaya caminando justo cuando ella se le acerca a hablar sería pelear
 *    contra la jugadora. Cerca = el mismo radio con el que la mira
 *    (motor.js#RADIO_MIRADA). Si ella aparece a mitad de paso, termina el paso
 *    y se queda.
 *
 *  - **Vuelve siempre a la misma casilla**, y mirando a la casa. No es un
 *    paseo al azar tipo Merlí: sale, da unas vueltas y vuelve, así Kath lo
 *    encuentra siempre donde lo dejó.
 *
 *  - **No pisa el paso de una puerta.** Diego es sólido: parado en la casilla
 *    de abajo de una puerta deja a Kath encerrada en la casa. Eso lo cuida
 *    `motor.js#puedePisarPaseo` mirando el mapa, no una lista de casillas
 *    escrita a mano — una puerta nueva queda protegida sola.
 * -------------------------------------------------------------------------*/
const PASEO = {
  /* Cada cuánto se le da por caminar (ms, sorteado entre los dos). Corto a
     propósito: el reloj sólo corre cuando Kath está lejos, así que la mayoría
     de los paseos pasan sin nadie mirando. Si fuera de minutos, el paseo
     existiría en el código y no en el juego. */
  espera: [12000, 30000],

  /* Cuántas casillas camina antes de encarar la vuelta. */
  pasos: [3, 6],

  /* Lo que tarda en cada casilla. Kath tarda 185: él va más lento porque está
     paseando, no yendo a ningún lado. */
  pasoMs: 320,

  /* El respiro entre casilla y casilla. Sortearlo es lo que lo saca de
     parecer una ficha moviéndose sola por el tablero. */
  respiro: [120, 900],

  /* Hasta dónde se aleja de su casilla, en casillas de distancia (a lo
     Manhattan). Cuatro es "se estira las piernas" sin salir del pedazo de
     jardín donde Kath lo va a buscar. */
  radio: 4,
};

export { PASEO };
