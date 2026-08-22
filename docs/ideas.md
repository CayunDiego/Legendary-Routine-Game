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

- **2026-08-22 — El reloj con el día de la semana.** `PixelTexto`
  (`components/Reloj.jsx`) hoy dibuja dígitos, `:` y `/` y nada más. Con las
  letras dibujadas se podría poner "SAB 22/08" arriba de la hora, que es lo que
  uno mira primero cuando no sabe ni qué día es. Son ~7 glifos por palabra, o
  las 27 letras si se quiere algo reusable.

- **2026-08-22 — Ver las misiones secundarias de los días pasados.** Se guardan
  con su fecha (`EST.extras`, hasta 200) pero la pestaña Hoy sólo muestra las
  del día. En Progreso entrarían bien: es el lugar donde ya se mira para atrás,
  y leer lo que una hizo hace tres semanas es la parte linda de haberlo
  anotado.

- **2026-08-22 — Que las secundarias cuenten para la racha.** Hoy dan XP y oro
  pero no mueven `contarHechasHoy()`, así que un día entero de cosas que no
  están en la casa no mantiene la racha. Tiene su lógica —la racha mide la
  rutina— pero también tiene su contra el día que Kath hizo un montón y el
  juego le dice que no hizo nada.

- **2026-08-16 — Carpita mágica en el patio.** Mini carpa/casita de juguete
  con puerta negra. Kath choca con la puerta y la teletransporta a un mundo
  maravilloso (mapa/escena nueva).

---

## Hechas

- **2026-08-19 — Moño de Hello Kitty (cuarto disfraz).** Aparece en el césped
  como los otros tres: entrada en `config/disfraces.js` y arte por dirección
  en `engine/disfraces.js`, sin hoja de sprites nueva. Rojo, ladeado, con el
  nudo cruzado en el medio y el hueco de cada lazo en rojo oscuro — sin ese
  hueco queda una mancha roja con forma rara en vez de cinta atada.

  Es el primer accesorio de cabeza que va en la capa **`adelante`** y no
  `atras`. Los otros dos van detrás a propósito (el afro les tapa la base y
  se leen como que salen de atrás, ver la nota de 2026-08-17), pero un moño
  se apoya *sobre* el pelo: dibujado detrás, el afro se lo come entero.

  El moño va siempre del mismo lado de la cabeza —el izquierdo de Kath— y eso
  obliga a **espejarlo en dos de las cuatro direcciones**: de frente y de
  perfil izquierdo se ve por el lado de adelante, de espaldas y de perfil
  derecho se ve por detrás, y visto por detrás la inclinación se da vuelta.
  Sin el espejo, al girar parecía que el moño saltaba de lado.

  Las cuatro posiciones se ajustaron mirando el sprite de verdad, no a ojo:
  un script que vuelca `kath_hoja.png` a ASCII y le compone el arte encima.
  La cabeza no arranca a la misma altura en las cuatro filas de la hoja (y=2
  de frente, y=3 de perfil izquierdo, y=4 de perfil derecho y de espaldas),
  así que las cuatro anclas son distintas; con una sola el moño queda
  flotando en el aire en dos de ellas.

