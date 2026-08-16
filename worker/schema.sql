-- Esquema de la base de partidas (Cloudflare D1).
-- Aplicar con:  npx wrangler d1 execute rutina-legendaria --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS partidas (
  codigo         TEXT PRIMARY KEY,
  estado         TEXT    NOT NULL,   -- la partida entera en JSON
  seq            INTEGER NOT NULL,   -- versión; la usa el compare-and-swap
  guardado_en    INTEGER NOT NULL,   -- Date.now() del dispositivo que la guardó
  actualizado_en INTEGER NOT NULL    -- Date.now() del servidor
);

-- Cada versión anterior queda archivada antes de pisarse. Es una red aparte de
-- Time Travel de D1: aquello restaura la base completa y sólo 7 días atrás,
-- esto permite sacar una partida sola y dura lo que dure la fila.
CREATE TABLE IF NOT EXISTS partidas_historial (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo       TEXT    NOT NULL,
  estado       TEXT    NOT NULL,
  seq          INTEGER NOT NULL,
  archivado_en INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_historial_codigo
  ON partidas_historial (codigo, archivado_en DESC);
