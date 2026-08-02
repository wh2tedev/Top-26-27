/* ==========================================================
   balonoro.js — Cálculo de probabilidades + gala + otorgamiento
   automático cuando se alcanza la fecha de entrega.
   ========================================================== */
import { state, refreshIcons } from './state.js?v=2.1.0';

const FECHA_ENTREGA = new Date('2027-01-01T20:00:00');
const LS_OTORGADO = 'balon_oro_2027_otorgado';
const LS_GANADOR = 'balon_oro_2027_ganador';
const LS_CANDIDATOS = 'balon_oro_2027_candidatos';
const LS_FECHA = 'balon_oro_2027_fecha_otorgamiento';

let countdownTimer = null;

function calcularCandidatos(){
  const candidatos = state.jugadores.map(j => {
    const partidosMinimos = j.partidos * 0.6;
    const cumple = j.partidos >= partidosMinimos && j.ga >= 25;
    if (!cumple) return { ...j, puntuacionBO: 0, cumpleRequisitos: false };

    const puntajeBase = j.puntaje * 0.4;
    const consistencia = j.partidos > 0 ? (j.ga / j.partidos) * 25 : 0;
    const impacto = (j.hattricks * 5) * 0.2;
    const versatilidad = Math.min(j.goles, j.asistencias) * 0.15;
    const puntuacionBO = puntajeBase + consistencia + impacto + versatilidad;

    return { ...j, puntuacionBO: Number(puntuacionBO.toFixed(2)), cumpleRequisitos: true };
  });

  const validos = candidatos
    .filter(c => c.cumpleRequisitos)
    .sort((a, b) => b.puntuacionBO - a.puntuacionBO)
    .slice(0, 5);

  const total = validos.reduce((s, c) => s + c.puntuacionBO, 0);
  validos.forEach(c => { c.probabilidad = total > 0 ? (c.puntuacionBO / total) * 100 : 0; });

  return validos;
}

function statChip(icon, value){
  return `<span><i data-lucide="${icon}" class="icon-sm"></i>${value}</span>`;
}

