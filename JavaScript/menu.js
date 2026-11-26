document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menu-toggle');

  if (!menuToggle) return;

  // Restaura la preferencia guardada
  const menuCollapsed = localStorage.getItem('menu-collapsed') === 'true';
  menuToggle.checked = menuCollapsed;

  // Guarda el estado cada vez que se cambia
  menuToggle.addEventListener('change', () => {
    localStorage.setItem('menu-collapsed', menuToggle.checked ? 'true' : 'false');
  });
});