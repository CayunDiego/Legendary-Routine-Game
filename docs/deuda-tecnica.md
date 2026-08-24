# Deuda técnica

Publicado y en uso. `npm test` verde (2026-08-24): lint 0 errores, 12 pasos
worker, 132 pasos smoke.

**Leer esto antes de "arreglar" algo raro**: puede estar acá, decidido a
propósito. Deuda nueva se anota acá, no se cuenta en el chat.

## Abierta

### A. El código de partida no se puede recuperar — media
Única llave de la partida en la nube. Sin cuenta ni mail, no hay forma de
reemitirlo. Si Kath borra los datos del navegador en los dos dispositivos y no
lo anotó, la partida existe en D1 pero es inalcanzable (99 bits no se buscan a
mano). Elegido así (un login para una sola jugadora es más fricción que
protección), pero la mitigación es floja: "que se acuerde de mirar Ajustes".
**Arreglo barato:** meter el código en el `.json` de la copia de seguridad. No
se hizo para no cambiar el formato antes de que estuviera cerrado.

### B. No hay verificación real de navegador — media
El smoke detecta que nada explota, no que se vea bien. Un sprite corrido o un
panel desalineado siguen siendo invisibles. Todo lo visual se verificó a mano.
**Arreglo:** Playwright con capturas contra `legacy/index.html` de referencia.

### C. La clase `presionado` tiene tres dueños — media
`components/Controles.jsx` (dedo/mouse), `engine/input.js#pintarDpad` (flechas)
y `game/juego.js#armarTeclado` (Z/X) tocan `classList` de los mismos nodos que
dibuja React. Hoy no chocan porque se coordinan por `input.dir`. Se rompe el día
que alguien pase el estado del d-pad a `useState`.

### D. `motor.js` es un singleton de módulo — baja
Estado a nivel de módulo (`let cv, ctx, hojaSprite...`) + `montarCanvas()`. No
se puede tener dos instancias ni testear el motor aislado. Se dejó así para no
reescribir el motor entero pasándolo por `this`.

### E. `game/juego.js` es un cajón de sastre — baja
Mezcla acciones de objetos, teclado y arranque. Partible en
`acciones.js` / `teclado.js` / `arranque.js`. Además `hooks/useInput.js` importa
de `game/`: un hook dependiendo de la capa de juego, flecha al revés.

### F. El sprite de Diego entra a la build aunque el flag esté apagado — baja
Sin efecto hoy (`FLAGS.diego = true`). `config/sprites.js` lo importa estático,
así que Rollup lo emite igual: el flag es runtime. **Arreglo:** `import()`
dinámico, que vuelve asíncrona la carga para ahorrar 15 kB que el SW cachea una
sola vez. Queda anotado para el próximo flag que apague algo con arte propio.

### G. La fusión toma el máximo de la racha — baja
`Math.max` de los dos dispositivos, no la racha recalculada del historial
fusionado. Si la tablet quedó con 9 y el teléfono cortó a 0, quedan 9. Redondeo
a favor de Kath a propósito, pero es la única regla no exacta.
**Arreglo:** recalcular desde `historial` después de fusionar.

### H. La sincronización sube la partida entera — baja
Cada `PUT` manda `EST` completo (~5 kB). Irrelevante contra el plan gratis, y la
fusión necesita el estado completo igual. Importa si el historial crece.

### I. Saltear el PUT retrasa enterarse del otro dispositivo — baja
Efecto conocido, no descuido. Si el otro escribe justo entre nuestro `GET` y el
`PUT` que no mandamos, no nos enteramos en esa ronda. No se pierde nada: llega
en la sincronización siguiente. Ventana de milisegundos, se cura sola.

### J. Cambiar una hoja de sprites pide algunos datos a mano — baja
`orden` (para dónde mira cada fila; no automatizable con lo que hay, los rótulos
del generador están cruzados), `cortes` (sólo el huevo) y a veces `fondo` (la
detección pide ≥5% del marco por color y un damero con degradé no llega).
Detalle en `sprites.md`. `merli_hoja.png` es la única que no se regenera a
propósito.

### K. Las horas de hoy pueden quedar más cortas que el contador — muy baja
Al fusionar se elige entera la lista `hoyEn` del que hizo más veces (mezclarlas
armaría una mañana que no pasó en ningún lado), así que el contador puede ser
mayor que la cantidad de horas. Se ve como "2/2" con una sola hora al lado. Es
honesto: no inventa un horario. Pasa igual en partidas anteriores a v3.

### L. La fusión no paga las secundarias de los dos dispositivos — baja
Las secundarias se unen bien (cada una trae su `eid`), pero el oro no las sigue:
`fusion.js` reconstruye con `max(oroGanado)`, así que si el teléfono anotó una y
la tablet otra, quedan las dos anotadas y una sola pagada. Las misiones de la
casa tienen el mismo problema desde que existe la fusión; la diferencia es que
ahora hay con qué arreglarlo (cada secundaria guarda su `xp` y `oro`, y el
historial no se recorta por día).
**Arreglo:** sumar el oro de las secundarias que la fusión sumó, en vez del
máximo pelado. La parte que falta pensar es hacerlo **idempotente**:
sincronizar dos veces no puede pagar dos veces.

