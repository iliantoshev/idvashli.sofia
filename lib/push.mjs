// Push известия: ключове, абонаменти и изпращане.
// Ключовете (VAPID) се генерират сами при първото ползване и стоят само на сървъра.
import webpush from 'web-push';
import { createHash } from 'node:crypto';
import { pushStore } from './shared.mjs';

const CONTACT = 'mailto:idvashli.sofia@gmail.com';

export async function vapidKeys() {
  const store = pushStore();
  let keys = await store.get('vapid', { type: 'json' });
  if (!keys) {
    await store.setJSON('vapid', webpush.generateVAPIDKeys(), { onlyIfNew: true });
    keys = await store.get('vapid', { type: 'json' });
  }
  return keys;
}

const subKey = (userId, endpoint) =>
  `subs/${userId}/${createHash('sha256').update(endpoint).digest('hex').slice(0, 24)}`;

// Проверява абонамента от браузъра, за да не пазим боклук
export function cleanSubscription(sub) {
  const endpoint = String(sub?.endpoint || '');
  const p256dh = String(sub?.keys?.p256dh || '');
  const auth = String(sub?.keys?.auth || '');
  if (!/^https:\/\/[^\s]{10,900}$/.test(endpoint)) return null;
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(p256dh) || !/^[A-Za-z0-9_-]{8,100}$/.test(auth)) return null;
  return { endpoint, keys: { p256dh, auth } };
}

export async function saveSubscription(userId, sub) {
  await pushStore().setJSON(subKey(userId, sub.endpoint), { ...sub, at: new Date().toISOString() });
}

export async function removeSubscription(userId, endpoint) {
  await pushStore().delete(subKey(userId, String(endpoint || '')));
}

export async function countSubscriptions(userId) {
  return (await pushStore().list({ prefix: `subs/${userId}/` })).blobs.length;
}

// Праща известие до всички устройства на човека. Изтрива абонаментите, които вече не работят.
export async function sendToUser(userId, { title, body, url = '/app.html' }) {
  const store = pushStore();
  const keys = await vapidKeys();
  webpush.setVapidDetails(CONTACT, keys.publicKey, keys.privateKey);
  const { blobs } = await store.list({ prefix: `subs/${userId}/` });
  let sent = 0;
  let failed = 0;
  await Promise.all(blobs.map(async (b) => {
    const sub = await store.get(b.key, { type: 'json' });
    if (!sub) return;
    try {
      await webpush.sendNotification(sub, JSON.stringify({ title, body, url }), { TTL: 6 * 3600, urgency: 'high' });
      sent += 1;
    } catch (err) {
      failed += 1;
      if (err.statusCode === 404 || err.statusCode === 410) await store.delete(b.key);
      else console.log('push error', err.statusCode, err.body);
    }
  }));
  return { sent, failed };
}
