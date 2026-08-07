/* ПОТОЛОК72 — демо-лендинг. Меню, маска телефона, две формы-заглушки. */
(function () {
  'use strict';

  /* ---------- Проявление блоков при прокрутке ----------
     Стартовые состояния включает класс rv-on из <head>. Элементы с clip-path
     имеют нулевую видимую площадь, поэтому за ними следим через родителя. */
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

    var clipped = { mask: 1, img: 1, wipe: 1 };
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

    addEventListener('scroll', function bottom() {
      if (scrollY + innerHeight < document.documentElement.scrollHeight - 4) return;
      removeEventListener('scroll', bottom);
      Array.prototype.forEach.call(els, function (e) { e.classList.add('rv-in'); });
    }, { passive: true });
  })();

  /* ---------- Мобильное меню ---------- */
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

  /* ---------- Маска телефона ---------- */
  function mask(input) {
    input.addEventListener('input', function () {
      var d = input.value.replace(/\D/g, '');
      if (d[0] === '8') d = '7' + d.slice(1);
      if (d[0] !== '7') d = '7' + d;
      d = d.slice(0, 11);
      var out = '+7';
      if (d.length > 1) out += ' (' + d.slice(1, 4);
      if (d.length >= 4) out += ') ' + d.slice(4, 7);
      if (d.length >= 8) out += '-' + d.slice(7, 9);
      if (d.length >= 10) out += '-' + d.slice(9, 11);
      input.value = out;
    });
    input.addEventListener('focus', function () { if (!input.value) input.value = '+7 ('; });
  }

  /* ---------- Формы-заглушки ---------- */
  function setupForm(form) {
    var ok = form.querySelector('.qform__ok');
    var phone = form.querySelector('input[name="phone"]');
    if (phone) mask(phone);

    function setErr(name, msg) {
      var box = form.querySelector('[data-err="' + name + '"]');
      var input = form.elements[name];
      if (box) { box.textContent = msg || ''; box.classList.toggle('on', !!msg); }
      if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;

      if (!form.elements.name.value.trim()) { setErr('name', 'Напишите, как к вам обращаться'); valid = false; }
      else setErr('name', '');

      if (form.elements.phone.value.replace(/\D/g, '').length < 11) {
        setErr('phone', 'Нужен полный номер: +7 и 10 цифр'); valid = false;
      } else setErr('phone', '');

      if (!valid) {
        var bad = form.querySelector('[aria-invalid="true"]');
        if (bad) bad.focus();
        return;
      }

      var okPhone = ok.querySelector('[data-ok-phone]');
      if (okPhone) okPhone.textContent = form.elements.phone.value;
      ok.hidden = false;
    });

    var again = form.querySelector('[data-again]');
    if (again) {
      again.addEventListener('click', function () {
        form.reset();
        ok.hidden = true;
        form.querySelectorAll('.err.on').forEach(function (el) { el.classList.remove('on'); });
        form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.setAttribute('aria-invalid', 'false'); });
        form.elements.name.focus();
      });
    }
  }

  document.querySelectorAll('form.qform').forEach(setupForm);
})();
