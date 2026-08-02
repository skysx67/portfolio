/* РОВНО — демо-лендинг. Калькулятор, маска телефона, форма-заглушка. */
(function () {
  'use strict';

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
      if (e.target.tagName === 'A') {
        burger.setAttribute('aria-expanded', 'false');
        mnav.classList.remove('open');
        mnav.hidden = true;
      }
    });
  }

  /* ---------- Калькулятор ---------- */
  var PRICE = { cosmetic: 4900, capital: 8400, design: 13500 };
  var TYPE_NAME = { cosmetic: 'Косметический ремонт', capital: 'Капитальный ремонт', design: 'Дизайнерский ремонт' };
  var DAYS_PER_M2 = { cosmetic: 0.45, capital: 0.85, design: 1.15 };

  // perM2 — рубли за квадрат, fixed — разовая сумма, days — прибавка к сроку
  var EXTRAS = {
    demolition: { label: 'Демонтаж старой отделки', perM2: 900, days: 7 },
    wiring:     { label: 'Замена электрики',        perM2: 1200, days: 8 },
    ceiling:    { label: 'Натяжные потолки',        perM2: 650, days: 2 },
    bath:       { label: 'Санузел под ключ',        fixed: 85000, days: 14 },
    floor:      { label: 'Тёплый пол',              fixed: 45000, days: 4 },
    doors:      { label: 'Межкомнатные двери, 3 шт.', fixed: 19500, days: 2 }
  };

  var MATERIALS_K = 1.75; // работа + материалы
  var SPREAD = 0.08;      // вилка ±8%

  var app = document.getElementById('calcApp');
  if (!app) return;

  var areaInput = document.getElementById('area');
  var areaVal = document.getElementById('areaVal');
  var sumMin = document.getElementById('sumMin');
  var sumMax = document.getElementById('sumMax');
  var perM2El = document.getElementById('perM2');
  var termEl = document.getElementById('term');
  var breakdown = document.getElementById('breakdown');

  var nf = new Intl.NumberFormat('ru-RU');
  function money(n) { return nf.format(n) + ' ₽'; }
  function round1k(n) { return Math.round(n / 1000) * 1000; }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function readState() {
    var type = app.querySelector('input[name="type"]:checked').value;
    var materials = app.querySelector('input[name="materials"]:checked').value;
    var area = parseInt(areaInput.value, 10);
    var extras = [].slice.call(app.querySelectorAll('input[name="extra"]:checked')).map(function (i) { return i.value; });
    return { type: type, materials: materials, area: area, extras: extras };
  }

  function calculate(s) {
    var rows = [];
    var base = PRICE[s.type] * s.area;
    rows.push({ label: TYPE_NAME[s.type] + ', ' + s.area + ' м²', value: base });

    var days = DAYS_PER_M2[s.type] * s.area;
    var extrasSum = 0;

    s.extras.forEach(function (key) {
      var e = EXTRAS[key];
      var v = e.fixed ? e.fixed : e.perM2 * s.area;
      extrasSum += v;
      days += e.days;
      rows.push({ label: e.label, value: v });
    });

    var work = base + extrasSum;
    var total = work;

    if (s.materials === 'full') {
      var mat = Math.round(work * (MATERIALS_K - 1));
      rows.push({ label: 'Материалы', value: mat });
      total = work + mat;
      days += Math.round(s.area * 0.1);
    }

    days = Math.max(14, Math.round(days));

    return {
      rows: rows,
      min: round1k(total * (1 - SPREAD)),
      max: round1k(total * (1 + SPREAD)),
      perM2: Math.round(total / s.area / 10) * 10,
      days: days
    };
  }

  function humanTerm(days) {
    if (days < 21) return days + ' ' + plural(days, 'день', 'дня', 'дней');
    var weeks = Math.round(days / 7);
    return '≈ ' + weeks + ' ' + plural(weeks, 'неделя', 'недели', 'недель');
  }

  function render() {
    var s = readState();
    var r = calculate(s);

    areaVal.textContent = s.area;
    sumMin.textContent = money(r.min);
    sumMax.textContent = money(r.max);
    perM2El.textContent = nf.format(r.perM2);
    termEl.textContent = humanTerm(r.days);

    breakdown.innerHTML = r.rows.map(function (row) {
      return '<div><dt>' + row.label + '</dt><dd>' + money(row.value) + '</dd></div>';
    }).join('');

    app.dataset.summary =
      TYPE_NAME[s.type] + ', ' + s.area + ' м². ' +
      (s.extras.length ? 'Дополнительно: ' + s.extras.map(function (k) { return EXTRAS[k].label.toLowerCase(); }).join(', ') + '. ' : '') +
      (s.materials === 'full' ? 'С материалами. ' : 'Только работа. ') +
      'Расчёт: ' + money(r.min) + ' — ' + money(r.max) + ', срок ' + humanTerm(r.days) + '.';
  }

  app.addEventListener('input', render);
  app.addEventListener('change', render);
  render();

  /* Кнопка «Отправить расчёт прорабу» — подставляет расчёт в комментарий */
  var calcCta = app.querySelector('[data-calc-cta]');
  var comment = document.getElementById('f-comment');
  if (calcCta && comment) {
    calcCta.addEventListener('click', function () {
      comment.value = app.dataset.summary || '';
      setTimeout(function () { document.getElementById('f-name').focus({ preventScroll: true }); }, 600);
    });
  }

  /* ---------- Маска телефона ---------- */
  var phone = document.getElementById('f-phone');
  if (phone) {
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
  }

  /* ---------- Форма-заглушка ---------- */
  var form = document.getElementById('leadForm');
  var ok = document.getElementById('formOk');
  if (!form) return;

  function setErr(field, msg) {
    var box = form.querySelector('[data-err="' + field + '"]');
    var input = form.elements[field];
    if (box) { box.textContent = msg || ''; box.classList.toggle('on', !!msg); }
    if (input && input.setAttribute) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var valid = true;

    if (!form.elements.name.value.trim()) { setErr('name', 'Напишите, как к вам обращаться'); valid = false; }
    else setErr('name', '');

    var digits = form.elements.phone.value.replace(/\D/g, '');
    if (digits.length < 11) { setErr('phone', 'Нужен полный номер: +7 и 10 цифр'); valid = false; }
    else setErr('phone', '');

    if (!form.elements.agree.checked) { setErr('agree', 'Без согласия не сможем перезвонить'); valid = false; }
    else setErr('agree', '');

    if (!valid) {
      var bad = form.querySelector('[aria-invalid="true"]');
      if (bad && bad.focus) bad.focus();
      return;
    }

    document.getElementById('okPhone').textContent = form.elements.phone.value;
    ok.hidden = false;
  });

  var again = document.getElementById('formAgain');
  if (again) {
    again.addEventListener('click', function () {
      form.reset();
      ok.hidden = true;
      form.elements.name.focus();
    });
  }
})();
