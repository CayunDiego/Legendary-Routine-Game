# Deuda técnica

Estado: publicado, con guardado en la nube (2026-08-16).
Verificado con `npm run test` (2026-08-22): lint 0 errores, `smoke:worker` 12
pasos verdes, `smoke` 106 pasos verdes.

---

## 0. El código de partida no se puede recuperar si se pierde

**Severidad: media.**

El código es la única llave de la partida en la nube, y no hay cuenta, mail ni
nada que permita volver a emitirlo. Si Kath borra los datos del navegador en los
dos dispositivos y no anotó el código, la partida sigue existiendo en D1 pero es
inalcanzable: 99 bits de azar no se buscan a mano.

Se eligió así a propósito — un login para una sola jugadora es más fricción que
protección — pero la mitigación es floja: hoy es "que se acuerde de mirar
Ajustes".

**Arreglos posibles, de menos a más:**

- Meter el código dentro del `.json` de la copia de seguridad. Con eso, restaurar
  una copia recupera también el acceso a la nube. Es barato y cubre el caso real.
  No se hizo todavía porque cambia el formato del archivo y quería el formato
  cerrado antes de que existan copias viejas dando vueltas.
- Que Diego tenga el código anotado aparte.
- Un segundo código de sólo lectura para recuperación.

---

## 1. La clase `presionado` tiene tres dueños

**Severidad: media.**

Tres lugares tocan `classList` de los mismos nodos que dibuja React:

| Dónde | Qué maneja |
|---|---|
| `components/Controles.jsx` | dedo y mouse sobre el d-pad y A/B |
| `engine/input.js` (`pintarDpad`) | flechas del teclado sobre el d-pad |
| `game/juego.js` (`armarTeclado`) | teclas Z/X sobre A/B |

Hoy no chocan porque se coordinan a través de `input.dir`, pero es frágil: el día que alguien pase el estado visual del d-pad a `useState`, React y el código imperativo se van a pisar.

**Arreglo:** un solo dueño. O todo imperativo (que `Controles` exponga la referencia y `input.js` la use), o todo React (que `input.dir` sea estado suscribible y la clase salga del render).

---

## 2. `motor.js` es un singleton de módulo

**Severidad: baja.**

El plan pedía "una clase o closure `GameEngine` inicializable con un canvas ref". Quedó como estado a nivel de módulo (`let cv, ctx, vpW, vpH, hojaSprite...`) con `montarCanvas()`.

Se decidió así para no reescribir las ~300 líneas del motor y hacerlas pasar por `this`. Consecuencia: no se puede tener dos instancias ni testear el motor aislado.

**Arreglo:** envolver en closure. Verificable con el smoke test.

---

## 3. `game/juego.js` es un cajón de sastre

**Severidad: baja.**

394 líneas mezclando tres cosas: acciones de objetos (`accionMision`, `accionTele`, `accionCarta`…), el teclado (`armarTeclado`) y el arranque (`iniciar`).

Ninguna tiene forma de componente, así que no entra en `components/`. Se podría partir en `acciones.js` / `teclado.js` / `arranque.js`.

Detalle de capas: `hooks/useInput.js` importa `armarTeclado` de `game/`, que es un hook dependiendo de la capa de juego. Funciona, pero la flecha va al revés de lo esperado.

---

## 4. El sprite de Diego entra a la build aunque el flag esté apagado

**Severidad: baja. Sin efecto hoy** (desde 2026-08-22 `FLAGS.diego = true`:
Diego está en el jardín y su PNG se usa de verdad). Queda anotado porque el
mecanismo sigue igual para el próximo flag que apague algo con arte propio.

`FLAGS.diego = false` lo saca del dibujo, de la colisión y de la interacción, y evita que se pida el PNG en runtime. Pero `config/sprites.js` hace `import SPRITE_DIEGO from '../assets/diego.png'` de forma estática, así que Rollup emite `assets/diego-<hash>.png` (14.93 kB) igual. El flag es un valor de runtime y no alcanza para eliminarlo.

