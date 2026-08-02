/* ==========================================================
   nav.js — Cambia entre las 4 vistas (bottom nav estilo app)
   ========================================================== */
export function initNav(onChange){
  const buttons = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.view');

  function activate(name){
    buttons.forEach(b => b.classList.toggle('active', b.dataset.view === name));
    views.forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof onChange === 'function') onChange(name);
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => activate(btn.dataset.view));
  });

  return { activate };
}
