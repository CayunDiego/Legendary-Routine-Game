# Deuda técnica

Estado: post-migración a React + Vite (2026-08-15).
Verificado con `npm run lint` (0 errores) y `npm run smoke` (41 pasos verdes).

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

## 5. No hay verificación real de navegador

**Severidad: media.**

`npm run smoke` levanta el juego con un DOM simulado y dibuja los 14 componentes con `renderToStaticMarkup`. Detecta que nada explota — no detecta que se vea bien.

Todo lo visual se verificó a mano hasta ahora. Eso no escala: los dos bugs de la etapa 2 (`hechoHoy` y `EST` en `sonido.js`) se detectaron con herramientas, pero un sprite corrido o un panel desalineado sigue siendo invisible.

**Arreglo:** Playwright con capturas contra el `legacy/index.html` como referencia.

---

## Resuelto

- **El service worker no dejaba actualizar el juego** (2026-08-15). Servía todo cache-first sin revalidar, así que quien tuviera el juego instalado se quedaba con la versión vieja para siempre. Ahora `public/sw.js` usa tres estrategias: red-primero para la navegación (el `index.html` decide qué assets cargar), caché-primero para `assets/` (el hash los hace inmutables) y caché-revalidando para el resto. El plugin `swConAssets` de `vite.config.js` inyecta en la build la lista real de assets con hash y una versión derivada de esos nombres; si no puede inyectar, corta la build. Verificado: cambio real de código → hash nuevo → versión nueva; republicar sin cambios → misma versión, sin invalidar la caché de nadie.

- **`empezar()` peleaba con `TituloScreen`** (2026-08-15). Hacía `$('titulo').classList.add('oculto')` y `style.display='none'` a mano, cosas que el componente ya maneja mirando el modo. El `display:none` imperativo era lo peor: React no lo conoce y no lo puede limpiar.
- **`hooks/useDialogo.js` estaba muerto** (2026-08-15). Se creó para cumplir el plan y `Dialogo.jsx` no lo usaba — hablaba con el store directo. Ahora sí lo usa.
- **Emojis rotos en Windows** (2026-08-15). 🪙 `U+1FA99`, 🪥 `U+1FAA5` y 🪧 `U+1FAA7` son Emoji 12-14 y `seguiemj.ttf` de Windows 10 no los tiene. Reemplazados por 💰 🦷 🏠, verificados contra la tabla de caracteres de la fuente. Preexistente al refactor.