- **2026-08-17 — Disfraces coleccionables.** Tres accesorios (orejas de Skre,
  antenitas de abeja, capa de superheroína) que aparecen solos caminando por
  el césped y se guardan en el placard del cuarto, con su pestaña en el menú.
  `config/disfraces.js` es el catálogo, `engine/disfraces.js` el arte.

  La nota original pedía "sprites por disfraz, mismo formato que la hoja de
  caminar". **No se hizo así**, y conviene saber por qué: eso son 16 cuadros
  nuevos por disfraz, dibujados encima de Kath y calzando al píxel. En vez de
  eso son accesorios que se dibujan *sobre* la hoja que ya existe. Lo que lo
  hace viable es un dato que se midió: la cabeza está exactamente en el mismo
  lugar en los 16 cuadros de la hoja de caminar **y** en los 16 de la de
  bailar. Por eso alcanza con un dibujo por dirección — cuatro por accesorio,
  no dieciséis — y funcionan igual bailando sin tocar nada.

  Dos cosas que costaron y no son evidentes:

  - **Los accesorios de la cabeza van DETRÁS del sprite, no delante.** El
    primer intento los apoyaba "sobre" la cabeza y quedaban flotando con un
    hueco. El pelo de Kath es un afro redondeado: arranca en y=2 en la
    coronilla pero recién en y=5 o 6 en los costados, que es justo donde caen
    las orejas. La solución no es moverlas sino alargarlas hasta y=11
    (`RAIZ`) y dibujarlas detrás: el pelo les tapa la base y se leen como que
    salen de atrás.
  - El lienzo del accesorio es 8 filas más alto que el cuadro (`ALTO_EXTRA`)
    porque una oreja no entra en los 2 px que hay sobre la cabeza. El arte se
    autorea en coordenadas del cuadro —con `y` negativo para lo que sobresale—
    y el módulo se encarga del corrimiento, para no tener que pensarlo en cada
    rectángulo.

  El hallazgo se sortea al terminar un paso sobre césped, no en cada cuadro
  (si no, un paso lento sortearía diez veces), y sólo entre lo que falta, para
  que el último accesorio cueste lo mismo que el primero.

  Las orejas son de **Shrek** (Kath es fanática), así que son las trompetas
  verdes del ogro y no orejas paradas: salen de los costados de la cabeza y
  necesitan `ANCHO_EXTRA` además de `ALTO_EXTRA`, porque el afro ya ocupa de
  x=3 a x=20 de los 24 que tiene el cuadro y no quedaba lugar para que
  asomaran. Y llevan contorno oscuro (`conBorde()`): sin él, un accesorio
  verde sobre el césped —o sobre la alfombra del cuarto, que también es
  verde— se camufla y desaparece. Todas las hojas del juego traen ese
  contorno dibujado; el arte por código hay que acordarse de dárselo.

  El placard va en (11,3), contra la pared derecha, y **no** debajo del
  cuadro: ahí tapaba la casilla (10,3), que es desde donde se lee la carta, y
  la dejaba inalcanzable.

  **Post-mortem — "los pies se cortan" en la etapa 3 del compañero
  (2026-08-17).** Parecía un problema de recorte (`COMPANERO_ANIM` mal
  medido) y no lo era: medí las cuatro direcciones tres veces con scripts de
  Python distintos, cada vez más rigurosos, y las coordenadas ya eran exactas
  al píxel del contenido real de la hoja. El corte pasaba en tiempo de
  ejecución, no en el archivo.

  La causa: `dibujarBicho()` dibujaba directo desde `hojaCompanero` (cuadros
  de hasta 194 px) escalando a `BICHO_ESC = 0.36` con
  `ctx.imageSmoothingEnabled = false`. Sin suavizado, achicar así de fuerte
  no promedia nada — toma un píxel de la fuente por cada píxel de destino y
  se salta el resto. Una garra o una punta de ala mide 1-2 px en la fuente,
  así que según en qué píxel exacto cae el muestreo, esa pasada la pinta
  entera o se la come del todo. Por eso salía distinto según el cuadro de la
  caminata y por qué achicar el rectángulo de recorte no cambiaba nada: el
  recorte ya estaba bien, lo que fallaba era la escala.

  Simulé el achique con Python (`Image.resize(..., NEAREST)` contra
  `Image.resize(..., BOX)`) para confirmarlo antes de tocar código — con
  NEAREST el pie desaparecía, con BOX (promedio de área) quedaba completo.
  Mismo problema, mismo arreglo que ya dejaron anotado para `kath_baile.png`
  y `merli_hoja.png`: promediar el área en vez de mirar un píxel. La
  diferencia es que ahí lo hicieron una vez a mano con un script externo
  (que no se guardó — ver deuda técnica 4f) y acá se hace en el propio
  cliente: `construirBicho()` en `engine/motor.js` recorta y reescala cada
  uno de los 48 cuadros UNA sola vez al cargar la hoja, con el suavizado
  prendido sólo para ese paso, y cachea el resultado en `COMPANERO_SPR`.
  `dibujarBicho()` dibuja esos cuadros ya achicados 1:1, con el suavizado
  apagado de nuevo — así no se pierde nitidez en pantalla, sólo se evita
  repetir el achique agresivo en cada frame.

  Si algún día un personaje se ve con detalles finos que "parpadean" o
  desaparecen según el cuadro de animación, es este mismo problema: buscar
  un `drawImage` que achique mucho con el suavizado apagado.

