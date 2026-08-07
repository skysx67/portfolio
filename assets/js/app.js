/* Портфолио — мобильное меню и сборка сообщения в Telegram.
   Сервера нет, поэтому форма ничего не отправляет: она собирает текст
   и открывает чат с уже готовым сообщением. Человек жмёт «отправить» сам. */
(function () {
  'use strict';

  var TG = 'skysx0207';

  /* --- проявление блоков при прокрутке ---
     Стартовые состояния включает класс rv-on, он ставится крошечным скриптом
     в <head>: иначе страница успевает моргнуть готовым видом. Здесь только
     навешиваем наблюдателя и расставляем индексы для лесенки. */
  (function reveal() {
    var root = document.documentElement;
    var els = document.querySelectorAll('[data-rv]');
    if (!els.length) return;

    if (!root.classList.contains('rv-on') || !('IntersectionObserver' in window)) {
      root.classList.remove('rv-on');
      return;
    }
    root.dataset.rvReady = '1';

    Array.prototype.forEach.call(document.querySelectorAll('[data-rv-stagger]'), function (group) {
      var i = 0;
      Array.prototype.forEach.call(group.children, function (child) {
        var t = child.matches('[data-rv]') ? child : child.querySelector('[data-rv]');
        if (t) t.style.setProperty('--rv-i', i++);
      });
    });

    /* Элементы с clip-path в стартовом состоянии имеют нулевую видимую площадь,
       и наблюдатель их не замечает. Поэтому следим за родителем, а класс вешаем
       на сам элемент. */
    var clipped = { mask: 1, img: 1 };
    var watched = [];

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var list = en.target.__rv || [];
        for (var i = 0; i < list.length; i++) list[i].classList.add('rv-in');
        io.unobserve(en.target);
        delete en.target.__rv;
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });

    Array.prototype.forEach.call(els, function (e) {
      var host = (clipped[e.dataset.rv] && e.parentElement) ? e.parentElement : e;
      if (!host.__rv) { host.__rv = []; watched.push(host); }
      host.__rv.push(e);
    });
    watched.forEach(function (h) { io.observe(h); });

    /* Подвал стоит у самого низа страницы и в порог наблюдателя не попадает —
       докручены до конца, значит показываем всё, что осталось. */
    addEventListener('scroll', function bottom() {
      if (scrollY + innerHeight < document.documentElement.scrollHeight - 4) return;
      removeEventListener('scroll', bottom);
      Array.prototype.forEach.call(els, function (e) { e.classList.add('rv-in'); });
    }, { passive: true });
  })();

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
