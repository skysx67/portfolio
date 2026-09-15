import assert from 'node:assert/strict';
import worker from './src/index.mjs';

// Подмена Telegram API: тест не отправляет настоящих уведомлений.
const originalFetch = globalThis.fetch;
const sent = [];
let telegramOK = true;
globalThis.fetch = async (url, options) => {
  sent.push({ url, body: JSON.parse(options.body) });
  return new Response('{}', { status: telegramOK ? 200 : 502 });
};

function request(body, origin = 'https://skysx67.github.io') {
  return new Request('https://portfolio-referrals.pages.dev/', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

const env = { TELEGRAM_BOT_TOKEN: 'TEST_TOKEN', TELEGRAM_CHAT_ID: 'TEST_CHAT' };
try {
  for (const [channel, label] of [['telegram', 'Telegram'], ['whatsapp', 'WhatsApp'], ['max', 'MAX']]) {
    for (const event of [channel + '_click', 'form_opened_' + channel]) {
      const response = await worker.fetch(request({
        ref: '7k2', event, page: '/portfolio/',
        name: 'PRIVATE_NAME', phone: 'PRIVATE_PHONE', text: 'PRIVATE_MESSAGE'
      }), env);
      assert.equal(response.status, 200, event);
      assert.deepEqual(await response.json(), { ok: true });
      const notification = sent.at(-1).body;
      assert.equal(notification.chat_id, 'TEST_CHAT');
      assert.match(notification.text, /Источник: Александр \(7K2\)/);
      assert.ok(notification.text.includes(label), event);
      assert.ok(notification.text.includes(event.startsWith('form_') ? 'заполнил форму и нажал' : 'нажал ссылку'));
      assert.ok(!notification.text.includes('PRIVATE_'), 'Не передавать данные посетителя');
    }
  }

  const beforeInvalid = sent.length;
  for (const body of [
    { ref: '', event: 'whatsapp_click' },
    { ref: 'xxx', event: 'max_click' },
    { ref: '7k2', event: 'unknown' },
    { ref: '7k2', event: 'constructor' },
    { ref: '7k2', event: '__proto__' }
  ]) {
    assert.equal((await worker.fetch(request(body), env)).status, 400);
  }
  assert.equal((await worker.fetch(request({ ref: '7k2', event: 'max_click' }, 'https://other.example'), env)).status, 403);
  assert.equal(sent.length, beforeInvalid, 'Ошибочные запросы не должны уведомлять');

  telegramOK = false;
  assert.equal((await worker.fetch(request({ ref: '7k2', event: 'max_click' }), env)).status, 502);
  console.log('OK: все 6 событий, рекомендатель, приватность и проверка запросов.');
} finally {
  globalThis.fetch = originalFetch;
}
