// Малки помощни функции за всички страници

// Пази текст от потребители, преди да го сложим в HTML
export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Заявка към нашия API. Хвърля грешка с българско съобщение.
export async function api(path, options = {}) {
  const res = await fetch(path, { credentials: 'same-origin', ...options });
  const type = res.headers.get('content-type') || '';
  const body = type.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    const err = new Error(body?.error || 'Нещо се обърка. Опитай пак.');
    err.status = res.status;
    throw err;
  }
  return body;
}

export const postJson = (path, payload, method = 'POST') =>
  api(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

const DAYS = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'];

// "чт, 21.12.2026, 20:00" по софийско време
export function formatWhen(iso, long = false) {
  const d = new Date(iso);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('bg-BG', {
      timeZone: 'Europe/Sofia', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
    }).formatToParts(d).map((p) => [p.type, p.value]),
  );
  const dayName = long
    ? DAYS[new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Sofia' })).getDay()]
    : parts.weekday;
  return `${dayName}, ${parts.day}.${parts.month}.${parts.year}, ${parts.hour}:${parts.minute}`;
}

// Български текст за грешките от Netlify Identity
export function authMessage(err) {
  const text = String(err?.message || '').toLowerCase();
  if (err?.name === 'MissingIdentityError' || text.includes('identity'))
    return 'Регистрацията още не е включена. Опитай по-късно.';
  if (text.includes('invalid') && text.includes('grant')) return 'Грешен имейл или парола.';
  if (text.includes('not confirmed')) return 'Първо потвърди имейла си от линка, който ти изпратихме.';
  if (text.includes('already') || text.includes('registered')) return 'Има профил с този имейл. Влез в него.';
  if (text.includes('password')) return 'Паролата трябва да е поне 8 символа.';
  return 'Нещо се обърка. Опитай пак.';
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
