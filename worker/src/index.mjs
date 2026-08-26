const ALLOWED_ORIGINS = new Set([
  'https://skysx67.github.io',
  'http://127.0.0.1:8765',
  'http://localhost:8765'
]);

const REFERRALS = Object.freeze({
  '7K2': 'Александр',
  '4M8': 'Иван',
  '9Q3': 'Арам',
  '6V1': 'Даша'
});

const EVENTS = Object.freeze({
  telegram_click: 'нажал «Написать в Telegram»',
  form_opened_telegram: 'заполнил форму и открыл Telegram'
});

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(origin) }
  });
}

function clean(value, max) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (!ALLOWED_ORIGINS.has(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
    }

    const declaredLength = Number(request.headers.get('Content-Length') || 0);
    if (declaredLength > 2048) {
      return json({ ok: false, error: 'payload_too_large' }, 413, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: 'invalid_json' }, 400, origin);
    }

    const ref = clean(body.ref, 3).toUpperCase();
    const event = clean(body.event, 40);
    if (!REFERRALS[ref] || !EVENTS[event]) {
      return json({ ok: false, error: 'invalid_event' }, 400, origin);
    }

    const page = clean(body.page, 120) || '/portfolio/';
    const time = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Asia/Yekaterinburg',
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(new Date());

    const message = [
      '🔔 Сигнал с портфолио',
      '',
      `Источник: ${REFERRALS[ref]} (${ref})`,
      `Действие: ${EVENTS[event]}`,
      `Страница: ${page}`,
      `Время: ${time}`
    ].join('\n');

    const telegram = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: message,
        disable_web_page_preview: true
      })
    });

    if (!telegram.ok) {
      return json({ ok: false, error: 'telegram_unavailable' }, 502, origin);
    }

    return json({ ok: true }, 200, origin);
  }
};
