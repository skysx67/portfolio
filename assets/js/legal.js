/* Основной текст и ссылки доступны без скрипта. */
(function () {
  'use strict';
  var button = document.getElementById('printOffer');
  if (!button || typeof window.print !== 'function') return;
  button.hidden = false;
  button.addEventListener('click', function () { window.print(); });
})();
