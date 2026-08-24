# Rutina Legendaria

RPG diario de una sola jugadora (Kath), hecho por Diego. Cada mueble de la casa
es una misión del día → XP + monedas → premios reales que cumple Diego.
Web app instalable. Vite + React 19 + canvas. Sin backend salvo un Worker de
Cloudflare que guarda la partida.

---

## 1. Comunicación — REGLA FIJA

**Caveman ultra, siempre, sin que lo pidan.** Skill `caveman`, nivel ultra.
Abreviar, sin artículos ni relleno, flechas para causalidad (X → Y), fragmentos
OK. Sustancia técnica intacta. Errores citados exactos. Código sin tocar.
Se apaga sólo con "stop caveman" / "normal mode".

Excepción (auto-clarity): prosa normal para avisos de seguridad, confirmación de
algo irreversible, y secuencias de pasos donde el orden se puede malinterpretar.

Idioma: español rioplatense (vos). Comentarios de código también.

## 2. Dónde va cada cosa que escribo

| Qué | Dónde | Nunca |
|---|---|---|
| Deuda técnica / limitación conocida | `docs/deuda-tecnica.md` | contarla en el chat |
| Idea de feature nuevo | `docs/ideas.md` | contarla en el chat |
| Tarea repetitiva | script en el repo | pedírsela a Diego cada vez |

## 3. Docs — leer bajo demanda, no de entrada

`docs/INDICE.md` es una tabla de ruteo (síntoma → archivo). Es lo único que se
lee para orientarse. Los demás docs se abren **sólo** cuando el trabajo los
toca. No leer `docs/` entero por las dudas.

## 4. Comandos

```bash
npm test          # lint + smoke worker + smoke juego. Correr SIEMPRE antes de cerrar.
npm run dev       # localhost:5173
npm run build     # dist/ (avisa si el deploy le prende el cartelito a Kath)
npm run sprites   # rehace hojas desde arte-fuente/ (python + pillow numpy)
```

`npm run smoke` levanta el juego con DOM simulado, corre ~137 pasos y dibuja
todos los componentes. Es la única red de seguridad: **feature nueva → paso
nuevo en `smoke.mjs`**.

## 5. Mapa del código

```
src/config/    datos editables: misiones, premios, cartas, mapa, pomodoro, flags
src/engine/    motor.js (render+colisión+cámara), objetos.js (arte por código),
               tiles, sprites, disfraces, sonido, input
src/state/     gameLogic.js (EST + reglas), persistencia, sync, fusion, ui, dialogo
src/game/      juego.js — acciones de objetos, teclado, arranque
src/components/ React. Sólo dibuja; no decide nada del juego
worker/        Cloudflare Worker + D1. Guardado en la nube
scripts/       sprites.py (preprocesador de hojas), icono.py
smoke.mjs      la suite entera
legacy/        versión original de un solo archivo. Referencia, no se toca
```

**Capas:** `config` → `engine`/`state` → `game` → `components`. El motor no
importa `state/gameLogic`; recibe lo que necesita por `motor.conectar()`
(evita ciclo). React nunca es dueño del estado del juego: EST vive fuera y los
componentes se enganchan con `useSyncExternalStore`.

## 6. Invariantes que se rompen en silencio

Estas no explotan: se ven bien y andan mal. Verificar antes de dar algo por hecho.

- **Objeto del mapa que tapa una puerta** → cuarto sin salida. Lo cuida el smoke.
- **Emoji del bloque U+1FA70–U+1FAFF** → cuadrado en Windows 10. Lo cuida el
  smoke. Los codepoints se escriben, no se pegan.
- **Cambiar el formato de `EST`** → migración en `MIGRACIONES` + subir
  `V_ACTUAL` + regla en `fusion.js`. Sin las tres, la nube come progreso.
- **Sprite nuevo de Kath** → la cabeza tiene que caer en la misma fila que las
  otras hojas, o los disfraces quedan flotando.
- **`npm run build` antes de deployar.** Sin eso se publica `dist/` viejo.

## 7. Git y publicar

Commitear **sólo** con el skill `/commit` (decide si el cambio le prende a Kath
el cartelito de "hay algo nuevo" vía trailer `Novedad: si`). Nunca `push` salvo
pedido explícito.

Para publicar existe el agente **`publicar`**: corre `npm test`, pushea,
buildea y deploya a Pages (y el Worker si hace falta). Para en seco si el árbol
está sucio o las pruebas están en rojo, y nunca commitea. Deploy es manual con
wrangler y no depende de GitHub.
