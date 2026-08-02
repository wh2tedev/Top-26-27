/* ==========================================================
   modal.js — Tarjeta de jugador flotante (estilo FUT)
   ========================================================== */
import { state, refreshIcons } from './state.js?v=2.1.0';
import { positionGroup, positionLabel } from './data.js?v=2.1.0';

export function initModal(){
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');

  function close(){
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  function open(jugador){
    render(jugador);
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function render(j){
    const body = document.getElementById('modal-body');
    const team = j.equipo === 'E' ? 'team-e' : 'team-b';
    const niceScore = Number.isInteger(j.puntaje) ? j.puntaje : j.puntaje.toFixed(1);
    const s = j.semana || {};

    let extraStat = '';
    const grupo = positionGroup(j.posicion);
    if (grupo === 'POR') extraStat = `<div class="modal-stat"><i data-lucide="hand" class="icon-sm"></i><span class="modal-stat-value">${j.salvadas}</span><span class="modal-stat-label">Salvadas</span></div>`;
    else if (grupo === 'DFC') extraStat = `<div class="modal-stat"><i data-lucide="shield" class="icon-sm"></i><span class="modal-stat-value">${j.bloqueos}</span><span class="modal-stat-label">Bloqueos</span></div>`;
    else extraStat = `<div class="modal-stat"><i data-lucide="flame" class="icon-sm"></i><span class="modal-stat-value">${j.hattricks}</span><span class="modal-stat-label">Hat-tricks</span></div>`;

    const badges = state.badges[j.id] || [];
    const badgesHtml = badges.length
      ? `<div class="badges-row">${badges.map(b => `<span class="badge-chip"><i data-lucide="${b.icon}" class="icon-sm"></i>${b.label}</span>`).join('')}</div>`
      : `<p class="badge-empty">Sin insignias todavía — ¡a por ellas!</p>`;

    const weekPct = j.goles > 0 ? Math.min(100, ((s.goles || 0) / j.goles) * 100) : 0;

    body.innerHTML = `
      <div class="player-card-hero ${team}">
        <div class="player-card-team">${j.equipo} · ${positionLabel(j.posicion)}</div>
        <div class="player-card-score">${niceScore}</div>
        <div class="player-card-score-label">Puntaje total</div>
        <div class="player-card-name">${j.nombre.replace(/\s*\(.*?\)\s*/, '')}</div>
        <span class="player-card-pos">${j.posicion}</span>
      </div>

      <div class="modal-stat-grid">
        <div class="modal-stat"><i data-lucide="target" class="icon-sm"></i><span class="modal-stat-value">${j.goles}</span><span class="modal-stat-label">Goles</span></div>
        <div class="modal-stat"><i data-lucide="crosshair" class="icon-sm"></i><span class="modal-stat-value">${j.asistencias}</span><span class="modal-stat-label">Asist.</span></div>
        ${extraStat}
      </div>

      <div class="modal-section-title"><i data-lucide="trending-up" class="icon-sm"></i> Rendimiento reciente</div>
      <div class="week-compare">
        <div class="week-bar-group">
          <div class="week-bar-labels"><span>Goles (semana)</span><span>${s.goles || 0}</span></div>
          <div class="week-bar-track"><div class="week-bar-fill week" style="width:${weekPct}%"></div></div>
        </div>
        <div class="week-bar-group">
          <div class="week-bar-labels"><span>G/P temporada</span><span>${j.gp.toFixed(2)}</span></div>
          <div class="week-bar-track"><div class="week-bar-fill" style="width:${Math.min(100, j.gp * 100)}%"></div></div>
        </div>
      </div>

      <div class="modal-section-title"><i data-lucide="award" class="icon-sm"></i> Insignias</div>
      ${badgesHtml}
    `;
    refreshIcons();
  }

  return { open, close };
}
