// /api/person?u=<човек>&m=<сбирка>: краткият профил на друг участник.
// Вижда се само от хора, записани за същата предстояща сбирка.
// Показваме само нужното, за да знаеш с кого ще се видиш: малко име, години,
// снимка, интереси, и Instagram само ако човекът сам е разрешил.
// Фамилия, телефон, имейл, квартал и пол не се показват.
import {
  data, json, fail, currentUser, readJson, sharedMeetup, ageFrom, NICHES,
} from '../../lib/shared.mjs';

export default async (req) => {
  if (req.method !== 'GET') return fail('Методът не се поддържа.', 405);
  const user = await currentUser();
  if (!user) return fail('Не си влязъл в профила си.', 401);

  const url = new URL(req.url);
  const userId = String(url.searchParams.get('u') || '');
  const meetupId = String(url.searchParams.get('m') || '');
  const store = data();

  if (!(await sharedMeetup(store, user.id, userId, meetupId))) {
    return fail('Профилът се вижда само от хората, записани за същата сбирка, докато тя предстои.', 403);
  }
  const p = await readJson(store, `profiles/${userId}`);
  if (!p) return fail('Профилът не е намерен.', 404);

  return json({
    id: userId,
    firstName: p.name.split(' ')[0],
    age: ageFrom(p.birthYear),
    verified: p.status === 'verified',
    photo: p.photoAt || null,
    interests: (p.interests || []).map((k) => NICHES[k]).filter(Boolean),
    instagram: p.showInstagram && p.instagram ? p.instagram : null,
  });
};

export const config = { path: '/api/person' };
