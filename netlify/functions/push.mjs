// /api/push: известия
// GET     публичният ключ и дали имаш включени известия
// POST    { subscription } включва известия за това устройство
// POST    { action: 'test' } праща пробно известие до теб
// DELETE  { endpoint } изключва известията за това устройство
import { json, fail, currentUser, pushStore } from '../../lib/shared.mjs';
import {
  vapidKeys, cleanSubscription, saveSubscription, removeSubscription, countSubscriptions, sendToUser,
} from '../../lib/push.mjs';

export default async (req) => {
  if (req.method === 'GET') {
    const { publicKey } = await vapidKeys();
    const user = await currentUser();
    return json({ publicKey, devices: user ? await countSubscriptions(user.id) : 0 });
  }

  const user = await currentUser();
  if (!user) return fail('Не си влязъл в профила си.', 401);
  let body;
  try {
    body = await req.json();
  } catch {
    return fail('Невалидни данни.');
  }

  if (req.method === 'DELETE') {
    await removeSubscription(user.id, body.endpoint);
    return json({ ok: true });
  }

  if (req.method === 'POST' && body.action === 'test') {
    // Най-много едно пробно известие на 20 секунди
    const store = pushStore();
    const last = await store.get(`test/${user.id}`, { type: 'json' });
    if (last && Date.now() - last.at < 20000) return fail('Изчакай малко и пробвай пак.', 429);
    await store.setJSON(`test/${user.id}`, { at: Date.now() });
    const r = await sendToUser(user.id, {
      title: 'Идваш ли? 🔥',
      body: 'Известията работят. Така ще разбереш, когато има компания за теб.',
    });
    if (!r.sent && !r.failed) return fail('Няма устройство с включени известия. Първо ги включи.', 409);
    if (!r.sent) return fail('Известието не стигна до телефона. Изключи и включи известията пак.', 502);
    return json(r);
  }

  if (req.method === 'POST') {
    const sub = cleanSubscription(body.subscription);
    if (!sub) return fail('Невалиден абонамент.');
    await saveSubscription(user.id, sub);
    return json({ ok: true });
  }

  return fail('Методът не се поддържа.', 405);
};

export const config = { path: '/api/push' };
