/* Портфолио — мобильное меню и форма-заглушка. */
(function () {
  'use strict';

  var burger = document.querySelector('.burger');
  var mnav = document.getElementById('mnav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      mnav.classList.toggle('open', !open);
      mnav.hidden = open;
    });
    mnav.addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') return;
      burger.setAttribute('aria-expanded', 'false');
      mnav.classList.remove('open');
      mnav.hidden = true;
    });
  }

  var form = document.getElementById('contactForm');
  if (!form) return;
  var ok = form.querySelector('.form__ok');

  function setErr(name, msg) {
    var box = form.querySelector('[data-err="' + name + '"]');
    var input = form.elements[name];
    if (box) { box.textContent = msg || ''; box.classList.toggle('on', !!msg); }
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var valid = true;

    if (!form.elements.name.value.trim()) { setErr('name', 'Как к вам обращаться?'); valid = false; }
    else setErr('name', '');

    var c = form.elements.contact.value.trim();
    // достаточно либо @ника, либо номера с 10+ цифрами
    if (c.length < 4 || (c[0] !== '@' && c.replace(/\D/g, '').length < 10)) {
      setErr('contact', 'Оставьте @ник в Telegram или номер телефона'); valid = false;
    } else setErr('contact', '');

    if (!valid) {
      var bad = form.querySelector('[aria-invalid="true"]');
      if (bad) bad.focus();
      return;
    }

    ok.querySelector('[data-ok-contact]').textContent = c;
    ok.hidden = false;
  });

  form.querySelector('[data-again]').addEventListener('click', function () {
    form.reset();
    ok.hidden = true;
    form.querySelectorAll('.err.on').forEach(function (el) { el.classList.remove('on'); });
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.setAttribute('aria-invalid', 'false'); });
    form.elements.name.focus();
  });
})();
