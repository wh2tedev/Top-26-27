/* ==========================================================
   theme.js — Tema claro/oscuro + sidebar de configuración
   ========================================================== */
export function initTheme(){
  const switchTema = document.getElementById('switch-tema');
  const prefTema = localStorage.getItem('temaClaro') === 'true';
  switchTema.checked = prefTema;
  if (prefTema) document.body.classList.add('light');

  switchTema.addEventListener('change', () => {
    const light = switchTema.checked;
    localStorage.setItem('temaClaro', light);
    document.body.classList.add('transicion-tema');
    requestAnimationFrame(() => {
      document.body.classList.toggle('light', light);
      setTimeout(() => document.body.classList.remove('transicion-tema'), 320);
    });
  });
}

export function initSidebar(){
  const btnConfig = document.getElementById('btn-config');
  const sidebar = document.getElementById('sidebar-config');
  const backdrop = document.getElementById('sidebar-backdrop');

  function close(){
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
    sidebar.setAttribute('aria-hidden', 'true');
    btnConfig.setAttribute('aria-expanded', 'false');
    btnConfig.style.display = 'flex';
  }
  function open(){
    sidebar.classList.add('open');
    backdrop.classList.add('show');
    sidebar.setAttribute('aria-hidden', 'false');
    btnConfig.setAttribute('aria-expanded', 'true');
    btnConfig.style.display = 'none';
  }

  btnConfig.addEventListener('click', () => {
    sidebar.classList.contains('open') ? close() : open();
  });
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  return { close, open };
}
