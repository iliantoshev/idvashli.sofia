// /api/photo: профилната снимка
// GET ?u=<потребител>&m=<сбирка>  снимката, ако имаш право да я видиш:
//     своята снимка; организаторът; или и двамата сте записани за сбирка m
// PUT (image/jpeg)                 качва или сменя своята снимка
import {
  data, photos, json, fail, currentUser, isAdmin, readJson, sharedMeetup,
} from '../../lib/shared.mjs';

const MAX_BYTES = 2 * 1024 * 1024;

async function canSee(store, viewer, userId, meetupId) {
  if (viewer.id === userId || isAdmin(viewer)) return true;
  // След като сбирката мине, снимката вече не се вижда
  return sharedMeetup(store, viewer.id, userId, meetupId);
}

export default async (req) => {
  const user = await currentUser();
  if (!user) return fail('Не си влязъл в профила си.', 401);
  const store = data();

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const userId = String(url.searchParams.get('u') || '');
    const meetupId = String(url.searchParams.get('m') || '');
    if (!userId) return fail('Няма снимка.', 404);
    if (!(await canSee(store, user, userId, meetupId))) return fail('Нямаш достъп до тази снимка.', 403);
    const img = await photos().get(userId, { type: 'arrayBuffer' });
    if (!img) return fail('Няма снимка.', 404);
    // Адресът съдържа версията на снимката (?v=...), затова браузърът може да я пази за кратко
    return new Response(img, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=600' } });
  }

  if (req.method === 'PUT') {
    const key = `profiles/${user.id}`;
    const profile = await readJson(store, key);
    if (!profile) return fail('Първо попълни профила си.', 409);

    const type = req.headers.get('content-type') || '';
    if (!type.startsWith('image/jpeg')) return fail('Снимката трябва да е JPEG.');
    const body = await req.arrayBuffer();
    if (!body.byteLength) return fail('Няма снимка.');
    if (body.byteLength > MAX_BYTES) return fail('Снимката е твърде голяма.');

    await photos().set(user.id, body, { metadata: { uploadedAt: new Date().toISOString() } });

    // Нова снимка след проверка значи нова проверка: иначе проверен профил
    // може да си сложи чужда снимка.
    const reverify = profile.status === 'verified';
    const next = { ...profile, photoAt: new Date().toISOString() };
    if (reverify) {
      next.status = 'none';
      delete next.verifiedAt;
      delete next.gesture;
    }
    await store.setJSON(key, next);
    return json({ profile: next, reverify });
  }

  return fail('Методът не се поддържа.', 405);
};

export const config = { path: '/api/photo' };