function podiumHtml(top3){
  const classes = ['gold', 'silver', 'bronze'];
  const initials = (n) => n.replace(/\(.*?\)/g, '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return `
    <div class="podium">
      ${top3.map((c, i) => `
        <div class="podium-slot ${classes[i]}">
          <div class="podium-avatar">${initials(c.nombre)}</div>
          <div class="podium-name">${c.nombre}</div>
          <div class="podium-pct">${c.probabilidad.toFixed(1)}%</div>
          <div class="podium-bar"><div class="podium-rank-num">${i + 1}</div></div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderProbabilidades(container){
  const candidatos = calcularCandidatos();

  if (!candidatos.length){
    container.innerHTML = `
      <div class="no-results">
        <i data-lucide="trophy" class="icon-lg"></i>
        <p>Aún no hay candidatos que cumplan los requisitos</p>
        <p style="font-size:12.5px;">Se requiere 60% de partidos jugados y 25+ G/A</p>
      </div>
      ${countdownBannerHtml()}
    `;
    startCountdown();
    refreshIcons();
    return;
  }

  const top3 = candidatos.slice(0, 3);
  const resto = candidatos.slice(3);

  container.innerHTML = `
    ${countdownBannerHtml()}
    ${podiumHtml(top3)}
    ${resto.map((c, i) => `
      <div class="candidate-card">
        <span class="candidate-rank">#${i + 4}</span>
        <div class="candidate-info">
          <div class="candidate-name">${c.nombre}</div>
          <div class="candidate-stats">
            ${statChip('target', c.goles + ' goles')}
            ${statChip('crosshair', c.asistencias + ' asist.')}
            ${statChip('flame', c.hattricks + ' hat-tricks')}
          </div>
          <div class="candidate-bar-track"><div class="candidate-bar-fill" style="width:${c.probabilidad}%"></div></div>
        </div>
        <span class="candidate-pct">${c.probabilidad.toFixed(1)}%</span>
      </div>
    `).join('')}
  `;

  startCountdown();
  refreshIcons();
}

function countdownBannerHtml(){
  return `
    <div class="bo-countdown" id="bo-countdown">
      <i data-lucide="clock" class="icon"></i>
      <div>
        <div class="bo-countdown-text">Entrega el <strong>${FECHA_ENTREGA.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
        <div class="bo-countdown-date">Actualizado en vivo</div>
      </div>
      <div class="bo-timer" id="bo-timer"></div>
    </div>
  `;
}

function startCountdown(){
  clearInterval(countdownTimer);
  const timerEl = document.getElementById('bo-timer');
  if (!timerEl) return;

  function tick(){
    const ms = FECHA_ENTREGA - new Date();
    if (ms <= 0){
      clearInterval(countdownTimer);
      verificarEntrega();
      return;
    }
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    timerEl.innerHTML = `
      <div class="bo-timer-unit"><span class="num">${d}</span><span class="unit">Días</span></div>
      <div class="bo-timer-unit"><span class="num">${h}</span><span class="unit">Hrs</span></div>
      <div class="bo-timer-unit"><span class="num">${m}</span><span class="unit">Min</span></div>
    `;
  }
  tick();
  countdownTimer = setInterval(tick, 60000);
}

function lanzarConfetti(){
  if (!window.confetti) return;
  const duration = 3000;
  const end = Date.now() + duration;
  (function frame(){
    const timeLeft = end - Date.now();
    if (timeLeft <= 0) return;
    const particleCount = 50 * (timeLeft / duration);
    confetti({ particleCount, spread: 360, startVelocity: 30, ticks: 60, zIndex: 9999, origin: { x: Math.random() * 0.2 + 0.1, y: Math.random() - 0.2 } });
    confetti({ particleCount, spread: 360, startVelocity: 30, ticks: 60, zIndex: 9999, origin: { x: Math.random() * 0.2 + 0.7, y: Math.random() - 0.2 } });
    requestAnimationFrame(frame);
  })();
}

function ganadorCardHtml(ganador, candidatos, fecha, isCeremonia){
  const finalistas = candidatos.slice(1, 3);
  return `
    <div class="ceremony">
      <div class="ceremony-trophy">🏆</div>
      <h3 class="ceremony-title">${isCeremonia ? '¡Balón de Oro otorgado!' : 'Balón de Oro 2027'}</h3>
      <p class="ceremony-date">Otorgado el ${fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div class="winner-card">
        <div class="winner-badge">👑 Ganador</div>
        <div class="winner-name">${ganador.nombre}</div>
        <div class="winner-stats">
          <div class="winner-stat"><i data-lucide="target" class="icon-sm"></i><span>${ganador.goles} goles</span></div>
          <div class="winner-stat"><i data-lucide="crosshair" class="icon-sm"></i><span>${ganador.asistencias} asistencias</span></div>
          <div class="winner-stat"><i data-lucide="star" class="icon-sm"></i><span>${ganador.puntaje} pts</span></div>
          <div class="winner-stat"><i data-lucide="flame" class="icon-sm"></i><span>${ganador.hattricks} hat-tricks</span></div>
        </div>
        <div class="winner-pct">
          <span class="big">${(ganador.probabilidad || 0).toFixed(1)}%</span>
          <span class="small">Probabilidad final</span>
        </div>
      </div>

      ${finalistas.length ? `
        <div class="finalists-list">
          <h3 class="modal-section-title"><i data-lucide="award" class="icon-sm"></i> Finalistas</h3>
          ${finalistas.map((c, i) => `
            <div class="finalist-item">
              <span class="finalist-medal">${i === 0 ? '🥈' : '🥉'}</span>
              <span class="finalist-name">${c.nombre}</span>
              <span class="finalist-stats">${c.goles}G · ${c.asistencias}A</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function verificarEntrega(){
  const container = document.getElementById('balonoro-content');
  if (!container) return;
  const ahora = new Date();

  if (ahora < FECHA_ENTREGA){
    renderProbabilidades(container);
    return;
  }

  const yaOtorgado = localStorage.getItem(LS_OTORGADO);

  if (!yaOtorgado){
    const candidatos = calcularCandidatos();
    if (candidatos.length){
      const ganador = candidatos[0];
      localStorage.setItem(LS_GANADOR, JSON.stringify(ganador));
      localStorage.setItem(LS_CANDIDATOS, JSON.stringify(candidatos.slice(0, 3)));
      localStorage.setItem(LS_OTORGADO, 'true');
      localStorage.setItem(LS_FECHA, ahora.toISOString());
      container.innerHTML = ganadorCardHtml(ganador, candidatos, ahora, true);
      lanzarConfetti();
    } else {
      renderProbabilidades(container);
      return;
    }
  } else {
    const ganador = JSON.parse(localStorage.getItem(LS_GANADOR));
    const candidatos = JSON.parse(localStorage.getItem(LS_CANDIDATOS) || '[]');
    const fecha = new Date(localStorage.getItem(LS_FECHA) || ahora.toISOString());
    container.innerHTML = ganadorCardHtml(ganador, candidatos, fecha, false);
  }
  refreshIcons();
}

export function renderBalonOro(){
  verificarEntrega();
}
