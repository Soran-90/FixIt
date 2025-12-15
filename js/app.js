function login() {
    window.location.href = "home.html";
}
// ====== Bottom Nav activation helper ======
(function () {
  // key map: صفحة -> key
  const pageMap = {
    'home.html': 'home',
    '': 'home', // root default
    'index.html': 'home',
    'home': 'home'
  };

  function getCurrentKey() {
    const path = window.location.pathname.split('/').pop(); // e.g., "home.html"
    if (pageMap[path]) return pageMap[path];
    // try match by filename without extension
    const name = path.split('.').shift();
    if (name && ['home','orders','search','profile'].includes(name)) return name;
    // fallback: match from location
    if (path.includes('orders')) return 'orders';
    if (path.includes('search')) return 'search';
    if (path.includes('profile')) return 'profile';
    return 'home';
  }

  function activateNav() {
    const key = getCurrentKey();
    const items = document.querySelectorAll('.bottom-nav .nav-item');
    items.forEach(i => {
      if (i.dataset.key === key) {
        i.classList.add('active');
        i.setAttribute('aria-current', 'page');
      } else {
        i.classList.remove('active');
        i.removeAttribute('aria-current');
      }
    });
  }

  // run on DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    activateNav();

    // optional: smooth scrolling to top when navigating
    const items = document.querySelectorAll('.bottom-nav .nav-item');
    items.forEach(it => {
      it.addEventListener('click', function (e) {
        // Let the link navigate normally; but for SPA behavior we could intercept.
        // For now, just smooth scroll to top of new page.
        // If you want SPA (no reload), we can implement routing later.
      });
    });
  });

})();
