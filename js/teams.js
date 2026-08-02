/* ==========================================================
   teams.js — Comparativa Equipo E vs Equipo B
   ========================================================== */
import { state, refreshIcons } from './state.js?v=2.1.0';

function initials(nombre){
  return nombre.replace(/\(.*?\)/g, '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function bestAverage(jugadores){
  return [...jugadores].sort((a, b) => b.puntaje - a.puntaje)[0];
}

export function renderEquipos(){
  const eJugadores = state.jugadores.filter(j => j.equipo === 'E');
  const bJugadores = state.jugadores.filter(j => j.equipo === 'B');

  document.getElementById('e-count').textContent = `${eJugadores.length} jugador${eJugadores.length === 1 ? '' : 'es'}`;
  document.getElementById('b-count').textContent = `${bJugadores.length} jugador${bJugadores.length === 1 ? '' : 'es'}`;

  const sum = (arr, key) => arr.reduce((s, j) => s + (j[key] || 0), 0);

  const rows = [
    { label: 'Goles', e: sum(eJugadores, 'goles'), b: sum(bJugadores, 'goles') },
    { label: 'Asistencias', e: sum(eJugadores, 'asistencias'), b: sum(bJugadores, 'asistencias') },
    { label: 'Hat-tricks', e: sum(eJugadores, 'hattricks'), b: sum(bJugadores, 'hattricks') },
    { label: 'Puntaje acumulado', e: Number(sum(eJugadores, 'puntaje').toFixed(1)), b: Number(sum(bJugadores, 'puntaje').toFixed(1)) },
  ];

  const diffGoles = rows[0].e - rows[0].b;
  const diffLabel = diffGoles === 0 ? 'Empate en goles' : diffGoles > 0
    ? `Equipo E domina por ${diffGoles} gol${diffGoles === 1 ? '' : 'es'}`
    : `Equipo B domina por ${Math.abs(diffGoles)} gol${Math.abs(diffGoles) === 1 ? '' : 'es'}`;

  document.getElementById('hero-e-goles').textContent = rows[0].e;
  document.getElementById('hero-b-goles').textContent = rows[0].b;
  document.getElementById('hero-sub').textContent = diffLabel;

  document.getElementById('compare-card').innerHTML = rows.map(r => {
    const total = r.e + r.b || 1;
    const pctE = (r.e / total) * 100;
    return `
      <div class="compare-row">
        <span class="compare-value team-e">${r.e}</span>
        <span class="compare-label">${r.label}</span>
        <span class="compare-value team-b">${r.b}</span>
        <div class="compare-bar">
          <div class="compare-bar-fill team-e" style="width:${pctE}%"></div>
          <div class="compare-bar-fill team-b" style="width:${100 - pctE}%"></div>
        </div>
      </div>
    `;
  }).join('');

  const mvpE = eJugadores.length ? bestAverage(eJugadores) : null;
  const mvpB = bJugadores.length ? bestAverage(bJugadores) : null;

  const mvpHtml = (j, team) => j ? `
    <div class="mvp-avatar team-${team}">${initials(j.nombre)}</div>
    <div class="mvp-info">
      <div class="mvp-name">${j.nombre}</div>
      <div class="mvp-sub">${j.puntaje} pts · ${j.goles}G ${j.asistencias}A</div>
    </div>
  ` : `<div class="mvp-info"><div class="mvp-sub">Sin datos aún</div></div>`;

  document.getElementById('mvp-e').innerHTML = mvpHtml(mvpE, 'e');
  document.getElementById('mvp-b').innerHTML = mvpHtml(mvpB, 'b');

  refreshIcons();
}
