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

## El icono y la portada del link

Las dos cosas las arma el mismo script, porque son lo mismo: cómo se ve el
juego desde afuera.

```bash
npm run icono                      # icono + portada
python scripts/icono.py --revision # además deja el maskable ya recortado al
                                   # círculo, en arte-fuente/_revision/
```

| sale de | queda en | para qué |
|---|---|---|
| `arte-fuente/icono.ico` (o .png) | `public/icono-192.png` | Android, `apple-touch-icon`, pestaña |
| ídem | `public/icono-512.png` | splash de instalación |
| ídem | `public/icono-maskable.png` | Android lo recorta a círculo o squircle |
| `arte-fuente/portada.*` | `public/portada.jpg` | la vista previa del link |

**Si no hay `arte-fuente/icono.*`, el icono se arma con la cara de Kath
recortada de su propia hoja de sprites.** Para volver a esa versión alcanza con
sacar el icono de `arte-fuente/` y correr el script de nuevo.

El maskable se decide solo: si la imagen fuente llega a los cuatro bordes va a
pantalla completa (lo que Android recorta de las esquinas es fondo), y si tiene
transparencia alrededor se achica y se apoya sobre un fondo rosa, porque si no
el recorte se le come el pelo. Por eso conviene mirar la imagen de revisión y
no el PNG suelto.

### La portada del link

Es lo que se ve al mandar la dirección por WhatsApp. Los `og:` de `index.html`
la declaran, y ahí hay una trampa: **esas URLs van absolutas**, no relativas.
El resto del sitio usa rutas relativas para poder servirse desde cualquier
carpeta, pero el que arma la vista previa no es el navegador — es un robot que
lee el HTML suelto y no tiene contra qué resolver un `./portada.jpg`. Con ruta
relativa, la mayoría de los clientes no muestran imagen. **Si cambia el
dominio, hay que cambiarlas a mano en `index.html`.**

1200x630 tampoco es capricho: es lo que esperan WhatsApp, Instagram y Twitter,
y lo que dicen los meta `og:image:width` / `height`. Si no coinciden, algunos
clientes recortan por su cuenta.

Y WhatsApp **cachea la vista previa por dominio y por bastante tiempo**. Si
cambiás la portada después de haber mandado el link, el que ya lo recibió sigue
viendo la vieja. Para forzarla hay que cambiarle el nombre al archivo (y el
`og:image`), no sólo el contenido.

### Dos cosas que muerden al deployar sólo un icono

- **Cambiar sólo el icono no invalida la caché.** La versión del service worker
  sale del hash de los nombres en `dist/assets/`, y lo de `public/` se copia sin
  hash. Si no cambió nada más, la versión es la misma y la caché vieja no se
  borra: el icono nuevo aparece recién en la segunda carga.
- **Si ya lo instaló en el teléfono, el icono del launcher no se actualiza.**
  Android y iOS lo copian al instalar. Hay que sacarlo de la pantalla de inicio
  y volver a agregarlo.

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
