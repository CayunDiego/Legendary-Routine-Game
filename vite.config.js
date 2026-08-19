import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/* ---------------------------------------------------------------------------
 *  Inyecta en dist/sw.js la lista real de assets con hash y una versión de
 *  caché derivada de esos nombres.
 *
 *  Por qué la versión sale de los nombres: los assets llevan hash de contenido,
 *  así que si el juego no cambió los nombres son idénticos y la versión también.
 *  Publicar dos veces seguidas sin tocar nada no invalida la caché de nadie.
 *
 *  Si los marcadores no aparecen, tira error y corta la build. Un sw publicado
 *  sin precache es exactamente el bug que esto viene a arreglar, y falla en
 *  silencio si no lo chequeamos acá.
 * ------------------------------------------------------------------------- */
function swConAssets() {
  return {
    name: 'sw-con-assets',
    apply: 'build',
    closeBundle() {
      const dist = 'dist';
      const rutaSw = join(dist, 'sw.js');

      let sw;
      try {
        sw = readFileSync(rutaSw, 'utf8');
      } catch {
        throw new Error('[sw-con-assets] no existe dist/sw.js — ¿se movió public/sw.js?');
      }

      const assets = readdirSync(join(dist, 'assets'))
        .sort()
        .map((f) => `./assets/${f}`);

      if (assets.length === 0) {
        throw new Error('[sw-con-assets] dist/assets/ está vacío');
      }

      const version = createHash('sha256').update(assets.join('|')).digest('hex').slice(0, 8);

      /* Cada reemplazo se verifica por separado y contra el valor esperado.
         Chequear sólo "cambió algo" no alcanza: si un marcador desaparece, ese
         reemplazo falla en silencio mientras el otro funciona, y publicaríamos
         un sw a medio armar. */
      const inyectar = (texto, patron, reemplazo, esperado, nombre) => {
        const salida = texto.replace(patron, reemplazo);
        if (!salida.includes(esperado)) {
          throw new Error(
            `[sw-con-assets] no se pudo inyectar ${nombre} en public/sw.js. ` +
            `¿Se tocó la línea "const ${nombre} = ..." o su marcador /* swConAssets: ${nombre} */?`
          );
        }
        return salida;
      };

      const lineaVersion = `const VERSION = '${version}';`;
      const lineaAssets = `const ASSETS = ${JSON.stringify(assets)};`;

      sw = inyectar(sw, /const VERSION = '[^']*';[^\n]*/, lineaVersion, lineaVersion, 'VERSION');
      sw = inyectar(sw, /const ASSETS = \[[^\]]*\];[^\n]*/, lineaAssets, lineaAssets, 'ASSETS');

      if (sw.includes('swConAssets:')) {
        throw new Error('[sw-con-assets] quedaron marcadores sin reemplazar en dist/sw.js');
      }

      writeFileSync(rutaSw, sw);
      console.log(`\n  sw.js  version ${version}  ·  ${assets.length} assets precacheados`);
      for (const a of assets) console.log(`         ${a}`);
    },
  };
}

/* ---------------------------------------------------------------------------
 *  Versión de NOVEDADES: la que decide si Kath ve el cartelito de "✨ Hay algo
 *  nuevo" al entrar al juego (src/game/juego.js compara contra EST.versionVista).
 *
 *  No es la versión de la build ni la del package.json, y esa es toda la gracia:
 *  es el SHA corto del último commit marcado como novedad para la jugadora, o
 *  sea el que lleva el trailer `Novedad: si` en el cuerpo. Un deploy de puros
 *  fixes, arte retocado, refactors o docs no mueve ese SHA, así que no la
 *  molesta con un aviso por algo que ella no puede ver.
 *
 *  Quién pone la marca: el comando /commit (.claude/skills/commit/SKILL.md),
 *  que clasifica el cambio al commitear. Nadie tiene que acordarse en el deploy.
 *
 *  Ojo con el squash-merge: cambia el SHA del commit marcado, así que un
 *  feature ya visto vuelve a avisar. Deployando desde main como hasta ahora, no
 *  pasa.
 *
 *  Si git no está (build desde un zip, CI sin historial) cae en un valor fijo y
 *  sigue de largo. Quedarse sin cartelito es molesto; no poder publicar el
 *  juego es peor.
 * ------------------------------------------------------------------------- */