### M. Sentada en el sillón sólo se le ve la cabeza — muy baja
Es el mecanismo, no un bug: el respaldo la tapa porque `kath_sentada.png` trae
una silla dibujada adentro del sprite y hay que esconderla. La silueta es
correcta (cabeza asomando del sillón, mirando la tele) pero es menos lucida que
la pose de frente.
**Arreglo de verdad:** una hoja de Kath sentada **sin silla**. Con eso el
respaldo puede ser más bajo (se le verían los hombros) y se podría sentar en
cualquier mueble sin trucos de orden de dibujo. El código ya está preparado:
sería sacar `tapa` de los sillones en `config/mapa.js`.

### N. Los avisos del pomodoro no suenan con la pestaña escondida — media
`finFoco` / `finPausa` los dispara `revisarPomodoro()`, que corre en un
`setInterval` de la pestaña: con el teléfono bloqueado o el juego en segundo
plano —o sea, haciendo bien el pomodoro— el navegador lo frena, y el sonido
llega recién cuando Kath vuelve a mirar (el `visibilitychange` lo cierra ahí
mismo). El reloj no se atrasa nunca, el aviso sí. Y aunque la pestaña esté
visible, el `AudioContext` arranca suspendido hasta el primer toque: entrar al
juego y no tocar nada deja el primer aviso mudo.
**Arreglo:** notificaciones del sistema (`Notification` + service worker), que
es lo único que suena con la pantalla apagada. Pide permiso, y con permiso
negado no hay plan B.

## Resuelto

| Qué | Cuándo | Cómo quedó |
|---|---|---|
| Una alfombra le robaba la casilla a un mueble | 2026-08-23 | `objPorTile` pisaba con el último cargado; las alfombras van declaradas después, así que un mueble adentro de una desaparecía del mapa de interacción (seguía dibujado y sólido, el botón A no lo veía). Latente desde que existen las alfombras grandes; apareció con la silla del escritorio. Ahora un `decor` no puede pisar a uno que no lo es. Cubierto por el smoke |
| Cambiar un sprite obligaba a medir a mano y tocar código | 2026-08-18 | `scripts/sprites.py`: mide, recorta, empaqueta y escribe `recortes.json`. Verificado contra lo publicado (48 cuadros del compañero en el mismo orden; Diego y baile píxel por píxel idénticos). De paso: Kath salió de base64 y `merli.png` de `src/assets/` |
| Las hojas del huevo y el compañero pesaban MB sin recortar | 2026-08-18 | Recorte + paleta a 64 colores (elegido mirando el degradé del cascarón). Lo que el SW precachea bajó de ~2,5 MB a 928 kB. Alfa verificado byte a byte |
| Una partida ilegible se borraba sola | 2026-08-15 | Era la peor: `cargar()` hacía `EST = EST_INICIAL()` en el `catch` y el próximo `guardar()` pisaba la buena. Ahora dos copias y, si no puede leer ninguna, **traba el guardado**. Paso de smoke que lo cuida |
| El guardado fallaba en silencio | 2026-08-15 | `catch {}` vacío. Ahora `guardar()` devuelve si pudo, distingue cuota de bloqueo, y Ajustes lo muestra |
| El progreso vivía en un solo dispositivo | 2026-08-15 | Worker + D1, código de partida en vez de login, fusión de verdad + compare-and-swap. Local sigue siendo la fuente de verdad |
| El service worker no dejaba actualizar el juego | 2026-08-15 | Tres estrategias (red-primero navegación, caché-primero `assets/`, revalidar el resto). `swConAssets` inyecta la lista real con hash; si no puede, corta la build |
| `empezar()` peleaba con `TituloScreen` | 2026-08-15 | Manipulaba `classList` y `display:none` a mano; React no lo podía limpiar |
| `hooks/useDialogo.js` estaba muerto | 2026-08-15 | `Dialogo.jsx` hablaba con el store directo. Ahora lo usa |
| `README.md` estaba en UTF-16LE | 2026-08-23 | Se leía con un espacio entre cada letra en cualquier herramienta que asume UTF-8, `grep` incluido. Reconvertido |
| Emojis rotos en Windows | 2026-08-15, reincidió 08-19 | Bloque **U+1FA70–U+1FAFF** (emojis 2019+): `seguiemj.ttf` de Win10 no los trae, salen cuadrado. Reincidió con el espejo del baño, porque el emoji obvio para "espejo" cae ahí. Ahora un paso de smoke recorre `src/` y falla si aparece alguno. **Los codepoints se escriben, no se pegan** — un comentario que explique esto con los emojis dibujados hace fallar al paso que lo cuida. Ya pasó |
