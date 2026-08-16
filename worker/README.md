# Guardado en la nube

Worker de Cloudflare + base D1 que guarda las partidas para que Kath pueda jugar
en el teléfono y en la tablet sin perder nada.

**Worker:** https://rutina-legendaria.cayun-diego-09.workers.dev
**Base D1:** `rutina-legendaria` · id `5ce66987-612b-48b5-acc0-f8225c8ab186`
**Juego:** https://rutina-legendaria.pages.dev (Cloudflare Pages, proyecto `rutina-legendaria`)

Para actualizarlo después de tocar `src/index.js`, desde esta carpeta:
`npx wrangler deploy`.

Para republicar el juego, desde la raíz del repo:

```bash
npm run build
npx wrangler pages deploy dist --project-name rutina-legendaria --branch main
```

El servidor no sabe nada del juego: guarda un JSON contra un código y resuelve
quién escribió primero. Toda la lógica de fusión está en el cliente
(`src/state/fusion.js`), así que cambiar misiones o premios **no** obliga a
volver a desplegar esto.

## Levantarlo

Desde esta carpeta (`worker/`):

```bash
npm install -g wrangler        # o usar npx delante de cada comando
wrangler login                 # abre el navegador, plan gratis, sin tarjeta

# 1. Crear la base. Imprime un database_id.
wrangler d1 create rutina-legendaria

# 2. Pegar ese id en wrangler.toml, en database_id.

# 3. Crear las tablas.
wrangler d1 execute rutina-legendaria --remote --file=schema.sql

# 4. Publicar. Imprime la URL, algo como
#    https://rutina-legendaria.TU-USUARIO.workers.dev
wrangler deploy
```

Después, en el juego: poner esa URL en `nube` dentro de
[`src/config/config.js`](../src/config/config.js), o exportar
`VITE_NUBE_URL=https://...workers.dev` antes de `npm run build`.

Con `nube` vacío el juego funciona igual, sólo que sin sincronizar.

## CORS

Ya está cerrado. En `wrangler.toml`:

```toml
[vars]
ORIGENES = "https://rutina-legendaria.pages.dev,http://localhost:5173"
```

Verificado: ese origen y localhost reciben `Access-Control-Allow-Origin`,
cualquier otro no recibe la cabecera y el navegador les corta el pedido. Al
cambiar la lista hay que volver a `wrangler deploy`.

Los deploys de vista previa de Pages quedan afuera a propósito: cada uno tiene
un dominio distinto (`<hash>.rutina-legendaria.pages.dev`) que no se puede
listar de antemano. Si hace falta probar la sincronización en una preview, se
agrega ese dominio a mano y se saca después.

## Probar que anda

```bash
curl https://rutina-legendaria.TU-USUARIO.workers.dev/salud
# {"ok":true}
```

## Costo

Todo entra en el plan gratis con tres órdenes de magnitud de margen:

| | Gratis | Lo que gasta el juego |
|---|---|---|
| Requests | 100.000/día | ~200/día |
| CPU por request | 10 ms | menos de 1 ms |
| Bases D1 | 10 | 1 |
| Tamaño de la base | 500 MB | unos kB |
| Almacenamiento total | 5 GB | unos kB |

Pasarse del límite gratis **no genera factura**: Cloudflare devuelve error 1027
hasta el otro día. Para que cobre hay que subir al plan pago a mano.

## Si algo sale mal

```bash
wrangler tail                                    # logs en vivo

# ver una partida
wrangler d1 execute rutina-legendaria --remote \
  --command "SELECT codigo, seq, datetime(actualizado_en/1000,'unixepoch') FROM partidas"

# versiones archivadas de una partida
wrangler d1 execute rutina-legendaria --remote \
  --command "SELECT seq, datetime(archivado_en/1000,'unixepoch') FROM partidas_historial WHERE codigo='XXXX' ORDER BY archivado_en DESC"
```

Cada PUT archiva la versión anterior (se guardan las últimas 20). Además D1
tiene Time Travel: `wrangler d1 time-travel restore` vuelve la base entera hasta
7 días atrás en el plan gratis.

## Seguridad

El código de partida es la llave: 20 caracteres de un alfabeto de 31, ~99 bits.
No se puede adivinar ni enumerar, pero **quien lo tenga puede leer y escribir esa
partida**. No compartirlo. Se ve en Ajustes → Nube, dentro del juego.
