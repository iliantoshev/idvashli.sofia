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

  // Източникът е всичко след "=" в линка, на каквото и име да е (например ?src=блок 8).
  // Махаме само контролните символи и ъглавите скоби, и режем до 40 знака.
  const src = String(body.src || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40);
  await data().setJSON(`survey/${Date.now()}-${randomId(4)}`, {
    answers,
    src,
    at: new Date().toISOString(),
  });
  return json({ saved: true });
};

export const config = { path: '/api/survey' };
