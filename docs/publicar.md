# Cómo publicar

Dos deploys independientes. La mayoría de las veces sólo hace falta el
primero.

---

## El juego (Cloudflare Pages)

Esto es lo que hay que correr casi siempre — cada vez que se cambia algo
en `src/`.

```bash
cd "C:\Users\Diego\Documents\Juego Kath\juego"
npm run build
npx wrangler pages deploy dist --project-name rutina-legendaria --branch main
```

Las tres líneas en orden, desde la **raíz del proyecto** (no desde
`worker/`). `npm run build` regenera `dist/` con lo último — si se salta
ese paso, se publica una versión vieja sin avisar.

Cuando termina, queda en **https://rutina-legendaria.pages.dev**

---

## El Worker (guardado en la nube)

Sólo hace falta si se tocó `worker/src/index.js` o `worker/wrangler.toml`.
Si el cambio fue sólo en el juego (`src/`), no hay que tocar esto.

```bash
cd "C:\Users\Diego\Documents\Juego Kath\juego\worker"
npx wrangler deploy
```

Ojo con el orden si cambió el **formato de la partida**: conviene subir el
Worker primero. El juego viejo le habla bien a un Worker nuevo; al revés
no siempre. Los detalles (base D1, CORS, límites del plan gratis, cómo
mirar los logs) están en [`worker/README.md`](../worker/README.md).

---

## Errores comunes

- **`ENOENT: no such file or directory, scandir '...\worker\dist'`** — se
  corrió el deploy del juego estando parado adentro de `worker/`. Ese
  comando busca `dist/` en la carpeta donde se corre, y `dist/` sólo
  existe en la raíz del proyecto (la genera `npm run build`). Solución:
  `cd` de vuelta a la raíz antes de deployar.
- **El deploy salió bien pero el juego se ve igual que antes** — probablemente
  se saltó el `npm run build` antes del `wrangler pages deploy`, o el
  build era de antes de los últimos cambios. Repetir las tres líneas en
  orden.

---

## Esto no depende de GitHub

Publicar el juego (Cloudflare Pages) y publicar el Worker son deploys
manuales con `wrangler`, sin relación con `git push`. El juego queda
publicado igual aunque el código no se haya subido a GitHub todavía —
`git push` sólo importa si además se quiere tener el código respaldado
ahí.
