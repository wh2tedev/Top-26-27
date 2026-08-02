/* ==========================================================
   search.js — Buscador instantáneo + filtros rápidos
   ========================================================== */
import { state } from './state.js?v=2.1.0';
import { positionGroup } from './data.js?v=2.1.0';

export function initSearch(onApply){
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search');
  const chips = document.querySelectorAll('#filter-row .chip');

  function apply(){
    const q = state.busqueda.trim().toLowerCase();
    state.filtrados = state.jugadores.filter(j => {
      const matchNombre = j.nombre.toLowerCase().includes(q);
      let matchCategoria = true;
      if (state.filtro === 'E' || state.filtro === 'B'){
        matchCategoria = j.equipo === state.filtro;
      } else if (state.filtro !== 'all'){
        matchCategoria = positionGroup(j.posicion) === state.filtro;
      }
      return matchNombre && matchCategoria;
    });
    onApply();
  }

  input.addEventListener('input', (e) => {
    state.busqueda = e.target.value;
    clearBtn.classList.toggle('show', !!state.busqueda);
    apply();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    state.busqueda = '';
    clearBtn.classList.remove('show');
    apply();
    input.focus();
  });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filtro = chip.dataset.filter;
      apply();
    });
  });

  return { apply };
}
