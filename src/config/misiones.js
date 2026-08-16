/* ---------------------------------------------------------------------------
 *  MISIONES DIARIAS
 *  id      : identificador interno (no repetir)
 *  nombre  : lo que se ve en la lista
 *  veces   : cuántas veces por día se puede completar
 *  xp / oro: recompensa por cada vez
 *  frase   : mensaje al completarla (podés poner varias, elige una al azar)
 *  final   : mensaje cuando se completó todas las veces del día
 * -------------------------------------------------------------------------*/
const MISIONES = [
  { id:'cama', nombre:'Hacer la cama', icono:'🛏️', veces:1, xp:10, oro:5,
    frase:['Cama hecha. Arrancar el día ordenando tu espacio ya es una victoria.'],
    final:'El cuarto quedó impecable. Tu yo de la noche te lo va a agradecer.' },

  { id:'ducha', nombre:'Bañarte', icono:'🚿', veces:1, xp:15, oro:8,
    frase:['Agua caliente, cabeza despejada. Reseteo completo.'],
    final:'Fresquita y lista. Hoy el mundo te queda chico.' },

  { id:'dientes', nombre:'Lavarte los dientes', icono:'🦷', veces:2, xp:8, oro:4,
    frase:['Uno menos. Esa sonrisa es patrimonio nacional.',
           'Listo. Cuidá esa sonrisa que es mi lugar favorito.'],
    final:'Dos de dos. Dentista feliz, Diego más feliz todavía.' },

  { id:'agua', nombre:'Tomar agua', icono:'💧', veces:6, xp:5, oro:2,
    frase:['Glup. Tu cuerpo dice gracias.',
           'Otro vaso más. Vas bárbara.',
           'Hidratada = menos dolor de cabeza a la tarde.',
           'Seguí así, falta poco para la meta del día.'],
    final:'¡Seis vasos! Hidratación de nivel legendario.' },

  { id:'comer', nombre:'Comer algo rico', icono:'🍳', veces:3, xp:12, oro:6,
    frase:['Comida en el cuerpo, energía en el tanque.',
           'Bien ahí. Comer a horario es autocuidado, no lujo.',
           'Nada de saltarse comidas. Sos una campeona.'],
    final:'Tres comidas completas. Hoy te cuidaste en serio.' },

  { id:'ropa', nombre:'Lavar la ropa', icono:'🧺', veces:1, xp:15, oro:10,
    frase:['El lavarropas hace el trabajo, pero vos ganaste la batalla.'],
    final:'Ropa limpia, cabeza liviana. Adulta responsable nivel 100.' },

  { id:'sol', nombre:'Tomar aire y sol', icono:'🌞', veces:1, xp:12, oro:6,
    frase:['Vitamina D cargada. Un ratito afuera cambia todo el día.'],
    final:'Diez minutos de sol valen más que mil scrolls.' },

  { id:'ejercicio', nombre:'Mover el cuerpo', icono:'🧘‍♀️', veces:1, xp:20, oro:12,
    frase:['Movimiento completado. No importa cuánto, importa que lo hiciste.'],
    final:'Cuerpo movido, cabeza ordenada. Sos imparable.' },

  { id:'animo', nombre:'Registrar cómo estás', icono:'📔', veces:1, xp:10, oro:5,
    frase:['Anotado. Saber cómo estás ya es la mitad del camino.'],
    final:'Gracias por contarme. Siempre quiero saber cómo venís.' }
];

export { MISIONES };
