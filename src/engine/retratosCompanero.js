import { SPRITE_COMPANERO } from '../config/sprites.js';
import { COMPANERO_RETRATOS } from '../config/recortes.js';

/* Retrato del compañero (uno por COMPANERO.etapas), para el diálogo de
   evolución en game/juego.js. Es el primer cuadro de la caminata "hacia
   abajo", o sea la pose de frente: la hoja no trae retratos aparte, y mirando
   a cámara es la que mejor funciona como foto. Se agranda con
   image-rendering:pixelated (ver .dlgRetrato en App.css), así que sale nítida
   aunque el recorte sea chico.

   Vive en un módulo aparte del motor porque esto lo consume un componente de
   React, no el canvas: carga su propia copia de la imagen (el navegador la
   sirve de caché, no pesa una segunda vez) en vez de depender de que el motor
   ya haya arrancado. Los rectángulos los arma config/recortes.js a partir de
   COMPANERO_ANIM (fila `abajo`, primer cuadro), así que no hay que volver a
   escribirlos cuando cambia la hoja. */
const RECORTES = COMPANERO_RETRATOS;

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
