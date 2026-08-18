import { SPRITE_COMPANERO } from '../config/sprites.js';

/* Retrato del compañero (uno por COMPANERO.etapas), para el diálogo de
   evolución en game/juego.js. Es el primer cuadro de la caminata "hacia
   abajo", o sea la pose de frente: la hoja no trae retratos aparte, y mirando
   a cámara es la que mejor funciona como foto. Se agranda con
   image-rendering:pixelated (ver .dlgRetrato en App.css), así que sale nítida
   aunque el recorte sea chico.

   Vive en un módulo aparte del motor porque esto lo consume un componente de
   React, no el canvas: carga su propia copia de la imagen (el navegador la
   sirve de caché, no pesa una segunda vez) en vez de depender de que el motor
   ya haya arrancado. Los rectángulos son los mismos que COMPANERO_ANIM en
   engine/motor.js, fila `abajo`, primer cuadro. */
const RECORTES = [
  { x: 0, y: 0, w: 75, h: 109 },     // etapa 0 Kathi
  { x: 0, y: 387, w: 73, h: 137 },   // etapa 1 Kathira
  { x: 0, y: 906, w: 115, h: 166 },  // etapa 2 Kathrix
];

let hoja = null;
const cache = [];
const img = new Image();
img.onload = () => { hoja = img; };
img.src = SPRITE_COMPANERO;

/* Data URL del retrato de la etapa `et`, o null si la hoja no cargó todavía. */
function retratoBicho(et) {
  if (cache[et]) return cache[et];
  const r = RECORTES[et];
  if (!hoja || !r) return null;
  const c = document.createElement('canvas');
  c.width = r.w; c.height = r.h;
  c.getContext('2d').drawImage(hoja, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  return (cache[et] = c.toDataURL());
}

export { retratoBicho };
