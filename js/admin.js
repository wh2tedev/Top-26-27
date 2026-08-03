/* ==========================================================
   admin.js — Acceso protegido + panel avanzado.

   Importante sobre "partidos jugados": a diferencia de las
   estadísticas por jugador (que se pueden previsualizar
   localmente vía overrides en localStorage), los partidos
   jugados por equipo SOLO se guardan si hay un data.json real
   conectado. No existe una simulación local silenciosa para
   este campo — si no conectas el archivo, no se guarda en
   ningún lado y te lo decimos explícitamente.

   Seguridad de la contraseña: vive en el frontend (sin
   servidor), así que es un freno para curiosos, no una medida
   de seguridad real. Para cambiarla:
   1) Elige tu nueva contraseña.
   2) En la consola del navegador ejecuta:
      crypto.subtle.digest('SHA-256', new TextEncoder().encode('tu-clave'))
        .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
   3) Reemplaza PASSWORD_HASH abajo con el resultado.
   ========================================================== */
import { state } from './state.js?v=2.1.0';
import {
  saveOverride, clearOverrides, positionGroup, processDataset,
  supportsFileSystemAccess, hasConnectedFile, connectedFileName, connectDataFile, writeDataFile,
} from './data.js?v=2.1.0';
import { SEASON, getStoredGanador } from './balonoro.js?v=2.1.0';

const PASSWORD_HASH = 'b2835525f88a24f857c5f60961fb02e377d37b5b85e811a42edac95fd775b870'; // "golazo2027"
const AUTH_KEY = 'admin_authed_v1';

