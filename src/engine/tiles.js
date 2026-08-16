import { TILE_SRC, pintar, rnd } from './drawing.js';

/* ============================================================================
 *  TILES DEL SUELO  (3 variantes por tipo para que no se vea repetido)
 * ==========================================================================*/
const TILES = {};

function construirTiles() {
  const T = TILE_SRC;

  // --- pasto ---
  TILES.G = [];
  for (let v = 0; v < 3; v++) {
    const r = [[0, 0, T, T, '#63b04f']];
    for (let i = 0; i < 26; i++) {
      const s = v * 100 + i;
      const x = Math.floor(rnd(s) * T), y = Math.floor(rnd(s + 7) * T);
      r.push([x, y, 1, 1, rnd(s + 3) > 0.5 ? '#79c25f' : '#55a044']);
    }
    // matitas
    for (let i = 0; i < 3; i++) {
      const s = v * 50 + i * 11;
      const x = 2 + Math.floor(rnd(s) * (T - 5)), y = 3 + Math.floor(rnd(s + 2) * (T - 7));
      r.push([x, y + 1, 1, 2, '#3f8a38'], [x + 1, y, 1, 3, '#4b9a40'], [x + 2, y + 1, 1, 2, '#3f8a38']);
    }
    TILES.G.push(pintar(T, T, r));
  }

  // --- alfombra del dormitorio (lila suave: hace resaltar el rojo del vestido) ---
  TILES[','] = [pintar(T, T, [
    [0, 0, T, T, '#ded3ee'],
    [0, 0, T, 1, '#cdc0e2'], [0, 0, 1, T, '#cdc0e2'],
    [2, 2, 2, 2, '#eae2f6'], [10, 6, 2, 2, '#eae2f6'], [6, 11, 2, 2, '#eae2f6'],
    [12, 12, 1, 1, '#c5b6dd'], [4, 7, 1, 1, '#c5b6dd']
  ])];

  // --- baldosa del baño ---
  TILES.T = [pintar(T, T, [
    [0, 0, T, T, '#dff0f6'],
    [0, 0, T, 1, '#c2dfe9'], [0, 0, 1, T, '#c2dfe9'],
    [8, 0, 1, T, '#cfe6ef'], [0, 8, T, 1, '#cfe6ef'],
    [3, 3, 1, 1, '#eef8fb'], [11, 11, 1, 1, '#eef8fb']
  ])];

  // --- piso de cocina (damero suave) ---
  TILES.K = [pintar(T, T, [
    [0, 0, T, T, '#f2e7d1'],
    [0, 0, 8, 8, '#e3d3b4'], [8, 8, 8, 8, '#e3d3b4'],
    [0, 0, T, 1, '#d9c8a8'], [0, 0, 1, T, '#d9c8a8']
  ])];

  // --- piso de madera ---
  TILES['.'] = [];
  for (let v = 0; v < 2; v++) {
    const r = [[0, 0, T, T, '#cfa471']];
    const off = v * 8;
    r.push([0, 0, T, 1, '#b98e5f'], [0, 8, T, 1, '#b98e5f']);
    r.push([off, 0, 1, 8, '#b98e5f'], [(off + 8) % 16, 8, 1, 8, '#b98e5f']);
    r.push([2, 3, 6, 1, '#d9b184'], [9, 11, 5, 1, '#d9b184']);
    TILES['.'].push(pintar(T, T, r));
  }

  // --- puerta / umbral ---
  TILES.D = [pintar(T, T, [
    [0, 0, T, T, '#cfa471'],
    [0, 0, T, 2, '#8b5e3c'], [0, T - 2, T, 2, '#8b5e3c'],
    [3, 5, 10, 6, '#b98e5f']
  ])];

  // --- sendero de piedra ---
  TILES.P = [pintar(T, T, [
    [0, 0, T, T, '#cfc6b4'],
    [1, 1, 6, 6, '#ded5c3'], [9, 1, 6, 6, '#d6ccba'],
    [1, 9, 6, 6, '#d6ccba'], [9, 9, 6, 6, '#ded5c3'],
    [0, 0, T, 1, '#b9af9c']
  ])];

  // --- agua (2 frames animados) ---
  TILES['~'] = [];
  for (let v = 0; v < 2; v++) {
    const r = [[0, 0, T, T, '#4aa8d8'], [0, 0, T, 6, '#54b4e2']];
    const o = v * 5;
    r.push([(2 + o) % 14, 4, 4, 1, '#a5dcf2'], [(9 + o) % 14, 10, 3, 1, '#a5dcf2']);
    r.push([(6 + o) % 14, 12, 4, 1, '#3d97c6']);
    TILES['~'].push(pintar(T, T, r));
  }

  // --- pared interior: [0] remate de arriba, [1] cuerpo (cuando sigue habiendo pared encima) ---
  TILES['#'] = [
    pintar(T, T, [
      [0, 0, T, T, '#8a6a4f'],
      [0, 0, T, 4, '#a37f5f'],
      [0, 0, T, 1, '#b58e6b'],
      [0, T - 2, T, 2, '#6f5540'],
      [0, 6, T, 1, '#7d6048'], [8, 7, 1, 9, '#7d6048'], [0, 11, T, 1, '#7d6048']
    ]),
    pintar(T, T, [
      [0, 0, T, T, '#8a6a4f'],
      [0, T - 2, T, 2, '#6f5540'],
      [0, 3, T, 1, '#7d6048'], [4, 4, 1, 6, '#7d6048'],
      [0, 10, T, 1, '#7d6048'], [11, 11, 1, 5, '#7d6048'],
      [2, 6, 3, 1, '#96755a'], [9, 13, 4, 1, '#96755a']
    ])
  ];

  // --- cerco del terreno ---
  TILES.F = [pintar(T, T, [
    [0, 0, T, T, '#63b04f'],
    [0, 5, T, 3, '#a9713f'], [0, 10, T, 3, '#a9713f'],
    [0, 5, T, 1, '#c08a55'], [0, 10, T, 1, '#c08a55'],
    [3, 2, 3, 13, '#8b5e3c'], [11, 2, 3, 13, '#8b5e3c'],
    [3, 2, 3, 1, '#a9713f'], [11, 2, 3, 1, '#a9713f']
  ])];
}

export { TILES, construirTiles };
