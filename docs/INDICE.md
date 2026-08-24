# Índice — tabla de ruteo

Único doc que se lee para orientarse. Los demás se abren **sólo** cuando la
tarea los toca. Leer `docs/` entero por las dudas es gastar contexto al pedo.

| Voy a tocar / me pasó | Abrir |
|---|---|
| Motor, render, cámara, colisión, orden de dibujo, bucle | `arquitectura.md` |
| Agregar/mover un objeto del mapa, un cuarto, un personaje | `mundo.md` |
| Una mecánica: misiones, premios, disfraces, compa, pomodoro, sentarse, luz | `mundo.md` |
| `EST`, guardar, migrar el formato, nube, fusión de dos dispositivos | `estado.md` |
| Hoja de sprites nueva o rota, `npm run sprites` | `sprites.md` |
| Pedirle arte al generador de imágenes | `prompt-generador.md` |
| Publicar (lo hace el agente `publicar`) | `publicar.md` |
| Cartelito "hay algo nuevo", icono, portada del link | `publicar.md` |
| "¿esto ya se sabe que está flojo?" antes de arreglar algo | `deuda-tecnica.md` |
| Anotar deuda nueva | `deuda-tecnica.md` |
| Anotar / buscar una idea de feature | `ideas.md` |
| Worker, D1, CORS, límites del plan gratis | `../worker/README.md` |

## Estado del proyecto

Publicado y en uso. `npm test` verde: lint 0 errores, 12 pasos worker,
129 pasos smoke.

Lo que existe hoy, en una línea cada uno — el detalle está en `mundo.md`:

9 misiones diarias · racha (5 misiones/día, el día arranca 4 AM) · niveles y XP ·
monedas y 6 premios canjeables con doble check · misiones secundarias que Kath le
cuenta a Diego · compañero que nace de un huevo y evoluciona en 3 etapas ·
5 disfraces que aparecen caminando por el césped · Merlí paseando sola ·
Diego en el jardín · pomodoro en la compu · sentarse (silla y sillones) ·
ciclo día/noche por hora real · baile · guardado local + nube + archivo.