async function sha256Hex(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {(rawJugadores: any[], rawPartidos: {E:number,B:number}) => void} applyLocal
 *        Reprocesa (overrides + stats) y re-renderiza la app SIN volver a pedir data.json por red.
 * @param {() => Promise<void>} reloadFromNetwork
 *        Vuelve a pedir data.json real y descarta cualquier edición local no guardada.
 * @param {() => void} closeSidebar
 */
export function initAdmin(applyLocal, reloadFromNetwork, closeSidebar){
  const overlay = document.getElementById('admin-overlay');
  const openBtn = document.getElementById('btn-admin');
  const closeBtn = document.getElementById('admin-close');
  const saveBtn = document.getElementById('admin-save');
  const resetBtn = document.getElementById('admin-reset');
  const exportBtn = document.getElementById('admin-export');
  const importBtn = document.getElementById('admin-import');
  const importFile = document.getElementById('admin-import-file');
  const playersWrap = document.getElementById('admin-players');
  const inputE = document.getElementById('admin-partidos-e');
  const inputB = document.getElementById('admin-partidos-b');
  const partidosHint = document.getElementById('admin-partidos-hint');

  const connectBtn = document.getElementById('admin-connect-file');
  const fileStatus = document.getElementById('admin-file-status');
  const boCallout = document.getElementById('admin-bo-callout');

  const pwOverlay = document.getElementById('password-overlay');
  const pwInput = document.getElementById('password-input');
  const pwForm = document.getElementById('password-form');
  const pwError = document.getElementById('password-error');
  const pwClose = document.getElementById('password-close');

  function fieldsFor(j){
    const base = [
      ['goles', 'Goles'],
      ['asistencias', 'Asist.'],
      ['hattricks', 'HT'],
    ];
    const grupo = positionGroup(j.posicion);
    if (grupo === 'POR') base.push(['salvadas', 'Salv.']);
    else if (grupo === 'DFC') base.push(['bloqueos', 'Bloq.']);
    return base;
  }

  function renderPlayers(){
    playersWrap.innerHTML = state.jugadores.map(j => `
      <div class="admin-player-row" data-id="${j.id}">
        <div class="admin-player-name">${j.nombre} <span style="color:var(--muted);">· ${j.posicion} · Equipo ${j.equipo}</span></div>
        <div class="admin-fields">
          ${fieldsFor(j).map(([key, label]) => `
            <div class="field">
              <label>${label}</label>
              <input type="number" min="0" data-key="${key}" value="${j[key] ?? 0}" />
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  function updatePartidosUI(){
    inputE.value = state.partidos.E;
    inputB.value = state.partidos.B;
  }

  function updateFileStatus(){
    if (!supportsFileSystemAccess()){
      fileStatus.textContent = '⚪ Tu navegador no soporta guardado directo — usa exportar/importar y reemplaza el archivo a mano.';
      connectBtn.style.display = 'none';
      partidosHint.textContent = 'Los partidos jugados no se pueden guardar en este navegador: expórtalos e impórtalos manualmente en tu data.json.';
      return;
    }
    connectBtn.style.display = '';
    if (hasConnectedFile()){
      fileStatus.textContent = `🟢 Conectado a "${connectedFileName()}". Al guardar se escribe ahí directamente.`;
      partidosHint.textContent = '';
    } else {
      fileStatus.textContent = '⚪ Sin conectar: las estadísticas de jugadores se pueden previsualizar localmente, pero los partidos jugados NO se guardarán en ningún lado hasta que conectes tu data.json real.';
      partidosHint.textContent = 'Conecta tu data.json real para poder guardar los partidos jugados.';
    }
  }

  function renderBoCallout(){
    const ganador = getStoredGanador();
    const jugador = ganador ? state.jugadores.find(j => j.id === ganador.id) : null;
    const yaGuardado = jugador && (jugador.balonesDeOro || []).includes(SEASON);

    if (!ganador || !jugador || yaGuardado){
      boCallout.innerHTML = '';
      return;
    }

    boCallout.innerHTML = `
      <div class="admin-bo-alert">
        <i data-lucide="trophy" class="icon"></i>
        <div class="admin-bo-alert-text">
          <strong>🏆 Balón de Oro ${SEASON} otorgado a ${jugador.nombre}</strong>
          <span>Todavía no es permanente en tu data.json. Guárdalo para que quede en su ficha para siempre.</span>
        </div>
        <button class="btn btn-primary" id="admin-bo-save-btn">Añadir insignia</button>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    document.getElementById('admin-bo-save-btn').addEventListener('click', () => awardBalonDeOroBadge(jugador.id));
  }

  async function awardBalonDeOroBadge(jugadorId){
    const raw = state.rawJugadores.find(j => j.id === jugadorId);
    if (!raw) return;
    const nuevasTemporadas = [...new Set([...(raw.balonesDeOro || []), SEASON])];
    saveOverride(jugadorId, { balonesDeOro: nuevasTemporadas });

    const updatedRaw = state.rawJugadores.map(j => j.id === jugadorId ? { ...j, balonesDeOro: nuevasTemporadas } : j);

    if (hasConnectedFile()){
      try{
        await writeDataFile(updatedRaw, state.partidos);
        fileStatus.textContent = '✅ Insignia de Balón de Oro guardada directamente en tu data.json.';
      }catch(err){
        fileStatus.textContent = '⚠️ No se pudo escribir el archivo: ' + err.message;
      }
    } else if (supportsFileSystemAccess()){
      try{
        await connectDataFile();
        await writeDataFile(updatedRaw, state.partidos);
        fileStatus.textContent = `✅ Conectado a "${connectedFileName()}" y la insignia quedó guardada.`;
      }catch(err){
        if (err.name !== 'AbortError'){
          fileStatus.textContent = '⚠️ No se pudo conectar/escribir el archivo: ' + err.message;
        }
      }
    } else {
      alert('Tu navegador no soporta guardar directamente. La insignia quedó previsualizada localmente — exporta el JSON para hacerla permanente.');
    }

    applyLocal(updatedRaw, state.partidos);
    renderBoCallout();
    updateFileStatus();
  }

  function openAdminPanel(){
    updatePartidosUI();
    renderPlayers();
    updateFileStatus();
    renderBoCallout();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function closeAdminPanel(){
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function openPassword(){
    pwError.textContent = '';
    pwInput.value = '';
    pwOverlay.classList.add('open');
    pwOverlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => pwInput.focus(), 200);
  }

  function closePassword(){
    pwOverlay.classList.remove('open');
    pwOverlay.setAttribute('aria-hidden', 'true');
  }

  openBtn.addEventListener('click', () => {
    if (typeof closeSidebar === 'function') closeSidebar();
    if (sessionStorage.getItem(AUTH_KEY) === 'true'){
      openAdminPanel();
    } else {
      openPassword();
    }
  });

  closeBtn.addEventListener('click', closeAdminPanel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAdminPanel(); });

  pwClose.addEventListener('click', closePassword);
  pwOverlay.addEventListener('click', (e) => { if (e.target === pwOverlay) closePassword(); });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (pwOverlay.classList.contains('open')) closePassword();
    else if (overlay.classList.contains('open')) closeAdminPanel();
  });

  pwForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hash = await sha256Hex(pwInput.value.trim());
    if (hash === PASSWORD_HASH){
      sessionStorage.setItem(AUTH_KEY, 'true');
      closePassword();
      openAdminPanel();
    } else {
      pwError.textContent = 'Contraseña incorrecta. Inténtalo de nuevo.';
      pwInput.value = '';
      pwInput.focus();
    }
  });

  function collectPlayerPatches(){
    const patches = {};
    playersWrap.querySelectorAll('.admin-player-row').forEach(row => {
      const id = row.dataset.id;
      const patch = {};
      row.querySelectorAll('input[data-key]').forEach(input => {
        patch[input.dataset.key] = Number(input.value) || 0;
      });
      patches[id] = patch;
    });
    return patches;
  }

  async function doSave(){
    const patches = collectPlayerPatches();
    const newPartidos = { E: Number(inputE.value) || 0, B: Number(inputB.value) || 0 };

    // Guarda cada stat de jugador como override local (previsualización, siempre disponible)
    Object.entries(patches).forEach(([id, patch]) => saveOverride(id, patch));

    // Construye el dataset crudo actualizado (base + ediciones) para escribirlo tal cual al archivo
    const updatedRaw = state.rawJugadores.map(j => {
      const id = j.id;
      return patches[id] ? { ...j, ...patches[id] } : j;
    });

    if (hasConnectedFile()){
      try{
        await writeDataFile(updatedRaw, newPartidos);
        fileStatus.textContent = '✅ data.json actualizado directamente — partidos y estadísticas guardados de verdad.';
        applyLocal(updatedRaw, newPartidos);
        closeAdminPanel();
        return;
      }catch(err){
        fileStatus.textContent = '⚠️ No se pudo escribir el archivo: ' + err.message;
        return;
      }
    }

    // No hay archivo conectado: si el navegador lo soporta, intentamos conectar ahora mismo
    if (supportsFileSystemAccess()){
      try{
        await connectDataFile();
        await writeDataFile(updatedRaw, newPartidos);
        fileStatus.textContent = `✅ Conectado a "${connectedFileName()}" y guardado directamente.`;
        applyLocal(updatedRaw, newPartidos);
        closeAdminPanel();
      }catch(err){
        if (err.name === 'AbortError'){
          alert('No se guardó nada: los partidos jugados necesitan un data.json real conectado. Tus cambios de estadísticas de jugadores sí quedaron previsualizados localmente.');
          applyLocal(state.rawJugadores, state.partidos); // solo reaplica overrides de jugadores, partidos sin cambios
        } else {
          fileStatus.textContent = '⚠️ No se pudo conectar/escribir el archivo: ' + err.message;
        }
      }
    } else {
      alert('Tu navegador no soporta guardar directamente. Los partidos jugados NO se guardaron. Usa "Exportar JSON", reemplaza tu data.json manualmente y súbelo. Las estadísticas de jugadores sí quedaron previsualizadas localmente.');
      applyLocal(state.rawJugadores, state.partidos);
    }
  }

  saveBtn.addEventListener('click', doSave);

  resetBtn.addEventListener('click', async () => {
    clearOverrides();
    closeAdminPanel();
    await reloadFromNetwork();
  });

  connectBtn.addEventListener('click', async () => {
    try{
      const name = await connectDataFile();
      fileStatus.textContent = `🟢 Conectado a "${name}". Al guardar, se escribirá directamente ahí.`;
      partidosHint.textContent = '';
    }catch(err){
      if (err.name !== 'AbortError'){
        fileStatus.textContent = '⚠️ No se pudo conectar el archivo: ' + err.message;
      }
    }
  });

  exportBtn.addEventListener('click', () => {
    const patches = collectPlayerPatches();
    const updatedRaw = state.rawJugadores.map(j => patches[j.id] ? { ...j, ...patches[j.id] } : j);
    const newPartidos = { E: Number(inputE.value) || 0, B: Number(inputB.value) || 0 };
    const payload = { partidos: newPartidos, jugadores: updatedRaw };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', () => importFile.click());

  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try{
      const text = await file.text();
      const parsed = JSON.parse(text);
      const jugadoresRaw = Array.isArray(parsed) ? parsed : (parsed.jugadores || []);
      const partidosRaw = Array.isArray(parsed) ? state.partidos : (parsed.partidos || state.partidos);
      if (!Array.isArray(jugadoresRaw)) throw new Error('Formato inválido');

      jugadoresRaw.forEach(j => {
        const id = j.id || (j.nombre ? j.nombre.toLowerCase() : null);
        if (id) saveOverride(id, j);
      });

      applyLocal(jugadoresRaw, partidosRaw);
      closeAdminPanel();
    }catch(err){
      alert('No se pudo importar el archivo: ' + err.message);
    }
    importFile.value = '';
  });

  return { open: openAdminPanel, close: closeAdminPanel };
}
