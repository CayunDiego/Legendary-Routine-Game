/* Prueba el Worker sin Cloudflare: D1 falso en memoria y Requests de verdad.
   Lo que interesa verificar acá es el compare-and-swap, que es lo único con
   lógica del lado del servidor y lo único que, si está mal, hace perder un día
   de progreso sin que se note.

   Correr con:  node worker/test.mjs   */

import trabajador from './src/index.js';
import { baseFalsa } from './basefalsa.mjs';

/* --- utilidades ------------------------------------------------------------ */
const CODIGO = 'ABCDEFGHJKMNPQRSTUVW';           // 20 chars del alfabeto válido
const RAIZ = 'https://juego.test';
const ORIGEN = 'https://cayundiego.github.io';

const fallos = [];
async function paso(nombre, fn) {
  try { await fn(); console.log(`  ok   ${nombre}`); }
  catch (e) { fallos.push([nombre, e]); console.log(`  FALLA ${nombre}  -> ${e.message}`); }
}

const igual = (a, b, q) => { if (a !== b) throw new Error(`${q}: esperaba ${b}, hubo ${a}`); };

const pedir = (env, metodo, ruta, { cuerpo, baseSeq, origen } = {}) => {
  const h = { Origin: origen || ORIGEN };
  if (cuerpo !== undefined) h['Content-Type'] = 'application/json';
  if (baseSeq !== undefined) h['X-Base-Seq'] = String(baseSeq);
  return trabajador.fetch(new Request(RAIZ + ruta, {
    method: metodo, headers: h,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  }), env);
};

const partida = (seq, extra) => ({ v: 2, nivel: 3, xp: 10, hoy: {}, seq, ...extra });

/* --- pruebas ---------------------------------------------------------------- */
console.log('\nWorker de guardado en la nube\n');

await paso('salud', async () => {
  const r = await pedir(baseFalsa(), 'GET', '/salud');
  igual(r.status, 200, 'status');
});

await paso('partida que no existe da 404', async () => {
  const r = await pedir(baseFalsa(), 'GET', `/partida/${CODIGO}`);
  igual(r.status, 404, 'status');
});

await paso('codigo con forma invalida da 400', async () => {
  igual((await pedir(baseFalsa(), 'GET', '/partida/corto')).status, 400, 'corto');
  igual((await pedir(baseFalsa(), 'GET', '/partida/AAAAAAAAAAAAAAAAAAA0')).status, 400, 'con un cero');
});

await paso('primer guardado y lectura', async () => {
  const env = baseFalsa();
  const r = await pedir(env, 'PUT', `/partida/${CODIGO}`, { cuerpo: { estado: partida(1) }, baseSeq: -1 });
  igual(r.status, 200, 'status del PUT');

  const g = await pedir(env, 'GET', `/partida/${CODIGO}`);
  igual(g.status, 200, 'status del GET');
  const datos = await g.json();
  igual(datos.seq, 1, 'seq');
  igual(datos.estado.nivel, 3, 'nivel');
});

await paso('escribir sobre una version vieja da 409 y devuelve la buena', async () => {
  const env = baseFalsa();
  await pedir(env, 'PUT', `/partida/${CODIGO}`, { cuerpo: { estado: partida(1) }, baseSeq: -1 });
  await pedir(env, 'PUT', `/partida/${CODIGO}`, { cuerpo: { estado: partida(2, { nivel: 9 }) }, baseSeq: 1 });

  // Un tercer dispositivo que todavía cree estar en la seq 1.
  const r = await pedir(env, 'PUT', `/partida/${CODIGO}`, { cuerpo: { estado: partida(2, { nivel: 4 }) }, baseSeq: 1 });
  igual(r.status, 409, 'status');
  const datos = await r.json();
  igual(datos.seq, 2, 'seq devuelta');
  igual(datos.estado.nivel, 9, 'devuelve el estado guardado para poder fusionar');

  // Y lo importante: el 409 no escribió nada.
  const g = await (await pedir(env, 'GET', `/partida/${CODIGO}`)).json();
  igual(g.estado.nivel, 9, 'la partida buena quedo intacta');
});

