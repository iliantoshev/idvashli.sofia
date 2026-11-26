// Страницата на организатора: проверки, сбирки, заведения с QR кодове
import { getUser } from '@netlify/identity';
import QRCode from 'qrcode';
import { esc, api, postJson, formatWhen, $, $$ } from './ui.js';

const NICHES = { biznes: 'Бизнес и пари', sport: 'Спорт', nargile: 'Наргиле и чил', koli: 'Коли', geiming: 'Гейминг' };
const AUDIENCES = { all: 'Смесена група', m: 'Само мъже', f: 'Само жени' };
const REASONS = { face: 'Лицето не се вижда', gesture: 'Грешен жест', mismatch: 'Не съвпада с профила' };

const root = $('#admin');
let tab = 'pending';

async function shell() {
  root.innerHTML = `
    <h1>Организатор</h1>
    <div class="tabs" role="tablist">
      <button type="button" role="tab" data-tab="pending" aria-selected="${tab === 'pending'}">Проверки</button>
      <button type="button" role="tab" data-tab="meetups" aria-selected="${tab === 'meetups'}">Сбирки</button>
      <button type="button" role="tab" data-tab="venues" aria-selected="${tab === 'venues'}">Заведения</button>
    </div>
    <p class="error" id="admin-error" role="alert"></p>
    <div id="panel"><p class="muted">Зареждаме…</p></div>`;
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; shell(); }));
  const panel = $('#panel');
  try {
    if (tab === 'pending') await pending(panel);
    if (tab === 'meetups') await meetups(panel);
    if (tab === 'venues') await venues(panel);
  } catch (ex) {
    $('#admin-error').textContent = ex.message;
  }
}

/* ---------- Проверки ---------- */

async function pending(panel) {
  const { pending } = await api('/api/admin?view=pending');
  if (!pending.length) {
    panel.innerHTML = '<div class="card"><p>Няма профили за проверка.</p></div>';
    return;
  }
  panel.innerHTML = `<div class="list">${pending.map((p) => `
    <article class="card grid-2">
      <img src="/api/admin?selfie=${encodeURIComponent(p.id)}" alt="Селфи на ${esc(p.name)}" class="preview" loading="lazy">
      <div class="stack">
        <div>
          <h3>${esc(p.name)}</h3>
          <p class="muted">${p.gender === 'm' ? 'Мъж' : 'Жена'}, ${esc(p.age)} г.</p>
          <p>Поискан жест: <strong>${esc(p.gesture || '—')}</strong></p>
          <p class="muted small">Изпратено: ${p.submittedAt ? esc(formatWhen(p.submittedAt)) : '—'}</p>
        </div>
        <p class="small">Провери: вижда ли се ясно лицето, правилен ли е жестът, отговаря ли на пола и възрастта.</p>
        <div class="actions">
          <button class="btn small" type="button" data-approve="${esc(p.id)}">Одобри</button>
        </div>
        <div class="actions">
          ${Object.entries(REASONS).map(([k, l]) => `<button class="btn ghost small" type="button" data-reject="${esc(p.id)}" data-reason="${k}">Откажи: ${l}</button>`).join('')}
        </div>
      </div>
    </article>`).join('')}</div>`;

  $$('[data-approve]').forEach((b) => b.addEventListener('click', () => decide({ action: 'approve', userId: b.dataset.approve }, b)));
  $$('[data-reject]').forEach((b) => b.addEventListener('click', () => decide({ action: 'reject', userId: b.dataset.reject, reason: b.dataset.reason }, b)));
}

async function decide(payload, btn) {
  btn.disabled = true;
  try {
    await postJson('/api/admin', payload);
    shell();
  } catch (ex) {
    $('#admin-error').textContent = ex.message;
    btn.disabled = false;
  }
}

/* ---------- Сбирки ---------- */

