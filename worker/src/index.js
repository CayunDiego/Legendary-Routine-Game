/* ---------------------------------------------------------------------------
 *  Guardado de partidas en la nube — Cloudflare Worker + D1.
 *
 *  El servidor es a propósito lo más tonto posible: guarda un texto contra un
 *  código y no sabe nada de misiones, oro ni rachas. Toda la lógica de fusión
 *  vive en el cliente (src/state/fusion.js). Consecuencia práctica: cambiar las
 *  reglas del juego nunca obliga a redesplegar esto.
 *
 *  Lo único que sí hace el servidor es evitar que dos dispositivos se pisen.
 *  Cada PUT declara de qué versión partió en X-Base-Seq; si la guardada es
 *  otra, contesta 409 con la actual y el cliente vuelve a fusionar. Es un
 *  compare-and-swap común y es lo que hace que "el último que guarda gana"
 *  nunca ocurra.
 *
 *  Autenticación: el código de partida ES la llave. Son 20 caracteres de un
 *  alfabeto de 31, o sea ~99 bits de azar: no se adivina por fuerza bruta y no
 *  hay nada que enumerar porque no existe un listado. A cambio, quien tenga el
 *  código puede leer y escribir esa partida, así que no se comparte.
 *
 *  Rutas:
 *    GET  /partida/:codigo  -> 200 {estado, seq, actualizadoEn} | 404
 *    PUT  /partida/:codigo  -> 200 {seq, actualizadoEn} | 409 {estado, seq}
 *    GET  /salud            -> 200 ok
 * ------------------------------------------------------------------------- */

const ALFABETO = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{20}$/;
const MAX_CUERPO = 512 * 1024;     // 512 kB: una partida real ronda los 5 kB
const VERSIONES_GUARDADAS = 20;    // historial por partida, además de Time Travel

/* --- CORS ------------------------------------------------------------------ */
/* La lista de orígenes sale de una variable de entorno para no tener que tocar
   el código al cambiar de dominio. Vacía = cualquiera, cómodo para probar. */
function origenPermitido(req, env) {
  const origen = req.headers.get('Origin');
  if (!origen) return null;
  const lista = (env.ORIGENES || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (lista.length === 0) return origen;
  return lista.includes(origen) ? origen : null;
}

function cabecerasCors(req, env) {
  const origen = origenPermitido(req, env);
  const h = {
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Base-Seq',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origen) h['Access-Control-Allow-Origin'] = origen;
  return h;
}

function json(datos, req, env, status = 200) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...cabecerasCors(req, env),
    },
  });
}

/* --- rutas ------------------------------------------------------------------ */
async function obtener(codigo, req, env) {
  const fila = await env.DB
    .prepare('SELECT estado, seq, actualizado_en FROM partidas WHERE codigo = ?')
    .bind(codigo)
    .first();

  if (!fila) return json({ error: 'sin partida' }, req, env, 404);

  return json({
    estado: JSON.parse(fila.estado),
    seq: fila.seq,
    actualizadoEn: fila.actualizado_en,
  }, req, env);
}

async function guardar(codigo, req, env) {
  const largo = Number(req.headers.get('Content-Length') || 0);
  if (largo > MAX_CUERPO) return json({ error: 'la partida es demasiado grande' }, req, env, 413);

  let cuerpo;
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: 'cuerpo ilegible' }, req, env, 400);
  }

  const estado = cuerpo && cuerpo.estado;
  // La misma validación mínima que hace el cliente: distinguir una partida de
  // basura, sin meterse con las reglas del juego.
  if (!estado || typeof estado !== 'object' || typeof estado.nivel !== 'number') {
    return json({ error: 'eso no es una partida' }, req, env, 400);
  }

  const baseSeq = Number(req.headers.get('X-Base-Seq'));
  const seq = Number(estado.seq) || 0;
  const ahora = Date.now();
  const texto = JSON.stringify(estado);

  const actual = await env.DB
    .prepare('SELECT estado, seq, actualizado_en FROM partidas WHERE codigo = ?')
    .bind(codigo)
    .first();

  const seqActual = actual ? actual.seq : -1;
  if (Number.isFinite(baseSeq) && baseSeq !== seqActual) {
    // Alguien escribió en el medio. Le devolvemos lo que hay para que fusione.
    return json({
      estado: actual ? JSON.parse(actual.estado) : null,
      seq: seqActual,
      actualizadoEn: actual ? actual.actualizado_en : 0,
    }, req, env, 409);
  }

  /* La partida vieja se archiva antes de pisarla. D1 tiene Time Travel de 7
     días, pero eso restaura la base entera: esto permite recuperar una sola
     partida sin tocar el resto, y sobrevive más de una semana. */
  const sentencias = [];
  if (actual) {
    sentencias.push(
      env.DB.prepare(
        'INSERT INTO partidas_historial (codigo, estado, seq, archivado_en) VALUES (?, ?, ?, ?)'
      ).bind(codigo, actual.estado, actual.seq, ahora),
      env.DB.prepare(
        `DELETE FROM partidas_historial
          WHERE codigo = ?
            AND id NOT IN (
              SELECT id FROM partidas_historial WHERE codigo = ? ORDER BY archivado_en DESC LIMIT ?
            )`
      ).bind(codigo, codigo, VERSIONES_GUARDADAS)
    );
  }

  sentencias.push(
    env.DB.prepare(
      `INSERT INTO partidas (codigo, estado, seq, guardado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(codigo) DO UPDATE SET
         estado = excluded.estado,
         seq = excluded.seq,
         guardado_en = excluded.guardado_en,
         actualizado_en = excluded.actualizado_en`
    ).bind(codigo, texto, seq, Number(estado.guardadoEn) || ahora, ahora)
  );

  await env.DB.batch(sentencias);

  return json({ seq, actualizadoEn: ahora }, req, env);
}

/* --- entrada ---------------------------------------------------------------- */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cabecerasCors(req, env) });
    }

    if (url.pathname === '/salud') return json({ ok: true }, req, env);

    const m = url.pathname.match(/^\/partida\/([^/]+)$/);
    if (!m) return json({ error: 'ruta desconocida' }, req, env, 404);

    const codigo = decodeURIComponent(m[1]).toUpperCase();
    // Validar la forma antes de tocar la base evita que cualquiera llene D1
    // con claves inventadas.
    if (!ALFABETO.test(codigo)) return json({ error: 'código inválido' }, req, env, 400);

    try {
      if (req.method === 'GET') return await obtener(codigo, req, env);
      if (req.method === 'PUT') return await guardar(codigo, req, env);
      return json({ error: 'método no permitido' }, req, env, 405);
    } catch (e) {
      return json({ error: 'error del servidor', detalle: e.message }, req, env, 500);
    }
  },
};
