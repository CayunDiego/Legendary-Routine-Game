# Ideas / features nuevos

Lugar para anotar ideas de cosas para agregar más adelante, así no se
pierden en el chat ni hay que tenerlas en la cabeza. No es una lista de
compromisos: es un "capaz, en algún momento". Lo que sí se decidió hacer
pasa a ser una tarea normal, no necesita estar acá.

## Cómo se usa

- Una entrada por idea, fecha de cuando se anotó, una o dos líneas alcanza.
  No hace falta especificarla del todo — eso se piensa cuando se vaya a
  hacer.
- Al implementarla, se mueve de **Pendientes** a **Hechas** con la fecha y,
  si corresponde, un link al commit.
- Si se descarta, se mueve a **Descartadas** con el motivo — vale tanto
  como anotar por qué sí se hace algo.

---

## Pendientes

- **2026-08-16 — Disfraces coleccionables.** Kath se puede poner disfraces
  distintos. Se encuentran caminando por el césped (aparición al azar o por
  misión) y se van guardando en un placard del cuarto, como colección.
  Necesita: sprites por disfraz (mismo formato que la hoja de caminar, para
  poder intercambiarla como con el baile), lugar en el estado (`EST`) para la
  colección y el disfraz puesto, y la pantalla del placard para elegir.

- **2026-08-16 — Carpita mágica en el patio.** Mini carpa/casita de juguete
  con puerta negra. Kath choca con la puerta y la teletransporta a un mundo
  maravilloso (mapa/escena nueva).

---

## Hechas

- **2026-08-16 — Aura de XP alrededor de Kath.** Halo de gradiente radial
  dibujado en `engine/motor.js#dibujarAura()`, detrás de la sombra y del
  sprite. Se enciende con `EST.xp / xpNecesaria(nivel)` y cambia de color por
  `EST.nivel` (`AURA_COLORES`, cinco colores en ciclo). Con la barra en cero no
  se dibuja nada. Al subir de nivel se abre hasta 3.2× y se apaga en ~1s. El
  estallido no lo avisa `juego.js`: el motor compara `EST.nivel` contra el que
  vio la vuelta anterior, así vale para cualquier cosa que dé XP sin tener que
  acordarse de tocar dos lados. Todo canvas, sin arte nuevo.

  Ojo con los radios: el halo va debajo del sprite, que en pantalla es de
  72 x 96, así que cualquier radio menor a ~40 queda escondido dentro de la
  silueta y el aura no se ve — fue el primer intento, con radios de 20 a 40.
  De ahí salen dos decisiones que parecen raras si no se sabe esto: el anillo
  más brillante no está en el centro sino en `AURA.brillo` (más o menos donde
  termina el cuerpo), y lo que crece con la barra es la opacidad, no el
  tamaño. Si el radio arrancara en cero, media barra se iría escondida atrás
  del cuerpo y el aura aparecería de golpe sobre el final.

- **2026-08-16 — Merlí, el gatito.** Deambula solo por el dormitorio (y a
  veces cruza al pasillo) con una IA simple: cada tanto sortea una casilla
  vecina dentro de `config/merli.js#ZONA_MERLI` y camina hasta ahí, con
  pausas entre paso y paso. Arranca con arte dibujado por código y termina
  con hoja de verdad: `assets/merli_hoja.png`, 10 cuadros de caminata x 4
  direcciones, celda de 57 x 42 que se dibuja 1:1 (sin reescalar) para que
  quede nítida. Cada dirección es dibujo propio, así que no hace falta el
  espejo que sí usa Kath.

  Lo aprendido al recortarla, por si vuelve a pasar con otro personaje:

  - Los rótulos de la hoja original venían **cruzados** en los laterales
    ("LOOKING LEFT" tiene al gato mirando a la derecha). Conviene mapear
    por el dibujo y no por el texto.
  - La hoja vino reescalada con interpolación suave, sin bloques de color
    plano, así que el downsample promedia el área de cada píxel destino.
    Probé también color dominante (moda), que en pixel art suele preservar
    mejor el detalle fino, y salió peor: se come el contorno bordó.
  - A 42 px de alto el collar azul y el cascabel no sobreviven (miden ~2 px
    en destino). Si alguna vez se quieren ver, hay que agrandar el sprite,
    no cambiar el método de reducción.
  - Cuantizar a 32 colores baja el PNG de 124 kB a 59 kB sin diferencia
    visible.

---

## Descartadas
