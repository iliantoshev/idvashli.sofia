// Планирана функция: пуска се всеки ден в 03:00 UTC и прави копие само ако
// последното е по-старо от 48 часа. Така интервалът е точен и в края на месеца.
import { makeBackup, listBackups, EVERY_HOURS } from '../../lib/backup.mjs';

export default async () => {
  const [last] = await listBackups();
  if (last) {
    const age = (Date.now() - new Date(last.at).getTime()) / 36e5;
    if (age < EVERY_HOURS - 1) return new Response('skip');
  }
  const r = await makeBackup();
  console.log('backup', r.key, r.count);
  return new Response('ok');
};

export const config = { schedule: '0 3 * * *' };
