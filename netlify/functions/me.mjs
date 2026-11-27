// /api/me: профилът на влезлия потребител (виж, запиши, изтрий)
import { admin } from '@netlify/identity';
import { data, selfies, json, fail, currentUser, isAdmin, readJson, ageFrom, NICHES, deleteUserData } from '../../lib/shared.mjs';

const PHONE = /^(\+359|0)8[7-9]\d{7}$/;

export default async (req) => {
  const user = await currentUser();
  if (!user) return fail('Не си влязъл в профила си.', 401);

  const store = data();
  const key = `profiles/${user.id}`;
  const profile = await readJson(store, key);

  if (req.method === 'GET') {
    return json({ id: user.id, email: user.email, isAdmin: isAdmin(user), profile });
  }

  if (req.method === 'PUT') {
    let body;
    try {
      body = await req.json();
    } catch {
      return fail('Невалидни данни.');
    }

    const name = String(body.name || '').trim().replace(/\s+/g, ' ');
    const gender = body.gender;
    const birthYear = Number(body.birthYear);
    const phone = String(body.phone || '').replace(/[\s\-().]/g, '');
    const instagram = String(body.instagram || '').trim().replace(/^@/, '').slice(0, 40);
    const area = String(body.area || '').trim().slice(0, 60);
    const interests = Array.isArray(body.interests) ? body.interests.filter((i) => i in NICHES) : [];

    if (name.split(' ').length < 2 || name.length > 60) return fail('Напиши име и фамилия.');
    if (!['m', 'f'].includes(gender)) return fail('Избери пол.');
    if (!Number.isInteger(birthYear) || birthYear < 1940) return fail('Напиши годината си на раждане.');
    if (ageFrom(birthYear) < 18 || body.adult !== true) return fail('Сбирките са само за хора над 18 години.');
    if (!PHONE.test(phone)) return fail('Напиши телефон във формат 0888 123 456.');
    if (!interests.length) return fail('Избери поне един интерес.');
    if (body.privacy !== true) return fail('Трябва да се съгласиш с правилата за поверителност.');

    // Смяна на име, пол или година след проверка изисква нова проверка,
    // за да не може проверен профил да се "превърне" в друг човек.
    const identityChanged =
      profile && (profile.name !== name || profile.gender !== gender || profile.birthYear !== birthYear);
    const status = !profile ? 'none' : identityChanged ? 'none' : profile.status;

    const next = {
      ...(profile || { createdAt: new Date().toISOString() }),
      name,
      gender,
      birthYear,
      phone,
      instagram,
      area,
      interests,
      showInstagram: Boolean(body.showInstagram && instagram),
      status,
      updatedAt: new Date().toISOString(),
    };
    if (identityChanged) {
      delete next.verifiedAt;
      delete next.gesture;
      await selfies().delete(user.id);
    }
    await store.setJSON(key, next);
    return json({ profile: next, reverify: Boolean(identityChanged) });
  }

  if (req.method === 'DELETE') {
    // Изтрива всичко за човека: профил, снимка, записвания и самия акаунт
    await deleteUserData(user.id);
    try {
      await admin.deleteUser(user.id);
    } catch {
      return fail('Данните са изтрити, но акаунтът не можа да се изтрие. Пиши ни в Instagram.', 500);
    }
    return json({ deleted: true });
  }

  return fail('Методът не се поддържа.', 405);
};

export const config = { path: '/api/me' };
