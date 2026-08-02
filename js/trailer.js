/* ==========================================================
   trailer.js — Intro en video antes de mostrar la app.
   - Reproduce assets/trailer.mp4 (silenciado, autoplay).
   - Botón "Saltar" siempre disponible.
   - Barra de progreso calculada con la duración REAL del video
     (video.duration), no un tiempo fijo a mano.
   - Al terminar (evento "ended") se oculta solo y aparece la app.
   - Solo se muestra una vez por sesión de pestaña.
   - Con red de seguridad: si el video no existe, falla, o el
     navegador bloquea el autoplay sin que el usuario reaccione,
     la app se revela igual — nunca deja a nadie atrapado
     detrás de una pantalla negra.
   ========================================================== */

const SESSION_KEY = 'trailer_seen_v1';
const SAFETY_TIMEOUT_MS = 8000; // solo cubre "el video nunca arrancó"; una vez que reproduce de verdad, se cancela

function formatTime(s){
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export function initTrailer(){
  const overlay = document.getElementById('trailer-overlay');
  if (!overlay) return;

  // Ya se vio en esta pestaña/sesión: no volver a mostrarlo
  if (sessionStorage.getItem(SESSION_KEY) === 'true'){
    overlay.remove();
    return;
  }

  const video = document.getElementById('trailer-video');
  const skipBtn = document.getElementById('trailer-skip');
  const progressFill = document.getElementById('trailer-progress-fill');
  const timeLabel = document.getElementById('trailer-time');
  const tapOverlay = document.getElementById('trailer-tap');

  if (!video){
    overlay.remove();
    return;
  }

  let finished = false;
  let safetyTimer = null;

  function reveal(){
    if (finished) return;
    finished = true;
    clearTimeout(safetyTimer);
    sessionStorage.setItem(SESSION_KEY, 'true');
    overlay.classList.add('fade-out');
    try{ video.pause(); }catch(e){ /* ignore */ }
    setTimeout(() => overlay.remove(), 550);
  }

  // Red de seguridad: SOLO para "el video nunca arrancó" (archivo roto, ruta
  // mala, códec no soportado). En cuanto confirmamos reproducción real
  // (evento "playing"), se cancela — así un video largo no se corta antes de tiempo.
  safetyTimer = setTimeout(reveal, SAFETY_TIMEOUT_MS);

  video.addEventListener('playing', () => {
    clearTimeout(safetyTimer);
  });

  video.addEventListener('loadedmetadata', () => {
    if (isFinite(video.duration)) timeLabel.textContent = formatTime(video.duration);
  });

  video.addEventListener('timeupdate', () => {
    if (!isFinite(video.duration) || video.duration === 0) return;
    const pct = (video.currentTime / video.duration) * 100;
    progressFill.style.width = pct + '%';
    timeLabel.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
  });

  video.addEventListener('ended', reveal);
  video.addEventListener('abort', reveal);
  video.addEventListener('error', () => {
    const err = video.error;
    const CODES = { 1: 'ABORTED', 2: 'NETWORK', 3: 'DECODE (códec no soportado)', 4: 'SRC_NOT_SUPPORTED (archivo no encontrado o formato/códec incompatible)' };
    console.error(
      '[trailer] El video no se pudo reproducir.',
      err ? `Código ${err.code} (${CODES[err.code] || 'desconocido'}): ${err.message || 'sin mensaje'}` : err,
      '\nRevisa que exista assets/trailer.mp4 y que esté codificado en H.264 + AAC (no HEVC/H.265).'
    );
    reveal();
  });

  skipBtn.addEventListener('click', reveal);

  const playPromise = video.play();
  if (playPromise !== undefined){
    playPromise.catch(() => {
      // Autoplay bloqueado: pedir un toque explícito
      tapOverlay.classList.add('show');
      tapOverlay.addEventListener('click', () => {
        tapOverlay.classList.remove('show');
        video.play().catch(reveal);
      }, { once: true });
    });
  }
}
