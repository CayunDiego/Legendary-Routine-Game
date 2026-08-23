import { TILE_SRC, pintar, circ, oval } from './drawing.js';

/* ============================================================================
 *  OBJETOS
 *  tw/th = tamaño en tiles.  r = rectángulos en la grilla fuente.
 * ==========================================================================*/
const ART_OBJ = {
  cama: { tw: 2, th: 2, r: [
    [0, 0, 32, 6, '#a06a42'], [0, 0, 32, 2, '#bb8256'],
    [1, 5, 30, 27, '#8b5e3c'],
    [2, 6, 28, 25, '#f7f2e8'],
    [4, 7, 24, 7, '#ffffff'], [4, 13, 24, 1, '#dcd4c6'],
    [2, 15, 28, 15, '#e58bb0'], [2, 15, 28, 2, '#f3a8c6'],
    [2, 22, 28, 1, '#d97ba2'],
    [0, 30, 3, 2, '#6b4526'], [29, 30, 3, 2, '#6b4526']
  ]},

  ducha: { tw: 1, th: 2, r: [
    [0, 0, 16, 32, '#cfe8f0'],
    [1, 1, 14, 26, '#e6f5fa'],
    [7, 0, 2, 7, '#b9c2c9'],
    [4, 6, 8, 3, '#dfe6ea'], [4, 6, 8, 1, '#f2f6f8'],
    [6, 11, 1, 3, '#8fd0e8'], [9, 14, 1, 3, '#8fd0e8'], [7, 19, 1, 3, '#8fd0e8'], [11, 21, 1, 2, '#8fd0e8'],
    [0, 27, 16, 5, '#f2f8fb'], [0, 27, 16, 1, '#c2dbe4'], [6, 29, 4, 1, '#cfe1e8']
  ]},

  lavabo: { tw: 1, th: 1, r: [
    [2, 0, 12, 8, '#9aa7b0'], [3, 1, 10, 6, '#d6eef8'], [4, 2, 4, 2, '#f0fbff'],
    [7, 7, 2, 2, '#b9c2c9'],
    [2, 9, 12, 5, '#f2f6f8'], [2, 9, 12, 1, '#ffffff'],
    [4, 10, 8, 3, '#d6e4ea'], [7, 11, 2, 1, '#b7cad3'],
    [4, 14, 2, 2, '#dde4e8'], [10, 14, 2, 2, '#dde4e8']
  ]},

  /* El inodoro mide 2 casillas de alto y se apoya en la fila de pared de arriba
     del bano (y=2), igual que los muebles altos del living: asi entra la
     mochila entera arriba y la taza abajo, sin gastar una casilla de piso.
     Antes era 1 x 1 y los dos tenian que caber en 16 px: la mochila quedaba en
     6 px de alto y se leia como una cajita apoyada sobre otra cajita.

     La taza va en ovalos concentricos —loza, tapa, hueco— porque es lo unico
     redondo del bano y en cuadrados no se distingue del lavabo. */
  inodoro: { tw: 1, th: 2, r: [
    // mochila, contra la pared
    [3, 2, 10, 2, '#ffffff'],
    [3, 4, 10, 11, '#eff4f6'], [3, 4, 10, 1, '#ffffff'],
    [3, 4, 1, 11, '#ffffff'], [12, 4, 1, 11, '#cfd8dd'],
    [6, 7, 4, 3, '#c3ced5'], [6, 7, 4, 1, '#dfe7eb'],   // boton de la cadena
    [3, 15, 10, 1, '#b9c2c9'],
    // el cuello que baja de la mochila a la taza
    [5, 16, 6, 4, '#e3eaed'], [5, 16, 1, 4, '#f7fafb'],
    // taza
    ...oval(8, 24, 7, 6, '#f7fafb'),
    ...oval(8, 24, 6, 5, '#ffffff'),
    ...oval(8, 24, 4, 3, '#cfd8dd'),
    ...oval(8, 24, 3, 2, '#aeb9c0'),
    // pie y sombra de apoyo
    [5, 29, 6, 3, '#e3eaed'], [5, 31, 6, 1, '#b9c2c9'],
  ]},


  toalla: { tw: 1, th: 1, r: [
    [1, 2, 14, 1, '#aeb5ba'],
    [3, 3, 5, 10, '#f4a3bf'], [3, 3, 5, 1, '#ffc0d6'], [3, 8, 5, 1, '#e58bab'],
    [9, 3, 4, 8, '#a3d3f4'], [9, 3, 4, 1, '#c4e6ff']
  ]},

  heladera: { tw: 1, th: 2, r: [
    [1, 0, 14, 32, '#eaeff2'], [12, 0, 3, 32, '#d5dcdf'], [1, 0, 14, 1, '#ffffff'],
    [1, 13, 14, 1, '#c2cace'],
    [11, 4, 1, 6, '#98a2a8'], [11, 16, 1, 7, '#98a2a8'],
    [3, 3, 2, 2, '#f06292'], [6, 3, 2, 2, '#f7c948'], [3, 17, 3, 4, '#ffffff'], [3, 17, 3, 1, '#cfd8dd']
  ]},

  cocina: { tw: 1, th: 1, r: [
    [1, 2, 14, 14, '#cfd6da'],
    [1, 2, 14, 6, '#3a4045'],
    [3, 3, 4, 3, '#666f75'], [9, 3, 4, 3, '#666f75'],
    [4, 4, 2, 1, '#e8734a'], [10, 4, 2, 1, '#e8734a'],
    [1, 8, 14, 1, '#aab3b8'],
    [3, 10, 10, 5, '#8e979d'], [4, 11, 8, 3, '#2f3438'], [4, 11, 8, 1, '#4a5257'],
    [2, 9, 1, 1, '#f2f2f2'], [5, 9, 1, 1, '#f2f2f2'], [8, 9, 1, 1, '#f2f2f2']
  ]},

  mesada: { tw: 1, th: 1, r: [
    [0, 3, 16, 3, '#efe6d5'], [0, 3, 16, 1, '#fbf5ea'],
    [0, 6, 16, 10, '#c9b79c'], [0, 6, 16, 1, '#b5a389'],
    [2, 8, 5, 5, '#bda98c'], [9, 8, 5, 5, '#bda98c'],
    [4, 10, 1, 1, '#8d7c63'], [11, 10, 1, 1, '#8d7c63']
  ]},

  lavarropas: { tw: 1, th: 1, r: [
    [1, 1, 14, 15, '#eef1f3'], [1, 1, 14, 1, '#ffffff'], [12, 1, 3, 15, '#dde3e6'],
    [1, 2, 14, 3, '#d5dbdf'], [2, 3, 2, 1, '#8fbcd4'], [5, 3, 1, 1, '#e07b7b'],
    ...circ(7, 10, 5, '#b6c4cb'), ...circ(7, 10, 4, '#9fd0e0'), ...circ(7, 10, 3, '#d3edf6')
  ]},

  mesa: { tw: 1, th: 1, r: [
    [1, 4, 14, 7, '#c98f5a'], [1, 4, 14, 2, '#dda86f'],
    [2, 11, 2, 4, '#a06a42'], [12, 11, 2, 4, '#a06a42'],
    [6, 5, 4, 2, '#f0d9b8']
  ]},

  /* El sillón, visto DE ATRÁS: el respaldo abajo (contra la cámara) y el
     asiento arriba, o sea mirando al norte. Estuvo dibujado al revés hasta que
     Kath se pudo sentar, y ahí quedó a la vista que el mueble contradecía al
     cuarto: el mapa siempre los tuvo enfrentados a la chimenea y a la tele,
     que están arriba.

     Dado vuelta, el respaldo tapa a quien está sentada de la nuca para abajo.
     Eso no es un efecto secundario, es para qué se dibujó así: la hoja de Kath
     sentada trae una silla de madera adentro del sprite, y este respaldo es lo
     que la esconde. De ahí que tenga 14 filas de alto —tiene que llegar hasta
     la fila 2 para cubrir la silla entera— y que el motor dibuje el sillón
     DESPUÉS de ella (ver el orden de dibujo en motor.js). */
  sofa: { tw: 2, th: 1, r: [
    // lo que asoma por encima del respaldo: los almohadones y los dos cojines
    [5, 0, 22, 3, '#8fa2e0'], [5, 0, 22, 1, '#a1b2ea'],
    [8, 0, 6, 2, '#f4a3bf'], [18, 0, 6, 2, '#f4a3bf'],
    // apoyabrazos, que sobresalen un poco del respaldo
    [0, 1, 5, 15, '#6374b8'], [0, 1, 5, 1, '#8496da'],
    [27, 1, 5, 15, '#6374b8'], [27, 1, 5, 1, '#8496da'],
    // el respaldo
    [4, 2, 24, 14, '#7183c9'], [4, 2, 24, 1, '#8496da'],
    [15, 5, 1, 9, '#6374b8'],                                  // costura del medio
    [4, 14, 24, 2, '#5f70b0'],
    [2, 15, 3, 1, '#4c5a92'], [27, 15, 3, 1, '#4c5a92']        // patas
  ]},

  tv: { tw: 1, th: 1, r: [
    [6, 13, 4, 2, '#4a4a4a'], [4, 15, 8, 1, '#3a3a3a'],
    [1, 2, 14, 11, '#2b2b2b'], [2, 3, 12, 9, '#4fb3e0'],
    [3, 4, 4, 2, '#a7e0f7'], [2, 9, 12, 3, '#3d9bc7']
  ]},

  escritorio: { tw: 1, th: 1, r: [
    [0, 6, 16, 3, '#c98f5a'], [0, 6, 16, 1, '#dda86f'],
    [0, 9, 16, 6, '#a06a42'], [2, 10, 5, 4, '#8b5e3c'], [9, 10, 5, 4, '#8b5e3c'],
    [4, 2, 9, 4, '#c9526b'], [5, 3, 7, 2, '#f6efe2'], [4, 2, 9, 1, '#e0687f'],
    [13, 3, 1, 3, '#f7c948']
  ]},

  /* La silla del escritorio. Está copiada de la que Kath trae dibujada adentro
     de su hoja de sentada (arte-fuente/kath_sentada.png): mismo alto —13 px
     fuente, del respaldo a las patas—, mismo ancho de 10 y las patas apoyadas
     en la última fila de la casilla. Eso importa porque las dos se ven una
     detrás de la otra: cuando Kath se sienta, el motor esconde ESTA y la que
     queda es la del sprite. Si no midieran igual, sentarse sería ver la silla
     cambiar de tamaño.

     Los colores son los del escritorio y la mesa (#c98f5a, #a06a42, #8b5e3c) y
     no los del sprite —que trae sus propios marrones del generador— para que
     se lea como un mueble más de la casa y no como algo pegado encima. */
  silla: { tw: 1, th: 1, r: [
    // travesaño de arriba (filas 18-22 del sprite)
    [3, 2, 10, 5, '#241610'],
    [4, 3, 8, 1, '#a06b41'],
    [4, 4, 8, 2, '#875837'],
    // los listones del respaldo (23-25): dos montantes a los costados, uno en
    // el medio, y aire entre medio. Es el detalle que la hermana con la del
    // sprite —ahí se ve el vestido rojo asomando entre los listones— y lo que
    // la separa de una banqueta.
    [3, 7, 3, 3, '#241610'], [7, 7, 2, 3, '#241610'], [10, 7, 3, 3, '#241610'],
    [4, 7, 1, 3, '#875837'], [7, 7, 1, 3, '#875837'], [11, 7, 1, 3, '#875837'],
    // asiento (26-27)
    [3, 10, 10, 2, '#241610'],
    [4, 10, 8, 1, '#8e5b38'],
    // patas (28-31)
    [4, 12, 3, 4, '#241610'], [9, 12, 3, 4, '#241610'],
    [5, 13, 1, 2, '#5b3823'], [10, 13, 1, 2, '#5b3823'],
  ]},

  cuadro: { tw: 1, th: 1, r: [
    [2, 2, 12, 11, '#c99b52'], [2, 2, 12, 1, '#e0b268'],
    [3, 3, 10, 9, '#fbe6ee'],
    ...circ(6, 7, 2, '#e05572'), ...circ(10, 6, 2, '#e05572'),
    [5, 9, 6, 1, '#f0a8bb']
  ]},

  planta: { tw: 1, th: 1, r: [
    [4, 10, 8, 6, '#c4703f'], [4, 10, 8, 1, '#d88450'], [5, 11, 6, 1, '#5b3a22'],
    ...circ(8, 6, 4, '#4e9c4c'), ...circ(5, 8, 3, '#5db35a'), ...circ(11, 8, 3, '#5db35a'),
    [7, 2, 1, 4, '#3f8a38']
  ]},

  alfombra: { tw: 1, th: 1, decor: true, r: [
    ...oval(8, 8, 7, 5, '#c9526b'), ...oval(8, 8, 5, 3, '#e0687f'), ...oval(8, 8, 2, 1, '#f2c6d5')
  ]},

  // alfombra grande del dormitorio (6 x 3 casillas)
  alfombraGrande: { tw: 6, th: 3, decor: true, r: [
    [2, 2, 92, 44, '#7fbf5f'],                                   // paño
    [2, 2, 92, 3, '#a8d98c'], [2, 43, 92, 3, '#5f9e46'],        // luces y sombras
    [2, 2, 3, 44, '#a8d98c'], [91, 2, 3, 44, '#5f9e46'],
    [5, 5, 86, 38, '#8fcc6e'],                                   // campo interior
    [5, 5, 86, 1, '#a8d98c'],
    // puntitos, como la alfombra de las casas de Pokémon
    ...[10, 24, 38, 52, 66, 80].flatMap(x =>
      [12, 24, 36].map(y => [x, y, 3, 3, '#e8d98c'])),
    ...[17, 31, 45, 59, 73].flatMap(x =>
      [18, 30].map(y => [x, y, 2, 2, '#cfe3a8']))
  ]},

  /* Tele plana colgada en la pared (2 x 2 casillas).
     El rectángulo PANTALLA_TELE es donde se dibuja el gif, encima de este arte. */
  tvpared: { tw: 2, th: 2, pared: true, r: [
    [1, 3, 30, 27, '#1b1b22'],                                   // marco
    [1, 3, 30, 1, '#3a3a46'], [1, 29, 30, 1, '#0d0d12'],
    [2, 4, 28, 25, '#0d0d12'],
    [3, 6, 26, 20, '#101018'],                                   // fondo de pantalla
    [13, 30, 6, 1, '#3a3a46'], [14, 31, 4, 1, '#2b2b34'],        // soporte
    [26, 27, 2, 1, '#7ed957']                                    // lucecita de encendido
  ]},

  // notebook sobre un escritorio
  notebook: { tw: 1, th: 1, r: [
    [0, 7, 16, 3, '#c98f5a'], [0, 7, 16, 1, '#dda86f'],          // tablero
    [0, 10, 16, 5, '#a06a42'], [1, 11, 6, 3, '#8b5e3c'], [9, 11, 6, 3, '#8b5e3c'],
    [3, 1, 10, 6, '#b9c2c9'],                                    // tapa
    [4, 2, 8, 4, '#1d2b34'],
    [4, 2, 8, 1, '#3f7f9c'], [5, 3, 2, 1, '#7fd0e8'],            // pantalla
    [5, 4, 1, 2, '#f2c14e'], [7, 3, 1, 3, '#e0a020'], [9, 4, 1, 2, '#f7dc94'],
    [2, 7, 12, 1, '#dfe6ea'], [3, 8, 10, 1, '#c3ccd2']           // teclado
  ]},

  // biblioteca con libros
  biblioteca: { tw: 1, th: 1, r: [
    [1, 0, 14, 16, '#8b5e3c'], [1, 0, 14, 1, '#a06a42'],
    [2, 1, 12, 6, '#6b4526'], [2, 8, 12, 6, '#6b4526'],
    [3, 2, 2, 5, '#c9526b'], [5, 2, 1, 5, '#f2c14e'], [6, 3, 2, 4, '#4f8fc9'],
    [8, 2, 1, 5, '#7ed957'], [9, 3, 2, 4, '#e0a020'], [11, 2, 2, 5, '#9a6fd0'],
    [3, 9, 1, 5, '#4f8fc9'], [4, 10, 2, 4, '#c9526b'], [6, 9, 2, 5, '#f2c14e'],
    [8, 10, 1, 4, '#7ed957'], [9, 9, 2, 5, '#e0687f'], [11, 10, 2, 4, '#4fa3c7'],
    [1, 7, 14, 1, '#a06a42'], [1, 14, 14, 2, '#a06a42']
  ]},

  tienda: { tw: 1, th: 1, r: [
    [2, 0, 12, 5, '#f06292'], [2, 0, 12, 1, '#f88cae'],
    ...circ(8, 2, 1, '#ffffff'),
    [7, 5, 2, 2, '#8b5e3c'],
    [0, 7, 16, 3, '#e0a458'], [0, 7, 16, 1, '#f0bd77'],
    [1, 10, 14, 6, '#b5651d'], [3, 12, 3, 3, '#f7c948'], [9, 12, 3, 3, '#7ed957']
  ]},

  reposera: { tw: 1, th: 1, r: [
    [1, 5, 14, 8, '#e8dcc8'],
    [3, 5, 2, 8, '#f4a3bf'], [7, 5, 2, 8, '#f4a3bf'], [11, 5, 2, 8, '#f4a3bf'],
    [1, 4, 14, 1, '#c9b79c'],
    [1, 13, 2, 3, '#b5a389'], [13, 13, 2, 3, '#b5a389'],
    [2, 1, 12, 3, '#e8dcc8'], [4, 1, 2, 3, '#f4a3bf'], [9, 1, 2, 3, '#f4a3bf']
  ]},

  yoga: { tw: 1, th: 1, r: [
    ...oval(8, 9, 7, 4, '#8ed6c8'),
    ...oval(8, 9, 5, 2, '#a6e2d6'),
    [1, 4, 3, 6, '#6fc4b4'], [1, 4, 3, 1, '#8ed6c8']
  ]},

  /* El huevo se dibuja con la hoja de sprites (motor.js#dibujarHuevo), no con
     arte por código: sólo queda acá para que tw/th/decor/pared sigan saliendo
     de ART_OBJ como el resto de los objetos. */
  huevo: { tw: 1, th: 1, r: [] },

  /* Placard de los disfraces: dos puertas altas con espejo y tiradores. */
  placard: { tw: 1, th: 2, r: [
    [1, 0, 14, 32, '#8b5e3c'], [1, 0, 14, 1, '#a06a42'],
    [2, 2, 5, 27, '#6b4526'], [9, 2, 5, 27, '#6b4526'],
    [3, 3, 3, 12, '#c8dbe8'], [3, 3, 3, 4, '#e6f2f8'],       // espejo de la izquierda
    [10, 3, 3, 25, '#7a4f2e'], [10, 3, 3, 1, '#8b5e3c'],
    [7, 13, 1, 4, '#f7c948'], [8, 13, 1, 4, '#f7c948'],      // tiradores
    [1, 29, 14, 3, '#6b4526'], [2, 31, 2, 1, '#4a2f19'], [12, 31, 2, 1, '#4a2f19']
  ]},

  arbol: { tw: 1, th: 2, r: [
    [6, 20, 4, 12, '#7a5230'], [6, 20, 1, 12, '#8f6238'],
    ...circ(8, 12, 7, '#3f8a38'),
    ...circ(8, 9, 6, '#4e9c4c'),
    ...circ(6, 7, 4, '#5db35a'), ...circ(11, 9, 4, '#5db35a'),
    ...circ(6, 6, 2, '#6fc463')
  ]},

  flores: { tw: 1, th: 1, decor: true, r: [
    ...circ(4, 5, 2, '#f06292'), [4, 5, 1, 1, '#f7c948'],
    ...circ(11, 8, 2, '#f7c948'), [11, 8, 1, 1, '#e8734a'],
    ...circ(7, 12, 2, '#c9a0f0'), [7, 12, 1, 1, '#ffffff'],
    [4, 7, 1, 3, '#4e9c4c'], [11, 10, 1, 3, '#4e9c4c'], [7, 14, 1, 2, '#4e9c4c']
  ]},

  cartel: { tw: 1, th: 1, r: [
    [7, 9, 2, 7, '#8b5e3c'],
    [1, 2, 14, 8, '#c99b52'], [1, 2, 14, 1, '#e0b268'], [1, 9, 14, 1, '#a67f3f'],
    [3, 4, 10, 1, '#6b4526'], [3, 6, 8, 1, '#6b4526'], [3, 8, 6, 1, '#6b4526']
  ]},

  /* Espejo colgado en la pared del baño. Va en ovalos y no en un rectangulo
     para que no se confunda con el cuadro del dormitorio, que a 16 px es el
     mismo marco con otro relleno. */
  espejo: { tw: 1, th: 1, r: [
    ...oval(8, 8, 6, 7, '#c9a05a'),
    ...oval(8, 8, 5, 6, '#e8c887'),
    ...oval(8, 8, 4, 5, '#bcd8e6'),
    ...oval(8, 8, 3, 4, '#d7ebf4'),
    [5, 4, 2, 5, '#f4fbff'], [8, 11, 1, 2, '#f4fbff'],
  ]},

  /* --- muebles del living --------------------------------------------------
     Estos tres miden 2 casillas de alto y se apoyan en la fila de PARED que
     tiene el cuarto arriba (y=9). Eso los hace verse altos —de pie contra la
     pared, como los muebles de verdad— sin gastar una sola casilla de piso:
     la de arriba ya era pared y ya era solida.

     Es la diferencia entre un cuarto amoblado y una fila de cajitas de 16 px.
     Ojo con dos cosas si se agrega otro: no puede caer sobre una puerta de la
     fila 9 (x=8 y x=11 en esta casa; el smoke lo verifica) y el arte se dibuja
     desde la esquina de arriba a la izquierda, o sea desde la pared. */
  bibliotecaAlta: { tw: 1, th: 2, r: [
    [0, 0, 16, 32, '#6b4526'], [1, 1, 14, 30, '#8b5e3c'],
    [1, 1, 14, 1, '#a06a42'],
    // cuatro huecos oscuros, y entre medio los estantes
    ...[2, 10, 18, 26].map((y) => [2, y, 12, 6, '#5a3a20']),
    ...[8, 16, 24].map((y) => [1, y, 14, 2, '#a06a42']),
    // libros: cada hueco con su propia mezcla, para que no se repita el patron
    [3, 3, 2, 5, '#c9526b'], [5, 2, 1, 6, '#f2c14e'], [6, 3, 2, 5, '#4f8fc9'],
    [9, 2, 1, 6, '#7ed957'], [10, 3, 2, 5, '#e0a020'], [12, 2, 2, 6, '#9a6fd0'],
    [3, 11, 1, 5, '#4f8fc9'], [4, 12, 2, 4, '#c9526b'], [7, 11, 2, 5, '#f2c14e'],
    [9, 12, 1, 4, '#7ed957'], [10, 11, 2, 5, '#e0687f'], [12, 12, 2, 4, '#4fa3c7'],
    [3, 19, 2, 5, '#9a6fd0'], [6, 20, 1, 4, '#f2c14e'], [8, 19, 2, 5, '#c9526b'],
    [11, 20, 2, 4, '#4f8fc9'],
    // el estante de abajo va mas suelto: adornos, no libros
    ...circ(5, 29, 2, '#7ed957'), [4, 28, 1, 1, '#f6efe2'],
    [9, 27, 4, 4, '#e0687f'], [9, 27, 4, 1, '#f4a3bf'],
  ]},

  /* La campana sube por la pared y la repisa sobresale a los costados, que es
     lo que la separa de "una caja con fuego". El fuego lleva tres tonos de
     naranja, de afuera hacia adentro cada vez mas claro: con uno solo se lee
     como una mancha y no como llama. */
  chimenea: { tw: 2, th: 2, r: [
    [5, 0, 22, 14, '#7a5a4a'], [5, 0, 22, 1, '#96705c'],          // campana
    [5, 0, 1, 14, '#96705c'], [26, 0, 1, 14, '#5c4436'],
    [5, 5, 22, 1, '#5c4436'], [5, 10, 22, 1, '#5c4436'],
    [13, 1, 1, 4, '#5c4436'], [19, 6, 1, 4, '#5c4436'],
    [0, 13, 32, 5, '#a3826b'], [0, 13, 32, 1, '#c0a08a'],         // repisa
    [0, 17, 32, 1, '#7a624f'],
    [1, 18, 30, 14, '#7a5a4a'], [1, 18, 30, 1, '#96705c'],        // cuerpo
    [1, 18, 1, 14, '#96705c'], [30, 18, 1, 14, '#5c4436'],
    [1, 23, 30, 1, '#5c4436'], [1, 28, 30, 1, '#5c4436'],
    [4, 19, 1, 4, '#5c4436'], [27, 24, 1, 4, '#5c4436'],
    [8, 20, 16, 12, '#2b2119'],                                    // boca del hogar
    [10, 25, 12, 7, '#e8622a'],                                    // fuego
    [12, 23, 8, 9, '#f7a02a'],
    [14, 26, 4, 6, '#ffe08a'],
    [9, 30, 14, 2, '#6b4526'], [11, 31, 10, 1, '#4a2f1c'],         // lena
  ]},

  lampara: { tw: 1, th: 2, r: [
    [2, 4, 12, 8, '#f2d98c'], [2, 4, 12, 1, '#fff3c4'],            // pantalla
    [3, 3, 10, 1, '#d9b45c'], [2, 11, 12, 1, '#d9b45c'],
    [7, 12, 2, 17, '#7a6a5a'], [7, 12, 1, 17, '#8f7f6f'],          // pie
    [5, 29, 6, 3, '#5a4a3a'], [5, 29, 6, 1, '#7a6a5a'],            // base
  ]},

  mesaRatona: { tw: 1, th: 1, r: [
    [1, 6, 14, 3, '#c98f5a'], [1, 6, 14, 1, '#dda86f'],
    [1, 9, 14, 1, '#8b5e3c'],
    [3, 10, 2, 5, '#8b5e3c'], [11, 10, 2, 5, '#8b5e3c'],
    [5, 2, 6, 4, '#f6efe2'], [5, 2, 6, 1, '#ffffff'],             // un libro apoyado
    [5, 4, 6, 1, '#c9526b'],
  ]},

  /* La alfombra del living: 6 x 2, plana (decor) y con el mismo esqueleto que
     alfombraGrande —pano, luces, campo interior, puntitos— pero en rosa viejo.
     No es capricho de color: el piso de madera es #cfa471, un tostado calido,
     y una alfombra en la misma familia desaparece contra el piso. */
  alfombraLiving: { tw: 6, th: 2, decor: true, r: [
    [2, 2, 92, 28, '#b5546b'],
    [2, 2, 92, 2, '#cf6d84'], [2, 28, 92, 2, '#8f3f53'],
    [2, 2, 2, 28, '#cf6d84'], [92, 2, 2, 28, '#8f3f53'],
    [6, 6, 84, 20, '#c25f77'],
    [6, 6, 84, 1, '#d67d92'],
    ...[14, 30, 46, 62, 78].flatMap(x =>
      [11, 21].map(y => [x, y, 3, 3, '#f6e3c8'])),
    ...[22, 38, 54, 70].map(x => [x, 16, 2, 2, '#f6e3c8']),
  ]},

  /* Diego: ocupa 1 casilla y es solido. No lleva arte por codigo — el motor lo
     dibuja recortando cuadros de su hoja, igual que a la jugadora. */
  diego: { tw: 1, th: 1, r: [] },
};

/* --- caché de sprites construidos --------------------------------------- */
const SPR = {};
function construirObjetos() {
  for (const k in ART_OBJ) {
    const o = ART_OBJ[k];
    SPR[k] = pintar(o.tw * TILE_SRC, o.th * TILE_SRC, o.r);
  }
  // burbuja de "!" para misiones pendientes
  SPR.__alerta = pintar(16, 16, [
    ...circ(8, 7, 7, '#ffffff'), ...circ(8, 7, 6, '#f06292'),
    [7, 3, 2, 6, '#ffffff'], [7, 10, 2, 2, '#ffffff'],
    [6, 13, 2, 3, '#f06292']
  ]);
  SPR.__check = pintar(16, 16, [
    ...circ(8, 7, 7, '#ffffff'), ...circ(8, 7, 6, '#7ed957'),
    [5, 7, 2, 2, '#ffffff'], [7, 9, 2, 2, '#ffffff'],
    [9, 7, 2, 2, '#ffffff'], [11, 5, 2, 2, '#ffffff'],
    [6, 13, 2, 3, '#7ed957']
  ]);
}

export { ART_OBJ, SPR, construirObjetos };
