/* ---------------------------------------------------------------------------
 *  MISIONES SECUNDARIAS (los puntos extra)
 *
 *  Las de config/misiones.js son siempre las mismas y están puestas en la casa.
 *  Estas no: son lo que Kath hizo por fuera de la lista y le cuenta a Diego,
 *  que está afuera de la casa. Ella escribe qué hizo y eso queda guardado como
 *  una misión más del día, con su fecha y su hora, pero de otro color.
 *
 *  xp / oro : lo que paga cada una. Vale lo mismo que una misión pesada de la
 *             lista: si valiera poco, contarla sería un trámite.
 *  porDia   : tope diario. No es para desconfiar, es para que la recompensa no
 *             se vuelva infinita y las misiones de la casa dejen de importar.
 *  largoMax : hasta dónde se guarda lo que escribe. Es una línea, no un diario.
 * -------------------------------------------------------------------------*/
const EXTRA = {
  icono: '⭐',
  xp: 15,
  oro: 8,
  porDia: 3,
  largoMax: 120,
};

/* Cuando dice que todavía no hizo ninguna. Rotan solas (no se sortean: con
   pocas frases el azar repite la misma dos y tres veces seguidas, y eso se lee
   como que Diego no tiene nada más para decir). */
const FRASES_SIN_EXTRA = [
  'Está perfecto igual. Con lo de la casa ya estás cumpliendo de sobra.',
  'Ojo que cuenta cualquier cosa: mandar ese mensaje que te daba vueltas, ordenar un cajón, salir a caminar sin motivo. Si te costó, cuenta.',
  'Ninguna todavía, y no pasa nada. El día no se mide sólo por lo que producís.',
  'Cuando hagas algo que te dé orgullo, por chiquito que sea, venís y me lo contás.',
];

/* Al terminar de anotarla. Se elige por la cantidad que lleva hoy. */
const FRASES_CON_EXTRA = [
  'Anotada. Eso no estaba en ninguna lista y lo hiciste igual.',
  'Dos por fuera de la lista. Estás teniendo un día de esos buenos.',
  'Tres. Ya está, andá a descansar que te lo ganaste.',
];

export { EXTRA, FRASES_SIN_EXTRA, FRASES_CON_EXTRA };
