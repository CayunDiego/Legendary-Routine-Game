# Publicar

Dos deploys independientes, manuales, con `wrangler`. **No dependen de GitHub**:
el juego queda publicado aunque el código no esté pusheado.

> A mano casi nunca hace falta: el agente **`publicar`**
> (`.claude/agents/publicar.md`) hace pruebas → push → build → deploy, en orden
> y con los frenos puestos. Este doc es el detalle de lo que hace y por qué,
> más las trampas del icono y la portada, que el agente no toca.

## El juego (casi siempre es sólo esto)

Desde la **raíz** del proyecto, no desde `worker/`:

```bash
npm run build
npx wrangler pages deploy dist --project-name rutina-legendaria --branch main
```

Queda en https://rutina-legendaria.pages.dev

Saltarse `npm run build` publica un `dist/` viejo sin avisar. Es el error más
común, junto con correr el deploy parado adentro de `worker/`
(`ENOENT: ...\worker\dist`).

## El Worker

Sólo si se tocó `worker/src/index.js` o `worker/wrangler.toml`:

```bash
cd worker && npx wrangler deploy
```

Si cambió el **formato de la partida**, subir el Worker primero: el juego viejo
le habla bien a un Worker nuevo, al revés no siempre.
Detalles (D1, CORS, límites del plan gratis, logs) → `../worker/README.md`.

## El cartelito "✨ Hay algo nuevo"

**No lo dispara el deploy. Lo dispara el último commit marcado como novedad.**

1. `/commit` decide si Kath puede ver o hacer algo que ayer no. Si sí, trailer
   `Novedad: si`. Fixes, arte retocado, perf, docs y herramientas no llevan marca.
2. `npm run build` → `leerNovedad()` en `vite.config.js` busca
   `git log -1 -E --grep '^Novedad: si$'` y lo inyecta como `CONFIG.version`.
   **La build lo dice al final y grita cuando el cartelito se prende.**
3. En el juego, `EST.versionVista` guarda la última vista. Distinta → cartelito.

Deployar diez veces arreglando cosas no le avisa nada.

Chequeo sin buildear: `git log -1 --format='%h %s' -E --grep '^Novedad: si$'`.
Si devuelve un SHA ya deployado, no va a salir nada — es lo esperado.

Dos avisos: squash-merge cambia el SHA y una novedad ya vista vuelve a avisar
(deployando desde `main` no pasa); y sin `git` en la máquina la versión cae en
`sin-novedades` y el cartelito queda apagado (la build no se corta a propósito).

## Icono y portada del link

```bash
npm run icono
python scripts/icono.py --revision   # deja el maskable ya recortado al círculo
```

| Sale de | Queda en | Para qué |
|---|---|---|
| `arte-fuente/icono.ico\|png` | `public/icono-192.png` | Android, apple-touch-icon, pestaña |
| ídem | `public/icono-512.png` | splash de instalación |
| ídem | `public/icono-maskable.png` | Android lo recorta a círculo |
| `arte-fuente/portada.*` | `public/portada.jpg` | vista previa del link |

Sin `arte-fuente/icono.*` el icono se arma con la cara de Kath recortada de su
hoja de sprites. El maskable se decide solo: si la fuente llega a los cuatro
bordes va a pantalla completa; si tiene transparencia alrededor se achica sobre
fondo rosa (si no, el recorte se come el pelo). Mirar la imagen de revisión.

### Trampas de la portada

- Los `og:` de `index.html` van con **URL absoluta**. El que arma la vista
  previa es un robot que lee el HTML suelto y no puede resolver `./portada.jpg`.
  **Si cambia el dominio hay que editarlas a mano.**
- 1200x630 no es capricho: es lo que esperan WhatsApp/Instagram/Twitter y lo que
  declaran los meta `og:image:width|height`.
- WhatsApp **cachea la vista previa por dominio** un buen rato. Para forzarla hay
  que cambiarle el **nombre** al archivo (y el `og:image`), no el contenido.

### Deployar sólo un icono

- No invalida la caché: la versión del service worker sale del hash de los
  nombres en `dist/assets/`, y `public/` se copia sin hash. El icono nuevo
  aparece recién en la segunda carga.
- Si ya está instalado en el teléfono, el icono del launcher **no se actualiza**:
  hay que sacarlo de la pantalla de inicio y volver a agregarlo.