Medido: con el flag apagado el bundle JS baja 40 bytes y el PNG sigue ahí.

**Arreglo:** `import()` dinámico adentro del `if` de `cargarSprite()`. No se hizo porque vuelve asíncrona la carga del sprite para ahorrar 15 kB que el service worker cachea una sola vez.

---

## 4b. La fusión toma el máximo de la racha

**Severidad: baja.**

`fusion.js` resuelve `racha` con `Math.max` de los dos dispositivos. No es la
racha que habría salido de recalcular el historial fusionado día por día: si la
tablet quedó con una racha vieja de 9 y el teléfono cortó a 0 porque Kath se
saltó un día, la fusión deja 9.

Se eligió redondear a favor de Kath — el juego existe para acompañarla, no para
auditarla — pero es una regla distinta de todas las demás, que sí son exactas.

**Arreglo:** recalcular la racha desde `historial` después de fusionar. Es un
recorrido de 90 entradas y ya está todo el dato necesario. Verificable con un
paso más en `smoke.mjs`.

---

## 4c. La sincronización sube la partida entera en cada viaje

**Severidad: baja.**

Cada `PUT` manda el `EST` completo (~5 kB con 90 días de historial). Con el
debounce de 4 s y dos dispositivos son unos cientos de kB por día: irrelevante
contra los límites del plan gratis, y la fusión necesita el estado completo de
todos modos para decidir.

Queda anotado por si el historial crece: si algún día se guardan más de 90 días
o algo por misión, esto pasa a importar y habría que mandar sólo lo que cambió.

---

## 4d. Saltear el PUT retrasa enterarse de lo que hizo el otro dispositivo

**Severidad: baja.** Efecto secundario conocido, no un descuido.

`sincronizar()` no manda el `PUT` cuando, después de fusionar, tiene exactamente
lo que el servidor le acaba de devolver. Eso ahorra la mitad de los viajes al
volver del segundo plano.

El costo: si el otro dispositivo escribe **justo** entre nuestro `GET` y el
`PUT` que no llegamos a mandar, no nos enteramos en esa ronda. Antes el `PUT`
chocaba con un 409 y traía el cambio de vuelta al instante.

No se pierde nada: lo del otro dispositivo sigue intacto en el servidor y llega
en la sincronización siguiente (al volver a la app, al completar una misión o al
volver la conexión). La ventana es de milisegundos y se cura sola.

**Si algún día molesta:** comparar `seq` remota contra la última vista y forzar
un `GET` extra, o mover el guardado a algo que empuje cambios en vivo
(Durable Objects con WebSocket). Las dos cosas son bastante más máquina de la
que este juego necesita.

---

## 4e. Cambiar una hoja de sprites todavía pide dos datos a mano

**Severidad: baja.** (Antes esta entrada decía que las hojas eran derivados que
no se podían rehacer; eso se resolvió, ver abajo en Resuelto.)

`npm run sprites` mide las hojas solo, pero quedan dos cosas que hay que
escribir en `scripts/sprites.json` mirando la imagen de revisión:

- **Cómo se llama cada fila** (`orden`): para qué lado mira el bicho de esa
  fila. No es automatizable con lo que hay: los rótulos de la hoja del compañero
  están cruzados, así que ni siquiera leyéndolos se acierta. Sería automatizable
  comparando cada fila contra la hoja anterior (misma pose, misma silueta), que
  es la idea si esto llega a molestar de verdad.
- **Los cortes de una fila donde los cuadros se pisan** (`cortes`): hoy sólo la
  eclosión del huevo, donde las esquirlas de un cuadro caen sobre el de al lado
  y no queda ningún hueco donde cortar. Los números se leen de la regla que
  dibuja la imagen de revisión.

Además, `merli_hoja.png` es la única hoja que **no** se regenera hoy: su cruda
está archivada como `arte-fuente/merli-crudo.png` a propósito. Rehacerla sale
bien (se probó), pero el gato queda un toque más grande que el que está
publicado, y ese cambio visual no tiene por qué viajar de garrón en el próximo
cambio de sprite. Para rehacerla: renombrarla a `merli.png` y correr el script.

