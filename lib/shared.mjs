// Общи неща за всички сървърни функции: хранилища, вход, проверки.
import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';

// Данните стоят в ЕС (Франкфурт). Регионът трябва да се подава при всяко отваряне.
const REGION = 'eu-central-1';

// Профили, заведения, сбирки и записвания
export const data = () =>
  getStore({ name: 'idvashli-data', region: REGION, consistency: 'strong' });

// Селфитата за проверка. Пазят се само докато организаторът ги прегледа.
export const selfies = () =>
  getStore({ name: 'idvashli-selfies', region: REGION, consistency: 'strong' });

export const NICHES = {
  biznes: 'Бизнес и пари',
  sport: 'Спорт',
  nargile: 'Наргиле и чил',
  koli: 'Коли',
  geiming: 'Гейминг',
};

export const AUDIENCES = {
  all: 'Смесена група',
  m: 'Само мъже',
  f: 'Само жени',
};

export const GESTURES = [
  'вдигнат палец',
  'знак V с два пръста',
  'длан до бузата',
  'три вдигнати пръста',
  'ръка на брадичката',
  'пръст, сочещ нагоре',
];

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

export const fail = (message, status = 400) => json({ error: message }, status);

export async function currentUser() {
  try {
    return await getUser();
  } catch {
    return null;
  }
}

export const isAdmin = (user) => Array.isArray(user?.roles) && user.roles.includes('admin');

export async function readJson(store, key) {
  return store.get(key, { type: 'json' });
}

// Всички JSON записи с даден префикс, напр. "meetups/"
export async function listJson(store, prefix) {
  const { blobs } = await store.list({ prefix });
  const items = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })));
  return items.filter(Boolean);
}

export async function countKeys(store, prefix) {
  const { blobs } = await store.list({ prefix });
  return blobs.length;
}

export const ageFrom = (birthYear) => new Date().getFullYear() - Number(birthYear);

export const randomId = (bytes = 6) => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
};

// Сбирки, които още не са минали (с 3 часа толеранс, докато трае сбирката)
export const isUpcoming = (meetup) => new Date(meetup.startsAt).getTime() > Date.now() - 3 * 3600 * 1000;

// Изтрива всички данни на човек: профил, селфи и записвания за сбирки
export async function deleteUserData(userId) {
  const store = data();
  const { blobs } = await store.list({ prefix: 'rsvps/' });
  await Promise.all(blobs.filter((b) => b.key.endsWith(`/${userId}`)).map((b) => store.delete(b.key)));
  await store.delete(`profiles/${userId}`);
  await selfies().delete(userId);
}
