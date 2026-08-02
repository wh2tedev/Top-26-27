/* ==========================================================
   state.js — Estado compartido en memoria de la aplicación
   ========================================================== */
export const state = {
  jugadores: [],       // dataset completo, ya con stats calculadas
  rawJugadores: [],     // dataset crudo (tal cual vino del archivo), sin stats derivadas
  partidos: { E: 0, B: 0 },
  filtrados: [],        // resultado de búsqueda + filtro actual
  badges: {},            // insignias por nombre de jugador
  filtro: 'all',
  busqueda: '',
  orden: 'puntaje',
  medallas: false,
};

export function refreshIcons(){
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