---

## 4f. La fusión no paga las misiones secundarias de los dos dispositivos

**Severidad: baja.**

Las secundarias se unen bien —cada una trae su `eid` y no se duplican ni se
pierden— pero el oro no las sigue: `fusion.js` reconstruye el oro con
`max(oroGanado)`, así que si el teléfono anotó una y la tablet otra, quedan las
dos misiones anotadas y una sola pagada.

No es nuevo del todo: las misiones de la casa tienen exactamente el mismo
problema desde que existe la fusión. Lo que cambia es que ahora hay con qué
arreglarlo, porque cada secundaria guarda cuánto valía (`xp` y `oro` adentro de
la entrada) y el historial no se recorta por día.

**Arreglo:** sumar el oro de las secundarias que la fusión sumó y agregárselo a
`oroGanado`, en vez de tomar el máximo pelado. Hay que hacerlo idempotente
(sincronizar dos veces no puede pagar dos veces), que es justo la parte que
falta pensar.

---

## 4g. Las horas de hoy pueden quedar más cortas que el contador

**Severidad: muy baja.**

`hoyEn` guarda cuándo se cumplió cada vez de cada misión, pero al fusionar dos
dispositivos se elige entera la lista del que hizo más veces esa misión, en vez
de intercalar las dos (mezclarlas armaría una mañana que no pasó en ningún
lado). Si los dos hicieron veces distintas de la misma misión, el contador
fusionado puede ser mayor que la cantidad de horas que quedan.

Se ve como una misión con "2/2" y una sola hora al lado. Es honesto —no se
inventa un horario— y pasa sólo con dos dispositivos el mismo día en la misma
misión repetible. Lo mismo pasa, sin fusión de por medio, con una partida
anterior a la v3: tiene el contador y no tiene las horas.

**Arreglo:** ninguno que valga la pena hoy. Si molesta, la salida es guardar la
hora junto con el dispositivo que la anotó y mostrarlas todas.

---

## 5. No hay verificación real de navegador

**Severidad: media.**

`npm run smoke` levanta el juego con un DOM simulado y dibuja los 14 componentes con `renderToStaticMarkup`. Detecta que nada explota — no detecta que se vea bien.

Todo lo visual se verificó a mano hasta ahora. Eso no escala: los dos bugs de la etapa 2 (`hechoHoy` y `EST` en `sonido.js`) se detectaron con herramientas, pero un sprite corrido o un panel desalineado sigue siendo invisible.

**Arreglo:** Playwright con capturas contra el `legacy/index.html` como referencia.

---

## Resuelto

