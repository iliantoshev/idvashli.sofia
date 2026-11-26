// /api/verify: проверка със селфи и жест
// GET  дава жеста, който човекът трябва да направи на снимката
// POST качва селфито (JPEG) и профилът минава в "чака проверка"
import { data, selfies, json, fail, currentUser, readJson, GESTURES } from '../../lib/shared.mjs';

const MAX_BYTES = 3 * 1024 * 1024;

export default async (req) => {
  const user = await currentUser();
  if (!user) return fail('Не си влязъл в профила си.', 401);

  const store = data();
  const key = `profiles/${user.id}`;
  const profile = await readJson(store, key);
  if (!profile) return fail('Първо попълни профила си.', 409);

  if (req.method === 'GET') {
    if (!profile.gesture && ['none', 'rejected'].includes(profile.status)) {
      profile.gesture = GESTURES[Math.floor(Math.random() * GESTURES.length)];
      await store.setJSON(key, profile);
    }
    return json({ status: profile.status, gesture: profile.gesture || null, rejectReason: profile.rejectReason || null });
  }

  if (req.method === 'POST') {
    if (!['none', 'rejected'].includes(profile.status)) return fail('Профилът ти вече е изпратен за проверка.', 409);
    if (!profile.gesture) return fail('Първо отвори стъпката за проверка, за да получиш жест.', 409);

    const type = req.headers.get('content-type') || '';
    if (!type.startsWith('image/jpeg')) return fail('Снимката трябва да е JPEG.');
    const body = await req.arrayBuffer();
    if (!body.byteLength) return fail('Няма снимка.');
    if (body.byteLength > MAX_BYTES) return fail('Снимката е твърде голяма.');

    await selfies().set(user.id, body, {
      metadata: { gesture: profile.gesture, uploadedAt: new Date().toISOString() },
    });
    const next = { ...profile, status: 'pending', submittedAt: new Date().toISOString() };
    delete next.rejectReason;
    await store.setJSON(key, next);
    return json({ status: 'pending' });
  }

  return fail('Методът не се поддържа.', 405);
};

export const config = { path: '/api/verify' };
