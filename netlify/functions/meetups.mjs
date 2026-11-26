// /api/meetups: предстоящите сбирки и бутонът "Идвам"
import {
  data, json, fail, currentUser, readJson, listJson, countKeys, isUpcoming, NICHES, AUDIENCES,
} from '../../lib/shared.mjs';

export default async (req) => {
  const store = data();
  const user = await currentUser();

  if (req.method === 'GET') {
    const meetups = (await listJson(store, 'meetups/')).filter(isUpcoming);
    meetups.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const venues = Object.fromEntries((await listJson(store, 'venues/')).map((v) => [v.id, v]));

    const out = await Promise.all(
      meetups.map(async (m) => ({
        id: m.id,
        startsAt: m.startsAt,
        niche: NICHES[m.niche] || m.niche,
        audience: m.audience,
        audienceLabel: AUDIENCES[m.audience],
        capacity: m.capacity,
        venue: venues[m.venueId] ? { name: venues[m.venueId].name, address: venues[m.venueId].address } : null,
        going: await countKeys(store, `rsvps/${m.id}/`),
        mine: user ? Boolean(await store.get(`rsvps/${m.id}/${user.id}`)) : false,
      })),
    );
    return json({ meetups: out });
  }

  if (req.method === 'POST') {
    if (!user) return fail('Не си влязъл в профила си.', 401);
    const profile = await readJson(store, `profiles/${user.id}`);
    if (profile?.status !== 'verified') return fail('Само проверени профили могат да се записват за сбирки.', 403);

    let body;
    try {
      body = await req.json();
    } catch {
      return fail('Невалидни данни.');
    }
    const meetup = await readJson(store, `meetups/${String(body.meetupId || '')}`);
    if (!meetup || !isUpcoming(meetup)) return fail('Сбирката не е намерена или вече е минала.', 404);

    const rsvpKey = `rsvps/${meetup.id}/${user.id}`;
    if (body.going === false) {
      await store.delete(rsvpKey);
      return json({ going: false });
    }

    if (meetup.audience !== 'all' && meetup.audience !== profile.gender) {
      return fail(meetup.audience === 'f' ? 'Тази сбирка е само за жени.' : 'Тази сбирка е само за мъже.', 403);
    }
    const going = await countKeys(store, `rsvps/${meetup.id}/`);
    if (going >= meetup.capacity) return fail('Сбирката е пълна.', 409);

    await store.setJSON(rsvpKey, { at: new Date().toISOString() });
    return json({ going: true });
  }

  return fail('Методът не се поддържа.', 405);
};

export const config = { path: '/api/meetups' };