await paso('reintento con la base correcta entra', async () => {
  const env = baseFalsa();
  await pedir(env, 'PUT', `/partida/${CODIGO}`, { cuerpo: { estado: partida(1) }, baseSeq: -1 });
  const r = await pedir(env, 'PUT', `/partida/${CODIGO}`, { cuerpo: { estado: partida(2, { nivel: 7 }) }, baseSeq: 1 });
  igual(r.status, 200, 'status');
  const g = await (await pedir(env, 'GET', `/partida/${CODIGO}`)).json();
  igual(g.estado.nivel, 7, 'nivel');
});

await paso('cada version anterior queda archivada', async () => {
  const env = baseFalsa();
  await pedir(env, 'PUT', `/partida/${CODIGO}`, { cuerpo: { estado: partida(1) }, baseSeq: -1 });
  await pedir(env, 'PUT', `/partida/${CODIGO}`, { cuerpo: { estado: partida(2) }, baseSeq: 1 });
  await pedir(env, 'PUT', `/partida/${CODIGO}`, { cuerpo: { estado: partida(3) }, baseSeq: 2 });
  igual(env._historial().length, 2, 'versiones archivadas');
});

await paso('el historial se poda a las ultimas 20', async () => {
  const env = baseFalsa();
  await pedir(env, 'PUT', `/partida/${CODIGO}`, { cuerpo: { estado: partida(0) }, baseSeq: -1 });
  for (let i = 1; i <= 30; i++) {
    await pedir(env, 'PUT', `/partida/${CODIGO}`, { cuerpo: { estado: partida(i) }, baseSeq: i - 1 });
  }
  if (env._historial().length > 20) throw new Error('quedaron ' + env._historial().length);
});

await paso('un cuerpo que no es partida se rechaza', async () => {
  const env = baseFalsa();
  igual((await pedir(env, 'PUT', `/partida/${CODIGO}`, { cuerpo: { estado: { hola: 1 } }, baseSeq: -1 })).status, 400, 'sin nivel');
  igual((await pedir(env, 'PUT', `/partida/${CODIGO}`, { cuerpo: { nada: true }, baseSeq: -1 })).status, 400, 'sin estado');
  igual(env._partidas.size, 0, 'no guardo nada');
});

await paso('CORS: deja pasar al origen de la lista y bloquea al resto', async () => {
  const env = { ...baseFalsa(), ORIGENES: ORIGEN };
  const bueno = await pedir(env, 'GET', '/salud', { origen: ORIGEN });
  igual(bueno.headers.get('Access-Control-Allow-Origin'), ORIGEN, 'origen permitido');

  const malo = await pedir(env, 'GET', '/salud', { origen: 'https://otra-cosa.com' });
  igual(malo.headers.get('Access-Control-Allow-Origin'), null, 'origen ajeno sin cabecera');
});

await paso('preflight OPTIONS contesta 204', async () => {
  const r = await pedir(baseFalsa(), 'OPTIONS', `/partida/${CODIGO}`);
  igual(r.status, 204, 'status');
  if (!r.headers.get('Access-Control-Allow-Headers').includes('X-Base-Seq')) {
    throw new Error('falta X-Base-Seq en los headers permitidos');
  }
});

await paso('ruta desconocida da 404', async () => {
  igual((await pedir(baseFalsa(), 'GET', '/otra')).status, 404, 'status');
});

if (fallos.length) {
  console.log(`\n=== ${fallos.length} FALLA(S) ===`);
  for (const [n, e] of fallos) console.log(`\n--- ${n} ---\n${e.stack}`);
} else {
  console.log('\nTodo verde.');
}
process.exit(fallos.length ? 1 : 0);
