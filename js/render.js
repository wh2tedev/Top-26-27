/* ==========================================================
   render.js — Ranking, jugador de la semana y stats globales
   ========================================================== */
import { state, refreshIcons } from './state.js?v=2.1.0';
import { positionGroup, positionLabel, GROUP_LABEL, GROUP_ICON, GROUPS } from './data.js?v=2.1.0';

export function ordenar(){
  state.filtrados.sort((a, b) => (b[state.orden] || 0) - (a[state.orden] || 0));
}

export function renderRanking(onPlayerClick){
  const list = document.getElementById('player-list');
  list.innerHTML = '';

  if (!state.filtrados.length){
    list.innerHTML = `
      <div class="no-results">
        <i data-lucide="search-x" class="icon-lg"></i>
        <p>No se encontraron jugadores</p>
        <p style="font-size:12.5px;">Prueba con otro filtro o búsqueda</p>
      </div>`;
    refreshIcons();
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];

  state.filtrados.forEach((j, idx) => {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    const rankHtml = (state.medallas && idx < 3)
      ? `<span class="player-rank medal">${medals[idx]}</span>`
      : `<span class="player-rank">${idx + 1}</span>`;

    const niceScore = Number.isInteger(j.puntaje) ? j.puntaje : j.puntaje.toFixed(1);

    card.innerHTML = `
      ${rankHtml}
      <span class="player-team-bar ${j.equipo === 'E' ? 'team-e' : 'team-b'}"></span>
      <div class="player-main">
        <div class="player-name">${j.nombre}</div>
        <div class="player-meta">
          <span class="pos-badge" title="${positionLabel(j.posicion)}">${j.posicion}</span>
          <span>·</span>
          <span>${j.equipo}</span>
          <span>·</span>
          <span>${j.goles}G ${j.asistencias}A</span>
        </div>
      </div>
      <span class="player-score"><i data-lucide="star" class="icon-sm"></i>${niceScore}</span>
    `;

    card.addEventListener('click', () => onPlayerClick(j));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); onPlayerClick(j); }
    });

    list.appendChild(card);
  });

  refreshIcons();
}

export function renderJugadorSemana(){
  const el = document.getElementById('jugador-semana-card');
  if (!state.jugadores.length){
    el.innerHTML = `<p style="color:var(--muted); font-size:13px;">No hay jugadores.</p>`;
    return;
  }

  const conSemana = state.jugadores.map(j => {
    const s = j.semana || {};
    const golesS = s.goles || 0, asiS = s.asistencias || 0, hatS = s.hattricks || 0;
    const salvS = s.salvadas || 0, bloqS = s.bloqueos || 0;
    let puntajeSemana;
    const grupo = positionGroup(j.posicion);
    if (grupo === 'POR') puntajeSemana = (golesS * 2) + asiS + (salvS * 0.5);
    else if (grupo === 'DFC') puntajeSemana = (golesS * 2) + asiS + (bloqS * 0.5);
    else puntajeSemana = (golesS * 2) + asiS + (hatS * 3);
    return { ...j, puntajeSemana: Number(puntajeSemana.toFixed(2)), semanaObj: s };
  });

  const top = conSemana.sort((a, b) => (b.puntajeSemana || 0) - (a.puntajeSemana || 0))[0];

  el.innerHTML = `
    <div style="display:flex; align-items:center; gap:14px;">
      <div style="width:44px;height:44px;border-radius:12px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i data-lucide="medal" class="icon-lg" style="color:var(--accent);"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;">Jugador de la semana</div>
        <div style="font-weight:700; font-size:15.5px;">${top.nombre}</div>
        <div style="font-size:12px;color:var(--muted);">⭐ ${top.puntajeSemana} pts · ⚽ ${top.semanaObj?.goles || 0} · 🎯 ${top.semanaObj?.asistencias || 0}</div>
      </div>
    </div>
  `;
  refreshIcons();
}

function animateValue(el, end, duration = 900){
  const start = 0;
  const t0 = performance.now();
  function tick(now){
    const p = Math.min(1, (now - t0) / duration);
    el.textContent = Math.floor(start + (end - start) * p);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function renderStatsGlobales(){
  const goles = state.jugadores.reduce((s, j) => s + j.goles, 0);
  const asistencias = state.jugadores.reduce((s, j) => s + j.asistencias, 0);
  const hattricks = state.jugadores.reduce((s, j) => s + (j.hattricks || 0), 0);

  animateValue(document.getElementById('total-goles'), goles);
  animateValue(document.getElementById('total-asistencias'), asistencias);
  animateValue(document.getElementById('total-jugadores'), state.jugadores.length);
  animateValue(document.getElementById('total-hattricks'), hattricks);

  const e = state.jugadores.find(j => j.equipo === 'E');
  const b = state.jugadores.find(j => j.equipo === 'B');
  document.getElementById('partidos-e').textContent = e ? e.partidos : 0;
  document.getElementById('partidos-b').textContent = b ? b.partidos : 0;

  const cont = document.getElementById('top-categorias');
  cont.innerHTML = GROUPS.map(grupo => {
    const top5 = state.jugadores
      .filter(j => positionGroup(j.posicion) === grupo)
      .sort((a, b) => b.puntaje - a.puntaje)
      .slice(0, 3);
    if (!top5.length) return '';
    return `
      <div class="card" style="margin-bottom:12px;">
        <h3 class="modal-section-title"><i data-lucide="${GROUP_ICON[grupo]}" class="icon-sm"></i> ${GROUP_LABEL[grupo]}</h3>
        ${top5.map((j, i) => `
          <div style="display:flex; justify-content:space-between; padding:7px 0; ${i < top5.length - 1 ? 'border-bottom:1px solid var(--border);' : ''} font-size:13px;">
            <span>${i + 1}. ${j.nombre} <span style="color:var(--muted); font-size:11px;">(${j.posicion})</span></span>
            <span style="font-family:var(--font-mono); color:var(--accent); font-weight:600;">${j.puntaje}</span>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');

  refreshIcons();
}
