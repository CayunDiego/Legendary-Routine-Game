/* ---------------------------------------------------------------------------
 *  POMODORO — el reloj de la compu
 *
 *  Kath se sienta en la silla del escritorio, elige cuánto quiere trabajar y el
 *  juego le lleva el tiempo. Mientras corre se la ve sentada ahí, y cada bloque
 *  de foco que termina paga como una misión.
 *
 *  Dos decisiones que valen más que los números:
 *
 *  - El reloj es de PARED, no un contador que baja. Se guarda `hasta` (un
 *    Date.now() futuro) y lo que queda se calcula restando. Así el pomodoro
 *    sigue corriendo con el teléfono bloqueado, con la pestaña cerrada o con el
 *    juego recargado, que es lo único que sirve: si dependiera del bucle de
 *    render, apagar la pantalla para no distraerse —o sea, hacer bien el
 *    pomodoro— frenaría el pomodoro.
 *
 *  - La pausa arranca sola cuando termina el foco, y cuando termina la pausa no
 *    arranca nada. Encadenar los focos solos convierte esto en una cinta de
 *    correr; el pomodoro es al revés, cada vuelta se decide de nuevo.
 * -------------------------------------------------------------------------*/

/* Los largos que puede elegir. `foco` y `pausa` van en minutos.
   El de 15 no es "el clásico recortado": es el que se usa los días en que
   arrancar cuesta, y por eso está primero. El clásico (25/5) queda como el del
   medio, que es el que se elige cuando ya está laburando. */
const RATOS = [
  { id: 'corto', label: 'Cortito', foco: 15, pausa: 5, desc: 'Para los días en que arrancar cuesta.' },
  { id: 'clasico', label: 'Clásico', foco: 25, pausa: 5, desc: 'El pomodoro de toda la vida.' },
  { id: 'largo', label: 'Largo', foco: 50, pausa: 10, desc: 'Cuando ya estás metida en algo.' },
];

const POMODORO = {
  icono: '🍅',
  ratos: RATOS,
  porDefecto: 'clasico',

  /* Lo que paga un bloque de foco terminado. Es menos que una misión secundaria
     (15 XP / 8 💰) a propósito: un pomodoro es un rato de trabajo, no una
     victoria del día, y además entran varios. */
  xp: 8,
  oro: 4,

  /* Tope diario de bloques que pagan. Del sexto en adelante el pomodoro sigue
     funcionando igual —es un reloj, no una fábrica de monedas— pero deja de
     dar premio. Sin tope, dejar la tarde corriendo pomodoros sería la forma
     más rápida de subir de nivel, y las misiones de la casa dejarían de
     importar. */
  porDia: 6,

  /* Cuánto se guarda de historia. Seis por día por dos meses entra holgado, y
     evita que una partida vieja se vuelva pesada de sincronizar. */
  historia: 300,
};

/* Lo que dice Diego cuando termina un bloque de foco. Rotan por la cantidad que
   lleva hoy, como las de las misiones secundarias. La última se repite para los
   bloques que siguen. */
const FRASES_FOCO = [
  'Listo el primero. Ahora parate, tomá agua, mirá algo que no sea una pantalla.',
  'Dos seguidos. Estás rindiendo, en serio.',
  'Tres. En algún momento del día esto era "no tengo ganas de empezar".',
  'Cuatro. Ya está, lo de hoy está hecho. Lo que venga es de más.',
  'Otro más. Te dejo el reloj, pero acordate de que nadie te está corriendo.',
];

/* Cuando se termina la pausa. Cortas: la idea es que vuelva, no leer un texto. */
const FRASES_PAUSA = [
  'Se terminó la pausa. Cuando quieras arrancamos otra.',
  'Listo el descanso. Sin apuro: el próximo lo arrancás vos.',
];

export { POMODORO, RATOS, FRASES_FOCO, FRASES_PAUSA };
