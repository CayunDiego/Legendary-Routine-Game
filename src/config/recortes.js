/* Dónde está cada cuadro dentro de cada hoja de sprites.

   Los números NO se escriben acá: salen de `recortes.json`, que genera
   `scripts/sprites.py` midiendo las hojas de `arte-fuente/`. Este archivo es
   sólo el mostrador: le pone nombre a cada cosa y la deja en la forma que el
   motor quiere, así cambiar un sprite no obliga a tocar código.

   Para cambiar un sprite: dejar la hoja nueva en `arte-fuente/` y correr
   `npm run sprites`. La guía completa está en docs/sprites.md. */
import datos from './recortes.json';

/* Kath y Diego: grilla pareja de 4 cuadros de caminata x 4 direcciones (abajo,
   izquierda, derecha, arriba — el orden de motor.js#DIRS), celda de 24 x 32.
   `w` y `h` son el tamaño de la celda, no de la hoja: el motor multiplica
   columna x w, fila x h. Del baile sale la misma forma, y por eso los cuadros
   se pueden intercambiar uno por uno con los de caminar. */
export const KATH = datos.kath;
export const BAILE = datos.baile;
export const DIEGO = datos.diego;

/* Merlí: misma idea pero con 10 cuadros por dirección, celda de 57 x 42, y se
   dibuja 1:1 (sin reescalar) para que quede nítido. */
export const MERLI = datos.merli;

/* Compañero: 3 etapas x 4 direcciones x 4 cuadros. No hay grilla — cada cuadro
   tiene su propio tamaño y las etapas crecen — así que cada fila trae su `y`,
   su `w`, su `h` y la lista de `x` de sus cuadros. Las direcciones vienen en el
   orden de DIRS, aunque en la hoja cruda estén en cualquier orden: eso lo
   acomoda el script al empaquetar. */
export const COMPANERO_ANIM = datos.companero;

/* Retrato de cada etapa para el diálogo de evolución: el primer cuadro mirando
   para abajo, o sea la pose de frente. Se calcula acá y no a mano para que no
   se despegue de COMPANERO_ANIM cuando cambie la hoja. */
export const COMPANERO_RETRATOS = COMPANERO_ANIM.map(([abajo]) =>
  ({ x: abajo.x[0], y: abajo.y, w: abajo.w, h: abajo.h }));

/* Huevo: dos tiras de 10 cuadros, cada cuadro con su rectángulo propio.
   `idle` es el bamboleo mientras espera; `hatch`, la eclosión entera de huevo
   sano a cáscara rota, en orden. El último cuadro de `hatch` queda fijo como
   la cáscara rota que se ve después de que nace. */
export const HUEVO_IDLE = datos.huevo.idle;
export const HUEVO_HATCH = datos.huevo.hatch;
