/* ============================================================================
 *  SONIDO — pequeños bips sintetizados (sin archivos externos)
 * ==========================================================================*/
/* El interruptor de sonido vive en EST (que es de juego.js). En vez de importar
   el estado acá — lo que crearía un ciclo — juego.js avisa con setSonido()
   cuando carga la partida y cuando se toca la casilla en Ajustes. */
let activo = true;
function setSonido(v) { activo = !!v; }

let audioCtx = null;
function iniciarAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function tono(freq, dur, tipo, vol) {
  if (!audioCtx || !activo) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = tipo || 'square';
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol || 0.05, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
}

function sonar(tipo) {
  if (!activo) return;
  switch (tipo) {
    case 'texto': tono(760, 0.03, 'square', 0.018); break;
    case 'ok': tono(660, 0.08); setTimeout(() => tono(880, 0.1), 70); break;
    case 'menu': tono(520, 0.05, 'triangle', 0.04); break;
    case 'bloqueo': tono(140, 0.05, 'square', 0.025); break;
    case 'moneda': tono(1050, 0.06); setTimeout(() => tono(1400, 0.08), 60); break;
    case 'nivel':
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tono(f, 0.16, 'triangle', 0.06), i * 110));
      break;
    /* Los dos avisos del pomodoro. Son los únicos sonidos del juego que Kath
       escucha SIN estar mirando la pantalla —está laburando en otra cosa, el
       teléfono apoyado al costado—, así que van más largos y más fuertes que el
       resto, y tienen que distinguirse uno del otro con sólo oírlos: cuál de
       las dos cosas terminó decide qué hace en el minuto siguiente.

       Fin del foco: campanita que sube y se repite. Es el que puede agarrarla
       de espaldas, así que suena dos veces. */
    case 'finFoco':
      [880, 1175, 1568, 0, 880, 1175, 1568].forEach((f, i) => {
        if (f) setTimeout(() => tono(f, 0.22, 'triangle', 0.07), i * 130);
      });
      break;

    /* Fin de la pausa: baja en vez de subir, y en seno en vez de triangular.
       Al revés del otro a propósito —no es un logro, es "se terminó el
       recreo"— y suave, porque acá sí está a un metro del teléfono. */
    case 'finPausa':
      [1047, 784, 587].forEach((f, i) => setTimeout(() => tono(f, 0.26, 'sine', 0.06), i * 170));
      break;

    case 'eclosion':
      [392, 523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tono(f, 0.2, 'triangle', 0.06), i * 130));
      break;
  }
}

export { iniciarAudio, tono, sonar, setSonido };
