/* СЕВЕРОВА — демо-лендинг. Меню, квиз «какой стиль вам подойдёт», форма-заглушка. */
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

  /* ==========================================================
     Квиз: 5 вопросов, 4 возможных стиля.
     В каждом ответе — сколько очков он даёт каждому стилю.
     ========================================================== */
  var STYLES = {
    scandi: {
      name: 'Современный сканди',
      text: 'Много света, светлое дерево, простые формы и минимум декора — но не стерильно: текстиль, керамика, зелень. Такой интерьер прощает беспорядок и хорошо переживает смену мебели.',
      tags: ['Светлое дерево', 'Белые стены', 'Много текстиля', 'Открытые полки'],
      img: 'img/p3-660.webp',
      alt: 'Светлая гостиная в скандинавском стиле'
    },
    japandi: {
      name: 'Японди',
      text: 'Спокойный гибрид японского минимализма и скандинавской теплоты. Приглушённые природные цвета, низкая мебель, натуральные материалы, почти нет вещей на виду. Дом, в который приходишь выдохнуть.',
      tags: ['Тёмное дерево', 'Природные оттенки', 'Низкая мебель', 'Ничего лишнего'],
      img: 'img/p2-660.webp',
      alt: 'Гостиная в стиле японди'
    },
    classic: {
      name: 'Современная классика',
      text: 'Симметрия, молдинги, качественные ткани и мебель, которую не стыдно оставить детям. Работает и в новостройке, и в старом фонде, но требует высоких потолков и внимания к деталям.',
      tags: ['Молдинги', 'Глубокие цвета', 'Симметрия', 'Мягкая мебель'],
      img: 'img/p4-660.webp',
      alt: 'Гостиная в стиле современной классики'
    },
    minimal: {
      name: 'Мягкий минимализм',
      text: 'Ровные плоскости, встроенное хранение, мебель без ручек, два-три цвета на всю квартиру. Кажется простым, но на деле самый требовательный к качеству ремонта: любая кривая стена сразу видна.',
      tags: ['Скрытое хранение', 'Два-три цвета', 'Ровные плоскости', 'Мебель без ручек'],
      img: 'img/p6-700.webp',
      alt: 'Минималистичный интерьер'
    }
  };

  var QUESTIONS = [
    {
      q: 'Какое ощущение вы хотите от дома?',
      a: [
        { t: 'Светло, просто и не жалко испачкать', s: { scandi: 2, minimal: 1 } },
        { t: 'Тихо, тепло, близко к природе', s: { japandi: 2, minimal: 1 } },
        { t: 'Основательно и нарядно', s: { classic: 2 } },
        { t: 'Пусто, чисто, ничего не отвлекает', s: { minimal: 2, japandi: 1 } }
      ]
    },
    {
      q: 'Какая палитра вам ближе?',
      a: [
        { t: 'Белый, светлое дерево, серый', s: { scandi: 2 } },
        { t: 'Бежевый, тёмное дерево, приглушённая зелень', s: { japandi: 2 } },
        { t: 'Кремовый, глубокий синий, латунь', s: { classic: 2 } },
        { t: 'Белый, графит, бетон', s: { minimal: 2 } }
      ]
    },
    {
      q: 'Сколько вещей вы готовы держать на виду?',
      a: [
        { t: 'Книги, свечи, растения — так уютнее', s: { scandi: 1, classic: 1 } },
        { t: 'Два-три предмета, но правильных', s: { japandi: 2, minimal: 1 } },
        { t: 'Всё в закрытых шкафах, столешницы пустые', s: { minimal: 2 } },
        { t: 'Много, и это часть характера дома', s: { classic: 2, scandi: 1 } }
      ]
    },
    {
      q: 'Какая мебель нравится?',
      a: [
        { t: 'Простые формы на тонких ножках', s: { scandi: 2 } },
        { t: 'Низкая, массивная, из натурального дерева', s: { japandi: 2 } },
        { t: 'С мягкими изголовьями и резными деталями', s: { classic: 2 } },
        { t: 'Встроенная, заподлицо со стеной', s: { minimal: 2 } }
      ]
    },
    {
      q: 'Что раздражает в чужих интерьерах?',
      a: [
        { t: 'Темнота и тяжеловесность', s: { scandi: 2, minimal: 1 } },
        { t: 'Пестрота и слишком много цвета', s: { minimal: 2, japandi: 1 } },
        { t: 'Голые стены и ощущение недоделанности', s: { classic: 2, scandi: 1 } },
        { t: 'Дешёвые материалы и лишний глянец', s: { japandi: 1, classic: 1 } }
      ]
    }
  ];

  var app = document.getElementById('quizApp');
  if (app) {
    var stage = document.getElementById('quizStage');
    var bar = document.getElementById('quizBar');
    var stepEl = document.getElementById('quizStep');
    var totalEl = document.getElementById('quizTotal');
    var backBtn = document.getElementById('quizBack');
    var result = document.getElementById('quizResult');
    var answers = [];
    var step = 0;

    totalEl.textContent = QUESTIONS.length;

    function renderStep() {
      var q = QUESTIONS[step];
      stepEl.textContent = step + 1;
      bar.style.width = ((step) / QUESTIONS.length * 100) + '%';
      backBtn.hidden = step === 0;
      result.hidden = true;
      stage.hidden = false;

      stage.innerHTML =
        '<p class="quiz__q">' + q.q + '</p><div class="quiz__opts">' +
        q.a.map(function (a, i) {
          return '<button class="qopt" type="button" data-i="' + i + '">' + a.t + '</button>';
        }).join('') + '</div>';
    }

    function score() {
      var totals = { scandi: 0, japandi: 0, classic: 0, minimal: 0 };
      answers.forEach(function (ai, qi) {
        var s = QUESTIONS[qi].a[ai].s;
        Object.keys(s).forEach(function (k) { totals[k] += s[k]; });
      });
      // при равенстве очков выигрывает стиль, набранный раньше в порядке ключей
      return Object.keys(totals).reduce(function (best, k) {
        return totals[k] > totals[best] ? k : best;
      }, 'scandi');
    }

    function renderResult() {
      var key = score();
      var st = STYLES[key];
      stage.hidden = true;
      backBtn.hidden = true;
      bar.style.width = '100%';
      stepEl.textContent = QUESTIONS.length;

      var img = document.getElementById('resImg');
      img.src = st.img;
      img.alt = st.alt;
      document.getElementById('resName').textContent = st.name;
      document.getElementById('resText').textContent = st.text;
      document.getElementById('resTags').innerHTML = st.tags.map(function (t) { return '<li>' + t + '</li>'; }).join('');
      result.hidden = false;
    }

    stage.addEventListener('click', function (e) {
      var btn = e.target.closest('.qopt');
      if (!btn) return;
      answers[step] = parseInt(btn.dataset.i, 10);
      step++;
      if (step >= QUESTIONS.length) renderResult();
      else renderStep();
    });

    backBtn.addEventListener('click', function () {
      if (step > 0) { step--; renderStep(); }
    });

    document.getElementById('quizRestart').addEventListener('click', function () {
      answers = []; step = 0; renderStep();
    });

    /* Кнопка из результата подставляет стиль в поле «что обсудить» */
    document.getElementById('resCta').addEventListener('click', function () {
      var msg = document.getElementById('c-msg');
      if (msg) msg.value = 'Прошёл тест на сайте, получился стиль: ' + STYLES[score()].name + '.';
    });

    renderStep();
  }

  /* ---------- Форма-заглушка ---------- */
  var form = document.getElementById('contactForm');
  if (!form) return;

  var phone = form.elements.phone;
  phone.addEventListener('input', function () {
    var d = phone.value.replace(/\D/g, '');
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ') ' + d.slice(4, 7);
    if (d.length >= 8) out += '-' + d.slice(7, 9);
    if (d.length >= 10) out += '-' + d.slice(9, 11);
    phone.value = out;
  });
  phone.addEventListener('focus', function () { if (!phone.value) phone.value = '+7 ('; });

  function setErr(name, msg) {
    var box = form.querySelector('[data-err="' + name + '"]');
    var input = form.elements[name];
    if (box) { box.textContent = msg || ''; box.classList.toggle('on', !!msg); }
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  var ok = form.querySelector('.cform__ok');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var valid = true;

    if (!form.elements.name.value.trim()) { setErr('name', 'Как к вам обращаться?'); valid = false; }
    else setErr('name', '');

    if (phone.value.replace(/\D/g, '').length < 11) { setErr('phone', 'Нужен полный номер: +7 и 10 цифр'); valid = false; }
    else setErr('phone', '');

    if (!form.elements.agree.checked) { setErr('agree', 'Без согласия не смогу перезвонить'); valid = false; }
    else setErr('agree', '');

    if (!valid) {
      var bad = form.querySelector('[aria-invalid="true"]');
      if (bad) bad.focus();
      return;
    }

    ok.querySelector('[data-ok-phone]').textContent = phone.value;
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
