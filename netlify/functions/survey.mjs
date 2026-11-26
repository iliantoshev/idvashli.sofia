// /api/survey: записва един попълнен анкетен лист.
// Анкетата е анонимна: не пазим име, имейл, телефон или IP адрес, само избраните отговори.
import { data, json, fail, randomId } from '../../lib/shared.mjs';
import { cleanAnswers } from '../../lib/survey.mjs';

export default async (req) => {
  if (req.method !== 'POST') return fail('Методът не се поддържа.', 405);

  const raw = await req.text();
  if (raw.length > 4000) return fail('Невалидни данни.');
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail('Невалидни данни.');
  }

  // Скрито поле, което хората не виждат. Попълнено е само от ботове.
  if (body.website) return json({ saved: true });

  const answers = cleanAnswers(body.answers);
  if (!answers) return fail('Отговори на всички въпроси.');

  const src = String(body.src || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 30);
  await data().setJSON(`survey/${Date.now()}-${randomId(4)}`, {
    answers,
    src,
    at: new Date().toISOString(),
  });
  return json({ saved: true });
};

export const config = { path: '/api/survey' };
