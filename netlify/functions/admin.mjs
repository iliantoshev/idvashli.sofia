// /api/admin: само за организатора (роля "admin" в Netlify Identity)
import {
  data, selfies, json, fail, currentUser, isAdmin, readJson, listJson, countKeys, isUpcoming,
  randomId, ageFrom, NICHES, AUDIENCES,
} from '../../lib/shared.mjs';

const REASONS = {
  face: 'Лицето не се вижда ясно.',
  gesture: 'Жестът на снимката не е този, който поискахме.',
  mismatch: 'Снимката не съвпада с данните в профила.',
};

export default async (req) => {
  const user = await currentUser();
  if (!user) return fail('Не си влязъл в профила си.', 401);
  if (!isAdmin(user)) return fail('Нямаш достъп.', 403);

  const store = data();
  const url = new URL(req.url);

  if (req.method === 'GET') {
    // Селфи за преглед
    const selfieOf = url.searchParams.get('selfie');
    if (selfieOf) {
      const img = await selfies().get(selfieOf, { type: 'arrayBuffer' });
      if (!img) return fail('Няма снимка.', 404);
      return new Response(img, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } });
    }

    const view = url.searchParams.get('view');

    if (view === 'pending') {
      const { blobs } = await store.list({ prefix: 'profiles/' });
      const profiles = await Promise.all(
        blobs.map(async (b) => ({ id: b.key.slice('profiles/'.length), ...(await readJson(store, b.key)) })),
      );
      const pending = profiles
        .filter((p) => p.status === 'pending')
        .sort((a, b) => (a.submittedAt || '').localeCompare(b.submittedAt || ''))
        .map((p) => ({
          id: p.id, name: p.name, gender: p.gender, age: ageFrom(p.birthYear),
          gesture: p.gesture, submittedAt: p.submittedAt,
        }));
      return json({ pending });
    }

    if (view === 'venues') {
      const venues = await listJson(store, 'venues/');
      venues.sort((a, b) => a.name.localeCompare(b.name, 'bg'));
      return json({ venues });
    }

    if (view === 'meetups') {
      const venues = Object.fromEntries((await listJson(store, 'venues/')).map((v) => [v.id, v]));
      const meetups = (await listJson(store, 'meetups/')).filter(isUpcoming);
      meetups.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      const out = await Promise.all(
        meetups.map(async (m) => {
          const { blobs } = await store.list({ prefix: `rsvps/${m.id}/` });
          const people = await Promise.all(
            blobs.map(async (b) => {
              const p = await readJson(store, `profiles/${b.key.split('/').pop()}`);
              return p ? { name: p.name, phone: p.phone, instagram: p.instagram } : null;
            }),
          );
          return {
            ...m,
            nicheLabel: NICHES[m.niche],
            audienceLabel: AUDIENCES[m.audience],
            venueName: venues[m.venueId]?.name || '—',
            people: people.filter(Boolean),
          };
        }),
      );
      return json({ meetups: out });
    }

    if (view === 'survey') {
      const { blobs } = await store.list({ prefix: 'survey/' });
      const responses = (await Promise.all(blobs.map(async (b) => {
        const r = await readJson(store, b.key);
        return r ? { id: b.key.slice('survey/'.length), ...r } : null;
      }))).filter(Boolean);
      responses.sort((a, b) => a.at.localeCompare(b.at));
      return json({ responses });
    }

    return fail('Непознат изглед.');
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return fail('Невалидни данни.');
    }

    switch (body.action) {
      case 'approve':
      case 'reject': {
        const key = `profiles/${String(body.userId || '')}`;
        const profile = await readJson(store, key);
        if (!profile || profile.status !== 'pending') return fail('Профилът не чака проверка.', 404);
        const next = { ...profile };
        if (body.action === 'approve') {
          next.status = 'verified';
          next.verifiedAt = new Date().toISOString();
        } else {
          next.status = 'rejected';
          next.rejectReason = REASONS[body.reason] || REASONS.mismatch;
        }
        delete next.gesture; // при нов опит човекът получава нов жест
        await store.setJSON(key, next);
        await selfies().delete(String(body.userId)); // снимката се изтрива веднага след решението
        return json({ status: next.status });
      }

      case 'createVenue': {
        const name = String(body.name || '').trim().slice(0, 80);
        const address = String(body.address || '').trim().slice(0, 120);
        if (!name) return fail('Напиши име на заведението.');
        const venue = { id: randomId(4), name, address, token: randomId(16), createdAt: new Date().toISOString() };
        await store.setJSON(`venues/${venue.id}`, venue);
        await store.setJSON(`venue-tokens/${venue.token}`, { venueId: venue.id });
        return json({ venue });
      }

      case 'createMeetup': {
        const venue = await readJson(store, `venues/${String(body.venueId || '')}`);
        const startsAt = new Date(body.startsAt);
        const capacity = Number(body.capacity);
        if (!venue) return fail('Избери заведение.');
        if (!(body.niche in NICHES)) return fail('Избери ниша.');
        if (!(body.audience in AUDIENCES)) return fail('Избери за кого е сбирката.');
        if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now()) return fail('Избери дата и час в бъдещето.');
        if (!Number.isInteger(capacity) || capacity < 2 || capacity > 50) return fail('Местата трябва да са между 2 и 50.');
        const meetup = {
          id: randomId(5), venueId: venue.id, niche: body.niche, audience: body.audience,
          startsAt: startsAt.toISOString(), capacity, createdAt: new Date().toISOString(),
        };
        await store.setJSON(`meetups/${meetup.id}`, meetup);
        return json({ meetup });
      }

      case 'deleteSurvey': {
        const id = String(body.id || '').replace(/[^a-z0-9-]/gi, '');
        if (!id) return fail('Няма такава анкета.');
        await store.delete(`survey/${id}`);
        return json({ deleted: true });
      }

      case 'deleteMeetup': {
        const id = String(body.meetupId || '');
        const { blobs } = await store.list({ prefix: `rsvps/${id}/` });
        await Promise.all(blobs.map((b) => store.delete(b.key)));
        await store.delete(`meetups/${id}`);
        return json({ deleted: true });
      }

      default:
        return fail('Непознато действие.');
    }
  }

  return fail('Методът не се поддържа.', 405);
};

export const config = { path: '/api/admin' };
