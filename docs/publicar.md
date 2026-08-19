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

## El cartelito de "hay algo nuevo"

Al entrar al juego, Kath ve `✨ Hay algo nuevo` una sola vez cuando hay algo
nuevo de verdad. La regla es una sola:

> El cartelito **no** lo dispara el deploy. Lo dispara el último commit marcado
> como novedad para la jugadora.

Cómo funciona, de punta a punta:

1. Al commitear, el comando `/commit` (`.claude/skills/commit/SKILL.md`) mira
   qué cambió y decide si Kath puede ver o hacer algo que ayer no. Si sí, le
   pone al commit el trailer `Novedad: si`. Si es un fix, arte retocado de algo
   que ya existía, `perf`, docs o herramientas de desarrollo, no le pone nada.
2. En `npm run build`, `leerNovedad()` (en `vite.config.js`) busca el último
   commit con esa marca — `git log -1 --format='%h %s' -E --grep '^Novedad: si$'` —
   y lo inyecta como `CONFIG.version`.

   **La build te lo dice al final, y grita cuando el cartelito se prende**,
   porque es lo único que cambia según lo que hagas después:

   ```
     ────────────────────────────────────────────────────────────
      ✨  ESTE DEPLOY LE AVISA A KATH
         va a ver "✨ Hay algo nuevo" al entrar
         novedad a1b2c3d · moño de Hello Kitty para encontrar en el césped
     ────────────────────────────────────────────────────────────
   ```

   Cuando no hay nada nuevo es una línea gris y nada más:
   `novedades  cartelito apagado — ningún commit lleva la marca "Novedad: si"`.
3. En el juego, `EST.versionVista` guarda la última que Kath ya vio. Si no
   coincide, sale el cartelito y se guarda la nueva.

O sea: **deployar diez veces seguidas arreglando cosas no le avisa nada**. Sólo
avisa el deploy que trae, entre lo suyo, un commit marcado.

Para saber si el próximo deploy va a avisar, sin buildear:

```bash
git log -1 --format='%h %s' -E --grep '^Novedad: si$'
```

Si eso devuelve un SHA que Kath ya vio (o sea, ya deployaste desde ese commit),
no va a salir nada. Es lo esperado.

Dos avisos:

- **Squash-merge cambia el SHA** del commit marcado, así que una novedad ya
  vista vuelve a avisar. Deployando desde `main` como hasta ahora, no pasa.
- Si `git` no está disponible en la máquina que buildea, la versión cae en
  `sin-novedades` y el cartelito queda apagado. La build no se corta a propósito:
  quedarse sin aviso es molesto, no poder publicar es peor.

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
