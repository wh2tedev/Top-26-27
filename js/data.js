/* ==========================================================
   data.js — Carga, normaliza y calcula todas las estadísticas
   derivadas de cada jugador. Aquí vive la única fuente de
   verdad sobre las fórmulas de puntaje y el mapa de posiciones.
   ========================================================== */

const OVERRIDES_KEY = 'fyefya_overrides_v4';

/** Mapa completo de posiciones (código -> etiqueta + grupo táctico + ícono).
 *  El grupo determina qué fórmula de puntaje aplica:
 *  POR (portero) usa salvadas, DFC (defensas) usa bloqueos,
 *  MED y DEL usan hat-tricks. */
export const POSITIONS = {
  GK:  { label: 'Portero',                group: 'POR', icon: 'hand' },
  CB:  { label: 'Defensa central',        group: 'DFC', icon: 'shield-check' },
  LB:  { label: 'Lateral izquierdo',      group: 'DFC', icon: 'shield-check' },
  RB:  { label: 'Lateral derecho',        group: 'DFC', icon: 'shield-check' },
  CDM: { label: 'Mediocentro defensivo',  group: 'MED', icon: 'shield' },
  CM:  { label: 'Mediocentro',            group: 'MED', icon: 'circle-dot' },
  CAM: { label: 'Mediapunta',             group: 'MED', icon: 'sparkles' },
  LW:  { label: 'Extremo izquierdo',      group: 'DEL', icon: 'zap' },
  RW:  { label: 'Extremo derecho',        group: 'DEL', icon: 'zap' },
  CF:  { label: 'Delantero centro',       group: 'DEL', icon: 'target' },
  ST:  { label: 'Delantero',              group: 'DEL', icon: 'target' },
};

export const GROUP_LABEL = { POR: 'Porteros', DFC: 'Defensas', MED: 'Mediocampo', DEL: 'Ataque' };
export const GROUP_ICON = { POR: 'hand', DFC: 'shield-check', MED: 'circle-dot', DEL: 'zap' };
export const GROUPS = ['POR', 'DFC', 'MED', 'DEL'];

export function positionGroup(codigo){
  return POSITIONS[codigo]?.group || 'DEL';
}

export function positionLabel(codigo){
  return POSITIONS[codigo]?.label || codigo || 'Sin posición';
}

/** Arquetipos: insignia PERMANENTE de identidad de juego (se define a mano en
 *  data.json, campo "arquetipo" — no se calcula con estadísticas). Agrupados
 *  por bloque táctico solo como referencia; no se valida contra la posición
 *  real del jugador.
 *  Mediocampo y Ataque comparten el mismo grupo ("MED_DEL") porque en la
 *  práctica sus estilos de juego se mezclan mucho (un CAM puede ser KILLER,
 *  un ST puede ser CREADOR DE JUGADAS, etc.) — los 8 arquetipos de ese
 *  bloque son compatibles entre sí para cualquier posición de ese bloque.
 *  Porteros y defensas se mantienen en su propio grupo aparte. */
export const ARCHETYPES = {
  'CAZA-GOLES':          { label: 'Caza-goles',          icon: 'target',        group: 'MED_DEL' },
  'KILLER':              { label: 'Killer',              icon: 'skull',         group: 'MED_DEL' },
  'REGATEADOR':          { label: 'Regateador',          icon: 'wind',          group: 'MED_DEL' },
  'VELOCISTA':           { label: 'Velocista',           icon: 'gauge',         group: 'MED_DEL' },
  'RECUPERADOR':         { label: 'Recuperador',         icon: 'shield',        group: 'MED_DEL' },
  'CREADOR DE JUGADAS':  { label: 'Creador de jugadas',  icon: 'sparkles',      group: 'MED_DEL' },
  'CALCULADOR':          { label: 'Calculador',          icon: 'brain',         group: 'MED_DEL' },
  'ASISTIDOR':           { label: 'Asistidor',           icon: 'send',          group: 'MED_DEL' },
  'HAGE':                { label: 'Hage',                icon: 'rocket',        group: 'MED_DEL' },
  'HAGE':                { label: 'Hage',                icon: 'rocket',        group: 'MED_DEL' },
  'MURALLA':             { label: 'Muralla',             icon: 'shield-check',  group: 'POR_DFC' },
  'RUDO':                { label: 'Rudo',                icon: 'swords',        group: 'POR_DFC' },
  'TODO TERRENO':        { label: 'Todo terreno',        icon: 'compass',       group: 'POR_DFC' },
  'INTERCEPTADOR':       { label: 'Interceptador',       icon: 'eye',           group: 'POR_DFC' },
};

/** Grupos de posición que pueden usar cualquier arquetipo de un bloque dado.
 *  MED y DEL comparten el mismo pool de arquetipos ("MED_DEL"); POR y DFC
 *  comparten el suyo ("POR_DFC"). Útil si en el futuro se agrega un selector
 *  de arquetipos filtrado por posición. */
