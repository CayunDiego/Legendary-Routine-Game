/* D1 falso en memoria. Lo usan worker/test.mjs y smoke.mjs.

   Implementa sólo lo que el Worker realmente llama: prepare().bind().first() y
   batch(). Las consultas son cuatro y conocidas, así que se reconocen por su
   comienzo en vez de interpretar SQL. Si alguien agrega una consulta nueva al
   Worker y se olvida de acá, esto tira error en vez de devolver null callado. */
export function baseFalsa() {
  const partidas = new Map();
  let historial = [];
  let autoId = 1;

  const ejecutar = (sql, args) => {
    const s = sql.replace(/\s+/g, ' ').trim();

    if (s.startsWith('SELECT estado, seq, actualizado_en FROM partidas')) {
      return partidas.get(args[0]) || null;
    }
    if (s.startsWith('INSERT INTO partidas_historial')) {
      historial.push({ id: autoId++, codigo: args[0], estado: args[1], seq: args[2], archivado_en: args[3] });
      return null;
    }
    if (s.startsWith('DELETE FROM partidas_historial')) {
      const [codigo, , limite] = args;
      const suyas = historial
        .filter((h) => h.codigo === codigo)
        .sort((a, b) => b.archivado_en - a.archivado_en || b.id - a.id);
      const sobreviven = new Set(suyas.slice(0, limite).map((h) => h.id));
      historial = historial.filter((h) => h.codigo !== codigo || sobreviven.has(h.id));
      return null;
    }
    if (s.startsWith('INSERT INTO partidas')) {
      const [codigo, estado, seq, guardado_en, actualizado_en] = args;
      partidas.set(codigo, { estado, seq, guardado_en, actualizado_en });
      return null;
    }
    throw new Error('consulta no prevista en el D1 falso: ' + s);
  };

  const prepare = (sql) => ({
    bind: (...args) => ({
      first: async () => ejecutar(sql, args),
      _correr: () => ejecutar(sql, args),
    }),
  });

  return {
    DB: {
      prepare,
      batch: async (sentencias) => sentencias.map((x) => x._correr()),
    },
    _partidas: partidas,
    _historial: () => historial,
  };
}