- **2026-08-17 — Doble check en cupones canjeados.** Cada canje lleva
  `cumplidoEn` (el día en que Kath marcó que Diego se lo cumplió de verdad;
  vacío = sigue esperando). `TabPremios.jsx` los parte en "Esperando a Diego",
  con un botón ✓ por cupón, y "Ya cumplidos", con el ✓✓ verde y la fecha.

  Lo que hubo que cuidar está en la sincronización, no en la pantalla:

  - `fusion.js` unía los canjes por `cid` pisando uno con otro, así que la
    copia sin marcar del otro dispositivo devolvía a la lista de espera un
    premio ya recibido. Ahora se unen con `unirCanje()`: si cualquiera de los
    dos lados lo tiene cumplido, queda cumplido, y ante dos fechas gana la más
    temprana. Cubierto en `smoke.mjs` ("un cupon ya cumplido no vuelve a
    quedar pendiente"), en los dos órdenes de fusión.
  - `confirmarCanje()` recibe el canje y no su `cid`. La fusión arrastra tal
    cual los canjes viejos anteriores al `cid`, así que buscar por un cid
    vacío marcaba el primero de la lista que tampoco tuviera — un cupón
    cualquiera.

- **2026-08-17 — El huevo roto se va del jardín a las 2 horas.** `EST` guarda
  `eclosionadoEn` y el motor saca la cáscara pasadas `HUEVO_DURA_MS`. Mira el
  reloj y no un flag, así vale igual si Kath deja el juego abierto o si vuelve
  al día siguiente.

  Lo importante es que se va del mundo **entero**, no sólo del dibujo
  (`quitarHuevoDelMundo()` limpia `objPorTile` y `solido` además de marcar
  `oculto`): dejar sólo de dibujarlo habría puesto una pared invisible en el
  medio del patio que además contestaba el botón A. Eso es lo que verifica
  `smoke.mjs` ("la cascara vencida deja de tapar el paso"), no que se vea o no.

  En la fusión, `eclosionadoEn` toma la fecha más temprana de los dos
  dispositivos: con la más nueva, cada sincronización le habría regalado dos
  horas más de vida a la cáscara.

- **2026-08-17 — Formato automático del código de partida.** El input de
  "pegá su código" en `TabAjustes.jsx` ahora limpia caracteres especiales y
  agrupa con guiones en cada tecleo (`disco.normalizarCodigo` +
  `disco.formatearCodigo`, recortado a `LARGO_CODIGO`). El aviso de
  "Conectado, las dos partidas se fusionaron" y el de "Código copiado." al
  usar el botón Copiar ya existían de antes en el mismo archivo (`decir(...)`
  en `alConectar` y en el `onClick` del botón Copiar) — no hizo falta
  agregar nada ahí, solo se confirmó que están.

- **2026-08-17 — Cursor de manito en botones (desktop).** Regla en
  `App.css` con `@media (hover:hover) and (pointer:fine)` para no afectar
  el táctil: `cursor:pointer` en todo `button` habilitado, `not-allowed` en
  los deshabilitados.

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
