// Резервни копии: всичко от хранилището с данни в един JSON файл.
// Снимките и селфитата не влизат в копията (по-малко лични данни на повече места).
import { data, backups } from './shared.mjs';

export const KEEP = 7;               // колко копия пазим (при копие на 48 ч. това са 14 дни)
export const EVERY_HOURS = 48;

export async function makeBackup() {
  const store = data();
  const { blobs } = await store.list();
  const entries = {};
  for (const b of blobs) {
    const v = await store.get(b.key, { type: 'json' });
    if (v !== null) entries[b.key] = v;
  }
  const at = new Date().toISOString();
  const key = `backup-${at.replace(/[:.]/g, '-')}.json`;
  await backups().setJSON(key, { at, count: Object.keys(entries).length, entries });

  // Трием най-старите, за да не се трупат лични данни
  const all = (await backups().list()).blobs.map((b) => b.key).filter((k) => k.startsWith('backup-')).sort();
  for (const old of all.slice(0, Math.max(0, all.length - KEEP))) await backups().delete(old);
  return { key, count: Object.keys(entries).length };
}

export async function listBackups() {
  const keys = (await backups().list()).blobs.map((b) => b.key).filter((k) => k.startsWith('backup-')).sort().reverse();
  return keys.map((k) => ({ key: k, at: k.slice(7, -5).replace(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d+Z)$/, '$1:$2:$3.$4') }));
}
