/* Портфолио — мобильное меню и сборка сообщения в Telegram.
   Сервера нет, поэтому форма ничего не отправляет: она собирает текст
   и открывает чат с уже готовым сообщением. Человек жмёт «отправить» сам. */
(function () {
  'use strict';

  var TG = 'skysx0207';

  /* --- мобильное меню --- */
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

  /* --- форма → ссылка в Telegram --- */
  var form = document.getElementById('contactForm');
  if (!form) return;

  function setErr(name, msg) {
    var box = form.querySelector('[data-err="' + name + '"]');
    var input = form.elements[name];
    if (box) { box.textContent = msg || ''; box.classList.toggle('on', !!msg); }
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var valid = true;

    var name = form.elements.name.value.trim();
    if (!name) { setErr('name', 'Напишите, как к вам обращаться'); valid = false; }
    else setErr('name', '');

    var biz = form.elements.biz.value.trim();
    if (!biz) { setErr('biz', 'Пара слов о бизнесе — чтобы я сразу понял задачу'); valid = false; }
    else setErr('biz', '');

    if (!valid) {
      var bad = form.querySelector('[aria-invalid="true"]');
      if (bad) bad.focus();
      return;
    }

    var task = form.elements.task.value.trim();
    var text = 'Здравствуйте! Меня зовут ' + name + '.\n' +
               'Занимаюсь: ' + biz + '.' +
               (task ? '\nЗадача: ' + task : '') +
               '\n\n(написал с сайта)';

    window.open('https://t.me/' + TG + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });
})();
