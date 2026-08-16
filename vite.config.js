import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
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

// base relativa: el juego se sirve igual desde la raíz o desde un subdirectorio
// (GitHub Pages, carpeta compartida, etc.), tal como hacía el index.html original.
export default defineConfig({
  base: './',
  plugins: [react(), swConAssets()],
  server: {
    host: true,   // para abrirlo desde el teléfono en la misma red
  },
});
