// /api/venue?t=<код>: страницата за заведението (от QR кода)
// Показва само бройки по дати. Никакви имена или телефони.
import { data, json, fail, readJson, listJson, countKeys, isUpcoming, NICHES, AUDIENCES } from '../../lib/shared.mjs';

export default async (req) => {
  const token = new URL(req.url).searchParams.get('t') || '';
  if (!/^[0-9a-f]{32}$/.test(token)) return fail('Невалиден код.', 404);

  const store = data();
  const link = await readJson(store, `venue-tokens/${token}`);
  const venue = link && (await readJson(store, `venues/${link.venueId}`));
  if (!venue) return fail('Заведението не е намерено.', 404);

  const meetups = (await listJson(store, 'meetups/'))
    .filter((m) => m.venueId === venue.id && isUpcoming(m))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const rows = await Promise.all(
    meetups.map(async (m) => ({
      startsAt: m.startsAt,
      niche: NICHES[m.niche] || m.niche,
      audienceLabel: AUDIENCES[m.audience],
      capacity: m.capacity,
      going: await countKeys(store, `rsvps/${m.id}/`),
    })),
  );
  return json({ venue: { name: venue.name, address: venue.address }, meetups: rows });
};

export const config = { path: '/api/venue' };
