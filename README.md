# Rutina Legendaria

Un RPG diario hecho a mano para Kath. Cada cosa de la casa es una misión del
día: se ganan XP y monedas, las monedas se cambian por premios reales, y hay una
racha que se mantiene haciendo unas pocas misiones por día.

- **Juego:** https://rutina-legendaria.pages.dev
- **Guardado en la nube:** https://rutina-legendaria.cayun-diego-09.workers.dev

> La documentación está en [`docs/INDICE.md`](docs/INDICE.md) — una tabla de
> "voy a tocar esto → abrí este archivo". Está escrita densa, para que Claude
> Code se oriente sin leer el repo entero. `CLAUDE.md` es lo que lee en cada
> sesión.

## Trabajar en el proyecto

```bash
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
npm test         # lint + pruebas del Worker + smoke del juego
```

`npm test` corre las tres cosas en orden y es lo que conviene mirar antes de
publicar. Por separado:

| Comando | Qué hace |
|---|---|
| `npm run lint` | ESLint sobre `src/` y `worker/` |
| `npm run smoke` | Levanta el juego con un DOM simulado y recorre 132 pasos |
| `npm run smoke:worker` | Prueba el Worker contra un D1 falso, 12 pasos |
| `npm run build` | Build de producción a `dist/` |
| `npm run sprites` | Rehace las hojas de sprites desde `arte-fuente/` — ver [docs/sprites.md](docs/sprites.md) |

## Publicar

### El juego

```bash
npm run build
npx wrangler pages deploy dist --project-name rutina-legendaria --branch main
```

Va a Cloudflare Pages, proyecto `rutina-legendaria`. Queda en
https://rutina-legendaria.pages.dev

### El Worker (guardado en la nube)

Sólo hace falta si se tocó `worker/src/index.js` o `worker/wrangler.toml`:

```bash
cd worker
npx wrangler deploy
```

Los detalles (base D1, CORS, límites del plan gratis, cómo mirar los logs) están
en [worker/README.md](worker/README.md).

### Antes de publicar

Los dos se despliegan por separado y no dependen uno del otro, pero si cambió el
formato de la partida conviene subir el Worker primero: el juego viejo le habla
bien a un Worker nuevo, al revés no siempre.

## Cómo está armado

```
src/
  config/      lo que probablemente quieras cambiar: misiones, premios, cartas
  engine/      motor de render, canvas, sprites, sonido, entrada
  state/       estado del juego, guardado, fusión y sincronización
  components/  la interfaz en React
  game/        acciones de los objetos y arranque
worker/        el Worker de Cloudflare + D1 que guarda las partidas
arte-fuente/   las hojas de sprites como llegan del generador (material de trabajo)
scripts/       sprites.py, el preprocesador de esas hojas
legacy/        la versión original en un solo archivo, como referencia
docs/          documentación. Empezar por docs/INDICE.md (tabla de ruteo)
```

El estado del juego vive fuera de React (el motor lo lee en cada frame) y los
componentes se enganchan con `useSyncExternalStore`. La explicación larga está
en los comentarios de [src/state/GameContext.jsx](src/state/GameContext.jsx) y
[src/state/store.js](src/state/store.js).

## El guardado

Tres capas, de la más importante a la menos:

1. **Este dispositivo.** `localStorage`, con una copia de respaldo. Si la
   partida queda ilegible, el juego **deja de guardar** en vez de pisarla, y
   avisa en Ajustes. Ver [src/state/persistencia.js](src/state/persistencia.js).
2. **La nube.** Opcional: con `CONFIG.nube` vacío el juego anda igual, todo
   local. Los conflictos entre dos dispositivos no se resuelven por "gana el
   último": se fusionan de verdad, en
   [src/state/fusion.js](src/state/fusion.js).
3. **Archivo.** Ajustes → Copia de seguridad. Es lo único que sobrevive a perder
   los dos dispositivos.

Lo que falta y lo que se sabe que está flojo está anotado en
[docs/deuda-tecnica.md](docs/deuda-tecnica.md).
