# Deuda técnica

Estado: publicado, con guardado en la nube (2026-08-16).
Verificado con `npm run test`: lint 0 errores, `smoke:worker` 12 pasos verdes,
`smoke` 72 pasos verdes.

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

**Severidad: baja.**

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

## 4e. La hoja del baile es un derivado que no se puede rehacer

**Severidad: baja.**

`src/assets/Kath_baile_1.png` es el original que salió del generador: 1792 x 2390
y 5,4 MB, con fondo gris y colores sucios (1529 colores distintos donde la hoja
de caminar usa 28). Lo que usa el juego es `src/assets/kath_baile.png` (96 x 128,
5,4 kB), que salió de reducir el original a su grilla nativa, sacarle el fondo y
pegarle la paleta de la hoja de caminar.

Dos cosas quedaron flojas:

- El script que hizo esa conversión fue de una sola vez y no está en el repo. Si
  mañana llega `Kath_baile_2.png` hay que volver a escribirlo.
- El original de 5,4 MB vive en `src/assets/` sin que nadie lo importe. No entra
  a la build (Rollup sólo emite lo importado, se verificó: el `dist` lleva los
  5,38 kB de la hoja chica y nada más), pero pesa en el repo y confunde: parece
  un asset del juego y es material de trabajo.

**Arreglo:** un `scripts/hoja-sprites.mjs` que haga la conversión, y mover los
originales a una carpeta fuera de `src/` (o dejarlos fuera del repo).

---

## 5. No hay verificación real de navegador

**Severidad: media.**

`npm run smoke` levanta el juego con un DOM simulado y dibuja los 14 componentes con `renderToStaticMarkup`. Detecta que nada explota — no detecta que se vea bien.

Todo lo visual se verificó a mano hasta ahora. Eso no escala: los dos bugs de la etapa 2 (`hechoHoy` y `EST` en `sonido.js`) se detectaron con herramientas, pero un sprite corrido o un panel desalineado sigue siendo invisible.

**Arreglo:** Playwright con capturas contra el `legacy/index.html` como referencia.

---

## Resuelto

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
- **Emojis rotos en Windows** (2026-08-15). 🪙 `U+1FA99`, 🪥 `U+1FAA5` y 🪧 `U+1FAA7` son Emoji 12-14 y `seguiemj.ttf` de Windows 10 no los tiene. Reemplazados por 💰 🦷 🏠, verificados contra la tabla de caracteres de la fuente. Preexistente al refactor.
