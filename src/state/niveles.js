/* ---------------------------------------------------------------------------
 *  Curva de niveles.
 *
 *  Vive aparte de gameLogic.js por una razón concreta: fusion.js necesita
 *  convertir (nivel, xp) a XP total y volver, y si lo importara de gameLogic
 *  tendríamos un ciclo (gameLogic -> fusion -> gameLogic). Acá no hay ciclo
 *  porque este módulo no importa nada.
 * ------------------------------------------------------------------------- */

function xpNecesaria(nivel) { return 80 + (nivel - 1) * 55; }

/* XP total acumulada desde el nivel 1. La fusión de dos partidas no puede
   comparar (nivel, xp) por separado — nivel 3 con 10 xp es más que nivel 2 con
   70 xp — así que se aplana a un solo número, se toma el máximo y se vuelve. */
function xpTotal(nivel, xp) {
  let t = xp;
  for (let n = 1; n < nivel; n++) t += xpNecesaria(n);
  return t;
}

function desdeXpTotal(total) {
  let nivel = 1, resto = Math.max(0, total);
  while (resto >= xpNecesaria(nivel)) { resto -= xpNecesaria(nivel); nivel++; }
  return { nivel, xp: resto };
}

export { xpNecesaria, xpTotal, desdeXpTotal };