export const ARCHETYPE_POOL_BY_POSITION_GROUP = {
  DEL: 'MED_DEL',
  MED: 'MED_DEL',
  POR: 'POR_DFC',
  DFC: 'POR_DFC',
};

/** Lista de arquetipos disponibles para un grupo de posición dado (ej. "MED" o "DEL"
 *  devuelven los mismos 8; "POR" o "DFC" devuelven los otros 4). */
export function archetypesForPositionGroup(posGroup){
  const pool = ARCHETYPE_POOL_BY_POSITION_GROUP[posGroup];
  return Object.entries(ARCHETYPES)
    .filter(([, meta]) => meta.group === pool)
    .map(([code, meta]) => ({ code, ...meta }));
}

/** Devuelve { label, icon, group } para un código de arquetipo, o null si no hay ninguno.
 *  Si el código no está en el catálogo, igual se muestra tal cual (con ícono genérico)
 *  para no perder datos si alguien escribe uno nuevo directamente en data.json. */
export function archetypeMeta(codigo){
  if (!codigo) return null;
  const key = codigo.toString().trim().toUpperCase();
  return ARCHETYPES[key] || { label: key, icon: 'star', group: null };
}

/** Normaliza el/los arquetipo(s) de un jugador a un array de códigos.
 *  Acepta: "arquetipos": ["KILLER","VELOCISTA"] (esquema actual, varios),
 *  o el campo antiguo "arquetipo": "KILLER" (un solo string, se migra solo). */
export function normalizeArquetipos(j){
  let arr = j.arquetipos;
  if (arr === undefined && j.arquetipo) arr = [j.arquetipo]; // migración del campo antiguo
  if (!Array.isArray(arr)) arr = arr ? [arr] : [];
  return arr
    .map(a => (a ?? '').toString().trim().toUpperCase())
    .filter(Boolean);
}