- **Cambiar un sprite obligaba a medir a mano y a tocar el código**
  (2026-08-18). Cada hoja nueva del generador se medía a ojo, y las coordenadas
  de los 48 cuadros del compañero (más las 20 del huevo) se pegaban a mano en
  `engine/motor.js` y `engine/retratosCompanero.js`. Era el paso más caro y más
  frágil de todo el proyecto: un número mal copiado se ve recién en pantalla, y
  medir de nuevo cuesta una sesión entera.

  Ahora hay un preprocesador, `scripts/sprites.py` (`npm run sprites`), que
  **mide solo**: saca el fondo (gris plano o damero) mirando el marco de la
  imagen, parte la hoja en filas por densidad de píxeles, encuentra los cuadros
  de cada fila con componentes conectados (union-find sobre los tramos de cada
  fila), descarta los rótulos quemados en la imagen por forma — un cartel llena
  el 95% de su caja y no tiene color; un bicho llena el 65% y tiene saturación
  0.3 — y le suma a cada cuadro las esquirlas que le salieron. Después empaqueta
  y escribe `src/config/recortes.json`, que es de donde el juego lee las
  coordenadas: cambiar un sprite ya no toca código.

  Lo que queda a mano está anotado arriba, en 4e. La verificación es una imagen
  por hoja en `arte-fuente/_revision/`, con cada cuadro marcado, numerado y con
  el nombre de su fila, y una regla de coordenadas arriba. Si la cuenta de filas
  no cierra contra el manifiesto, el script corta con un error y **no** pisa la
  hoja del juego, pero deja igual la revisión para poder mirarla.

  Verificado contra lo que ya estaba publicado: los 48 cuadros del compañero
  salen en el mismo orden etapa/dirección/cuadro que las coordenadas viejas
  (silueta comparada uno a uno, diferencia máxima 14%, que es el recorte más
  ajustado); las hojas de Diego y del baile salen píxel por píxel idénticas a
  las comiteadas; el huevo, con los mismos anchos de cuadro que las coordenadas
  medidas a mano (127 contra 126, 189 contra 189, 210 contra 209...).
  `npm run test` verde y `npm run build` sin cambios de peso.

  De paso se cerró lo otro que estaba anotado en 4e: `merli.png` (7,1 MB, el
  original de Merlí) salió de `src/assets/` — donde parecía un asset del juego —
  y quedó en `arte-fuente/`, y el sprite de Kath dejó de vivir en base64 dentro
  de `config/sprites.js` para ser un archivo más (`src/assets/kath_hoja.png`),
  que es lo que permite cambiarlo sin tocar código. `scripts/recortar-hojas.py`,
  que tenía las coordenadas escritas adentro y sólo recortaba, se borró: lo
  reemplaza el preprocesador. La guía para Kath y para Diego está en
  [`docs/sprites.md`](sprites.md).

- **Las hojas del huevo y el compañero pesaban varios MB sin recortar**
  (2026-08-18). `huevo_mascota.png` (1,46 MB) y `companero.png` (1,04 MB)
  eran las hojas crudas del generador: traían filas sin usar y, la del
  compañero, los rótulos ("ETAPA 1", "DERECHA", los números) quemados en la
  imagen — píxeles que el service worker precacheaba en cada instalación sin
  dibujarse nunca.

  `scripts/recortar-hojas.py` (nuevo, con Pillow; después reemplazado por
  `scripts/sprites.py`, ver la entrada de arriba) recorta sólo los cuadros
  que `COMPANERO_ANIM` / `HUEVO_IDLE_X` / `HUEVO_HATCH_X` usan hoy — esas
  coordenadas ya estaban verificadas al píxel, así que el script no midió de
  nuevo, sólo recortó y empaquetó — y arma dos hojas nuevas y compactas
  (`companero_hoja.png`, `huevo_hoja.png`) con la paleta cuantizada a 64
  colores. El número se eligió mirando el brillo del cascarón del huevo (el
  único degradé real de las dos hojas): a partir de 32 ya bandea un poco, a
  16 las manchas rojas/azules pierden el color, a 64 sale idéntico al ojo.
  Verificado además por código: los 48 cuadros del compañero tienen el canal
  alfa (la silueta) byte a byte igual al original, así que ningún recorte se
  corrió.

  Resultado, medido con `npm run build`: lo que el service worker precachea
  de estas dos hojas bajó de ~2,5 MB a 928 kB (companero_hoja 440 kB +
  huevo_hoja 489 kB) — Kath instala y actualiza bastante menos peso.

  Las hojas crudas (más las variantes de generación descartadas del
  compañero, `companero1-4.png` / `companero_b.png` / `companero-c.png`) se
  movieron a `arte-fuente/` en la raíz del repo, fuera de `src/`, siguiendo
  la idea que ya estaba anotada en 4e: dejan claro que son material de
  trabajo y no algo que la build use (Rollup no las toca porque nada las
  importa), y quedan ahí por si hace falta volver a recortar. La fila 1 y 2
  de `huevo_mascota.png` (variantes de sacudida y cáscara ya rota, sin usar
  todavía) no se perdieron: siguen en esa copia cruda.

