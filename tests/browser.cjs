/* node tests/browser.cjs — нужен доступный пакет playwright и Chrome.
   Только локальный сервер: внешние запросы блокируются, чаты не открываются. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const output = process.env.QA_OUTPUT || path.join(os.tmpdir(), 'portfolio-rework-review');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  const target = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;
  if (!fs.existsSync(target)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
  fs.createReadStream(target).pipe(res);
});

async function visibleSection(page, id) {
  await page.waitForFunction(id => {
    const section = document.getElementById(id);
    return Math.abs(section.getBoundingClientRect().top - 88) < 3;
  }, id, { timeout: 5000 }).catch(async error => {
    throw new Error(id + ': ' + JSON.stringify(await page.evaluate(id => ({ hash: location.hash, top: document.getElementById(id).getBoundingClientRect().top, scroll: scrollY, fonts: document.fonts.status }), id)) + '\n' + error.message);
  });
  const hidden = await page.locator('#' + id + ' [data-rv]').evaluateAll(els => els.filter(e => {
    const style = getComputedStyle(e);
    return style.opacity !== '1' || style.clipPath !== 'none' || style.transform !== 'none';
  }).length);
  assert.equal(hidden, 0, id + ': все reveal-элементы видны сразу');
  assert.ok(await page.evaluate(() => document.querySelector('.hdr').getBoundingClientRect().bottom < 88));
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
  const errors = [], badResources = [], results = [];
  async function context(options = {}, init) {
    const ctx = await browser.newContext(options);
    await ctx.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(base + '/')) return route.continue();
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>External destination intercepted for testing</p>' });
    });
    await ctx.addInitScript(() => {
      window.opened = [];
      window.open = (url, target, features) => { window.opened.push({ url, target, features }); return null; };
      window.copied = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: text => { window.copied.push(text); return Promise.resolve(); } } });
    });
    if (init) await ctx.addInitScript(init);
    ctx.on('page', page => {
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) badResources.push(r.url()); });
    });
    return ctx;
  }
  try {
    const ctx = await context();
    const page = await ctx.newPage();
    for (const width of [360, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(output, 'hero-' + width + '.png') });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Нет горизонтального переполнения: ' + width);
      for (const id of ['cases', 'services', 'about', 'contact']) {
        if (width <= 900) await page.locator('.burger').click();
        await page.locator((width <= 900 ? '#mnav' : '.nav') + ' a[href="#' + id + '"]').click();
        await visibleSection(page, id);
        assert.equal(await page.locator('.burger').getAttribute('aria-expanded'), 'false');
        await page.screenshot({ path: path.join(output, id + '-' + width + '.png') });
        if (id === 'services') await page.locator('#services').screenshot({ path: path.join(output, 'prices-full-' + width + '.png') });
      }
      for (const id of ['cases', 'services', 'about', 'contact']) {
        await page.locator('.ftr__nav a[href="#' + id + '"]').click();
        await visibleSection(page, id);
      }
      for (const id of ['about', 'services', 'contact']) {
        // Новая загрузка документа, а не переход внутри уже открытой страницы.
        await page.goto('about:blank');
        await page.goto(base + '/#' + id);
        await visibleSection(page, id);
      }
      // Прогулка по всей странице выявляет забытые скрытые блоки и переполнение.
      await page.goto(base);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 650) {
        await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
        await page.waitForTimeout(30);
      }
      await page.waitForTimeout(1400);
      assert.equal(await page.locator('[data-rv]').evaluateAll(els => els.filter(e => getComputedStyle(e).opacity === '0').length), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      results.push(width + ' px: шапка, подвал, прямые hash, прокрутка, отсутствие переполнения — OK');
    }

    await page.goto(base + '/#contact');
    await visibleSection(page, 'contact');
    await page.locator('button[value="telegram"]').click();
    assert.equal(await page.locator('[aria-invalid="true"]').count(), 2);
    assert.equal(await page.evaluate(() => window.opened.length), 0);
    const name = 'Тест & Проверка', biz = 'Мебель / Тюмень', task = 'Квиз? Цена 35 000 ₽\nНужны фото';
    await page.locator('#f-name').fill(name);
    await page.locator('#f-biz').fill(biz);
    await page.locator('#f-task').fill(task);
    const expected = `Здравствуйте! Меня зовут ${name}.\nЗанимаюсь: ${biz}.\nЗадача: ${task}\n\n(написал с сайта)`;
    for (const channel of ['telegram', 'whatsapp', 'max']) {
      await page.locator('button[value="' + channel + '"]').click();
      const opened = await page.evaluate(() => window.opened.at(-1));
      const url = new URL(opened.url);
      assert.equal(url.hostname, { telegram: 't.me', whatsapp: 'wa.me', max: 'max.ru' }[channel]);
      assert.equal(opened.features, 'noopener');
      if (channel !== 'max') assert.equal(url.searchParams.get('text'), expected);
      else {
        assert.equal(await page.locator('#max-text').inputValue(), expected);
        assert.equal(await page.evaluate(() => window.copied.at(-1)), expected);
        await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('denied')); });
        await page.locator('#copyMaxMessage').click();
        await page.waitForFunction(() => document.getElementById('maxCopyStatus').textContent.includes('вручную'));
      }
    }
    assert.equal(await page.locator('[aria-invalid="true"]').count(), 0);
    const contacts = await page.locator('.contact__links a').evaluateAll(links => links.map(a => a.href));
    assert.ok(contacts.some(h => h === 'tel:+79324896700'));
    assert.ok(contacts.some(h => new URL(h).pathname === '/skysx0207'));
    assert.ok(contacts.some(h => new URL(h).pathname === '/79324896700'));
    assert.ok(contacts.some(h => h.includes('/u/f9LHodD0cOJ9oeFbKnXQnTrUYhTlNewUy-Ui5pFmW_MwNreb7rHAjkLRz-Y')));
    assert.deepEqual(await page.locator('.case[data-view]').evaluateAll(els => els.map(e => e.dataset.view)), ['https://skysx67.github.io/perfecto-mebel/', 'demo/remont/', 'demo/potolki/', 'demo/design/']);
    await page.locator('[data-view-open]').first().click();
    assert.equal(await page.locator('#vCount').innerText(), '1 / 4');
    await page.locator('#vNext').click();
    assert.equal(await page.locator('#vCount').innerText(), '2 / 4');
    await page.keyboard.press('Escape');
    assert.ok(await page.locator('#viewer').isHidden());
    results.push('Генератор: валидация, Telegram/WhatsApp/MAX, кодирование, буфер и отказ буфера; ссылки, 4 работы и просмотрщик — OK');

    const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    assert.deepEqual(schema.makesOffer.map(o => o.price), ['15000', '24000', '35000']);
    assert.ok((await page.title()).includes('одностраничные сайты'));
    assert.ok(!(await page.title()).includes('Директ'));
    assert.equal(await page.locator('s').count(), 0);
    assert.ok(!/14\s?999|23\s?999|34\s?999|менять можно сколько угодно|чаще всего берут/.test(await page.locator('body').innerText()));

    for (const mode of ['no-js', 'reduced-motion', 'no-observer', 'blocked-app', 'slow-app']) {
      const opts = mode === 'no-js' ? { javaScriptEnabled: false } : mode === 'reduced-motion' ? { reducedMotion: 'reduce' } : {};
      const fallback = await context(opts, mode === 'no-observer' ? () => { delete window.IntersectionObserver; } : undefined);
      if (mode === 'blocked-app') await fallback.route('**/assets/js/app.js', r => r.abort());
      if (mode === 'slow-app') await fallback.route('**/assets/js/app.js', async r => { await new Promise(resolve => setTimeout(resolve, 2500)); await r.continue(); });
      const p = await fallback.newPage();
      await p.goto(base + '/#about', { waitUntil: 'commit' });
      await p.locator('#about').waitFor({ state: 'attached' });
      await p.waitForTimeout(1400);
      assert.equal(await p.locator('#about [data-rv]').evaluateAll(els => els.filter(e => getComputedStyle(e).opacity === '0').length), 0, mode);
      if (['no-js', 'blocked-app', 'slow-app'].includes(mode)) {
        assert.equal(await p.locator('[data-rv]').evaluateAll(els => els.filter(e => getComputedStyle(e).opacity === '0').length), 0, mode + ': fallback');
      }
      if (mode === 'no-js') assert.equal(await p.locator('#contactForm button[type="submit"]:disabled').count(), 3);
      await fallback.close();
      results.push(mode + ' — OK');
    }
    await page.goto(base + '/demo/remont/');
    const originalSum = await page.locator('#sumMin').innerText();
    await page.locator('#area').fill('100');
    assert.notEqual(await page.locator('#sumMin').innerText(), originalSum);
    await page.locator('[data-calc-cta]').click();
    assert.ok((await page.locator('#f-comment').inputValue()).includes('100 м²'));
    await page.locator('#f-name').fill('Тест');
    await page.locator('#f-phone').fill('79990000000');
    await page.locator('[name="agree"]').check();
    await page.locator('#leadForm button[type="submit"]').click();
    assert.ok(await page.locator('#formOk').isVisible());
    await page.goto(base + '/demo/potolki/');
    assert.equal(await page.locator('form.qform').count(), 2);
    for (const form of await page.locator('form.qform').all()) {
      await form.locator('[name="name"]').fill('Тест');
      await form.locator('[name="phone"]').fill('79990000000');
      await form.locator('button[type="submit"]').click();
      assert.ok(await form.locator('.qform__ok').isVisible());
    }
    await page.goto(base + '/demo/design/');
    for (let i = 0; i < 5; i++) await page.locator('.qopt').first().click();
    assert.ok(await page.locator('#quizResult').isVisible());
    await page.locator('#resCta').click();
    assert.ok((await page.locator('#c-msg').inputValue()).includes('Современный сканди'));
    await page.locator('#contactForm [name="name"]').fill('Тест');
    await page.locator('#contactForm [name="phone"]').fill('79990000000');
    await page.locator('#contactForm [name="agree"]').check();
    await page.locator('#contactForm button[type="submit"]').click();
    assert.ok(await page.locator('.cform__ok').isVisible());
    results.push('3 демо: калькулятор, квиз, подстановка результата и 4 формы-заглушки — OK');
    assert.deepEqual(errors, [], 'Нет ошибок JavaScript');
    assert.deepEqual(badResources, [], 'Нет ошибок локальных ресурсов');
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ results, errors, badResources }, null, 2));
    console.log(results.join('\n') + '\nАртефакты: ' + output);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
