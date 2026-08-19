---
name: commit
description: "Arma el commit de lo que hay en el working tree de Rutina Legendaria y decide solo si es una novedad para Kath (marca `Novedad: si`, que dispara el cartelito de '✨ Hay algo nuevo') o no. Commitea nada más — nunca hace push."
---

# /commit

Arma **un** commit con lo que está sin commitear y resuelve la única decisión
que el build no puede tomar solo: **¿esto es algo nuevo que Kath va a ver en el
juego, o es mantenimiento?**

Nunca hace `push`. Nunca hace `--amend` de un commit ya pusheado.

## Por qué existe

El cartelito de "✨ Hay algo nuevo" ([src/game/juego.js](../../../src/game/juego.js))
se dispara cuando `EST.versionVista !== CONFIG.version`. Esa versión **no** es la
de la build: es el SHA corto del último commit marcado como novedad, que calcula
`leerNovedad()` en [vite.config.js](../../../vite.config.js) con

```
git log -1 --format='%h %s' -E --grep '^Novedad: si$'
```

O sea: un deploy de puros fixes, imágenes retocadas o refactors **no mueve la
versión y no avisa nada**. La marca la pone este comando al commitear, así no
depende de que nadie se acuerde en el momento del deploy.

## Pasos

1. `git status --short` y `git diff` (más `git diff --staged` si ya hay algo en
   el index) para ver qué cambió de verdad. Si no hay nada, decilo y terminá.
2. `git log --oneline -10` para copiar el estilo de los mensajes del repo.
3. Clasificar (ver abajo).
4. `git add -A` y commitear con el mensaje armado.
5. Reportar en una línea: el SHA, y **si ese commit va a mostrar el cartelito o
   no**. Si lo muestra, aclarar que recién lo ve al deployar.

## Clasificar

Tipo del commit, convención del repo: `feat` / `fix` / `perf` / `refactor` /
`docs` / `chore`. Mensaje en castellano, en minúscula, sin punto final,
describiendo el efecto y no los archivos tocados.

Después, la pregunta que importa, y que se contesta **poniéndose en el lugar de
Kath, no en el del programador**:

> ¿Hay algo en el juego que Kath puede ver o hacer hoy y ayer no?

**Sí → trailer `Novedad: si`.** Ejemplos: un disfraz nuevo para encontrar, un
personaje nuevo, una pantalla o pestaña nueva, una mecánica nueva, un premio o
una misión nueva, un modo nuevo.

**No → sin trailer.** Y acá va la parte que se equivoca sola si no se piensa:

- Un `fix`, por más que se note. Que algo ande bien no es algo nuevo.
- Arte retocado de algo que ya existía. Redibujar las orejas de Shrek **no** es
  una novedad: las orejas ya estaban.
- `perf`, refactors, tests, lint, deuda técnica.
- Docs, notas, `docs/ideas.md`, este archivo.
- Herramientas de desarrollo. `feat: preprocesador que mide las hojas de
  sprites` es un `feat` de verdad, pero Kath no ve nada: **sin marca**.
- Features detrás de un flag apagado. Todavía no existe para ella.
- Cambios de infraestructura: Worker, service worker, build, deploy.

Ante la duda, **no** marcar. Un cartelito de más le enseña a Kath a ignorarlo;
uno de menos no rompe nada y se recupera en la próxima novedad.

Si el working tree mezcla una novedad con mantenimiento, se marca: el commit
igual trae algo nuevo. Si son dos cosas grandes e independientes, mejor dos
commits, y sólo el que corresponde lleva la marca.

## Formato del mensaje

```
feat: moño de Hello Kitty para encontrar en el césped

Cuarto disfraz. Va en la capa `adelante` y espejado en dos direcciones,
porque siempre cae del lado izquierdo de Kath.

Novedad: si
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

`Novedad: si` va en el bloque de trailers, en su propia línea, exactamente así
(minúscula, sin tilde) — el `--grep` del build lo busca anclado. Cuando no es
novedad, la línea simplemente no está: no existe `Novedad: no`.