- **Una partida ilegible se borraba sola** (2026-08-15). Era la peor: `cargar()`
  hacía `EST = EST_INICIAL()` dentro del `catch`, así que un JSON corrupto dejaba
  la partida en cero y el primer `guardar()` posterior pisaba la buena. Pérdida
  total, silenciosa e irreversible. Ahora `state/persistencia.js` guarda dos
  copias (la anterior pasa a `_bak` antes de cada escritura), y si no puede leer
  ninguna de las dos **traba el guardado** en vez de escribir encima. Ajustes lo
  muestra y ofrece restaurar una copia. Verificado en `smoke.mjs`: el paso
  "sin nada legible se traba y NO pisa" comprueba que la partida rota sigue tal
  cual en localStorage después de intentar guardar.

- **El guardado fallaba en silencio** (2026-08-15). `catch (e) { }` vacío: con el
  almacenamiento lleno o en modo privado de Safari, Kath podía jugar una tarde
  entera sin que se guardara nada y sin enterarse. Ahora `guardar()` devuelve si
  pudo, distingue cuota llena de bloqueo del navegador, y Ajustes muestra el
  estado con el motivo.

- **El progreso vivía en un solo dispositivo** (2026-08-15). Se agregó
  sincronización con un Worker de Cloudflare + D1 (ver [`worker/`](../worker/)),
  con código de partida en vez de login. La partida local sigue siendo la fuente
  de verdad: el juego arranca, se juega y se guarda sin red, y la nube se pone al
  día cuando puede. Los conflictos no se resuelven por "gana el último": el
  cliente fusiona de verdad (`state/fusion.js`) y el servidor usa compare-and-swap
  para que nadie pise a nadie. Además hay copia de seguridad en archivo, que es
  lo único que sobrevive a perder los dos dispositivos.

- **El service worker no dejaba actualizar el juego** (2026-08-15). Servía todo cache-first sin revalidar, así que quien tuviera el juego instalado se quedaba con la versión vieja para siempre. Ahora `public/sw.js` usa tres estrategias: red-primero para la navegación (el `index.html` decide qué assets cargar), caché-primero para `assets/` (el hash los hace inmutables) y caché-revalidando para el resto. El plugin `swConAssets` de `vite.config.js` inyecta en la build la lista real de assets con hash y una versión derivada de esos nombres; si no puede inyectar, corta la build. Verificado: cambio real de código → hash nuevo → versión nueva; republicar sin cambios → misma versión, sin invalidar la caché de nadie.

- **`empezar()` peleaba con `TituloScreen`** (2026-08-15). Hacía `$('titulo').classList.add('oculto')` y `style.display='none'` a mano, cosas que el componente ya maneja mirando el modo. El `display:none` imperativo era lo peor: React no lo conoce y no lo puede limpiar.
- **`hooks/useDialogo.js` estaba muerto** (2026-08-15). Se creó para cumplir el plan y `Dialogo.jsx` no lo usaba — hablaba con el store directo. Ahora sí lo usa.
- **Emojis rotos en Windows** (2026-08-15, reincidencia 2026-08-19). U+1FA99,
  U+1FAA5 y U+1FAA7 son Emoji 12-14 y `seguiemj.ttf` de Windows 10 no los tiene:
  salen como un cuadrado. Se reemplazaron por otros que la fuente sí trae,
  verificados contra su tabla de caracteres. Preexistente al refactor.

  **Volvió a pasar** con U+1FA9E (el espejo) al escribir el diálogo del espejo
  del baño: el emoji obvio para un espejo es justo uno del bloque prohibido. Los
  cuatro casos salen del mismo lado — U+1FA70..U+1FAFF, los emojis de 2019 en
  adelante — así que ahora hay un paso de `smoke.mjs`, "emojis: ninguno del
  bloque que Windows no dibuja", que recorre `src/` y falla si aparece
  cualquiera de ese rango. No se puede probar una fuente desde node, pero sí
  prohibir el bloque de donde salieron los cuatro.

  Detalle que suena a chiste y no lo es: los codepoints se escriben, no se
  pegan. Un comentario que explique el problema con los emojis dibujados hace
  fallar al propio paso que lo cuida. Ya pasó.
