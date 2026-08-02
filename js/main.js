/* ==========================================================
   main.js — Punto de entrada de la aplicación
   ========================================================== */
import { state, refreshIcons } from './state.js?v=2.1.0';
import { fetchRawData, processDataset, computeBadges } from './data.js?v=2.1.0';
import { initTheme, initSidebar } from './theme.js?v=2.1.0';
import { initNav } from './nav.js?v=2.1.0';
import { initSearch } from './search.js?v=2.1.0';
import { ordenar, renderRanking, renderJugadorSemana, renderStatsGlobales } from './render.js?v=2.1.0';
import { renderEquipos } from './teams.js?v=2.1.0';
import { renderBalonOro } from './balonoro.js?v=2.1.0';
import { initModal } from './modal.js?v=2.1.0';
import { initAdmin } from './admin.js?v=2.1.0';
import { initTrailer } from './trailer.js?v=2.1.0';

async function bootstrap(){
  initTrailer();
  initTheme();
  const sidebar = initSidebar();
  const modal = initModal();

  const orderSelect = document.getElementById('select-orden');
  const medalsSwitch = document.getElementById('switch-medallas');
  state.orden = localStorage.getItem('ordenRanking') || 'puntaje';
  state.medallas = localStorage.getItem('mostrarMedallas') === 'true';
  orderSelect.value = state.orden;
  medalsSwitch.checked = state.medallas;

  function repaintRanking(){
    ordenar();
    renderRanking(modal.open);
  }

  const search = initSearch(repaintRanking);

  orderSelect.addEventListener('change', () => {
    state.orden = orderSelect.value;
    localStorage.setItem('ordenRanking', state.orden);
    repaintRanking();
  });

  medalsSwitch.addEventListener('change', () => {
    state.medallas = medalsSwitch.checked;
    localStorage.setItem('mostrarMedallas', state.medallas);
    renderRanking(modal.open);
  });

  /** Repinta toda la app a partir de lo que ya está en memoria (state) */
  function renderAll(){
    state.badges = computeBadges(state.jugadores);
    state.filtrados = [...state.jugadores];
    search.apply();
    renderJugadorSemana();
    renderStatsGlobales();
    renderEquipos();
    renderBalonOro();
    refreshIcons();
  }

  /** Reprocesa (overrides + fórmulas) un dataset crudo ya en memoria — SIN red.
   *  Se usa justo después de guardar en el panel avanzado. */
  function applyLocal(jugadoresRaw, partidosRaw){
    state.rawJugadores = jugadoresRaw;
    const processed = processDataset(jugadoresRaw, partidosRaw);
    state.jugadores = processed.jugadores;
    state.partidos = processed.partidos;
    renderAll();
  }

  /** Vuelve a pedir data.json por red — descarta ediciones locales no guardadas */
  async function reloadFromNetwork(){
    try{
      const { jugadoresRaw, partidosRaw } = await fetchRawData();
      applyLocal(jugadoresRaw, partidosRaw);
    }catch(err){
      console.error(err);
      document.getElementById('player-list').innerHTML = `<div class="no-results"><p>No se pudo cargar data.json</p></div>`;
    }
  }

  initAdmin(applyLocal, reloadFromNetwork, sidebar.close);
  initNav((name) => {
    if (name === 'equipos') renderEquipos();
    if (name === 'balonoro') renderBalonOro();
    if (name === 'stats') renderStatsGlobales();
  });

  await reloadFromNetwork();
  refreshIcons();
}

document.addEventListener('DOMContentLoaded', bootstrap);
