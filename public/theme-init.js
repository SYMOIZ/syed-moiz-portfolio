// Runs before first paint to apply the saved theme and avoid a flash. Dark is the default.
(function () {
  var theme = 'dark';
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch (e) {
    /* storage blocked: keep default */
  }
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.add('js');
})();
