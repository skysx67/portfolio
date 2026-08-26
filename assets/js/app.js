/* Портфолио — мобильное меню и сборка сообщения в Telegram.
   Данные формы никуда не отправляются: она собирает текст и открывает чат
   с уже готовым сообщением. Сервер получает только анонимный код рекомендации. */
(function () {
  'use strict';

  var TG = 'skysx0207';
  var REFERRAL_ENDPOINT = 'https://portfolio-referrals.pages.dev/';

  /* --- рекомендации друзей / UTM ---
     Клиент не видит ни имени рекомендателя, ни служебного кода. Сервер получает
     только событие и код из ссылки — без имени, телефона и текста формы. */
  var referralCodes = { '7k2': '7K2', '4m8': '4M8', '9q3': '9Q3', '6v1': '6V1' };
  var utmContent = new URLSearchParams(location.search).get('utm_content') || '';
  var referralCode = referralCodes[utmContent.toLowerCase()] || '';

  function notifyReferral(event) {
    if (!referralCode || typeof fetch !== 'function') return;
    fetch(REFERRAL_ENDPOINT, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: event, ref: referralCode, page: location.pathname })
    }).catch(function () {
      /* Уведомление не должно мешать человеку открыть Telegram. */
    });
  }

  if (referralCode) {
    var directText = 'Здравствуйте! Хочу обсудить сайт.';
    Array.prototype.forEach.call(document.querySelectorAll('a[href^="https://t.me/' + TG + '"]'), function (link) {
      link.href = 'https://t.me/' + TG + '?text=' + encodeURIComponent(directText);
      link.addEventListener('click', function () { notifyReferral('telegram_click'); });
    });
  }

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

  /* --- размытое пятно, догоняющее курсор ---
     Только мышь: на тач-экранах курсора нет, а на пере оно мешает. Системный
     курсор оставляем на месте — прятать его значит отнимать точку клика. */
  (function ring() {
    if (!matchMedia('(pointer:fine)').matches) return;
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;

    var el = document.createElement('div');
    el.className = 'cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<i></i>';
    document.body.appendChild(el);

    var tx = 0, ty = 0, x = 0, y = 0, started = false, raf = 0;
    /* Размер задан в CSS — берём его оттуда, чтобы не держать одно число
       в двух местах: пятно должно центрироваться ровно по курсору. */
    var R = (el.offsetWidth || 108) / 2;

    function tick() {
      x += (tx - x) * 0.13;           // отставание: чем меньше, тем ленивее
      y += (ty - y) * 0.13;
      el.style.transform = 'translate3d(' + (x - R) + 'px,' + (y - R) + 'px,0)';
      raf = (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) ? requestAnimationFrame(tick) : 0;
    }

    addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      if (!started) {                 // первый кадр ставим без разгона
        started = true; x = tx; y = ty;
        el.style.transform = 'translate3d(' + (x - R) + 'px,' + (y - R) + 'px,0)';
      }
      el.classList.add('is-on');      // вернулись в окно — снова показываем
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });

    document.addEventListener('mouseleave', function () { el.classList.remove('is-on'); });
  })();

  /* --- просмотр работ прямо на странице ---
     Демо лежат на том же домене, поэтому открываются в iframe как есть:
     калькулятор считает, квиз проходится. Уходить со страницы не нужно. */
  (function viewer() {
    var box = document.getElementById('viewer');
    var cases = [].slice.call(document.querySelectorAll('.case[data-view]'));
    if (!box || !cases.length) return;

    var frame = document.getElementById('vFrame');
    var wait = document.getElementById('vWait');
    var elTitle = document.getElementById('vTitle');
    var elUrl = document.getElementById('vUrl');
    var elCount = document.getElementById('vCount');
    var elOpen = document.getElementById('vOpen');
    var i = 0, back = null;

    var list = cases.map(function (c) {
      return { href: c.dataset.view, title: c.dataset.viewTitle, url: c.dataset.viewUrl };
    });

    var timer = 0;

    function show(n) {
      i = (n + list.length) % list.length;
      var it = list[i];
      elTitle.textContent = it.title;
      elUrl.textContent = it.url;
      elCount.textContent = (i + 1) + ' / ' + list.length;
      elOpen.href = it.href;
      wait.hidden = false;
      wait.textContent = 'Загружаю сайт…';
      frame.src = it.href;
      /* Если сайт не открылся во врезке (нет сети, чужой домен запретил
         вставку) — не оставляем человека смотреть на «загружаю». */
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (wait.hidden) return;
        wait.textContent = 'Сайт не открылся во врезке — откройте его в новой вкладке';
      }, 8000);
    }

    frame.addEventListener('load', function () {
      if (frame.src !== 'about:blank') { wait.hidden = true; clearTimeout(timer); }
    });

    function open(n) {
      back = document.activeElement;
      box.hidden = false;
      document.documentElement.classList.add('viewer-open');
      document.body.style.overflow = 'hidden';
      show(n);
      document.getElementById('vClose').focus();
    }

    function close() {
      box.hidden = true;
      document.documentElement.classList.remove('viewer-open');
      document.body.style.overflow = '';
      clearTimeout(timer);
      frame.src = 'about:blank';        // выгружаем сайт, чтобы не жрал память
      if (back && back.focus) back.focus();
    }

    cases.forEach(function (c, n) {
      var btn = c.querySelector('[data-view-open]');
      if (btn) btn.addEventListener('click', function () { open(n); });

      var shot = c.querySelector('.case__shot a');
      if (shot) shot.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;  // Ctrl+клик — как обычно
        e.preventDefault();
        open(n);
      });
    });

    document.getElementById('vPrev').addEventListener('click', function () { show(i - 1); });
    document.getElementById('vNext').addEventListener('click', function () { show(i + 1); });
    document.getElementById('vClose').addEventListener('click', close);

    box.addEventListener('click', function (e) { if (e.target === box) close(); });

    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowLeft') { show(i - 1); return; }
      if (e.key === 'ArrowRight') { show(i + 1); return; }
      if (e.key !== 'Tab') return;
      var can = box.querySelectorAll('button, a[href], iframe');
      var first = can[0], last = can[can.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* свайп по шапке окна — на телефоне листать стрелками неудобно */
    var sx = 0, sy = 0;
    var bar = box.querySelector('.viewer__bar');
    bar.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    bar.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) show(dx < 0 ? i + 1 : i - 1);
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

    notifyReferral('form_opened_telegram');
    window.open('https://t.me/' + TG + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });
})();