export function slugify(nombre){
  return nombre
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/\(.*?\)/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Acepta "E"/"B" (esquema actual) y migra automáticamente "FYE"/"FYA" (esquema anterior) */
export function normalizeEquipo(raw){
  const v = (raw ?? '').toString().trim().toUpperCase();
  if (v === 'FYE') return 'E';
  if (v === 'FYA') return 'B';
  if (v === 'E' || v === 'B') return v;
  return v || 'E';
}

export function normalizePartidos(raw){
  const p = raw || {};
  return { E: Number(p.E) || 0, B: Number(p.B) || 0 };
}

function getOverrides(){
  try{
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
  }catch(e){ return {}; }
}

export function saveOverride(id, patch){
  const overrides = getOverrides();
  overrides[id] = { ...(overrides[id] || {}), ...patch };
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

export function clearOverrides(){
  localStorage.removeItem(OVERRIDES_KEY);
}

/** Determina la posición: usa el campo explícito "posicion" si es un código válido,
 *  si no, la infiere del nombre (compatibilidad con datos antiguos POR/DFC). */
function resolvePosicion(j){
  if (j.posicion){
    const p = j.posicion.toString().trim().toUpperCase();
    if (POSITIONS[p]) return p;
    if (p === 'POR') return 'GK';
    if (p === 'DFC') return 'CB';
    if (p === 'DEL') return 'CM';
  }
  if (j.nombre.includes('(POR)')) return 'GK';
  if (j.nombre.includes('(DFC)')) return 'CB';
  return 'CM';
}

function computeStats(j, partidosCfg){
  j.goles = j.goles ?? 0;
  j.asistencias = j.asistencias ?? 0;
  j.hattricks = j.hattricks ?? 0;
  j.salvadas = j.salvadas ?? 0;
  j.bloqueos = j.bloqueos ?? 0;
  j.entradas = j.entradas ?? 0;
  j.semana = j.semana || {};
  j.id = j.id || slugify(j.nombre);
  j.equipo = normalizeEquipo(j.equipo);
  j.posicion = resolvePosicion(j);

  // Campos permanentes de identidad (no derivados de stats de la temporada)
  j.arquetipos = normalizeArquetipos(j);
  j.dorsal = (j.dorsal === undefined || j.dorsal === null || j.dorsal === '') ? null : j.dorsal;
  j.balonesDeOro = Array.isArray(j.balonesDeOro) ? j.balonesDeOro : [];

  const grupo = positionGroup(j.posicion);
  const partidos = j.equipo === 'E' ? partidosCfg.E : partidosCfg.B;
  j.partidos = partidos;
  j.gp = partidos > 0 ? j.goles / partidos : 0;
  j.ap = partidos > 0 ? j.asistencias / partidos : 0;
  j.ga = j.goles + j.asistencias;

  if (grupo === 'POR'){
    j.puntaje = (j.goles * 2) + j.asistencias + (j.salvadas * 0.5);
  } else if (grupo === 'DFC'){
    j.puntaje = (j.goles * 2) + j.asistencias + (j.bloqueos * 0.5);
  } else {
    j.puntaje = (j.goles * 2) + j.asistencias + (j.hattricks * 3);
  }
  j.puntaje = Number(j.puntaje.toFixed(2));

  return j;
}

/** Trae data.json en crudo, sin overrides ni stats calculadas.
 *  Acepta tanto el esquema nuevo {partidos, jugadores} como el
 *  esquema anterior (solo un array de jugadores). */
export async function fetchRawData(){
  const res = await fetch(`data.json?nocache=${Date.now()}`);
  if (!res.ok) throw new Error('No se pudo cargar data.json');
  const raw = await res.json();

  if (Array.isArray(raw)){
    return { jugadoresRaw: raw, partidosRaw: { E: 0, B: 0 } };
  }
  return { jugadoresRaw: raw.jugadores || [], partidosRaw: raw.partidos || { E: 0, B: 0 } };
}

/** Aplica overrides locales (localStorage) + calcula stats sobre un dataset crudo.
 *  Función pura: no toca la red, así que sirve tanto para la carga inicial
 *  como para refrescar la app tras una edición local sin re-hacer fetch. */
export function processDataset(jugadoresRaw, partidosRaw){
  const overrides = getOverrides();
  const jugadores = jugadoresRaw.map(j => {
    const id = j.id || slugify(j.nombre);
    return overrides[id] ? { ...j, ...overrides[id], id } : { ...j, id };
  });

  const partidos = normalizePartidos(partidosRaw);
  jugadores.forEach(j => computeStats(j, partidos));

  return { jugadores, partidos };
}

export async function loadAppData(){
  const { jugadoresRaw, partidosRaw } = await fetchRawData();
  return processDataset(jugadoresRaw, partidosRaw);
}

/** Insignias / logros dinámicos, calculados sobre el set completo de jugadores. Clave: j.id */
export function computeBadges(jugadores){
  const badges = {};
  jugadores.forEach(j => badges[j.id] = []);
  if (!jugadores.length) return badges;

  const maxGoles = Math.max(...jugadores.map(j => j.goles));
  const maxAsist = Math.max(...jugadores.map(j => j.asistencias));

  const defensas = jugadores.filter(j => positionGroup(j.posicion) === 'DFC');
  const maxBloqueos = defensas.length ? Math.max(...defensas.map(j => j.bloqueos)) : 0;

  const porteros = jugadores.filter(j => positionGroup(j.posicion) === 'POR');
  const maxSalvadas = porteros.length ? Math.max(...porteros.map(j => j.salvadas)) : 0;

  jugadores.forEach(j => {
    const b = badges[j.id];
    const grupo = positionGroup(j.posicion);
    if (j.hattricks >= 1) b.push({ label: 'Hat-trick Hero', icon: 'flame' });
    if (maxGoles > 0 && j.goles === maxGoles) b.push({ label: 'Máximo goleador', icon: 'target' });
    if (maxAsist > 0 && j.asistencias === maxAsist) b.push({ label: 'Rey de asistencias', icon: 'crosshair' });
    if (grupo === 'DFC' && maxBloqueos > 0 && j.bloqueos === maxBloqueos) b.push({ label: 'Muro defensivo', icon: 'shield-check' });
    if (grupo === 'POR' && maxSalvadas > 0 && j.salvadas === maxSalvadas) b.push({ label: 'Guardameta de hierro', icon: 'hand' });
  });

  return badges;
}

/* ==========================================================
   Escritura directa de data.json (File System Access API)
   Solo funciona en navegadores Chromium de escritorio/Android
   con soporte para showOpenFilePicker + FileSystemWritableFileStream.
   Es el ÚNICO mecanismo que persiste de verdad — nada se guarda
   "en el navegador" de forma silenciosa para partidos jugados.
   ========================================================== */
let connectedHandle = null;
let connectedName = null;

export function supportsFileSystemAccess(){
  return typeof window.showOpenFilePicker === 'function';
}

export function hasConnectedFile(){
  return !!connectedHandle;
}

export function connectedFileName(){
  return connectedName;
}

export async function connectDataFile(){
  if (!supportsFileSystemAccess()) throw new Error('Tu navegador no soporta esta función.');
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
    excludeAcceptAllOption: false,
  });
  connectedHandle = handle;
  connectedName = handle.name;
  return handle.name;
}

export function disconnectDataFile(){
  connectedHandle = null;
  connectedName = null;
}

const CALCULATED = new Set(['partidos', 'gp', 'ap', 'ga', 'puntaje']);

function stripCalculated(j){
  const copy = {};
  Object.keys(j).forEach(k => { if (!CALCULATED.has(k)) copy[k] = j[k]; });
  return copy;
}

export function toRawShape(jugadores, partidos){
  return {
    partidos: { E: Number(partidos.E) || 0, B: Number(partidos.B) || 0 },
    jugadores: jugadores.map(stripCalculated),
  };
}

/** Escribe { partidos, jugadores } directamente en el archivo conectado */
export async function writeDataFile(jugadores, partidos){
  if (!connectedHandle) throw new Error('No hay ningún archivo conectado.');
  const payload = toRawShape(jugadores, partidos);
  const writable = await connectedHandle.createWritable();
  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();
}