const SIN_NOVEDADES = 'sin-novedades';

/* Se calcula una sola vez, al cargar la config, porque `define` lo necesita
   antes de compilar nada. El aviso en pantalla NO se imprime acá: a esta altura
   todavía faltan cien líneas de build y el mensaje que importa queda sepultado.
   Se guarda y lo imprime avisoNovedades() al final. */
const NOVEDAD = leerNovedad();

function leerNovedad() {
  let linea = '';
  try {
    linea = execFileSync('git', ['log', '-1', '--format=%h %s', '-E', '--grep', '^Novedad: si$'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return { version: SIN_NOVEDADES, motivo: 'git no está disponible en esta máquina' };
  }
  if (!linea) return { version: SIN_NOVEDADES, motivo: 'ningún commit lleva la marca "Novedad: si"' };

  const corte = linea.indexOf(' ');
  return { version: linea.slice(0, corte), asunto: linea.slice(corte + 1) };
}

/* ---------------------------------------------------------------------------
 *  El aviso de si ESTE deploy le va a avisar algo a Kath.
 *
 *  Va aparte y al final a propósito. Es la única línea de toda la build que
 *  cambia según lo que haga después el que publica: si el cartelito se prende,
 *  Kath lo va a ver, y hay que enterarse ANTES de subir, no cuando ella
 *  pregunte. Por eso el caso "prendido" grita —bloque, color, el commit que lo
 *  causa— y el caso "apagado" es una línea gris que no le roba atención a nada.
 *
 *  El bloque no tiene borde derecho: con emojis y tildes de por medio, alinear
 *  una columna a la derecha se rompe según la fuente de la terminal.
 * ------------------------------------------------------------------------- */
function avisoNovedades() {
  const color = process.stdout.isTTY;
  const c = (codigo, texto) => (color ? `\x1b[${codigo}m${texto}\x1b[0m` : texto);
  const regla = '─'.repeat(60);

  return {
    name: 'aviso-novedades',
    apply: 'build',
    closeBundle: {
      /* Después de sw-con-assets, para quedar como lo último que se lee. */
      sequential: true,
      order: 'post',
      handler() {
        if (NOVEDAD.version === SIN_NOVEDADES) {
          console.log(c(90, `\n  novedades  cartelito apagado — ${NOVEDAD.motivo}`));
          return;
        }
        console.log('');
        console.log(c(32, `  ${regla}`));
        console.log(c('1;32', '   ✨  ESTE DEPLOY LE AVISA A KATH'));
        console.log(`      ${c(90, 'va a ver')} "✨ Hay algo nuevo" ${c(90, 'al entrar')}`);
        console.log(`      ${c(90, 'novedad')} ${c(1, NOVEDAD.version)} ${c(90, '·')} ${NOVEDAD.asunto}`);
        console.log(c(32, `  ${regla}`));
      },
    },
  };
}

// base relativa: el juego se sirve igual desde la raíz o desde un subdirectorio
// (GitHub Pages, carpeta compartida, etc.), tal como hacía el index.html original.
export default defineConfig({
  base: './',
  plugins: [react(), swConAssets(), avisoNovedades()],
  /* Se define acá y no como global suelta para que config.js la lea igual que
     VITE_NUBE_URL, sin sumar un identificador mágico que eslint no conoce. */
  define: {
    'import.meta.env.VITE_VERSION_NOVEDAD': JSON.stringify(NOVEDAD.version),
  },
  server: {
    host: true,   // para abrirlo desde el teléfono en la misma red
  },
});
