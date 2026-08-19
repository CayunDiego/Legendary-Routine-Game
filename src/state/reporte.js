import { CONFIG } from '../config/config.js';

/* ---------------------------------------------------------------------------
 *  REPORTES — Kath le cuenta algo a Diego por WhatsApp
 *
 *  No hay backend ni API de WhatsApp de por medio, y es a propósito: la API
 *  oficial pide cuenta de empresa, token y plantillas aprobadas por Meta para
 *  mandar un mensaje. Acá alcanza con un link `wa.me`, que abre WhatsApp en el
 *  teléfono de Kath con el mensaje ya escrito y ella toca enviar.
 *
 *  Lo que eso implica, y conviene saberlo:
 *    - El mensaje sale DESDE su WhatsApp, así que Diego ve quién escribió y le
 *      puede contestar por el mismo lado. Es mejor que un formulario anónimo.
 *    - Si no toca enviar, no llega nada. No hay forma de saberlo desde acá.
 *    - Funciona sin internet del lado del juego: el link se arma local.
 *
 *  El título lo arma este módulo, no Kath: además del tipo y la fecha mete el
 *  nivel y la versión del juego. Un "no me anda el huevo" sin versión obliga a
 *  preguntar de vuelta, y para cuando contesta ya se deployó otra cosa.
 * -------------------------------------------------------------------------*/

/* Emoji, cómo lo ve ella, y cómo entra en el título del mensaje. */
const TIPOS = [
  {
    id: 'bug',
    emoji: '🐛',
    nombre: 'Algo anda mal',
    titulo: 'Bug',
    ayuda: '¿Qué estabas haciendo cuando pasó? Cuanto más detalle, más fácil de arreglar.',
    placeholder: 'Toqué el huevo y no pasó nada…',
  },
  {
    id: 'idea',
    emoji: '💡',
    nombre: 'Se me ocurrió algo',
    titulo: 'Idea',
    ayuda: 'Lo que se te ocurra: un premio nuevo, un disfraz, algo que te gustaría que haya.',
    placeholder: 'Estaría bueno que Merlí…',
  },
];

function tipoPorId(id) {
  return TIPOS.find((t) => t.id === id) || TIPOS[0];
}

/* El mensaje completo, tal cual va a llegarle a Diego. `*...*` es la negrita de
   WhatsApp. El contexto va en su propia línea para que el título se lea de una
   en la lista de chats, sin abrirlo. */
function armarMensaje(tipoId, texto, est = {}) {
  const t = tipoPorId(tipoId);
  const fecha = new Date().toLocaleDateString('es-AR');
  const contexto = `${fecha} · nivel ${est.nivel || 1} · v ${CONFIG.version}`;
  return `${t.emoji} *${t.titulo} en ${CONFIG.juego}*\n${contexto}\n\n${String(texto).trim()}`;
}

/* wa.me quiere el número en formato internacional y sin nada más que dígitos:
   ni +, ni espacios, ni guiones. Se limpia acá y no en config.js para que
   escribirlo con + o con espacios ahí siga funcionando. */
function linkWhatsapp(mensaje) {
  const numero = String(CONFIG.whatsapp || '').replace(/\D/g, '');
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export { TIPOS, tipoPorId, armarMensaje, linkWhatsapp };