async function meetups(panel) {
  const [{ meetups }, { venues }] = await Promise.all([api('/api/admin?view=meetups'), api('/api/admin?view=venues')]);
  const opts = (obj) => Object.entries(obj).map(([k, l]) => `<option value="${k}">${l}</option>`).join('');

  panel.innerHTML = `
    <div class="grid-2" style="align-items:start">
      <form class="card" id="meetup-form" novalidate>
        <h2>Нова сбирка</h2>
        ${venues.length ? '' : '<p class="error">Първо добави заведение от раздел „Заведения“.</p>'}
        <div class="field"><label for="m-venue">Заведение</label>
          <select id="m-venue">${venues.map((v) => `<option value="${esc(v.id)}">${esc(v.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="m-niche">Ниша</label><select id="m-niche">${opts(NICHES)}</select></div>
        <div class="field"><label for="m-when">Дата и час</label><input type="datetime-local" id="m-when"></div>
        <div class="field"><label for="m-cap">Места</label><input type="number" id="m-cap" min="2" max="50" value="6"></div>
        <div class="field"><label for="m-aud">За кого</label><select id="m-aud">${opts(AUDIENCES)}</select></div>
        <p class="error" id="m-error" role="alert"></p>
        <div><button class="btn" type="submit" ${venues.length ? '' : 'disabled'}>Създай сбирката</button></div>
      </form>
      <div class="list">
        ${meetups.length ? meetups.map((m) => `
          <article class="card meetup">
            <div class="meetup-when">${esc(formatWhen(m.startsAt, true))}</div>
            <div class="meetup-row"><span class="tag amber">${esc(m.nicheLabel)}</span><span class="tag">${esc(m.audienceLabel)}</span><span>${esc(m.venueName)}</span></div>
            <div>Идват: <span class="count">${m.people.length} от ${m.capacity}</span></div>
            ${m.people.length ? `<ul class="small" style="margin:0;padding-left:20px">${m.people.map((p) => `<li>${esc(p.name)} · <a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>${p.instagram ? ` · @${esc(p.instagram)}` : ''}</li>`).join('')}</ul>` : ''}
            <div class="actions"><button class="btn danger small" type="button" data-del="${esc(m.id)}">Изтрий сбирката</button></div>
          </article>`).join('') : '<div class="card"><p>Няма предстоящи сбирки.</p></div>'}
      </div>
    </div>`;

  $('#meetup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const when = $('#m-when').value;
    if (!when) { $('#m-error').textContent = 'Избери дата и час.'; return; }
    try {
      await postJson('/api/admin', {
        action: 'createMeetup',
        venueId: $('#m-venue').value,
        niche: $('#m-niche').value,
        audience: $('#m-aud').value,
        capacity: Number($('#m-cap').value),
        startsAt: new Date(when).toISOString(), // часът от браузъра ти (София) се пази като UTC
      });
      shell();
    } catch (ex) {
      $('#m-error').textContent = ex.message;
    }
  });

  $$('[data-del]').forEach((b) => {
    let armed = false;
    b.addEventListener('click', async () => {
      if (!armed) { armed = true; b.textContent = 'Натисни пак за изтриване'; return; }
      b.disabled = true;
      await postJson('/api/admin', { action: 'deleteMeetup', meetupId: b.dataset.del }).catch((ex) => { $('#admin-error').textContent = ex.message; });
      shell();
    });
  });
}

/* ---------- Заведения ---------- */

async function venues(panel) {
  const { venues } = await api('/api/admin?view=venues');
  const link = (v) => `${location.origin}/venue.html?t=${v.token}`;

  panel.innerHTML = `
    <div class="grid-2" style="align-items:start">
      <form class="card" id="venue-form" novalidate>
        <h2>Ново заведение</h2>
        <div class="field"><label for="v-name">Име</label><input type="text" id="v-name" placeholder="напр. Наргиле бар Х"></div>
        <div class="field"><label for="v-addr">Адрес</label><input type="text" id="v-addr" placeholder="напр. Студентски град, бл. 8"></div>
        <p class="error" id="v-error" role="alert"></p>
        <div><button class="btn" type="submit">Добави</button></div>
        <p class="muted small">Всяко заведение получава QR код. Като го сканират, виждат колко души идват по дати, без имена и телефони.</p>
      </form>
      <div class="list">
        ${venues.length ? venues.map((v) => `
          <article class="card grid-2" style="align-items:center">
            <div>
              <h3>${esc(v.name)}</h3>
              ${v.address ? `<p class="muted">${esc(v.address)}</p>` : ''}
              <p class="small"><a href="${esc(link(v))}" target="_blank" rel="noopener">Отвори страницата на заведението</a></p>
            </div>
            <div>
              <img data-qr="${esc(link(v))}" alt="QR код за ${esc(v.name)}" width="180" height="180" style="background:#fff;border-radius:12px;padding:8px">
              <a class="small" data-dl="${esc(v.id)}" download="qr-${esc(v.name)}.png">Свали QR кода</a>
            </div>
          </article>`).join('') : '<div class="card"><p>Още няма заведения.</p></div>'}
      </div>
    </div>`;

  for (const img of $$('[data-qr]')) {
    const url = await QRCode.toDataURL(img.dataset.qr, { width: 600, margin: 2, color: { dark: '#121826', light: '#ffffff' } });
    img.src = url;
    img.nextElementSibling.href = url;
  }

  $('#venue-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await postJson('/api/admin', { action: 'createVenue', name: $('#v-name').value, address: $('#v-addr').value });
      shell();
    } catch (ex) {
      $('#v-error').textContent = ex.message;
    }
  });
}

/* ---------- Достъп ---------- */

(async () => {
  const user = await getUser().catch(() => null);
  if (!user) {
    root.innerHTML = '<h1>Организатор</h1><p>Влез в профила си, за да продължиш.</p><a class="btn" href="/app.html">Вход</a>';
    return;
  }
  if (!user.roles?.includes('admin')) {
    root.innerHTML = '<h1>Нямаш достъп</h1><p>Тази страница е само за организатора.</p>';
    return;
  }
  shell();
})();
